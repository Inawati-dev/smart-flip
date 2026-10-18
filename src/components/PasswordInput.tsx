import { useState, type InputHTMLAttributes } from 'react'
import { IconEye, IconEyeOff } from './icons'

// Isian kata sandi dengan tombol mata untuk menampilkan/menyembunyikan isi (antrean #245).
// Semua atribut <input> diteruskan kecuali `type`; tombolnya tetap bisa difokus dengan Tab.
export function PasswordInput({ className = '', style, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [tampil, setTampil] = useState(false)
  return (
    <div className="relative">
      <input {...props} type={tampil ? 'text' : 'password'} className={`${className} pr-12`} style={{ ...style, paddingRight: 48 }} />
      <button
        type="button"
        onClick={() => setTampil((v) => !v)}
        aria-label={tampil ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
        aria-pressed={tampil}
        className="absolute right-0 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-brown-3 hover:text-brown"
      >
        {tampil ? <IconEyeOff size={18} /> : <IconEye size={18} />}
      </button>
    </div>
  )
}
