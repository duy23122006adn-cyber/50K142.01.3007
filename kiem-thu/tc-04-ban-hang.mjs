// Nhóm 4 – Tạo hóa đơn bán hàng (UC_6.5), Tìm kiếm lịch sử bán hàng (UC_6.1) và các quy tắc cần có giao dịch
// (UC_4.3 ngừng kinh doanh, UC_10.1 BR07, UC_8.3 mặt hàng thường mua).
import { CHU, S, moTa, ngayISO, ngayVN, tc } from './lib.mjs'

const NHOM = 'Bán hàng & Lịch sử'
const U65 = { uc: 'UC_6.5', nhom: NHOM }
const U61 = { uc: 'UC_6.1', nhom: NHOM }

/** Bán trọn luồng thanh toán trực tiếp → tạo hóa đơn. Trả { tt, hd }. */
export async function ban(p, dong, { maKH = null, phuongThuc = 'Tiền mặt', tienKhachDua, qr = 'ThanhCong' } = {}) {
  const tong = dong.reduce((s, d) => s + d.soLuong * (d.gia ?? 0), 0)
  const body = { maKH, dong: dong.map(({ maHH, soLuong }) => ({ maHH, soLuong })), phuongThuc }
  if (phuongThuc === 'Tiền mặt') body.tienKhachDua = String(tienKhachDua ?? Math.max(tong, 1_000_000))
  else {
    const q = await p.post('/tich-hop/qr', { soTien: tong || 1 })
    body.ketQuaQrGiaLap = qr
    body.maThamChieuQr = q.data?.maThamChieu
  }
  const tt = await p.post('/ban-hang/thanh-toan', body)
  if (tt.status !== 200) return { tt, hd: null }
  const hd = await p.post('/ban-hang/hoa-don', { maPTT: tt.data.maPTT, maKH, dong: body.dong })
  return { tt, hd }
}
/** Giá bán hiện hành (tra bằng phiên Chủ quán – chi tiết hàng hóa chỉ Chủ quán xem được). */
export const giaBan = async (_p, maHH) => (await S.cq.get(`/hang-hoa/${maHH}`)).data?.giaBan
const tonLo = async (maLo) => (await S.cq.get(`/ton-kho/lo/${maLo}`)).data?.soLuongTon
const sp = async (p, tk) => (await p.get(`/ban-hang/san-pham?tuKhoa=${encodeURIComponent(tk)}`)).data ?? []
const so = (ma) => Number(String(ma).split('.').pop())
const MA_HD = /^HD-\d{2}\/\d{2}\/\d{4}\.\d{3,}$/

