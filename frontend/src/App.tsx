import type { ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import type { VaiTro } from './api/client'
import { useXacThuc } from './auth/AuthContext'
import { DANH_SACH_CHUC_NANG } from './auth/chucNang'
import { BoCuc } from './components/BoCuc'
import { ChuaTrienKhai, KhongCoQuyen } from './pages/ChuaTrienKhai'
import { DangNhap } from './pages/DangNhap'
import { DoiMatKhau } from './pages/DoiMatKhau'
import { ChiTietHangHoa } from './pages/hangHoa/ChiTietHangHoa'
import { FormHangHoaTrang } from './pages/hangHoa/FormHangHoa'
import { TimKiemHangHoa } from './pages/hangHoa/TimKiemHangHoa'
import { DanhSachLoHang, ThemLoHang } from './pages/loHang/LoHang'
import { DanhSachNhanVien } from './pages/nhanVien/DanhSachNhanVien'
import { FormNhanVienTrang } from './pages/nhanVien/FormNhanVien'
import { TaiKhoanCaNhan } from './pages/TaiKhoanCaNhan'
import { CanhBaoTonKho } from './pages/tonKho/CanhBaoTonKho'
import { DieuChinhLo } from './pages/tonKho/DieuChinhLo'
import { TimKiemTonKho } from './pages/tonKho/TimKiemTonKho'
import { TrangChu } from './pages/TrangChu'

const CHU_QUAN: VaiTro[] = ['ChuQuan']

/** Chặn trang khi chưa đăng nhập (UC_11 BR02) hoặc sai vai trò. */
function YeuCauDangNhap({ children, vaiTro }: { children: ReactNode; vaiTro?: VaiTro[] }) {
  const { nguoiDung, dangKhoiPhuc } = useXacThuc()
  const location = useLocation()
  if (dangKhoiPhuc) return <p className="dang-tai">Đang tải…</p>
  if (!nguoiDung) return <Navigate to="/dang-nhap" replace state={{ tu: location.pathname }} />
  if (vaiTro && !vaiTro.includes(nguoiDung.vaiTro)) return <KhongCoQuyen />
  return <>{children}</>
}

const chiChuQuan = (trang: ReactNode) => <YeuCauDangNhap vaiTro={CHU_QUAN}>{trang}</YeuCauDangNhap>

export default function App() {
  return (
    <Routes>
      <Route path="/dang-nhap" element={<DangNhap />} />
      <Route
        element={
          <YeuCauDangNhap>
            <BoCuc />
          </YeuCauDangNhap>
        }
      >
        <Route index element={<TrangChu />} />
        <Route path="tai-khoan" element={<TaiKhoanCaNhan />} />
        <Route path="tai-khoan/doi-mat-khau" element={<DoiMatKhau />} />

        {/* Giai đoạn 2 – Quản lý tài khoản (UC_2.1, 2.2, 2.4) */}
        <Route path="quan-ly-tai-khoan" element={chiChuQuan(<DanhSachNhanVien />)} />
        <Route path="quan-ly-tai-khoan/them" element={chiChuQuan(<FormNhanVienTrang cheDo="them" />)} />
        <Route path="quan-ly-tai-khoan/:maND/sua" element={chiChuQuan(<FormNhanVienTrang cheDo="sua" />)} />

        {/* Quản lý tồn kho (UC_3.1 – cả hai vai trò; UC_3.2, 3.3 – Chủ quán) */}
        <Route path="quan-ly-ton-kho" element={<Navigate to="/quan-ly-ton-kho/tim-kiem" replace />} />
        <Route path="quan-ly-ton-kho/tim-kiem" element={<TimKiemTonKho />} />
        <Route path="quan-ly-ton-kho/canh-bao" element={chiChuQuan(<CanhBaoTonKho />)} />
        <Route path="quan-ly-ton-kho/dieu-chinh" element={chiChuQuan(<TimKiemTonKho cheDoDieuChinh />)} />
        <Route path="quan-ly-ton-kho/dieu-chinh/:maLo" element={chiChuQuan(<DieuChinhLo />)} />

        {/* Quản lý hàng hóa (UC_4.1–4.4) */}
        <Route path="quan-ly-hang-hoa" element={chiChuQuan(<TimKiemHangHoa />)} />
        <Route path="quan-ly-hang-hoa/them" element={chiChuQuan(<FormHangHoaTrang cheDo="them" />)} />
        <Route path="quan-ly-hang-hoa/:maHH" element={chiChuQuan(<ChiTietHangHoa />)} />
        <Route path="quan-ly-hang-hoa/:maHH/sua" element={chiChuQuan(<FormHangHoaTrang cheDo="sua" />)} />

        {/* Quản lý lô hàng (UC_10.1) */}
        <Route path="quan-ly-lo-hang" element={chiChuQuan(<DanhSachLoHang />)} />
        <Route path="quan-ly-lo-hang/them" element={chiChuQuan(<ThemLoHang />)} />

        {/* Chức năng thuộc giai đoạn sau */}
        {DANH_SACH_CHUC_NANG.filter((c) => !c.daTrienKhai).map((c) => (
          <Route
            key={c.duongDan}
            path={c.duongDan.slice(1)}
            element={
              <YeuCauDangNhap vaiTro={c.vaiTro}>
                <ChuaTrienKhai chucNang={c} />
              </YeuCauDangNhap>
            }
          />
        ))}
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
