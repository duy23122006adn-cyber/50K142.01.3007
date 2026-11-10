import type { FieldValues, Path, UseFormReturn } from 'react-hook-form'
import { LoiApi } from '../api/client'

/** "2026-11-10" hoặc "2026-11-10T08:30:00" → "10/11/2026". */
export function ngay(giaTri: string | null | undefined): string {
  if (!giaTri) return ''
  const [y, m, d] = giaTri.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

/** "2026-11-10T08:30:00" → "10/11/2026 08:30". */
export function ngayGio(giaTri: string | null | undefined): string {
  if (!giaTri) return ''
  return `${ngay(giaTri)} ${giaTri.slice(11, 16)}`
}

const dinhDangTien = new Intl.NumberFormat('vi-VN')

/** UC_5.x BR: số tiền có dấu phân cách hàng nghìn. */
export const tien = (so: number) => `${dinhDangTien.format(so)} đ`
export const so = (giaTri: number) => dinhDangTien.format(giaTri)

/** Ngày hôm nay dạng yyyy-MM-dd (theo giờ máy người dùng). */
export function homNayISO(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** Thời điểm hiện tại dạng "yyyy-MM-ddTHH:mm:ss" theo giờ máy người dùng (dùng với ngayGio). */
export function bayGioISO(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${homNayISO()}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

/**
 * Gắn lỗi theo trường từ API vào form. Trả về thông báo chung nếu lỗi không thuộc trường nào.
 */
export function ganLoiServer<T extends FieldValues>(form: UseFormReturn<T>, e: unknown): string | null {
  if (!(e instanceof LoiApi)) return 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.'
  const cacLoi = Object.entries(e.loi)
  if (cacLoi.length === 0) return e.message
  let dauTien = true
  for (const [truong, thongBao] of cacLoi) {
    form.setError(truong as Path<T>, { message: thongBao }, { shouldFocus: dauTien })
    dauTien = false
  }
  return null
}
