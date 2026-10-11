      // ===== Tokoh versi 4: lengan mengecil ke pergelangan, siku menekuk wajar, gerak dari waktu tiap kata dan kalimat =====
      {
        const LEHER = '200 268', TENGAH = '50% 50%';
        // sisi k = kanan layar (dekat papan), sisi l = kiri layar; nilai pose ditulis untuk sisi k, sisi l memakai cerminnya
        const LENGAN = {
          k: { bahu: '#k-lengan', asal: '272 322', bawah: '#k-bawah', tangan: '#k-tangan', cermin: 1 },
          l: { bahu: '#l-lengan', asal: '128 322', bawah: '#l-bawah', tangan: '#l-tangan', cermin: -1 },
        };
        // pose = [putar bahu, putar siku, putar pergelangan], dalam derajat; negatif = menjauh dari badan
        // Siku menekuk paling jauh sekitar 120 derajat dan tangan tetap di sisi badannya sendiri (tidak menyilang).
        const ISTIRAHAT = [3, -8, 4];
        const BICARA = [[-10, -100, -10], [-15, -116, -14], [-6, -80, -4], [-12, -106, 6]];
        const TANYA_K = [-16, -122, -16], TANYA_L = [-6, -72, -8];
        const TUNJUK_POSE = [-84, -3, 0];
        // bahu bergerak dulu, siku dan pergelangan menyusul sedikit, seperti lengan sungguhan
        const pose = (sisi, t, p, dur = 0.5, ease = 'power2.inOut') => {
          const a = LENGAN[sisi], c = a.cermin;
          tl.to(a.bahu, { rotation: c * p[0], duration: dur, ease }, t);
          tl.to(a.bawah, { rotation: c * p[1], duration: dur, ease }, t + 0.05);
          tl.to(a.tangan, { rotation: c * p[2], duration: dur + 0.08, ease }, t + 0.1);
        };
        // angka acak berbiji, supaya tiap render menghasilkan gerak yang sama
        let biji = 20261011;
        const acak = () => { biji = (biji + 0x6D2B79F5) | 0; let t = Math.imul(biji ^ (biji >>> 15), 1 | biji); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

        // keadaan awal dan titik putar tiap sendi (titik putar hanya ditetapkan sekali di sini)
        Object.values(LENGAN).forEach((a) => {
          tl.set(a.bahu, { rotation: a.cermin * ISTIRAHAT[0], svgOrigin: a.asal }, 0);
          tl.set(a.bawah, { rotation: a.cermin * ISTIRAHAT[1], transformOrigin: '80px 40px' }, 0);
          tl.set(a.tangan, { rotation: a.cermin * ISTIRAHAT[2], transformOrigin: '50px 30px' }, 0);
        });
        tl.set('#k-tunjuk', { opacity: 0 }, 0);
        tl.set('#tk-mulut', { scaleX: 1.12, scaleY: 0.16, transformOrigin: TENGAH }, 0);

        tl.fromTo('#papan', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, 0.05);
        tl.fromTo('#tokoh', { opacity: 0, x: -60 }, { opacity: 1, x: 0, duration: 0.6, ease: 'power3.out' }, 0.2);

        // napas dan ayunan badan
        tl.to('#tk-atas', { y: -5, duration: 1.9, ease: 'sine.inOut', yoyo: true, repeat: Math.max(0, Math.floor(TOTAL / 1.9) - 1) }, 0);
        tl.to('#tk-atas', { rotation: 1, svgOrigin: '200 550', duration: 3.1, ease: 'sine.inOut', yoyo: true, repeat: Math.max(0, Math.floor((TOTAL - 0.4) / 3.1) - 1) }, 0.4);

        // kedip: jaraknya tidak rata, kadang dua kali
        const kedip = (t) => {
          tl.to('.tk-mata', { scaleY: 0.08, duration: 0.06, transformOrigin: TENGAH }, t);
          tl.to('.tk-mata', { scaleY: 1, duration: 0.1, transformOrigin: TENGAH }, t + 0.06);
        };
        for (let t = 1.5; t < TOTAL - 0.5; t += 2.3 + acak() * 2.6) { kedip(t); if (acak() < 0.22) kedip(t + 0.3); }

        // mulut: bentuk per huruf (ejaan Indonesia dekat dengan bunyinya), waktunya dari batas kata
        const BENTUK = { a: [1, 1], e: [1.2, 0.56], i: [1.28, 0.42], o: [0.74, 0.92], u: [0.6, 0.64], m: [1.05, 0.1], b: [1.05, 0.1], p: [1.05, 0.1], f: [1, 0.26], w: [0.62, 0.5] };
        const LAIN = [0.96, 0.36], DIAM = [1.12, 0.16];
        KATA.forEach((k, n) => {
          const huruf = [...k.w.toLowerCase().replace(/[^a-z]/g, '')];
          const langkah = k.d / Math.max(1, huruf.length);
          let lalu = '';
          huruf.forEach((h, i) => {
            const b = BENTUK[h] || LAIN;
            if (b.join() === lalu) return;
            lalu = b.join();
            tl.to('#tk-mulut', { scaleX: b[0], scaleY: b[1], duration: Math.min(0.09, Math.max(0.045, langkah)), ease: 'sine.out' }, k.t + i * langkah);
          });
          const berikut = KATA[n + 1];
          if (!berikut || berikut.t - (k.t + k.d) > 0.13) tl.to('#tk-mulut', { scaleX: DIAM[0], scaleY: DIAM[1], duration: 0.1, ease: 'sine.out' }, k.t + k.d);
        });

        // jendela waktu gerak besar (menunjuk, bertanya), supaya gerak kecil tidak menimpanya
        const jendela = [];
        const tabrak = (a, b) => jendela.some(([x, y]) => a < y && b > x);
        const angguk = (t, besar = 3) => {
          tl.to('#tk-kepala', { y: besar, duration: 0.14, ease: 'power2.out' }, t);
          tl.to('#tk-kepala', { y: 0, duration: 0.3, ease: 'sine.inOut' }, t + 0.14);
        };
        let urut = 0;
        const bicaraBerikut = () => BICARA[urut++ % BICARA.length];

        // menunjuk papan: lirik dulu, lengan menyusul dengan telunjuk, lalu kembali menatap penonton
        TUNJUK.forEach((tp) => {
          const a = tp - 0.55, z = tp + 1.35;
          jendela.push([a - 0.1, z + 0.6]);
          tl.to('.tk-pupil', { x: 3.5, duration: 0.18, ease: 'power2.out' }, a);
          tl.to('#tk-wajah', { x: 5, duration: 0.3, ease: 'power2.out' }, a + 0.04);
          tl.to('#tk-kepala', { rotation: 4, svgOrigin: LEHER, duration: 0.35, ease: 'power2.out' }, a + 0.04);
          pose('k', a + 0.1, TUNJUK_POSE, 0.5, 'power2.out');
          tl.to('#k-buka', { opacity: 0, duration: 0.1 }, a + 0.3);
          tl.to('#k-tunjuk', { opacity: 1, duration: 0.1 }, a + 0.3);
          tl.to('.tk-pupil', { x: 0, duration: 0.2, ease: 'power2.inOut' }, tp + 0.7);
          tl.to('#tk-wajah', { x: 0, duration: 0.35, ease: 'power2.inOut' }, tp + 0.7);
          tl.to('#tk-kepala', { rotation: 0, svgOrigin: LEHER, duration: 0.4, ease: 'power2.inOut' }, tp + 0.7);
          pose('k', z, bicaraBerikut(), 0.55);
          tl.to('#k-tunjuk', { opacity: 0, duration: 0.1 }, z + 0.25);
          tl.to('#k-buka', { opacity: 1, duration: 0.1 }, z + 0.25);
        });

        // tiap kalimat: anggukan kecil di awal; pertanyaan ditutup dengan kepala miring, alis naik, tangan kanan naik dan tangan kiri ikut sedikit
        KALIMAT.forEach((s, i) => {
          const akhir = s.t + s.d;
          if (i === 0) pose('k', s.t - 0.3, bicaraBerikut(), 0.6);
          angguk(s.t + 0.08, 2.5);
          if (s.tanya && !tabrak(akhir - 1.2, akhir + 0.7)) {
            const a = akhir - 1.15;
            jendela.push([a - 0.1, akhir + 1.0]);
            tl.to('#tk-alis', { y: -6, duration: 0.2, ease: 'power2.out' }, a);
            tl.to('#tk-kepala', { rotation: -4, svgOrigin: LEHER, duration: 0.4, ease: 'sine.inOut' }, a);
            pose('k', a, TANYA_K, 0.5, 'power2.out');
            pose('l', a + 0.08, TANYA_L, 0.55, 'power2.out');
            tl.to('#tk-alis', { y: 0, duration: 0.25, ease: 'sine.inOut' }, akhir + 0.2);
            tl.to('#tk-kepala', { rotation: 0, svgOrigin: LEHER, duration: 0.4, ease: 'sine.inOut' }, akhir + 0.25);
            pose('k', akhir + 0.3, bicaraBerikut(), 0.5);
            pose('l', akhir + 0.3, ISTIRAHAT, 0.6);
          } else if (i % 4 === 2 && !tabrak(s.t, s.t + 1.9)) {
            // sesekali tangan kiri ikut terangkat, lalu turun lagi
            jendela.push([s.t + 0.1, s.t + 2.0]);
            pose('l', s.t + 0.15, BICARA[2], 0.55, 'power2.out');
            pose('l', s.t + 1.3, ISTIRAHAT, 0.6);
          }
        });

        // tekanan pada kata panjang: tangan kanan berpindah ke pose bicara berikutnya dan kepala ikut
        let ketukLalu = 0;
        KATA.forEach((k) => {
          if (k.w.replace(/[^a-zA-Z]/g, '').length < 7 || k.t - ketukLalu < 1.1 || tabrak(k.t - 0.25, k.t + 0.6)) return;
          ketukLalu = k.t;
          pose('k', k.t - 0.06, bicaraBerikut(), 0.32, 'sine.inOut');
          if (acak() < 0.6) angguk(k.t, 2);
        });

        // penutup: tangan turun, senyum, angguk
        const selesai = KALIMAT[KALIMAT.length - 1].t + KALIMAT[KALIMAT.length - 1].d;
        pose('k', selesai + 0.15, ISTIRAHAT, 0.75);
        tl.to('#tk-mulut', { scaleX: 1.34, scaleY: 0.3, duration: 0.3, ease: 'sine.out' }, selesai + 0.25);
        angguk(selesai + 0.55, 4);
      }