// ================================================================== UC_6.5
tc('TC-UC6.5-01', { ...U65, ten: 'Hiển thị danh mục sản phẩm và tìm sản phẩm', loai: 'Luồng chính', nguon: 'Main flow 2–4', tienDieuKien: 'Nhân viên mở chức năng Bán hàng', buoc: 'Tìm "Bánh B"', duLieu: 'Tên hàng B', mongDoi: 'Hiển thị hàng B với giá bán và tồn bán được' }, async (t) => {
  const ds = await sp(S.nv, S.hh.B.ten)
  const b = ds.find((x) => x.maHH === S.hh.B.maHH)
  t.dung(b, 'Phải tìm thấy hàng B')
  t.bang(b?.tonBanDuoc, 20, 'tồn bán được của B')
  return `${b?.maHH} ${b?.tenHH} giá ${b?.giaBan} tồn ${b?.tonBanDuoc}`
})
tc('TC-UC6.5-02', { ...U65, ten: 'Không tìm thấy sản phẩm phù hợp', loai: 'Ngoại lệ', nguon: 'Exception 4.a', tienDieuKien: '-', buoc: 'Tìm tên không tồn tại', duLieu: 'zzz_khong_co', mongDoi: '"Không tìm thấy sản phẩm phù hợp"' }, async (t) => {
  const r = await S.nv.get('/ban-hang/san-pham?tuKhoa=zzz_khong_co')
  const rong = r.status === 200 && (r.data ?? []).length === 0
  if (!rong) t.loiNV(r, 404, 'Không tìm thấy sản phẩm phù hợp')
  return rong ? 'HTTP 200, danh sách rỗng (giao diện hiển thị "Không tìm thấy sản phẩm phù hợp")' : moTa(r)
})
tc('TC-UC6.5-03', { ...U65, ten: 'Bán hàng tiền mặt cho khách có hồ sơ – tạo hóa đơn, trừ tồn kho', loai: 'Luồng chính', nguon: 'Main flow 1–16, BR04, BR05, BR9, BR10', tienDieuKien: 'Nhân viên đăng nhập; hàng A còn hàng; khách Bình tồn tại; có ca đang mở', buoc: '1. Thêm 2 hàng A, 1 hàng J vào giỏ\n2. Chọn khách Bình\n3. Thanh toán trực tiếp – Tiền mặt, khách đưa 100.000\n4. Xác nhận', duLieu: 'A ×2, J ×1; khách Bình; tiền khách đưa 100.000', mongDoi: 'Thanh toán thành công; hóa đơn mã HD-dd/mm/yyyy.nnn, "Thanh toán ngay", "Đã thanh toán", người bán = nhân viên, gắn khách Bình; tồn A giảm 2, J giảm 1; trả lại tiền thừa' }, async (t) => {
  const gA = await giaBan(S.nv, S.hh.A.maHH)
  const gJ = await giaBan(S.nv, S.hh.J.maHH)
  const tonA = (await S.cq.get(`/hang-hoa/${S.hh.A.maHH}`)).data?.tongTon
  const { tt, hd } = await ban(S.nv, [{ maHH: S.hh.A.maHH, soLuong: 2, gia: gA }, { maHH: S.hh.J.maHH, soLuong: 1, gia: gJ }], { maKH: S.kh.Binh.maKH, tienKhachDua: 100000 })
  t.status(tt, 200)
  t.status(hd, [200, 201])
  const h = hd?.data ?? {}
  t.dung(MA_HD.test(h.maHD ?? '') && h.maHD.includes(ngayVN()), `Mã HĐ ${h.maHD} phải có dạng HD-${ngayVN()}.nnn`)
  t.bang(h.loaiHoaDon, 'Thanh toán ngay', 'loại hóa đơn')
  t.bang(h.trangThai, 'Đã thanh toán', 'trạng thái')
  t.bang(h.maNguoiBan, S.nv.nguoiDung.maND, 'người bán')
  t.bang(h.maKH, S.kh.Binh.maKH, 'khách hàng')
  t.bang(h.tongTienThanhToan, 2 * gA + gJ, 'tổng tiền')
  t.bang(tt.data?.tienTraLai, 100000 - (2 * gA + gJ), 'tiền trả lại')
  const tonSau = (await S.cq.get(`/hang-hoa/${S.hh.A.maHH}`)).data?.tongTon
  t.bang(tonSau, tonA - 2, 'tồn A sau bán')
  S.hd = { tienMat: h }
  return `${h.maHD} | ${h.loaiHoaDon} | ${h.trangThai} | người bán ${h.maNguoiBan} ${h.nguoiBan} | khách ${h.tenKhach} ${h.sdtKhach} | tổng ${h.tongTienThanhToan} | trả lại ${tt.data?.tienTraLai}; tồn A ${tonA} → ${tonSau}`
})
tc('TC-UC6.5-04', { ...U65, ten: 'Hóa đơn hiển thị đủ thông tin theo BR05', loai: 'Quy tắc nghiệp vụ', nguon: 'BR05', tienDieuKien: 'Đã có hóa đơn TC-UC6.5-03', buoc: 'Xem hóa đơn vừa tạo', duLieu: '-', mongDoi: 'Có mã HĐ, tên cửa hàng, ngày giờ lập, người bán, khách (họ tên, SĐT), loại, trạng thái, dòng sản phẩm (tên, ĐVT, SL, đơn giá, thành tiền), tổng tiền hàng, tổng thanh toán, số tiền đã trả, phương thức' }, async (t) => {
  const h = S.hd.tienMat
  const can = ['maHD', 'tenCuaHang', 'ngayGioLap', 'nguoiBan', 'tenKhach', 'sdtKhach', 'loaiHoaDon', 'trangThai', 'dong', 'tongTienHang', 'tongTienThanhToan', 'soTienDaTra', 'phuongThuc']
  const thieu = can.filter((k) => h[k] === undefined || h[k] === null)
  t.dung(thieu.length === 0, `Thiếu: ${thieu.join(', ')}`)
  const d = h.dong?.[0] ?? {}
  t.dung(['tenHH', 'donViTinh', 'soLuong', 'donGia', 'thanhTien'].every((k) => k in d), 'Dòng sản phẩm thiếu cột')
  t.bang(h.tenCuaHang, 'Tạp hóa Xóm Nhỏ', 'tên cửa hàng')
  return `${h.tenCuaHang} | ${h.maHD} | ${h.ngayGioLap} | ${h.phuongThuc} | đã trả ${h.soTienDaTra} | ${h.dong?.length} dòng`
})
tc('TC-UC6.5-05', { ...U65, ten: 'Tự chọn lô có hạn sử dụng gần nhất (FEFO)', loai: 'Quy tắc nghiệp vụ', nguon: 'BR11', tienDieuKien: 'Hàng B có 2 lô: 10 gói HSD +90 ngày, 10 gói HSD +20 ngày', buoc: 'Bán 3 gói B cho khách vãng lai', duLieu: 'B ×3', mongDoi: 'Lô HSD +20 ngày giảm còn 7; lô HSD +90 ngày giữ 10' }, async (t) => {
  const [loXa, loGan] = S.hh.B.lo
  const { hd } = await ban(S.nv, [{ maHH: S.hh.B.maHH, soLuong: 3, gia: 20000 }])
  t.status(hd, [200, 201])
  const xa = await tonLo(loXa)
  const gan = await tonLo(loGan)
  t.bang(gan, 7, `tồn lô gần hạn ${loGan}`)
  t.bang(xa, 10, `tồn lô xa hạn ${loXa}`)
  S.hd.vangLai = hd?.data
  return `${hd?.data?.maHD}; lô ${loGan} (HSD gần) còn ${gan}, lô ${loXa} (HSD xa) còn ${xa}`
})
tc('TC-UC6.5-06', { ...U65, ten: 'Khách vãng lai – hóa đơn không gắn khách hàng', loai: 'Luồng thay thế', nguon: 'Alternative 9.a', tienDieuKien: 'Hóa đơn TC-UC6.5-05', buoc: 'Chọn "Khách vãng lai" khi thanh toán', duLieu: '-', mongDoi: 'Hóa đơn không có mã/tên/SĐT khách' }, async (t) => {
  const h = S.hd.vangLai ?? {}
  t.dung(!h.maKH && !h.tenKhach && !h.sdtKhach, `Khách: ${h.maKH} ${h.tenKhach} ${h.sdtKhach}`)
  return `maKH=${h.maKH}, tenKhach=${h.tenKhach}, sdtKhach=${h.sdtKhach}`
})
tc('TC-UC6.5-07', { ...U65, ten: 'Mã hóa đơn tăng dần trong ngày', loai: 'Quy tắc nghiệp vụ', nguon: 'BR10', tienDieuKien: 'Đã có 2 hóa đơn liên tiếp', buoc: 'So sánh số thứ tự 2 hóa đơn', duLieu: '-', mongDoi: 'Số thứ tự hóa đơn sau = trước + 1' }, async (t) => {
  t.bang(so(S.hd.vangLai?.maHD), so(S.hd.tienMat?.maHD) + 1, 'số thứ tự')
  return `${S.hd.tienMat?.maHD} → ${S.hd.vangLai?.maHD}`
})
tc('TC-UC6.5-08', { ...U65, ten: 'Sản phẩm không đủ số lượng', loai: 'Ngoại lệ', nguon: 'Exception 6.a, BR03', tienDieuKien: 'Hàng H còn 2 chai', buoc: 'Bán 3 chai H', duLieu: 'H ×3', mongDoi: '"Sản phẩm (tên) không đủ hàng. Số lượng tồn hiện có: 2."; không tạo hóa đơn, không trừ tồn' }, async (t) => {
  const { tt } = await ban(S.nv, [{ maHH: S.hh.H.maHH, soLuong: 3, gia: 30000 }])
  const kq = t.loiNV(tt, 409, `Sản phẩm ${S.hh.H.ten} không đủ hàng. Số lượng tồn hiện có: 2`)
  t.bang(await tonLo(S.hh.H.lo[0]), 2, 'tồn H')
  return kq
})
tc('TC-UC6.5-09', { ...U65, ten: 'Cùng sản phẩm ở nhiều dòng – kiểm tra theo tổng số lượng', loai: 'Quy tắc nghiệp vụ', nguon: 'BR03', tienDieuKien: 'Hàng H còn 2 chai', buoc: 'Giỏ có 2 dòng H: 1 chai và 2 chai', duLieu: 'H ×1 + H ×2', mongDoi: 'Báo không đủ hàng (tổng 3 > 2)' }, async (t) => {
  const { tt } = await ban(S.nv, [{ maHH: S.hh.H.maHH, soLuong: 1, gia: 30000 }, { maHH: S.hh.H.maHH, soLuong: 2, gia: 30000 }])
  return t.loiNV(tt, 409, 'không đủ hàng')
})
tc('TC-UC6.5-10', { ...U65, ten: 'Lô đã hết hạn không được bán', loai: 'Quy tắc nghiệp vụ', nguon: 'BR11', tienDieuKien: 'Hàng F chỉ còn lô đã hết hạn', buoc: 'Xem tồn bán được của F; bán 1 chai F', duLieu: 'F ×1', mongDoi: 'Tồn bán được của F = 0; báo không đủ hàng' }, async (t) => {
  const f = (await sp(S.nv, S.hh.F.ten)).find((x) => x.maHH === S.hh.F.maHH)
  t.bang(f?.tonBanDuoc ?? 0, 0, 'tồn bán được của F')
  const { tt } = await ban(S.nv, [{ maHH: S.hh.F.maHH, soLuong: 1, gia: 50000 }])
  t.status(tt, 409)
  return `Tồn bán được F = ${f?.tonBanDuoc}; bán thử: ${moTa(tt)}`
})
tc('TC-UC6.5-11', { ...U65, ten: 'Thanh toán chuyển khoản QR thành công', loai: 'Luồng thay thế', nguon: 'Alternative 11.a', tienDieuKien: 'Giỏ có hàng G', buoc: '1. Chọn "Chuyển khoản QR"\n2. Ngân hàng xác nhận thành công', duLieu: 'G ×2', mongDoi: 'Tạo hóa đơn "Đã thanh toán", phương thức Chuyển khoản QR' }, async (t) => {
  const { tt, hd } = await ban(S.nv, [{ maHH: S.hh.G.maHH, soLuong: 2, gia: 12000 }], { phuongThuc: 'Chuyển khoản QR' })
  t.status(tt, 200)
  t.bang(hd?.data?.phuongThuc, 'Chuyển khoản QR', 'phương thức')
  t.bang(hd?.data?.trangThai, 'Đã thanh toán', 'trạng thái')
  S.hd.qr = hd?.data
  return `${hd?.data?.maHD} | ${hd?.data?.phuongThuc} | ${hd?.data?.trangThai}`
})
tc('TC-UC6.5-12', { ...U65, ten: 'Chuyển khoản QR không thành công – không tạo hóa đơn, không tiêu số thứ tự', loai: 'Ngoại lệ', nguon: 'Exception 11.b, BR04, BR10', tienDieuKien: 'Giỏ có hàng G', buoc: '1. Chọn QR, ngân hàng báo thất bại\n2. Thanh toán lại bằng tiền mặt', duLieu: 'G ×1', mongDoi: '"Thanh toán chưa thành công. Vui lòng thanh toán lại hoặc hủy giao dịch."; không trừ tồn; hóa đơn tiếp theo nhận số thứ tự liền sau hóa đơn trước' }, async (t) => {
  const tonG = (await S.cq.get(`/hang-hoa/${S.hh.G.maHH}`)).data?.tongTon
  const { tt } = await ban(S.nv, [{ maHH: S.hh.G.maHH, soLuong: 1, gia: 12000 }], { phuongThuc: 'Chuyển khoản QR', qr: 'ThatBai' })
  const kq = t.loiNV(tt, 402, 'Thanh toán chưa thành công. Vui lòng thanh toán lại hoặc hủy giao dịch.')
  t.bang((await S.cq.get(`/hang-hoa/${S.hh.G.maHH}`)).data?.tongTon, tonG, 'tồn G không đổi')
  const { hd } = await ban(S.nv, [{ maHH: S.hh.G.maHH, soLuong: 1, gia: 12000 }])
  t.bang(so(hd?.data?.maHD), so(S.hd.qr?.maHD) + 1, 'số thứ tự hóa đơn kế tiếp')
  return `${kq}; hóa đơn kế tiếp: ${S.hd.qr?.maHD} → ${hd?.data?.maHD}`
})
tc('TC-UC6.5-13', { ...U65, ten: 'Tiền khách đưa không đủ', loai: 'Ngoại lệ', nguon: 'Main flow 12 (xác nhận đã thu đủ)', tienDieuKien: 'Giỏ có hàng A', buoc: 'Tiền mặt, khách đưa ít hơn tổng tiền', duLieu: 'A ×1 (11.000), khách đưa 5.000', mongDoi: 'Không ghi nhận thanh toán, báo tiền khách đưa chưa đủ' }, async (t) => {
  const r = await S.nv.post('/ban-hang/thanh-toan', { maKH: null, dong: [{ maHH: S.hh.A.maHH, soLuong: 1 }], phuongThuc: 'Tiền mặt', tienKhachDua: '5000' })
  t.status(r, 400)
  t.dung(r.data?.loi?.tienKhachDua, 'Lỗi phải nằm ở trường tiền khách đưa')
  return moTa(r)
})
tc('TC-UC6.5-14', { ...U65, ten: 'Giỏ hàng rỗng không thanh toán được', loai: 'Ngoại lệ', nguon: 'Alternative 7.a.2', tienDieuKien: 'Giỏ rỗng', buoc: 'Thanh toán với giỏ rỗng', duLieu: '[]', mongDoi: 'Báo "Giỏ hàng chưa có sản phẩm"' }, async (t) => t.loiNV(await S.nv.post('/ban-hang/thanh-toan', { maKH: null, dong: [], phuongThuc: 'Tiền mặt', tienKhachDua: '1000' }), 400, 'Giỏ hàng chưa có sản phẩm'))
tc('TC-UC6.5-15', { ...U65, ten: 'Gửi hóa đơn điện tử qua SMS', loai: 'Luồng thay thế', nguon: 'Alternative 16.a, 16.a.3', tienDieuKien: 'Hóa đơn TC-UC6.5-03', buoc: 'Chọn gửi hóa đơn, kênh SMS, SĐT khách', duLieu: 'SĐT của Bình', mongDoi: 'Gửi thành công; hóa đơn vẫn "Đã thanh toán"' }, async (t) => {
  const r = await S.nv.post('/ban-hang/gui-hoa-don', { maHD: S.hd.tienMat.maHD, kenh: 'SMS', sdt: S.kh.Binh.sdt })
  t.status(r, 200)
  return `${moTa(r)} "${r.data?.thongBao}"`
})
tc('TC-UC6.5-16', { ...U65, ten: 'Gửi hóa đơn khi chưa có số điện thoại', loai: 'Luồng thay thế', nguon: 'Alternative 16.a.1', tienDieuKien: 'Hóa đơn khách vãng lai', buoc: 'Chọn gửi hóa đơn, để trống SĐT', duLieu: 'SĐT ""', mongDoi: '"Khách hàng chưa có số điện thoại. Vui lòng nhập số điện thoại"' }, async (t) => t.loiNV(await S.nv.post('/ban-hang/gui-hoa-don', { maHD: S.hd.vangLai.maHD, kenh: 'Zalo', sdt: '' }), 400, 'Khách hàng chưa có số điện thoại. Vui lòng nhập số điện thoại'))

