import { goiApi } from './client'
import type { ThongBao } from './xacThuc'

export interface KetQuaTrang<T> {
  danhSach: T[]
  tongSo: number
  trang: number
  soDongMoiTrang: number
  soTrang: number
}

const q = (thamSo: Record<string, string | number | boolean | undefined>) => {
  const s = new URLSearchParams()
  for (const [k, v] of Object.entries(thamSo)) if (v !== undefined && v !== '') s.set(k, String(v))
  const chuoi = s.toString()
  return chuoi ? `?${chuoi}` : ''
}

export type CheDoXoa = 'XoaHan' | 'NgungHoatDong' | 'NgungKinhDoanh'

// ------------------------------------------------------------------ Nhân viên (UC_2.1, 2.2, 2.4)

export interface NhanVienDong {
  maND: string
  hoTen: string
  sdt: string
  trangThai: string
}

export interface LichSuSuaDong {
  maCQ: string
  hoTenCQ: string
  vaiTro: string
  thoiDiemSua: string
  noiDungTruoc: string
  noiDungSau: string
}

export interface ChiTietNhanVien {
  maND: string
  tenDangNhap: string
  hoTen: string
  ngaySinh: string
  sdt: string
  email: string
  trangThai: string
  lichSu: LichSuSuaDong[]
}

export interface FormNhanVien {
  hoTen: string
  ngaySinh: string
  sdt: string
  email: string
  tenDangNhap?: string
  matKhau?: string
}

export const nhanVienApi = {
  danhSach: (tuKhoa?: string) => goiApi<NhanVienDong[]>(`/nhan-vien${q({ tuKhoa })}`),
  chiTiet: (ma: string) => goiApi<ChiTietNhanVien>(`/nhan-vien/${encodeURIComponent(ma)}`),
  them: (f: FormNhanVien) => goiApi<ThongBao>('/nhan-vien', { method: 'POST', body: f }),
  sua: (ma: string, f: FormNhanVien) => goiApi<ThongBao>(`/nhan-vien/${encodeURIComponent(ma)}`, { method: 'PUT', body: f }),
  kiemTraXoa: (ma: string) =>
    goiApi<{ maND: string; hoTen: string; cheDo: CheDoXoa }>(`/nhan-vien/${encodeURIComponent(ma)}/kiem-tra-xoa`),
  xoa: (ma: string, cheDo: CheDoXoa) =>
    goiApi<ThongBao>(`/nhan-vien/${encodeURIComponent(ma)}/xoa`, { method: 'POST', body: { cheDo } }),
}

// ------------------------------------------------------------------ Hàng hóa (UC_4.1–4.4)

export interface DanhMuc {
  maDM: string
  tenDM: string
}

export interface HangHoaDong {
  maHH: string
  tenHH: string
  donViTinh: string
  trangThai: string
}

export interface ChiTietHangHoa {
  maHH: string
  tenHH: string
  maVach: string | null
  maDM: string
  tenDM: string
  donViTinh: string
  giaNhap: number
  giaBan: number
  nguongCanhBaoHetHang: number | null
  nguongCanhBaoHetHan: number | null
  trangThai: string
  tongTon: number
}

export interface FormHangHoa {
  tenHH: string
  maVach: string
  maDM: string
  donViTinh: string
  giaNhap: string
  giaBan: string
  nguongCanhBaoHetHang: string
  nguongCanhBaoHetHan: string
}

export const hangHoaApi = {
  danhMuc: () => goiApi<DanhMuc[]>('/hang-hoa/danh-muc'),
  donViTinh: () => goiApi<string[]>('/hang-hoa/don-vi-tinh'),
  maDuKien: () => goiApi<{ ma: string }>('/hang-hoa/ma-du-kien'),
  timKiem: (tuKhoa: string, trang: number) => goiApi<KetQuaTrang<HangHoaDong>>(`/hang-hoa${q({ tuKhoa, trang })}`),
  goiY: (tuKhoa: string) => goiApi<HangHoaDong[]>(`/hang-hoa/goi-y${q({ tuKhoa })}`),
  chiTiet: (ma: string) => goiApi<ChiTietHangHoa>(`/hang-hoa/${encodeURIComponent(ma)}`),
  them: (f: FormHangHoa) => goiApi<{ ma: string }>('/hang-hoa', { method: 'POST', body: f }),
  sua: (ma: string, f: FormHangHoa) => goiApi<ThongBao>(`/hang-hoa/${encodeURIComponent(ma)}`, { method: 'PUT', body: f }),
  kiemTraXoa: (ma: string) =>
    goiApi<{ maHH: string; tenHH: string; cheDo: CheDoXoa }>(`/hang-hoa/${encodeURIComponent(ma)}/kiem-tra-xoa`),
  xoa: (ma: string, cheDo: CheDoXoa) =>
    goiApi<ThongBao>(`/hang-hoa/${encodeURIComponent(ma)}/xoa`, { method: 'POST', body: { cheDo } }),
}

// ------------------------------------------------------------------ Tồn kho, lô hàng (UC_3.x, UC_10.1)

