import type { VaiTro } from '../api/client'

/**
 * Menu chức năng theo vai trò – theo đặc tả màn hình (menu bên trái) và ma trận quyền đã chốt (Q7).
 * Server vẫn kiểm tra quyền ở từng API; ẩn menu chỉ để giao diện gọn.
 */
export interface ChucNang {
  duongDan: string
  ten: string
  moTa: string
  vaiTro: VaiTro[]
  /** Giai đoạn triển khai trong KE_HOACH.md. */
  giaiDoan: number
}

const CA_HAI: VaiTro[] = ['ChuQuan', 'NhanVien']
const CHU_QUAN: VaiTro[] = ['ChuQuan']

export const DANH_SACH_CHUC_NANG: ChucNang[] = [
  { duongDan: '/quan-ly-tai-khoan', ten: 'Quản lý tài khoản', moTa: 'Thêm, sửa, xóa tài khoản nhân viên', vaiTro: CHU_QUAN, giaiDoan: 2 },
  { duongDan: '/quan-ly-ton-kho', ten: 'Quản lý tồn kho', moTa: 'Tra cứu tồn kho, cảnh báo, điều chỉnh tồn', vaiTro: CA_HAI, giaiDoan: 2 },
  { duongDan: '/quan-ly-hang-hoa', ten: 'Quản lý hàng hóa', moTa: 'Thêm, sửa, xóa, tìm kiếm hàng hóa', vaiTro: CHU_QUAN, giaiDoan: 2 },
  { duongDan: '/bao-cao', ten: 'Xem báo cáo và thống kê', moTa: 'Lợi nhuận, doanh thu, số lượng bán, tồn kho', vaiTro: CHU_QUAN, giaiDoan: 7 },
  { duongDan: '/quan-ly-ban-hang', ten: 'Quản lý bán hàng', moTa: 'Bán hàng, lịch sử, hủy hóa đơn, đổi trả', vaiTro: CA_HAI, giaiDoan: 3 },
  { duongDan: '/quan-ly-cong-no', ten: 'Quản lý công nợ', moTa: 'Hóa đơn nợ, khách quen, thu nợ', vaiTro: CA_HAI, giaiDoan: 4 },
  { duongDan: '/quan-ly-khach-hang', ten: 'Quản lý khách hàng', moTa: 'Thêm, sửa, tìm kiếm khách hàng', vaiTro: CA_HAI, giaiDoan: 3 },
  { duongDan: '/ket-ca', ten: 'Kết ca', moTa: 'Lưu và xem biên bản kết ca', vaiTro: CA_HAI, giaiDoan: 6 },
  { duongDan: '/quan-ly-lo-hang', ten: 'Quản lý lô hàng', moTa: 'Thêm lô hàng mới', vaiTro: CHU_QUAN, giaiDoan: 2 },
]

export const TEN_VAI_TRO: Record<VaiTro, string> = {
  ChuQuan: 'Chủ quán',
  NhanVien: 'Nhân viên',
}

export const chucNangCua = (vaiTro: VaiTro) => DANH_SACH_CHUC_NANG.filter((c) => c.vaiTro.includes(vaiTro))
