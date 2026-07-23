/* Node test murni untuk fungsi agregasi analitik di data-layer.js.
   Jalankan: node tests/data-layer.compute.test.js
   Tidak butuh Supabase/browser — hanya logika matematis (input rows → output). */
'use strict';
const assert = require('assert');

// Mock Supabase client — cukup untuk uji glue logic getModulDistribution/getFeedbackAspectAvg
// (perhitungan asli sudah diuji terpisah lewat computeModulDistribution/computeFeedbackAspectAvg).
global.sb = {
  auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
  from(table) {
    const rows = {
      modules: [{ id: 10, order_num: 1 }, { id: 20, order_num: 2 }],
      profiles: [{ id: 's1' }, { id: 's2' }],
      user_progress: [{ module_id: 10 }],
      feedback: [{ konten: 4, kemudahan: 4, keterbacaan: 5, kebermanfaatan: 5 }],
    }[table] || [];
    const chain = {
      select: () => chain,
      eq: () => chain,
      order: () => Promise.resolve({ data: rows, error: null }),
      then: (resolve) => resolve({ data: rows, error: null }),
    };
    return chain;
  },
};

const { computeModulDistribution, computeFeedbackAspectAvg, DataLayer } = require('../legacy/data-layer.js');

// computeModulDistribution: % mahasiswa yang selesai tiap modul dari total mahasiswa
{
  const modules = [{ id: 10, order_num: 1 }, { id: 20, order_num: 2 }];
  const totalStudents = 4;
  const completedRows = [
    { module_id: 10 }, { module_id: 10 }, { module_id: 10 }, // 3/4 = 75%
    { module_id: 20 }, // 1/4 = 25%
  ];
  const result = computeModulDistribution(modules, totalStudents, completedRows);
  assert.deepStrictEqual(result, [
    { label: 'Modul 1', pct: 75 },
    { label: 'Modul 2', pct: 25 },
  ]);
  console.log('PASS computeModulDistribution: menghitung persen selesai per modul dari total mahasiswa');
}

// computeFeedbackAspectAvg: rata-rata tiap aspek feedback dibulatkan 1 desimal
{
  const rows = [
    { konten: 4, kemudahan: 4, keterbacaan: 5, kebermanfaatan: 5 },
    { konten: 2, kemudahan: 4, keterbacaan: 3, kebermanfaatan: 3 },
  ];
  const result = computeFeedbackAspectAvg(rows);
  assert.deepStrictEqual(result, [
    { label: 'Kualitas Konten',      nilai: 3 },
    { label: 'Kemudahan Penggunaan', nilai: 4 },
    { label: 'Keterbacaan',          nilai: 4 },
    { label: 'Kebermanfaatan',       nilai: 4 },
  ]);
  console.log('PASS computeFeedbackAspectAvg: rata-rata tiap aspek dibulatkan 1 desimal');
}

// DataLayer.getModulDistribution: glue Supabase fetch + computeModulDistribution
(async () => {
  const result = await DataLayer.getModulDistribution();
  assert.deepStrictEqual(result, [
    { label: 'Modul 1', pct: 50 }, // 1 dari 2 mahasiswa mock selesai modul id 10
    { label: 'Modul 2', pct: 0 },
  ]);
  console.log('PASS DataLayer.getModulDistribution: fetch Supabase lalu hitung persen via computeModulDistribution');

  // DataLayer.getFeedbackAspectAvg: glue Supabase fetch + computeFeedbackAspectAvg
  const fbResult = await DataLayer.getFeedbackAspectAvg();
  assert.deepStrictEqual(fbResult, [
    { label: 'Kualitas Konten',      nilai: 4 },
    { label: 'Kemudahan Penggunaan', nilai: 4 },
    { label: 'Keterbacaan',          nilai: 5 },
    { label: 'Kebermanfaatan',       nilai: 5 },
  ]);
  console.log('PASS DataLayer.getFeedbackAspectAvg: fetch Supabase lalu hitung rata-rata via computeFeedbackAspectAvg');
})().then(() => {
  console.log('ALL TESTS PASSED');
}).catch(e => { console.error(e); process.exit(1); });