// ================================================================== Quy tắc cần có giao dịch
tc('TC-UC4.3-05', { uc: 'UC_4.3', nhom: 'Hàng hóa, Lô hàng & Tồn kho', ten: 'Xóa hàng đã có giao dịch – chuyển "Ngừng kinh doanh", ẩn khỏi bán hàng/tồn kho/tìm kiếm', loai: 'Quy tắc nghiệp vụ', nguon: 'BR01; Exception 5b', tienDieuKien: 'Hàng H đã bán hết 2 chai (tồn = 0)', buoc: '1. Bán 2 chai H\n2. Chọn H → "Xóa" → "Đồng ý"', duLieu: 'Hàng H', mongDoi: 'Không xóa vĩnh viễn; H chuyển "Ngừng kinh doanh"; không còn hiện ở bán hàng, tồn kho, tìm kiếm' }, async (t) => {
  const { hd } = await ban(S.nv, [{ maHH: S.hh.H.maHH, soLuong: 2, gia: 30000 }])
  t.status(hd, [200, 201])
  const k = await S.cq.get(`/hang-hoa/${S.hh.H.maHH}/kiem-tra-xoa`)
  t.bang(k.data?.cheDo, 'NgungKinhDoanh', 'chế độ')
  const x = await S.cq.post(`/hang-hoa/${S.hh.H.maHH}/xoa`, { cheDo: 'NgungKinhDoanh' })
  t.status(x, 200)
  const ct = (await S.cq.get(`/hang-hoa/${S.hh.H.maHH}`)).data
  t.bang(ct?.trangThai, 'Ngừng kinh doanh', 'trạng thái')
  const banHang = (await sp(S.nv, S.hh.H.ten)).some((x) => x.maHH === S.hh.H.maHH)
  const tonKho = ((await S.cq.get(`/ton-kho?tuKhoa=${encodeURIComponent(S.hh.H.maHH)}`)).data?.danhSach ?? []).length > 0
  const timKiem = ((await S.cq.get(`/hang-hoa?tuKhoa=${encodeURIComponent(S.hh.H.ten)}&trang=1`)).data?.danhSach ?? []).length > 0
  t.dung(!banHang, 'Không được hiện ở bán hàng')
  t.dung(!tonKho, 'Không được hiện ở tồn kho')
  t.dung(!timKiem, 'Không được hiện ở tìm kiếm hàng hóa (BR01)')
  return `Kiểm tra: ${k.data?.cheDo}; ${moTa(x)} "${x.data?.thongBao}"; trạng thái ${ct?.trangThai}; hiện ở bán hàng: ${banHang}, tồn kho: ${tonKho}, tìm kiếm hàng hóa: ${timKiem}`
})
tc('TC-UC10.1-10', { uc: 'UC_10.1', nhom: 'Hàng hóa, Lô hàng & Tồn kho', ten: 'Không thêm lô cho hàng "Ngừng kinh doanh"', loai: 'Quy tắc nghiệp vụ', nguon: 'BR07; Exception 5b', tienDieuKien: 'Hàng H đã "Ngừng kinh doanh"', buoc: 'Thêm lô cho hàng H', duLieu: 'Tên H, 5, +100 ngày', mongDoi: '"Vui lòng chọn hàng hóa đang kinh doanh có tên trùng khớp."' }, async (t) => t.loiNV(await S.cq.post('/lo-hang', { tenHangHoa: S.hh.H.ten, soLuong: '5', hanSuDung: ngayISO(100) }), 400, 'Vui lòng chọn hàng hóa đang kinh doanh có tên trùng khớp.'))
tc('TC-UC8.3-07', { uc: 'UC_8.3', nhom: 'Khách hàng', ten: 'Chi tiết khách hàng – mặt hàng thường mua', loai: 'Luồng thay thế', nguon: 'Alternative 6.a, BR04, BR06', tienDieuKien: 'Khách Bình đã mua A ×2, J ×1; khách Cường chưa mua', buoc: '1. Bán thêm cho Bình: A ×3\n2. Xem chi tiết Bình và Cường', duLieu: 'Khách Bình, Cường', mongDoi: 'Bình: A (5) đứng trước J (1), tối đa 5 mặt hàng; Cường: danh sách trống' }, async (t) => {
  await ban(S.nv, [{ maHH: S.hh.A.maHH, soLuong: 3, gia: 11000 }], { maKH: S.kh.Binh.maKH })
  const b = (await S.nv.get(`/khach-hang/${S.kh.Binh.maKH}`)).data
  const ds = b?.matHangThuongMua ?? []
  t.bang(ds[0]?.maHH, S.hh.A.maHH, 'mặt hàng mua nhiều nhất')
  t.bang(ds[0]?.soLuongDaMua, 5, 'số lượng A')
  t.dung(ds.length <= 5, 'Tối đa 5 mặt hàng')
  const c = (await S.nv.get(`/khach-hang/${S.kh.An2.maKH}`)).data
  t.bang(c?.matHangThuongMua?.length ?? 0, 0, 'mặt hàng thường mua của khách chưa mua')
  return `Bình: ${ds.map((x) => `${x.tenHH} (${x.soLuongDaMua})`).join(', ')}; Cường: ${c?.matHangThuongMua?.length ?? 0} mặt hàng`
})

