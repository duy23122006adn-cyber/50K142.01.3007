import { useSyncExternalStore } from 'react'
import { goiApi, LoiApi, type NguoiDung } from '../api/client'
import type { SanPhamBan } from '../api/nghiepVu'
import { bayGioISO } from './dinhDang'

/**
 * Bán hàng offline (NFR Availability-02, 03 – Giai đoạn 8c). Lưu trên trình duyệt (localStorage) của máy bán:
 * - danh mục sản phẩm (giá, tồn) lấy lúc còn mạng;
 * - người đăng nhập gần nhất (để mở lại trang khi mất mạng vẫn bán được);
 * - hóa đơn tạm chưa đồng bộ. Khi có mạng, gửi từng hóa đơn tạm lên /api/ban-hang/hoa-don-tam.
 */
const KHOA_SAN_PHAM = 'xn_offline_san_pham'
const KHOA_NGUOI_DUNG = 'xn_offline_nguoi_dung'
const KHOA_HOA_DON_TAM = 'xn_hoa_don_tam'

function doc<T>(khoa: string): T | null {
  try {
    const s = localStorage.getItem(khoa)
    return s ? (JSON.parse(s) as T) : null
  } catch {
    return null
  }
}

function ghi(khoa: string, giaTri: unknown) {
  try {
    localStorage.setItem(khoa, JSON.stringify(giaTri))
  } catch {
    // Bộ nhớ trình duyệt đầy hoặc bị chặn – bỏ qua.
  }
}

// ------------------------------------------------------------------ Danh mục sản phẩm

export function luuSanPham(ds: SanPhamBan[]) {
  ghi(KHOA_SAN_PHAM, { luc: bayGioISO(), ds })
}

export const sanPhamDaLuu = () => doc<{ luc: string; ds: SanPhamBan[] }>(KHOA_SAN_PHAM)

/** Danh sách sản phẩm khi offline: lọc như API, tồn = tồn đã lưu − hàng trên các hóa đơn tạm chưa đồng bộ. */
export function sanPhamOffline(tuKhoa: string): SanPhamBan[] {
  const ds = sanPhamDaLuu()?.ds ?? []
  const k = tuKhoa.trim().toLowerCase()
  const daBan = new Map<string, number>()
  for (const t of danhSachTam().filter((t) => t.trangThai === 'Chờ đồng bộ'))
    for (const d of t.dong) daBan.set(d.maHH, (daBan.get(d.maHH) ?? 0) + d.soLuong)
  return ds
    .filter((p) => !k || p.tenHH.toLowerCase().includes(k) || p.maVach === tuKhoa.trim() || p.maHH === tuKhoa.trim())
    .map((p) => ({ ...p, tonBanDuoc: Math.max(0, p.tonBanDuoc - (daBan.get(p.maHH) ?? 0)) }))
}

// ------------------------------------------------------------------ Người dùng đã đăng nhập trên máy

export const luuNguoiDung = (nd: NguoiDung) => ghi(KHOA_NGUOI_DUNG, { ...nd, ngoaiTuyen: undefined })
export const nguoiDungDaLuu = () => doc<NguoiDung>(KHOA_NGUOI_DUNG)
export function xoaNguoiDungDaLuu() {
  try {
    localStorage.removeItem(KHOA_NGUOI_DUNG)
  } catch {
    // bỏ qua
  }
}

// ------------------------------------------------------------------ Hóa đơn tạm

export type TrangThaiTam = 'Chờ đồng bộ' | 'Đã ghi nhận' | 'Chờ Chủ quán xử lý' | 'Đã hủy' | 'Lỗi'

export interface DongTam {
  maHH: string
  tenHH: string
  donViTinh: string
  soLuong: number
  donGia: number
}

export interface HoaDonTamCuc {
  maTam: string
  ngayGioBan: string
  maND: string
  hoTen: string
  maKH: string | null
  tenKhach: string | null
  dong: DongTam[]
  tongTien: number
  tienKhachDua: number
  trangThai: TrangThaiTam
  maHD?: string | null
  lyDo?: string | null
  /** Lỗi lần đồng bộ gần nhất (vẫn sẽ thử lại). */
  loi?: string | null
  luc?: string
}

let phienBan = 0
const nguoiNghe = new Set<() => void>()
const baoThayDoi = () => {
  phienBan++
  nguoiNghe.forEach((f) => f())
}
if (typeof window !== 'undefined')
  window.addEventListener('storage', (e) => {
    if (e.key === KHOA_HOA_DON_TAM) baoThayDoi() // tab khác trên cùng máy
  })

export const danhSachTam = (): HoaDonTamCuc[] => doc<HoaDonTamCuc[]>(KHOA_HOA_DON_TAM) ?? []

