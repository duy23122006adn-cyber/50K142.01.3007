import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { LoiApi } from '../../api/client'
import { congNoApi, type KhachQuenDong, type PhieuThuNo } from '../../api/nghiepVu'
import { HopThoai } from '../../components/HopThoai'
import { KhungQr } from '../../components/KhungQr'
import { ngay, ngayGio, tien } from '../../lib/dinhDang'
import { docDaThu } from '../../lib/docTo'
import { NhanTrangThaiNo } from './CongNo'

type Buoc = 'chon' | 'phuongThuc' | 'tienMat' | 'qr' | 'phieu' | 'gui'
type Popup =
  | { loai: 'ttXong' }
  | { loai: 'ttLoi' }
  | { loai: 'loi'; thongBao: string }
  | { loai: 'guiXong' }
  | { loai: 'guiLoi'; thongBao: string }

/** Màn hình 7.2 – Tạo phiếu thanh toán nợ (UC_7.3). */
export function ThuNo() {
  const [params, setParams] = useSearchParams()
  const maKH = params.get('maKH') ?? ''
  // Đổi khách → dựng lại toàn bộ luồng.
  return maKH ? <ThanhToanNo key={maKH} maKH={maKH} onDoiKhach={() => setParams({})} /> : <TimKhachCoNo onChon={(ma) => setParams({ maKH: ma })} />
}

// ---------------------------------------------------------------------- 7.2.1 Tìm khách hàng có công nợ

