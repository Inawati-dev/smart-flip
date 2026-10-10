import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Layout } from '../components/Layout'
import { FileInput } from '../components/FileInput'
import { MataKuliahSelect } from '../components/MataKuliahSelect'
import { usePaketMhs } from '../hooks/usePaketMhs'
import {
  submitTugasAkhir,
  signedFileUrl,
  cekBerkasDocx,
  lewatTenggat,
  BERKAS_ACCEPT,
  BERKAS_MAKS_MB,
  type FinalProject,
  type FinalSubmission,
} from '../lib/tugasAkhir'
import { bobotPaket, babPaket, nilaiMiniProjek, statusBab, tautanSah, type BabPaket, type StatusBab } from '../lib/paketProposal'

// Halaman mahasiswa untuk Paket Rancangan Proposal (antrean #179): empat Mini
// Projek berurutan. Rancangan layar: canvas "Mini Projek Rancangan Proposal".
// Keadaan tiap bab dihitung statusBab() di lib/paketProposal.ts.
const BORDER = { borderColor: 'var(--border)' } as const

const LENCANA: Record<StatusBab, { background: string; color: string }> = {
  terkunci: { background: 'var(--bg3)', color: 'var(--brown2)' },
  belum: { background: 'var(--warning-soft)', color: 'var(--warning)' },
  terkirim: { background: 'var(--info-soft)', color: 'var(--info)' },
  dinilai: { background: 'var(--success-soft)', color: 'var(--success)' },
}

