export function LogoutModal({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[600] flex items-center justify-center p-4"
      style={{ background: 'var(--overlay)', backdropFilter: 'blur(4px)', animation: 'fadeInBg 0.18s ease' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div
        className="rounded-2xl p-8 max-w-sm w-full text-center"
        style={{
          background: 'var(--ivory)',
          boxShadow: '0 8px 40px color-mix(in srgb, var(--shadow-color) 22%, transparent)',
          animation: 'slideUpModal 0.22s ease',
        }}
      >
        <h3 className="font-display text-lg font-bold text-brown mb-2">
          Yakin ingin keluar?
        </h3>
        <p className="text-sm text-brown-2 mb-6 opacity-75">
          Progres belajar kamu tersimpan otomatis.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn btn-secondary flex-1">
            Batal
          </button>
          <button onClick={onConfirm} className="btn btn-primary flex-1">
            Ya, Keluar
          </button>
        </div>
      </div>
    </div>
  )
}
