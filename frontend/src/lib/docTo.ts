import { docTien } from './docSo'

/**
 * Đọc to bằng giọng đọc có sẵn của trình duyệt (Web Speech API) – Usability NFR-02 và
 * phần tích hợp "Bộ phát âm thanh (loa): đọc to số tiền khách đã chuyển khoản".
 * Luôn bật, không có nút trên giao diện (chủ dự án bỏ nút "Đọc số tiền" / "Đọc to").
 */

export const coHoTroDocTo = () => typeof window !== 'undefined' && 'speechSynthesis' in window

const giongViet = () => (coHoTroDocTo() ? speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith('vi')) : undefined)

export function docTo(cau: string) {
  if (!coHoTroDocTo()) return
  const u = new SpeechSynthesisUtterance(cau)
  u.lang = 'vi-VN'
  const g = giongViet()
  if (g) u.voice = g
  u.rate = 0.95
  speechSynthesis.cancel() // câu mới thay câu đang đọc dở
  speechSynthesis.speak(u)
}

export const docTongTien = (tong: number) => docTo(`Tổng tiền cần thanh toán ${docTien(tong)}`)

/** Sau khi thu tiền thành công. */
export function docDaThu(phuongThuc: string, soTien: number, tienTraLai = 0) {
  if (phuongThuc === 'Chuyển khoản QR') return docTo(`Đã nhận chuyển khoản ${docTien(soTien)}`)
  docTo(tienTraLai > 0 ? `Đã nhận ${docTien(soTien + tienTraLai)}. Trả lại ${docTien(tienTraLai)}` : `Đã nhận đủ ${docTien(soTien)}`)
}
