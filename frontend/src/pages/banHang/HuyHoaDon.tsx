import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { LoiApi } from '../../api/client'
import { hoaDonApi, huyHoaDonApi, type KiemTraHuy } from '../../api/nghiepVu'
import { HopThoai } from '../../components/HopThoai'
import { NhatKyHuy } from '../../components/NhatKyHuy'
import { TimHoaDon } from '../../components/TimHoaDon'
import { XemHoaDon } from '../../components/XemHoaDon'
import { tien } from '../../lib/dinhDang'

const DANH_SACH = '/quan-ly-ban-hang/huy-hoa-don'

/** Màn hình 6.3.1–6.3.3 – danh sách và tìm hóa đơn cần hủy (UC_6.3 bước 1–5). */
export function HuyHoaDonDanhSach() {
  const navigate = useNavigate()
  return (
    <TimHoaDon
      tieuDe="Hủy hóa đơn bán hàng"
      thongBaoRong="Không tìm thấy hóa đơn"
      onXem={(ma) => navigate(`${DANH_SACH}/hoa-don?ma=${encodeURIComponent(ma)}`)}
    />
  )
}

type Buoc = 'xem' | 'khongDuDieuKien' | 'nhanHang' | 'daNhanHang' | 'lyDo' | 'xacNhan' | 'huyBo' | 'xong' | 'nhatKy'

