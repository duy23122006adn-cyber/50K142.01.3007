import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { LoiApi } from '../../api/client'
import { ketCaApi, type BienBan, type DongKiemKe } from '../../api/nghiepVu'
import { useXacThuc } from '../../auth/AuthContext'
import { HopThoai } from '../../components/HopThoai'
import { homNayISO, ngay } from '../../lib/dinhDang'

const DS_BIEN_BAN = '/ket-ca/bien-ban'

/** "−4", "+2", "0" – UC_9.1 màn hình 9.1.1 dòng 21. */
function SoChenhLech({ so }: { so: number }) {
  if (so === 0) return <>0</>
  return <span className="chu-do">{so > 0 ? `+${so}` : `−${-so}`}</span>
}

function ThongTinChung({ bb, coMaBB }: { bb: BienBan; coMaBB?: boolean }) {
  return (
    <dl className="thong-tin">
      {coMaBB && bb.maBB && (
        <>
          <dt>Mã biên bản</dt>
          <dd>{bb.maBB}</dd>
        </>
      )}
      <dt>Mã ca</dt>
      <dd>{bb.maCa}</dd>
      <dt>Ngày làm việc</dt>
      <dd>{ngay(bb.ngayLamViec)}</dd>
      <dt>Giờ bắt đầu</dt>
      <dd>{bb.gioBatDau.slice(0, 5)}</dd>
      {bb.gioKetThuc && (
        <>
          <dt>Giờ kết thúc</dt>
          <dd>{bb.gioKetThuc.slice(0, 5)}</dd>
        </>
      )}
      <dt>Người kết ca</dt>
      <dd>
        {bb.maNguoiKetCa} — {bb.nguoiKetCa}
      </dd>
    </dl>
  )
}

// ====================================================================== UC_9.1 Lưu biên bản

/** Màn hình 9.1.1–9.1.7 – kiểm kê cuối ca và lưu biên bản. */
export function LuuBienBan() {
  const { data, error, isLoading } = useQuery({ queryKey: ['ket-ca', 'hien-tai'], queryFn: ketCaApi.hienTai })
  const [daLuu, setDaLuu] = useState<BienBan | null>(null)

  if (daLuu) return <BienBanDaLuu bb={daLuu} />
  if (isLoading) return <p className="ghi-chu">Đang tải…</p>
  if (error) return <p className="thong-bao thong-bao--do">{(error as Error).message}</p>
  if (!data)
    return (
      <>
        <h1>Biên bản kết ca</h1>
        <section className="the the--hep">
          <p className="ghi-chu">Cửa hàng chưa có ca đang mở. Ca tự mở khi có người đăng nhập hoặc phát sinh giao dịch.</p>
        </section>
      </>
    )
  return data.trangThaiCa === 'Đang kết ca' ? (
    <KiemKe key={data.maCa} bb={data} onDaLuu={setDaLuu} />
  ) : (
    <BatDauKetCa bb={data} />
  )
}

