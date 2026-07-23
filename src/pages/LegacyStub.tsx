export function LegacyStub({ legacyFile }: { legacyFile: string }) {
  return (
    <div style={{ padding: 32, fontFamily: 'sans-serif' }}>
      <p>Halaman ini belum dipindah ke versi baru.</p>
      <a href={`/legacy/${legacyFile}`}>Buka versi lama →</a>
    </div>
  )
}
