/* ═══════════════════════════════════════════════════════════════════
   SMART-FLIP 5.0 — data-layer.js  (v0.8.x)
   Data abstraction layer: localStorage now → Supabase later.
   Swap backend di sini (USE_SUPABASE = true) tanpa ubah UI pages.

   ── Urutan load di setiap halaman protected ──────────────────────
     <script src="supabase.js"></script>       ← kredensial Supabase
     <script src="modules-data.js"></script>   ← konstanta MODULES_DATA
     <script src="data-layer.js"></script>     ← abstraksi ini

   ── Daftar method public (DataLayer.*) ──────────────────────────
   MODULES
     getModules()                       → array semua modul
     getModuleById(id)                  → satu modul atau null

   PROGRESS
     getProgress(modulePath)            → { pct, currentPage, lastOpened }
     saveProgress(modulePath, data)     → void
     getAllProgress()                   → { [path]: { pct, ... } }

   QUIZ
     getQuizAttempts(moduleId)          → array attempt
     saveQuizAttempt(moduleId, attempt) → void
     getLastQuizAttempt(moduleId)       → attempt | null

   PROFILE
     getProfile()                       → { name, role, nim, email, ... }
     updateProfile(data)                → void

   VARK
     getVarkResult()                    → { V, A, R, K, dominant, ... } | null
     saveVarkResult({ V, A, R, K, dominant, completedAt? })  → void
     clearVarkResult()                  → void   ← untuk retake

   LEARNING TIME
     getTimeSpent(moduleId)             → detik (number)
     addTimeSpent(moduleId, seconds)    → void

   SEQUENTIAL CONTENT FLOW
     getSeqState(moduleId)              → { videoWatched, pdfOpened }
     saveSeqState(moduleId, state)      → void

   REFLEKSI METAKOGNITIF
     getRefleksi(moduleId)              → boolean[5]
     saveRefleksi(moduleId, checks)     → void

   NOTIFICATIONS
     getNotifications()                 → array notif
     markNotificationRead(id)           → void
     markAllNotificationsRead()         → void
     markAllRead()                      → alias markAllNotificationsRead

   FORUM
     getPosts(moduleId?)                → array post
     addPost({ moduleId, content })     → post
     addReply(postId, { content })      → void
     likePost(postId)                   → void

   DRAFTS
     getDrafts(moduleId?)               → array draft
     submitDraft({ moduleId, moduleName, authorName, title, content }) → draft
     addComment(draftId, { text, authorName, authorRole })   → comment
     addDraftComment(draftId, { text, authorRole })          → comment
     updateDraftStatus(draftId, status) → void

   FEEDBACK KEPRAKTISAN (mahasiswa)
     saveFeedback(moduleId, data)       → void   (konten, kemudahan, keterbacaan, kebermanfaatan, komentar)
     getFeedback(moduleId?)             → array feedback (filter per modul atau semua)

   CLASS STATS (dosen)
     getClassStats()                    → array statistik per modul (demo data)

   ── Migrasi ke Supabase ─────────────────────────────────────────
   1. Set USE_SUPABASE = true
   2. Aktifkan blok TODO di setiap method (hapus komentar //)
   3. Pastikan RLS Supabase sudah dikonfigurasi per tabel
   ═══════════════════════════════════════════════════════════════════ */

'use strict';

