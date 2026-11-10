import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { layTrangThaiDoiMatKhau } from '../api/xacThuc'
import { useXacThuc } from '../auth/AuthContext'
import { TEN_VAI_TRO } from '../auth/chucNang'

/** Màn hình "Tài khoản cá nhân" (đặc tả 2.4.9, 2.4.10). */
export function TaiKhoanCaNhan() {
  const { nguoiDung } = useXacThuc()
  const navigate = useNavigate()
  const { data } = useQuery({ queryKey: ['doi-mat-khau', 'trang-thai'], queryFn: layTrangThaiDoiMatKhau })
  if (!nguoiDung) return null

  return (
    <>
      <h1>Tài khoản cá nhân</h1>
      <section className="the">
        <h2>Tài khoản của bạn</h2>
        <dl className="thong-tin">
          <dt>Mã người dùng</dt>
          <dd>{nguoiDung.maND}</dd>
          <dt>Họ tên</dt>
          <dd>{nguoiDung.hoTen}</dd>
          <dt>Tên đăng nhập</dt>
          <dd>{nguoiDung.tenDangNhap}</dd>
          <dt>Vai trò</dt>
          <dd>{TEN_VAI_TRO[nguoiDung.vaiTro]}</dd>
        </dl>
        <button
          type="button"
          className="nut nut--chinh"
          disabled={data?.biKhoa}
          onClick={() => navigate('/tai-khoan/doi-mat-khau')}
        >
          Đổi mật khẩu
        </button>
        {data?.biKhoa && <p className="thong-bao thong-bao--do">Chức năng đổi mật khẩu đang bị khóa trong 15 phút.</p>}
      </section>
      {nguoiDung.vaiTro === 'ChuQuan' && (
        <section className="the">
          <h2>Dữ liệu cửa hàng</h2>
          <button type="button" className="nut" onClick={() => navigate('/tai-khoan/sao-luu')}>
            Sao lưu dữ liệu
          </button>
        </section>
      )}
    </>
  )
}
