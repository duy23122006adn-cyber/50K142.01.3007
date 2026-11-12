import { useState, type ReactNode } from 'react'
import { homNayISO, ngay } from '../lib/dinhDang'

export type CheDoKy = 'ngay' | 'thang' | 'quy' | 'tuyChon'

/** Kỳ báo cáo đã chọn: ngày dạng yyyy-MM-dd, hai đầu đều tính. */
export interface Ky {
  cheDo: CheDoKy
  tu: string
  den: string
}

const TAB: [CheDoKy, string][] = [
  ['ngay', 'Ngày'],
  ['thang', 'Tháng'],
  ['quy', 'Quý'],
  ['tuyChon', 'Khoảng thời gian tùy chọn'],
]
const THU = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
const KHONG_DE_TRONG = 'Không được để trống!'

const p2 = (n: number) => String(n).padStart(2, '0')
const iso = (y: number, m: number, d: number) => `${y}-${p2(m)}-${p2(d)}`
const soNgay = (y: number, m: number) => new Date(y, m, 0).getDate()
const nhoHon = (a: string, b: string) => (a < b ? a : b)
const tachNgay = (s: string) => ({ y: Number(s.slice(0, 4)), m: Number(s.slice(5, 7)) })

interface ThangXem {
  y: number
  m: number
}

