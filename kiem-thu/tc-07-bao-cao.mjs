// Nhóm 7 – Báo cáo (UC_5.1–5.4).
import { S, moTa, ngayISO, tc } from './lib.mjs'
import { ban } from './tc-04-ban-hang.mjs'

const NHOM = 'Báo cáo'
const U = (uc) => ({ uc, nhom: NHOM })
const H = ngayISO(0)
const q = (o) => new URLSearchParams(Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined))).toString()
const bc = (loai, o) => S.cq.get(`/bao-cao/${loai}?${q(o)}`)
const KHONG_GD = { tuNgay: '2026-01-01', denNgay: '2026-01-31' }

// ------------------------------------------------------------------ Kiểm tra kỳ báo cáo dùng chung cho 5.1, 5.2, 5.3
for (const [uc, loai, ten] of [['UC_5.1', 'loi-nhuan', 'lợi nhuận'], ['UC_5.2', 'doanh-thu', 'doanh thu'], ['UC_5.3', 'so-luong-ban', 'số lượng bán ra']]) {
  const ma = uc.replace('UC_', 'TC-UC')
  const ky = (so, tenTc, loaiTc, nguon, duLieu, mongDoi, o, msg) =>
    tc(`${ma}-${so}`, { ...U(uc), ten: tenTc, loai: loaiTc, nguon, tienDieuKien: `Chủ quán mở báo cáo ${ten}`, buoc: '1. Chọn kỳ báo cáo\n2. Nhấn "Xác nhận"', duLieu, mongDoi }, async (t) => t.loiNV(await bc(loai, o), [400, 404], msg))
  ky('01', 'Khoảng tùy chọn bỏ trống ngày bắt đầu', 'Ngoại lệ', 'Exception 3a', 'Từ ngày ""', '"Không được để trống!"', { denNgay: H }, 'Không được để trống!')
  ky('02', 'Ngày bắt đầu lớn hơn ngày kết thúc', 'Ngoại lệ', 'Exception 4a, BR01', `${H} → ${ngayISO(-3)}`, '"Ngày bắt đầu không được lớn hơn ngày kết thúc!"', { tuNgay: H, denNgay: ngayISO(-3) }, 'Ngày bắt đầu không được lớn hơn ngày kết thúc!')
  ky('03', 'Kỳ báo cáo không có giao dịch bán hàng', 'Ngoại lệ', 'Exception 5a', '01/01/2026 → 31/01/2026', '"Không tìm thấy dữ liệu bán hàng!"', KHONG_GD, 'Không tìm thấy dữ liệu bán hàng!')
  ky('04', 'Kỳ báo cáo vượt quá ngày hiện tại', 'Quy tắc nghiệp vụ', 'BR01 (SUA_BAO_CAO 3.9–3.11)', `${H} → ${ngayISO(5)}`, 'Báo kỳ báo cáo không được vượt quá ngày hiện tại', { tuNgay: H, denNgay: ngayISO(5) }, 'Kỳ báo cáo không được vượt quá ngày hiện tại!')
  tc(`${ma}-05`, { ...U(uc), ten: 'Kỳ báo cáo một ngày (ngày bắt đầu = ngày kết thúc)', loai: 'Quy tắc nghiệp vụ', nguon: 'BR01 (SUA_BAO_CAO: cho phép bắt đầu = kết thúc)', tienDieuKien: 'Hôm nay có giao dịch', buoc: 'Chọn kỳ "Ngày" = hôm nay → "Xác nhận"', duLieu: H, mongDoi: 'Hiển thị báo cáo' }, async (t) => {
    const r = await bc(loai, { tuNgay: H, denNgay: H })
    t.status(r, 200)
    return `${moTa(r)}; ${r.data?.dong?.length} dòng`
  })
}