function TimKhachCoNo({ onChon }: { onChon: (maKH: string) => void }) {
  const [oTim, setOTim] = useState('')
  const [tuKhoa, setTuKhoa] = useState('')
  const { data, error, isFetching } = useQuery({
    queryKey: ['khach-quen', 'co-no', tuKhoa],
    queryFn: () => congNoApi.khachCoNo(tuKhoa),
    retry: false,
  })
  const loi = error instanceof LoiApi ? (error.loi.tuKhoa ?? error.message) : error ? 'Tìm kiếm không thành công' : null

  return (
    <>
      <h1>Tìm khách hàng có công nợ</h1>
      <section className="the the--rong">
        <form
          className="o-tim"
          onSubmit={(e) => {
            e.preventDefault()
            setTuKhoa(oTim.trim())
          }}
        >
          <input
            className={`truong__o ${loi ? 'truong__o--loi' : ''}`}
            placeholder="Nhập tên / số điện thoại để tìm kiếm"
            value={oTim}
            onChange={(e) => setOTim(e.target.value)}
            aria-label="Tên hoặc số điện thoại khách hàng có công nợ"
            autoFocus
          />
          <button type="submit" className="nut nut--chinh">
            Tìm kiếm
          </button>
        </form>
        {loi && <p className="thong-bao thong-bao--do">{loi}</p>}
        {data && !loi && data.length === 0 && (
          <p className="thong-bao thong-bao--do canh-giua">
            {tuKhoa ? 'Không tìm thấy khách hàng có công nợ!' : 'Hiện không có khách hàng nào còn công nợ.'}
          </p>
        )}
        {data && !loi && data.length > 0 && (
          <div className={`bang-cuon ${isFetching ? 'dang-tai-mo' : ''}`}>
            <table className="bang">
              <thead>
                <tr>
                  <th>Mã KH</th>
                  <th>Tên khách hàng</th>
                  <th>SĐT</th>
                  <th className="so">Tổng dư nợ</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {data.map((k: KhachQuenDong) => (
                  <tr key={k.maKH}>
                    <td>{k.maKH}</td>
                    <td>{k.hoTen}</td>
                    <td>{k.sdt}</td>
                    <td className="so">{tien(k.duNo)}</td>
                    <td>
                      <NhanTrangThaiNo trangThai={k.trangThaiNo} />
                    </td>
                    <td>
                      <button type="button" className="nut nut--nho nut--chinh" onClick={() => onChon(k.maKH)}>
                        Chọn
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}

// ---------------------------------------------------------------------- 7.2.2–7.2.11

function ThanhToanNo({ maKH, onDoiKhach }: { maKH: string; onDoiKhach: () => void }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: kq, error } = useQuery({ queryKey: ['khach-quen', 'chi-tiet', maKH], queryFn: () => congNoApi.chiTiet(maKH) })

  const [buoc, setBuoc] = useState<Buoc>('chon')
  /** BR02: chỉ chọn k hóa đơn cũ nhất (null = mặc định chọn tất cả). */
  const [soChon, setSoChon] = useState<number | null>(null)
  const [tienDua, setTienDua] = useState('')
  const [daThuDu, setDaThuDu] = useState(false)
  const [dangXuLy, setDangXuLy] = useState(false)
  const [popup, setPopup] = useState<Popup | null>(null)
  const [phieu, setPhieu] = useState<PhieuThuNo | null>(null)
  const [kenh, setKenh] = useState<'SMS' | 'Zalo'>('Zalo')
  const [sdtNhan, setSdtNhan] = useState('')
  const [daGui, setDaGui] = useState(false)

  if (error) return <p className="thong-bao thong-bao--do">{(error as Error).message}</p>
  if (!kq) return <p className="ghi-chu">Đang tải…</p>

  const ds = kq.hoaDonChuaTra
  const k = soChon ?? ds.length
  const chon = ds.slice(0, k)
  const soTien = chon.reduce((s, h) => s + h.soTien, 0)
  const soTienDua = Number(tienDua.replace(/\D/g, '')) || 0
  const daKhoa = buoc !== 'chon' && buoc !== 'phuongThuc'

  const bamChon = (i: number) => {
    // Bấm vào hóa đơn đang chọn → bỏ nó và các hóa đơn mới hơn; bấm hóa đơn chưa chọn → chọn đến nó.
    setSoChon(i < k ? i : i + 1)
    if (buoc === 'phuongThuc') setBuoc('chon')
  }

  const thuNo = async (phuongThuc: 'Tiền mặt' | 'Chuyển khoản QR', ketQuaQr?: 'ThanhCong' | 'ThatBai', maThamChieuQr?: string) => {
    setDangXuLy(true)
    try {
      const p = await congNoApi.thuNo({
        maKH,
        maHoaDon: chon.map((h) => h.maHD),
        phuongThuc,
        tienKhachDua: phuongThuc === 'Tiền mặt' ? String(soTienDua) : undefined,
        ketQuaQrGiaLap: ketQuaQr,
        maThamChieuQr,
      })
      docDaThu(phuongThuc, p.tongTien, p.tienTraLai) // Usability NFR-02
      setPhieu(p)
      setSdtNhan(p.sdt)
      setPopup({ loai: 'ttXong' })
      void queryClient.invalidateQueries({ queryKey: ['khach-quen'] })
      void queryClient.invalidateQueries({ queryKey: ['hoa-don'] })
    } catch (e) {
      if (e instanceof LoiApi && e.status === 402) setPopup({ loai: 'ttLoi' })
      else setPopup({ loai: 'loi', thongBao: e instanceof LoiApi ? (e.loi.tienKhachDua ?? e.message) : 'Thanh toán không thành công' })
    } finally {
      setDangXuLy(false)
    }
  }

  const guiPhieu = async () => {
    if (!phieu) return
    setDangXuLy(true)
    try {
      await congNoApi.guiPhieu({ maPTT: phieu.maPTT, kenh, sdt: sdtNhan })
      setDaGui(true)
      setPopup({ loai: 'guiXong' })
    } catch (e) {
      setPopup({ loai: 'guiLoi', thongBao: e instanceof LoiApi ? (e.loi.sdt ?? e.message) : 'Gửi phiếu thanh toán điện tử không thành công' })
    } finally {
      setDangXuLy(false)
    }
  }

  const thuNoMoi = () => {
    void queryClient.invalidateQueries({ queryKey: ['khach-quen'] })
    onDoiKhach()
  }

  const popupGui = (
      <>
        {/* 7.2.9 */}
        <HopThoai
          mo={popup?.loai === 'guiXong'}
          kieu="thanhCong"
          nut={
            <button type="button" className="nut nut--chinh" onClick={() => navigate('/')}>
              Kết thúc
            </button>
          }
        >
          <p className="thong-bao thong-bao--xanh">Gửi phiếu thanh toán điện tử thành công</p>
        </HopThoai>
        {/* 7.2.8 */}
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
                  setBuoc('phieu')
                }}
              >
                Bỏ qua
              </button>
              <button
                type="button"
                className="nut nut--chinh"
                disabled={dangXuLy}
                onClick={() => {
                  setPopup(null)
                  void guiPhieu()
                }}
              >
                Gửi lại
              </button>
            </>
          }
        >
          <p className="thong-bao thong-bao--do">Gửi phiếu thanh toán điện tử không thành công</p>
          {popup?.loai === 'guiLoi' && popup.thongBao !== 'Gửi phiếu thanh toán điện tử không thành công!' && (
            <p className="ghi-chu">{popup.thongBao}</p>
          )}
        </HopThoai>
      </>
    )

  // ------------------------------------------------------------ Phiếu thanh toán (7.2.6–7.2.9)
  if ((buoc === 'phieu' || buoc === 'gui') && phieu) {
    return (
      <>
        <h1>Phiếu thanh toán</h1>
        <div className="pos">
          <section className="the pos__hang">
            <article className="hoa-don-in">
              <header className="hoa-don-in__dau">
                <strong className="hoa-don-in__cua-hang">{phieu.tenCuaHang}</strong>
                <span className="nhan nhan--xanh">Đã thanh toán</span>
              </header>
              <dl className="thong-tin">
                <dt>Mã phiếu</dt>
                <dd>{phieu.maPTT}</dd>
                <dt>Khách hàng</dt>
                <dd>
                  {phieu.tenKhach} ({phieu.maKH})
                </dd>
                <dt>Ngày giờ</dt>
                <dd>{ngayGio(phieu.ngayGio)}</dd>
                <dt>SĐT</dt>
                <dd>{phieu.sdt}</dd>
                <dt>Nhân viên</dt>
                <dd>
                  {phieu.maNguoiThu} – {phieu.nguoiThu}
                </dd>
                <dt>Phương thức</dt>
                <dd>{phieu.phuongThuc}</dd>
              </dl>
              <div className="bang-cuon">
                <table className="bang">
                  <thead>
                    <tr>
                      <th>Mã hóa đơn nợ</th>
                      <th className="so">Số tiền</th>
                      <th>Hạn thanh toán</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {phieu.hoaDon.map((h) => (
                      <tr key={h.maHD}>
                        <td>{h.maHD}</td>
                        <td className="so">{tien(h.soTien)}</td>
                        <td>{ngay(h.hanThanhToan)}</td>
                        <td>{h.trangThaiNo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <dl className="thong-tin thong-tin--tong">
                <dt>Tổng tiền thanh toán</dt>
                <dd className="so-lon">{tien(phieu.tongTien)}</dd>
                {phieu.tienTraLai > 0 && (
                  <>
                    <dt>Tiền trả lại</dt>
                    <dd>{tien(phieu.tienTraLai)}</dd>
                  </>
                )}
                <dt>Dư nợ còn lại</dt>
                <dd>{tien(phieu.duNoConLai)}</dd>
              </dl>
            </article>
            <button type="button" className="nut khong-in" onClick={() => window.print()}>
              In phiếu
            </button>
          </section>

          <aside className="the pos__gio khong-in">
            {buoc === 'phieu' ? (
              <>
                <p className="thong-bao thong-bao--xanh">Tạo phiếu thanh toán thành công!</p>
                <dl className="thong-tin">
                  <dt>Mã phiếu thanh toán</dt>
                  <dd>{phieu.maPTT}</dd>
                  {daGui && (
                    <>
                      <dt>Gửi phiếu</dt>
                      <dd>Đã gửi qua {kenh}</dd>
                    </>
                  )}
                </dl>
                {!daGui && (
                  <button type="button" className="nut nut--chinh nut--rong" onClick={() => setBuoc('gui')}>
                    Gửi phiếu qua Zalo / SMS
                  </button>
                )}
                <button type="button" className="nut nut--rong" onClick={thuNoMoi}>
                  Không gửi &amp; kết thúc
                </button>
              </>
            ) : (
              <>
                <h2>Gửi hóa đơn điện tử</h2>
                <p className="ghi-chu">Kênh gửi</p>
                <div className="tab">
                  {(['SMS', 'Zalo'] as const).map((x) => (
                    <button key={x} type="button" className={`nut nut--nho ${kenh === x ? 'nut--chon' : ''}`} onClick={() => setKenh(x)}>
                      {x}
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
                </label>
                <button type="button" className="nut nut--chinh nut--rong" disabled={dangXuLy || !sdtNhan.trim()} onClick={guiPhieu}>
                  Gửi phiếu thanh toán
                </button>
                <button type="button" className="nut nut--rong" onClick={() => setBuoc('phieu')}>
                  Quay lại phiếu
                </button>
              </>
            )}
          </aside>
        </div>
        {popupGui}
      </>
    )
  }

  // ------------------------------------------------------------ Chọn hóa đơn và thanh toán (7.2.2–7.2.5, 7.2.10–7.2.11)
  return (
    <>
      <h1>{buoc === 'chon' ? 'Chọn hóa đơn nợ' : 'Thanh toán'}</h1>
      <div className="pos">
        <section className="the pos__hang">
          <h2>Hóa đơn nợ chưa thanh toán</h2>
          {ds.length === 0 ? (
            <p className="thong-bao thong-bao--do">Khách hàng không còn hóa đơn nợ chưa thanh toán.</p>
          ) : (
            <>
              <p className="ghi-chu">Thanh toán nguyên hóa đơn, theo thứ tự từ hóa đơn nợ cũ nhất.</p>
              <div className="bang-cuon">
                <table className="bang">
                  <thead>
                    <tr>
                      <th>Chọn</th>
                      <th>Mã hóa đơn nợ</th>
                      <th className="so">Số tiền</th>
                      <th>Hạn thanh toán</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ds.map((h, i) => (
                      <tr key={h.maHD}>
                        <td>
                          <input
                            type="checkbox"
                            className="o-tick"
                            checked={i < k}
                            disabled={daKhoa}
                            onChange={() => bamChon(i)}
                            aria-label={`Chọn hóa đơn ${h.maHD}`}
                          />
                        </td>
                        <td>{h.maHD}</td>
                        <td className="so">{tien(h.soTien)}</td>
                        <td>{ngay(h.hanThanhToan)}</td>
                        <td>
                          <NhanTrangThaiNo trangThai={h.trangThaiNo} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        <aside className="the pos__gio">
          {(buoc === 'chon' || buoc === 'phuongThuc') && (
            <>
              <h2>Thanh toán</h2>
              <dl className="thong-tin">
                <dt>Khách hàng</dt>
                <dd>{kq.hoTen}</dd>
                <dt>Mã KH:</dt>
                <dd>{kq.maKH}</dd>
                <dt>Tổng dư nợ</dt>
                <dd>{tien(kq.duNo)}</dd>
                <dt>Số tiền thanh toán</dt>
                <dd className="so-lon">{tien(soTien)}</dd>
              </dl>
              {buoc === 'chon' ? (
                <button type="button" className="nut nut--chinh nut--rong" disabled={k === 0} onClick={() => setBuoc('phuongThuc')}>
                  Xác nhận
                </button>
              ) : (
                <div className="hang-nut">
                  <button
                    type="button"
                    className="nut nut--chinh"
                    onClick={() => {
                      setTienDua('')
                      setDaThuDu(false)
                      setBuoc('tienMat')
                    }}
                  >
                    Tiền mặt
                  </button>
                  <button type="button" className="nut nut--chinh" onClick={() => setBuoc('qr')}>
                    Chuyển khoản QR
                  </button>
                </div>
              )}
              <button type="button" className="nut nut--chu nut--rong" onClick={onDoiKhach}>
                Chọn khách khác
              </button>
            </>
          )}

          {buoc === 'tienMat' && (
            <>
              <h2>Thanh toán tiền mặt</h2>
              <p>
                Số tiền thanh toán: <strong className="so-lon">{tien(soTien)}</strong>
              </p>
              <label className="truong">
                <span className="truong__nhan">Tiền khách đưa</span>
                <input
                  className="truong__o"
                  inputMode="numeric"
                  placeholder="Nhập số tiền khách đưa"
                  value={tienDua}
                  onChange={(e) => setTienDua(e.target.value)}
                  autoFocus
                />
              </label>
              <dl className="thong-tin">
                <dt>Tiền trả lại</dt>
                <dd className="so-lon">{soTienDua >= soTien ? tien(soTienDua - soTien) : '—'}</dd>
              </dl>
              {tienDua && soTienDua < soTien && <p className="truong__loi">Số tiền khách đưa chưa đủ.</p>}
              <label className="o-chon">
                <input type="checkbox" checked={daThuDu} onChange={(e) => setDaThuDu(e.target.checked)} />
                Đã thu đủ {tien(soTien)}
              </label>
              <button
                type="button"
                className="nut nut--chinh nut--rong"
                disabled={!daThuDu || soTienDua < soTien || dangXuLy}
                onClick={() => thuNo('Tiền mặt')}
              >
                Xác nhận
              </button>
              <button type="button" className="nut nut--chu nut--rong" onClick={() => setBuoc('phuongThuc')}>
                Đổi phương thức
              </button>
            </>
          )}

          {buoc === 'qr' && (
            <>
              <h2>Chuyển khoản QR</h2>
              <div className="canh-giua">
                <KhungQr soTien={soTien} dangXuLy={dangXuLy} onKetQua={(ok, ma) => thuNo('Chuyển khoản QR', ok ? 'ThanhCong' : 'ThatBai', ma)} />
              </div>
              <button type="button" className="nut nut--chu nut--rong" onClick={() => setBuoc('phuongThuc')}>
                Đổi phương thức
              </button>
            </>
          )}
        </aside>
      </div>

      {/* 7.2.5 */}
      <HopThoai
        mo={popup?.loai === 'ttXong'}
        kieu="thanhCong"
        nut={
          <button
            type="button"
            className="nut nut--chinh"
            onClick={() => {
              setPopup(null)
              setBuoc('phieu')
            }}
          >
            Tiếp
          </button>
        }
      >
        <p className="thong-bao thong-bao--xanh">Thanh toán thành công</p>
      </HopThoai>

      {/* 7.2.11 */}
      <HopThoai
        mo={popup?.loai === 'ttLoi'}
        kieu="loi"
        onDong={() => setPopup(null)}
        nut={
          <button type="button" className="nut nut--chinh" onClick={() => setPopup(null)}>
            Thanh toán lại
          </button>
        }
      >
        <p className="thong-bao thong-bao--do">Thanh toán không thành công</p>
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
