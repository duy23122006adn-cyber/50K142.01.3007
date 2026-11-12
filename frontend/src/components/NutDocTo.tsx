import { useEffect, useState } from 'react'
import { coGiongViet, coHoTroDocTo, datDocTo, docTo, docToDangBat } from '../lib/docTo'

/**
 * Nút bật/tắt đọc to số tiền trên máy này; báo khi máy chưa có giọng đọc tiếng Việt.
 * Trả về nút + dòng nhắc (không bọc khung) để nằm chung hàng với nút "Đọc số tiền".
 */
export function NutDocTo({ cauThu }: { cauThu?: string }) {
  const [bat, setBat] = useState(docToDangBat)
  const [coGiong, setCoGiong] = useState(true)

  useEffect(() => {
    if (!coHoTroDocTo()) return
    const kiem = () => setCoGiong(coGiongViet())
    kiem()
    speechSynthesis.addEventListener('voiceschanged', kiem)
    return () => speechSynthesis.removeEventListener('voiceschanged', kiem)
  }, [])

  if (!coHoTroDocTo()) return null
  return (
    <>
      <button
        type="button"
        className={`nut nut--nho ${bat ? 'nut--dang-chon' : ''}`}
        aria-pressed={bat}
        onClick={() => {
          datDocTo(!bat)
          setBat(!bat)
          if (!bat && cauThu) docTo(cauThu)
        }}
        title="Tự đọc to số tiền khi tính tiền"
      >
        {bat ? '🔊 Đọc to: Bật' : '🔈 Đọc to: Tắt'}
      </button>
      {bat && !coGiong && (
        <small className="ghi-chu nhac-giong" title="Cài đặt Windows › Thời gian và ngôn ngữ › Giọng nói › Thêm giọng nói › Tiếng Việt">
          Máy chưa có giọng đọc tiếng Việt – mở bằng Microsoft Edge hoặc cài trong Cài đặt Windows › Giọng nói.
        </small>
      )}
    </>
  )
}
