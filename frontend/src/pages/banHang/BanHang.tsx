import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { LoiApi } from '../../api/client'
import { useNavigate } from 'react-router-dom'
import {
  banHangApi, khachHangApi, type ChiTietHoaDon, type KhachHangDong, type KiemTraGhiNo, type SanPhamBan,
} from '../../api/nghiepVu'
import { useXacThuc } from '../../auth/AuthContext'
import { ChonKhachHang } from '../../components/ChonKhachHang'
import { HopThoai } from '../../components/HopThoai'
import { ManChuyenKhoan } from '../../components/ManChuyenKhoan'
import { XemHoaDon } from '../../components/XemHoaDon'
import { NutDocTo } from '../../components/NutDocTo'
import { bayGioISO, ngay, ngayGio, so, tien } from '../../lib/dinhDang'
import { docTien } from '../../lib/docSo'
import { docDaThu, docTongTien } from '../../lib/docTo'

interface DongGio {
  maHH: string
  tenHH: string
  donViTinh: string
  giaBan: number
  ton: number
  soLuong: number
}

type Buoc = 'gio' | 'thanhToan' | 'tienMat' | 'qr' | 'ghiNo' | 'ketThuc' | 'hoaDon' | 'hoanTat'

/** Màn hình 6.5.1 mục 22–25: ba nhóm lọc trên màn hình bán hàng, gom từ 11 danh mục cố định. */
const NHOM_BAN_HANG = ['Đồ uống', 'Thực phẩm', 'Hàng khác'] as const
type NhomBanHang = (typeof NHOM_BAN_HANG)[number]

function nhomCua(tenDM: string): NhomBanHang {
  if (tenDM === 'Nước giải khát' || tenDM.startsWith('Sữa &')) return 'Đồ uống'
  if (['Bột giặt', 'Nước xả', 'Sữa tắm', 'Dầu gội'].some((t) => tenDM.startsWith(t))) return 'Hàng khác'
  return 'Thực phẩm'
}

type Popup =
  | null
  | { loai: 'khongDuHang'; thongBao: string }
  | { loai: 'qrThatBai' }
  | { loai: 'chuaTaoHoaDon'; maPTT: string }
  | { loai: 'thanhToanXong' }
  | { loai: 'guiLoi'; thongBao: string }
  | { loai: 'guiXong' }
  | { loai: 'loi'; thongBao: string }
  | { loai: 'ghiNoLoi'; thongBao: string; maLoi: string; maKH: string }
  | { loai: 'ghiNoXong' }

const KHOA_GIO = 'xn_gio_hang'

function docGio(): { gio: DongGio[]; khach: KhachHangDong | null } {
  try {
    return JSON.parse(sessionStorage.getItem(KHOA_GIO) ?? '') as { gio: DongGio[]; khach: KhachHangDong | null }
  } catch {
    return { gio: [], khach: null }
  }
}

