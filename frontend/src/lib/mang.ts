import { useSyncExternalStore } from 'react'

/**
 * Trạng thái kết nối tới máy chủ (Giai đoạn 8c). "Có mạng" = trình duyệt báo online VÀ lần gọi API gần nhất không lỗi mạng
 * – vì máy vẫn có thể báo online khi chỉ mất Internet (máy chủ ở trên mạng).
 */
let coMang = typeof navigator === 'undefined' ? true : navigator.onLine
const nguoiNghe = new Set<() => void>()

export function datCoMang(giaTri: boolean) {
  if (giaTri === coMang) return
  coMang = giaTri
  nguoiNghe.forEach((f) => f())
}

export const dangCoMang = () => coMang

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => datCoMang(true))
  window.addEventListener('offline', () => datCoMang(false))
}

const dangKy = (f: () => void) => {
  nguoiNghe.add(f)
  return () => nguoiNghe.delete(f)
}

export const useCoMang = () => useSyncExternalStore(dangKy, dangCoMang)
