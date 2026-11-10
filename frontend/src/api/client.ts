/**
 * Gọi API backend (/api/...). Access token giữ trong bộ nhớ; refresh token nằm trong
 * cookie HttpOnly do server đặt, JavaScript không đọc được.
 */

import { datCoMang } from '../lib/mang'

export const LOI_HE_THONG = 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.'
export const KHONG_KET_NOI = 'Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại.'

/** Lỗi trả về từ API: { thongBao, loi: { truong: thongBao }, ...duLieu }. */
export class LoiApi extends Error {
  readonly status: number
  readonly loi: Record<string, string>
  readonly duLieu: Record<string, unknown>

  constructor(status: number, thongBao: string, loi?: Record<string, string>, duLieu?: Record<string, unknown>) {
    super(thongBao)
    this.status = status
    this.loi = loi ?? {}
    this.duLieu = duLieu ?? {}
  }
}

export type VaiTro = 'ChuQuan' | 'NhanVien'

export interface NguoiDung {
  maND: string
  hoTen: string
  tenDangNhap: string
  vaiTro: VaiTro
  /** Giai đoạn 8c: phiên khôi phục từ máy khi mở trang lúc mất mạng – chưa xác thực với máy chủ, chỉ bán offline. */
  ngoaiTuyen?: boolean
}

export interface PhanHoiDangNhap {
  accessToken: string
  hetHan: string
  nguoiDung: NguoiDung
}

let accessToken: string | null = null
let khiLamMoi: ((kq: PhanHoiDangNhap | null, loiMang?: boolean) => void) | null = null
let dangLamMoi: Promise<PhanHoiDangNhap | null> | null = null

export function datAccessToken(token: string | null) {
  accessToken = token
}

/** Còn dưới 30 giây hoặc không đọc được hạn → coi như sắp hết hạn. */
function sapHetHan(token: string): boolean {
  try {
    const phan = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const { exp } = JSON.parse(atob(phan)) as { exp?: number }
    return !exp || exp * 1000 - Date.now() < 30_000
  } catch {
    return true
  }
}

/** Access token còn hiệu lực (tự làm mới nếu sắp hết hạn) – dùng cho kết nối thời gian thực. */
export async function tokenConHieuLuc(): Promise<string> {
  if (accessToken && !sapHetHan(accessToken)) return accessToken
  return (await lamMoiToken())?.accessToken ?? ''
}

/** AuthContext đăng ký để cập nhật người dùng khi token được làm mới hoặc phiên hết hạn. */
export function dangKyKhiLamMoi(fn: (kq: PhanHoiDangNhap | null, loiMang?: boolean) => void) {
  khiLamMoi = fn
}

/** Làm mới access token bằng cookie. Gộp các lần gọi đồng thời thành một request. */
export function lamMoiToken(): Promise<PhanHoiDangNhap | null> {
  dangLamMoi ??= (async () => {
    try {
      const res = await fetch('/api/auth/lam-moi', { method: 'POST', credentials: 'same-origin' })
      if (res.status >= 502 && res.status <= 504) throw new Error('Máy chủ không tới được')
      datCoMang(true)
      const kq = res.ok ? ((await res.json()) as PhanHoiDangNhap) : null
      datAccessToken(kq?.accessToken ?? null)
      khiLamMoi?.(kq)
      return kq
    } catch {
      // Lỗi mạng: không xóa phiên – AuthContext có thể dùng phiên offline đã lưu trên máy.
      datCoMang(false)
      khiLamMoi?.(null, true)
      return null
    } finally {
      dangLamMoi = null
    }
  })()
  return dangLamMoi
}

interface TuyChonGoi {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
}

export async function goiApi<T>(duongDan: string, { method = 'GET', body }: TuyChonGoi = {}, thuLai = true): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`

  let res: Response
  try {
    res = await fetch(`/api${duongDan}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'same-origin',
    })
  } catch {
    datCoMang(false)
    throw new LoiApi(0, KHONG_KET_NOI)
  }
  // Proxy / service worker trả 502–504 khi máy chủ không tới được → coi như mất mạng.
  if (res.status >= 502 && res.status <= 504) {
    datCoMang(false)
    throw new LoiApi(0, KHONG_KET_NOI)
  }
  datCoMang(true)

  // Access token hết hạn → làm mới một lần rồi gọi lại.
  if (res.status === 401 && thuLai && !duongDan.startsWith('/auth/')) {
    const kq = await lamMoiToken()
    if (kq) return goiApi<T>(duongDan, { method, body }, false)
  }

  const duLieu: unknown = res.status === 204 ? null : await res.json().catch(() => null)

  if (!res.ok) {
    const { thongBao, loi, ...conLai } = (duLieu ?? {}) as {
      thongBao?: string
      loi?: Record<string, string>
      [k: string]: unknown
    }
    throw new LoiApi(res.status, thongBao ?? LOI_HE_THONG, loi, conLai)
  }
  return duLieu as T
}
