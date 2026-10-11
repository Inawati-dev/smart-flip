      // ===== Tokoh: gerak dibangun dari waktu tiap kata dan kalimat narasi =====
      {
        const BAHU_K = '268 318', BAHU_L = '134 318', SIKU_K = '24px 23px', SIKU_L = '23px 23px', LEHER = '201 262', TENGAH = '50% 50%';
        // angka acak berbiji, supaya tiap render menghasilkan gerak yang sama
        let biji = 20261011;
        const acak = () => { biji = (biji + 0x6D2B79F5) | 0; let t = Math.imul(biji ^ (biji >>> 15), 1 | biji); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
        const lenganK = (t, atas, bawah, dur = 0.5, ease = 'power2.inOut') => {
          tl.to('#tk-ln', { rotation: atas, svgOrigin: BAHU_K, duration: dur, ease }, t);
          tl.to('#tk-ln-bawah', { rotation: bawah, transformOrigin: SIKU_K, duration: dur, ease }, t + 0.05);
        };
        const lenganL = (t, atas, bawah, dur = 0.5, ease = 'power2.inOut') => {
          tl.to('#tk-lk', { rotation: atas, svgOrigin: BAHU_L, duration: dur, ease }, t);
          tl.to('#tk-lk-bawah', { rotation: bawah, transformOrigin: SIKU_L, duration: dur, ease }, t + 0.05);
        };
        const ISTIRAHAT_K = [4, -10], ISTIRAHAT_L = [-4, 10];
        const BICARA_K = [[-10, -118], [-4, -84], [-14, -100]], BICARA_L = [14, 108];
        const TUNJUK_K = [-74, -10], BUKA_K = [-22, -104], BUKA_L = [22, 104];

        tl.set('#tk-ln', { rotation: ISTIRAHAT_K[0], svgOrigin: BAHU_K }, 0);
        tl.set('#tk-ln-bawah', { rotation: ISTIRAHAT_K[1], transformOrigin: SIKU_K }, 0);
        tl.set('#tk-lk', { rotation: ISTIRAHAT_L[0], svgOrigin: BAHU_L }, 0);
        tl.set('#tk-lk-bawah', { rotation: ISTIRAHAT_L[1], transformOrigin: SIKU_L }, 0);
        tl.set('#tk-mulut', { scaleX: 1.12, scaleY: 0.16, transformOrigin: TENGAH }, 0);
        tl.set('#tk-jari', { opacity: 0 }, 0);

        tl.fromTo('#papan', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, 0.05);
        tl.fromTo('#tokoh', { opacity: 0, x: -60 }, { opacity: 1, x: 0, duration: 0.6, ease: 'power3.out' }, 0.2);

        // napas dan ayunan badan
        tl.to('#tk-atas', { y: -5, duration: 1.9, ease: 'sine.inOut', yoyo: true, repeat: Math.max(0, Math.floor(TOTAL / 1.9) - 1) }, 0);
        tl.to('#tk-atas', { rotation: 1.2, svgOrigin: '200 545', duration: 3.1, ease: 'sine.inOut', yoyo: true, repeat: Math.max(0, Math.floor((TOTAL - 0.4) / 3.1) - 1) }, 0.4);

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
            tl.to('#tk-mulut', { scaleX: b[0], scaleY: b[1], duration: Math.min(0.09, Math.max(0.045, langkah)), ease: 'sine.out', transformOrigin: TENGAH }, k.t + i * langkah);
          });
          const berikut = KATA[n + 1];
          if (!berikut || berikut.t - (k.t + k.d) > 0.13) tl.to('#tk-mulut', { scaleX: DIAM[0], scaleY: DIAM[1], duration: 0.1, ease: 'sine.out', transformOrigin: TENGAH }, k.t + k.d);
        });

        // jendela waktu yang sudah dipakai gerak besar (menunjuk, bertanya), supaya gerak kecil tidak menimpanya
        const jendela = [];
        const tabrak = (a, b) => jendela.some(([x, y]) => a < y && b > x);
        const angguk = (t, besar = 3) => {
          tl.to('#tk-kepala', { y: besar, duration: 0.14, ease: 'power2.out' }, t);
          tl.to('#tk-kepala', { y: 0, duration: 0.3, ease: 'sine.inOut' }, t + 0.14);
        };

        // menunjuk papan: lirik dulu, lengan menyusul, lalu kembali menatap penonton
        const poseBicara = (t) => BICARA_K[Math.floor(t * 7) % BICARA_K.length];
        TUNJUK.forEach((tp) => {
          const a = tp - 0.5, z = tp + 1.35;
          jendela.push([a - 0.1, z + 0.55]);
          tl.to('.tk-pupil', { x: 3.5, duration: 0.18, ease: 'power2.out' }, a);
          tl.to('#tk-wajah', { x: 5, duration: 0.3, ease: 'power2.out' }, a + 0.04);
          tl.to('#tk-kepala', { rotation: 4, svgOrigin: LEHER, duration: 0.35, ease: 'power2.out' }, a + 0.04);
          lenganK(a + 0.12, TUNJUK_K[0], TUNJUK_K[1], 0.45, 'back.out(1.3)');
          tl.to('#tk-jari', { opacity: 1, duration: 0.12 }, a + 0.3);
          tl.to('#tk-jari', { opacity: 0, duration: 0.15 }, z + 0.05);
          tl.to('.tk-pupil', { x: 0, duration: 0.2, ease: 'power2.inOut' }, tp + 0.7);
          tl.to('#tk-wajah', { x: 0, duration: 0.35, ease: 'power2.inOut' }, tp + 0.7);
          tl.to('#tk-kepala', { rotation: 0, svgOrigin: LEHER, duration: 0.4, ease: 'power2.inOut' }, tp + 0.7);
          const p = poseBicara(z);
          lenganK(z, p[0], p[1], 0.5);
        });

        // tiap kalimat: mulai dengan anggukan; pertanyaan ditutup dengan kepala miring, alis naik, dua tangan terbuka
        KALIMAT.forEach((s, i) => {
          const akhir = s.t + s.d;
          if (i === 0) { const p = poseBicara(s.t); lenganK(s.t - 0.25, p[0], p[1], 0.55); }
          angguk(s.t + 0.08, 2.5);
          if (s.tanya && !tabrak(akhir - 1.2, akhir + 0.6)) {
            const a = akhir - 1.15;
            jendela.push([a - 0.1, akhir + 0.9]);
            tl.to('#tk-alis', { y: -6, duration: 0.2, ease: 'power2.out' }, a);
            tl.to('#tk-kepala', { rotation: -5, svgOrigin: LEHER, duration: 0.4, ease: 'sine.inOut' }, a);
            lenganK(a, BUKA_K[0], BUKA_K[1], 0.45, 'power2.out');
            lenganL(a + 0.06, BUKA_L[0], BUKA_L[1], 0.45, 'power2.out');
            tl.to('#tk-alis', { y: 0, duration: 0.25, ease: 'sine.inOut' }, akhir + 0.2);
            tl.to('#tk-kepala', { rotation: 0, svgOrigin: LEHER, duration: 0.4, ease: 'sine.inOut' }, akhir + 0.25);
            const p = poseBicara(akhir + 0.3);
            lenganK(akhir + 0.3, p[0], p[1], 0.5);
            lenganL(akhir + 0.3, ISTIRAHAT_L[0], ISTIRAHAT_L[1], 0.55);
          } else if (i % 3 === 1 && !tabrak(s.t, s.t + 1.6)) {
            // sesekali tangan kiri ikut bicara
            jendela.push([s.t + 0.1, s.t + 1.7]);
            lenganL(s.t + 0.15, BICARA_L[0], BICARA_L[1], 0.45, 'power2.out');
            lenganL(s.t + 1.15, ISTIRAHAT_L[0], ISTIRAHAT_L[1], 0.5);
          }
        });

        // tekanan pada kata panjang: lengan bawah mengetuk kecil dan kepala ikut
        let ketukLalu = 0;
        KATA.forEach((k) => {
          if (k.w.replace(/[^a-zA-Z]/g, '').length < 7 || k.t - ketukLalu < 1.0 || tabrak(k.t - 0.2, k.t + 0.55)) return;
          ketukLalu = k.t;
          const p = poseBicara(k.t);
          tl.to('#tk-ln-bawah', { rotation: p[1] - 13, transformOrigin: SIKU_K, duration: 0.13, ease: 'power2.out' }, k.t - 0.03);
          tl.to('#tk-ln-bawah', { rotation: p[1], transformOrigin: SIKU_K, duration: 0.3, ease: 'sine.inOut' }, k.t + 0.1);
          tl.to('#tk-ln', { rotation: p[0], svgOrigin: BAHU_K, duration: 0.4, ease: 'sine.inOut' }, k.t - 0.03);
          if (acak() < 0.6) angguk(k.t, 2);
        });

        // penutup: tangan turun, senyum, angguk
        const selesai = KALIMAT[KALIMAT.length - 1].t + KALIMAT[KALIMAT.length - 1].d;
        lenganK(selesai + 0.15, ISTIRAHAT_K[0], ISTIRAHAT_K[1], 0.7);
        tl.to('#tk-mulut', { scaleX: 1.34, scaleY: 0.3, duration: 0.3, ease: 'sine.out', transformOrigin: TENGAH }, selesai + 0.25);
        angguk(selesai + 0.5, 4);
      }
