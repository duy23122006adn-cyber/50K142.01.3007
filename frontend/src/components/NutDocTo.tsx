import { useEffect, useState } from 'react'
import { coGiongViet, coHoTroDocTo, datDocTo, docTo, docToDangBat } from '../lib/docTo'

/** Nút bật/tắt đọc to số tiền trên máy này; báo khi máy chưa có giọng đọc tiếng Việt. */
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
    <div className="nut-doc-to">
      <button
        type="button"
        className={`nut nut--nho ${bat ? 'nut--chinh' : ''}`}
        aria-pressed={bat}
        onClick={() => {
          datDocTo(!bat)
          setBat(!bat)
          if (!bat && cauThu) docTo(cauThu)
        }}
        title="Đọc to số tiền khi tính tiền"
      >
        {bat ? '🔊 Đọc to: Bật' : '🔈 Đọc to: Tắt'}
      </button>
      {bat && !coGiong && <small className="ghi-chu">Máy chưa cài giọng đọc tiếng Việt – có thể đọc sai giọng.</small>}
    </div>
  )
}
