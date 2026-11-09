import { HopThoai } from './HopThoai'

export interface KetQua {
  kieu: 'thanhCong' | 'loi'
  thongBao: string
  /** Nhãn nút đóng theo đặc tả màn hình ("Kết thúc", "Đóng", "Quay lại"…). */
  nut?: string
}

/** Hộp thoại thông báo thành công (chữ xanh) / thất bại (chữ đỏ) với một nút đóng. */
export function ThongBaoKetQua({ ketQua, onDong }: { ketQua: KetQua | null; onDong: () => void }) {
  return (
    <HopThoai
      mo={ketQua !== null}
      kieu={ketQua?.kieu === 'loi' ? 'loi' : 'thanhCong'}
      onDong={onDong}
      nut={
        <button type="button" className={`nut ${ketQua?.kieu === 'thanhCong' ? 'nut--chinh' : ''}`} onClick={onDong}>
          {ketQua?.nut ?? 'Đóng'}
        </button>
      }
    >
      <p className={`thong-bao ${ketQua?.kieu === 'loi' ? 'thong-bao--do' : 'thong-bao--xanh'}`}>{ketQua?.thongBao}</p>
    </HopThoai>
  )
}
