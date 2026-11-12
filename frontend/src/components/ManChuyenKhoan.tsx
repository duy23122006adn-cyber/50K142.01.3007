import type { ReactNode } from 'react'
import { KhungQr } from './KhungQr'

/**
 * Màn hình "Chuyển khoản QR" dùng chung cho bán hàng (6.5) và thu thêm chênh lệch đổi hàng (6.2):
 * khung rộng, mã QR bên trái, thông tin + xác nhận bên phải, nút quay lại chọn hình thức thanh toán.
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
    <section className="the the--vua man-qr">
      <div className="man-qr__dau">
        <h2>Chuyển khoản QR</h2>
        {moTa && <p className="ghi-chu">{moTa}</p>}
      </div>
      <KhungQr soTien={soTien} dangXuLy={dangXuLy} onKetQua={onKetQua} />
      <div className="man-qr__chan">
        <button type="button" className="nut nut--chu" onClick={onDoiHinhThuc}>
          Đổi hình thức thanh toán
        </button>
      </div>
    </section>
  )
}
