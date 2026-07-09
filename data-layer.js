/* ═══════════════════════════════════════════════════════════════════
   SMART-FLIP 5.0 — data-layer.js  (v0.9.7 — Supabase live sync)
   Data abstraction layer: Supabase kalau ada sesi login, localStorage
   sebagai fallback (demo mode / Supabase call gagal).

   ── Urutan load di setiap halaman protected ──────────────────────
     <script src="supabase.js"></script>       ← kredensial Supabase
     <script src="modules-data.js"></script>   ← konstanta MODULES_DATA
     <script src="data-layer.js"></script>     ← abstraksi ini

   ── Skema Supabase (lihat database/schema.sql + migration_v1_livesync.sql) ──
   profiles(id, full_name, nim_nidn, role, learning_style, avatar_url,
            prodi, angkatan, vark_scores, vark_dominant, vark_completed_at)
   modules(id, order_num, title, description, video_url, pdf_path, is_active)
   user_progress(id, user_id, module_id, status, time_spent, started_at,
                 completed_at, pct, current_page, last_opened, seq_state, refleksi_checks)
   quiz_questions(id, module_id, question, options, answer_idx, explanation, order_num)
   quiz_attempts(id, user_id, module_id, score, answers, passed, attempted_at)
   drafts(id, user_id, module_id, version, title, file_url, notes, content, status, submitted_at)
   draft_comments(id, draft_id, author_id, author_role, comment, created_at)
   forum_posts(id, module_id, user_id, parent_id, content, created_at, likes)
   notifications(id, user_id, type, title, body, read, created_at)
   feedback(id, user_id, module_id, konten, kemudahan, keterbacaan, kebermanfaatan, rata_rata, komentar, submitted_at)
   validasi_ahli(id, user_id, aspek_media, aspek_materi, total_avg, validator, submitted_at)

   Modul path (books/modul-01.pdf dst) ↔ module_id: modules.order_num.
   Kalau Supabase gagal (network/RLS/belum migrasi) → fallback localStorage,
   console.warn, JANGAN throw ke UI.
   ═══════════════════════════════════════════════════════════════════ */

'use strict';

// Pure agregasi (testable tanpa Supabase/browser) — dipakai DataLayer.getModulDistribution.
// Test: tests/data-layer.compute.test.js — RED dikonfirmasi (computeModulDistribution is not a function)
// sebelum fungsi ini ditulis; GREEN setelah ditambahkan.
function computeModulDistribution(modules, totalStudents, completedRows) {
  return modules.map(m => {
    const done = completedRows.filter(r => r.module_id === m.id).length;
    return { label: 'Modul ' + m.order_num, pct: Math.round(done / totalStudents * 100) };
  });
}

// Red confirmed via `node tests/data-layer.compute.test.js`: assertion failure (actual undefined)
function computeFeedbackAspectAvg(rows) {
  const avg = (key) => rows.length ? +(rows.reduce((a, r) => a + (r[key] || 0), 0) / rows.length).toFixed(1) : 0;
  return [
    { label: 'Kualitas Konten',      nilai: avg('konten') },
    { label: 'Kemudahan Penggunaan', nilai: avg('kemudahan') },
    { label: 'Keterbacaan',          nilai: avg('keterbacaan') },
    { label: 'Kebermanfaatan',       nilai: avg('kebermanfaatan') },
  ];
}

