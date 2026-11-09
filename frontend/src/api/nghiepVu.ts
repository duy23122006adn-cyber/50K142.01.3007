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