/** Màn hình 6.3.4–6.3.26 – chi tiết hóa đơn và các bước hủy (UC_6.3 bước 6–18). */
export function HuyHoaDonChiTiet() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [params] = useSearchParams()
  const ma = params.get('ma') ?? ''
  const { data: hd, error } = useQuery({ queryKey: ['hoa-don', 'chi-tiet', ma], queryFn: () => hoaDonApi.chiTiet(ma), enabled: !!ma })

  const [buoc, setBuoc] = useState<Buoc>('xem')
  const [kt, setKt] = useState<KiemTraHuy | null>(null)
  const [lyDo, setLyDo] = useState('')
  const [loiLyDo, setLoiLyDo] = useState<string | null>(null)
  const [dangXuLy, setDangXuLy] = useState(false)
  const [loi, setLoi] = useState<string | null>(null)
  const [ketQua, setKetQua] = useState<KiemTraHuy | null>(null)

  if (error) return <p className="thong-bao thong-bao--do">{(error as Error).message}</p>
  if (!hd) return <p className="ghi-chu">Đang tải…</p>

  const veDanhSach = () => navigate(DANH_SACH)

  // Bước 8: kiểm tra điều kiện hủy.
  const batDauHuy = async () => {
    setDangXuLy(true)
    try {
      const k = await huyHoaDonApi.kiemTra(hd.maHD)
      setKt(k)
      setBuoc(k.duocHuy ? 'nhanHang' : 'khongDuDieuKien')
    } catch (e) {
      setLoi(e instanceof LoiApi ? e.message : 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.')
    } finally {
      setDangXuLy(false)
    }
  }

  const tiepTucLyDo = (e: React.FormEvent) => {
    e.preventDefault()
    if (!lyDo.trim()) return setLoiLyDo('Vui lòng nhập lý do hủy.') // 12.a
    setLoiLyDo(null)
    setBuoc('xacNhan')
  }

  // Bước 14–18.
  const dongY = async () => {
    setDangXuLy(true)
    try {
      setKetQua(await huyHoaDonApi.huy({ maHD: hd.maHD, khachChuaNhanHang: true, lyDoHuy: lyDo }))
      setBuoc('xong')
      await queryClient.invalidateQueries({ queryKey: ['hoa-don'] })
      void queryClient.invalidateQueries({ queryKey: ['khach-quen'] })
    } catch (e) {
      if (e instanceof LoiApi && e.loi.lyDoHuy) {
        setLoiLyDo(e.loi.lyDoHuy)
        setBuoc('lyDo')
      } else setLoi(e instanceof LoiApi ? e.message : 'Hủy hóa đơn không thành công. Vui lòng thử lại.')
    } finally {
      setDangXuLy(false)
    }
  }

  const k = ketQua ?? kt
  const laNo = k?.laHoaDonNo ?? hd.loaiHoaDon === 'Ghi nợ'

  return (
    <>
      <h1>
        {buoc === 'khongDuDieuKien' ? (
          <span className="chu-do">Không đủ điều kiện hủy</span>
        ) : buoc === 'daNhanHang' ? (
          <span className="chu-do">Không thể hủy hóa đơn</span>
        ) : buoc === 'huyBo' ? (
          <span className="chu-do">Đã hủy bỏ thao tác</span>
        ) : buoc === 'nhatKy' ? (
          'Hóa đơn đã hủy và nhật ký'
        ) : (
          'Chi tiết hóa đơn'
        )}
      </h1>
      <div className="pos">
        <section className="the pos__hang">
          {buoc === 'nhatKy' ? <NhatKyHuy maHD={hd.maHD} /> : <XemHoaDon hd={hd} />}
          {buoc === 'xem' && hd.trangThai === 'Đã hủy' && (
            <button type="button" className="nut" onClick={() => setBuoc('nhatKy')}>
              Xem nhật ký hủy
            </button>
          )}
        </section>

        <aside className="the pos__gio">
          {buoc === 'xem' && (
            <>
              <h2>Hủy hóa đơn bán hàng</h2>
              {laNo && hd.trangThai === 'Còn nợ' && (
                <p className="ghi-chu">Hệ thống sẽ kiểm tra điều kiện trước khi cho phép tiếp tục.</p>
              )}
              <button type="button" className="nut nut--nguy-hiem nut--rong" disabled={dangXuLy} onClick={batDauHuy}>
                Hủy hóa đơn bán hàng
              </button>
              <button type="button" className="nut nut--rong" onClick={veDanhSach}>
                Về danh sách
              </button>
            </>
          )}

          {buoc === 'khongDuDieuKien' && (
            <>
              <p className="thong-bao thong-bao--do">{kt?.thongBao}</p>
              <button type="button" className="nut nut--chinh nut--rong" onClick={veDanhSach}>
                Kết thúc
              </button>
            </>
          )}

          {buoc === 'nhanHang' && (
            <>
              <h2>Khách đã nhận hàng chưa?</h2>
              <p className="ghi-chu">Chỉ hủy hóa đơn khi khách chưa nhận hàng. Khách đã nhận hàng thì xử lý theo đổi trả.</p>
              <button type="button" className="nut nut--chinh nut--rong" onClick={() => setBuoc('lyDo')}>
                Khách chưa nhận hàng
              </button>
              <button type="button" className="nut nut--rong" onClick={() => setBuoc('daNhanHang')}>
                Khách đã nhận hàng
              </button>
              <button type="button" className="nut nut--chu nut--rong" onClick={() => setBuoc('huyBo')}>
                Hủy bỏ
              </button>
            </>
          )}

          {buoc === 'daNhanHang' && (
            <>
              <p className="thong-bao thong-bao--do">Khách đã nhận hàng, không thể hủy hóa đơn.</p>
              <button type="button" className="nut nut--chinh nut--rong" onClick={veDanhSach}>
                Kết thúc
              </button>
            </>
          )}

          {buoc === 'huyBo' && (
            <>
              <p>Không có dữ liệu nào thay đổi.</p>
              <button type="button" className="nut nut--chinh nut--rong" onClick={veDanhSach}>
                Về danh sách
              </button>
            </>
          )}

          {buoc === 'lyDo' && (
            <form onSubmit={tiepTucLyDo} noValidate>
              <h2>Nhập lý do hủy</h2>
              <p className="ghi-chu">Khách chưa nhận hàng · Hủy toàn bộ hóa đơn.</p>
              <label className="truong">
                <span className="truong__nhan">
                  Lý do hủy<span className="truong__sao"> *</span>
                </span>
                <textarea
                  className={`truong__o ${loiLyDo ? 'truong__o--loi' : ''}`}
                  rows={3}
                  maxLength={255}
                  placeholder="Nhập lý do hủy hóa đơn…"
                  value={lyDo}
                  onChange={(e) => setLyDo(e.target.value)}
                  autoFocus
                />
                {loiLyDo && <span className="truong__loi">{loiLyDo}</span>}
              </label>
              <button type="submit" className="nut nut--chinh nut--rong">
                Tiếp tục
              </button>
              <button type="button" className="nut nut--chu nut--rong" onClick={() => setBuoc('huyBo')}>
                Hủy bỏ
              </button>
            </form>
          )}

          {buoc === 'xacNhan' && kt && (
            <>
              <h2>Xác nhận hủy toàn bộ</h2>
              {laNo && <p className="ghi-chu">Hóa đơn nợ chưa có thanh toán công nợ.</p>}
              <p>Lý do: {lyDo.trim()}</p>
              <dl className="thong-tin">
                <dt>Số lượng hoàn kho</dt>
                <dd>{kt.soLuongHoanKho} sản phẩm</dd>
                <dt>Số tiền cần hoàn</dt>
                <dd className="so-lon">{tien(kt.soTienCanHoan)}</dd>
                {laNo && (
                  <>
                    <dt>Giảm doanh thu</dt>
                    <dd>{tien(kt.giamDoanhThu)}</dd>
                    <dt>Giảm công nợ</dt>
                    <dd>{tien(kt.giamCongNo)}</dd>
                  </>
                )}
              </dl>
              {laNo && (
                <p className="ghi-chu">
                  Tăng hạn mức còn lại {tien(kt.giamCongNo)}, dừng nhắc nợ hóa đơn. Quyền mua nợ được hệ thống xác định lại.
                </p>
              )}
              <button type="button" className="nut nut--nguy-hiem-dac nut--rong" disabled={dangXuLy} onClick={dongY}>
                Đồng ý · Hủy toàn bộ
              </button>
              <button type="button" className="nut nut--rong" onClick={() => setBuoc('huyBo')}>
                Hủy bỏ
              </button>
            </>
          )}

          {buoc === 'xong' && ketQua && (
            <>
              <p className="thong-bao thong-bao--xanh">Hủy hóa đơn thành công.</p>
              <p className="ghi-chu">Đã lưu nhật ký và cập nhật đầy đủ trong cùng một giao dịch.</p>
              <dl className="thong-tin">
                <dt>Hoàn kho</dt>
                <dd>{ketQua.soLuongHoanKho} sản phẩm</dd>
                {laNo ? (
                  <>
                    <dt>Tăng hạn mức</dt>
                    <dd>{tien(ketQua.giamCongNo)}</dd>
                  </>
                ) : (
                  <>
                    <dt>Giảm doanh thu</dt>
                    <dd>{tien(ketQua.giamDoanhThu)}</dd>
                  </>
                )}
              </dl>
              {laNo && <p className="ghi-chu">Đã dừng nhắc nợ của hóa đơn. Quyền mua nợ được hệ thống xác định lại.</p>}
              <button type="button" className="nut nut--chinh nut--rong" onClick={() => setBuoc('nhatKy')}>
                Xem nhật ký hủy
              </button>
              <button type="button" className="nut nut--rong" onClick={veDanhSach}>
                Về danh sách
              </button>
            </>
          )}

          {buoc === 'nhatKy' && (
            <button type="button" className="nut nut--chinh nut--rong" onClick={veDanhSach}>
              Về danh sách
            </button>
          )}
        </aside>
      </div>

      {/* 6.3.15 / 6.3.23 */}
      <HopThoai
        mo={!!loi}
        kieu="loi"
        onDong={() => setLoi(null)}
        nut={
          <>
            <button
              type="button"
              className="nut"
              onClick={() => {
                setLoi(null)
                setBuoc('huyBo')
              }}
            >
              Hủy bỏ
            </button>
            <button type="button" className="nut nut--chinh" onClick={() => setLoi(null)}>
              {buoc === 'xacNhan' ? 'Quay lại xác nhận' : 'Đóng'}
            </button>
          </>
        }
      >
        <p className="thong-bao thong-bao--do">{loi}</p>
      </HopThoai>
    </>
  )
}
