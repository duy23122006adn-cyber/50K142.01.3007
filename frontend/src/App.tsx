import type { ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import type { VaiTro } from './api/client'
import { useXacThuc } from './auth/AuthContext'
import { DANH_SACH_CHUC_NANG } from './auth/chucNang'
import { BoCuc } from './components/BoCuc'
import { BanHang } from './pages/banHang/BanHang'
import { DoiTraDanhSach, DoiTraHoaDon } from './pages/banHang/DoiTra'
import { HuyHoaDonChiTiet, HuyHoaDonDanhSach } from './pages/banHang/HuyHoaDon'
import { ChiTietHoaDonTrang, LichSuBanHang } from './pages/banHang/LichSuBanHang'
import { DuyetDoiTraChiTiet, DuyetDoiTraDanhSach, PhieuDoiTraTrang } from './pages/banHang/PhieuDoiTra'
import {
  BaoCaoDoanhThuTrang,
  BaoCaoLoiNhuanTrang,
  BaoCaoSoLuongBanTrang,
  BaoCaoTonKhoTrang,
  SoSanhTrang,
  TopSanPhamTrang,
} from './pages/baoCao/BaoCao'
import { ChiTietKhachQuenTrang, FormKhachQuenTrang, TimKiemKhachQuen } from './pages/congNo/CongNo'
import { ThuNo } from './pages/congNo/ThuNo'
import { ChiTietKhachHangTrang, DanhSachKhachHang, FormKhachHang } from './pages/khachHang/KhachHang'
import { ChuaTrienKhai, KhongCoQuyen } from './pages/ChuaTrienKhai'
import { ChiTietBienBan, DanhSachBienBan, LuuBienBan } from './pages/ketCa/KetCa'
import { DangNhap } from './pages/DangNhap'
import { DoiMatKhau } from './pages/DoiMatKhau'
import { ChiTietHangHoa } from './pages/hangHoa/ChiTietHangHoa'
import { FormHangHoaTrang } from './pages/hangHoa/FormHangHoa'
import { TimKiemHangHoa } from './pages/hangHoa/TimKiemHangHoa'
import { DanhSachLoHang, ThemLoHang } from './pages/loHang/LoHang'
import { DanhSachNhanVien } from './pages/nhanVien/DanhSachNhanVien'
import { FormNhanVienTrang } from './pages/nhanVien/FormNhanVien'
import { SaoLuu } from './pages/SaoLuu'
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
        <Route path="tai-khoan/sao-luu" element={chiChuQuan(<SaoLuu />)} />

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

        {/* Giai đoạn 3 – Bán hàng (UC_6.5, 6.1) và khách hàng (UC_8.1–8.3): cả hai vai trò */}
        <Route path="quan-ly-ban-hang" element={<Navigate to="/quan-ly-ban-hang/ban-hang" replace />} />
        <Route path="quan-ly-ban-hang/ban-hang" element={<BanHang />} />
        <Route path="quan-ly-ban-hang/lich-su" element={<LichSuBanHang />} />
        <Route path="quan-ly-ban-hang/hoa-don" element={<ChiTietHoaDonTrang />} />

        {/* Giai đoạn 5 – Đổi trả (UC_6.2: cả hai vai trò), hủy hóa đơn (UC_6.3) và duyệt phiếu (UC_6.4): Chủ quán */}
        <Route path="quan-ly-ban-hang/doi-tra" element={<DoiTraDanhSach />} />
        <Route path="quan-ly-ban-hang/doi-tra/hoa-don" element={<DoiTraHoaDon />} />
        <Route path="quan-ly-ban-hang/doi-tra/phieu" element={<PhieuDoiTraTrang />} />
        <Route path="quan-ly-ban-hang/huy-hoa-don" element={chiChuQuan(<HuyHoaDonDanhSach />)} />
        <Route path="quan-ly-ban-hang/huy-hoa-don/hoa-don" element={chiChuQuan(<HuyHoaDonChiTiet />)} />
        <Route path="quan-ly-ban-hang/duyet-doi-tra" element={chiChuQuan(<DuyetDoiTraDanhSach />)} />
        <Route path="quan-ly-ban-hang/duyet-doi-tra/phieu" element={chiChuQuan(<DuyetDoiTraChiTiet />)} />
        <Route path="quan-ly-khach-hang" element={<DanhSachKhachHang />} />
        <Route path="quan-ly-khach-hang/them" element={<FormKhachHang cheDo="them" />} />
        <Route path="quan-ly-khach-hang/:maKH" element={<ChiTietKhachHangTrang />} />
        <Route path="quan-ly-khach-hang/:maKH/sua" element={<FormKhachHang cheDo="sua" />} />

        {/* Giai đoạn 4 – Công nợ (UC_7.2, 7.3: cả hai vai trò; UC_7.4–7.6: Chủ quán) */}
        <Route path="quan-ly-cong-no" element={<Navigate to="/quan-ly-cong-no/tim-kiem" replace />} />
        <Route path="quan-ly-cong-no/tim-kiem" element={<TimKiemKhachQuen />} />
        <Route path="quan-ly-cong-no/thu-no" element={<ThuNo />} />
        <Route path="quan-ly-cong-no/them" element={chiChuQuan(<FormKhachQuenTrang cheDo="them" />)} />
        <Route path="quan-ly-cong-no/khach-quen" element={<Navigate to="/quan-ly-cong-no/tim-kiem" replace />} />
        <Route path="quan-ly-cong-no/khach-quen/:maKH" element={<ChiTietKhachQuenTrang />} />
        <Route path="quan-ly-cong-no/khach-quen/:maKH/sua" element={chiChuQuan(<FormKhachQuenTrang cheDo="sua" />)} />

        {/* Giai đoạn 6 – Kết ca (UC_9.1, 9.2): cả hai vai trò */}
        <Route path="ket-ca" element={<Navigate to="/ket-ca/luu-bien-ban" replace />} />
        <Route path="ket-ca/luu-bien-ban" element={<LuuBienBan />} />
        <Route path="ket-ca/bien-ban" element={<DanhSachBienBan />} />
        <Route path="ket-ca/bien-ban/chi-tiet" element={<ChiTietBienBan />} />

        {/* Giai đoạn 7 – Xem báo cáo và thống kê (UC_5.1–5.4): Chủ quán */}
        <Route path="bao-cao" element={<Navigate to="/bao-cao/loi-nhuan" replace />} />
        <Route path="bao-cao/loi-nhuan" element={chiChuQuan(<BaoCaoLoiNhuanTrang />)} />
        <Route path="bao-cao/so-sanh-loi-nhuan" element={chiChuQuan(<SoSanhTrang key="loi-nhuan" chiTieu="loi-nhuan" />)} />
        <Route path="bao-cao/doanh-thu" element={chiChuQuan(<BaoCaoDoanhThuTrang />)} />
        <Route path="bao-cao/so-sanh-doanh-thu" element={chiChuQuan(<SoSanhTrang key="doanh-thu" chiTieu="doanh-thu" />)} />
        <Route path="bao-cao/so-luong-ban-ra" element={chiChuQuan(<BaoCaoSoLuongBanTrang />)} />
        <Route path="bao-cao/top-ban-chay" element={chiChuQuan(<TopSanPhamTrang key="chay" loai="chay" />)} />
        <Route path="bao-cao/top-ban-cham" element={chiChuQuan(<TopSanPhamTrang key="cham" loai="cham" />)} />
        <Route path="bao-cao/ton-kho" element={chiChuQuan(<BaoCaoTonKhoTrang />)} />

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
