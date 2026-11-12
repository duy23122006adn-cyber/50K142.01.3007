import type { ReactNode } from 'react'
import { KhungQr } from './KhungQr'

/**
 * Màn hình "Chuyển khoản QR" dùng chung cho bán hàng (6.5) và thu thêm chênh lệch đổi hàng (6.2):
 * mẫu một cột như cũ (tiêu đề, mã QR, số tiền, xác nhận ngân hàng), khung kéo rộng hết bề ngang và căn giữa.
 */
export function ManChuyenKhoan({
  moTa,
  soTien,
  dangXuLy,
  onKetQua,
  onDoiHinhThuc,
}: {
  moTa?: ReactNode
  soTien: number
  dangXuLy: boolean
  onKetQua: (thanhCong: boolean, maThamChieu?: string) => void
  onDoiHinhThuc: () => void
}) {
  return (
    <section className="the the--rong man-qr">
      <h2>Chuyển khoản QR</h2>
      {moTa && <p className="ghi-chu">{moTa}</p>}
      <KhungQr soTien={soTien} dangXuLy={dangXuLy} onKetQua={onKetQua} />
      <button type="button" className="nut nut--chu" onClick={onDoiHinhThuc}>
        Đổi hình thức thanh toán
      </button>
    </section>
  )
}