const DataLayer = (() => {

  // ─── CONFIG ───────────────────────────────────────────
  // Ubah ke true ketika Supabase backend sudah siap
  const USE_SUPABASE = false;

  // ─── INTERNAL HELPERS ─────────────────────────────────
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

  // ─── FORUM SEED ───────────────────────────────────────
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
            authorName: 'Ir. Johan Iriawan, M.T.', authorRole: 'dosen',
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
            authorName: 'Ir. Johan Iriawan, M.T.', authorRole: 'dosen',
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
            authorName: 'Ir. Johan Iriawan, M.T.', authorRole: 'dosen',
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
            authorName: 'Ir. Johan Iriawan, M.T.', authorRole: 'dosen',
            content: 'Betul saran Siti. Tambahan: prioritaskan literatur dari jurnal terindeks (Scopus/SINTA) dan maksimal 10 tahun terakhir (kecuali teori dasar seperti Bloom, Piaget, dll). Fokus pada yang langsung berkaitan dengan variabel penelitianmu.',
            createdAt: new Date(Date.now() - 380000000).toISOString(),
          },
        ],
      },
    ]);
  }

  // ─── PROGRESS SEED ────────────────────────────────────
  function seedProgressIfEmpty() {
    // Seed modul 1 — selesai 100%
    if (!lsGet('sfp_books/modul-01.pdf')) {
      lsSet('sfp_books/modul-01.pdf', {
        pct: 100, currentPage: 24, totalPages: 24,
        lastOpened: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }
    // Seed modul 2 — selesai 100%
    if (!lsGet('sfp_books/modul-02.pdf')) {
      lsSet('sfp_books/modul-02.pdf', {
        pct: 100, currentPage: 20, totalPages: 20,
        lastOpened: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }
    // Seed modul 3 — sedang dikerjakan 45%
    if (!lsGet('sfp_books/modul-03.pdf')) {
      lsSet('sfp_books/modul-03.pdf', {
        pct: 45, currentPage: 9, totalPages: 20,
        lastOpened: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }
  }

  // ─── QUIZ SEED ────────────────────────────────────────
  function seedQuizIfEmpty() {
    // Kuis modul 1 — 2 percobaan (skor naik: 60 → 80)
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
    // Kuis modul 2 — 1 percobaan sempurna
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

  // ─── LEARNING TIME SEED ───────────────────────────────
  function seedTimeIfEmpty() {
    if (!localStorage.getItem('sfp_time_1')) localStorage.setItem('sfp_time_1', '2340');  // 39 menit
    if (!localStorage.getItem('sfp_time_2')) localStorage.setItem('sfp_time_2', '1980');  // 33 menit
    if (!localStorage.getItem('sfp_time_3')) localStorage.setItem('sfp_time_3', '720');   // 12 menit
  }

  // ─── VARK SEED ────────────────────────────────────────
  function seedVarkIfEmpty() {
    if (!lsGet('sfp_vark')) {
      lsSet('sfp_vark', {
        V: 5, A: 3, R: 2, K: 2,
        dominant: 'visual',
        completedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }
  }

  // ─── PUBLIC API ───────────────────────────────────────
  return {

    // ════════════════════════════════════════════════════
    // MODULES
    // ════════════════════════════════════════════════════

    /**
     * Ambil semua modul.
     * localStorage/hardcode: baca konstanta MODULES_DATA dari modules-data.js
     * Supabase (nanti):
     *   const { data } = await sb.from('modules')
     *     .select('*').order('order_num');
     *   return data ?? [];
     */
    async getModules() {
      if (USE_SUPABASE && typeof sb !== 'undefined') {
        // TODO: const { data } = await sb.from('modules').select('*').order('order_num');
        // return data ?? [];
      }
      // Coba MODULES_DATA dulu (dari modules-data.js), fallback ke array kosong
      return typeof MODULES_DATA !== 'undefined' ? MODULES_DATA : [];
    },

    /**
     * Ambil satu modul berdasarkan id.
     * Supabase (nanti):
     *   const { data } = await sb.from('modules')
     *     .select('*').eq('id', id).single();
     *   return data;
     */
    async getModuleById(id) {
      if (USE_SUPABASE && typeof sb !== 'undefined') {
        // TODO: const { data } = await sb.from('modules').select('*').eq('id', id).single();
        // return data;
      }
      const all = await DataLayer.getModules();
      return all.find(m => m.id === id) || null;
    },

    // ════════════════════════════════════════════════════
    // PROGRESS (per modul)
    // ════════════════════════════════════════════════════

    /**
     * Baca progress satu modul berdasarkan path-nya.
     * Key localStorage: sfp_{modulePath}
     * Return: { pct, currentPage, lastOpened }
     *
     * Supabase (nanti):
     *   const { data } = await sb.from('module_progress')
     *     .select('pct, current_page, last_opened')
     *     .eq('user_id', (await sb.auth.getUser()).data.user.id)
     *     .eq('module_path', modulePath).single();
     *   return data || { pct: 0, currentPage: 0, lastOpened: null };
     */
    async getProgress(modulePath) {
      if (USE_SUPABASE && typeof sb !== 'undefined') {
        // TODO: const { data } = await sb.from('module_progress')
        //   .select('pct, current_page, last_opened')
        //   .eq('user_id', (await sb.auth.getUser()).data.user.id)
        //   .eq('module_path', modulePath).single();
        // return data || { pct: 0, currentPage: 0, lastOpened: null };
      }
      return lsGet('sfp_' + modulePath) || { pct: 0, currentPage: 0, lastOpened: null };
    },

    /**
     * Simpan progress satu modul.
     * @param {string} modulePath   - path PDF, mis. 'books/modul-01.pdf'
     * @param {{ pct?, currentPage?, lastOpened? }} data
     *
     * Supabase (nanti):
     *   const { data: { user } } = await sb.auth.getUser();
     *   await sb.from('module_progress').upsert({
     *     user_id: user.id, module_path: modulePath,
     *     pct: data.pct, current_page: data.currentPage,
     *     last_opened: new Date().toISOString()
     *   }, { onConflict: 'user_id,module_path' });
     */
    async saveProgress(modulePath, data) {
      if (USE_SUPABASE && typeof sb !== 'undefined') {
        // TODO: const { data: { user } } = await sb.auth.getUser();
        // await sb.from('module_progress').upsert({
        //   user_id: user.id, module_path: modulePath,
        //   pct: data.pct, current_page: data.currentPage,
        //   last_opened: new Date().toISOString()
        // }, { onConflict: 'user_id,module_path' });
        // return;
      }
      const existing = await DataLayer.getProgress(modulePath);
      lsSet('sfp_' + modulePath, {
        ...existing,
        ...data,
        lastOpened: data.lastOpened || new Date().toISOString(),
      });
    },

    /**
     * Ambil progress semua modul sekaligus (untuk dashboard summary).
     * Scan semua key sfp_books/ di localStorage.
     * Return: { 'books/modul-01.pdf': { pct, currentPage, lastOpened }, ... }
     *
     * Supabase (nanti):
     *   const { data: { user } } = await sb.auth.getUser();
     *   const { data } = await sb.from('module_progress')
     *     .select('module_path, pct, current_page, last_opened')
     *     .eq('user_id', user.id);
     *   return Object.fromEntries((data || []).map(r => [r.module_path, {
     *     pct: r.pct, currentPage: r.current_page, lastOpened: r.last_opened
     *   }]));
     */
    async getAllProgress() {
      if (USE_SUPABASE && typeof sb !== 'undefined') {
        // TODO: const { data: { user } } = await sb.auth.getUser();
        // const { data } = await sb.from('module_progress')
        //   .select('module_path, pct, current_page, last_opened')
        //   .eq('user_id', user.id);
        // return Object.fromEntries((data || []).map(r => [r.module_path, {
        //   pct: r.pct, currentPage: r.current_page, lastOpened: r.last_opened
        // }]));
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

    /**
     * Ambil semua riwayat attempt kuis untuk satu modul.
     * Key localStorage: sfp_quiz_{moduleId}
     * Return: array of { score, pct, answers, completedAt }
     *
     * Supabase (nanti):
     *   const { data: { user } } = await sb.auth.getUser();
     *   const { data } = await sb.from('quiz_attempts')
     *     .select('score, pct, answers, completed_at')
     *     .eq('user_id', user.id)
     *     .eq('module_id', moduleId)
     *     .order('completed_at', { ascending: false });
     *   return data || [];
     */
    async getQuizAttempts(moduleId) {
      if (USE_SUPABASE && typeof sb !== 'undefined') {
        // TODO: const { data: { user } } = await sb.auth.getUser();
        // const { data } = await sb.from('quiz_attempts')
        //   .select('score, pct, answers, completed_at')
        //   .eq('user_id', user.id).eq('module_id', moduleId)
        //   .order('completed_at', { ascending: false });
        // return data || [];
      }
      // Baca key lama (sfp_kuis_) dan key baru (sfp_quiz_) — fallback kompatibel
      return lsGet('sfp_quiz_' + moduleId) || lsGet('sfp_kuis_' + moduleId) || [];
    },

    /**
     * Simpan satu attempt kuis.
     * @param {number} moduleId
     * @param {{ score, pct?, answers?, completedAt? }} attempt
     *
     * Supabase (nanti):
     *   const { data: { user } } = await sb.auth.getUser();
     *   await sb.from('quiz_attempts').insert({
     *     user_id: user.id, module_id: moduleId,
     *     score: attempt.score, pct: attempt.pct,
     *     answers: attempt.answers,
     *     completed_at: attempt.completedAt || new Date().toISOString()
     *   });
     */
    async saveQuizAttempt(moduleId, attempt) {
      if (USE_SUPABASE && typeof sb !== 'undefined') {
        // TODO: const { data: { user } } = await sb.auth.getUser();
        // await sb.from('quiz_attempts').insert({
        //   user_id: user.id, module_id: moduleId,
        //   score: attempt.score, pct: attempt.pct,
        //   answers: attempt.answers,
        //   completed_at: attempt.completedAt || new Date().toISOString()
        // });
        // return;
      }
      const existing = await DataLayer.getQuizAttempts(moduleId);
      existing.push({
        ...attempt,
        completedAt: attempt.completedAt || new Date().toISOString(),
        // simpan field 'date' juga agar kompatibel dengan kode lama yang baca .date
        date: attempt.date || new Date().toLocaleDateString('id-ID', {
          day: '2-digit', month: 'short', year: 'numeric'
        }),
      });
      // Simpan hanya 10 attempt terakhir
      lsSet('sfp_quiz_' + moduleId, existing.slice(-10));
    },

    /**
     * Ambil attempt kuis terakhir (attempt paling baru) untuk satu modul.
     *
     * Supabase (nanti):
     *   const attempts = await DataLayer.getQuizAttempts(moduleId);
     *   return attempts[0] || null; // sudah di-order DESC
     */
    async getLastQuizAttempt(moduleId) {
      if (USE_SUPABASE && typeof sb !== 'undefined') {
        // TODO: ambil dari getQuizAttempts dan return [0]
      }
      const attempts = await DataLayer.getQuizAttempts(moduleId);
      return attempts.length ? attempts[attempts.length - 1] : null;
    },

    // ════════════════════════════════════════════════════
    // PROFILE / USER
    // ════════════════════════════════════════════════════

    /**
     * Ambil profil user saat ini.
     * localStorage: baca dari sfp_profile
     * Return: { name, role, nim, email, learning_style }
     *
     * Supabase (nanti):
     *   const { data: { user } } = await sb.auth.getUser();
     *   const { data } = await sb.from('profiles')
     *     .select('*').eq('id', user.id).single();
     *   return data;
     */
    async getProfile() {
      if (USE_SUPABASE && typeof sb !== 'undefined') {
        // TODO: const { data: { user } } = await sb.auth.getUser();
        // const { data } = await sb.from('profiles').select('*').eq('id', user.id).single();
        // return data;
      }
      return lsGet('sfp_profile') || {
        name: 'Mahasiswa',
        role: 'mahasiswa',
        nim: '',
        email: '',
        learning_style: null,
      };
    },

    /**
     * Update data profil user.
     * @param {{ name?, role?, nim?, email?, learning_style? }} data
     *
     * Supabase (nanti):
     *   const { data: { user } } = await sb.auth.getUser();
     *   await sb.from('profiles').upsert({ id: user.id, ...data });
     */
    async updateProfile(data) {
      if (USE_SUPABASE && typeof sb !== 'undefined') {
        // TODO: const { data: { user } } = await sb.auth.getUser();
        // await sb.from('profiles').upsert({ id: user.id, ...data });
        // return;
      }
      const existing = await DataLayer.getProfile();
      lsSet('sfp_profile', { ...existing, ...data });
    },

    // ════════════════════════════════════════════════════
    // VARK
    // ════════════════════════════════════════════════════

    /**
     * Ambil hasil asesmen VARK user.
     * Return: { V, A, R, K, dominant, completedAt } atau null jika belum isi.
     *
     * Supabase (nanti):
     *   const { data: { user } } = await sb.auth.getUser();
     *   const { data } = await sb.from('profiles')
     *     .select('vark_scores, vark_dominant, vark_completed_at')
     *     .eq('id', user.id).single();
     *   if (!data?.vark_scores) return null;
     *   return { ...data.vark_scores, dominant: data.vark_dominant, completedAt: data.vark_completed_at };
     */
    async getVarkResult() {
      if (USE_SUPABASE && typeof sb !== 'undefined') {
        // TODO: const { data: { user } } = await sb.auth.getUser();
        // const { data } = await sb.from('profiles')
        //   .select('vark_scores, vark_dominant, vark_completed_at')
        //   .eq('id', user.id).single();
        // if (!data?.vark_scores) return null;
        // return { ...data.vark_scores, dominant: data.vark_dominant, completedAt: data.vark_completed_at };
      }
      return lsGet('sfp_vark'); // null jika belum isi
    },

    /**
     * Simpan hasil asesmen VARK.
     * @param {{ V, A, R, K, dominant, completedAt? }} result
     *
     * Supabase (nanti):
     *   const { data: { user } } = await sb.auth.getUser();
     *   await sb.from('profiles').upsert({
     *     id: user.id,
     *     vark_scores: { V, A, R, K },
     *     vark_dominant: dominant,
     *     vark_completed_at: completedAt || new Date().toISOString()
     *   });
     */
    async saveVarkResult({ V, A, R, K, dominant, completedAt }) {
      if (USE_SUPABASE && typeof sb !== 'undefined') {
        // TODO: const { data: { user } } = await sb.auth.getUser();
        // await sb.from('profiles').upsert({
        //   id: user.id,
        //   vark_scores: { V, A, R, K }, vark_dominant: dominant,
        //   vark_completed_at: completedAt || new Date().toISOString()
        // });
        // return;
      }
      lsSet('sfp_vark', {
        V, A, R, K, dominant,
        completedAt: completedAt || new Date().toISOString(),
      });
    },

    /**
     * Hapus hasil asesmen VARK (untuk retake).
     *
     * Supabase (nanti):
     *   const { data: { user } } = await sb.auth.getUser();
     *   await sb.from('profiles').upsert({
     *     id: user.id,
     *     vark_scores: null, vark_dominant: null, vark_completed_at: null
     *   });
     */
    async clearVarkResult() {
      if (USE_SUPABASE && typeof sb !== 'undefined') {
        // TODO: const { data: { user } } = await sb.auth.getUser();
        // await sb.from('profiles').upsert({
        //   id: user.id,
        //   vark_scores: null, vark_dominant: null, vark_completed_at: null
        // });
        // return;
      }
      lsRemove('sfp_vark');
    },

    // ════════════════════════════════════════════════════
    // LEARNING TIME
    // ════════════════════════════════════════════════════

    /**
     * Ambil total waktu belajar satu modul dalam detik.
     * Key localStorage: sfp_time_{moduleId}
     * Return: number (detik)
     *
     * Supabase (nanti):
     *   const { data: { user } } = await sb.auth.getUser();
     *   const { data } = await sb.from('learning_sessions')
     *     .select('duration_seconds')
     *     .eq('user_id', user.id).eq('module_id', moduleId);
     *   return (data || []).reduce((sum, r) => sum + r.duration_seconds, 0);
     */
    async getTimeSpent(moduleId) {
      if (USE_SUPABASE && typeof sb !== 'undefined') {
        // TODO: const { data: { user } } = await sb.auth.getUser();
        // const { data } = await sb.from('learning_sessions')
        //   .select('duration_seconds')
        //   .eq('user_id', user.id).eq('module_id', moduleId);
        // return (data || []).reduce((sum, r) => sum + r.duration_seconds, 0);
      }
      const raw = localStorage.getItem('sfp_time_' + moduleId);
      return raw ? (parseInt(raw) || 0) : 0;
    },

    /**
     * Tambahkan durasi waktu belajar ke total yang sudah ada.
     * @param {number} moduleId
     * @param {number} seconds - durasi tambahan dalam detik
     *
     * Supabase (nanti):
     *   const { data: { user } } = await sb.auth.getUser();
     *   await sb.from('learning_sessions').insert({
     *     user_id: user.id, module_id: moduleId,
     *     duration_seconds: seconds,
     *     recorded_at: new Date().toISOString()
     *   });
     */
    async addTimeSpent(moduleId, seconds) {
      if (USE_SUPABASE && typeof sb !== 'undefined') {
        // TODO: const { data: { user } } = await sb.auth.getUser();
        // await sb.from('learning_sessions').insert({
        //   user_id: user.id, module_id: moduleId,
        //   duration_seconds: seconds,
        //   recorded_at: new Date().toISOString()
        // });
        // return;
      }
      const prev = await DataLayer.getTimeSpent(moduleId);
      localStorage.setItem('sfp_time_' + moduleId, String(prev + seconds));
    },

    // ════════════════════════════════════════════════════
    // SEQUENTIAL CONTENT FLOW (FASE 3)
    // ════════════════════════════════════════════════════

    /**
     * Baca state sequential content flow satu modul.
     * Key localStorage: sfp_seq_{moduleId}
     * Return: { videoWatched: bool, pdfOpened: bool }
     *
     * Supabase (nanti):
     *   const { data: { user } } = await sb.auth.getUser();
     *   const { data } = await sb.from('module_progress')
     *     .select('seq_state')
     *     .eq('user_id', user.id).eq('module_id', moduleId).single();
     *   return data?.seq_state || { videoWatched: false, pdfOpened: false };
     */
    async getSeqState(moduleId) {
      if (USE_SUPABASE && typeof sb !== 'undefined') {
        // TODO: const { data: { user } } = await sb.auth.getUser();
        // const { data } = await sb.from('module_progress')
        //   .select('seq_state')
        //   .eq('user_id', user.id).eq('module_id', moduleId).single();
        // return data?.seq_state || { videoWatched: false, pdfOpened: false };
      }
      return lsGet('sfp_seq_' + moduleId) || { videoWatched: false, pdfOpened: false };
    },

    /**
     * Simpan state sequential content flow satu modul.
     * @param {number} moduleId
     * @param {{ videoWatched?: boolean, pdfOpened?: boolean }} state
     *
     * Supabase (nanti):
     *   const { data: { user } } = await sb.auth.getUser();
     *   await sb.from('module_progress').upsert({
     *     user_id: user.id, module_id: moduleId, seq_state: state
     *   }, { onConflict: 'user_id,module_id' });
     */
    async saveSeqState(moduleId, state) {
      if (USE_SUPABASE && typeof sb !== 'undefined') {
        // TODO: const { data: { user } } = await sb.auth.getUser();
        // await sb.from('module_progress').upsert({
        //   user_id: user.id, module_id: moduleId, seq_state: state
        // }, { onConflict: 'user_id,module_id' });
        // return;
      }
      const existing = await DataLayer.getSeqState(moduleId);
      lsSet('sfp_seq_' + moduleId, { ...existing, ...state });
    },

    // ════════════════════════════════════════════════════
    // REFLEKSI METAKOGNITIF (per modul)
    // ════════════════════════════════════════════════════

    /**
     * Ambil data refleksi belajar untuk satu modul.
     * Key localStorage: sfp_refleksi_{moduleId}
     * Return: array boolean [false, false, false, false, false]
     *
     * TODO Supabase: module_progress.refleksi_checks
     *   const { data: { user } } = await sb.auth.getUser();
     *   const { data } = await sb.from('module_progress')
     *     .select('refleksi_checks')
     *     .eq('user_id', user.id).eq('module_id', moduleId).single();
     *   return data?.refleksi_checks || [false, false, false, false, false];
     */
    async getRefleksi(moduleId) {
      if (USE_SUPABASE && typeof sb !== 'undefined') {
        // TODO: implementasi Supabase di atas
      }
      const saved = lsGet('sfp_refleksi_' + moduleId);
      return Array.isArray(saved) ? saved : [false, false, false, false, false];
    },

    /**
     * Simpan data refleksi belajar untuk satu modul.
     * @param {number} moduleId
     * @param {boolean[]} checks - array 5 boolean
     *
     * TODO Supabase: module_progress.refleksi_checks
     *   const { data: { user } } = await sb.auth.getUser();
     *   await sb.from('module_progress').upsert({
     *     user_id: user.id, module_id: moduleId,
     *     refleksi_checks: checks
     *   }, { onConflict: 'user_id,module_id' });
     */
    async saveRefleksi(moduleId, checks) {
      if (USE_SUPABASE && typeof sb !== 'undefined') {
        // TODO: implementasi Supabase di atas
        // return;
      }
      lsSet('sfp_refleksi_' + moduleId, checks);
    },

    // ════════════════════════════════════════════════════
    // NOTIFICATIONS
    // ════════════════════════════════════════════════════

    /**
     * Ambil daftar notifikasi user.
     * Key localStorage: sfp_notifs → array of { id, type, title, body, read, createdAt }
     *
     * Supabase (nanti):
     *   const { data: { user } } = await sb.auth.getUser();
     *   const { data } = await sb.from('notifications')
     *     .select('*').eq('user_id', user.id)
     *     .order('created_at', { ascending: false }).limit(20);
     *   return data || [];
     */
    async getNotifications() {
      if (USE_SUPABASE && typeof sb !== 'undefined') {
        // TODO: const { data: { user } } = await sb.auth.getUser();
        // const { data } = await sb.from('notifications')
        //   .select('*').eq('user_id', user.id)
        //   .order('created_at', { ascending: false }).limit(20);
        // return data || [];
      }
      const stored = lsGet('sfp_notifs');
      if (!stored) {
        const dummy = [
          { id: 'n1', type: 'kuis',   title: 'Kuis Selesai',        body: 'Kamu mendapat skor 80 di Kuis Modul 1. Nilai meningkat dari percobaan sebelumnya!',  read: false, createdAt: new Date(Date.now() - 3600000).toISOString() },
          { id: 'n2', type: 'forum',  title: 'Balasan Baru',        body: 'Ir. Johan Iriawan membalas pertanyaanmu di forum Modul 1 tentang perbedaan R&D.',     read: false, createdAt: new Date(Date.now() - 7200000).toISOString() },
          { id: 'n3', type: 'draf',   title: 'Draf Dikomentari',    body: 'Dosen memberikan komentar pada draf "Identifikasi Masalah Penelitian" kamu.',         read: false, createdAt: new Date(Date.now() - 10800000).toISOString() },
          { id: 'n4', type: 'kuis',   title: 'Kuis Modul 2 Sempurna', body: 'Luar biasa! Kamu mendapat skor 100 pada Kuis Modul 2. Pertahankan!',               read: false, createdAt: new Date(Date.now() - 86400000).toISOString() },
          { id: 'n5', type: 'progres', title: 'Modul 1 Selesai',    body: 'Selamat! Kamu telah menyelesaikan Modul 1: Dasar & Konsep R&D. Lanjut ke Modul 2!',  read: true,  createdAt: new Date(Date.now() - 7 * 24 * 3600000).toISOString() },
          { id: 'n6', type: 'sistem', title: 'Selamat Datang',      body: 'Selamat bergabung di SMART-FLIP 5.0! Mulailah belajar dari Modul 1.',                read: true,  createdAt: new Date(Date.now() - 8 * 24 * 3600000).toISOString() },
        ];
        lsSet('sfp_notifs', dummy);
        return dummy;
      }
      return stored;
    },

    /**
     * Tandai satu notifikasi sebagai sudah dibaca.
     * @param {string} id - id notifikasi
     *
     * Supabase (nanti):
     *   await sb.from('notifications').update({ read: true }).eq('id', id);
     */
    async markNotificationRead(id) {
      if (USE_SUPABASE && typeof sb !== 'undefined') {
        // TODO: await sb.from('notifications').update({ read: true }).eq('id', id);
        // return;
      }
      const notifs = await DataLayer.getNotifications();
      const updated = notifs.map(n => n.id === id ? { ...n, read: true } : n);
      lsSet('sfp_notifs', updated);
    },

    /**
     * Tandai semua notifikasi sebagai sudah dibaca.
     */
    async markAllNotificationsRead() {
      if (USE_SUPABASE && typeof sb !== 'undefined') {
        // TODO: Supabase bulk update
      }
      const notifs = await DataLayer.getNotifications();
      lsSet('sfp_notifs', notifs.map(n => ({ ...n, read: true })));
    },

    /**
     * Alias markAllRead → markAllNotificationsRead (untuk kompatibilitas draf.html / dashboard)
     */
    async markAllRead() {
      return DataLayer.markAllNotificationsRead();
    },

    // ════════════════════════════════════════════════════
    // FORUM (Diskusi Peer-Review)
    // ════════════════════════════════════════════════════

    /**
     * Ambil semua post forum. Jika moduleId diberikan, filter per modul.
     * Key localStorage: sfp_forum → array of Post
     *
     * TODO Supabase: sb.from('forum_posts').select('*').eq('module_id', moduleId).order('created_at', {ascending:false})
     */
    async getPosts(moduleId = null) {
      if (USE_SUPABASE && typeof sb !== 'undefined') {
        // TODO: const { data } = await sb.from('forum_posts').select('*').eq('module_id', moduleId).order('created_at', {ascending:false});
        // return data ?? [];
      }
      seedForumIfEmpty();
      seedProgressIfEmpty();
      seedQuizIfEmpty();
      seedTimeIfEmpty();
      seedVarkIfEmpty();
      const all = lsGet('sfp_forum') || [];
      return moduleId ? all.filter(p => p.moduleId === moduleId) : all;
    },

    /**
     * Buat post forum baru.
     * @param {{ moduleId, content }} param
     *
     * TODO Supabase: sb.from('forum_posts').insert({...})
     */
    async addPost({ moduleId, content }) {
      if (USE_SUPABASE && typeof sb !== 'undefined') {
        // TODO: sb.from('forum_posts').insert({...})
      }
      const profile = await DataLayer.getProfile();
      const all = lsGet('sfp_forum') || [];
      const post = {
        id: 'post_' + Date.now(),
        moduleId,
        authorName: profile.name || 'Mahasiswa',
        authorRole: profile.role || 'mahasiswa',
        content: content.trim(),
        createdAt: new Date().toISOString(),
        likes: 0,
        replies: [],
      };
      all.unshift(post);
      lsSet('sfp_forum', all);
      return post;
    },

    /**
     * Tambahkan balasan ke sebuah post.
     * @param {string} postId
     * @param {{ content }} param
     *
     * TODO Supabase: sb.from('forum_posts').insert({ parent_id: postId, ... })
     */
    async addReply(postId, { content }) {
      if (USE_SUPABASE && typeof sb !== 'undefined') {
        // TODO: sb.from('forum_posts').insert({ parent_id: postId, ... })
      }
      const profile = await DataLayer.getProfile();
      const all = lsGet('sfp_forum') || [];
      const post = all.find(p => p.id === postId);
      if (!post) return;
      post.replies = post.replies || [];
      post.replies.push({
        id: 'rep_' + Date.now(),
        authorName: profile.name || 'Mahasiswa',
        authorRole: profile.role || 'mahasiswa',
        content: content.trim(),
        createdAt: new Date().toISOString(),
      });
      lsSet('sfp_forum', all);
    },

    /**
     * Tambahkan 1 like ke sebuah post.
     * @param {string} postId
     *
     * TODO Supabase: RPC increment_likes(postId)
     */
    async likePost(postId) {
      if (USE_SUPABASE && typeof sb !== 'undefined') {
        // TODO: RPC increment_likes(postId)
      }
      const all = lsGet('sfp_forum') || [];
      const post = all.find(p => p.id === postId);
      if (post) { post.likes = (post.likes || 0) + 1; lsSet('sfp_forum', all); }
    },

    // ════════════════════════════════════════════════════
    // DRAFTS (Asistensi Draf Mahasiswa)
    // ════════════════════════════════════════════════════

    /**
     * Ambil semua draf. Jika moduleId diberikan, filter per modul.
     * Key localStorage: sfp_drafts → array of Draft
     *
     * TODO Supabase: sb.from('draft_submissions').select('*').order('submitted_at', { ascending: false })
     */
    async getDrafts(moduleId = null) {
      if (USE_SUPABASE && typeof sb !== 'undefined') {
        // TODO: implementasi Supabase
      }
      let drafts = lsGet('sfp_drafts');
      if (!drafts) {
        // Seed dummy data jika kosong
        const now = new Date();
        drafts = [
          {
            id: 'draft_1000000001',
            moduleId: 1,
            moduleName: 'Dasar & Konsep R&D',
            authorName: 'Andi Pratama',
            title: 'Identifikasi Masalah Penelitian',
            version: 1,
            content: 'Penelitian ini bermula dari observasi awal di kelas Metpen yang menunjukkan bahwa mahasiswa kesulitan membedakan pendekatan R&D dengan penelitian eksperimental...',
            status: 'submitted',
            submittedAt: new Date(now.getTime() - 86400000 * 2).toISOString(),
            comments: [
              {
                id: 'cmt_1000000001',
                authorName: 'Ir. Johan Iriawan, M.T.',
                authorRole: 'dosen',
                text: 'Identifikasi masalahnya sudah cukup baik. Tolong perkuat dengan data empiris dari sumber yang lebih baru (≤5 tahun). Tambahkan pula studi pendahuluan yang lebih konkret.',
                createdAt: new Date(now.getTime() - 86400000).toISOString(),
              }
            ],
          },
          {
            id: 'draft_1000000002',
            moduleId: 2,
            moduleName: 'Model Pengembangan ADDIE & 4D',
            authorName: 'Dewi Lestari',
            title: 'Rancangan Model ADDIE untuk Media Interaktif',
            version: 2,
            content: 'Draf ini menguraikan penerapan model ADDIE dalam pengembangan media pembelajaran interaktif berbasis web untuk mata pelajaran IPA kelas VIII...',
            status: 'revision',
            submittedAt: new Date(now.getTime() - 86400000 * 5).toISOString(),
            comments: [
              {
                id: 'cmt_1000000002',
                authorName: 'Ir. Johan Iriawan, M.T.',
                authorRole: 'dosen',
                text: 'Tahap Analysis sudah bagus. Namun pada tahap Design, perlu diperjelas indikator keberhasilan produk. Sertakan juga instrumen validasi yang akan digunakan.',
                createdAt: new Date(now.getTime() - 86400000 * 4).toISOString(),
              },
              {
                id: 'cmt_1000000003',
                authorName: 'Dewi Lestari',
                authorRole: 'mahasiswa',
                text: 'Terima kasih Pak. Saya sudah revisi bagian Design dan menambahkan rubrik validasi. Mohon dicek kembali.',
                createdAt: new Date(now.getTime() - 86400000 * 3).toISOString(),
              }
            ],
          },
          {
            id: 'draft_1000000003',
            moduleId: 3,
            moduleName: 'Needs Assessment & Analisis Kebutuhan',
            authorName: 'Ahmad Rizki',
            title: 'Laporan Needs Assessment Bab 1',
            version: 1,
            content: 'Analisis kebutuhan dilakukan melalui observasi kelas dan wawancara terstruktur kepada 3 guru IPA di SMP Negeri 5. Hasil menunjukkan bahwa 78% siswa mengalami kesulitan memahami konsep abstrak melalui buku teks konvensional...',
            status: 'reviewed',
            submittedAt: new Date(now.getTime() - 86400000 * 3).toISOString(),
            comments: [
              {
                id: 'cmt_1000000004',
                authorName: 'Ir. Johan Iriawan, M.T.',
                authorRole: 'dosen',
                text: 'Needs assessment sudah komprehensif dan datanya kuat. Triangulasi antara observasi dan wawancara dilakukan dengan baik. Lanjutkan ke penyusunan rumusan masalah dan tujuan penelitian. Approved untuk diteruskan ke bab berikutnya.',
                createdAt: new Date(now.getTime() - 86400000 * 2).toISOString(),
              },
            ],
          },
          {
            id: 'draft_1000000004',
            moduleId: 1,
            moduleName: 'Dasar & Konsep R&D',
            authorName: 'Maya Sari',
            title: 'Latar Belakang Masalah & Justifikasi R&D',
            version: 3,
            content: 'Latar belakang ini menjabarkan kesenjangan antara kondisi ideal pembelajaran berbasis proyek dengan kondisi nyata di lapangan berdasarkan studi pendahuluan di tiga sekolah menengah atas di Kota Malang...',
            status: 'reviewed',
            submittedAt: new Date(now.getTime() - 86400000 * 10).toISOString(),
            comments: [
              {
                id: 'cmt_1000000005',
                authorName: 'Ir. Johan Iriawan, M.T.',
                authorRole: 'dosen',
                text: 'Versi pertama: latar belakang masih terlalu umum. Perlu data spesifik dari studi pendahuluan.',
                createdAt: new Date(now.getTime() - 86400000 * 9).toISOString(),
              },
              {
                id: 'cmt_1000000006',
                authorName: 'Maya Sari',
                authorRole: 'mahasiswa',
                text: 'Sudah ditambahkan data angket dari 3 sekolah Pak. Mohon ditinjau kembali.',
                createdAt: new Date(now.getTime() - 86400000 * 7).toISOString(),
              },
              {
                id: 'cmt_1000000007',
                authorName: 'Ir. Johan Iriawan, M.T.',
                authorRole: 'dosen',
                text: 'Revisi sudah sangat baik. Data empiris dari studi pendahuluan sudah memperkuat argumentasi. Draf disetujui — lanjutkan ke rumusan masalah dan tujuan penelitian.',
                createdAt: new Date(now.getTime() - 86400000 * 6).toISOString(),
              },
            ],
          },
        ];
        lsSet('sfp_drafts', drafts);
      }
      if (moduleId !== null) {
        return drafts.filter(d => d.moduleId === moduleId);
      }
      return drafts;
    },

    /**
     * Submit draf baru.
     * @param {{ moduleId, moduleName, authorName, title, content }} param
     *
     * TODO Supabase: sb.from('draft_submissions').insert(...)
     */
    async submitDraft({ moduleId, moduleName, authorName, title, content }) {
      if (USE_SUPABASE && typeof sb !== 'undefined') {
        // TODO: await sb.from('draft_submissions').insert({ ... });
      }
      const drafts = await DataLayer.getDrafts();
      const newDraft = {
        id: 'draft_' + Date.now(),
        moduleId,
        moduleName,
        authorName: authorName || 'Mahasiswa',
        title,
        version: 1,
        content,
        status: 'submitted',
        submittedAt: new Date().toISOString(),
        comments: [],
      };
      drafts.unshift(newDraft);
      lsSet('sfp_drafts', drafts);
      return newDraft;
    },

    /**
     * Tambahkan komentar ke draf.
     * @param {string} draftId
     * @param {{ text, authorName, authorRole }} comment
     *
     * TODO Supabase: sb.from('draft_comments').insert(...)
     */
    async addComment(draftId, { text, authorName, authorRole }) {
      if (USE_SUPABASE && typeof sb !== 'undefined') {
        // TODO: implementasi Supabase
      }
      const drafts = await DataLayer.getDrafts();
      const idx = drafts.findIndex(d => d.id === draftId);
      if (idx === -1) return null;
      const comment = {
        id: 'cmt_' + Date.now(),
        authorName: authorName || (authorRole === 'dosen' ? 'Dosen' : 'Mahasiswa'),
        authorRole,
        text,
        createdAt: new Date().toISOString(),
      };
      drafts[idx].comments.push(comment);
      lsSet('sfp_drafts', drafts);
      return comment;
    },

    /**
     * Alias addDraftComment → addComment (dipakai di draf.html)
     * @param {string} draftId
     * @param {{ text, authorRole }} param
     */
    async addDraftComment(draftId, { text, authorRole }) {
      const profile = await DataLayer.getProfile();
      const authorName = authorRole === 'dosen' ? 'Dr. Supervisor' : (profile.name || profile.full_name || 'Mahasiswa');
      return DataLayer.addComment(draftId, { text, authorName, authorRole });
    },

    /**
     * Update status draf.
     * @param {string} draftId
     * @param {'submitted'|'reviewed'|'revision'} status
     *
     * TODO Supabase: sb.from('draft_submissions').update({ status }).eq('id', draftId)
     */
    async updateDraftStatus(draftId, status) {
      if (USE_SUPABASE && typeof sb !== 'undefined') {
        // TODO: await sb.from('draft_submissions').update({ status }).eq('id', draftId);
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

    /**
     * Simpan satu entri feedback kepraktisan.
     * Key localStorage: sfp_feedback → array of feedback entry
     * @param {number} moduleId
     * @param {{ konten, kemudahan, keterbacaan, kebermanfaatan, komentar? }} data
     *   Semua aspek rating: 1–5 (integer)
     *
     * TODO Supabase (nanti):
     *   const { data: { user } } = await sb.auth.getUser();
     *   await sb.from('feedback').insert({
     *     user_id: user.id, module_id: moduleId,
     *     konten: data.konten, kemudahan: data.kemudahan,
     *     keterbacaan: data.keterbacaan, kebermanfaatan: data.kebermanfaatan,
     *     rata_rata: ((data.konten + data.kemudahan + data.keterbacaan + data.kebermanfaatan) / 4).toFixed(1),
     *     komentar: data.komentar || '',
     *     submitted_at: new Date().toISOString()
     *   });
     */
    saveFeedback(moduleId, data) {
      const all = lsGet('sfp_feedback') || [];
      all.push({
        id: 'fb_' + Date.now(),
        moduleId,
        konten: data.konten,                   // 1-5
        kemudahan: data.kemudahan,              // 1-5
        keterbacaan: data.keterbacaan,          // 1-5
        kebermanfaatan: data.kebermanfaatan,    // 1-5
        rataRata: ((data.konten + data.kemudahan + data.keterbacaan + data.kebermanfaatan) / 4).toFixed(1),
        komentar: data.komentar || '',
        date: new Date().toISOString(),
      });
      lsSet('sfp_feedback', all);
    },

    /**
     * Ambil daftar feedback. Jika moduleId diberikan, filter per modul.
     * Key localStorage: sfp_feedback → array of feedback entry
     * @param {number|null} moduleId - null = semua modul
     * Return: array of { id, moduleId, konten, kemudahan, keterbacaan, kebermanfaatan, rataRata, komentar, date }
     *
     * TODO Supabase (nanti):
     *   const { data: { user } } = await sb.auth.getUser();
     *   let q = sb.from('feedback').select('*').eq('user_id', user.id).order('submitted_at', { ascending: false });
     *   if (moduleId) q = q.eq('module_id', moduleId);
     *   const { data } = await q;
     *   return data || [];
     */
    getFeedback(moduleId = null) {
      const all = lsGet('sfp_feedback') || [];
      return moduleId ? all.filter(f => f.moduleId == moduleId) : all;
    },

    // ════════════════════════════════════════════════════
    // VALIDASI AHLI (dosen/ahli mengisi instrumen validasi)
    // ════════════════════════════════════════════════════

    /**
     * Simpan hasil validasi ahli.
     * Key localStorage: sfp_validasi → satu objek (validasi terbaru)
     * @param {{
     *   aspekMedia:  { scores: number[], avg: number, komentar: string },
     *   aspekMateri: { scores: number[], avg: number, komentar: string },
     *   totalAvg:    number,
     *   validator:   { nama: string, institusi: string, keahlian: string },
     *   timestamp:   number
     * }} data
     *
     * TODO Supabase (nanti):
     *   const { data: { user } } = await sb.auth.getUser();
     *   await sb.from('validasi_ahli').upsert({
     *     user_id: user.id,
     *     aspek_media: data.aspekMedia,
     *     aspek_materi: data.aspekMateri,
     *     total_avg: data.totalAvg,
     *     validator: data.validator,
     *     submitted_at: new Date(data.timestamp).toISOString()
     *   }, { onConflict: 'user_id' });
     */
    saveValidasi(data) {
      lsSet('sfp_validasi', data);
    },

    /**
     * Ambil hasil validasi ahli yang tersimpan.
     * Return: object validasi atau null jika belum pernah submit.
     *
     * TODO Supabase (nanti):
     *   const { data: { user } } = await sb.auth.getUser();
     *   const { data } = await sb.from('validasi_ahli')
     *     .select('*').eq('user_id', user.id).single();
     *   return data || null;
     */
    getValidasi() {
      return lsGet('sfp_validasi') || null;
    },

    // ════════════════════════════════════════════════════
    // CLASS STATS (digunakan di dashboard dosen)
    // ════════════════════════════════════════════════════

    /**
     * Statistik per modul tingkat kelas (jumlah mahasiswa selesai, rata-rata nilai, waktu).
     * Ini adalah data DEMO — akan diganti dengan query Supabase.
     * Return: array of { no, title, selesai, avgQ, waktu }
     *
     * TODO Supabase:
     *   const { data } = await sb.from('modules')
     *     .select('id, order_num, title, module_progress(count, avg:quiz_score)')
     *     .order('order_num');
     *   return data ?? [];
     */
    async getClassStats() {
      if (USE_SUPABASE && typeof sb !== 'undefined') {
        // TODO: query Supabase aggregasi per modul
      }
      // DEMO DATA — ganti dengan query nyata saat backend Supabase siap
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

    // ════════════════════════════════════════════════════
    // PROFIL PENGGUNA (data diri tambahan — profil.html)
    // ════════════════════════════════════════════════════

    /**
     * Simpan data profil pengguna ke localStorage.
     * Key localStorage: sfp_profil
     * @param {{ nama, nim, prodi, angkatan, email, role }} data
     *
     * TODO Supabase (nanti):
     *   const { data: { user } } = await sb.auth.getUser();
     *   await sb.from('profiles').upsert({
     *     id: user.id,
     *     full_name: data.nama,
     *     nim_nidn: data.nim,
     *     prodi: data.prodi,
     *     angkatan: data.angkatan
     *   }, { onConflict: 'id' });
     */
    saveProfil(data) {
      lsSet('sfp_profil', data);
    },

    /**
     * Ambil data profil pengguna dari localStorage.
     * Key localStorage: sfp_profil
     * Return: { nama, nim, prodi, angkatan, email, role } atau null jika belum disimpan.
     *
     * TODO Supabase (nanti):
     *   const { data: { user } } = await sb.auth.getUser();
     *   const { data } = await sb.from('profiles')
     *     .select('full_name, nim_nidn, prodi, angkatan, role')
     *     .eq('id', user.id).single();
     *   return data ? {
     *     nama: data.full_name, nim: data.nim_nidn,
     *     prodi: data.prodi, angkatan: data.angkatan, role: data.role
     *   } : null;
     */
    getProfil() {
      return lsGet('sfp_profil') || null;
    },

    // ════════════════════════════════════════════════════
    // MANAJEMEN MODUL (dosen — metadata custom & urutan)
    // ════════════════════════════════════════════════════

    /**
     * Simpan metadata kustom satu modul (hasil edit dosen).
     * Key localStorage: sfp_modul_custom_{moduleId}
     * @param {number} moduleId
     * @param {{ judul?, deskripsi?, status?, durasi?, catatan?, updatedAt? }} data
     *
     * TODO Supabase (nanti):
     *   const { data: { user } } = await sb.auth.getUser();
     *   await sb.from('module_custom').upsert({
     *     user_id: user.id, module_id: moduleId, ...data
     *   }, { onConflict: 'user_id,module_id' });
     */
    saveModulCustom(moduleId, data) {
      lsSet('sfp_modul_custom_' + moduleId, data);
    },

    /**
     * Ambil metadata kustom satu modul.
     * Key localStorage: sfp_modul_custom_{moduleId}
     * @param {number} moduleId
     * Return: object data kustom atau null jika belum pernah diedit.
     *
     * TODO Supabase (nanti):
     *   const { data: { user } } = await sb.auth.getUser();
     *   const { data } = await sb.from('module_custom')
     *     .select('*').eq('user_id', user.id).eq('module_id', moduleId).single();
     *   return data || null;
     */
    getModulCustom(moduleId) {
      return lsGet('sfp_modul_custom_' + moduleId) || null;
    },

    /**
     * Simpan urutan tampilan modul (array of module IDs).
     * Key localStorage: sfp_modul_order
     * @param {number[]} order - array ID modul sesuai urutan tampil
     *
     * TODO Supabase (nanti):
     *   const { data: { user } } = await sb.auth.getUser();
     *   await sb.from('profiles').upsert({
     *     id: user.id, modul_order: order
     *   }, { onConflict: 'id' });
     */
    saveModulOrder(order) {
      lsSet('sfp_modul_order', order);
    },

    /**
     * Ambil urutan tampilan modul yang tersimpan.
     * Key localStorage: sfp_modul_order
     * Return: array of module IDs atau null jika belum pernah diubah.
     *
     * TODO Supabase (nanti):
     *   const { data: { user } } = await sb.auth.getUser();
     *   const { data } = await sb.from('profiles')
     *     .select('modul_order').eq('id', user.id).single();
     *   return data?.modul_order || null;
     */
    getModulOrder() {
      return lsGet('sfp_modul_order') || null;
    },

  };
})();