// ================================================================== UC_5.1 Lợi nhuận
tc('TC-UC5.1-06', { ...U('UC_5.1'), ten: 'Báo cáo lợi nhuận – tổng lợi nhuận = doanh thu − giá vốn', loai: 'Luồng chính', nguon: 'Main flow 1–7, BR02', tienDieuKien: 'Hôm nay có nhiều hóa đơn', buoc: 'Chọn kỳ "Ngày" hôm nay → "Xác nhận"', duLieu: H, mongDoi: 'Hiển thị tổng doanh thu, tổng giá vốn, tổng lợi nhuận và lợi nhuận từng sản phẩm; lợi nhuận = doanh thu − giá vốn (tổng và từng dòng)' }, async (t) => {
  const r = (await bc('loi-nhuan', { tuNgay: H, denNgay: H })).data
  t.bang(r?.tongLoiNhuan, r?.tongDoanhThu - r?.tongGiaVon, 'tổng lợi nhuận')
  const sai = (r?.dong ?? []).filter((d) => d.loiNhuan !== d.doanhThu - d.giaVon)
  t.dung(sai.length === 0, `Dòng sai: ${sai.map((d) => d.tenHH).join(', ')}`)
  const tongDong = (r?.dong ?? []).reduce((s, d) => s + d.doanhThu, 0)
  t.bang(tongDong, r?.tongDoanhThu, 'tổng doanh thu các dòng')
  const a = r?.dong?.find((d) => d.maHH === S.hh.A.maHH)
  return `Doanh thu ${r?.tongDoanhThu}, giá vốn ${r?.tongGiaVon}, lợi nhuận ${r?.tongLoiNhuan}; ${r?.dong?.length} sản phẩm; ví dụ ${a?.tenHH}: ${a?.doanhThu} − ${a?.giaVon} = ${a?.loiNhuan}`
})
tc('TC-UC5.1-07', { ...U('UC_5.1'), ten: 'So sánh lợi nhuận – chênh lệch và tỷ lệ %', loai: 'Luồng chính', nguon: 'Main flow 8–15, BR06, BR07', tienDieuKien: 'Ngày cách đây 7 ngày có 1 hóa đơn (lùi ngày trong CSDL kiểm thử)', buoc: '1. Kỳ báo cáo = hôm nay\n2. "So sánh lợi nhuận", kỳ so sánh = ngày −7\n3. "Xác nhận"', duLieu: `${H} so với ${ngayISO(-7)}`, mongDoi: 'Hiển thị lợi nhuận 2 kỳ; chênh lệch = kỳ báo cáo − kỳ so sánh; tỷ lệ = chênh lệch / kỳ so sánh × 100' }, async (t) => {
  const r = await bc('so-sanh', { chiTieu: 'loi-nhuan', tuNgay: H, denNgay: H, tuNgaySoSanh: ngayISO(-7), denNgaySoSanh: ngayISO(-7) })
  t.status(r, 200)
  const d = r.data ?? {}
  t.bang(d.chenhLech, d.kyBaoCao - d.kySoSanh, 'chênh lệch')
  t.dung(Math.abs((d.tyLe ?? 0) - (d.chenhLech / d.kySoSanh) * 100) < 0.1, `Tỷ lệ ${d.tyLe}`)
  return `Kỳ báo cáo ${d.kyBaoCao}, kỳ so sánh ${d.kySoSanh}, chênh lệch ${d.chenhLech}, tỷ lệ ${d.tyLe}%`
})
tc('TC-UC5.1-08', { ...U('UC_5.1'), ten: 'Kỳ so sánh trùng kỳ báo cáo', loai: 'Ngoại lệ', nguon: 'Exception 12b, BR08', tienDieuKien: 'Đã xem báo cáo hôm nay', buoc: 'Chọn kỳ so sánh = hôm nay', duLieu: `${H} so với ${H}`, mongDoi: '"Kỳ so sánh không được trùng kỳ báo cáo!"' }, async (t) => t.loiNV(await bc('so-sanh', { chiTieu: 'loi-nhuan', tuNgay: H, denNgay: H, tuNgaySoSanh: H, denNgaySoSanh: H }), 400, 'Kỳ so sánh không được trùng kỳ báo cáo!'))
tc('TC-UC5.1-09', { ...U('UC_5.1'), ten: 'Kỳ so sánh không có giao dịch', loai: 'Ngoại lệ', nguon: 'Exception 13a', tienDieuKien: 'Tháng 01/2026 không có giao dịch', buoc: 'Chọn kỳ so sánh tháng 01/2026', duLieu: '01/2026', mongDoi: '"Không tìm thấy dữ liệu của kỳ so sánh"' }, async (t) => t.loiNV(await bc('so-sanh', { chiTieu: 'loi-nhuan', tuNgay: H, denNgay: H, tuNgaySoSanh: KHONG_GD.tuNgay, denNgaySoSanh: KHONG_GD.denNgay }), [400, 404], 'Không tìm thấy dữ liệu của kỳ so sánh'))
tc('TC-UC5.1-10', { ...U('UC_5.1'), ten: 'Kỳ so sánh có ngày bắt đầu lớn hơn ngày kết thúc', loai: 'Ngoại lệ', nguon: 'Exception 12a', tienDieuKien: 'Đã xem báo cáo hôm nay', buoc: 'Kỳ so sánh: −1 → −5', duLieu: `${ngayISO(-1)} → ${ngayISO(-5)}`, mongDoi: '"Ngày bắt đầu không được lớn hơn ngày kết thúc!"' }, async (t) => t.loiNV(await bc('so-sanh', { chiTieu: 'loi-nhuan', tuNgay: H, denNgay: H, tuNgaySoSanh: ngayISO(-1), denNgaySoSanh: ngayISO(-5) }), 400, 'Ngày bắt đầu không được lớn hơn ngày kết thúc!'))

