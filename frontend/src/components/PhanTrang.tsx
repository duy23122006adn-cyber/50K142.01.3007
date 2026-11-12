interface Props {
  trang: number
  soTrang: number
  onDoiTrang: (trang: number) => void
}

/** Phân trang (UC_3.1 BR02, UC_4.4 BR02 – 20 dòng/trang). */
export function PhanTrang({ trang, soTrang, onDoiTrang }: Props) {
  if (soTrang <= 1) return null
  const cacTrang = new Set<number>([1, soTrang, trang - 1, trang, trang + 1])
  const ds = [...cacTrang].filter((t) => t >= 1 && t <= soTrang).sort((a, b) => a - b)

  return (
    <nav className="phan-trang" aria-label="Phân trang">
      <button type="button" className="nut nut--nho" disabled={trang <= 1} onClick={() => onDoiTrang(trang - 1)} aria-label="Trang trước">
        ‹
      </button>
      {ds.map((t, i) => (
        <span key={t} className="phan-trang__nhom">
          {i > 0 && t - ds[i - 1] > 1 && <span className="phan-trang__cach">…</span>}
          <button
            type="button"
            className={`nut nut--nho ${t === trang ? 'nut--chon' : ''}`}
            aria-current={t === trang ? 'page' : undefined}
            onClick={() => onDoiTrang(t)}
          >
            {t}
          </button>
        </span>
      ))}
      <button type="button" className="nut nut--nho" disabled={trang >= soTrang} onClick={() => onDoiTrang(trang + 1)} aria-label="Trang sau">
        ›
      </button>
    </nav>
  )
}
