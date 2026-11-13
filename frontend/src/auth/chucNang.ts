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
  /** Mục cha mở trang của chính nó (không phải mục con đầu tiên). */
  moTrangCha?: boolean
}

const CA_HAI: VaiTro[] = ['ChuQuan', 'NhanVien']
const CHU_QUAN: VaiTro[] = ['ChuQuan']

export const DANH_SACH_CHUC_NANG: ChucNang[] = [
  {
    duongDan: '/quan-ly-tai-khoan', ten: 'Quản lý tài khoản', moTa: 'Thêm, sửa, xóa tài khoản nhân viên',
    vaiTro: CHU_QUAN, giaiDoan: 2, daTrienKhai: true, moTrangCha: true,
    con: [{ duongDan: '/quan-ly-tai-khoan/them', ten: 'Thêm mới tài khoản nhân viên', vaiTro: CHU_QUAN }],
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
  {
    duongDan: '/bao-cao', ten: 'Xem báo cáo và thống kê', moTa: 'Lợi nhuận, doanh thu, số lượng bán, tồn kho',
    vaiTro: CHU_QUAN, giaiDoan: 7, daTrienKhai: true,
    con: [
      { duongDan: '/bao-cao/loi-nhuan', ten: 'Xem báo cáo lợi nhuận', vaiTro: CHU_QUAN },
      { duongDan: '/bao-cao/doanh-thu', ten: 'Xem báo cáo doanh thu', vaiTro: CHU_QUAN },
      { duongDan: '/bao-cao/so-luong-ban-ra', ten: 'Xem báo cáo số lượng bán ra', vaiTro: CHU_QUAN },
      { duongDan: '/bao-cao/ton-kho', ten: 'Xem báo cáo tồn kho', vaiTro: CHU_QUAN },
    ],
  },
  {
    duongDan: '/quan-ly-ban-hang', ten: 'Quản lý bán hàng', moTa: 'Bán hàng tại quầy, lịch sử bán hàng',
    vaiTro: CA_HAI, giaiDoan: 3, daTrienKhai: true,
    con: [
      { duongDan: '/quan-ly-ban-hang/ban-hang', ten: 'Tạo hóa đơn bán hàng', vaiTro: CA_HAI },
      { duongDan: '/quan-ly-ban-hang/lich-su', ten: 'Tìm kiếm lịch sử bán hàng', vaiTro: CA_HAI },
      { duongDan: '/quan-ly-ban-hang/doi-tra', ten: 'Xử lý đổi trả', vaiTro: CA_HAI },
      { duongDan: '/quan-ly-ban-hang/huy-hoa-don', ten: 'Hủy hóa đơn bán hàng', vaiTro: CHU_QUAN },
      { duongDan: '/quan-ly-ban-hang/duyet-doi-tra', ten: 'Duyệt phiếu đổi trả', vaiTro: CHU_QUAN },
    ],
  },
  {
    duongDan: '/quan-ly-cong-no', ten: 'Quản lý công nợ', moTa: 'Khách quen, hóa đơn nợ, thu nợ',
    vaiTro: CA_HAI, giaiDoan: 4, daTrienKhai: true,
    con: [
      { duongDan: '/quan-ly-cong-no/tim-kiem', ten: 'Tìm kiếm khách quen', vaiTro: CA_HAI },
      { duongDan: '/quan-ly-cong-no/thu-no', ten: 'Tạo phiếu thanh toán nợ', vaiTro: CA_HAI },
      { duongDan: '/quan-ly-cong-no/them', ten: 'Thêm khách quen', vaiTro: CHU_QUAN },
    ],
  },
  {
    duongDan: '/quan-ly-khach-hang', ten: 'Quản lý khách hàng', moTa: 'Thêm, sửa, tìm kiếm khách hàng',
    vaiTro: CA_HAI, giaiDoan: 3, daTrienKhai: true,
    con: [
      { duongDan: '/quan-ly-khach-hang', ten: 'Tìm kiếm khách hàng', vaiTro: CA_HAI },
      { duongDan: '/quan-ly-khach-hang/them', ten: 'Thêm khách hàng', vaiTro: CA_HAI },
    ],
  },
  {
    duongDan: '/ket-ca', ten: 'Kết ca', moTa: 'Lưu và xem biên bản kết ca',
    vaiTro: CA_HAI, giaiDoan: 6, daTrienKhai: true,
    con: [
      { duongDan: '/ket-ca/luu-bien-ban', ten: 'Lưu biên bản', vaiTro: CA_HAI },
      { duongDan: '/ket-ca/bien-ban', ten: 'Xem biên bản', vaiTro: CA_HAI },
    ],
  },
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

/** Breadcrumb riêng cho trang có mã trong đường dẫn: [mẫu đường dẫn, trang cha, tên trang]. */
export const TEN_TRANG_MAU: [RegExp, string, string][] = [
  [/^\/quan-ly-tai-khoan\/[^/]+\/sua$/, '/quan-ly-tai-khoan', 'Sửa nhân viên'], // mẫu 2.3.1
]

/** Tên hiển thị trên breadcrumb theo đường dẫn đầy đủ. */
export const TEN_TRANG: Record<string, string> = {
  '/tai-khoan': 'Tài khoản cá nhân',
  '/tai-khoan/doi-mat-khau': 'Đổi mật khẩu',
  '/tai-khoan/sao-luu': 'Sao lưu dữ liệu',
  '/quan-ly-tai-khoan/them': 'Thêm mới tài khoản nhân viên',
  '/quan-ly-ton-kho/tim-kiem': 'Tìm kiếm tồn kho',
  '/quan-ly-ton-kho/canh-bao': 'Xem cảnh báo tồn kho',
  '/quan-ly-ton-kho/dieu-chinh': 'Điều chỉnh tồn kho',
  '/quan-ly-hang-hoa/them': 'Thêm hàng hóa',
  '/quan-ly-lo-hang/them': 'Thêm lô hàng',
  '/quan-ly-ban-hang/ban-hang': 'Tạo hóa đơn bán hàng',
  '/quan-ly-ban-hang/lich-su': 'Tìm kiếm lịch sử bán hàng',
  '/quan-ly-ban-hang/hoa-don': 'Chi tiết hóa đơn',
  '/quan-ly-ban-hang/doi-tra': 'Xử lý đổi trả',
  '/quan-ly-ban-hang/doi-tra/hoa-don': 'Hóa đơn gốc',
  '/quan-ly-ban-hang/doi-tra/phieu': 'Phiếu đổi trả',
  '/quan-ly-ban-hang/huy-hoa-don': 'Hủy hóa đơn bán hàng',
  '/quan-ly-ban-hang/huy-hoa-don/hoa-don': 'Chi tiết hóa đơn',
  '/quan-ly-ban-hang/duyet-doi-tra': 'Duyệt phiếu đổi trả',
  '/quan-ly-ban-hang/duyet-doi-tra/phieu': 'Chi tiết phiếu',
  '/quan-ly-khach-hang/them': 'Thêm khách hàng',
  '/ket-ca/luu-bien-ban': 'Lưu biên bản',
  '/ket-ca/bien-ban': 'Xem biên bản',
  '/ket-ca/bien-ban/chi-tiet': 'Chi tiết biên bản',
  '/bao-cao/loi-nhuan': 'Xem báo cáo lợi nhuận',
  '/bao-cao/so-sanh-loi-nhuan': 'So sánh lợi nhuận',
  '/bao-cao/doanh-thu': 'Xem báo cáo doanh thu',
  '/bao-cao/so-sanh-doanh-thu': 'So sánh doanh thu',
  '/bao-cao/so-luong-ban-ra': 'Xem báo cáo số lượng bán ra',
  '/bao-cao/top-ban-chay': 'Top bán chạy',
  '/bao-cao/top-ban-cham': 'Top bán chậm',
  '/bao-cao/ton-kho': 'Xem báo cáo tồn kho',
  '/quan-ly-cong-no/tim-kiem': 'Tìm kiếm khách quen',
  '/quan-ly-cong-no/thu-no': 'Tạo phiếu thanh toán nợ',
  '/quan-ly-cong-no/them': 'Thêm khách quen',
  '/quan-ly-cong-no/khach-quen': 'Tìm kiếm khách quen',
  ...Object.fromEntries(DANH_SACH_CHUC_NANG.map((c) => [c.duongDan, c.ten])),
}

/**
 * Trang không nằm trực tiếp trên menu nhưng được mở từ một mục con → breadcrumb chèn mục con đó vào trước,
 * để đường dẫn khớp menu trái (VD: Quản lý bán hàng / Tìm kiếm lịch sử bán hàng / Chi tiết hóa đơn).
 */
export const TRANG_CHA_AO: Record<string, string> = {
  '/quan-ly-ban-hang/hoa-don': '/quan-ly-ban-hang/lich-su',
  '/bao-cao/so-sanh-loi-nhuan': '/bao-cao/loi-nhuan',
  '/bao-cao/so-sanh-doanh-thu': '/bao-cao/doanh-thu',
  '/bao-cao/top-ban-chay': '/bao-cao/so-luong-ban-ra',
  '/bao-cao/top-ban-cham': '/bao-cao/so-luong-ban-ra',
}

export interface MatBreadcrumb {
  den: string
  ten: string
}

/** Chuỗi breadcrumb (không gồm "Trang chủ") khớp tên menu trái. */
export function chuoiBreadcrumb(pathname: string): MatBreadcrumb[] {
  const mau = TEN_TRANG_MAU.find(([m]) => m.test(pathname))
  if (mau) return [{ den: mau[1], ten: TEN_TRANG[mau[1]] ?? mau[1] }, { den: pathname, ten: mau[2] }]

  const cacPhan = pathname.split('/').filter(Boolean)
  const ketQua: MatBreadcrumb[] = []
  cacPhan.forEach((p, i) => {
    const den = '/' + cacPhan.slice(0, i + 1).join('/')
    const cha = TRANG_CHA_AO[den]
    if (cha) ketQua.push({ den: cha, ten: TEN_TRANG[cha] ?? cha })
    ketQua.push({ den, ten: TEN_TRANG[den] ?? (p === 'sua' ? 'Sửa' : decodeURIComponent(p)) })
    if (i === 0) {
      // Nhóm có mục con trùng đường dẫn nhóm (VD "Tìm kiếm khách hàng" = /quan-ly-khach-hang):
      // trang nhóm và trang chi tiết theo mã thuộc mục con đó; trang con có tên riêng (/them…) thì không.
      const nhom = DANH_SACH_CHUC_NANG.find((c) => c.duongDan === den)
      const conTrung = nhom?.con?.find((m) => m.duongDan === den)
      const tiepTheo = cacPhan[1] ? `${den}/${cacPhan[1]}` : null
      if (conTrung && (tiepTheo === null || !(tiepTheo in TEN_TRANG))) ketQua.push({ den, ten: conTrung.ten })
    }
  })
  return ketQua
}