// ================================================================== UC_5.2 Doanh thu
tc('TC-UC5.2-06', { ...U('UC_5.2'), ten: 'Báo cáo doanh thu – tổng, số đơn, theo sản phẩm, theo phương thức', loai: 'Luồng chính', nguon: 'Main flow 1–7', tienDieuKien: 'Hôm nay có hóa đơn tiền mặt, chuyển khoản, ghi nợ', buoc: 'Chọn kỳ hôm nay → "Xác nhận"', duLieu: H, mongDoi: 'Hiển thị tổng doanh thu, số đơn hàng, doanh thu từng sản phẩm, doanh thu tiền mặt / chuyển khoản / ghi nợ (đều > 0)' }, async (t) => {
  const r = (await bc('doanh-thu', { tuNgay: H, denNgay: H })).data
  t.dung(r?.soDonHang > 0 && r?.tienMat > 0 && r?.chuyenKhoan > 0 && r?.ghiNo > 0, `Số đơn ${r?.soDonHang}, TM ${r?.tienMat}, CK ${r?.chuyenKhoan}, nợ ${r?.ghiNo}`)
  const tongDong = (r?.dong ?? []).reduce((s, d) => s + d.doanhThu, 0)
  t.bang(tongDong, r?.tongDoanhThu, 'tổng doanh thu các dòng')
  return `Tổng ${r?.tongDoanhThu}; ${r?.soDonHang} đơn; tiền mặt ${r?.tienMat}, chuyển khoản ${r?.chuyenKhoan}, ghi nợ ${r?.ghiNo}; ${r?.dong?.length} sản phẩm`
})
tc('TC-UC5.2-07', { ...U('UC_5.2'), ten: 'Hóa đơn bị hủy không còn tính vào doanh thu', loai: 'Quy tắc nghiệp vụ', nguon: 'BR02; UC_6.3 BR08', tienDieuKien: 'Hôm nay có doanh thu', buoc: '1. Xem doanh thu hôm nay\n2. Bán G ×5 (60.000 đ), xem lại\n3. Hủy hóa đơn đó, xem lại', duLieu: 'G ×5', mongDoi: 'Doanh thu tăng 60.000 sau khi bán, rồi giảm đúng 60.000 sau khi hủy' }, async (t) => {
  const dt = async () => (await bc('doanh-thu', { tuNgay: H, denNgay: H })).data?.tongDoanhThu
  const d0 = await dt()
  const { hd } = await ban(S.nv, [{ maHH: S.hh.G.maHH, soLuong: 5 }])
  const d1 = await dt()
  await S.cq.post('/huy-hoa-don', { maHD: hd?.data?.maHD, khachChuaNhanHang: true, lyDoHuy: 'Thử báo cáo' })
  const d2 = await dt()
  t.bang(d1 - d0, hd?.data?.tongTienThanhToan, 'tăng sau bán')
  t.bang(d2, d0, 'doanh thu sau hủy')
  return `Doanh thu ${d0} → bán ${hd?.data?.maHD} → ${d1} → hủy → ${d2}`
})
tc('TC-UC5.2-08', { ...U('UC_5.2'), ten: 'So sánh doanh thu – chênh lệch và tỷ lệ %', loai: 'Luồng chính', nguon: 'Main flow 8–15, BR05, BR06', tienDieuKien: 'Ngày −6 có hóa đơn', buoc: 'Kỳ báo cáo hôm nay, kỳ so sánh ngày −6', duLieu: `${H} so với ${ngayISO(-6)}`, mongDoi: 'Chênh lệch = kỳ báo cáo − kỳ so sánh; tỷ lệ = chênh lệch / kỳ so sánh × 100' }, async (t) => {
  const r = await bc('so-sanh', { chiTieu: 'doanh-thu', tuNgay: H, denNgay: H, tuNgaySoSanh: ngayISO(-6), denNgaySoSanh: ngayISO(-6) })
  t.status(r, 200)
  const d = r.data ?? {}
  t.bang(d.chenhLech, d.kyBaoCao - d.kySoSanh, 'chênh lệch')
  t.dung(Math.abs((d.tyLe ?? 0) - (d.chenhLech / d.kySoSanh) * 100) < 0.1, `Tỷ lệ ${d.tyLe}`)
  return `Kỳ báo cáo ${d.kyBaoCao}, kỳ so sánh ${d.kySoSanh}, chênh lệch ${d.chenhLech}, tỷ lệ ${d.tyLe}%`
})
tc('TC-UC5.2-09', { ...U('UC_5.2'), ten: 'Đơn ghi nợ tính doanh thu theo ngày tạo đơn', loai: 'Quy tắc nghiệp vụ', nguon: 'BR04', tienDieuKien: 'Hóa đơn nợ của Quen Bảo lập ngày −31, đã thanh toán hôm nay', buoc: 'Xem doanh thu ngày −31', duLieu: ngayISO(-31), mongDoi: 'Ngày −31 có doanh thu ghi nợ (dù khách trả hôm nay)' }, async (t) => {
  const r = (await bc('doanh-thu', { tuNgay: ngayISO(-31), denNgay: ngayISO(-31) })).data
  t.dung(r?.ghiNo > 0, `Doanh thu ghi nợ ngày −31: ${r?.ghiNo}`)
  return `Ngày ${ngayISO(-31)}: tổng ${r?.tongDoanhThu}, ghi nợ ${r?.ghiNo}`
})
tc('TC-UC5.2-10', { ...U('UC_5.2'), ten: 'Nhân viên không được xem báo cáo', loai: 'Phân quyền', nguon: 'Actors: Chủ quán; Security NFR', tienDieuKien: 'Nhân viên đã đăng nhập', buoc: 'Nhân viên mở báo cáo lợi nhuận, doanh thu, tồn kho', duLieu: 'Phiên nhanvien1', mongDoi: 'Bị từ chối (403)' }, async (t) => {
  const a = await S.nv.get(`/bao-cao/loi-nhuan?tuNgay=${H}&denNgay=${H}`)
  const b = await S.nv.get(`/bao-cao/doanh-thu?tuNgay=${H}&denNgay=${H}`)
  const c = await S.nv.get('/bao-cao/ton-kho?trangThai=T%E1%BA%A5t%20c%E1%BA%A3')
  for (const r of [a, b, c]) t.status(r, 403)
  return `Lợi nhuận ${a.status}, doanh thu ${b.status}, tồn kho ${c.status}`
})