/** Màn hình 6.5 – Tạo hóa đơn bán hàng (UC_6.5). */
export function BanHang() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { datChuaLuu, nguoiDung } = useXacThuc()
  const [buoc, setBuoc] = useState<Buoc>('gio')
  // UC_7.1 – ghi nợ
  const [oTimNo, setOTimNo] = useState('')
  const [loiTimNo, setLoiTimNo] = useState<string | null>(null)
  const [ketQuaTimNo, setKetQuaTimNo] = useState<KhachHangDong[] | null>(null)
  const [kiemTraNo, setKiemTraNo] = useState<KiemTraGhiNo | null>(null)
  const [thoiDiemXem, setThoiDiemXem] = useState('')
  const [gio, setGio] = useState<DongGio[]>(() => docGio().gio)
  const [khach, setKhach] = useState<KhachHangDong | null>(() => docGio().khach)
  const [oTim, setOTim] = useState('')
  const [tuKhoa, setTuKhoa] = useState('')
  const [tab, setTab] = useState('')
  const [popup, setPopup] = useState<Popup>(null)
  const [moChonKhach, setMoChonKhach] = useState(false)
  const [tienDua, setTienDua] = useState('')
  const [loiTien, setLoiTien] = useState<string | null>(null)
  const [dangXuLy, setDangXuLy] = useState(false)
  const [hoaDon, setHoaDon] = useState<ChiTietHoaDon | null>(null)
  const [kenh, setKenh] = useState<'SMS' | 'Zalo'>('SMS')
  const [sdtNhan, setSdtNhan] = useState('')
  const [daGui, setDaGui] = useState(false)

  const sanPham = useQuery({ queryKey: ['ban-hang', 'san-pham', tuKhoa], queryFn: () => banHangApi.sanPham(tuKhoa) })

  // Giữ giỏ hàng khi chuyển trang (8.b.2) và báo "thao tác chưa hoàn tất" cho nút Đăng xuất (UC_11 1.a).
  useEffect(() => {
    sessionStorage.setItem(KHOA_GIO, JSON.stringify({ gio, khach }))
    datChuaLuu(gio.length > 0 && buoc !== 'hoaDon' && buoc !== 'hoanTat')
  }, [gio, khach, buoc, datChuaLuu])
  useEffect(() => () => datChuaLuu(false), [datChuaLuu])

  const tong = useMemo(() => gio.reduce((s, d) => s + d.giaBan * d.soLuong, 0), [gio])
  const soSp = gio.reduce((s, d) => s + d.soLuong, 0)
  const dongGui = gio.map((d) => ({ maHH: d.maHH, soLuong: d.soLuong }))

  // Màn hình 6.5.1: tab lọc "Tất cả / Đồ uống / Thực phẩm / Hàng khác" – gom 11 danh mục (UC_4.1 BR06) vào 3 nhóm.
  const dsHienThi = (sanPham.data ?? []).filter((p) => !tab || nhomCua(p.tenDM) === tab)

  // ------------------------------------------------------------------ Giỏ hàng (bước 3–7)

  const baoKhongDuHang = (ten: string, ton: number, dvt: string) =>
    setPopup({ loai: 'khongDuHang', thongBao: `Sản phẩm ${ten} không đủ hàng. Số lượng tồn hiện có: ${so(ton)} ${dvt}.` })

  const them = (p: SanPhamBan) => {
    const hienCo = gio.find((d) => d.maHH === p.maHH)?.soLuong ?? 0
    if (hienCo + 1 > p.tonBanDuoc) return baoKhongDuHang(p.tenHH, p.tonBanDuoc, p.donViTinh)
    setGio((g) =>
      g.some((d) => d.maHH === p.maHH)
        ? g.map((d) => (d.maHH === p.maHH ? { ...d, soLuong: d.soLuong + 1, ton: p.tonBanDuoc } : d))
        : [...g, { maHH: p.maHH, tenHH: p.tenHH, donViTinh: p.donViTinh, giaBan: p.giaBan, ton: p.tonBanDuoc, soLuong: 1 }],
    )
  }

  const doiSoLuong = (maHH: string, delta: number) => {
    const d = gio.find((x) => x.maHH === maHH)
    if (!d) return
    if (d.soLuong + delta > d.ton) return baoKhongDuHang(d.tenHH, d.ton, d.donViTinh)
    setGio((g) => g.map((x) => (x.maHH === maHH ? { ...x, soLuong: x.soLuong + delta } : x)).filter((x) => x.soLuong > 0))
  }

  /** Màn hình 6.5.1 mục 20–21: tìm theo tên sản phẩm. */
  const timSanPham = (e: React.FormEvent) => {
    e.preventDefault()
    setTuKhoa(oTim.trim())
  }

  const giaoDichMoi = () => {
    setGio([])
    setKhach(null)
    setTienDua('')
    setLoiTien(null)
    setHoaDon(null)
    setDaGui(false)
    setBuoc('gio')
    void queryClient.invalidateQueries({ queryKey: ['ban-hang', 'san-pham'] })
  }

  // ------------------------------------------------------------------ Thanh toán và tạo hóa đơn (bước 10–15)

  const taoHoaDon = async (maPTT: string) => {
    try {
      const hd = await banHangApi.taoHoaDon({ maPTT, maKH: khach?.maKH ?? null, dong: dongGui })
      setHoaDon(hd)
      setSdtNhan(hd.sdtKhach ?? '')
      setPopup({ loai: 'thanhToanXong' })
      void queryClient.invalidateQueries({ queryKey: ['ca-hien-tai'] })
    } catch (e) {
      // 14.a: khoản thanh toán đã ghi nhận – cho thử lại.
      if (e instanceof LoiApi && e.status === 409 && e.duLieu.maPTT) setPopup({ loai: 'chuaTaoHoaDon', maPTT })
      else setPopup({ loai: 'loi', thongBao: e instanceof LoiApi ? e.message : 'Chưa thể tạo hóa đơn.' })
    }
  }

  const thanhToan = async (phuongThuc: 'Tiền mặt' | 'Chuyển khoản QR', ketQuaQr?: 'ThanhCong' | 'ThatBai', maThamChieuQr?: string) => {
    setDangXuLy(true)
    setLoiTien(null)
    try {
      const tt = await banHangApi.thanhToan({
        maKH: khach?.maKH ?? null,
        dong: dongGui,
        phuongThuc,
        tienKhachDua: phuongThuc === 'Tiền mặt' ? tienDua : undefined,
        ketQuaQrGiaLap: ketQuaQr,
        maThamChieuQr,
      })
      docDaThu(tt.phuongThuc, tt.soTien, tt.tienTraLai) // Usability NFR-02
      await taoHoaDon(tt.maPTT)
    } catch (e) {
      if (!(e instanceof LoiApi)) return setPopup({ loai: 'loi', thongBao: 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.' })
      if (e.status === 402) return setPopup({ loai: 'qrThatBai' })
      if (e.status === 409 && e.duLieu.maHH) return setPopup({ loai: 'khongDuHang', thongBao: e.message })
      if (e.loi.tienKhachDua) return setLoiTien(e.loi.tienKhachDua)
      setPopup({ loai: 'loi', thongBao: e.message })
    } finally {
      setDangXuLy(false)
    }
  }

  // ------------------------------------------------------------------ UC_7.1 Ghi nợ (màn hình 6.6)

  const batDauGhiNo = () => {
    setKiemTraNo(null)
    setKetQuaTimNo(null)
    setLoiTimNo(null)
    setOTimNo(khach?.hoTen ?? '')
    setBuoc('ghiNo')
    if (khach) void chonKhachGhiNo(khach)
  }

  const timKhachGhiNo = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoiTimNo(null)
    setKiemTraNo(null)
    if (!oTimNo.trim()) return setLoiTimNo('Không được để trống!') // 5.a
    try {
      setKetQuaTimNo((await khachHangApi.timKiem(oTimNo.trim())).danhSach)
    } catch (err) {
      setLoiTimNo(err instanceof LoiApi ? (err.loi.tuKhoa ?? err.message) : 'Tìm kiếm không thành công')
    }
  }

  const chonKhachGhiNo = async (kh: KhachHangDong) => {
    try {
      const kt = await banHangApi.kiemTraGhiNo({ maKH: kh.maKH, dong: dongGui })
      setKiemTraNo(kt)
      setKhach(kh)
      setThoiDiemXem(bayGioISO())
    } catch (err) {
      if (err instanceof LoiApi && typeof err.duLieu.maLoi === 'string')
        setPopup({ loai: 'ghiNoLoi', thongBao: err.message, maLoi: err.duLieu.maLoi, maKH: kh.maKH })
      else if (err instanceof LoiApi && err.duLieu.maHH) setPopup({ loai: 'khongDuHang', thongBao: err.message })
      else setPopup({ loai: 'loi', thongBao: err instanceof LoiApi ? err.message : 'Đã xảy ra lỗi hệ thống.' })
    }
  }

  const taoHoaDonNo = async () => {
    if (!kiemTraNo) return
    setDangXuLy(true)
    try {
      const hd = await banHangApi.taoHoaDonNo({ maKH: kiemTraNo.maKH, dong: dongGui })
      setHoaDon(hd)
      setSdtNhan(hd.sdtKhach ?? '')
      setPopup({ loai: 'ghiNoXong' })
      void queryClient.invalidateQueries({ queryKey: ['khach-quen'] })
    } catch (err) {
      if (err instanceof LoiApi && typeof err.duLieu.maLoi === 'string')
        setPopup({ loai: 'ghiNoLoi', thongBao: err.message, maLoi: err.duLieu.maLoi, maKH: kiemTraNo.maKH })
      else if (err instanceof LoiApi && err.duLieu.maHH) setPopup({ loai: 'khongDuHang', thongBao: err.message })
      else setPopup({ loai: 'loi', thongBao: err instanceof LoiApi ? err.message : 'Chưa thể tạo hóa đơn nợ.' })
    } finally {
      setDangXuLy(false)
    }
  }

  const guiHoaDon = async () => {
    if (!hoaDon) return
    setDangXuLy(true)
    try {
      await banHangApi.guiHoaDon({ maHD: hoaDon.maHD, kenh, sdt: sdtNhan })
      setDaGui(true)
      setPopup({ loai: 'guiXong' })
    } catch (e) {
      setPopup({ loai: 'guiLoi', thongBao: e instanceof LoiApi ? (e.loi.sdt ?? e.message) : 'Gửi hóa đơn không thành công' })
    } finally {
      setDangXuLy(false)
    }
  }

  const soTienDua = Number(tienDua.replace(/\D/g, '')) || 0
  const sdtHopLe = /^0\d{9}$/.test(sdtNhan.replace(/\s/g, ''))

  // ------------------------------------------------------------------ Giao diện

  /** Màn hình 6.5.1 mục 38–40: hai nút chọn khách ngay dưới tiêu đề "Đơn hàng mới". */
  const chonKhachGio = (
    <>
      <div className="pos-khach">
        <button type="button" className={`nut ${khach ? 'nut--dang-chon' : ''}`} onClick={() => setMoChonKhach(true)}>
          Chọn khách hàng
        </button>
        <button type="button" className={`nut ${!khach ? 'nut--dang-chon' : ''}`} onClick={() => setKhach(null)}>
          Khách vãng lai
        </button>
      </div>
      {khach && (
        <p className="ghi-chu pos-khach__ten">
          Khách hàng: <strong>{khach.hoTen}</strong> · {khach.sdt}
        </p>
      )}
    </>
  )

  return (
    <>
      <h1>
        {buoc === 'hoaDon' ? 'Hóa đơn bán hàng' : buoc === 'ketThuc' ? 'Giao dịch đã kết thúc' : 'Bán hàng'}
      </h1>

      {buoc === 'gio' && (
        <div className="pos">
          <section className="the pos__hang">
            {/* 6.5.1 mục 19: tiêu đề danh mục và số sản phẩm; 6.5.2: "Kết quả tìm kiếm" khi có từ khóa */}
            <div className="pos-dau">
              <strong>{tuKhoa ? 'Kết quả tìm kiếm' : 'Hàng hóa'}</strong>
              <span>{dsHienThi.length} sản phẩm</span>
            </div>
            <form className="o-tim" onSubmit={timSanPham}>
              <input
                className="truong__o"
                placeholder="Tìm tên sản phẩm"
                value={oTim}
                onChange={(e) => setOTim(e.target.value)}
                aria-label="Tìm tên sản phẩm"
                autoFocus
              />
              <button type="submit" className="nut nut--chinh">
                Tìm kiếm
              </button>
            </form>
            <div className="pos-tab" role="tablist" aria-label="Lọc theo nhóm hàng">
              {(['', ...NHOM_BAN_HANG] as const).map((n) => (
                <button
                  key={n || 'tat-ca'}
                  type="button"
                  role="tab"
                  aria-selected={tab === n}
                  className={`nut ${tab === n ? 'nut--chinh' : ''}`}
                  onClick={() => setTab(n)}
                >
                  {n || 'Tất cả'}
                </button>
              ))}
            </div>
            {sanPham.data && dsHienThi.length === 0 && <p className="thong-bao thong-bao--do">Không tìm thấy sản phẩm phù hợp</p>}
            {dsHienThi.length > 0 && (
              <ul className="ds-san-pham">
                {dsHienThi.map((p) => (
                  <li key={p.maHH}>
                    <button type="button" className="ds-san-pham__dong" onClick={() => them(p)} disabled={p.tonBanDuoc === 0}>
                      <strong>{p.tenHH}</strong>
                      <span>
                        {tien(p.giaBan)} / {p.donViTinh} · Tồn {so(p.tonBanDuoc)} · {p.maHH}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <aside className="the pos__gio">
            <div className="pos-dau">
              <strong>Đơn hàng mới</strong>
              <span>{soSp} sản phẩm</span>
            </div>
            {chonKhachGio}
            {gio.length === 0 ? (
              <p className="pos-gio-trong">Giỏ hàng chưa có sản phẩm</p>
            ) : (
              <ul className="ds-gio">
                {gio.map((d) => (
                  <li key={d.maHH}>
                    <div>
                      <strong>{d.tenHH}</strong>
                      <br />
                      <small className="ghi-chu">
                        {tien(d.giaBan)} / {d.donViTinh}
                      </small>
                    </div>
                    <div className="ds-gio__sl">
                      <button type="button" className="nut nut--nho" onClick={() => doiSoLuong(d.maHH, -1)} aria-label="Giảm">
                        −
                      </button>
                      <span>{d.soLuong}</span>
                      <button type="button" className="nut nut--nho" onClick={() => doiSoLuong(d.maHH, 1)} aria-label="Tăng">
                        +
                      </button>
                      <button type="button" className="nut nut--nho nut--nguy-hiem" onClick={() => doiSoLuong(d.maHH, -d.soLuong)}>
                        Xóa
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <dl className="thong-tin thong-tin--tong">
              <dt>Tiền hàng</dt>
              <dd>{tien(tong)}</dd>
              <dt>Cần thanh toán</dt>
              <dd className="so-lon">{tien(tong)}</dd>
            </dl>
            <button
              type="button"
              className="nut nut--chinh nut--rong"
              disabled={gio.length === 0}
              onClick={() => {
                setBuoc('thanhToan')
                docTongTien(tong)
              }}
            >
              Tiếp tục thanh toán
            </button>
          </aside>
        </div>
      )}

      {buoc === 'thanhToan' && (
        <div className="pos">
          <section className="the pos__hang">
            <h2>Thông tin đơn hàng</h2>
            <table className="bang">
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th className="so">SL</th>
                  <th className="so">Đơn giá</th>
                  <th className="so">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {gio.map((d) => (
                  <tr key={d.maHH}>
                    <td>
                      {d.tenHH} <small className="ghi-chu">/ ĐVT: {d.donViTinh}</small>
                    </td>
                    <td className="so">{d.soLuong}</td>
                    <td className="so">{tien(d.giaBan)}</td>
                    <td className="so">{tien(d.giaBan * d.soLuong)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="tong-lon">
              Tổng tiền cần thanh toán: <strong>{tien(tong)}</strong>
            </p>
            <button type="button" className="nut" onClick={() => setBuoc('gio')}>
              Quay lại giỏ hàng
            </button>
          </section>
          {/* Cùng bố cục với giỏ "Đơn hàng mới": tiêu đề + số sản phẩm, hai nút chọn khách, tổng tiền dưới đường gạch. */}
          <aside className="the pos__gio pos-tt">
            <div className="pos-dau">
              <strong>Thanh toán</strong>
              <span>{soSp} sản phẩm</span>
            </div>
            {chonKhachGio}
            <div className="pos-tt__tong">
              <span className="ghi-chu">Cần thanh toán</span>
              <p className="so-rat-lon">{tien(tong)}</p>
              <div className="pos-tt__doc">
                <button type="button" className="nut nut--nho" onClick={() => docTongTien(tong)} title="Đọc lại số tiền">
                  🔊 Đọc số tiền
                </button>
                <NutDocTo cauThu={`Tổng tiền cần thanh toán ${docTien(tong)}`} />
              </div>
            </div>
            <h3 className="tieu-de-nhom">Hình thức thanh toán</h3>
            <p className="ghi-chu nhan-nhom">Thanh toán trực tiếp</p>
            <div className="luoi-thanh-toan">
              <button type="button" className="nut nut--chinh" onClick={() => setBuoc('tienMat')}>
                Tiền mặt
              </button>
              <button type="button" className="nut nut--chinh" onClick={() => setBuoc('qr')}>
                Chuyển khoản QR
              </button>
            </div>
            <p className="ghi-chu nhan-nhom">Khách hàng muốn ghi nợ?</p>
            <button type="button" className="nut nut--rong pos-tt__no" onClick={() => batDauGhiNo()}>
              Chuyển sang ghi nợ
            </button>
          </aside>
        </div>
      )}

      {buoc === 'tienMat' && (
        <section className="the the--hep">
          <h2>Thanh toán tiền mặt</h2>
          <p>
            Cần thanh toán: <strong className="so-lon">{tien(tong)}</strong>
          </p>
          <label className="truong">
            <span className="truong__nhan">Tiền khách đưa</span>
            <input
              className={`truong__o so-lon ${loiTien ? 'truong__o--loi' : ''}`}
              inputMode="numeric"
              value={tienDua ? so(soTienDua) : ''}
              onChange={(e) => setTienDua(e.target.value.replace(/\D/g, ''))}
              placeholder="0"
              autoFocus
            />
            {loiTien && <span className="truong__loi">{loiTien}</span>}
          </label>
          <div className="hang-nut hang-nut--trai">
            {[tong, 50000, 100000, 200000, 500000].filter((x, i, a) => x >= tong && a.indexOf(x) === i).map((x) => (
              <button key={x} type="button" className="nut nut--nho" onClick={() => setTienDua(String(x))}>
                {so(x)}
              </button>
            ))}
          </div>
          <p>
            Tiền trả lại: <strong className="so-lon">{tien(Math.max(0, soTienDua - tong))}</strong>
          </p>
          {soTienDua >= tong && <p className="thong-bao thong-bao--xanh">✓ Đã thu đủ {tien(tong)}</p>}
          <div className="hang-nut">
            <button type="button" className="nut" onClick={() => setBuoc('thanhToan')}>
              Đổi phương thức thanh toán
            </button>
            <button
              type="button"
              className="nut nut--chinh"
              disabled={dangXuLy || soTienDua < tong}
              onClick={() => thanhToan('Tiền mặt')}
            >
              Xác nhận &amp; tạo hóa đơn
            </button>
          </div>
        </section>
      )}

      {buoc === 'qr' && (
        <ManChuyenKhoan
          moTa={`Thanh toán đơn hàng · ${soSp} sản phẩm`}
          soTien={tong}
          dangXuLy={dangXuLy}
          onKetQua={(ok, ma) => thanhToan('Chuyển khoản QR', ok ? 'ThanhCong' : 'ThatBai', ma)}
          onDoiHinhThuc={() => setBuoc('thanhToan')}
        />
      )}

      {buoc === 'ghiNo' && (
        <div className="pos">
          <section className="the pos__hang">
            {!kiemTraNo ? (
              <>
                <h2>Tìm khách hàng theo tên hoặc số điện thoại</h2>
                <form className="o-tim" onSubmit={timKhachGhiNo}>
                  <input
                    className={`truong__o ${loiTimNo ? 'truong__o--loi' : ''}`}
                    placeholder="Nhập tên hoặc số điện thoại"
                    value={oTimNo}
                    onChange={(e) => setOTimNo(e.target.value)}
                    aria-label="Tên hoặc số điện thoại khách hàng cần ghi nợ"
                    autoFocus
                  />
                  <button type="submit" className="nut nut--chinh">Tìm kiếm</button>
                </form>
                {loiTimNo && <p className="truong__loi">{loiTimNo}</p>}
                {ketQuaTimNo && ketQuaTimNo.length === 0 && <p className="thong-bao thong-bao--do canh-giua">Không tìm thấy khách hàng</p>}
                {ketQuaTimNo && ketQuaTimNo.length > 0 && (
                  <>
                    <p className="ghi-chu">Kết quả tìm kiếm: {ketQuaTimNo.length} khách hàng</p>
                    <table className="bang">
                      <thead>
                        <tr>
                          <th>Mã KH</th>
                          <th>Họ tên</th>
                          <th>Số điện thoại</th>
                          <th>Hành động</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ketQuaTimNo.map((kh) => (
                          <tr key={kh.maKH}>
                            <td>{kh.maKH}</td>
                            <td>{kh.hoTen}</td>
                            <td>{kh.sdt}</td>
                            <td>
                              <button type="button" className="nut nut--nho nut--chinh" onClick={() => chonKhachGhiNo(kh)}>
                                Chọn
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              </>
            ) : (
              /* 6.6.8 – hóa đơn nợ dự kiến (chưa cấp mã) */
              <article className="hoa-don-in">
                <header className="hoa-don-in__dau">
                  <strong className="hoa-don-in__cua-hang">Hóa đơn bán hàng</strong>
                  <span>HÓA ĐƠN BÁN HÀNG · Chưa cấp mã</span>
                </header>
                <dl className="thong-tin">
                  <dt>Ngày lập</dt>
                  <dd>{ngayGio(thoiDiemXem)}</dd>
                  <dt>Khách</dt>
                  <dd>{kiemTraNo.tenKhach}</dd>
                  <dt>Người bán</dt>
                  <dd>{nguoiDung?.hoTen}</dd>
                  <dt>SĐT</dt>
                  <dd>{kiemTraNo.sdt}</dd>
                  <dt>Loại</dt>
                  <dd>Ghi nợ</dd>
                  <dt>Hạn thanh toán</dt>
                  <dd>{ngay(kiemTraNo.hanThanhToan)}</dd>
                </dl>
                <table className="bang">
                  <thead>
                    <tr>
                      <th>Sản phẩm / ĐVT</th>
                      <th className="so">SL</th>
                      <th className="so">Đơn giá</th>
                      <th className="so">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gio.map((d) => (
                      <tr key={d.maHH}>
                        <td>
                          {d.tenHH} — <span className="ghi-chu">{d.donViTinh}</span>
                        </td>
                        <td className="so">{d.soLuong}</td>
                        <td className="so">{tien(d.giaBan)}</td>
                        <td className="so">{tien(d.giaBan * d.soLuong)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <dl className="thong-tin thong-tin--tong">
                  <dt>Tổng tiền hàng</dt>
                  <dd>{tien(tong)}</dd>
                  <dt>Tổng tiền thanh toán</dt>
                  <dd className="so-lon">{tien(tong)}</dd>
                  <dt>Số tiền đã trả</dt>
                  <dd>{tien(0)}</dd>
                </dl>
              </article>
            )}
          </section>

          <aside className="the pos__gio">
            {kiemTraNo ? (
              <>
                <h2>Kiểm tra công nợ</h2>
                <dl className="thong-tin">
                  <dt>Khách quen</dt>
                  <dd>{kiemTraNo.tenKhach}</dd>
                  <dt>Nợ trước</dt>
                  <dd>{tien(kiemTraNo.noTruoc)}</dd>
                  <dt>Đơn hàng hiện tại</dt>
                  <dd>{tien(kiemTraNo.donHienTai)}</dd>
                  <dt>Tổng nợ sau đơn</dt>
                  <dd className="so-lon">{tien(kiemTraNo.tongNoSauDon)}</dd>
                  <dt>Hạn mức</dt>
                  <dd>{tien(kiemTraNo.hanMuc)}</dd>
                  <dt>Nợ cũ nhất</dt>
                  <dd>{kiemTraNo.ngayNoCuNhat ? ngay(kiemTraNo.ngayNoCuNhat) : '—'}</dd>
                </dl>
                <p className="thong-bao thong-bao--xanh">✓ Chưa quá hạn 30 ngày · Trong hạn mức</p>
                <button type="button" className="nut nut--chinh nut--rong" disabled={dangXuLy} onClick={taoHoaDonNo}>
                  Tạo hóa đơn nợ
                </button>
                <button type="button" className="nut nut--rong" onClick={() => setKiemTraNo(null)}>
                  Chọn khách khác
                </button>
              </>
            ) : (
              <>
                <h2>Ghi nợ</h2>
                <p>
                  Giá trị đơn hàng: <strong className="so-lon">{tien(tong)}</strong>
                </p>
                <p className="ghi-chu">Chỉ khách quen được mua nợ; tổng nợ không quá hạn mức và không có khoản nợ quá 30 ngày.</p>
              </>
            )}
            <button type="button" className="nut nut--chu nut--rong" onClick={() => setBuoc('thanhToan')}>
              Đổi thanh toán
            </button>
          </aside>
        </div>
      )}

      {buoc === 'ketThuc' && (
        <section className="the the--hep">
          <h2>Đã kết thúc giao dịch</h2>
          <dl className="thong-tin">
            <dt>Hóa đơn</dt>
            <dd>Không tạo</dd>
            <dt>Tồn kho</dt>
            <dd>Không thay đổi</dd>
            <dt>Thanh toán</dt>
            <dd>Không có giao dịch thành công</dd>
          </dl>
          <button type="button" className="nut nut--chinh" onClick={giaoDichMoi}>
            Tạo giao dịch mới
          </button>
        </section>
      )}

      {buoc === 'hoaDon' && hoaDon && (
        <div className="pos">
          <section className="the pos__hang">
            <XemHoaDon hd={hoaDon} />
            <button type="button" className="nut khong-in" onClick={() => window.print()}>
              In hóa đơn
            </button>
          </section>
          <aside className="the pos__gio khong-in">
            <h2>Gửi hóa đơn điện tử</h2>
            <p className="ghi-chu">Kênh gửi</p>
            <div className="tab">
              {(['SMS', 'Zalo'] as const).map((k) => (
                <button key={k} type="button" className={`nut nut--nho ${kenh === k ? 'nut--chinh' : ''}`} onClick={() => setKenh(k)}>
                  {k}
                </button>
              ))}
            </div>
            <label className="truong">
              <span className="truong__nhan">Số điện thoại nhận</span>
              <input
                className="truong__o"
                inputMode="numeric"
                placeholder="Nhập số điện thoại"
                value={sdtNhan}
                onChange={(e) => setSdtNhan(e.target.value)}
              />
              {!hoaDon.sdtKhach && !sdtNhan && (
                <span className="truong__loi">Khách hàng chưa có số điện thoại. Vui lòng nhập số điện thoại.</span>
              )}
            </label>
            <button type="button" className="nut nut--chinh nut--rong" disabled={!sdtHopLe || dangXuLy} onClick={guiHoaDon}>
              Gửi hóa đơn
            </button>
            <button type="button" className="nut nut--rong" onClick={() => setBuoc('hoanTat')}>
              Không gửi &amp; hoàn tất
            </button>
          </aside>
        </div>
      )}

      {buoc === 'hoanTat' && (
        <section className="the the--hep">
          <h2>Hoàn tất bán hàng</h2>
          {!daGui && <p className="ghi-chu">Khách hàng không yêu cầu gửi hóa đơn qua SMS hoặc Zalo.</p>}
          <dl className="thong-tin">
            <dt>Hóa đơn</dt>
            <dd>{hoaDon?.maHD}</dd>
            <dt>Thanh toán</dt>
            <dd>{hoaDon?.trangThai === 'Còn nợ' ? `Ghi nợ – hạn thanh toán ${ngay(hoaDon.hanThanhToan ?? '')}` : 'Đã thanh toán'}</dd>
            <dt>Tồn kho</dt>
            <dd>Đã cập nhật</dd>
            <dt>Gửi hóa đơn</dt>
            <dd>{daGui ? `Đã gửi qua ${kenh}` : 'Không gửi'}</dd>
          </dl>
          <p className="thong-bao thong-bao--xanh">Giao dịch đã hoàn tất.</p>
          <button type="button" className="nut nut--chinh" onClick={giaoDichMoi}>
            Tạo giao dịch mới
          </button>
        </section>
      )}

      <ChonKhachHang
        mo={moChonKhach}
        onDong={() => setMoChonKhach(false)}
        onChon={(kh) => {
          setKhach(kh)
          setMoChonKhach(false)
        }}
      />

      {/* 6.5.6 Sản phẩm không đủ hàng */}
      <HopThoai
        mo={popup?.loai === 'khongDuHang'}
        tieuDe="Sản phẩm không đủ hàng"
        kieu="loi"
        onDong={() => setPopup(null)}
        nut={
          <>
            <button
              type="button"
              className="nut"
              onClick={() => {
                setPopup(null)
                setGio([])
                setBuoc('ketThuc')
              }}
            >
              Kết thúc
            </button>
            <button
              type="button"
              className="nut nut--chinh"
              onClick={() => {
                setPopup(null)
                setBuoc('gio')
                void queryClient.invalidateQueries({ queryKey: ['ban-hang', 'san-pham'] })
              }}
            >
              Chọn lại sản phẩm
            </button>
          </>
        }
      >
        <p className="thong-bao thong-bao--do">{popup?.loai === 'khongDuHang' ? popup.thongBao : ''}</p>
      </HopThoai>

      {/* 6.5.15 Thanh toán chưa thành công */}
      <HopThoai
        mo={popup?.loai === 'qrThatBai'}
        tieuDe="Thanh toán chưa thành công"
        kieu="loi"
        onDong={() => setPopup(null)}
        nut={
          <>
            <button
              type="button"
              className="nut"
              onClick={() => {
                setPopup(null)
                setGio([])
                setBuoc('ketThuc')
              }}
            >
              Hủy giao dịch
            </button>
            <button
              type="button"
              className="nut nut--chinh"
              onClick={() => {
                setPopup(null)
                setBuoc('thanhToan')
              }}
            >
              Thanh toán lại
            </button>
          </>
        }
      >
        <p>Vui lòng thanh toán lại hoặc hủy giao dịch.</p>
      </HopThoai>

      {/* 6.5.17 Chưa thể tạo hóa đơn */}
      <HopThoai
        mo={popup?.loai === 'chuaTaoHoaDon'}
        tieuDe="Chưa thể tạo hóa đơn"
        kieu="loi"
        nut={
          <button
            type="button"
            className="nut nut--chinh"
            disabled={dangXuLy}
            onClick={async () => {
              if (popup?.loai !== 'chuaTaoHoaDon') return
              const maPTT = popup.maPTT
              setPopup(null)
              setDangXuLy(true)
              await taoHoaDon(maPTT)
              setDangXuLy(false)
            }}
          >
            Thử lại tạo hóa đơn
          </button>
        }
      >
        <p>Khoản thanh toán đã được ghi nhận, vui lòng thử lại.</p>
      </HopThoai>

      {/* 6.5.13 Thanh toán thành công */}
      <HopThoai
        mo={popup?.loai === 'thanhToanXong'}
        kieu="thanhCong"
        nut={
          <button
            type="button"
            className="nut nut--chinh"
            onClick={() => {
              setPopup(null)
              setBuoc('hoaDon')
              setGio([])
              setKhach(null)
            }}
          >
            Tiếp tục
          </button>
        }
      >
        <p className="thong-bao thong-bao--xanh">Thanh toán thành công</p>
        <p>Tạo hóa đơn thành công: {hoaDon?.maHD}</p>
      </HopThoai>

      {/* 6.5.22 Gửi không thành công */}
      <HopThoai
        mo={popup?.loai === 'guiLoi'}
        kieu="loi"
        onDong={() => setPopup(null)}
        nut={
          <>
            <button
              type="button"
              className="nut"
              onClick={() => {
                setPopup(null)
                setBuoc('hoanTat')
              }}
            >
              Bỏ qua
            </button>
            <button type="button" className="nut nut--chinh" onClick={() => setPopup(null)}>
              Gửi lại
            </button>
          </>
        }
      >
        <p className="thong-bao thong-bao--do">{popup?.loai === 'guiLoi' ? popup.thongBao : ''}</p>
      </HopThoai>

      {/* 6.5.23 Gửi thành công */}
      <HopThoai
        mo={popup?.loai === 'guiXong'}
        kieu="thanhCong"
        nut={
          <button
            type="button"
            className="nut nut--chinh"
            onClick={() => {
              setPopup(null)
              setBuoc('hoanTat')
            }}
          >
            Tiếp tục
          </button>
        }
      >
        <p className="thong-bao thong-bao--xanh">Gửi hóa đơn thành công</p>
      </HopThoai>

      {/* 6.6.5–6.6.7 Không ghi nợ được */}
      <HopThoai
        mo={popup?.loai === 'ghiNoLoi'}
        kieu="loi"
        onDong={() => setPopup(null)}
        nut={
          <>
            {popup?.loai === 'ghiNoLoi' && popup.maLoi === 'QuaHan' && (
              <button
                type="button"
                className="nut"
                onClick={() => navigate(`/quan-ly-cong-no/thu-no?maKH=${encodeURIComponent(popup.maKH)}`)}
              >
                Thanh toán nợ cũ
              </button>
            )}
            <button
              type="button"
              className="nut nut--chinh"
              onClick={() => {
                setPopup(null)
                setKiemTraNo(null)
                setBuoc('thanhToan')
              }}
            >
              Đổi thanh toán
            </button>
          </>
        }
      >
        <p className="thong-bao thong-bao--do">{popup?.loai === 'ghiNoLoi' ? popup.thongBao : ''}</p>
      </HopThoai>

      {/* 6.6.9 Tạo hóa đơn nợ thành công */}
      <HopThoai
        mo={popup?.loai === 'ghiNoXong'}
        kieu="thanhCong"
        nut={
          <button
            type="button"
            className="nut nut--chinh"
            onClick={() => {
              setPopup(null)
              setKiemTraNo(null)
              setBuoc('hoaDon')
            }}
          >
            Tiếp
          </button>
        }
      >
        <p className="thong-bao thong-bao--xanh">Tạo hóa đơn nợ thành công</p>
        <p>Mã hóa đơn: {hoaDon?.maHD}</p>
      </HopThoai>

      <HopThoai
        mo={popup?.loai === 'loi'}
        kieu="loi"
        onDong={() => setPopup(null)}
        nut={
          <button type="button" className="nut" onClick={() => setPopup(null)}>
            Đóng
          </button>
        }
      >
        <p className="thong-bao thong-bao--do">{popup?.loai === 'loi' ? popup.thongBao : ''}</p>
      </HopThoai>
    </>
  )
}
