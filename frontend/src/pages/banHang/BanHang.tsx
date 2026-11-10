import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { LoiApi } from '../../api/client'
import { banHangApi, type ChiTietHoaDon, type KhachHangDong, type SanPhamBan } from '../../api/nghiepVu'
import { useXacThuc } from '../../auth/AuthContext'
import { ChonKhachHang } from '../../components/ChonKhachHang'
import { HopThoai } from '../../components/HopThoai'
import { XemHoaDon } from '../../components/XemHoaDon'
import { so, tien } from '../../lib/dinhDang'

interface DongGio {
  maHH: string
  tenHH: string
  donViTinh: string
  giaBan: number
  ton: number
  soLuong: number
}

type Buoc = 'gio' | 'thanhToan' | 'tienMat' | 'qr' | 'ketThuc' | 'hoaDon' | 'hoanTat'

type Popup =
  | null
  | { loai: 'khongDuHang'; thongBao: string }
  | { loai: 'qrThatBai' }
  | { loai: 'chuaTaoHoaDon'; maPTT: string }
  | { loai: 'thanhToanXong' }
  | { loai: 'guiLoi'; thongBao: string }
  | { loai: 'guiXong' }
  | { loai: 'loi'; thongBao: string }

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
  const { datChuaLuu } = useXacThuc()
  const [buoc, setBuoc] = useState<Buoc>('gio')
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

  const cacDanhMuc = useMemo(() => {
    const m = new Map<string, string>()
    sanPham.data?.forEach((p) => m.set(p.maDM, p.tenDM))
    return [...m.entries()]
  }, [sanPham.data])
  const dsHienThi = (sanPham.data ?? []).filter((p) => !tab || p.maDM === tab)

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

  const timSanPham = async (e: React.FormEvent) => {
    e.preventDefault()
    const k = oTim.trim()
    setTuKhoa(k)
    // Quét mã vạch: khớp đúng mã vạch → thêm thẳng vào giỏ.
    if (k) {
      const kq = await queryClient.fetchQuery({ queryKey: ['ban-hang', 'san-pham', k], queryFn: () => banHangApi.sanPham(k) })
      const khop = kq.find((p) => p.maVach === k)
      if (khop) {
        them(khop)
        setOTim('')
        setTuKhoa('')
      }
    }
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

  const thanhToan = async (phuongThuc: 'Tiền mặt' | 'Chuyển khoản QR', ketQuaQr?: 'ThanhCong' | 'ThatBai') => {
    setDangXuLy(true)
    setLoiTien(null)
    try {
      const tt = await banHangApi.thanhToan({
        maKH: khach?.maKH ?? null,
        dong: dongGui,
        phuongThuc,
        tienKhachDua: phuongThuc === 'Tiền mặt' ? tienDua : undefined,
        ketQuaQrGiaLap: ketQuaQr,
      })
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

  const khungKhach = (
    <div className="khung-khach">
      <span className="ghi-chu">Khách hàng:</span>{' '}
      {khach ? (
        <button type="button" className="nut nut--nho" onClick={() => setMoChonKhach(true)}>
          {khach.hoTen} · {khach.sdt}
        </button>
      ) : (
        <strong>Khách vãng lai</strong>
      )}
      <div className="hang-nut hang-nut--trai">
        <button type="button" className="nut nut--nho" onClick={() => setMoChonKhach(true)}>
          Chọn khách hàng
        </button>
        {khach && (
          <button type="button" className="nut nut--nho" onClick={() => setKhach(null)}>
            Khách vãng lai
          </button>
        )}
      </div>
    </div>
  )

  return (
    <>
      <h1>{buoc === 'hoaDon' ? 'Hóa đơn bán hàng' : buoc === 'ketThuc' ? 'Giao dịch đã kết thúc' : 'Bán hàng'}</h1>

      {buoc === 'gio' && (
        <div className="pos">
          <section className="the pos__hang">
            <form className="o-tim" onSubmit={timSanPham}>
              <input
                className="truong__o"
                placeholder="Tìm tên sản phẩm hoặc quét mã vạch"
                value={oTim}
                onChange={(e) => setOTim(e.target.value)}
                aria-label="Tìm sản phẩm hoặc quét mã vạch"
                autoFocus
              />
              <button type="submit" className="nut">Tìm kiếm</button>
            </form>
            <p className="ghi-chu">
              {tuKhoa ? `Kết quả tìm kiếm · ${dsHienThi.length} sản phẩm · Từ khóa: “${tuKhoa}”` : `Hàng hóa · ${dsHienThi.length} sản phẩm`}
            </p>
            {cacDanhMuc.length > 1 && (
              <div className="tab" role="tablist">
                <button type="button" className={`nut nut--nho ${!tab ? 'nut--chinh' : ''}`} onClick={() => setTab('')}>
                  Tất cả
                </button>
                {cacDanhMuc.map(([ma, ten]) => (
                  <button key={ma} type="button" className={`nut nut--nho ${tab === ma ? 'nut--chinh' : ''}`} onClick={() => setTab(ma)}>
                    {ten}
                  </button>
                ))}
              </div>
            )}
            {sanPham.data && dsHienThi.length === 0 && <p className="thong-bao thong-bao--do">Không tìm thấy sản phẩm phù hợp</p>}
            <ul className="luoi-san-pham">
              {dsHienThi.map((p) => (
                <li key={p.maHH}>
                  <button type="button" className="o-san-pham" onClick={() => them(p)} disabled={p.tonBanDuoc === 0}>
                    <strong>{p.tenHH}</strong>
                    <span className="o-san-pham__gia">
                      {tien(p.giaBan)} / {p.donViTinh}
                    </span>
                    <small className="ghi-chu">
                      Tồn {so(p.tonBanDuoc)} · {p.maHH}
                    </small>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <aside className="the pos__gio">
            <h2>Giỏ hàng · {soSp} sản phẩm</h2>
            {khungKhach}
            {gio.length === 0 ? (
              <p className="ghi-chu">Giỏ hàng chưa có sản phẩm</p>
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
            <button type="button" className="nut nut--chinh nut--rong" disabled={gio.length === 0} onClick={() => setBuoc('thanhToan')}>
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
          <aside className="the pos__gio">
            <h2>Thanh toán</h2>
            {khungKhach}
            <p className="ghi-chu">Cần thanh toán</p>
            <p className="so-rat-lon">{tien(tong)}</p>
            <h3>Hình thức thanh toán</h3>
            <p className="ghi-chu">Thanh toán trực tiếp</p>
            <div className="luoi-2">
              <button type="button" className="nut nut--chinh nut--to" onClick={() => setBuoc('tienMat')}>
                Tiền mặt
              </button>
              <button type="button" className="nut nut--chinh nut--to" onClick={() => setBuoc('qr')}>
                Chuyển khoản QR
              </button>
            </div>
            <p className="ghi-chu">Khách hàng muốn ghi nợ?</p>
            <button type="button" className="nut nut--rong" disabled title="Triển khai ở Giai đoạn 4">
              Chuyển sang ghi nợ (Giai đoạn 4)
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
        <section className="the the--hep canh-giua">
          <h2>Chuyển khoản QR</h2>
          <MaQrGiaLap soTien={tong} />
          <p className="so-lon">{tien(tong)}</p>
          <button type="button" className="nut nut--rong" disabled>
            Đang chờ ngân hàng xác nhận…
          </button>
          <div className="gia-lap">
            <p>
              <strong>[Giả lập ngân hàng]</strong> MVP chưa kết nối ngân hàng thật (Q5). Chọn kết quả để thử các luồng:
            </p>
            <div className="hang-nut hang-nut--giua">
              <button type="button" className="nut nut--chinh" disabled={dangXuLy} onClick={() => thanhToan('Chuyển khoản QR', 'ThanhCong')}>
                Ngân hàng xác nhận
              </button>
              <button type="button" className="nut nut--nguy-hiem" disabled={dangXuLy} onClick={() => thanhToan('Chuyển khoản QR', 'ThatBai')}>
                Thanh toán thất bại
              </button>
            </div>
          </div>
          <button type="button" className="nut nut--chu" onClick={() => setBuoc('thanhToan')}>
            Đổi phương thức thanh toán
          </button>
        </section>
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
            <p className="ghi-chu">Giả lập: số kết thúc bằng “000” sẽ gửi thất bại.</p>
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
            <dd>Đã thanh toán</dd>
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

/** Mã QR minh họa (không quét được) – MVP chưa kết nối ngân hàng (Q5). */
function MaQrGiaLap({ soTien }: { soTien: number }) {
  // Họa tiết giả lập sinh từ số tiền để mỗi đơn trông khác nhau.
  const o = Array.from({ length: 21 * 21 }, (_, i) => ((i * 7919 + soTien) % 11) < 5)
  const goc = (x: number, y: number) => (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13)
  return (
    <svg className="ma-qr" viewBox="0 0 21 21" role="img" aria-label={`Mã QR giả lập ${tien(soTien)}`}>
      <rect width="21" height="21" fill="#fff" />
      {o.map((den, i) => {
        const x = i % 21
        const y = Math.floor(i / 21)
        if (goc(x, y)) return null
        return den ? <rect key={i} x={x} y={y} width="1" height="1" fill="#111" /> : null
      })}
      {[
        [0, 0],
        [14, 0],
        [0, 14],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <rect x={x} y={y} width="7" height="7" fill="#111" />
          <rect x={x + 1} y={y + 1} width="5" height="5" fill="#fff" />
          <rect x={x + 2} y={y + 2} width="3" height="3" fill="#111" />
        </g>
      ))}
    </svg>
  )
}
