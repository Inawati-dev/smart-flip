/* SMART-FLIP 5.0: service worker minimal (antrean #135).
   Tujuannya hanya supaya aplikasi bisa dipasang. Tidak menyimpan apa pun:
   tiap permintaan diteruskan ke jaringan, jadi versi baru langsung terpakai.
   Cache peninggalan worker lama (smartflip-v1, alamat /smart-flipbook/ dari
   masa GitHub Pages) dihapus saat worker ini aktif. */
self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

// Pendengar fetch wajib ada supaya peramban menawarkan pemasangan; sengaja
// tidak memanggil respondWith, jadi peramban mengambil dari jaringan seperti biasa.
self.addEventListener('fetch', () => {})