function luuDanhSach(ds: HoaDonTamCuc[]) {
  ghi(KHOA_HOA_DON_TAM, ds)
  baoThayDoi()
}

const capNhat = (maTam: string, thayDoi: Partial<HoaDonTamCuc>) =>
  luuDanhSach(danhSachTam().map((t) => (t.maTam === maTam ? { ...t, ...thayDoi } : t)))

export const soChoDongBo = () => danhSachTam().filter((t) => t.trangThai === 'Chờ đồng bộ').length

/** Danh sách hóa đơn tạm trên máy, tự cập nhật khi thay đổi. */
export function useHoaDonTam(): HoaDonTamCuc[] {
  useSyncExternalStore(
    (f) => {
      nguoiNghe.add(f)
      return () => nguoiNghe.delete(f)
    },
    () => phienBan,
  )
  return danhSachTam()
}

/** "TAM-yyMMdd-XXXXXX" – 6 ký tự ngẫu nhiên, đủ để không trùng giữa các máy. */
function taoMaTam(): string {
  const chu = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const ngau = Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => chu[b % chu.length]).join('')
  const n = bayGioISO()
  return `TAM-${n.slice(2, 4)}${n.slice(5, 7)}${n.slice(8, 10)}-${ngau}`
}

export function taoHoaDonTam(du: Omit<HoaDonTamCuc, 'maTam' | 'ngayGioBan' | 'trangThai' | 'tongTien'>): HoaDonTamCuc {
  const tam: HoaDonTamCuc = {
    ...du,
    maTam: taoMaTam(),
    ngayGioBan: bayGioISO(),
    trangThai: 'Chờ đồng bộ',
    tongTien: du.dong.reduce((s, d) => s + d.soLuong * d.donGia, 0),
  }
  luuDanhSach([tam, ...danhSachTam()])
  return tam
}

export const xoaHoaDonTam = (maTam: string) => luuDanhSach(danhSachTam().filter((t) => t.maTam !== maTam))

interface KetQuaDongBo {
  maTam: string
  trangThai: string
  lyDo: string | null
  maHD: string | null
}

let dangDongBo: Promise<number> | null = null

/**
 * Gửi các hóa đơn tạm "Chờ đồng bộ" của người đang đăng nhập (Chủ quán gửi được cả của người khác).
 * Trả về số hóa đơn đã gửi thành công. Mất mạng giữa chừng thì dừng, lần sau gửi tiếp.
 */
export function dongBoHoaDonTam(nguoiDung: NguoiDung): Promise<number> {
  dangDongBo ??= (async () => {
    let soGui = 0
    try {
      const cho = danhSachTam().filter(
        (t) => t.trangThai === 'Chờ đồng bộ' && (t.maND === nguoiDung.maND || nguoiDung.vaiTro === 'ChuQuan'),
      )
      for (const t of cho.reverse()) {
        try {
          const kq = await goiApi<KetQuaDongBo>('/ban-hang/hoa-don-tam', {
            method: 'POST',
            body: {
              maTam: t.maTam, ngayGioBan: t.ngayGioBan, maND: t.maND, maKH: t.maKH, tienKhachDua: t.tienKhachDua,
              dong: t.dong.map((d) => ({ maHH: d.maHH, tenHH: d.tenHH, soLuong: d.soLuong, donGia: d.donGia })),
            },
          })
          capNhat(t.maTam, { trangThai: kq.trangThai as TrangThaiTam, maHD: kq.maHD, lyDo: kq.lyDo, loi: null, luc: bayGioISO() })
          soGui++
        } catch (e) {
          if (!(e instanceof LoiApi) || e.status === 0) break // mất mạng – thử lại sau
          // 409 (đang kết ca…), 403 (cần người bán đăng nhập): giữ lại, thử lại sau. Lỗi dữ liệu: đánh dấu để người dùng xem.
          const giuLai = e.status === 409 || e.status === 403 || e.status === 401 || e.status >= 500
          capNhat(t.maTam, giuLai ? { loi: e.message } : { trangThai: 'Lỗi', loi: e.message })
        }
      }
      // Dọn hóa đơn tạm đã xử lý xong hơn 3 ngày.
      const moc = new Date(Date.now() - 3 * 86_400_000).toISOString()
      const conLai = danhSachTam().filter((t) => t.trangThai === 'Chờ đồng bộ' || t.trangThai === 'Lỗi' || (t.luc ?? '9') > moc.slice(0, 19))
      if (conLai.length !== danhSachTam().length) luuDanhSach(conLai)
    } finally {
      dangDongBo = null
    }
    return soGui
  })()
  return dangDongBo
}