// ================================================================== UC_6.1 Tìm kiếm lịch sử bán hàng
const tim = (p, dk) => p.get(`/hoa-don?${new URLSearchParams({ ...dk, trang: '1' })}`)
tc('TC-UC6.1-01', { ...U61, ten: 'Chưa nhập điều kiện tìm kiếm', loai: 'Ngoại lệ', nguon: 'Exception 4.a, BR01', tienDieuKien: 'Người dùng ở màn hình tìm kiếm lịch sử', buoc: 'Không nhập điều kiện → "Tìm kiếm"', duLieu: '-', mongDoi: '"Vui lòng nhập ít nhất một điều kiện."' }, async (t) => t.loiNV(await tim(S.nv, {}), 400, 'Vui lòng nhập ít nhất một điều kiện.'))
tc('TC-UC6.1-02', { ...U61, ten: 'Tìm theo mã hóa đơn – khớp chính xác', loai: 'Luồng chính', nguon: 'Main flow 1–6, BR02', tienDieuKien: 'Có hóa đơn TC-UC6.5-03', buoc: 'Nhập đúng mã hóa đơn → "Tìm kiếm"', duLieu: 'Mã HĐ tiền mặt', mongDoi: 'Đúng 1 hóa đơn, gồm mã, ngày giờ, khách, tổng tiền, trạng thái' }, async (t) => {
  const r = await tim(S.nv, { ma: S.hd.tienMat.maHD })
  t.status(r, 200)
  t.bang(r.data?.danhSach?.length, 1, 'số kết quả')
  const d = r.data?.danhSach?.[0] ?? {}
  t.dung(['maHD', 'ngayGioLap', 'tenKhach', 'tongTien', 'trangThai'].every((k) => k in d), 'Đủ cột')
  return `${d.maHD} | ${d.ngayGioLap} | ${d.tenKhach} | ${d.tongTien} | ${d.trangThai}`
})
tc('TC-UC6.1-03', { ...U61, ten: 'Mã hóa đơn sai định dạng', loai: 'Ngoại lệ', nguon: 'Exception 4.a, BR02', tienDieuKien: '-', buoc: 'Nhập mã "HD123"', duLieu: 'HD123', mongDoi: 'Thông báo nêu rõ mã hóa đơn sai định dạng' }, async (t) => {
  const r = await tim(S.nv, { ma: 'HD123' })
  t.status(r, 400)
  t.dung(r.data?.loi?.ma, 'Lỗi phải nằm ở trường mã hóa đơn')
  return moTa(r)
})
tc('TC-UC6.1-04', { ...U61, ten: 'Ô tên/SĐT chỉ gồm chữ số – tìm theo số điện thoại (một phần)', loai: 'Quy tắc nghiệp vụ', nguon: 'BR02', tienDieuKien: 'Khách Bình có hóa đơn', buoc: 'Nhập 5 số cuối SĐT Bình (có dấu gạch ngang)', duLieu: '5 số cuối, dạng "12-345"', mongDoi: 'Chỉ trả về hóa đơn của khách Bình' }, async (t) => {
  const s = S.kh.Binh.sdt.slice(-5)
  const r = await tim(S.nv, { khach: `${s.slice(0, 2)}-${s.slice(2)}` })
  const ds = r.data?.danhSach ?? []
  t.dung(ds.length >= 2 && ds.every((d) => d.tenKhach === S.kh.Binh.hoTen), `Kết quả: ${ds.map((d) => d.tenKhach).join(', ')}`)
  return `${moTa(r)}; ${ds.length} hóa đơn`
})
tc('TC-UC6.1-05', { ...U61, ten: 'Tìm theo một phần tên khách, không phân biệt hoa thường', loai: 'Quy tắc nghiệp vụ', nguon: 'BR02', tienDieuKien: 'Khách Bình có hóa đơn', buoc: 'Nhập "thử bình …" (chữ thường)', duLieu: 'thử bình + hậu tố lần chạy', mongDoi: 'Trả về hóa đơn của khách Bình' }, async (t) => {
  const ds = (await tim(S.nv, { khach: `thử bình ${CHU}` })).data?.danhSach ?? []
  t.dung(ds.length >= 1 && ds.every((d) => d.tenKhach === S.kh.Binh.hoTen), `Kết quả: ${ds.map((d) => d.tenKhach).join(', ')}`)
  return `${ds.length} hóa đơn`
})
tc('TC-UC6.1-06', { ...U61, ten: 'Ngày lập ở tương lai', loai: 'Ngoại lệ', nguon: 'Exception 4.a, BR02', tienDieuKien: '-', buoc: 'Chọn từ ngày = ngày mai', duLieu: ngayISO(1), mongDoi: 'Báo ngày lập không hợp lệ / ở tương lai' }, async (t) => t.loiNV(await tim(S.nv, { tuNgay: ngayISO(1) }), 400, 'không ở tương lai'))
tc('TC-UC6.1-07', { ...U61, ten: 'Từ ngày sau đến ngày', loai: 'Ngoại lệ', nguon: 'Exception 4.a, BR02', tienDieuKien: '-', buoc: 'Từ ngày hôm nay, đến ngày hôm qua', duLieu: `${ngayISO(0)} → ${ngayISO(-1)}`, mongDoi: 'Báo ngày bắt đầu không được sau ngày kết thúc' }, async (t) => {
  const r = await tim(S.nv, { tuNgay: ngayISO(0), denNgay: ngayISO(-1) })
  t.status(r, 400)
  return moTa(r)
})
tc('TC-UC6.1-08', { ...U61, ten: 'Lọc theo trạng thái và ngày – kết quả mới nhất trước', loai: 'Quy tắc nghiệp vụ', nguon: 'BR01, BR03', tienDieuKien: 'Hôm nay có nhiều hóa đơn', buoc: 'Ngày lập = hôm nay, trạng thái "Đã thanh toán"', duLieu: `${ngayISO(0)}, Đã thanh toán`, mongDoi: 'Mọi dòng "Đã thanh toán", sắp xếp thời gian lập giảm dần' }, async (t) => {
  const ds = (await tim(S.nv, { tuNgay: ngayISO(0), denNgay: ngayISO(0), trangThai: 'Đã thanh toán' })).data?.danhSach ?? []
  t.dung(ds.length > 0 && ds.every((d) => d.trangThai === 'Đã thanh toán'), 'Mọi dòng phải là Đã thanh toán')
  t.dung(ds.every((d, i) => i === 0 || ds[i - 1].ngayGioLap >= d.ngayGioLap), 'Sắp xếp mới nhất trước')
  return `${ds.length} hóa đơn, đầu ${ds[0]?.maHD} (${ds[0]?.ngayGioLap}), cuối ${ds.at(-1)?.maHD}`
})
tc('TC-UC6.1-09', { ...U61, ten: 'Nhiều điều kiện không có hóa đơn thỏa mãn đồng thời', loai: 'Ngoại lệ', nguon: 'Exception 5.a, BR01', tienDieuKien: 'Khách Bình chưa có hóa đơn "Đã hủy"', buoc: 'Tên "thử bình" + trạng thái "Đã hủy"', duLieu: 'thử bình, Đã hủy', mongDoi: '"Không tìm thấy hóa đơn phù hợp."' }, async (t) => {
  const r = await tim(S.nv, { khach: `thử bình ${CHU}`, trangThai: 'Đã hủy' })
  const rong = r.status === 200 && (r.data?.danhSach ?? []).length === 0
  if (!rong) t.loiNV(r, 404, 'Không tìm thấy hóa đơn phù hợp.')
  return rong ? 'HTTP 200, danh sách rỗng (giao diện hiển thị "Không tìm thấy hóa đơn phù hợp.")' : moTa(r)
})
tc('TC-UC6.1-10', { ...U61, ten: 'Xem chi tiết hóa đơn – Chủ quán và Nhân viên thấy như nhau', loai: 'Luồng chính', nguon: 'Main flow 7–8, BR04, BR05', tienDieuKien: 'Có hóa đơn TC-UC6.5-03', buoc: 'Chọn hóa đơn để xem chi tiết (bằng 2 vai trò)', duLieu: 'Mã HĐ tiền mặt', mongDoi: 'Chi tiết đầy đủ theo BR04, giống nhau cho 2 vai trò' }, async (t) => {
  const a = await S.nv.get(`/hoa-don/chi-tiet?ma=${encodeURIComponent(S.hd.tienMat.maHD)}`)
  const b = await S.cq.get(`/hoa-don/chi-tiet?ma=${encodeURIComponent(S.hd.tienMat.maHD)}`)
  t.status(a, 200)
  t.status(b, 200)
  t.bang(JSON.stringify(a.data), JSON.stringify(b.data), 'nội dung 2 vai trò')
  return `${a.data?.maHD}: ${a.data?.dong?.length} dòng, tổng ${a.data?.tongTienThanhToan}, ${a.data?.phuongThuc}`
})
