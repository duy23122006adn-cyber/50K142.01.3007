/**
 * Gọi API backend (/api/...). Access token giữ trong bộ nhớ; refresh token nằm trong
 * cookie HttpOnly do server đặt, JavaScript không đọc được.
 */

export const LOI_HE_THONG = 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.'

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
}

export interface PhanHoiDangNhap {
  accessToken: string
  hetHan: string
  nguoiDung: NguoiDung
}

let accessToken: string | null = null
let khiLamMoi: ((kq: PhanHoiDangNhap | null) => void) | null = null
let dangLamMoi: Promise<PhanHoiDangNhap | null> | null = null

export function datAccessToken(token: string | null) {
  accessToken = token
}

/** AuthContext đăng ký để cập nhật người dùng khi token được làm mới hoặc phiên hết hạn. */
export function dangKyKhiLamMoi(fn: (kq: PhanHoiDangNhap | null) => void) {
  khiLamMoi = fn
}

/** Làm mới access token bằng cookie. Gộp các lần gọi đồng thời thành một request. */
export function lamMoiToken(): Promise<PhanHoiDangNhap | null> {
  dangLamMoi ??= (async () => {
    try {
      const res = await fetch('/api/auth/lam-moi', { method: 'POST', credentials: 'same-origin' })
      const kq = res.ok ? ((await res.json()) as PhanHoiDangNhap) : null
      datAccessToken(kq?.accessToken ?? null)
      khiLamMoi?.(kq)
      return kq
    } catch {
      datAccessToken(null)
      khiLamMoi?.(null)
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
    throw new LoiApi(0, 'Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại.')
  }

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
