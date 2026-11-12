import { useEffect, useRef, type ReactNode } from 'react'

interface Props {
  mo: boolean
  tieuDe?: string
  children: ReactNode
  /** Các nút ở chân hộp thoại. Nút đầu tiên được focus khi mở. */
  nut: ReactNode
  kieu?: 'thuong' | 'loi' | 'thanhCong'
  onDong?: () => void
  /** Lớp CSS thêm cho hộp thoại (ví dụ căn giữa theo mẫu xác nhận 2.5.1). */
  className?: string
}

/** Hộp thoại xác nhận/thông báo dùng <dialog> gốc của trình duyệt (có sẵn bẫy focus và phím Esc). */
export function HopThoai({ mo, tieuDe, children, nut, kieu = 'thuong', onDong, className }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (mo && !d.open) d.showModal()
    if (!mo && d.open) d.close()
  }, [mo])

  return (
    <dialog
      ref={ref}
      className={`hop-thoai hop-thoai--${kieu} ${className ?? ''}`}
      onCancel={(e) => {
        e.preventDefault()
        onDong?.()
      }}
    >
      {tieuDe && <h2 className="hop-thoai__tieu-de">{tieuDe}</h2>}
      <div className="hop-thoai__noi-dung">{children}</div>
      <div className="hop-thoai__nut">{nut}</div>
    </dialog>
  )
}