/** Lịch một tháng: "<" "Tháng m/yyyy" ">", hàng thứ T2…CN, ngày đang chọn tô nền (màn hình 5.1.1 mục 21–25). */
function Lich({
  xem,
  setXem,
  chon,
  onChon,
  nhan,
}: {
  xem: ThangXem
  setXem: (t: ThangXem) => void
  chon: string
  onChon: (ngay: string) => void
  nhan?: string
}) {
  const homNay = homNayISO()
  const lui = () => setXem(xem.m === 1 ? { y: xem.y - 1, m: 12 } : { y: xem.y, m: xem.m - 1 })
  const tien = () => setXem(xem.m === 12 ? { y: xem.y + 1, m: 1 } : { y: xem.y, m: xem.m + 1 })
  const dauThang = (new Date(xem.y, xem.m - 1, 1).getDay() + 6) % 7 // thứ Hai = 0
  const o: (number | null)[] = [...Array<null>(dauThang).fill(null), ...Array.from({ length: soNgay(xem.y, xem.m) }, (_, i) => i + 1)]
  return (
    <div className="lich" aria-label={nhan}>
      <div className="lich__dau">
        <button type="button" className="nut nut--nho" onClick={lui} aria-label="Tháng trước">
          &lt;
        </button>
        <span>
          Tháng {xem.m}/{xem.y}
        </span>
        <button type="button" className="nut nut--nho" onClick={tien} disabled={iso(xem.y, xem.m, 1) > homNay} aria-label="Tháng sau">
          &gt;
        </button>
      </div>
      <div className="lich__luoi">
        {THU.map((t) => (
          <span key={t} className="lich__thu">
            {t}
          </span>
        ))}
        {o.map((d, i) => {
          if (d === null) return <span key={`trong-${i}`} />
          const giaTri = iso(xem.y, xem.m, d)
          return (
            <button
              key={giaTri}
              type="button"
              className={`lich__ngay ${giaTri === chon ? 'lich__ngay--chon' : ''}`}
              disabled={giaTri > homNay}
              aria-pressed={giaTri === chon}
              onClick={() => onChon(giaTri)}
            >
              {d}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Chọn năm bằng "<" "Năm yyyy" ">" (màn hình 5.1.2, 5.1.3 mục 8–10). */
function ChonNam({ nam, setNam }: { nam: number; setNam: (n: number) => void }) {
  return (
    <div className="lich__dau">
      <button type="button" className="nut nut--nho" onClick={() => setNam(nam - 1)} aria-label="Năm trước">
        &lt;
      </button>
      <span>Năm {nam}</span>
      <button type="button" className="nut nut--nho" onClick={() => setNam(nam + 1)} disabled={nam >= tachNgay(homNayISO()).y} aria-label="Năm sau">
        &gt;
      </button>
    </div>
  )
}

/**
 * Bộ chọn kỳ báo cáo / kỳ so sánh của UC_5.1–5.3 (màn hình 5.1.1–5.1.8, 5.1.11–5.1.18).
 * Tháng / quý chứa ngày hôm nay được tính đến hết hôm nay (BR01: không vượt quá ngày hiện tại).
 */
export function ChonKy({
  banDau,
  onXacNhan,
  loiServer,
  dangTai,
  hanhDong,
}: {
  banDau?: Ky | null
  onXacNhan: (ky: Ky) => void
  /** Lỗi theo trường từ server: tuNgay, denNgay. */
  loiServer?: Record<string, string>
  dangTai?: boolean
  /** Nút đặt cạnh "Xác nhận" (vd. "So sánh lợi nhuận"). */
  hanhDong?: ReactNode
}) {
  const homNay = homNayISO()
  const goc = banDau ?? { cheDo: 'ngay' as CheDoKy, tu: homNay, den: homNay }
  const [cheDo, setCheDo] = useState<CheDoKy>(goc.cheDo)
  const [ngayChon, setNgayChon] = useState(goc.cheDo === 'ngay' ? goc.tu : homNay)
  const [lichNgay, setLichNgay] = useState<ThangXem>(tachNgay(ngayChon))
  const [nam, setNam] = useState(tachNgay(goc.tu).y)
  const [thang, setThang] = useState(goc.cheDo === 'thang' ? tachNgay(goc.tu).m : tachNgay(homNay).m)
  const [quy, setQuy] = useState(goc.cheDo === 'quy' ? Math.ceil(tachNgay(goc.tu).m / 3) : Math.ceil(tachNgay(homNay).m / 3))
  const [tuNgay, setTuNgay] = useState(goc.cheDo === 'tuyChon' ? goc.tu : '')
  const [denNgay, setDenNgay] = useState(goc.cheDo === 'tuyChon' ? goc.den : '')
  const [lichTu, setLichTu] = useState<ThangXem>(tachNgay(tuNgay || homNay))
  const [lichDen, setLichDen] = useState<ThangXem>(tachNgay(denNgay || homNay))
  const [loi, setLoi] = useState<Record<string, string>>({})
  // Phần lịch / chọn tháng / quý / khoảng ngày: ấn lại tab đang chọn để thu gọn, giống menu trái.
  const [moLich, setMoLich] = useState(true)

  const loiHienThi = { ...(loiServer ?? {}), ...loi }

  const xacNhan = () => {
    setLoi({})
    if (cheDo === 'ngay') return onXacNhan({ cheDo, tu: ngayChon, den: ngayChon })
    if (cheDo === 'thang') return onXacNhan({ cheDo, tu: iso(nam, thang, 1), den: nhoHon(iso(nam, thang, soNgay(nam, thang)), homNay) })
    if (cheDo === 'quy') {
      const cuoi = quy * 3
      return onXacNhan({ cheDo, tu: iso(nam, cuoi - 2, 1), den: nhoHon(iso(nam, cuoi, soNgay(nam, cuoi)), homNay) })
    }
    // 3a, 4a
    const l: Record<string, string> = {}
    if (!tuNgay) l.tuNgay = KHONG_DE_TRONG
    if (!denNgay) l.denNgay = KHONG_DE_TRONG
    if (tuNgay && denNgay && tuNgay > denNgay) l.tuNgay = 'Ngày bắt đầu không được lớn hơn ngày kết thúc!'
    if (Object.keys(l).length) {
      setMoLich(true) // lỗi nằm trong phần lịch → mở ra cho thấy
      return setLoi(l)
    }
    onXacNhan({ cheDo, tu: tuNgay, den: denNgay })
  }

  const doiTab = (c: CheDoKy) => {
    if (c === cheDo) return setMoLich((v) => !v)
    setCheDo(c)
    setMoLich(true)
    setLoi({})
  }

  return (
    <section className="the the--rong chon-ky">
      <div className="chon-ky__dau">
        <div className="tab" role="tablist" aria-label="Kỳ báo cáo">
          {TAB.map(([c, ten]) => (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={cheDo === c}
              aria-expanded={cheDo === c ? moLich : undefined}
              className={`nut nut--nho ${cheDo === c ? 'nut--chon' : ''}`}
              onClick={() => doiTab(c)}
            >
              {ten}
              {cheDo === c && (
                <span className={`mui-ten ${moLich ? 'mui-ten--mo' : ''}`} aria-hidden>
                  ▸
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="hang-nut hang-nut--sat">
          <button type="button" className="nut nut--chinh" onClick={xacNhan} disabled={dangTai}>
            Xác nhận
          </button>
          {hanhDong}
        </div>
      </div>

      <div className={`xo ${moLich ? 'xo--mo' : ''}`} inert={!moLich}>
        <div className="xo__boc">
          <div className="chon-ky__than">
            {cheDo === 'ngay' && (
              <Lich xem={lichNgay} setXem={setLichNgay} chon={ngayChon} onChon={setNgayChon} nhan="Chọn ngày" />
            )}

            {cheDo === 'thang' && (
              <div className="lich">
                <ChonNam nam={nam} setNam={setNam} />
                <div className="luoi-ky luoi-ky--thang">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={`nut nut--nho ${t === thang ? 'nut--chon' : ''}`}
                      disabled={iso(nam, t, 1) > homNay}
                      aria-pressed={t === thang}
                      onClick={() => setThang(t)}
                    >
                      Tháng {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {cheDo === 'quy' && (
              <div className="lich">
                <ChonNam nam={nam} setNam={setNam} />
                <div className="luoi-ky">
                  {[1, 2, 3, 4].map((q) => (
                    <button
                      key={q}
                      type="button"
                      className={`nut nut--nho ${q === quy ? 'nut--chon' : ''}`}
                      disabled={iso(nam, q * 3 - 2, 1) > homNay}
                      aria-pressed={q === quy}
                      onClick={() => setQuy(q)}
                    >
                      Quý {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {cheDo === 'tuyChon' && (
              <div className="luoi-2">
                <div>
                  <label className="truong">
                    <span className="truong__nhan">Từ ngày</span>
                    <input
                      className={`truong__o ${loiHienThi.tuNgay ? 'truong__o--loi' : ''}`}
                      type="date"
                      max={homNay}
                      value={tuNgay}
                      onChange={(e) => {
                        setTuNgay(e.target.value)
                        if (e.target.value) setLichTu(tachNgay(e.target.value))
                      }}
                    />
                    {loiHienThi.tuNgay && <span className="truong__loi">{loiHienThi.tuNgay}</span>}
                  </label>
                  <Lich xem={lichTu} setXem={setLichTu} chon={tuNgay} onChon={setTuNgay} nhan="Chọn từ ngày" />
                </div>
                <div>
                  <label className="truong">
                    <span className="truong__nhan">Đến ngày</span>
                    <input
                      className={`truong__o ${loiHienThi.denNgay ? 'truong__o--loi' : ''}`}
                      type="date"
                      max={homNay}
                      value={denNgay}
                      onChange={(e) => {
                        setDenNgay(e.target.value)
                        if (e.target.value) setLichDen(tachNgay(e.target.value))
                      }}
                    />
                    {loiHienThi.denNgay && <span className="truong__loi">{loiHienThi.denNgay}</span>}
                  </label>
                  <Lich xem={lichDen} setXem={setLichDen} chon={denNgay} onChon={setDenNgay} nhan="Chọn đến ngày" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {cheDo !== 'tuyChon' && (loiHienThi.tuNgay || loiHienThi.denNgay) && (
        <p className="thong-bao thong-bao--do">{loiHienThi.tuNgay ?? loiHienThi.denNgay}</p>
      )}
    </section>
  )
}

/** "Từ 01/11/2026 đến 10/11/2026" hoặc "Ngày 10/11/2026". */
export function MoTaKy({ tu, den }: { tu: string; den: string }) {
  return <>{tu === den ? `Ngày ${ngay(tu)}` : `Từ ${ngay(tu)} đến ${ngay(den)}`}</>
}