function tgl(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

function tglJam(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function Lencana({ status, children }: { status: StatusBab; children: ReactNode }) {
  return (
    <span className="text-[13px] font-semibold px-3 py-1 rounded-full whitespace-nowrap" style={LENCANA[status]}>
      {children}
    </span>
  )
}

export function MiniProjek() {
  const queryClient = useQueryClient()
  const { paket, kiriman, memuat, modulesUrut, topikTerbuka, baru, nilaiBaru, tandaiDilihat, tutupPita } = usePaketMhs()
  // Membuka halaman ini berarti kabarnya sudah dilihat: titik di menu dan lencana
  // di Dashboard padam. Pita nilai punya penanda sendiri dan bertahan sampai ditutup.
  const adaKabarBaru = baru.length > 0
  useEffect(() => {
    if (adaKabarBaru) tandaiDilihat()
  }, [adaKabarBaru, tandaiDilihat])

  const [kirimUrutan, setKirimUrutan] = useState<number | null>(null)
  const [rincianUrutan, setRincianUrutan] = useState<number | null>(null)
  const [pesan, setPesan] = useState<string | null>(null)
  function tampilPesan(teks: string) {
    setPesan(teks)
    setTimeout(() => setPesan(null), 2800)
  }

  async function bukaBerkas(path: string | null | undefined) {
    if (!path) return
    try {
      window.open(await signedFileUrl(path), '_blank')
    } catch {
      tampilPesan('Gagal membuka berkas')
    }
  }

  const bab3Dinilai = !!kiriman[paket.findIndex((b) => b.urutan === 3)]?.graded_at
  const bobot = bobotPaket(paket)
  const status = paket.map((b, i) => {
    const bab = babPaket(b.urutan)
    return bab ? statusBab(bab, kiriman[i], topikTerbuka, bab3Dinilai) : 'terkunci'
  })
  const jumlahDinilai = paket.filter((b, i) => (b.urutan ?? 4) <= 3 && status[i] === 'dinilai').length
  const selesai = paket.length === 4 && status.every((s) => s === 'dinilai')
  const nilaiAkhir = selesai
    ? nilaiMiniProjek(
        bobot,
        kiriman.map((k) => k?.total),
      )
    : null

  const briefKirim = paket.find((b) => b.urutan === kirimUrutan)
  const briefRincian = paket.find((b) => b.urutan === rincianUrutan)

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-[1080px]">
        <div className="flex items-center gap-3 flex-wrap mb-1">
          <h1 className="font-display text-2xl font-bold text-brown">Mini Projek</h1>
          <MataKuliahSelect />
        </div>
        <p className="text-brown-3 mb-4">Rancangan proposal dikerjakan per bab, lalu digabung menjadi satu naskah.</p>

        {memuat ? (
          <p className="text-sm text-brown-3">Memuat…</p>
        ) : paket.length === 0 ? (
          <div className="bg-ivory rounded-2xl border p-5 text-sm text-brown-3" style={BORDER}>
            Dosen belum membuat Paket Rancangan Proposal.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {nilaiBaru && (
              <div role="status" className="rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>
                <p className="text-sm flex-1 basis-[18rem] min-w-0 tabular-nums">
                  <strong>Baru:</strong> {nilaiBaru.judul.replace(' Sudah Dinilai', '')} sudah dinilai. {nilaiBaru.ket}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      setRincianUrutan(nilaiBaru.urutan)
                      tutupPita()
                    }}
                  >
                    Lihat Rincian Nilai
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={tutupPita}>
                    Tutup
                  </button>
                </div>
              </div>
            )}
            <div className="bg-ivory rounded-2xl border px-4 py-3" style={BORDER}>
              <div className="text-sm font-semibold text-brown">{selesai ? 'Mini Projek Selesai' : `${jumlahDinilai} dari 3 bab dinilai`}</div>
              {selesai && (
                <p className="text-sm text-brown-2 mt-1 tabular-nums">
                  {nilaiAkhir != null && <strong>Nilai Mini Projek {nilaiAkhir}. </strong>}
                  {`Rumus: ${paket.map((_, i) => `${bobot[i]}% ${i === 3 ? 'naskah lengkap' : `Bab ${i + 1}`}`).join(' + ')}.`}
                </p>
              )}
            </div>

            {paket.map((brief, i) => {
              const bab = babPaket(brief.urutan)
              if (!bab) return null
              return (
                <KartuBab
                  key={brief.id}
                  bab={bab}
                  brief={brief}
                  status={status[i]}
                  kiriman={kiriman[i]}
                  modulesUrut={modulesUrut}
                  topikTerbuka={topikTerbuka}
                  terkirimBab={kiriman.slice(0, 3)}
                  onKirim={() => setKirimUrutan(brief.urutan ?? null)}
                  onRincian={() => setRincianUrutan(brief.urutan ?? null)}
                  onBuka={(path) => void bukaBerkas(path)}
                  onUnduhTemplat={() => tampilPesan(bab.urutan === 4 ? 'Templat Rancangan Proposal diunduh' : `Templat Bab ${bab.urutan} diunduh`)}
                />
              )
            })}
          </div>
        )}
      </div>

      {briefKirim && babPaket(briefKirim.urutan) && (
        <KirimModal
          bab={babPaket(briefKirim.urutan) as BabPaket}
          brief={briefKirim}
          kiriman={kiriman[paket.indexOf(briefKirim)]}
          onClose={() => setKirimUrutan(null)}
          onSent={async (teks) => {
            setKirimUrutan(null)
            tampilPesan(teks)
            await queryClient.invalidateQueries({ queryKey: ['final-submission-mhs', briefKirim.id] })
          }}
        />
      )}

      {briefRincian && (
        <RincianModal
          brief={briefRincian}
          bab={babPaket(briefRincian.urutan)}
          kiriman={kiriman[paket.indexOf(briefRincian)]}
          onClose={() => setRincianUrutan(null)}
          onBuka={(path) => void bukaBerkas(path)}
        />
      )}

      {pesan && (
        <div
          role="status"
          className="fixed bottom-20 sm:bottom-5 left-1/2 -translate-x-1/2 z-[800] px-4 py-2.5 rounded-lg text-sm font-medium max-w-[90vw]"
          style={{ background: 'var(--brown)', color: 'var(--btn-text)', boxShadow: '0 8px 24px color-mix(in srgb, var(--shadow-color) 25%, transparent)' }}
        >
          {pesan}
        </div>
      )}
    </Layout>
  )
}

export default MiniProjek

