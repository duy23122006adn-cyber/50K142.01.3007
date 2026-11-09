import { goiApi, type NguoiDung, type PhanHoiDangNhap } from './client'

export interface ThongBao {
  thongBao: string
}

export interface TrangThaiDoiMatKhau {
  biKhoa: boolean
  khoaDen: string | null
}

/** UC_1 Đăng nhập. */
export const dangNhap = (tenDangNhap: string, matKhau: string) =>
  goiApi<PhanHoiDangNhap>('/auth/dang-nhap', { method: 'POST', body: { tenDangNhap, matKhau } })

/** UC_1 5.c.3: nhập mã xác nhận để mở khóa tài khoản. */
export const moKhoa = (tenDangNhap: string, maOtp: string) =>
  goiApi<ThongBao>('/auth/mo-khoa', { method: 'POST', body: { tenDangNhap, maOtp } })

/** UC_11 Đăng xuất. */
export const dangXuat = () => goiApi<ThongBao>('/auth/dang-xuat', { method: 'POST' })

export const layThongTinToi = () => goiApi<NguoiDung>('/tai-khoan/toi')

export const layTrangThaiDoiMatKhau = () => goiApi<TrangThaiDoiMatKhau>('/tai-khoan/doi-mat-khau/trang-thai')

/** UC_2.3 Đổi mật khẩu. */
export const doiMatKhau = (matKhauHienTai: string, matKhauMoi: string, xacNhanMatKhauMoi: string) =>
  goiApi<ThongBao>('/tai-khoan/doi-mat-khau', {
    method: 'POST',
    body: { matKhauHienTai, matKhauMoi, xacNhanMatKhauMoi },
  })
