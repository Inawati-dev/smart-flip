    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      const M = @@MULAI@@, B = @@BATAS@@, D = @@DUR@@, TOTAL = @@TOTAL@@;
      const KATA = @@KATA@@, KALIMAT = @@KALIMAT@@;
      // waktu kata pertama berawalan tertentu di adegan ke-i (isi papan muncul tepat saat katanya diucapkan)
      const saat = (awalan, i) => (KATA.find((k) => k.t >= M[i] - 0.01 && k.t < B[i + 1] && k.w.toLowerCase().startsWith(awalan)) || { t: M[i] }).t;
      const masuk = (sel, t, y = 40) => tl.fromTo(sel, { opacity: 0, y }, { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out' }, t);
      const tumbuh = (sel, t) => tl.fromTo(sel, { scaleY: 0 }, { scaleY: 1, duration: 0.7, ease: 'power3.out' }, t);
      const muncul = (sel, t) => tl.fromTo(sel, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.6)' }, t);
      for (let i = 1; i <= 5; i++) tl.to(`#a${i}-isi`, { opacity: 0, duration: 0.25, ease: 'power1.in' }, B[i] - 0.27);
      tl.fromTo('#maju-isi', { scaleX: 0 }, { scaleX: 1, duration: TOTAL, ease: 'none' }, 0);

      masuk('#a1-label', 0.15); masuk('#a1-judul', 0.3); masuk('#a1-tanya', KALIMAT[1].t - 0.1);
      ['#a1-c1', '#a1-c2', '#a1-c3'].forEach((s, i) => muncul(s, saat('tiga', 0) + i * 0.28));

      masuk('#a2-isi .label', B[1] + 0.05); masuk('#a2-judul', B[1] + 0.15); masuk('#a2-ket', saat('angka', 1) - 0.25); masuk('#a2-tanya', saat('seberapa', 1) - 0.1);
      ['#a2-b1', '#a2-b2', '#a2-b3', '#a2-b4'].forEach((s, i) => tumbuh(s, saat('angka', 1) + i * 0.2));

      masuk('#a3-isi .label', B[2] + 0.05); masuk('#a3-judul', B[2] + 0.15); masuk('#a3-ket', saat('cerita', 2)); masuk('#a3-tanya', saat('mengapa', 2) - 0.1);
      muncul('#a3-g1', saat('wawancara', 2)); muncul('#a3-g2', saat('observasi', 2));

      masuk('#a4-isi .label', B[3] + 0.05); masuk('#a4-judul', B[3] + 0.15); masuk('#a4-tanya', saat('penelitian', 3)); masuk('#a4-ket', saat('produk', 3));
      muncul('#a4-s1', saat('meriset', 3)); tumbuh('#a4-p1', saat('membuat', 3) - 0.35); muncul('#a4-s2', saat('membuat', 3)); tumbuh('#a4-p2', saat('menguji', 3) - 0.35); muncul('#a4-s3', saat('menguji', 3));

      masuk('#a5-isi .label', B[4] + 0.05); masuk('#a5-judul', saat('sebuah', 4) - 0.2);
      masuk('#a5-k1', saat('mengukur', 4), 60); masuk('#a5-k2', saat('mewawancarai', 4), 60); masuk('#a5-k3', saat('merancang', 4), 60);

      masuk('#a6-kutip', saat('pahami', 5) - 0.3); tl.fromTo('#a6-garis', { scaleX: 0 }, { scaleX: 1, duration: 0.6, ease: 'power3.out' }, saat('baru', 5)); masuk('#a6-ket', saat('kembangkan', 5) + 0.9);

      const TUNJUK = [saat('tiga', 0), saat('angka', 1), saat('wawancara', 2), saat('meriset', 3), saat('mengukur', 4), saat('merancang', 4)];
@@TOKOHJS@@
      window.__timelines['main'] = tl;
      tl.seek(0);
    </script>
