import { useState } from 'react'
import { PhanTrang } from '../components/PhanTrang'

/** Số dòng mỗi trang cho mọi danh sách trong web (UC_3.1 BR02, UC_4.4 BR02). */
export const SO_DONG_MOI_TRANG = 20

/**
 * Phân trang phía giao diện cho danh sách đã tải đủ: tối đa 20 dòng/trang.
 * `khoa`: giá trị đơn giản (chuỗi/số) – khi đổi (vd. đổi bộ lọc) thì quay về trang 1; mặc định là số dòng.
 */
export function useTrang<T>(ds: readonly T[] | null | undefined, khoa?: string | number) {
  const tong = ds?.length ?? 0
  const khoaMoi = khoa ?? tong
  const [trang, setTrang] = useState(1)
  const [khoaCu, setKhoaCu] = useState(khoaMoi)
  if (khoaMoi !== khoaCu) {
    setKhoaCu(khoaMoi)
    setTrang(1)
  }
  const soTrang = Math.max(1, Math.ceil(tong / SO_DONG_MOI_TRANG))
  const hienTai = Math.min(trang, soTrang)
  const batDau = (hienTai - 1) * SO_DONG_MOI_TRANG
  return {
    dsTrang: (ds ?? []).slice(batDau, batDau + SO_DONG_MOI_TRANG),
    batDau,
    phanTrang: <PhanTrang trang={hienTai} soTrang={soTrang} onDoiTrang={setTrang} />,
  }
}