// ================================================================== UC_5.3 Số lượng bán ra
tc('TC-UC5.3-06', { ...U('UC_5.3'), ten: 'Báo cáo số lượng bán ra theo sản phẩm', loai: 'Luồng chính', nguon: 'Main flow 1–7, BR02', tienDieuKien: 'Hôm nay có bán hàng', buoc: 'Chọn kỳ hôm nay → "Xác nhận"', duLieu: H, mongDoi: 'Danh sách gồm tên sản phẩm, nhóm hàng, ĐVT, số lượng bán' }, async (t) => {
  const r = (await bc('so-luong-ban', { tuNgay: H, denNgay: H })).data
  const d = r?.dong?.[0] ?? {}
  t.dung(['tenHH', 'nhomHang', 'donViTinh', 'soLuongBan'].every((k) => k in d), 'Đủ cột')
  return (r?.dong ?? []).slice(0, 5).map((x) => `${x.tenHH} | ${x.nhomHang} | ${x.donViTinh} | ${x.soLuongBan}`).join('\n')
})
tc('TC-UC5.3-07', { ...U('UC_5.3'), ten: 'Top 3 bán chạy – giảm dần', loai: 'Luồng chính', nguon: 'Main flow 8–11, BR04', tienDieuKien: 'Hôm nay có bán hàng', buoc: 'Chọn "Top bán chạy", nhập 3', duLieu: '3', mongDoi: '3 sản phẩm, số lượng bán giảm dần' }, async (t) => {
  const ds = (await bc('so-luong-ban', { tuNgay: H, denNgay: H, top: 'chay', soLuong: '3' })).data?.dong ?? []
  t.bang(ds.length, 3, 'số dòng')
  t.dung(ds.every((d, i) => i === 0 || ds[i - 1].soLuongBan >= d.soLuongBan), 'Phải giảm dần')
  return ds.map((d) => `${d.tenHH}: ${d.soLuongBan}`).join('; ')
})
tc('TC-UC5.3-08', { ...U('UC_5.3'), ten: 'Top bán chậm – tăng dần, gồm cả sản phẩm bán được 0', loai: 'Luồng chính', nguon: 'Main flow 8–11, BR04, BR05', tienDieuKien: 'Có hàng chưa bán được (hàng "Sau xoa", "Trang xx")', buoc: 'Chọn "Top bán chậm", nhập 5', duLieu: '5', mongDoi: '5 sản phẩm tăng dần; có sản phẩm số lượng 0' }, async (t) => {
  const ds = (await bc('so-luong-ban', { tuNgay: H, denNgay: H, top: 'cham', soLuong: '5' })).data?.dong ?? []
  t.bang(ds.length, 5, 'số dòng')
  t.dung(ds.every((d, i) => i === 0 || ds[i - 1].soLuongBan <= d.soLuongBan), 'Phải tăng dần')
  t.dung(ds.some((d) => d.soLuongBan === 0), 'Phải có sản phẩm bán được 0')
  return ds.map((d) => `${d.tenHH}: ${d.soLuongBan}`).join('; ')
})
tc('TC-UC5.3-09', { ...U('UC_5.3'), ten: 'Số lượng Top không hợp lệ', loai: 'Ngoại lệ', nguon: 'Main flow 10', tienDieuKien: '-', buoc: 'Chọn "Top bán chạy", nhập "0"', duLieu: '0', mongDoi: 'Báo số lượng không hợp lệ' }, async (t) => {
  const r = await bc('so-luong-ban', { tuNgay: H, denNgay: H, top: 'chay', soLuong: '0' })
  t.status(r, 400)
  return moTa(r)
})

