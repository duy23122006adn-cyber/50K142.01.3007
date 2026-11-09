import type { ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import type { VaiTro } from './api/client'
import { useXacThuc } from './auth/AuthContext'
import { DANH_SACH_CHUC_NANG } from './auth/chucNang'
import { BoCuc } from './components/BoCuc'
import { ChuaTrienKhai, KhongCoQuyen } from './pages/ChuaTrienKhai'
import { DangNhap } from './pages/DangNhap'
import { DoiMatKhau } from './pages/DoiMatKhau'
import { TaiKhoanCaNhan } from './pages/TaiKhoanCaNhan'
import { TrangChu } from './pages/TrangChu'

/** Chặn trang khi chưa đăng nhập (UC_11 BR02) hoặc sai vai trò. */
function YeuCauDangNhap({ children, vaiTro }: { children: ReactNode; vaiTro?: VaiTro[] }) {
  const { nguoiDung, dangKhoiPhuc } = useXacThuc()
  const location = useLocation()
  if (dangKhoiPhuc) return <p className="dang-tai">Đang tải…</p>
  if (!nguoiDung) return <Navigate to="/dang-nhap" replace state={{ tu: location.pathname }} />
  if (vaiTro && !vaiTro.includes(nguoiDung.vaiTro)) return <KhongCoQuyen />
  return <>{children}</>
}

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
        {DANH_SACH_CHUC_NANG.map((c) => (
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
