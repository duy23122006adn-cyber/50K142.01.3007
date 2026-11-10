import type { ChiTietHoaDon } from '../api/nghiepVu'
import { ngay, ngayGio, so, tien } from '../lib/dinhDang'

const MAU_TRANG_THAI: Record<string, string> = {
  'Đã thanh toán': 'xanh',
  'Còn nợ': 'cam',
  'Đã hủy': 'do',
}

export function NhanTrangThaiHoaDon({ trangThai }: { trangThai: string }) {
  return <span className={`nhan nhan--${MAU_TRANG_THAI[trangThai] ?? 'xam'}`}>{trangThai}</span>
}

/** Nội dung hóa đơn – UC_6.1 BR04, UC_6.5 BR05. Dùng chung cho màn hình bán hàng và chi tiết hóa đơn. */
export function XemHoaDon({ hd }: { hd: ChiTietHoaDon }) {
  return (
    <article className="hoa-don-in">
      <header className="hoa-don-in__dau">
        <strong className="hoa-don-in__cua-hang">{hd.tenCuaHang}</strong>
        <span>HÓA ĐƠN BÁN HÀNG · {hd.maHD}</span>
      </header>
      <dl className="thong-tin">
        <dt>Ngày giờ lập</dt>
        <dd>{ngayGio(hd.ngayGioLap)}</dd>
        <dt>Người bán</dt>
        <dd>{hd.nguoiBan}</dd>
        <dt>Khách hàng</dt>
        <dd>{hd.tenKhach ?? 'Khách vãng lai'}</dd>
        <dt>Số điện thoại</dt>
        <dd>{hd.sdtKhach ?? '—'}</dd>
        <dt>Loại hóa đơn</dt>
        <dd>{hd.loaiHoaDon}</dd>
        {hd.hanThanhToan && (
          <>
            <dt>Hạn thanh toán</dt>
            <dd>{ngay(hd.hanThanhToan)}</dd>
          </>
        )}
        <dt>Trạng thái</dt>
        <dd>
          <NhanTrangThaiHoaDon trangThai={hd.trangThai} />
        </dd>
      </dl>
      <div className="bang-cuon">
        <table className="bang">
          <thead>
            <tr>
              <th>Tên hàng / ĐVT</th>
              <th className="so">SL</th>
              <th className="so">Đơn giá</th>
              <th className="so">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {hd.dong.map((d) => (
              <tr key={`${d.maHH}-${d.donGia}`}>
                <td>
                  {d.tenHH} · <span className="ghi-chu">{d.donViTinh}</span>
                </td>
                <td className="so">{so(d.soLuong)}</td>
                <td className="so">{tien(d.donGia)}</td>
                <td className="so">{tien(d.thanhTien)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="thong-tin thong-tin--tong">
        <dt>Tổng tiền hàng</dt>
        <dd>{tien(hd.tongTienHang)}</dd>
        <dt>Tổng tiền thanh toán</dt>
        <dd className="so-lon">{tien(hd.tongTienThanhToan)}</dd>
        <dt>Số tiền đã trả</dt>
        <dd>{tien(hd.soTienDaTra)}</dd>
        <dt>Phương thức thanh toán</dt>
        <dd>{hd.phuongThuc}</dd>
        {hd.trangThai === 'Còn nợ' && (
          <>
            <dt>Số tiền còn nợ</dt>
            <dd className="chu-do">{tien(hd.soTienConNo)}</dd>
          </>
        )}
      </dl>
    </article>
  )
}