export interface LoTonKho {
  maLo: string
  maHH: string
  tenHH: string
  donViTinh: string
  soLuongTon: number
  hanSuDung: string
}

export interface CanhBaoDong {
  maCB: number
  maLo: string
  tenHH: string
  donViTinh: string
  soLuongTon: number
  hanSuDung: string
  soNgayConLai: number
  loaiCanhBao: string
  trangThai: string
}

export interface LoDieuChinh extends LoTonKho {
  khoaHanSuDung: boolean
  khoaToanBo: boolean
}

export interface LoHangDong {
  maLo: string
  tenHH: string
  soLuongTon: number
  hanSuDung: string
}

export const tonKhoApi = {
  timKiem: (tuKhoa: string, trang: number) => goiApi<KetQuaTrang<LoTonKho>>(`/ton-kho${q({ tuKhoa, trang })}`),
  canhBao: (loai: string, caDaXuLy: boolean) =>
    goiApi<{ danhSach: CanhBaoDong[]; soLuongTheoLoai: Record<string, number> }>(
      `/ton-kho/canh-bao${q({ loai, caDaXuLy: caDaXuLy || undefined })}`,
    ),
  layLo: (maLo: string) => goiApi<LoDieuChinh>(`/ton-kho/lo/${encodeURIComponent(maLo)}`),
  dieuChinh: (maLo: string, f: { soLuongThucTe: string; hanSuDung: string; lyDo: string }) =>
    goiApi<ThongBao>(`/ton-kho/lo/${encodeURIComponent(maLo)}/dieu-chinh`, { method: 'POST', body: f }),
}

export const loHangApi = {
  danhSach: (trang: number) => goiApi<KetQuaTrang<LoHangDong>>(`/lo-hang${q({ trang })}`),
  maDuKien: () => goiApi<{ ma: string }>('/lo-hang/ma-du-kien'),
  them: (f: { tenHangHoa: string; soLuong: string; hanSuDung: string }) =>
    goiApi<{ ma: string }>('/lo-hang', { method: 'POST', body: f }),
}

// ------------------------------------------------------------------ Ca làm việc (Q10)

export interface CaHienTai {
  maCa: string
  ngayLamViec: string
  gioBatDau: string
  trangThai: string
  maND: string
  hoTenPhuTrach: string
}

export const caApi = {
  hienTai: () => goiApi<CaHienTai | null>('/ca/hien-tai'),
}

// ------------------------------------------------------------------ Khách hàng (UC_8.1–8.3)

export interface KhachHangDong {
  maKH: string
  hoTen: string
  sdt: string
}

export interface ChiTietKhachHang extends KhachHangDong {
  matHangThuongMua: { maHH: string; tenHH: string; donViTinh: string; soLuongDaMua: number }[]
}

export const khachHangApi = {
  timKiem: (tuKhoa: string, trang = 1) => goiApi<KetQuaTrang<KhachHangDong>>(`/khach-hang${q({ tuKhoa, trang })}`),
  chiTiet: (ma: string) => goiApi<ChiTietKhachHang>(`/khach-hang/${encodeURIComponent(ma)}`),
  them: (f: { hoTen: string; sdt: string }) => goiApi<KhachHangDong>('/khach-hang', { method: 'POST', body: f }),
  sua: (ma: string, f: { hoTen: string; sdt: string }) =>
    goiApi<ThongBao>(`/khach-hang/${encodeURIComponent(ma)}`, { method: 'PUT', body: f }),
}

// ------------------------------------------------------------------ Bán hàng (UC_6.5), lịch sử (UC_6.1)

export interface SanPhamBan {
  maHH: string
  tenHH: string
  maVach: string | null
  donViTinh: string
  giaBan: number
  tonBanDuoc: number
  maDM: string
  tenDM: string
}

export interface DongGioHang {
  maHH: string
  soLuong: number
}

export interface DongHoaDon {
  maHH: string
  tenHH: string
  donViTinh: string
  soLuong: number
  donGia: number
  thanhTien: number
}

export interface ChiTietHoaDon {
  maHD: string
  tenCuaHang: string
  ngayGioLap: string
  maNguoiBan: string
  nguoiBan: string
  maKH: string | null
  tenKhach: string | null
  sdtKhach: string | null
  loaiHoaDon: string
  trangThai: string
  dong: DongHoaDon[]
  tongTienHang: number
  tongTienThanhToan: number
  soTienDaTra: number
  phuongThuc: string
  soTienConNo: number
  hanThanhToan: string | null
}

export interface HoaDonDong {
  maHD: string
  ngayGioLap: string
  tenKhach: string | null
  tongTien: number
  trangThai: string
}

export interface DieuKienTimHoaDon {
  ma?: string
  khach?: string
  tuNgay?: string
  denNgay?: string
  trangThai?: string
}