const DataLayer = (() => {

  // ─── CONFIG ───────────────────────────────────────────
  // Aktif otomatis kalau supabase.js sudah di-load (kredensial ada)
  function useSupabase() {
    return typeof sb !== 'undefined' && sb !== null;
  }

  // ─── INTERNAL HELPERS — localStorage ──────────────────
  function lsGet(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : fallback;
    } catch(e) {
      return fallback;
    }
  }

  function lsSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch(e) {
      console.warn('[DataLayer] lsSet failed for key:', key, e);
    }
  }

  function lsRemove(key) {
    try {
      localStorage.removeItem(key);
    } catch(e) {}
  }

  function warn(method, e) {
    console.warn('[DataLayer] ' + method + ' → Supabase gagal, fallback localStorage:', e?.message || e);
  }

  // ─── INTERNAL HELPERS — Supabase ──────────────────────
  let _uidCache = null;
  async function getUid() {
    if (_uidCache) return _uidCache;
    const { data: { user } } = await sb.auth.getUser();
    _uidCache = user ? user.id : null;
    return _uidCache;
  }

  // modulePath 'books/modul-01.pdf' → module_id (order_num) 1
  function pathToModuleId(modulePath) {
    const m = /modul-(\d+)\.pdf/.exec(modulePath || '');
    return m ? parseInt(m[1], 10) : null;
  }

  // ─── FORUM SEED (demo/localStorage saja) ──────────────
  function seedForumIfEmpty() {
    if (lsGet('sfp_forum')) return;
    lsSet('sfp_forum', [
      {
        id: 'post_1', moduleId: 1,
        authorName: 'Budi Santoso', authorRole: 'mahasiswa',
        content: 'Apa perbedaan utama antara R&D dan penelitian eksperimen biasa? Saya masih bingung membedakannya dari sisi tujuan penelitian.',
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        likes: 3,
        replies: [
          {
            id: 'rep_1a',
            authorName: 'Dr. Ahmad Fauzi, M.Pd.', authorRole: 'dosen',
            content: 'Perbedaan kunci: R&D bertujuan menghasilkan produk/prosedur baru yang tervalidasi, sedangkan eksperimen murni menguji hipotesis tentang hubungan sebab-akibat. Pada R&D, validasi ahli dan uji coba lapangan adalah bagian inti prosesnya.',
            createdAt: new Date(Date.now() - 5400000).toISOString(),
          },
          {
            id: 'rep_1b',
            authorName: 'Rina Wulandari', authorRole: 'mahasiswa',
            content: 'Tambahan dari saya: R&D bersifat siklus iteratif (revisi berkali-kali berdasarkan feedback), sedangkan eksperimen bersifat linear. Ini yang bikin R&D lebih panjang prosesnya.',
            createdAt: new Date(Date.now() - 3600000).toISOString(),
          },
        ],
      },
      {
        id: 'post_2', moduleId: 2,
        authorName: 'Siti Rahma', authorRole: 'mahasiswa',
        content: 'Menurut saya model ADDIE lebih cocok untuk pengembangan e-learning karena tahapannya lebih sistematis. Ada yang setuju?',
        createdAt: new Date(Date.now() - 14400000).toISOString(),
        likes: 5,
        replies: [{
          id: 'rep_2a',
          authorName: 'Dr. Andi', authorRole: 'dosen',
          content: 'Betul! ADDIE memang lebih terstruktur. Tapi untuk penelitian skripsi, Borg & Gall sering lebih direkomendasikan karena ada tahap validasi ahli yang eksplisit.',
          createdAt: new Date(Date.now() - 10800000).toISOString(),
        }],
      },
      {
        id: 'post_3', moduleId: 3,
        authorName: 'Ahmad Rizki', authorRole: 'mahasiswa',
        content: 'Ada yang punya referensi tambahan untuk needs assessment selain yang ada di modul? Saya butuh untuk bab 1 proposal.',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        likes: 2, replies: [],
      },
      {
        id: 'post_4', moduleId: 2,
        authorName: 'Fajar Nugroho', authorRole: 'mahasiswa',
        content: 'Bingung membedakan model 4D (Thiagarajan) dengan ADDIE. Keduanya tampak mirip. Kapan sebaiknya memilih 4D daripada ADDIE?',
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        likes: 7,
        replies: [
          {
            id: 'rep_4a',
            authorName: 'Dr. Ahmad Fauzi, M.Pd.', authorRole: 'dosen',
            content: '4D (Define-Design-Develop-Disseminate) lebih ringkas dan sering dipakai untuk pengembangan perangkat pembelajaran (LKS, modul cetak, RPP). ADDIE lebih komprehensif dan cocok untuk sistem e-learning atau multimedia. Keduanya valid untuk skripsi, pilih sesuai jenis produk yang dikembangkan.',
            createdAt: new Date(Date.now() - 160000000).toISOString(),
          },
          {
            id: 'rep_4b',
            authorName: 'Siti Rahma', authorRole: 'mahasiswa',
            content: 'Dari yang saya baca, 4D lebih banyak dipakai di penelitian pendidikan dasar, sedangkan ADDIE populer di instructional design dan pelatihan perusahaan. Semoga membantu!',
            createdAt: new Date(Date.now() - 150000000).toISOString(),
          },
        ],
      },
      {
        id: 'post_5', moduleId: 1,
        authorName: 'Maya Sari', authorRole: 'mahasiswa',
        content: 'Setelah baca modul 1, saya paham konsep dasar R&D. Tapi apakah boleh menggabungkan dua model pengembangan sekaligus, misalnya ADDIE dan Borg & Gall? Ada yang pernah melihat contoh penelitiannya?',
        createdAt: new Date(Date.now() - 259200000).toISOString(),
        likes: 4,
        replies: [
          {
            id: 'rep_5a',
            authorName: 'Ahmad Rizki', authorRole: 'mahasiswa',
            content: 'Ada beberapa jurnal yang menggabungkan keduanya, biasanya mengambil tahap Analysis dari ADDIE lalu menyesuaikan dengan langkah Borg & Gall untuk validasi. Tapi perlu justifikasi yang kuat di bab metodologi.',
            createdAt: new Date(Date.now() - 240000000).toISOString(),
          },
        ],
      },
      {
        id: 'post_6', moduleId: 3,
        authorName: 'Rina Wulandari', authorRole: 'mahasiswa',
        content: 'Sudah selesai menyusun instrumen needs assessment untuk bab 1. Pakai angket terbuka + tertutup plus wawancara kepada 3 guru. Apakah cukup? Atau perlu FGD juga?',
        createdAt: new Date(Date.now() - 345600000).toISOString(),
        likes: 6,
        replies: [
          {
            id: 'rep_6a',
            authorName: 'Dr. Ahmad Fauzi, M.Pd.', authorRole: 'dosen',
            content: 'Triangulasi data (angket + wawancara) sudah bagus. FGD bisa ditambahkan jika ingin memperkuat temuan, terutama kalau ada perbedaan signifikan antara data angket dan wawancara. Untuk skripsi S1, dua sumber data biasanya sudah memadai.',
            createdAt: new Date(Date.now() - 320000000).toISOString(),
          },
        ],
      },
      {
        id: 'post_7', moduleId: 3,
        authorName: 'Dimas Prakoso', authorRole: 'mahasiswa',
        content: 'Sharing progres bab 1: sudah selesai latar belakang dan rumusan masalah. Yang masih susah bagian kajian pustaka — terlalu banyak referensi, bingung mana yang relevan dan mana yang tidak. Ada tips?',
        createdAt: new Date(Date.now() - 432000000).toISOString(),
        likes: 8,
        replies: [
          {
            id: 'rep_7a',
            authorName: 'Siti Rahma', authorRole: 'mahasiswa',
            content: 'Tips dari saya: buat tabel pemetaan literatur dulu. Kolom: penulis/tahun, topik utama, metode, relevansi dengan penelitianmu. Dari sana lebih mudah menyaring mana yang benar-benar dibutuhkan.',
            createdAt: new Date(Date.now() - 400000000).toISOString(),
          },
          {
            id: 'rep_7b',
            authorName: 'Dr. Ahmad Fauzi, M.Pd.', authorRole: 'dosen',
            content: 'Betul saran Siti. Tambahan: prioritaskan literatur dari jurnal terindeks (Scopus/SINTA) dan maksimal 10 tahun terakhir (kecuali teori dasar seperti Bloom, Piaget, dll). Fokus pada yang langsung berkaitan dengan variabel penelitianmu.',
            createdAt: new Date(Date.now() - 380000000).toISOString(),
          },
        ],
      },
    ]);
  }

  // ─── PROGRESS SEED (demo/localStorage saja) ───────────
  function seedProgressIfEmpty() {
    if (!lsGet('sfp_books/modul-01.pdf')) {
      lsSet('sfp_books/modul-01.pdf', {
        pct: 100, currentPage: 24, totalPages: 24,
        lastOpened: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }
    if (!lsGet('sfp_books/modul-02.pdf')) {
      lsSet('sfp_books/modul-02.pdf', {
        pct: 100, currentPage: 20, totalPages: 20,
        lastOpened: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }
    if (!lsGet('sfp_books/modul-03.pdf')) {
      lsSet('sfp_books/modul-03.pdf', {
        pct: 45, currentPage: 9, totalPages: 20,
        lastOpened: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }
  }

  // ─── QUIZ SEED (demo/localStorage saja) ───────────────
  function seedQuizIfEmpty() {
    if (!lsGet('sfp_quiz_1')) {
      lsSet('sfp_quiz_1', [
        {
          score: 60, pct: 60, total: 5, correct: 3,
          completedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
          date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
          answers: [2, 1, 3, 1, 0],
        },
        {
          score: 80, pct: 80, total: 5, correct: 4,
          completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
          answers: [2, 1, 3, 1, 0],
        },
      ]);
    }
    if (!lsGet('sfp_quiz_2')) {
      lsSet('sfp_quiz_2', [
        {
          score: 100, pct: 100, total: 5, correct: 5,
          completedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
          date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
          answers: [0, 2, 3, 1, 3],
        },
      ]);
    }
  }

  // ─── LEARNING TIME SEED (demo/localStorage saja) ──────
  function seedTimeIfEmpty() {
    if (!localStorage.getItem('sfp_time_1')) localStorage.setItem('sfp_time_1', '2340');
    if (!localStorage.getItem('sfp_time_2')) localStorage.setItem('sfp_time_2', '1980');
    if (!localStorage.getItem('sfp_time_3')) localStorage.setItem('sfp_time_3', '720');
  }

  // ─── VARK SEED (demo/localStorage saja) ───────────────
  function seedVarkIfEmpty() {
    if (!lsGet('sfp_vark')) {
      lsSet('sfp_vark', {
        V: 5, A: 3, R: 2, K: 2,
        dominant: 'visual',
        completedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }
  }

  // ─── SEED ON INIT (localStorage/demo mode saja) ───────
  (function seedAll() {
    try {
      if (typeof localStorage === 'undefined') return; // Node/test env — tidak ada localStorage
      if (useSupabase()) return; // Supabase mode: data asli dari DB, jangan seed dummy
      seedForumIfEmpty();
      seedProgressIfEmpty();
      seedQuizIfEmpty();
      seedTimeIfEmpty();
      seedVarkIfEmpty();
    } catch(e) { console.warn('[DataLayer] seedAll error:', e); }
  })();

  // ─── PUBLIC API ───────────────────────────────────────
  return {

    // ════════════════════════════════════════════════════
    // MODULES
    // ════════════════════════════════════════════════════

    async getModules() {
      if (useSupabase()) {
        try {
          const { data, error } = await sb.from('modules').select('*').order('order_num');
          if (error) throw error;
          if (data && data.length) return data;
        } catch(e) { warn('getModules', e); }
      }
      return typeof MODULES_DATA !== 'undefined' ? MODULES_DATA : [];
    },

    async getModuleById(id) {
      if (useSupabase()) {
        try {
          const { data, error } = await sb.from('modules').select('*').eq('id', id).single();
          if (error) throw error;
          if (data) return data;
        } catch(e) { warn('getModuleById', e); }
      }
      const all = await DataLayer.getModules();
      return all.find(m => m.id === id) || null;
    },

    // ════════════════════════════════════════════════════
    // PROGRESS (per modul)
    // ════════════════════════════════════════════════════

    async getProgress(modulePath) {
      if (useSupabase()) {
        try {
          const uid = await getUid();
          const moduleId = pathToModuleId(modulePath);
          if (uid && moduleId) {
            const { data, error } = await sb.from('user_progress')
              .select('pct, current_page, last_opened')
              .eq('user_id', uid).eq('module_id', moduleId).maybeSingle();
            if (error) throw error;
            return data
              ? { pct: data.pct || 0, currentPage: data.current_page || 0, lastOpened: data.last_opened }
              : { pct: 0, currentPage: 0, lastOpened: null };
          }
        } catch(e) { warn('getProgress', e); }
      }
      return lsGet('sfp_' + modulePath) || { pct: 0, currentPage: 0, lastOpened: null };
    },

    async saveProgress(modulePath, data) {
      if (useSupabase()) {
        try {
          const uid = await getUid();
          const moduleId = pathToModuleId(modulePath);
          if (uid && moduleId) {
            await sb.from('user_progress').upsert({
              user_id: uid, module_id: moduleId,
              pct: data.pct, current_page: data.currentPage,
              last_opened: data.lastOpened || new Date().toISOString(),
              status: (data.pct >= 100) ? 'completed' : (data.pct > 0 ? 'in_progress' : 'not_started'),
              started_at: new Date().toISOString(),
              completed_at: (data.pct >= 100) ? new Date().toISOString() : null,
            }, { onConflict: 'user_id,module_id' });
            return;
          }
        } catch(e) { warn('saveProgress', e); }
      }
      const existing = await DataLayer.getProgress(modulePath);
      lsSet('sfp_' + modulePath, {
        ...existing,
        ...data,
        lastOpened: data.lastOpened || new Date().toISOString(),
      });
    },

    async getAllProgress() {
      if (useSupabase()) {
        try {
          const uid = await getUid();
          if (uid) {
            const { data, error } = await sb.from('user_progress')
              .select('module_id, pct, current_page, last_opened')
              .eq('user_id', uid);
            if (error) throw error;
            const result = {};
            (data || []).forEach(r => {
              const path = 'books/modul-' + String(r.module_id).padStart(2, '0') + '.pdf';
              result[path] = { pct: r.pct || 0, currentPage: r.current_page || 0, lastOpened: r.last_opened };
            });
            return result;
          }
        } catch(e) { warn('getAllProgress', e); }
      }
      const result = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sfp_books/')) {
          try {
            result[key.replace('sfp_', '')] = JSON.parse(localStorage.getItem(key));
          } catch(e) {}
        }
      }
      return result;
    },

    // ════════════════════════════════════════════════════
    // QUIZ
    // ════════════════════════════════════════════════════

    async getQuizAttempts(moduleId) {
      if (useSupabase()) {
        try {
          const uid = await getUid();
          if (uid) {
            const { data, error } = await sb.from('quiz_attempts')
              .select('score, answers, attempted_at')
              .eq('user_id', uid).eq('module_id', moduleId)
              .order('attempted_at', { ascending: true });
            if (error) throw error;
            return (data || []).map(r => ({
              score: r.score, pct: r.score, answers: r.answers,
              completedAt: r.attempted_at,
              date: new Date(r.attempted_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
            }));
          }
        } catch(e) { warn('getQuizAttempts', e); }
      }
      return lsGet('sfp_quiz_' + moduleId) || lsGet('sfp_kuis_' + moduleId) || [];
    },

    async saveQuizAttempt(moduleId, attempt) {
      if (useSupabase()) {
        try {
          const uid = await getUid();
          if (uid) {
            await sb.from('quiz_attempts').insert({
              user_id: uid, module_id: moduleId,
              score: attempt.score, answers: attempt.answers,
              attempted_at: attempt.completedAt || new Date().toISOString(),
            });
            return;
          }
        } catch(e) { warn('saveQuizAttempt', e); }
      }
      const existing = await DataLayer.getQuizAttempts(moduleId);
      existing.push({
        ...attempt,
        completedAt: attempt.completedAt || new Date().toISOString(),
        date: attempt.date || new Date().toLocaleDateString('id-ID', {
          day: '2-digit', month: 'short', year: 'numeric'
        }),
      });
      lsSet('sfp_quiz_' + moduleId, existing.slice(-10));
    },

    async getLastQuizAttempt(moduleId) {
      const attempts = await DataLayer.getQuizAttempts(moduleId);
      return attempts.length ? attempts[attempts.length - 1] : null;
    },

    // ════════════════════════════════════════════════════
    // PROFILE / USER
    // ════════════════════════════════════════════════════

    async getProfile() {
      if (useSupabase()) {
        try {
          const uid = await getUid();
          if (uid) {
            const { data, error } = await sb.from('profiles').select('*').eq('id', uid).single();
            if (error) throw error;
            if (data) return {
              name: data.full_name, role: data.role, nim: data.nim_nidn || '',
              email: (await sb.auth.getUser()).data.user?.email || '',
              learning_style: data.learning_style,
            };
          }
        } catch(e) { warn('getProfile', e); }
      }
      return lsGet('sfp_profile') || {
        name: 'Mahasiswa', role: 'mahasiswa', nim: '', email: '', learning_style: null,
      };
    },

    async updateProfile(data) {
      if (useSupabase()) {
        try {
          const uid = await getUid();
          if (uid) {
            await sb.from('profiles').upsert({
              id: uid,
              full_name: data.name, nim_nidn: data.nim,
              role: data.role, learning_style: data.learning_style,
            });
            return;
          }
        } catch(e) { warn('updateProfile', e); }
      }
      const existing = await DataLayer.getProfile();
      lsSet('sfp_profile', { ...existing, ...data });
    },

    // ════════════════════════════════════════════════════
    // VARK
    // ════════════════════════════════════════════════════

    async getVarkResult() {
      if (useSupabase()) {
        try {
          const uid = await getUid();
          if (uid) {
            const { data, error } = await sb.from('profiles')
              .select('vark_scores, vark_dominant, vark_completed_at')
              .eq('id', uid).single();
            if (error) throw error;
            if (!data?.vark_scores) return null;
            return { ...data.vark_scores, dominant: data.vark_dominant, completedAt: data.vark_completed_at };
          }
        } catch(e) { warn('getVarkResult', e); }
      }
      return lsGet('sfp_vark');
    },

    async saveVarkResult({ V, A, R, K, dominant, completedAt }) {
      if (useSupabase()) {
        try {
          const uid = await getUid();
          if (uid) {
            await sb.from('profiles').upsert({
              id: uid,
              vark_scores: { V, A, R, K },
              vark_dominant: dominant,
              vark_completed_at: completedAt || new Date().toISOString(),
            });
            return;
          }
        } catch(e) { warn('saveVarkResult', e); }
      }
      lsSet('sfp_vark', { V, A, R, K, dominant, completedAt: completedAt || new Date().toISOString() });
    },

    async clearVarkResult() {
      if (useSupabase()) {
        try {
          const uid = await getUid();
          if (uid) {
            await sb.from('profiles').upsert({
              id: uid, vark_scores: null, vark_dominant: null, vark_completed_at: null,
            });
            return;
          }
        } catch(e) { warn('clearVarkResult', e); }
      }
      lsRemove('sfp_vark');
    },

    // ════════════════════════════════════════════════════
    // LEARNING TIME
    // ════════════════════════════════════════════════════

    async getTimeSpent(moduleId) {
      if (useSupabase()) {
        try {
          const uid = await getUid();
          if (uid) {
            const { data, error } = await sb.from('user_progress')
              .select('time_spent').eq('user_id', uid).eq('module_id', moduleId).maybeSingle();
            if (error) throw error;
            return data?.time_spent || 0;
          }
        } catch(e) { warn('getTimeSpent', e); }
      }
      const raw = localStorage.getItem('sfp_time_' + moduleId);
      return raw ? (parseInt(raw) || 0) : 0;
    },

    async addTimeSpent(moduleId, seconds) {
      if (useSupabase()) {
        try {
          const uid = await getUid();
          if (uid) {
            const prev = await DataLayer.getTimeSpent(moduleId);
            await sb.from('user_progress').upsert({
              user_id: uid, module_id: moduleId, time_spent: prev + seconds,
            }, { onConflict: 'user_id,module_id' });
            return;
          }
        } catch(e) { warn('addTimeSpent', e); }
      }
      const prev = await DataLayer.getTimeSpent(moduleId);
      localStorage.setItem('sfp_time_' + moduleId, String(prev + seconds));
    },

    // ════════════════════════════════════════════════════
    // SEQUENTIAL CONTENT FLOW
    // ════════════════════════════════════════════════════

    async getSeqState(moduleId) {
      if (useSupabase()) {
        try {
          const uid = await getUid();
          if (uid) {
            const { data, error } = await sb.from('user_progress')
              .select('seq_state').eq('user_id', uid).eq('module_id', moduleId).maybeSingle();
            if (error) throw error;
            return data?.seq_state || { videoWatched: false, pdfOpened: false };
          }
        } catch(e) { warn('getSeqState', e); }
      }
      return lsGet('sfp_seq_' + moduleId) || { videoWatched: false, pdfOpened: false };
    },

    async saveSeqState(moduleId, state) {
      if (useSupabase()) {
        try {
          const uid = await getUid();
          if (uid) {
            const existing = await DataLayer.getSeqState(moduleId);
            await sb.from('user_progress').upsert({
              user_id: uid, module_id: moduleId, seq_state: { ...existing, ...state },
            }, { onConflict: 'user_id,module_id' });
            return;
          }
        } catch(e) { warn('saveSeqState', e); }
      }
      const existing = await DataLayer.getSeqState(moduleId);
      lsSet('sfp_seq_' + moduleId, { ...existing, ...state });
    },

    // ════════════════════════════════════════════════════
    // REFLEKSI METAKOGNITIF
    // ════════════════════════════════════════════════════

    async getRefleksi(moduleId) {
      if (useSupabase()) {
        try {
          const uid = await getUid();
          if (uid) {
            const { data, error } = await sb.from('user_progress')
              .select('refleksi_checks').eq('user_id', uid).eq('module_id', moduleId).maybeSingle();
            if (error) throw error;
            return Array.isArray(data?.refleksi_checks) ? data.refleksi_checks : [false, false, false, false, false];
          }
        } catch(e) { warn('getRefleksi', e); }
      }
      const saved = lsGet('sfp_refleksi_' + moduleId);
      return Array.isArray(saved) ? saved : [false, false, false, false, false];
    },

    async saveRefleksi(moduleId, checks) {
      if (useSupabase()) {
        try {
          const uid = await getUid();
          if (uid) {
            await sb.from('user_progress').upsert({
              user_id: uid, module_id: moduleId, refleksi_checks: checks,
            }, { onConflict: 'user_id,module_id' });
            return;
          }
        } catch(e) { warn('saveRefleksi', e); }
      }
      lsSet('sfp_refleksi_' + moduleId, checks);
    },

    // ════════════════════════════════════════════════════
    // NOTIFICATIONS
    // ════════════════════════════════════════════════════

    async getNotifications() {
      if (useSupabase()) {
        try {
          const uid = await getUid();
          if (uid) {
            const { data, error } = await sb.from('notifications')
              .select('*').eq('user_id', uid)
              .order('created_at', { ascending: false }).limit(20);
            if (error) throw error;
            return (data || []).map(n => ({
              id: n.id, type: n.type, title: n.title, body: n.body,
              read: n.read, createdAt: n.created_at,
            }));
          }
        } catch(e) { warn('getNotifications', e); }
      }
      const stored = lsGet('sfp_notifs');
      if (!stored) {
        const dummy = [
          { id: 'n1', type: 'modul',  title: 'Modul 3 Dibuka',      body: 'Modul 3: Desain Penelitian & Instrumen kini tersedia. Lanjutkan perjalanan belajarmu!', read: false, createdAt: new Date(Date.now() - 7200000).toISOString() },
          { id: 'n2', type: 'kuis',   title: 'Kuis Modul 2 — 85%',  body: 'Selamat! Kamu mendapat skor 85 di Kuis Modul 2. Kenaikan 5 poin dari percobaan sebelumnya!', read: false, createdAt: new Date(Date.now() - 86400000).toISOString() },
          { id: 'n3', type: 'forum',  title: 'Dosen Membalas Diskusimu', body: 'Dr. Ahmad Fauzi membalas pertanyaanmu di forum Modul 1 tentang perbedaan R&D.', read: true, createdAt: new Date(Date.now() - 172800000).toISOString() },
          { id: 'n4', type: 'draf',   title: 'Draf Dikomentari',    body: 'Dosen memberikan komentar pada draf "Identifikasi Masalah Penelitian" kamu. Cek segera!', read: false, createdAt: new Date(Date.now() - 10800000).toISOString() },
          { id: 'n5', type: 'progres', title: 'Modul 1 Selesai! 🏆', body: 'Selamat! Kamu telah menyelesaikan Modul 1: Dasar & Konsep R&D. Lanjut ke Modul 2!', read: true,  createdAt: new Date(Date.now() - 7 * 24 * 3600000).toISOString() },
          { id: 'n6', type: 'sistem', title: 'Selamat Datang',      body: 'Selamat bergabung di SMART-FLIP 5.0! Mulailah belajar dari Modul 1.',                read: true,  createdAt: new Date(Date.now() - 8 * 24 * 3600000).toISOString() },
        ];
        lsSet('sfp_notifs', dummy);
        return dummy;
      }
      return stored;
    },

    async markNotificationRead(id) {
      if (useSupabase()) {
        try {
          const uid = await getUid();
          if (uid) { await sb.from('notifications').update({ read: true }).eq('id', id).eq('user_id', uid); return; }
        } catch(e) { warn('markNotificationRead', e); }
      }
      const notifs = await DataLayer.getNotifications();
      const updated = notifs.map(n => n.id === id ? { ...n, read: true } : n);
      lsSet('sfp_notifs', updated);
    },

    async markAllNotificationsRead() {
      if (useSupabase()) {
        try {
          const uid = await getUid();
          if (uid) { await sb.from('notifications').update({ read: true }).eq('user_id', uid); return; }
        } catch(e) { warn('markAllNotificationsRead', e); }
      }
      const notifs = await DataLayer.getNotifications();
      lsSet('sfp_notifs', notifs.map(n => ({ ...n, read: true })));
    },

    async markAllRead() {
      return DataLayer.markAllNotificationsRead();
    },

    // ════════════════════════════════════════════════════
    // FORUM (Diskusi Peer-Review)
    // ════════════════════════════════════════════════════

    async getPosts(moduleId = null) {
      if (useSupabase()) {
        try {
          let q = sb.from('forum_posts').select('*, profiles(full_name, role)').is('parent_id', null).order('created_at', { ascending: false });
          if (moduleId) q = q.eq('module_id', moduleId);
          const { data, error } = await q;
          if (error) throw error;
          const posts = data || [];
          const { data: replies } = await sb.from('forum_posts').select('*, profiles(full_name, role)').not('parent_id', 'is', null);
          return posts.map(p => ({
            id: p.id, moduleId: p.module_id,
            authorName: p.profiles?.full_name || 'Pengguna', authorRole: p.profiles?.role || 'mahasiswa',
            content: p.content, createdAt: p.created_at, likes: p.likes || 0,
            replies: (replies || []).filter(r => r.parent_id === p.id).map(r => ({
              id: r.id, authorName: r.profiles?.full_name || 'Pengguna', authorRole: r.profiles?.role || 'mahasiswa',
              content: r.content, createdAt: r.created_at,
            })),
          }));
        } catch(e) { warn('getPosts', e); }
      }
      seedForumIfEmpty();
      seedProgressIfEmpty();
      seedQuizIfEmpty();
      seedTimeIfEmpty();
      seedVarkIfEmpty();
      const all = lsGet('sfp_forum') || [];
      return moduleId ? all.filter(p => p.moduleId === moduleId) : all;
    },

    async addPost({ moduleId, content }) {
      if (useSupabase()) {
        try {
          const uid = await getUid();
          if (uid) {
            const { data, error } = await sb.from('forum_posts').insert({
              module_id: moduleId, user_id: uid, content: content.trim(),
            }).select().single();
            if (error) throw error;
            const profile = await DataLayer.getProfile();
            return {
              id: data.id, moduleId, authorName: profile.name, authorRole: profile.role,
              content: data.content, createdAt: data.created_at, likes: 0, replies: [],
            };
          }
        } catch(e) { warn('addPost', e); }
      }
      const profile = await DataLayer.getProfile();
      const all = lsGet('sfp_forum') || [];
      const post = {
        id: 'post_' + Date.now(), moduleId,
        authorName: profile.name || 'Mahasiswa', authorRole: profile.role || 'mahasiswa',
        content: content.trim(), createdAt: new Date().toISOString(), likes: 0, replies: [],
      };
      all.unshift(post);
      lsSet('sfp_forum', all);
      return post;
    },

    async addReply(postId, { content }) {
      if (useSupabase()) {
        try {
          const uid = await getUid();
          if (uid) {
            const { data: parent } = await sb.from('forum_posts').select('module_id').eq('id', postId).single();
            await sb.from('forum_posts').insert({
              module_id: parent?.module_id, user_id: uid, parent_id: postId, content: content.trim(),
            });
            return;
          }
        } catch(e) { warn('addReply', e); }
      }
      const profile = await DataLayer.getProfile();
      const all = lsGet('sfp_forum') || [];
      const post = all.find(p => p.id === postId);
      if (!post) return;
      post.replies = post.replies || [];
      post.replies.push({
        id: 'rep_' + Date.now(), authorName: profile.name || 'Mahasiswa', authorRole: profile.role || 'mahasiswa',
        content: content.trim(), createdAt: new Date().toISOString(),
      });
      lsSet('sfp_forum', all);
    },

    async likePost(postId) {
      if (useSupabase()) {
        try { await sb.rpc('increment_forum_likes', { p_post_id: postId }); return; }
        catch(e) { warn('likePost', e); }
      }
      const all = lsGet('sfp_forum') || [];
      const post = all.find(p => p.id === postId);
      if (post) { post.likes = (post.likes || 0) + 1; lsSet('sfp_forum', all); }
    },

    // ════════════════════════════════════════════════════
    // DRAFTS (Asistensi Draf Mahasiswa)
    // ════════════════════════════════════════════════════

    async getDrafts(moduleId = null) {
      if (useSupabase()) {
        try {
          const uid = await getUid();
          const profile = await DataLayer.getProfile();
          let q = sb.from('drafts').select('*, profiles(full_name), modules(title)').order('submitted_at', { ascending: false });
          if (profile.role !== 'dosen') q = q.eq('user_id', uid);
          if (moduleId) q = q.eq('module_id', moduleId);
          const { data, error } = await q;
          if (error) throw error;
          const drafts = data || [];
          const ids = drafts.map(d => d.id);
          const { data: comments } = ids.length
            ? await sb.from('draft_comments').select('*, profiles(full_name)').in('draft_id', ids).order('created_at')
            : { data: [] };
          return drafts.map(d => ({
            id: d.id, moduleId: d.module_id, moduleName: d.modules?.title || '',
            authorName: d.profiles?.full_name || 'Mahasiswa', title: d.title, version: d.version,
            content: d.content, status: d.status, submittedAt: d.submitted_at,
            comments: (comments || []).filter(c => c.draft_id === d.id).map(c => ({
              id: c.id, authorName: c.profiles?.full_name || (c.author_role === 'dosen' ? 'Dosen' : 'Mahasiswa'),
              authorRole: c.author_role, text: c.comment, createdAt: c.created_at,
            })),
          }));
        } catch(e) { warn('getDrafts', e); }
      }
      let drafts = lsGet('sfp_drafts');
      if (!drafts) {
        const now = new Date();
        drafts = [
          {
            id: 'draft_1000000001', moduleId: 1, moduleName: 'Dasar & Konsep R&D',
            authorName: 'Andi Pratama', title: 'Identifikasi Masalah Penelitian', version: 1,
            content: 'Penelitian ini bermula dari observasi awal di kelas Metpen yang menunjukkan bahwa mahasiswa kesulitan membedakan pendekatan R&D dengan penelitian eksperimental...',
            status: 'submitted', submittedAt: new Date(now.getTime() - 86400000 * 2).toISOString(),
            comments: [{ id: 'cmt_1000000001', authorName: 'Dr. Ahmad Fauzi, M.Pd.', authorRole: 'dosen', text: 'Identifikasi masalahnya sudah cukup baik. Tolong perkuat dengan data empiris dari sumber yang lebih baru (≤5 tahun). Tambahkan pula studi pendahuluan yang lebih konkret.', createdAt: new Date(now.getTime() - 86400000).toISOString() }],
          },
          {
            id: 'draft_1000000002', moduleId: 2, moduleName: 'Model Pengembangan ADDIE & 4D',
            authorName: 'Dewi Lestari', title: 'Rancangan Model ADDIE untuk Media Interaktif', version: 2,
            content: 'Draf ini menguraikan penerapan model ADDIE dalam pengembangan media pembelajaran interaktif berbasis web untuk mata pelajaran IPA kelas VIII...',
            status: 'revision', submittedAt: new Date(now.getTime() - 86400000 * 5).toISOString(),
            comments: [
              { id: 'cmt_1000000002', authorName: 'Dr. Ahmad Fauzi, M.Pd.', authorRole: 'dosen', text: 'Tahap Analysis sudah bagus. Namun pada tahap Design, perlu diperjelas indikator keberhasilan produk. Sertakan juga instrumen validasi yang akan digunakan.', createdAt: new Date(now.getTime() - 86400000 * 4).toISOString() },
              { id: 'cmt_1000000003', authorName: 'Dewi Lestari', authorRole: 'mahasiswa', text: 'Terima kasih Pak. Saya sudah revisi bagian Design dan menambahkan rubrik validasi. Mohon dicek kembali.', createdAt: new Date(now.getTime() - 86400000 * 3).toISOString() },
            ],
          },
          {
            id: 'draft_1000000003', moduleId: 3, moduleName: 'Needs Assessment & Analisis Kebutuhan',
            authorName: 'Ahmad Rizki', title: 'Laporan Needs Assessment Bab 1', version: 1,
            content: 'Analisis kebutuhan dilakukan melalui observasi kelas dan wawancara terstruktur kepada 3 guru IPA di SMP Negeri 5. Hasil menunjukkan bahwa 78% siswa mengalami kesulitan memahami konsep abstrak melalui buku teks konvensional...',
            status: 'reviewed', submittedAt: new Date(now.getTime() - 86400000 * 3).toISOString(),
            comments: [{ id: 'cmt_1000000004', authorName: 'Dr. Ahmad Fauzi, M.Pd.', authorRole: 'dosen', text: 'Needs assessment sudah komprehensif dan datanya kuat. Triangulasi antara observasi dan wawancara dilakukan dengan baik. Lanjutkan ke penyusunan rumusan masalah dan tujuan penelitian. Approved untuk diteruskan ke bab berikutnya.', createdAt: new Date(now.getTime() - 86400000 * 2).toISOString() }],
          },
          {
            id: 'draft_1000000004', moduleId: 1, moduleName: 'Dasar & Konsep R&D',
            authorName: 'Maya Sari', title: 'Latar Belakang Masalah & Justifikasi R&D', version: 3,
            content: 'Latar belakang ini menjabarkan kesenjangan antara kondisi ideal pembelajaran berbasis proyek dengan kondisi nyata di lapangan berdasarkan studi pendahuluan di tiga sekolah menengah atas di Kota Malang...',
            status: 'reviewed', submittedAt: new Date(now.getTime() - 86400000 * 10).toISOString(),
            comments: [
              { id: 'cmt_1000000005', authorName: 'Dr. Ahmad Fauzi, M.Pd.', authorRole: 'dosen', text: 'Versi pertama: latar belakang masih terlalu umum. Perlu data spesifik dari studi pendahuluan.', createdAt: new Date(now.getTime() - 86400000 * 9).toISOString() },
              { id: 'cmt_1000000006', authorName: 'Maya Sari', authorRole: 'mahasiswa', text: 'Sudah ditambahkan data angket dari 3 sekolah Pak. Mohon ditinjau kembali.', createdAt: new Date(now.getTime() - 86400000 * 7).toISOString() },
              { id: 'cmt_1000000007', authorName: 'Dr. Ahmad Fauzi, M.Pd.', authorRole: 'dosen', text: 'Revisi sudah sangat baik. Data empiris dari studi pendahuluan sudah memperkuat argumentasi. Draf disetujui — lanjutkan ke rumusan masalah dan tujuan penelitian.', createdAt: new Date(now.getTime() - 86400000 * 6).toISOString() },
            ],
          },
        ];
        lsSet('sfp_drafts', drafts);
      }
      if (moduleId !== null) return drafts.filter(d => d.moduleId === moduleId);
      return drafts;
    },

    async submitDraft({ moduleId, moduleName, authorName, title, content }) {
      if (useSupabase()) {
        try {
          const uid = await getUid();
          if (uid) {
            const { data, error } = await sb.from('drafts').insert({
              user_id: uid, module_id: moduleId, title, content, version: 1, status: 'submitted',
            }).select().single();
            if (error) throw error;
            return {
              id: data.id, moduleId, moduleName, authorName: authorName || 'Mahasiswa', title,
              version: 1, content, status: 'submitted', submittedAt: data.submitted_at, comments: [],
            };
          }
        } catch(e) { warn('submitDraft', e); }
      }
      const drafts = await DataLayer.getDrafts();
      const newDraft = {
        id: 'draft_' + Date.now(), moduleId, moduleName, authorName: authorName || 'Mahasiswa',
        title, version: 1, content, status: 'submitted', submittedAt: new Date().toISOString(), comments: [],
      };
      drafts.unshift(newDraft);
      lsSet('sfp_drafts', drafts);
      return newDraft;
    },

    async addComment(draftId, { text, authorName, authorRole }) {
      if (useSupabase()) {
        try {
          const uid = await getUid();
          if (uid) {
            const { data, error } = await sb.from('draft_comments').insert({
              draft_id: draftId, author_id: uid, author_role: authorRole, comment: text,
            }).select().single();
            if (error) throw error;
            return { id: data.id, authorName, authorRole, text, createdAt: data.created_at };
          }
        } catch(e) { warn('addComment', e); }
      }
      const drafts = await DataLayer.getDrafts();
      const idx = drafts.findIndex(d => d.id === draftId);
      if (idx === -1) return null;
      const comment = {
        id: 'cmt_' + Date.now(), authorName: authorName || (authorRole === 'dosen' ? 'Dosen' : 'Mahasiswa'),
        authorRole, text, createdAt: new Date().toISOString(),
      };
      drafts[idx].comments.push(comment);
      lsSet('sfp_drafts', drafts);
      return comment;
    },

    async addDraftComment(draftId, { text, authorRole }) {
      const profile = await DataLayer.getProfile();
      const authorName = authorRole === 'dosen' ? (profile.name || 'Dosen') : (profile.name || 'Mahasiswa');
      return DataLayer.addComment(draftId, { text, authorName, authorRole });
    },

    async updateDraftStatus(draftId, status) {
      if (useSupabase()) {
        try { await sb.from('drafts').update({ status }).eq('id', draftId); return; }
        catch(e) { warn('updateDraftStatus', e); }
      }
      const drafts = await DataLayer.getDrafts();
      const idx = drafts.findIndex(d => d.id === draftId);
      if (idx === -1) return;
      drafts[idx].status = status;
      lsSet('sfp_drafts', drafts);
    },

    // ════════════════════════════════════════════════════
    // FEEDBACK KEPRAKTISAN (mahasiswa menilai modul)
    // ════════════════════════════════════════════════════

    async saveFeedback(moduleId, data) {
      const rataRata = ((data.konten + data.kemudahan + data.keterbacaan + data.kebermanfaatan) / 4).toFixed(1);
      if (useSupabase()) {
        try {
          const uid = await getUid();
          if (uid) {
            await sb.from('feedback').insert({
              user_id: uid, module_id: moduleId,
              konten: data.konten, kemudahan: data.kemudahan,
              keterbacaan: data.keterbacaan, kebermanfaatan: data.kebermanfaatan,
              rata_rata: rataRata, komentar: data.komentar || '',
            });
            return;
          }
        } catch(e) { warn('saveFeedback', e); }
      }
      const all = lsGet('sfp_feedback') || [];
      all.push({
        id: 'fb_' + Date.now(), moduleId,
        konten: data.konten, kemudahan: data.kemudahan, keterbacaan: data.keterbacaan, kebermanfaatan: data.kebermanfaatan,
        rataRata, komentar: data.komentar || '', date: new Date().toISOString(),
      });
      lsSet('sfp_feedback', all);
    },

    async getFeedback(moduleId = null) {
      if (useSupabase()) {
        try {
          const profile = await DataLayer.getProfile();
          const uid = await getUid();
          let q = sb.from('feedback').select('*').order('submitted_at', { ascending: false });
          if (profile.role !== 'dosen') q = q.eq('user_id', uid);
          if (moduleId) q = q.eq('module_id', moduleId);
          const { data, error } = await q;
          if (error) throw error;
          return (data || []).map(f => ({
            id: f.id, moduleId: f.module_id, konten: f.konten, kemudahan: f.kemudahan,
            keterbacaan: f.keterbacaan, kebermanfaatan: f.kebermanfaatan,
            rataRata: f.rata_rata, komentar: f.komentar, date: f.submitted_at,
          }));
        } catch(e) { warn('getFeedback', e); }
      }
      const all = lsGet('sfp_feedback') || [];
      return moduleId ? all.filter(f => f.moduleId == moduleId) : all;
    },

    // ════════════════════════════════════════════════════
    // VALIDASI AHLI
    // ════════════════════════════════════════════════════

    async saveValidasi(data) {
      if (useSupabase()) {
        try {
          const uid = await getUid();
          if (uid) {
            await sb.from('validasi_ahli').upsert({
              user_id: uid,
              aspek_media: data.aspekMedia, aspek_materi: data.aspekMateri,
              total_avg: data.totalAvg, validator: data.validator,
              submitted_at: new Date(data.timestamp || Date.now()).toISOString(),
            }, { onConflict: 'user_id' });
            return;
          }
        } catch(e) { warn('saveValidasi', e); }
      }
      lsSet('sfp_validasi', data);
    },

    async getValidasi() {
      if (useSupabase()) {
        try {
          const uid = await getUid();
          if (uid) {
            const { data, error } = await sb.from('validasi_ahli').select('*').eq('user_id', uid).maybeSingle();
            if (error) throw error;
            if (data) return {
              aspekMedia: data.aspek_media, aspekMateri: data.aspek_materi,
              totalAvg: data.total_avg, validator: data.validator,
              timestamp: new Date(data.submitted_at).getTime(),
            };
            return null;
          }
        } catch(e) { warn('getValidasi', e); }
      }
      return lsGet('sfp_validasi') || null;
    },

    // ════════════════════════════════════════════════════
    // CLASS STATS (dashboard dosen — agregat per modul)
    // ════════════════════════════════════════════════════

    async getClassStats() {
      if (useSupabase()) {
        try {
          const [modulesRes, progressRes, quizRes] = await Promise.all([
            sb.from('modules').select('id, order_num, title').order('order_num'),
            sb.from('user_progress').select('module_id, status, time_spent'),
            sb.from('quiz_attempts').select('module_id, score'),
          ]);
          if (modulesRes.error) throw modulesRes.error;
          const modules = modulesRes.data || [];
          const progress = progressRes.data || [];
          const quiz = quizRes.data || [];
          return modules.map(m => {
            const prog = progress.filter(p => p.module_id === m.id);
            const selesai = prog.filter(p => p.status === 'completed').length;
            const scores = quiz.filter(q => q.module_id === m.id).map(q => q.score);
            const avgQ = scores.length ? Math.round(scores.reduce((a,b) => a+b, 0) / scores.length) : 0;
            const times = prog.map(p => p.time_spent || 0).filter(t => t > 0);
            const waktu = times.length ? Math.round((times.reduce((a,b) => a+b, 0) / times.length) / 60) : 0;
            return { no: m.order_num, title: m.title, selesai, avgQ, waktu };
          });
        } catch(e) { warn('getClassStats', e); }
      }
      return [
        {no:1,title:'Dasar & Konsep R&D',           selesai:28,avgQ:80,waktu:18},
        {no:2,title:'Model ADDIE & 4D',              selesai:25,avgQ:78,waktu:22},
        {no:3,title:'Needs Assessment',              selesai:22,avgQ:75,waktu:20},
        {no:4,title:'Penyusunan Bab 1 Proposal',    selesai:20,avgQ:72,waktu:25},
        {no:5,title:'Blueprint & Storyboard',        selesai:14,avgQ:68,waktu:19},
        {no:6,title:'Instrumen Validasi Ahli',       selesai:6, avgQ:0, waktu:0},
        {no:7,title:'Analisis Data Validasi',        selesai:2, avgQ:0, waktu:0},
        {no:8,title:'Uji Coba & Implementasi',       selesai:0, avgQ:0, waktu:0},
        {no:9,title:'Evaluasi & Diseminasi',         selesai:0, avgQ:0, waktu:0},
      ];
    },

    /**
     * Agregat per mahasiswa (dipakai analitik.html) — profil + progress + kuis + feedback.
     * TIDAK ada fallback demo di sini secara sengaja (dipanggil hanya saat useSupabase()===true
     * dari analitik.html; kalau gagal, caller yang decide render dummy).
     */
    async getStudentStats() {
      if (!useSupabase()) return null;
      try {
        const [studentsRes, progressRes, quizRes, feedbackRes] = await Promise.all([
          sb.from('profiles').select('id, full_name').eq('role', 'mahasiswa'),
          sb.from('user_progress').select('user_id, module_id, status, time_spent'),
          sb.from('quiz_attempts').select('user_id, score'),
          sb.from('feedback').select('user_id, rata_rata'),
        ]);
        if (studentsRes.error) throw studentsRes.error;
        const students = studentsRes.data || [];
        const progress = progressRes.data || [];
        const quiz = quizRes.data || [];
        const feedback = feedbackRes.data || [];
        return students.map(s => {
          const prog = progress.filter(p => p.user_id === s.id);
          const modul = prog.filter(p => p.status === 'completed').length;
          const scores = quiz.filter(q => q.user_id === s.id).map(q => q.score);
          const kuis = scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : 0;
          const jam = +(prog.reduce((sum,p)=>sum+(p.time_spent||0),0) / 3600).toFixed(1);
          const fb = feedback.filter(f => f.user_id === s.id).map(f => +f.rata_rata).filter(n => !isNaN(n));
          const kepraktisan = fb.length ? +(fb.reduce((a,b)=>a+b,0)/fb.length).toFixed(1) : null;
          const lastOpen = prog.map(p => p.time_spent > 0).length;
          const status = jam > 0 ? 'aktif' : 'tidak';
          return { id: s.id, nama: s.full_name, modul, kuis, jam, kepraktisan, status };
        });
      } catch(e) { warn('getStudentStats', e); return null; }
    },

    /**
     * % mahasiswa yang menyelesaikan tiap modul (dari total mahasiswa terdaftar).
     * Return: [{ label:'Modul 1', pct:100 }, ...] urut order_num, atau null (demo/gagal).
     * Red confirmed: AssertionError actual=undefined vs expected [{label,pct}...]
     */
    async getModulDistribution() {
      if (!useSupabase()) return null;
      try {
        const [modulesRes, studentsRes, progressRes] = await Promise.all([
          sb.from('modules').select('id, order_num').order('order_num'),
          sb.from('profiles').select('id').eq('role', 'mahasiswa'),
          sb.from('user_progress').select('module_id').eq('status', 'completed'),
        ]);
        if (modulesRes.error) throw modulesRes.error;
        const totalStudents = (studentsRes.data || []).length || 1;
        return computeModulDistribution(modulesRes.data || [], totalStudents, progressRes.data || []);
      } catch(e) { warn('getModulDistribution', e); return null; }
    },

    /**
     * Rata-rata skor feedback kepraktisan per aspek. Return: [{label,nilai}] 4 baris atau null.
     * Red confirmed: AssertionError actual=undefined vs expected [{label,nilai}...]
     */
    async getFeedbackAspectAvg() {
      if (!useSupabase()) return null;
      try {
        const { data, error } = await sb.from('feedback').select('konten, kemudahan, keterbacaan, kebermanfaatan');
        if (error) throw error;
        return computeFeedbackAspectAvg(data || []);
      } catch(e) { warn('getFeedbackAspectAvg', e); return null; }
    },

    // ════════════════════════════════════════════════════
    // PROFIL PENGGUNA (data diri tambahan — profil.html)
    // ════════════════════════════════════════════════════

    async saveProfil(data) {
      if (useSupabase()) {
        try {
          const uid = await getUid();
          if (uid) {
            await sb.from('profiles').upsert({
              id: uid, full_name: data.nama, nim_nidn: data.nim,
              prodi: data.prodi, angkatan: data.angkatan,
            });
            return;
          }
        } catch(e) { warn('saveProfil', e); }
      }
      lsSet('sfp_profil', data);
    },

    async getProfil() {
      if (useSupabase()) {
        try {
          const uid = await getUid();
          if (uid) {
            const { data, error } = await sb.from('profiles')
              .select('full_name, nim_nidn, prodi, angkatan, role').eq('id', uid).single();
            if (error) throw error;
            return data ? {
              nama: data.full_name, nim: data.nim_nidn, prodi: data.prodi,
              angkatan: data.angkatan, role: data.role,
            } : null;
          }
        } catch(e) { warn('getProfil', e); }
      }
      return lsGet('sfp_profil') || null;
    },

    // ════════════════════════════════════════════════════
    // MANAJEMEN MODUL (dosen — edit metadata & urutan langsung di tabel modules)
    // ════════════════════════════════════════════════════

    async saveModulCustom(moduleId, data) {
      if (useSupabase()) {
        try {
          await sb.from('modules').update({
            title: data.judul, description: data.deskripsi,
            is_active: data.status !== 'nonaktif',
          }).eq('id', moduleId);
          return;
        } catch(e) { warn('saveModulCustom', e); }
      }
      lsSet('sfp_modul_custom_' + moduleId, data);
    },

    async getModulCustom(moduleId) {
      if (useSupabase()) {
        try {
          const { data, error } = await sb.from('modules').select('title, description, is_active').eq('id', moduleId).single();
          if (error) throw error;
          return data ? { judul: data.title, deskripsi: data.description, status: data.is_active ? 'aktif' : 'nonaktif' } : null;
        } catch(e) { warn('getModulCustom', e); }
      }
      return lsGet('sfp_modul_custom_' + moduleId) || null;
    },

    async saveModulOrder(order) {
      if (useSupabase()) {
        try {
          await Promise.all(order.map((moduleId, i) =>
            sb.from('modules').update({ order_num: i + 1 }).eq('id', moduleId)
          ));
          return;
        } catch(e) { warn('saveModulOrder', e); }
      }
      lsSet('sfp_modul_order', order);
    },

    async getModulOrder() {
      if (useSupabase()) {
        try {
          const { data, error } = await sb.from('modules').select('id').order('order_num');
          if (error) throw error;
          return data && data.length ? data.map(m => m.id) : null;
        } catch(e) { warn('getModulOrder', e); }
      }
      return lsGet('sfp_modul_order') || null;
    },

  };
})();

// Export pure functions untuk Node test (tests/data-layer.compute.test.js).
// Browser (typeof module === 'undefined') mengabaikan blok ini.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { computeModulDistribution, computeFeedbackAspectAvg, DataLayer };
}
