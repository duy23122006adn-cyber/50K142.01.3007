import { forwardRef, useId, useRef, type InputHTMLAttributes } from 'react'

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  nhan: string
  batBuoc?: boolean
  loi?: string
  /** Gọi khi chọn ngày từ lịch; giá trị dạng dd/mm/yyyy. */
  onChonNgay: (ngay: string) => void
}

/** "25/07/2000" → "2000-07-25" (cho lịch); chuỗi không đúng dạng → "". */
function sangIso(s: string): string {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s.trim())
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : ''
}

/**
 * Ô ngày theo mẫu 2.2.1: nhập dd/mm/yyyy, biểu tượng lịch ở cuối ô để chọn ngày.
 * Lịch dùng ô date ẩn của trình duyệt (showPicker).
 */
export const TruongNgay = forwardRef<HTMLInputElement, Props>(function TruongNgay(
  { nhan, batBuoc, loi, onChonNgay, className, ...input },
  ref,
) {
  const id = useId()
  const idLoi = `${id}-loi`
  const oNhap = useRef<HTMLInputElement | null>(null)
  const lich = useRef<HTMLInputElement>(null)

  const moLich = () => {
    const el = lich.current
    if (!el) return
    el.value = sangIso(oNhap.current?.value ?? '')
    try {
      el.showPicker()
    } catch {
      el.focus()
    }
  }

  return (
    <div className="truong">
      <label htmlFor={id} className="truong__nhan">
        {nhan}
        {batBuoc && <span className="truong__sao"> *</span>}
      </label>
      <div className="o-ngay">
        <input
          ref={(el) => {
            oNhap.current = el
            if (typeof ref === 'function') ref(el)
            else if (ref) ref.current = el
          }}
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          className={`truong__o ${loi ? 'truong__o--loi' : ''} ${className ?? ''}`}
          aria-invalid={loi ? true : undefined}
          aria-describedby={loi ? idLoi : undefined}
          {...input}
        />
        <button type="button" className="o-ngay__nut" aria-label="Chọn ngày từ lịch" onClick={moLich} disabled={input.disabled}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 10h18M8 3v4M16 3v4M7 14h2M11 14h2M15 14h2M7 18h2M11 18h2" />
          </svg>
        </button>
        <input
          ref={lich}
          type="date"
          className="o-ngay__lich"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            const [y, m, d] = e.target.value.split('-')
            if (y && m && d) onChonNgay(`${d}/${m}/${y}`)
          }}
        />
      </div>
      {loi && (
        <p id={idLoi} className="truong__loi" role="alert">
          {loi}
        </p>
      )}
    </div>
  )
})
