import { forwardRef, useId, type InputHTMLAttributes } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  nhan: string
  batBuoc?: boolean
  loi?: string
}

/** Ô nhập có nhãn và thông báo lỗi màu đỏ ngay dưới ô (theo đặc tả màn hình). */
export const TruongNhap = forwardRef<HTMLInputElement, Props>(function TruongNhap(
  { nhan, batBuoc, loi, className, ...input },
  ref,
) {
  const id = useId()
  const idLoi = `${id}-loi`
  return (
    <div className="truong">
      <label htmlFor={id} className="truong__nhan">
        {nhan}
        {batBuoc && <span className="truong__sao"> *</span>}
      </label>
      <input
        ref={ref}
        id={id}
        className={`truong__o ${loi ? 'truong__o--loi' : ''} ${className ?? ''}`}
        aria-invalid={loi ? true : undefined}
        aria-describedby={loi ? idLoi : undefined}
        {...input}
      />
      {loi && (
        <p id={idLoi} className="truong__loi" role="alert">
          {loi}
        </p>
      )}
    </div>
  )
})
