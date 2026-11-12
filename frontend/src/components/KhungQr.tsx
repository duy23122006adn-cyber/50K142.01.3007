import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { goiApi } from '../api/client'
import { tien } from '../lib/dinhDang'
import { GiaLapNganHang, MaQrGiaLap } from './MaQrGiaLap'

interface ThongTinQr {
  cheDo: 'GiaLap' | 'VietQR'
  maThamChieu: string
  soTien: number
  urlAnh: string | null
  nganHang: string | null
  soTaiKhoan: string | null
  tenTaiKhoan: string | null
}

/**
 * Khung chuyển khoản QR dùng chung (bán hàng, thu nợ, thu thêm khi đổi hàng) – Giai đoạn 8d.
 * - Giả lập (mặc định): mã QR minh họa + nút chọn kết quả ngân hàng (Q5).
 * - VietQR: ảnh QR thật của tài khoản cửa hàng; tự hỏi máy chủ mỗi 3 giây (và ngay khi có sự kiện "ngan-hang"),
 *   tiền vào khớp mã tham chiếu thì gọi onKetQua(true, mã) – máy chủ đối chiếu lại khi tạo phiếu thu.
 * Bố cục hai cột: trái là mã QR + số tiền, phải là thông tin chuyển khoản + xác nhận;
 * khung hẹp (thu nợ, điện thoại) tự xếp thành một cột.
 */
export function KhungQr({
  soTien,
  dangXuLy,
  onKetQua,
}: {
  soTien: number
  dangXuLy: boolean
  onKetQua: (thanhCong: boolean, maThamChieu?: string) => void
}) {
  const { data: qr, error } = useQuery({
    queryKey: ['qr', 'tao', soTien],
    queryFn: () => goiApi<ThongTinQr>('/tich-hop/qr', { method: 'POST', body: { soTien } }),
    staleTime: Infinity,
    gcTime: 0,
  })
  const that = qr?.cheDo === 'VietQR'
  const { data: trangThai, refetch } = useQuery({
    queryKey: ['qr', 'trang-thai', qr?.maThamChieu],
    queryFn: () => goiApi<{ daNhan: boolean }>(`/tich-hop/qr/trang-thai?ma=${qr!.maThamChieu}&soTien=${soTien}`),
    enabled: that,
    refetchInterval: (q) => (q.state.data?.daNhan ? false : 3000),
  })
  const daBao = useRef(false)

  useEffect(() => {
    if (that && trangThai?.daNhan && !daBao.current && !dangXuLy) {
      daBao.current = true
      onKetQua(true, qr!.maThamChieu)
    }
  }, [that, trangThai, dangXuLy, onKetQua, qr])

  if (error) return <p className="thong-bao thong-bao--do">{(error as Error).message}</p>
  if (!qr) return <p className="ghi-chu">Đang tạo mã QR…</p>

  return (
    <div className="khung-qr">
      <div className="khung-qr__trai">
        {that ? (
          <img className="anh-qr" src={qr.urlAnh!} alt={`Mã VietQR chuyển ${tien(soTien)} vào tài khoản ${qr.soTaiKhoan}`} />
        ) : (
          <MaQrGiaLap soTien={soTien} />
        )}
        <p className="ghi-chu">Khách quét mã bằng ứng dụng ngân hàng</p>
      </div>

      <div className="khung-qr__phai">
        <dl className="thong-tin">
          <dt>Số tiền</dt>
          <dd className="so-lon">{tien(soTien)}</dd>
          {that && (
            <>
              <dt>Ngân hàng</dt>
              <dd>{qr.nganHang}</dd>
              <dt>Số tài khoản</dt>
              <dd>{qr.soTaiKhoan}</dd>
              <dt>Chủ tài khoản</dt>
              <dd>{qr.tenTaiKhoan}</dd>
            </>
          )}
          <dt>Nội dung chuyển khoản</dt>
          <dd>
            <strong>{qr.maThamChieu}</strong>
          </dd>
        </dl>

        {that ? (
          <div className="khung-qr__cho">
            <p className="ghi-chu">{trangThai?.daNhan ? 'Đã nhận tiền, đang ghi nhận thanh toán…' : 'Đang chờ ngân hàng xác nhận…'}</p>
            <button type="button" className="nut nut--nho" disabled={dangXuLy} onClick={() => void refetch()}>
              Kiểm tra lại
            </button>
          </div>
        ) : (
          <GiaLapNganHang dangXuLy={dangXuLy} onKetQua={(ok) => onKetQua(ok, qr.maThamChieu)} />
        )}
      </div>
    </div>
  )
}