/** Ca đang hoạt động – người dùng chọn "Kết ca" để bắt đầu kiểm kê (SUA_BAO_CAO 3.22, BR11). */
function BatDauKetCa({ bb }: { bb: BienBan }) {
  const queryClient = useQueryClient()
  const [hoi, setHoi] = useState(false)
  const [loi, setLoi] = useState<string | null>(null)
  const [dangXuLy, setDangXuLy] = useState(false)

  const batDau = async () => {
    setHoi(false)
    setDangXuLy(true)
    try {
      const moi = await ketCaApi.batDau(bb.maCa)
      queryClient.setQueryData(['ket-ca', 'hien-tai'], moi)
      void queryClient.invalidateQueries({ queryKey: ['ca-hien-tai'] })
    } catch (e) {
      setLoi(e instanceof LoiApi ? e.message : 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.')
    } finally {
      setDangXuLy(false)
    }
  }

  return (
    <>
      <h1>Biên bản kết ca</h1>
      <section className="the the--hep">
        <ThongTinChung bb={bb} />
        <dl className="thong-tin">
          <dt>Trạng thái ca</dt>
          <dd>{bb.trangThaiCa}</dd>
        </dl>
        <p className="ghi-chu">
          Khi kết ca, cửa hàng tạm dừng giao dịch nhập, xuất, bán, hủy cho đến khi lưu biên bản hoặc hủy kết ca.
        </p>
        <button type="button" className="nut nut--chinh" disabled={dangXuLy} onClick={() => setHoi(true)}>
          Kết ca
        </button>
        {loi && <p className="thong-bao thong-bao--do">{loi}</p>}
      </section>
      <HopThoai
        mo={hoi}
        tieuDe="Bắt đầu kết ca?"
        onDong={() => setHoi(false)}
        nut={
          <>
            <button type="button" className="nut" onClick={() => setHoi(false)}>
              Hủy
            </button>
            <button type="button" className="nut nut--chinh" onClick={batDau}>
              Kết ca
            </button>
          </>
        }
      >
        <p>
          Ca <strong>{bb.maCa}</strong> sẽ chuyển sang “Đang kết ca”. Mọi giao dịch nhập, xuất, bán, hủy của cửa hàng tạm dừng.
        </p>
      </HopThoai>
    </>
  )
}

type Popup = { loai: 'thanhCong'; bb: BienBan } | { loai: 'daKetThuc' } | { loai: 'thatBai' } | { loai: 'loi'; thongBao: string }

/** Màn hình 9.1.1, 9.1.4, 9.1.5 – bảng đối chiếu tồn kho, nhập tồn thực tế và nguyên nhân. */
function KiemKe({ bb, onDaLuu }: { bb: BienBan; onDaLuu: (bb: BienBan) => void }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [thucTe, setThucTe] = useState<Record<string, string>>(() =>
    Object.fromEntries(bb.dong.map((d) => [d.maHH, String(d.soLuongLyThuyet)])),
  )
  const [nguyenNhan, setNguyenNhan] = useState<Record<string, string>>({})
  const [loi, setLoi] = useState<Record<string, string>>({})
  const [popup, setPopup] = useState<Popup | null>(null)
  const [dangXuLy, setDangXuLy] = useState(false)

  const soThucTe = (d: DongKiemKe) => (/^\d+$/.test(thucTe[d.maHH] ?? '') ? Number(thucTe[d.maHH]) : null)
  const chenh = (d: DongKiemKe) => {
    const t = soThucTe(d)
    return t === null ? 0 : t - d.soLuongLyThuyet
  }

  const luu = async () => {
    // 7a: kiểm tra ngay trên giao diện; server kiểm tra lại.
    const l: Record<string, string> = {}
    for (const d of bb.dong) {
      if (soThucTe(d) === null) l[`thucTe.${d.maHH}`] = 'Tồn thực tế phải là số nguyên không âm.'
      else if (chenh(d) !== 0 && !(nguyenNhan[d.maHH] ?? '').trim()) l[`nguyenNhan.${d.maHH}`] = 'Vui lòng nhập nguyên nhân chênh lệch'
    }
    setLoi(l)
    if (Object.keys(l).length) return

    setDangXuLy(true)
    try {
      const kq = await ketCaApi.luu(
        bb.maCa,
        bb.dong.map((d) => ({ maHH: d.maHH, soLuongThucTe: soThucTe(d)!, nguyenNhan: chenh(d) !== 0 ? nguyenNhan[d.maHH] : null })),
      )
      setPopup({ loai: 'thanhCong', bb: kq })
      void queryClient.invalidateQueries({ queryKey: ['ca-hien-tai'] })
      void queryClient.invalidateQueries({ queryKey: ['ket-ca'] })
    } catch (e) {
      if (e instanceof LoiApi && Object.keys(e.loi).length) setLoi(e.loi)
      else if (e instanceof LoiApi && e.message.startsWith('Ca này đã được kết thúc')) setPopup({ loai: 'daKetThuc' })
      else if (e instanceof LoiApi && e.status === 500) setPopup({ loai: 'thatBai' })
      else setPopup({ loai: 'loi', thongBao: e instanceof LoiApi ? e.message : 'Lưu biên bản thất bại, vui lòng thử lại' })
    } finally {
      setDangXuLy(false)
    }
  }

  const huy = async () => {
    setDangXuLy(true)
    try {
      await ketCaApi.huy(bb.maCa) // 6a
      await queryClient.invalidateQueries({ queryKey: ['ket-ca', 'hien-tai'] })
      void queryClient.invalidateQueries({ queryKey: ['ca-hien-tai'] })
    } catch (e) {
      setPopup({ loai: 'loi', thongBao: e instanceof LoiApi ? e.message : 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.' })
    } finally {
      setDangXuLy(false)
    }
  }

  return (
    <>
      <h1>Biên bản kết ca</h1>
      <section className="the the--rong">
        <div className="luoi-2">
          <ThongTinChung bb={bb} />
          <dl className="thong-tin">
            <dt>Trạng thái ca</dt>
            <dd className="chu-cam">{bb.trangThaiCa}</dd>
          </dl>
        </div>
        <BangKiemKe
          dong={bb.dong}
          nhap={{ thucTe, setThucTe, nguyenNhan, setNguyenNhan, loi, chenh }}
        />
        <div className="hang-nut">
          <button type="button" className="nut" disabled={dangXuLy} onClick={huy}>
            Hủy
          </button>
          <button type="button" className="nut nut--chinh" disabled={dangXuLy} onClick={luu}>
            Lưu
          </button>
        </div>
      </section>

      {/* 9.1.2 */}
      <HopThoai
        mo={popup?.loai === 'thanhCong'}
        kieu="thanhCong"
        nut={
          <button
            type="button"
            className="nut nut--chinh"
            onClick={() => {
              if (popup?.loai === 'thanhCong') onDaLuu(popup.bb)
              setPopup(null)
            }}
          >
            Đóng
          </button>
        }
      >
        <p className="thong-bao thong-bao--xanh">Lưu biên bản thành công</p>
        <p className="chu-xanh">Mã biên bản là: {popup?.loai === 'thanhCong' ? popup.bb.maBB : ''}</p>
      </HopThoai>

      {/* 9.1.6 */}
      <HopThoai
        mo={popup?.loai === 'daKetThuc'}
        kieu="loi"
        onDong={() => navigate(DS_BIEN_BAN)}
        nut={
          <button type="button" className="nut nut--chinh" onClick={() => navigate(DS_BIEN_BAN)}>
            Đóng
          </button>
        }
      >
        <p className="thong-bao thong-bao--do">Ca này đã được kết thúc, không thể lưu thêm biên bản</p>
      </HopThoai>

      {/* 9.1.7 */}
      <HopThoai
        mo={popup?.loai === 'thatBai'}
        kieu="loi"
        onDong={() => setPopup(null)}
        nut={
          <>
            <button type="button" className="nut" onClick={() => setPopup(null)}>
              Hủy
            </button>
            <button
              type="button"
              className="nut nut--chinh"
              onClick={() => {
                setPopup(null)
                void luu()
              }}
            >
              Lưu lại
            </button>
          </>
        }
      >
        <p className="thong-bao thong-bao--do">Lưu biên bản thất bại, vui lòng thử lại</p>
      </HopThoai>

      <HopThoai
        mo={popup?.loai === 'loi'}
        kieu="loi"
        onDong={() => setPopup(null)}
        nut={
          <button type="button" className="nut nut--chinh" onClick={() => setPopup(null)}>
            Đóng
          </button>
        }
      >
        <p className="thong-bao thong-bao--do">{popup?.loai === 'loi' ? popup.thongBao : ''}</p>
      </HopThoai>
    </>
  )
}

interface NhapKiemKe {
  thucTe: Record<string, string>
  setThucTe: (v: Record<string, string>) => void
  nguyenNhan: Record<string, string>
  setNguyenNhan: (v: Record<string, string>) => void
  loi: Record<string, string>
  chenh: (d: DongKiemKe) => number
}

/** Bảng mặt hàng: Mã hàng, Tên hàng, ĐVT, Tồn lý thuyết, Tồn thực tế, Chênh lệch, Nguyên nhân. Không hiển thị giá (UC_9.2 BR04). */
function BangKiemKe({ dong, nhap }: { dong: DongKiemKe[]; nhap?: NhapKiemKe }) {
  return (
    <div className="bang-cuon">
      <table className="bang bang--xen-ke">
        <thead>
          <tr>
            <th>Mã hàng</th>
            <th>Tên hàng</th>
            <th>ĐVT</th>
            <th className="so">Tồn lý thuyết</th>
            <th className="so">Tồn thực tế</th>
            <th className="so">Chênh lệch</th>
            <th>Nguyên nhân</th>
          </tr>
        </thead>
        <tbody>
          {dong.map((d) => {
            const c = nhap ? nhap.chenh(d) : d.chenhLech
            const loiTT = nhap?.loi[`thucTe.${d.maHH}`]
            const loiNN = nhap?.loi[`nguyenNhan.${d.maHH}`]
            return (
              <tr key={d.maHH} className={c !== 0 ? 'dong-chenh-lech' : undefined}>
                <td>{d.maHH}</td>
                <td>{d.tenHH}</td>
                <td>{d.donViTinh}</td>
                <td className="so">{d.soLuongLyThuyet}</td>
                <td className="so">
                  {nhap ? (
                    <>
                      <input
                        className={`truong__o o-so-luong ${loiTT ? 'truong__o--loi' : ''}`}
                        inputMode="numeric"
                        value={nhap.thucTe[d.maHH] ?? ''}
                        onChange={(e) => nhap.setThucTe({ ...nhap.thucTe, [d.maHH]: e.target.value.trim() })}
                        aria-label={`Tồn thực tế ${d.tenHH}`}
                      />
                      {loiTT && <span className="truong__loi">{loiTT}</span>}
                    </>
                  ) : (
                    d.soLuongThucTe
                  )}
                </td>
                <td className="so">
                  <SoChenhLech so={c} />
                </td>
                <td>
                  {c === 0 ? (
                    '—'
                  ) : nhap ? (
                    <>
                      <input
                        className={`truong__o ${loiNN ? 'truong__o--loi' : ''}`}
                        maxLength={255}
                        placeholder="Nhập nguyên nhân"
                        value={nhap.nguyenNhan[d.maHH] ?? ''}
                        onChange={(e) => nhap.setNguyenNhan({ ...nhap.nguyenNhan, [d.maHH]: e.target.value })}
                        aria-label={`Nguyên nhân chênh lệch ${d.tenHH}`}
                      />
                      {loiNN && <span className="truong__loi">{loiNN}</span>}
                    </>
                  ) : (
                    d.nguyenNhan
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/** Màn hình 9.1.3 – biên bản sau khi lưu (chỉ đọc, BR03). */
function BienBanDaLuu({ bb }: { bb: BienBan }) {
  const navigate = useNavigate()
  return (
    <>
      <h1>Biên bản kết ca</h1>
      <section className="the the--rong">
        <div className="luoi-2">
          <ThongTinChung bb={bb} coMaBB />
          <dl className="thong-tin">
            <dt>Trạng thái ca</dt>
            <dd className="chu-xanh">{bb.trangThaiCa}</dd>
          </dl>
        </div>
        <BangKiemKe dong={bb.dong} />
        <div className="hang-nut">
          <button type="button" className="nut nut--chinh" onClick={() => navigate(DS_BIEN_BAN)}>
            Xem biên bản
          </button>
        </div>
      </section>
    </>
  )
}

// ====================================================================== UC_9.2 Xem biên bản

/** Màn hình 9.2.1–9.2.3, 9.2.6–9.2.8. Điều kiện lọc lưu trên URL để "Quay lại" giữ kết quả. */
export function DanhSachBienBan() {
  const navigate = useNavigate()
  const { nguoiDung } = useXacThuc()
  const [params, setParams] = useSearchParams()
  const tuNgay = params.get('tuNgay') ?? ''
  const denNgay = params.get('denNgay') ?? ''
  const coChenhLech = params.get('coChenhLech') === '1'
  const [form, setForm] = useState({ tuNgay, denNgay, coChenhLech })
  const [loiLoc, setLoiLoc] = useState<string | null>(null)
  const coLoc = !!(tuNgay || denNgay || coChenhLech)

  const { data, error, isFetching } = useQuery({
    queryKey: ['ket-ca', 'bien-ban', tuNgay, denNgay, coChenhLech],
    queryFn: () => ketCaApi.danhSach(tuNgay, denNgay, coChenhLech),
    retry: false,
  })

  const loc = (e: React.FormEvent) => {
    e.preventDefault()
    if (form.tuNgay && form.denNgay && form.tuNgay > form.denNgay) return setLoiLoc('Từ ngày không được lớn hơn đến ngày') // 3a
    setLoiLoc(null)
    const p = new URLSearchParams()
    if (form.tuNgay) p.set('tuNgay', form.tuNgay)
    if (form.denNgay) p.set('denNgay', form.denNgay)
    if (form.coChenhLech) p.set('coChenhLech', '1')
    setParams(p)
  }

  const loiServer = error instanceof LoiApi && error.loi.tuNgay ? error.loi.tuNgay : null
  return (
    <>
      <h1>Danh sách biên bản kết ca</h1>
      <form className="the the--rong" onSubmit={loc} noValidate>
        <div className="luoi-loc">
          <label className="truong">
            <span className="truong__nhan">Từ ngày</span>
            <input
              className="truong__o"
              type="date"
              max={homNayISO()}
              value={form.tuNgay}
              onChange={(e) => setForm({ ...form, tuNgay: e.target.value })}
            />
          </label>
          <label className="truong">
            <span className="truong__nhan">Đến ngày</span>
            <input
              className="truong__o"
              type="date"
              max={homNayISO()}
              value={form.denNgay}
              onChange={(e) => setForm({ ...form, denNgay: e.target.value })}
            />
          </label>
        </div>
        <label className="o-chon">
          <input type="checkbox" checked={form.coChenhLech} onChange={(e) => setForm({ ...form, coChenhLech: e.target.checked })} />
          Chỉ biên bản có chênh lệch
        </label>
        {(loiLoc ?? loiServer) && <p className="thong-bao thong-bao--do">{loiLoc ?? loiServer}</p>}
        <div className="hang-nut">
          <button
            type="button"
            className="nut"
            onClick={() => {
              setForm({ tuNgay: '', denNgay: '', coChenhLech: false })
              setLoiLoc(null)
              setParams(new URLSearchParams())
            }}
          >
            Đặt lại
          </button>
          <button type="submit" className="nut nut--chinh">
            Lọc
          </button>
        </div>
      </form>

      <section className="the the--rong">
        {nguoiDung?.vaiTro === 'NhanVien' && <p className="ghi-chu">Chỉ hiển thị các biên bản do bạn kết ca.</p>}
        {error && !loiServer && <p className="thong-bao thong-bao--do">Không thể tải danh sách biên bản, vui lòng thử lại</p>}
        <div className={`bang-cuon ${isFetching ? 'dang-tai-mo' : ''}`}>
          <table className="bang bang--xen-ke">
            <thead>
              <tr>
                <th>Mã biên bản</th>
                <th>Ngày làm việc</th>
                <th>Mã Ca</th>
                <th>Người kết ca</th>
                <th>Chênh lệch</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {data?.length === 0 && (
                <tr>
                  <td colSpan={6} className="canh-giua chu-do">
                    {coLoc ? 'Không tìm thấy biên bản phù hợp' : 'Chưa có biên bản kết ca'}
                  </td>
                </tr>
              )}
              {data?.map((b) => (
                <tr key={b.maBB}>
                  <td>{b.maBB}</td>
                  <td>{ngay(b.ngayLamViec)}</td>
                  <td>{b.maCa}</td>
                  <td>
                    {b.maNguoiKetCa} — {b.nguoiKetCa}
                  </td>
                  <td>{b.coChenhLech ? <span className="chu-do">Có</span> : 'Không'}</td>
                  <td>
                    <button
                      type="button"
                      className="nut nut--nho"
                      onClick={() => navigate(`${DS_BIEN_BAN}/chi-tiet?ma=${encodeURIComponent(b.maBB)}`)}
                    >
                      Xem
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}

/** Màn hình 9.2.4, 9.2.5 – chi tiết biên bản, chỉ các dòng chênh lệch (BR08). */
export function ChiTietBienBan() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const ma = params.get('ma') ?? ''
  const { data, error } = useQuery({ queryKey: ['ket-ca', 'chi-tiet', ma], queryFn: () => ketCaApi.chiTiet(ma), enabled: !!ma, retry: false })

  return (
    <>
      <h1>Chi tiết biên bản kết ca</h1>
      <section className="the the--rong">
        {error && <p className="thong-bao thong-bao--do">{(error as Error).message}</p>}
        {!data && !error && <p className="ghi-chu">Đang tải…</p>}
        {data && (
          <>
            <ThongTinChung bb={data} coMaBB />
            {data.dong.length === 0 ? (
              <p className="thong-bao thong-bao--xanh">Ca này không có chênh lệch</p>
            ) : (
              <BangKiemKe dong={data.dong} />
            )}
          </>
        )}
        <div className="hang-nut">
          <button type="button" className="nut" onClick={() => navigate(-1)}>
            Quay lại
          </button>
        </div>
      </section>
    </>
  )
}
