import { tien } from '../lib/dinhDang'

/** Mã QR minh họa (không quét được) – MVP chưa kết nối ngân hàng (Q5). */
export function MaQrGiaLap({ soTien }: { soTien: number }) {
  // Họa tiết giả lập sinh từ số tiền để mỗi giao dịch trông khác nhau.
  const o = Array.from({ length: 21 * 21 }, (_, i) => (i * 7919 + soTien) % 11 < 5)
  const goc = (x: number, y: number) => (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13)
  return (
    <svg className="ma-qr" viewBox="0 0 21 21" role="img" aria-label={`Mã QR giả lập ${tien(soTien)}`}>
      <rect width="21" height="21" fill="#fff" />
      {o.map((den, i) => {
        const x = i % 21
        const y = Math.floor(i / 21)
        if (goc(x, y)) return null
        return den ? <rect key={i} x={x} y={y} width="1" height="1" fill="#111" /> : null
      })}
      {[
        [0, 0],
        [14, 0],
        [0, 14],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <rect x={x} y={y} width="7" height="7" fill="#111" />
          <rect x={x + 1} y={y + 1} width="5" height="5" fill="#fff" />
          <rect x={x + 2} y={y + 2} width="3" height="3" fill="#111" />
        </g>
      ))}
    </svg>
  )
}

/** Khung giả lập kết quả ngân hàng cho màn hình QR (Q5). */
export function GiaLapNganHang({ dangXuLy, onKetQua }: { dangXuLy: boolean; onKetQua: (thanhCong: boolean) => void }) {
  return (
    <div className="gia-lap">
      <p>
        <strong>[Giả lập ngân hàng]</strong> MVP chưa kết nối ngân hàng thật (Q5). Chọn kết quả để thử các luồng:
      </p>
      <div className="hang-nut hang-nut--giua">
        <button type="button" className="nut nut--chinh" disabled={dangXuLy} onClick={() => onKetQua(true)}>
          Ngân hàng xác nhận
        </button>
        <button type="button" className="nut nut--nguy-hiem" disabled={dangXuLy} onClick={() => onKetQua(false)}>
          Thanh toán thất bại
        </button>
      </div>
    </div>
  )
}
