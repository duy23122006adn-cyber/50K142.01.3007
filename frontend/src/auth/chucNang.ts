import type { VaiTro } from '../api/client'

/**
 * Menu chức năng theo vai trò – theo đặc tả màn hình (menu bên trái, có mục con) và ma trận quyền đã chốt (Q7).
 * Server vẫn kiểm tra quyền ở từng API; ẩn menu chỉ để giao diện gọn.
 */
export interface MucCon {
  duongDan: string
  ten: string
  vaiTro: VaiTro[]
}

export interface ChucNang {
  duongDan: string
  ten: string
  moTa: string
  vaiTro: VaiTro[]
  /** Giai đoạn triển khai trong KE_HOACH.md. */
  giaiDoan: number
  daTrienKhai: boolean
  con?: MucCon[]
}

const CA_HAI: VaiTro[] = ['ChuQuan', 'NhanVien']
const CHU_QUAN: VaiTro[] = ['ChuQuan']

export const DANH_SACH_CHUC_NANG: ChucNang[] = [
  {
    duongDan: '/quan-ly-tai-khoan', ten: 'Quản lý tài khoản', moTa: 'Thêm, sửa, xóa tài khoản nhân viên',
    vaiTro: CHU_QUAN, giaiDoan: 2, daTrienKhai: true,
  },
  {
    duongDan: '/quan-ly-ton-kho', ten: 'Quản lý tồn kho', moTa: 'Tra cứu tồn kho, cảnh báo, điều chỉnh tồn',
    vaiTro: CA_HAI, giaiDoan: 2, daTrienKhai: true,
    con: [
      { duongDan: '/quan-ly-ton-kho/tim-kiem', ten: 'Tìm kiếm tồn kho', vaiTro: CA_HAI },
      { duongDan: '/quan-ly-ton-kho/canh-bao', ten: 'Xem cảnh báo tồn kho', vaiTro: CHU_QUAN },
      { duongDan: '/quan-ly-ton-kho/dieu-chinh', ten: 'Điều chỉnh tồn kho', vaiTro: CHU_QUAN },
    ],
  },
  {
    duongDan: '/quan-ly-hang-hoa', ten: 'Quản lý hàng hóa', moTa: 'Thêm, sửa, xóa, tìm kiếm hàng hóa',
    vaiTro: CHU_QUAN, giaiDoan: 2, daTrienKhai: true,
    con: [
      { duongDan: '/quan-ly-hang-hoa', ten: 'Tìm kiếm hàng hóa', vaiTro: CHU_QUAN },
      { duongDan: '/quan-ly-hang-hoa/them', ten: 'Thêm hàng hóa', vaiTro: CHU_QUAN },
    ],
  },
  { duongDan: '/bao-cao', ten: 'Xem báo cáo và thống kê', moTa: 'Lợi nhuận, doanh thu, số lượng bán, tồn kho', vaiTro: CHU_QUAN, giaiDoan: 7, daTrienKhai: false },
  { duongDan: '/quan-ly-ban-hang', ten: 'Quản lý bán hàng', moTa: 'Bán hàng, lịch sử, hủy hóa đơn, đổi trả', vaiTro: CA_HAI, giaiDoan: 3, daTrienKhai: false },
  { duongDan: '/quan-ly-cong-no', ten: 'Quản lý công nợ', moTa: 'Hóa đơn nợ, khách quen, thu nợ', vaiTro: CA_HAI, giaiDoan: 4, daTrienKhai: false },
  { duongDan: '/quan-ly-khach-hang', ten: 'Quản lý khách hàng', moTa: 'Thêm, sửa, tìm kiếm khách hàng', vaiTro: CA_HAI, giaiDoan: 3, daTrienKhai: false },
  { duongDan: '/ket-ca', ten: 'Kết ca', moTa: 'Lưu và xem biên bản kết ca', vaiTro: CA_HAI, giaiDoan: 6, daTrienKhai: false },
  {
    duongDan: '/quan-ly-lo-hang', ten: 'Quản lý lô hàng', moTa: 'Danh sách và thêm lô hàng mới',
    vaiTro: CHU_QUAN, giaiDoan: 2, daTrienKhai: true,
  },
]

export const TEN_VAI_TRO: Record<VaiTro, string> = {
  ChuQuan: 'Chủ quán',
  NhanVien: 'Nhân viên',
}

export const chucNangCua = (vaiTro: VaiTro) => DANH_SACH_CHUC_NANG.filter((c) => c.vaiTro.includes(vaiTro))

/** Tên hiển thị trên breadcrumb theo đường dẫn đầy đủ. */
export const TEN_TRANG: Record<string, string> = {
  '/tai-khoan': 'Tài khoản cá nhân',
  '/tai-khoan/doi-mat-khau': 'Đổi mật khẩu',
  '/quan-ly-tai-khoan/them': 'Thêm tài khoản',
  '/quan-ly-ton-kho/tim-kiem': 'Tìm kiếm tồn kho',
  '/quan-ly-ton-kho/canh-bao': 'Xem cảnh báo tồn kho',
  '/quan-ly-ton-kho/dieu-chinh': 'Điều chỉnh tồn kho',
  '/quan-ly-hang-hoa/them': 'Thêm hàng hóa',
  '/quan-ly-lo-hang/them': 'Thêm lô hàng',
  ...Object.fromEntries(DANH_SACH_CHUC_NANG.map((c) => [c.duongDan, c.ten])),
}
