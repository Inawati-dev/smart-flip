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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(62,54,46,.52)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div
        className="rounded-2xl p-8 max-w-sm w-full text-center"
        style={{ background: 'var(--ivory)', boxShadow: '0 8px 40px rgba(62,54,46,.22)' }}
      >
        <h3 className="font-['Playfair_Display',serif] text-lg font-bold text-brown mb-2">
          Yakin ingin keluar?
        </h3>
        <p className="text-sm text-brown-2 mb-6 opacity-75">
          Progres belajar kamu tersimpan otomatis.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 min-h-11 rounded-lg font-medium text-sm"
            style={{ border: '1.5px solid var(--border)', background: 'transparent' }}
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 min-h-11 rounded-lg bg-terra text-white font-semibold text-sm"
          >
            Ya, Keluar
          </button>
        </div>
      </div>
    </div>
  )
}