// ================================================================== UC_5.4 Tồn kho
const tonKho = async (trangThai) => (await bc('ton-kho', { trangThai })).data?.dong ?? []
tc('TC-UC5.4-01', { ...U('UC_5.4'), ten: 'Báo cáo tồn kho "Tất cả" – theo lô', loai: 'Luồng chính', nguon: 'Main flow 1–6 (SUA_BAO_CAO 3.12), BR01, BR03', tienDieuKien: 'Có nhiều lô hàng', buoc: 'Chọn "Tất cả" → "Xem báo cáo"', duLieu: 'Tất cả', mongDoi: 'Danh sách theo lô gồm mã lô, tên, ĐVT, số lượng tồn, HSD, trạng thái' }, async (t) => {
  const ds = await tonKho('Tất cả')
  t.dung(ds.length > 0 && ['maLo', 'tenHH', 'donViTinh', 'soLuongTon', 'hanSuDung', 'trangThai'].every((k) => k in ds[0]), 'Đủ cột')
  return `${ds.length} lô; ví dụ: ${ds.slice(0, 3).map((d) => `${d.maLo} ${d.tenHH} tồn ${d.soLuongTon} HSD ${d.hanSuDung} [${d.trangThai.join(', ')}]`).join(' | ')}`
})
for (const [so, trangThai, k, nguon] of [['02', 'Hết hàng', 'K', 'BR02: tồn = 0'], ['03', 'Sắp hết hạn', 'D', 'BR02, BR05: số ngày còn lại ≤ ngưỡng'], ['04', 'Hết hạn', 'F', 'BR02: ngày hiện tại ≥ HSD và tồn > 0']]) {
  tc(`TC-UC5.4-${so}`, { ...U('UC_5.4'), ten: `Lọc "${trangThai}"`, loai: 'Quy tắc nghiệp vụ', nguon, tienDieuKien: `Lô của hàng ${k} thỏa điều kiện "${trangThai}"`, buoc: `Chọn "${trangThai}" → "Xem báo cáo"`, duLieu: trangThai, mongDoi: `Có lô của hàng ${k}; mọi dòng đều có trạng thái "${trangThai}"` }, async (t) => {
    const ds = await tonKho(trangThai)
    t.dung(ds.some((d) => d.maLo === S.hh[k].lo[0]), `Phải có lô ${S.hh[k].lo[0]}`)
    t.dung(ds.every((d) => d.trangThai.includes(trangThai)), 'Mọi dòng đúng trạng thái')
    return `${ds.length} lô: ${ds.slice(0, 4).map((d) => `${d.maLo} ${d.tenHH} tồn ${d.soLuongTon} HSD ${d.hanSuDung}`).join(' | ')}`
  })
}
tc('TC-UC5.4-05', { ...U('UC_5.4'), ten: 'Xem báo cáo không làm thay đổi cảnh báo tồn kho', loai: 'Quy tắc nghiệp vụ', nguon: 'BR06', tienDieuKien: '-', buoc: 'Đếm cảnh báo → xem báo cáo tồn kho 3 lần → đếm lại', duLieu: '-', mongDoi: 'Số lượng và trạng thái cảnh báo không đổi' }, async (t) => {
  const dem = async () => JSON.stringify((await S.cq.get('/ton-kho/canh-bao?caDaXuLy=true')).data?.soLuongTheoLoai)
  const a = await dem()
  for (const tt of ['Tất cả', 'Hết hạn', 'Sắp hết hàng']) await tonKho(tt)
  const b = await dem()
  t.bang(b, a, 'số cảnh báo theo loại')
  return `Trước: ${a}; sau: ${b}`
})