function KartuBab({
  bab,
  brief,
  status,
  kiriman,
  modulesUrut,
  topikTerbuka,
  terkirimBab,
  onKirim,
  onRincian,
  onBuka,
  onUnduhTemplat,
}: {
  bab: BabPaket
  brief: FinalProject
  status: StatusBab
  kiriman: FinalSubmission | null
  modulesUrut: Array<{ id: number }>
  topikTerbuka: (nomor: number) => boolean
  /** Kiriman Bab 1 sampai 3, untuk tombol unduh di Rancangan Proposal. */
  terkirimBab: Array<FinalSubmission | null>
  onKirim: () => void
  onRincian: () => void
  onBuka: (path: string | null | undefined) => void
  onUnduhTemplat: () => void
}) {
  const gabung = bab.urutan === 4
  const topikSumber = gabung ? [] : bab.topik

  if (status === 'terkunci') {
    return (
      <section className="rounded-2xl p-5" style={{ background: 'var(--bg3)', color: 'var(--brown2)' }}>
        <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
          <h2 className="font-display text-xl font-bold text-brown">{bab.judul}</h2>
          <Lencana status="terkunci">{bab.syarat}</Lencana>
        </div>
        <p className="text-sm">{bab.ringkas}</p>
      </section>
    )
  }

  return (
    <section className="bg-ivory rounded-2xl border p-5 flex flex-col gap-4" style={BORDER}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="font-display text-xl font-bold text-brown">{bab.judul}</h2>
        <div className="flex items-center gap-2 flex-wrap">
          {status === 'belum' && (
            <>
              <Lencana status="belum">Belum Dikirim</Lencana>
              {brief.deadline && <span className="text-[13px] text-brown-2">Tenggat {tgl(brief.deadline)}</span>}
              {lewatTenggat(brief.deadline) && (
                <span className="text-[13px] font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap" style={LENCANA.belum}>
                  Lewat Tenggat
                </span>
              )}
            </>
          )}
          {status === 'terkirim' && <Lencana status="terkirim">Terkirim · Menunggu Nilai</Lencana>}
          {status === 'dinilai' && <Lencana status="dinilai">Dinilai · {kiriman?.total ?? '-'} dari 100</Lencana>}
        </div>
      </div>

      {status === 'belum' && (
        <>
          <p className="text-sm text-brown-2">{bab.ringkas}</p>
          <div>
            <div className="text-[13px] font-semibold text-brown-3 uppercase tracking-wide mb-1.5">Yang Harus Ada di Berkas</div>
            <ol className="flex flex-col gap-1.5 text-sm text-brown pl-0 list-none">
              {bab.bagian.map((g) => (
                <li key={g.no}>
                  <span className="font-semibold tabular-nums">{g.no}</span> {g.nama}
                  <span className="block text-[13px] text-brown-3">{g.bahan}</span>
                </li>
              ))}
            </ol>
            <p className="text-sm text-brown-2 mt-2">{bab.lampiran}</p>
          </div>
          {topikSumber.some((n) => !topikTerbuka(n)) && (
            <p className="text-[13px] text-brown-3">
              {topikSumber.filter((n) => !topikTerbuka(n)).map((n) => `Topik ${n}`).join(', ')} belum dibuka. Lengkapi bagian yang memakainya sesudah topik itu dibuka.
            </p>
          )}
        </>
      )}

      {(status === 'terkirim' || status === 'dinilai') && (
        <div className="flex flex-wrap gap-2">
          {bab.bagian.map((g) => (
            <span key={g.no} className="text-[13px] px-3 py-1 rounded-full" style={{ background: 'var(--bg3)' }}>
              {g.nama}
            </span>
          ))}
        </div>
      )}

      {kiriman && (status === 'terkirim' || status === 'dinilai') && (
        <div className="text-sm rounded-xl p-3" style={{ background: 'var(--bg3)' }}>
          {status === 'dinilai' ? (
            <p>
              <strong>Umpan balik dosen.</strong> {kiriman.feedback || 'Belum ada catatan.'}
            </p>
          ) : (
            <p>
              <strong>Berkas terkirim.</strong> {kiriman.file_name ?? 'Tanpa berkas'} · dikirim {tglJam(kiriman.submitted_at)}
              {kiriman.note ? ` · catatan: ${kiriman.note}` : ''}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-3 border-t" style={BORDER}>
        {status === 'belum' && (
          <>
            {topikSumber.map((n) => {
              const modul = modulesUrut[n - 1]
              return modul ? (
                <Link key={n} to={`/modul/${modul.id}#aktivitas-mandiri`} className="btn btn-secondary btn-sm no-underline">
                  Bahan Topik {n}
                </Link>
              ) : null
            })}
            {gabung &&
              terkirimBab.map((k, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={!k?.file_path}
                  onClick={() => onBuka(k?.file_path)}
                  className="btn btn-secondary btn-sm"
                >
                  Unduh Bab {i + 1} Terkirim
                </button>
              ))}
            <a href={bab.templat} download onClick={onUnduhTemplat} className="btn btn-secondary btn-sm no-underline">
              {gabung ? 'Unduh Templat' : `Unduh Templat Bab ${bab.urutan}`}
            </a>
            <button type="button" onClick={onKirim} className="btn btn-primary btn-sm">
              {gabung ? 'Kirim Rancangan Proposal (.docx)' : `Kirim Bab ${bab.urutan} (.docx)`}
            </button>
          </>
        )}
        {status === 'terkirim' && (
          <>
            <button type="button" onClick={() => onBuka(kiriman?.file_path)} disabled={!kiriman?.file_path} className="btn btn-secondary btn-sm">
              Lihat Berkas
            </button>
            <button type="button" onClick={onKirim} className="btn btn-primary btn-sm">
              Kirim Ulang
            </button>
            <span className="text-[13px] text-brown-3">Kirim ulang mengganti berkas lama. Tidak bisa lagi sesudah dinilai.</span>
          </>
        )}
        {status === 'dinilai' && (
          <button type="button" onClick={onRincian} className="btn btn-secondary btn-sm">
            Lihat Rincian Nilai
          </button>
        )}
      </div>
    </section>
  )
}

function Modal({ judul, id, children }: { judul: string; id: string; children: ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-[600] flex items-start justify-center p-4 overflow-y-auto"
      style={{ background: 'var(--overlay)', animation: 'fadeInBg 0.18s ease' }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        className="bg-ivory rounded-2xl p-6 max-w-[90vw] w-[520px] max-h-[90vh] overflow-y-auto my-8"
        style={{ boxShadow: '0 16px 48px color-mix(in srgb, var(--shadow-color) 25%, transparent)', animation: 'slideUpModal 0.22s ease' }}
      >
        <h3 id={id} className="font-display text-lg font-semibold text-brown mb-4">
          {judul}
        </h3>
        {children}
      </div>
    </div>
  )
}

function KirimModal({
  bab,
  brief,
  kiriman,
  onClose,
  onSent,
}: {
  bab: BabPaket
  brief: FinalProject
  kiriman: FinalSubmission | null
  onClose: () => void
  onSent: (pesan: string) => Promise<void>
}) {
  const [file, setFile] = useState<File | null>(null)
  const [link, setLink] = useState(kiriman?.link ?? '')
  const [note, setNote] = useState(kiriman?.note ?? '')
  const [cek, setCek] = useState<boolean[]>(() => bab.periksa.map(() => false))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const adaBerkas = !!file || !!kiriman?.file_path
  const tautanOk = !bab.butuhTautan || tautanSah(link)
  const siap = adaBerkas && cek.every(Boolean) && tautanOk

  function pilih(f: File | null) {
    if (f) {
      try {
        cekBerkasDocx(f)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Berkas tidak diterima.')
        setFile(null)
        return
      }
    }
    setError('')
    setFile(f)
  }

  async function kirim() {
    if (!siap) return
    setSaving(true)
    setError('')
    try {
      await submitTugasAkhir({ projectId: brief.id, file, link: bab.butuhTautan ? link : '', note })
      await onSent(bab.urutan === 4 ? 'Rancangan Proposal terkirim' : `Bab ${bab.urutan} terkirim`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal mengirim.')
      setSaving(false)
    }
  }

  return (
    <Modal id="judul-kirim" judul={`${kiriman ? 'Kirim Ulang' : 'Kirim'} ${bab.judul}`}>
      <div className="mb-3">
        <span className="block text-[13px] font-semibold text-brown-2 mb-1.5">Berkas</span>
        <FileInput
          accept={BERKAS_ACCEPT}
          label="Pilih Berkas"
          hint={kiriman?.file_name && !file ? `Berkas lama: ${kiriman.file_name}. Hanya .docx, maks ${BERKAS_MAKS_MB} MB` : `Hanya .docx, maks ${BERKAS_MAKS_MB} MB`}
          maxSizeMb={BERKAS_MAKS_MB}
          file={file}
          onChange={pilih}
        />
      </div>

      {bab.butuhTautan && (
        <label className="flex flex-col gap-1 text-[13px] font-semibold text-brown-2 mb-3">
          Tautan Prototipe (Figma, Canva, draw.io, atau Sejenisnya)
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://"
            inputMode="url"
            className="h-11 rounded-[var(--radius-control)] border px-3 text-base text-brown"
            style={BORDER}
          />
          {link.trim() !== '' && !tautanSah(link) && <span className="text-[13px] font-normal text-danger">Tautan harus diawali http:// atau https://.</span>}
        </label>
      )}

      <label className="flex flex-col gap-1 text-[13px] font-semibold text-brown-2 mb-3">
        Catatan untuk Dosen
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Boleh dikosongkan"
          className="rounded-[var(--radius-control)] border px-3 py-2 text-base text-brown resize-y"
          style={BORDER}
        />
      </label>

      <fieldset className="mb-3">
        <legend className="text-[13px] font-semibold text-brown-3 uppercase tracking-wide mb-1">Daftar Periksa</legend>
        {bab.periksa.map((p, i) => (
          <label key={p} className="flex items-center gap-2.5 min-h-11 text-sm text-brown">
            <input
              type="checkbox"
              checked={cek[i]}
              onChange={(e) => setCek((c) => c.map((v, j) => (j === i ? e.target.checked : v)))}
              className="w-5 h-5 shrink-0"
            />
            {p}
          </label>
        ))}
      </fieldset>

      {error && <p className="text-[13px] text-danger mb-3">{error}</p>}

      <div className="flex gap-2.5 justify-end pt-3 border-t" style={BORDER}>
        <button type="button" onClick={onClose} className="btn btn-secondary">
          Batal
        </button>
        <button type="button" onClick={() => void kirim()} disabled={!siap || saving} className="btn btn-primary min-w-[7.5rem]">
          {saving ? 'Mengirim…' : 'Kirim'}
        </button>
      </div>
    </Modal>
  )
}

function RincianModal({
  brief,
  bab,
  kiriman,
  onClose,
  onBuka,
}: {
  brief: FinalProject
  bab: BabPaket | null
  kiriman: FinalSubmission | null
  onClose: () => void
  onBuka: (path: string | null | undefined) => void
}) {
  return (
    <Modal id="judul-rincian" judul={`Rincian Nilai ${bab?.judul ?? brief.title}`}>
      <div className="overflow-x-auto mb-3">
        <table className="w-full text-sm text-brown tabular-nums">
          <thead>
            <tr className="text-left text-[13px] text-brown-3 uppercase tracking-wide">
              <th scope="col" className="py-2 font-semibold">Kriteria</th>
              <th scope="col" className="py-2 font-semibold text-right">Bobot</th>
              <th scope="col" className="py-2 font-semibold text-right">Nilai</th>
            </tr>
          </thead>
          <tbody>
            {brief.rubric.map((r, i) => (
              <tr key={i} className="border-t" style={BORDER}>
                <td className="py-2 pr-2">{r.nama}</td>
                <td className="py-2 text-right">{r.bobot}</td>
                <td className="py-2 text-right">{kiriman?.scores?.[i] ?? '-'}</td>
              </tr>
            ))}
            <tr className="border-t-2 font-semibold" style={{ borderColor: 'var(--brown)' }}>
              <td className="py-2">Total</td>
              <td className="py-2 text-right">{brief.rubric.reduce((a, r) => a + r.bobot, 0)}</td>
              <td className="py-2 text-right">{kiriman?.total ?? '-'}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-sm rounded-xl p-3 mb-3" style={{ background: 'var(--bg3)' }}>
        <strong>Umpan balik dosen.</strong> {kiriman?.feedback || 'Belum ada catatan.'}
      </p>
      <div className="flex gap-2.5 justify-end pt-3 border-t" style={BORDER}>
        <button type="button" onClick={() => onBuka(kiriman?.file_path)} disabled={!kiriman?.file_path} className="btn btn-secondary">
          Unduh Berkas Saya
        </button>
        <button type="button" onClick={onClose} className="btn btn-primary">
          Tutup
        </button>
      </div>
    </Modal>
  )
}