export const banHangApi = {
  sanPham: (tuKhoa: string) => goiApi<SanPhamBan[]>(`/ban-hang/san-pham${q({ tuKhoa })}`),
  thanhToan: (yc: {
    maKH: string | null
    dong: DongGioHang[]
    phuongThuc: 'Tiền mặt' | 'Chuyển khoản QR'
    tienKhachDua?: string
    ketQuaQrGiaLap?: 'ThanhCong' | 'ThatBai'
  }) => goiApi<{ maPTT: string; soTien: number; tienTraLai: number; phuongThuc: string }>('/ban-hang/thanh-toan', { method: 'POST', body: yc }),
  taoHoaDon: (yc: { maPTT: string; maKH: string | null; dong: DongGioHang[] }) =>
    goiApi<ChiTietHoaDon>('/ban-hang/hoa-don', { method: 'POST', body: yc }),
  kiemTraGhiNo: (yc: { maKH: string; dong: DongGioHang[] }) =>
    goiApi<KiemTraGhiNo>('/ban-hang/kiem-tra-ghi-no', { method: 'POST', body: yc }),
  taoHoaDonNo: (yc: { maKH: string; dong: DongGioHang[] }) =>
    goiApi<ChiTietHoaDon>('/ban-hang/hoa-don-no', { method: 'POST', body: yc }),
  guiHoaDon: (yc: { maHD: string; kenh: 'SMS' | 'Zalo'; sdt: string }) =>
    goiApi<ThongBao>('/ban-hang/gui-hoa-don', { method: 'POST', body: yc }),
}

export const hoaDonApi = {
  timKiem: (dk: DieuKienTimHoaDon, trang: number, tatCa: boolean) =>
    goiApi<KetQuaTrang<HoaDonDong>>(`/hoa-don${q({ ...dk, trang, tatCa: tatCa || undefined })}`),
  chiTiet: (ma: string) => goiApi<ChiTietHoaDon>(`/hoa-don/chi-tiet${q({ ma })}`),
}

// ------------------------------------------------------------------ Công nợ, khách quen (UC_7.1–7.6)

export interface KiemTraGhiNo {
  maKH: string
  tenKhach: string
  sdt: string
  noTruoc: number
  donHienTai: number
  tongNoSauDon: number
  hanMuc: number
  ngayNoCuNhat: string | null
  hanThanhToan: string
}

export interface KhachQuenDong {
  maKH: string
  hoTen: string
  sdt: string
  trangThaiNo: string
  duNo: number
}

export interface HoaDonNoDong {
  maHD: string
  ngayGioLap: string
  soTien: number
  hanThanhToan: string
  trangThaiNo: string
}

export interface ChiTietKhachQuen {
  maKH: string
  hoTen: string
  sdt: string
  cccd: string
  diaChi: string
  trangThaiNo: string
  duNo: number
  hanThanhToanCuNhat: string | null
  quyenMuaNo: boolean
  hoaDonChuaTra: HoaDonNoDong[]
}

export interface FormKhachQuen {
  hoTen: string
  sdt: string
  cccd: string
  diaChi: string
}

export interface PhieuThuNo {
  maPTT: string
  tenCuaHang: string
  ngayGio: string
  maKH: string
  tenKhach: string
  sdt: string
  maNguoiThu: string
  nguoiThu: string
  phuongThuc: string
  hoaDon: HoaDonNoDong[]
  tongTien: number
  duNoConLai: number
  tienTraLai: number
}

export const congNoApi = {
  timKhachQuen: (tuKhoa: string, trangThai: string) =>
    goiApi<KhachQuenDong[]>(`/cong-no/khach-quen${q({ tuKhoa, trangThai })}`),
  chiTiet: (ma: string) => goiApi<ChiTietKhachQuen>(`/cong-no/khach-quen/${encodeURIComponent(ma)}`),
  them: (f: FormKhachQuen) => goiApi<{ ma: string }>('/cong-no/khach-quen', { method: 'POST', body: f }),
  sua: (ma: string, f: FormKhachQuen) =>
    goiApi<ThongBao>(`/cong-no/khach-quen/${encodeURIComponent(ma)}`, { method: 'PUT', body: f }),
  xoa: (ma: string) => goiApi<ThongBao>(`/cong-no/khach-quen/${encodeURIComponent(ma)}/xoa`, { method: 'POST' }),
  khachCoNo: (tuKhoa: string) => goiApi<KhachQuenDong[]>(`/cong-no/khach-co-no${q({ tuKhoa })}`),
  hoaDonChuaTra: (ma: string) => goiApi<HoaDonNoDong[]>(`/cong-no/khach-quen/${encodeURIComponent(ma)}/hoa-don-chua-tra`),
  thuNo: (yc: {
    maKH: string
    maHoaDon: string[]
    phuongThuc: 'Tiền mặt' | 'Chuyển khoản QR'
    tienKhachDua?: string
    ketQuaQrGiaLap?: 'ThanhCong' | 'ThatBai'
  }) => goiApi<PhieuThuNo>('/cong-no/thu-no', { method: 'POST', body: yc }),
  phieu: (ma: string) => goiApi<PhieuThuNo>(`/cong-no/phieu${q({ ma })}`),
  guiPhieu: (yc: { maPTT: string; kenh: 'SMS' | 'Zalo'; sdt: string }) =>
    goiApi<ThongBao>('/cong-no/gui-phieu', { method: 'POST', body: yc }),
}
