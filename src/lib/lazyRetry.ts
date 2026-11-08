import { lazy, type ComponentType } from 'react'

// Pemuat halaman per-route yang mengulang saat internet tidak stabil (antrean #356, 8 Nov 2026).
// React.lazy menyimpan kegagalan pertamanya, jadi satu paket yang gagal diunduh membuat halaman error
// sampai muat ulang. Di sini unduhan diulang beberapa kali dengan jeda naik, dan bila perangkat luring
// ia menunggu peristiwa 'online' (paling lama MAKS_TUNGGU_MS) sebelum menyerah.
const JEDA_MS = [600, 1500, 3000]
const MAKS_TUNGGU_MS = 20_000

function tungguOnline(): Promise<void> {
  if (typeof navigator === 'undefined' || navigator.onLine) return Promise.resolve()
  return new Promise((selesai) => {
    const t = setTimeout(() => {
      window.removeEventListener('online', ok)
      selesai()
    }, MAKS_TUNGGU_MS)
    function ok() {
      clearTimeout(t)
      window.removeEventListener('online', ok)
      selesai()
    }
    window.addEventListener('online', ok)
  })
}

export async function impor<T>(pabrik: () => Promise<T>, jeda: number[] = JEDA_MS): Promise<T> {
  let galat: unknown
  for (let i = 0; i <= jeda.length; i++) {
    try {
      return await pabrik()
    } catch (e) {
      galat = e
      if (i === jeda.length) break
      await tungguOnline()
      await new Promise((r) => setTimeout(r, jeda[i]))
    }
  }
  throw galat
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- sama dengan tanda tangan React.lazy
export function lazyRetry<T extends ComponentType<any>>(pabrik: () => Promise<{ default: T }>) {
  return lazy(() => impor(pabrik))
}

// Galat unduh paket halaman atau jaringan, bukan galat kode: ErrorBoundary menampilkannya sebagai modal koneksi.
export function galatMuatPaket(e: unknown): boolean {
  const msg = e instanceof Error ? `${e.name} ${e.message}` : String(e)
  return /dynamically imported module|importing a module script failed|loading chunk|loading css chunk|failed to fetch|networkerror|load failed/i.test(msg)
}
