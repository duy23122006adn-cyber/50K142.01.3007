// Nhóm 6 – Hủy hóa đơn (UC_6.3), Xử lý đổi trả (UC_6.2), Duyệt phiếu đổi trả (UC_6.4).
import { S, moTa, sql, tc } from './lib.mjs'
import { ban } from './tc-04-ban-hang.mjs'

const NHOM = 'Hủy hóa đơn & Đổi trả'
const U = (uc) => ({ uc, nhom: NHOM })
const DAT = ['Còn nguyên vẹn', 'Chưa mở bao bì', 'Chưa qua sử dụng']
const LOI = [400, 409, 422]
const ctHD = async (ma) => (await S.cq.get(`/hoa-don/chi-tiet?ma=${encodeURIComponent(ma)}`)).data
const tongTon = async (maHH) => (await S.cq.get(`/hang-hoa/${maHH}`)).data?.tongTon
const kiemHuy = (p, ma) => p.get(`/huy-hoa-don/kiem-tra?ma=${encodeURIComponent(ma)}`)
const huy = (p, maHD, khachChuaNhanHang = true, lyDoHuy = 'Khách đổi ý') => p.post('/huy-hoa-don', { maHD, khachChuaNhanHang, lyDoHuy })
const phieu = (maHD, loaiPhieu, dong, doi = {}) => ({ maHD, loaiPhieu, dong, tinhTrang: DAT, loiNhaSanXuat: false, moTaLoi: null, lyDoDoiTra: 'Khách không dùng', ...doi })
const lap = (p, body) => p.post('/doi-tra/phieu', body)
const xem = async (ma) => (await S.cq.get(`/doi-tra/phieu?ma=${encodeURIComponent(ma)}`)).data
/** Lùi ngày lập hóa đơn (CSDL kiểm thử) để giả lập hóa đơn đã qua N ngày. */
const lui = (maHD, ngay) => sql(`UPDATE HoaDon SET NgayGioLap = DATEADD(DAY,-${ngay},NgayGioLap) WHERE MaHD='${maHD}'`)

tc('TC-CB-06', { uc: 'Chuẩn bị', nhom: NHOM, ten: 'Tạo các hóa đơn dùng cho hủy và đổi trả', loai: 'Chuẩn bị', nguon: 'UC_6.5', tienDieuKien: 'Nhân viên đã đăng nhập', buoc: 'Bán 7 hóa đơn tiền mặt', duLieu: 'Huy1 (C ×6 cho Bình), Huy2 (G ×1), DT1 (I ×3, J ×2 cho Bình), DT2 (J ×2), DT3 (I ×2), Qua7 (G ×1), Ngay7 (G ×1)', mongDoi: 'Tạo đủ' }, async (t) => {
  S.x = {}
  const mua = async (k, dong, maKH = null) => {
    const { hd } = await ban(S.nv, dong, { maKH })
    t.status(hd, [200, 201])
    S.x[k] = hd?.data
  }
  await mua('Huy1', [{ maHH: S.hh.C.maHH, soLuong: 6 }], S.kh.Binh.maKH)
  await mua('Huy2', [{ maHH: S.hh.G.maHH, soLuong: 1 }])
  await mua('DT1', [{ maHH: S.hh.I.maHH, soLuong: 3 }, { maHH: S.hh.J.maHH, soLuong: 2 }], S.kh.Binh.maKH)
  await mua('DT2', [{ maHH: S.hh.J.maHH, soLuong: 2 }])
  await mua('DT3', [{ maHH: S.hh.I.maHH, soLuong: 2 }])
  await mua('Qua7', [{ maHH: S.hh.G.maHH, soLuong: 1 }])
  await mua('Ngay7', [{ maHH: S.hh.G.maHH, soLuong: 1 }])
  lui(S.x.Qua7.maHD, 7) // lập cách đây 7 ngày → hôm nay là ngày thứ 8
  lui(S.x.Ngay7.maHD, 6) // lập cách đây 6 ngày → hôm nay là ngày thứ 7
  return Object.entries(S.x).map(([k, v]) => `${k}=${v?.maHD}`).join('; ')
})

// ================================================================== UC_6.3 Hủy hóa đơn
tc('TC-UC6.3-01', { ...U('UC_6.3'), ten: 'Kiểm tra điều kiện hủy hóa đơn hợp lệ', loai: 'Luồng chính', nguon: 'Main flow 5–8, 13, BR06', tienDieuKien: 'Hóa đơn Huy1 "Đã thanh toán", chưa có đổi trả', buoc: 'Chọn hóa đơn Huy1 → "Hủy hóa đơn bán hàng"', duLieu: 'Huy1 (C ×6 = 24.000 đ)', mongDoi: 'Đủ điều kiện hủy; số lượng hoàn kho 6; số tiền cần hoàn = 24.000 đ' }, async (t) => {
  const r = await kiemHuy(S.cq, S.x.Huy1.maHD)
  t.status(r, 200)
  t.bang(r.data?.duocHuy, true, 'được hủy')
  t.bang(r.data?.soLuongHoanKho, 6, 'số lượng hoàn kho')
  t.bang(r.data?.soTienCanHoan, S.x.Huy1.tongTienThanhToan, 'số tiền cần hoàn')
  return `duocHuy=${r.data?.duocHuy}, hoàn kho ${r.data?.soLuongHoanKho}, cần hoàn ${r.data?.soTienCanHoan}, giảm doanh thu ${r.data?.giamDoanhThu}`
})
tc('TC-UC6.3-02', { ...U('UC_6.3'), ten: 'Khách đã nhận hàng – không hủy được', loai: 'Luồng thay thế', nguon: 'Alternative 10.a, BR02', tienDieuKien: 'Hóa đơn Huy1', buoc: 'Xác nhận "Khách đã nhận hàng"', duLieu: 'khachChuaNhanHang = false', mongDoi: '"Khách đã nhận hàng, không thể hủy hóa đơn."' }, async (t) => t.loiNV(await huy(S.cq, S.x.Huy1.maHD, false), LOI, 'Khách đã nhận hàng, không thể hủy hóa đơn.'))
tc('TC-UC6.3-03', { ...U('UC_6.3'), ten: 'Chưa nhập lý do hủy', loai: 'Luồng thay thế', nguon: 'Alternative 12.a, BR04', tienDieuKien: 'Hóa đơn Huy1', buoc: 'Để trống lý do → "Tiếp tục"', duLieu: 'Lý do ""', mongDoi: '"Vui lòng nhập lý do hủy."' }, async (t) => t.loiNV(await huy(S.cq, S.x.Huy1.maHD, true, '  '), LOI, 'Vui lòng nhập lý do hủy.'))
tc('TC-UC6.3-04', { ...U('UC_6.3'), ten: 'Hủy hóa đơn thành công – hoàn kho, lưu nhật ký hủy', loai: 'Luồng chính', nguon: 'Main flow 9–18, BR05–BR08, BR11', tienDieuKien: 'Hóa đơn Huy1 đủ điều kiện', buoc: '1. Xác nhận "Khách chưa nhận hàng"\n2. Nhập lý do "Khách đổi ý"\n3. "Đồng ý"', duLieu: 'Huy1', mongDoi: '"Hủy hóa đơn thành công."; hóa đơn "Đã hủy"; tồn C tăng 6; nhật ký hủy có người hủy, thời gian, lý do, số tiền cần hoàn và bản sao hóa đơn' }, async (t) => {
  const ton = await tongTon(S.hh.C.maHH)
  const r = await huy(S.cq, S.x.Huy1.maHD)
  t.status(r, 200) // Câu "Hủy hóa đơn thành công." do giao diện hiển thị khi API thành công (kiểm ở TC-GD-07).
  t.bang((await ctHD(S.x.Huy1.maHD))?.trangThai, 'Đã hủy', 'trạng thái')
  t.bang(await tongTon(S.hh.C.maHH), ton + 6, 'tồn C')
  const nk = (await S.cq.get(`/hoa-don/nhat-ky-huy?ma=${encodeURIComponent(S.x.Huy1.maHD)}`)).data
  t.dung(nk?.maNguoiHuy === S.cq.nguoiDung.maND && nk?.lyDoHuy === 'Khách đổi ý' && nk?.thoiGianHuy && nk?.banSao?.maHD === S.x.Huy1.maHD, 'Nhật ký hủy thiếu thông tin')
  t.bang(nk?.soTienCanHoan, S.x.Huy1.tongTienThanhToan, 'số tiền cần hoàn')
  return `${moTa(r)} "${r.data?.thongBao ?? ''}"; tồn C ${ton} → ${await tongTon(S.hh.C.maHH)}; nhật ký: ${nk?.nguoiHuy} | ${nk?.thoiGianHuy} | ${nk?.lyDoHuy} | cần hoàn ${nk?.soTienCanHoan} | bản sao ${nk?.banSao?.maHD} (${nk?.banSao?.trangThai})`
})
tc('TC-UC6.3-05', { ...U('UC_6.3'), ten: 'Hủy lại hóa đơn đã hủy', loai: 'Luồng thay thế', nguon: 'Alternative 8.a, BR01, BR12', tienDieuKien: 'Huy1 đã "Đã hủy"', buoc: 'Chọn Huy1 → "Hủy hóa đơn bán hàng"', duLieu: 'Huy1', mongDoi: '"Hóa đơn không đủ điều kiện hủy: đã bị hủy."' }, async (t) => {
  const k = await kiemHuy(S.cq, S.x.Huy1.maHD)
  const tb = k.data?.thongBao ?? (await huy(S.cq, S.x.Huy1.maHD)).data?.thongBao
  t.dung(k.data?.duocHuy === false, 'Không được hủy lại')
  t.dung(/không đủ điều kiện hủy: đã bị hủy/i.test(tb ?? ''), `Thông báo: ${tb}`)
  return `duocHuy=${k.data?.duocHuy}; "${tb}"`
})
tc('TC-UC6.3-06', { ...U('UC_6.3'), ten: 'Hóa đơn nợ đã có thanh toán công nợ – không hủy được', loai: 'Luồng thay thế', nguon: 'Alternative 8.a, BR01', tienDieuKien: 'Hóa đơn nợ An1 đã được thanh toán', buoc: 'Chọn hóa đơn An1 → "Hủy"', duLieu: S.hdNo?.An1?.maHD ?? 'HĐ nợ An1', mongDoi: '"Hóa đơn không đủ điều kiện hủy: đã có thanh toán công nợ."' }, async (t) => {
  const k = await kiemHuy(S.cq, S.hdNo.An1.maHD)
  t.dung(k.data?.duocHuy === false && /đã có thanh toán công nợ/i.test(k.data?.thongBao ?? ''), `Kết quả: ${k.data?.duocHuy} "${k.data?.thongBao}"`)
  return `duocHuy=${k.data?.duocHuy}; "${k.data?.thongBao}"`
})
tc('TC-UC6.3-07', { ...U('UC_6.3'), ten: 'Hủy hóa đơn nợ "Còn nợ" – giảm công nợ, không hoàn tiền', loai: 'Luồng thay thế', nguon: 'Alternative 16.a, BR06, BR09', tienDieuKien: 'Hóa đơn nợ An2 "Còn nợ", chưa thanh toán', buoc: 'Hủy hóa đơn An2 (khách chưa nhận hàng, có lý do)', duLieu: S.hdNo?.An2?.maHD ?? 'HĐ nợ An2', mongDoi: 'Số tiền cần hoàn = 0; công nợ Quen An giảm đúng tổng hóa đơn; hóa đơn "Đã hủy"' }, async (t) => {
  const k = await kiemHuy(S.cq, S.hdNo.An2.maHD)
  t.bang(k.data?.laHoaDonNo, true, 'là hóa đơn nợ')
  t.bang(k.data?.soTienCanHoan, 0, 'số tiền cần hoàn')
  const no = (await S.cq.get(`/cong-no/khach-quen/${S.kq.An.maKH}`)).data?.duNo
  const r = await huy(S.cq, S.hdNo.An2.maHD)
  t.status(r, 200)
  const sau = (await S.cq.get(`/cong-no/khach-quen/${S.kq.An.maKH}`)).data?.duNo
  t.bang(sau, no - S.hdNo.An2.tongTienThanhToan, 'dư nợ Quen An')
  return `Cần hoàn ${k.data?.soTienCanHoan}, giảm công nợ ${k.data?.giamCongNo}; dư nợ ${no} → ${sau}`
})
tc('TC-UC6.3-08', { ...U('UC_6.3'), ten: 'Nhân viên không được hủy hóa đơn', loai: 'Phân quyền', nguon: 'NFR: chỉ Chủ quán', tienDieuKien: 'Nhân viên đã đăng nhập', buoc: 'Nhân viên gọi hủy hóa đơn Huy2', duLieu: 'Huy2', mongDoi: 'Bị từ chối (403)' }, async (t) => {
  const r = await huy(S.nv, S.x.Huy2.maHD)
  t.status(r, 403)
  return moTa(r)
})
tc('TC-UC6.3-09', { ...U('UC_6.3'), ten: 'Hóa đơn đã hủy vẫn tra cứu được; không tính vào mặt hàng thường mua', loai: 'Quy tắc nghiệp vụ', nguon: 'BR12; UC_8.3 BR05', tienDieuKien: 'Huy1 (khách Bình, C ×6) đã hủy', buoc: '1. Tìm lịch sử trạng thái "Đã hủy"\n2. Xem chi tiết khách Bình', duLieu: 'Huy1', mongDoi: 'Huy1 có trong kết quả "Đã hủy"; mặt hàng thường mua của Bình không có C' }, async (t) => {
  const ds = (await S.nv.get(`/hoa-don?${new URLSearchParams({ ma: S.x.Huy1.maHD, trangThai: 'Đã hủy', trang: '1' })}`)).data?.danhSach ?? []
  t.bang(ds.length, 1, 'tìm thấy hóa đơn đã hủy')
  const mh = (await S.nv.get(`/khach-hang/${S.kh.Binh.maKH}`)).data?.matHangThuongMua ?? []
  t.dung(!mh.some((x) => x.maHH === S.hh.C.maHH), 'Không tính hàng của hóa đơn đã hủy')
  return `Tìm "Đã hủy": ${ds.length} kết quả; mặt hàng thường mua của Bình: ${mh.map((x) => `${x.tenHH} (${x.soLuongDaMua})`).join(', ')}`
})

// ================================================================== UC_6.2 Xử lý đổi trả – lập phiếu
tc('TC-UC6.2-01', { ...U('UC_6.2'), ten: 'Tìm hóa đơn còn trong thời hạn đổi trả', loai: 'Luồng chính', nguon: 'Main flow 1–5', tienDieuKien: 'Hóa đơn DT1 lập hôm nay', buoc: 'Nhập mã DT1, chọn hóa đơn', duLieu: 'DT1 (I ×3, J ×2)', mongDoi: 'Được đổi trả; mỗi dòng hiện số lượng còn được đổi trả = đã mua' }, async (t) => {
  const r = await S.nv.get(`/doi-tra/hoa-don?ma=${encodeURIComponent(S.x.DT1.maHD)}`)
  t.status(r, 200)
  t.bang(r.data?.duocDoiTra, true, 'được đổi trả')
  const i = r.data?.dong?.find((d) => d.maHH === S.hh.I.maHH)
  t.bang(i?.conLai, 3, 'còn lại của I')
  return `Hạn đổi trả ${r.data?.thoiHan}; ${r.data?.dong?.map((d) => `${d.tenHH}: mua ${d.daMua}, còn ${d.conLai}`).join('; ')}`
})
tc('TC-UC6.2-02', { ...U('UC_6.2'), ten: 'Hóa đơn ở ngày thứ 7 – vẫn trong hạn', loai: 'Quy tắc nghiệp vụ', nguon: 'BR01 (ngày lập là ngày 1)', tienDieuKien: 'Hóa đơn Ngay7 lập cách đây 6 ngày', buoc: 'Chọn hóa đơn Ngay7', duLieu: 'Ngay7', mongDoi: 'Được đổi trả' }, async (t) => {
  const r = await S.nv.get(`/doi-tra/hoa-don?ma=${encodeURIComponent(S.x.Ngay7.maHD)}`)
  t.bang(r.data?.duocDoiTra, true, 'được đổi trả')
  return `duocDoiTra=${r.data?.duocDoiTra}; hạn ${r.data?.thoiHan}`
})
tc('TC-UC6.2-03', { ...U('UC_6.2'), ten: 'Hóa đơn ở ngày thứ 8 – hết thời hạn đổi trả', loai: 'Ngoại lệ', nguon: 'Exception 5.a, BR01', tienDieuKien: 'Hóa đơn Qua7 lập cách đây 7 ngày', buoc: '1. Chọn hóa đơn Qua7\n2. Thử lập phiếu trả', duLieu: 'Qua7', mongDoi: 'Từ chối đổi trả; không lập được phiếu' }, async (t) => {
  const r = await S.nv.get(`/doi-tra/hoa-don?ma=${encodeURIComponent(S.x.Qua7.maHD)}`)
  t.bang(r.data?.duocDoiTra, false, 'được đổi trả')
  const l = await lap(S.nv, phieu(S.x.Qua7.maHD, 'Trả hàng', [{ maHH: S.hh.G.maHH, soLuong: 1 }]))
  t.status(l, LOI)
  return `duocDoiTra=${r.data?.duocDoiTra} "${r.data?.tieuDeLoi ?? ''} ${r.data?.thongBaoLoi ?? ''}"; lập phiếu: ${moTa(l)}`
})
tc('TC-UC6.2-04', { ...U('UC_6.2'), ten: 'Hóa đơn "Còn nợ" không được đổi trả', loai: 'Quy tắc nghiệp vụ', nguon: 'BR08 (SUA_BAO_CAO 3.13)', tienDieuKien: 'Quen Bảo có hóa đơn nợ "Còn nợ"', buoc: 'Ghi nợ cho Quen Bảo rồi chọn hóa đơn đó để đổi trả', duLieu: 'HĐ nợ mới của Quen Bảo', mongDoi: 'Không được đổi trả' }, async (t) => {
  const h = await S.nv.post('/ban-hang/hoa-don-no', { maKH: S.kq.Bao.maKH, dong: [{ maHH: S.hh.G.maHH, soLuong: 1 }] })
  t.status(h, [200, 201])
  const r = await S.nv.get(`/doi-tra/hoa-don?ma=${encodeURIComponent(h.data?.maHD)}`)
  t.bang(r.data?.duocDoiTra, false, 'được đổi trả')
  return `${h.data?.maHD} (${h.data?.trangThai}): duocDoiTra=${r.data?.duocDoiTra} "${r.data?.thongBaoLoi ?? ''}"`
})
tc('TC-UC6.2-05', { ...U('UC_6.2'), ten: 'Hóa đơn đã hủy không được đổi trả', loai: 'Quy tắc nghiệp vụ', nguon: 'BR01', tienDieuKien: 'Huy1 đã hủy', buoc: 'Chọn hóa đơn Huy1 để đổi trả', duLieu: 'Huy1', mongDoi: 'Không được đổi trả' }, async (t) => {
  const r = await S.nv.get(`/doi-tra/hoa-don?ma=${encodeURIComponent(S.x.Huy1.maHD)}`)
  t.bang(r.data?.duocDoiTra, false, 'được đổi trả')
  return `duocDoiTra=${r.data?.duocDoiTra} "${r.data?.thongBaoLoi ?? ''}"`
})
tc('TC-UC6.2-06', { ...U('UC_6.2'), ten: 'Số lượng trả vượt số lượng còn được đổi trả', loai: 'Ngoại lệ', nguon: 'Exception 6.a, BR02', tienDieuKien: 'DT1: I đã mua 3', buoc: 'Nhập số lượng trả I = 4', duLieu: 'I ×4', mongDoi: '"Số lượng trả không hợp lệ. Số lượng còn được đổi trả: 3."' }, async (t) => t.loiNV(await lap(S.nv, phieu(S.x.DT1.maHD, 'Trả hàng', [{ maHH: S.hh.I.maHH, soLuong: 4 }])), LOI, 'Số lượng trả không hợp lệ. Số lượng còn được đổi trả: 3'))
tc('TC-UC6.2-07', { ...U('UC_6.2'), ten: 'Số lượng trả bằng 0', loai: 'Ngoại lệ', nguon: 'Exception 6.a, BR02', tienDieuKien: 'DT1', buoc: 'Nhập số lượng trả I = 0', duLieu: 'I ×0', mongDoi: '"Số lượng trả không hợp lệ…"' }, async (t) => t.loiNV(await lap(S.nv, phieu(S.x.DT1.maHD, 'Trả hàng', [{ maHH: S.hh.I.maHH, soLuong: 0 }])), LOI, 'Số lượng trả không hợp lệ'))
tc('TC-UC6.2-08', { ...U('UC_6.2'), ten: 'Hàng không đủ điều kiện, không phải lỗi nhà sản xuất', loai: 'Ngoại lệ', nguon: 'Exception 8.b, BR03', tienDieuKien: 'DT1', buoc: 'Kết quả kiểm tra: chỉ "Còn nguyên vẹn" (đã mở bao bì, đã dùng)', duLieu: 'Tình trạng thiếu 2 điều kiện', mongDoi: 'Từ chối đổi trả vì hàng không đủ điều kiện' }, async (t) => t.loiNV(await lap(S.nv, phieu(S.x.DT1.maHD, 'Trả hàng', [{ maHH: S.hh.I.maHH, soLuong: 1 }], { tinhTrang: ['Còn nguyên vẹn'] })), LOI, 'Hàng không đủ điều kiện đổi trả'))
tc('TC-UC6.2-09', { ...U('UC_6.2'), ten: 'Lỗi nhà sản xuất nhưng không ghi mô tả lỗi', loai: 'Ngoại lệ', nguon: 'Alternative 8.a.1, BR10', tienDieuKien: 'DT1', buoc: 'Chọn "Lỗi do nhà sản xuất", để trống mô tả', duLieu: 'moTaLoi ""', mongDoi: 'Báo phải nhập mô tả lỗi' }, async (t) => {
  const r = await lap(S.nv, phieu(S.x.DT1.maHD, 'Trả hàng', [{ maHH: S.hh.I.maHH, soLuong: 1 }], { tinhTrang: ['Lỗi do nhà sản xuất'], loiNhaSanXuat: true, moTaLoi: '' }))
  return t.loiNV(r, LOI, 'mô tả lỗi')
})
tc('TC-UC6.2-10', { ...U('UC_6.2'), ten: 'Nhân viên lập phiếu trả hàng – "Chờ duyệt", chưa đổi tồn kho', loai: 'Luồng chính', nguon: 'Main flow 6–12, BR04, BR07', tienDieuKien: 'DT1: I ×3 (52.000 đ/gói)', buoc: '1. Chọn dòng I, số lượng 1\n2. Kiểm tra đủ 3 điều kiện\n3. Chọn "Trả hàng" → gửi duyệt', duLieu: 'I ×1', mongDoi: 'Phiếu "Chờ duyệt", mã PDT-…; số tiền hoàn = 52.000 (giá trên hóa đơn gốc); tồn I chưa thay đổi' }, async (t) => {
  const ton = await tongTon(S.hh.I.maHH)
  const r = await lap(S.nv, phieu(S.x.DT1.maHD, 'Trả hàng', [{ maHH: S.hh.I.maHH, soLuong: 1 }]))
  t.status(r, [200, 201])
  t.bang(r.data?.trangThai, 'Chờ duyệt', 'trạng thái')
  t.bang(r.data?.soTienHoan, 52000, 'số tiền hoàn')
  t.bang(await tongTon(S.hh.I.maHH), ton, 'tồn I')
  S.pdt = { tra: r.data }
  return `${r.data?.maPDT} | ${r.data?.loaiPhieu} | ${r.data?.trangThai} | hoàn ${r.data?.soTienHoan}; tồn I ${ton} (không đổi)`
})
tc('TC-UC6.2-11', { ...U('UC_6.2'), ten: 'Số lượng còn đổi trả trừ cả phiếu đang chờ duyệt', loai: 'Quy tắc nghiệp vụ', nguon: 'BR02', tienDieuKien: 'DT1 có phiếu chờ duyệt I ×1', buoc: 'Mở lại hóa đơn DT1', duLieu: 'DT1', mongDoi: 'Dòng I: đang chờ 1, còn lại 2' }, async (t) => {
  const i = (await S.nv.get(`/doi-tra/hoa-don?ma=${encodeURIComponent(S.x.DT1.maHD)}`)).data?.dong?.find((d) => d.maHH === S.hh.I.maHH)
  t.bang(i?.dangCho, 1, 'đang chờ')
  t.bang(i?.conLai, 2, 'còn lại')
  return `I: mua ${i?.daMua}, đã đổi trả ${i?.daDoiTra}, đang chờ ${i?.dangCho}, còn ${i?.conLai}`
})
tc('TC-UC6.2-12', { ...U('UC_6.2'), ten: 'Đổi sang hàng mới không đủ tồn kho', loai: 'Ngoại lệ', nguon: 'Exception 9.b.2, BR06', tienDieuKien: 'Hàng K hết hàng (tồn 0)', buoc: 'Đổi J ×1 sang K ×1', duLieu: 'DT2: J → K', mongDoi: '"Hàng mới không đủ tồn kho, yêu cầu: 1, hiện có: 0"' }, async (t) => t.loiNV(await lap(S.nv, phieu(S.x.DT2.maHD, 'Đổi hàng', [{ maHH: S.hh.J.maHH, soLuong: 1, maHHMoi: S.hh.K.maHH, soLuongMoi: 1 }])), LOI, 'Hàng mới không đủ tồn kho'))
tc('TC-UC6.2-13', { ...U('UC_6.2'), ten: 'Lập phiếu đổi sang hàng giá cao hơn – tính chênh lệch thu thêm', loai: 'Luồng thay thế', nguon: 'Alternative 9.a, BR05', tienDieuKien: 'DT2: J ×2 (32.000 đ)', buoc: 'Đổi J ×1 sang I ×1 (52.000 đ)', duLieu: 'J → I', mongDoi: 'Phiếu "Chờ duyệt"; chênh lệch = 52.000 − 32.000 = +20.000 (thu thêm)' }, async (t) => {
  const r = await lap(S.nv, phieu(S.x.DT2.maHD, 'Đổi hàng', [{ maHH: S.hh.J.maHH, soLuong: 1, maHHMoi: S.hh.I.maHH, soLuongMoi: 1 }]))
  t.status(r, [200, 201])
  t.bang(r.data?.chenhLech, 20000, 'chênh lệch')
  t.bang(r.data?.canThuThem, 20000, 'cần thu thêm')
  S.pdt.doiCao = r.data
  return `${r.data?.maPDT}: hoàn hàng cũ ${r.data?.soTienHoan}, hàng mới ${r.data?.giaTriHangMoi}, chênh lệch ${r.data?.chenhLech}`
})
tc('TC-UC6.2-14', { ...U('UC_6.2'), ten: 'Hàng lỗi nhà sản xuất có mô tả – được lập phiếu dù đã mở bao bì', loai: 'Luồng thay thế', nguon: 'Alternative 8.a, BR03, BR10', tienDieuKien: 'DT3: I ×2', buoc: 'Chọn "Lỗi do nhà sản xuất", mô tả "Bao bì rách, bột vón cục", đổi I ×1 sang J ×1', duLieu: 'I → J', mongDoi: 'Lập phiếu thành công, có mô tả lỗi; chênh lệch âm (hoàn lại 20.000)' }, async (t) => {
  const r = await lap(S.nv, phieu(S.x.DT3.maHD, 'Đổi hàng', [{ maHH: S.hh.I.maHH, soLuong: 1, maHHMoi: S.hh.J.maHH, soLuongMoi: 1 }], { tinhTrang: ['Lỗi do nhà sản xuất'], loiNhaSanXuat: true, moTaLoi: 'Bao bì rách, bột vón cục' }))
  t.status(r, [200, 201])
  t.bang(r.data?.chenhLech, -20000, 'chênh lệch')
  t.dung(r.data?.moTaLoi, 'Phải lưu mô tả lỗi')
  S.pdt.doiThap = r.data
  return `${r.data?.maPDT}: ${r.data?.tinhTrangHang} | mô tả: ${r.data?.moTaLoi} | chênh lệch ${r.data?.chenhLech}, hoàn khách ${r.data?.tienHoanKhach}`
})
tc('TC-UC6.2-15', { ...U('UC_6.2'), ten: 'Phiếu "Chờ duyệt" chưa được hoàn tiền / xử lý', loai: 'Quy tắc nghiệp vụ', nguon: 'BR07; UC_6.4 BR06', tienDieuKien: 'Phiếu trả hàng đang "Chờ duyệt"', buoc: 'Nhân viên bấm xác nhận hoàn tiền', duLieu: 'Phiếu trả', mongDoi: 'Bị từ chối; tồn kho không đổi' }, async (t) => {
  const r = await S.nv.post('/doi-tra/xu-ly', { maPDT: S.pdt.tra.maPDT })
  t.status(r, LOI)
  return moTa(r)
})

// ================================================================== UC_6.4 Duyệt phiếu đổi trả
tc('TC-UC6.4-01', { ...U('UC_6.4'), ten: 'Danh sách phiếu chờ duyệt – mới nhất trước, đủ thông tin', loai: 'Luồng chính', nguon: 'Main flow 1–2, BR09', tienDieuKien: 'Có 3 phiếu chờ duyệt', buoc: 'Chủ quán chọn "Duyệt phiếu đổi trả"', duLieu: '-', mongDoi: 'Danh sách gồm mã phiếu, mã HĐ gốc, khách, loại, thời gian lập, trạng thái; mới nhất trước' }, async (t) => {
  const r = await S.cq.get(`/duyet-doi-tra?trangThai=${encodeURIComponent('Chờ duyệt')}`)
  t.status(r, 200)
  const ds = r.data ?? []
  t.dung(ds.length >= 3, `Số phiếu: ${ds.length}`)
  t.dung(ds.every((d, i) => i === 0 || ds[i - 1].ngayGioLap >= d.ngayGioLap), 'Phải mới nhất trước')
  t.dung(['maPDT', 'maHD', 'tenKhach', 'loaiPhieu', 'ngayGioLap', 'trangThai'].every((k) => k in (ds[0] ?? {})), 'Đủ cột')
  return ds.slice(0, 4).map((d) => `${d.maPDT} | ${d.maHD} | ${d.tenKhach ?? 'Khách vãng lai'} | ${d.loaiPhieu} | ${d.ngayGioLap} | ${d.trangThai}`).join('\n')
})
tc('TC-UC6.4-02', { ...U('UC_6.4'), ten: 'Nhân viên không được xem danh sách / duyệt phiếu', loai: 'Phân quyền', nguon: 'BR01; NFR', tienDieuKien: 'Nhân viên đã đăng nhập', buoc: 'Nhân viên mở danh sách duyệt và gọi "Duyệt"', duLieu: 'Phiếu trả', mongDoi: 'Bị từ chối (403)' }, async (t) => {
  const a = await S.nv.get('/duyet-doi-tra')
  const b = await S.nv.post('/duyet-doi-tra/duyet', { maPDT: S.pdt.tra.maPDT })
  t.status(a, 403)
  t.status(b, 403)
  return `Danh sách: HTTP ${a.status}; duyệt: HTTP ${b.status}`
})
tc('TC-UC6.4-03', { ...U('UC_6.4'), ten: 'Chủ quán duyệt phiếu – lưu lịch sử, gửi kết quả cho nhân viên', loai: 'Luồng chính', nguon: 'Main flow 3–9, BR07, BR08', tienDieuKien: 'Phiếu trả hàng "Chờ duyệt" do nhanvien1 lập', buoc: 'Xem chi tiết phiếu → "Duyệt"', duLieu: 'Phiếu trả', mongDoi: 'Phiếu "Đã duyệt", ghi người duyệt và thời gian; nhân viên lập phiếu nhận thông báo kết quả' }, async (t) => {
  const r = await S.cq.post('/duyet-doi-tra/duyet', { maPDT: S.pdt.tra.maPDT })
  t.status(r, 200)
  t.bang(r.data?.trangThai, 'Đã duyệt', 'trạng thái')
  t.dung(r.data?.nguoiDuyet && r.data?.ngayGioDuyet, 'Phải ghi người duyệt, thời gian duyệt')
  const tb = (await S.nv.get('/thong-bao')).data?.danhSach ?? []
  t.dung(tb.some((x) => x.maThamChieu === S.pdt.tra.maPDT), 'Nhân viên phải nhận thông báo kết quả duyệt')
  return `${r.data?.maPDT}: ${r.data?.trangThai} bởi ${r.data?.nguoiDuyet} lúc ${r.data?.ngayGioDuyet}; thông báo NV: ${tb.find((x) => x.maThamChieu === S.pdt.tra.maPDT)?.noiDung}`
})
tc('TC-UC6.4-04', { ...U('UC_6.4'), ten: 'Không duyệt lại phiếu đã duyệt', loai: 'Quy tắc nghiệp vụ', nguon: 'BR02', tienDieuKien: 'Phiếu trả đã "Đã duyệt"', buoc: 'Chọn "Duyệt" / "Từ chối" lần nữa', duLieu: 'Phiếu trả', mongDoi: 'Bị từ chối, trạng thái giữ nguyên' }, async (t) => {
  const a = await S.cq.post('/duyet-doi-tra/duyet', { maPDT: S.pdt.tra.maPDT })
  const b = await S.cq.post('/duyet-doi-tra/tu-choi', { maPDT: S.pdt.tra.maPDT, lyDo: 'Thử' })
  t.status(a, LOI)
  t.status(b, LOI)
  return `Duyệt lại: ${moTa(a)}; từ chối: ${moTa(b)}`
})
tc('TC-UC6.4-05', { ...U('UC_6.4'), ten: 'Từ chối nhưng chưa nhập lý do', loai: 'Ngoại lệ', nguon: 'Exception 6a3a, BR04', tienDieuKien: 'Phiếu đổi giá thấp "Chờ duyệt"', buoc: 'Chọn "Từ chối", để trống lý do', duLieu: 'Lý do ""', mongDoi: '"Vui lòng nhập lý do từ chối"' }, async (t) => t.loiNV(await S.cq.post('/duyet-doi-tra/tu-choi', { maPDT: S.pdt.doiThap.maPDT, lyDo: '' }), LOI, 'Vui lòng nhập lý do từ chối'))
tc('TC-UC6.4-06', { ...U('UC_6.4'), ten: 'Từ chối phiếu có lý do – không đổi tồn kho, nhân viên nhận lý do', loai: 'Luồng thay thế', nguon: 'Alternative 6a, BR06, BR08; UC_6.2 Alternative 13.a', tienDieuKien: 'Phiếu đổi giá thấp "Chờ duyệt"', buoc: 'Chọn "Từ chối", nhập lý do "Không có hóa đơn gốc"', duLieu: 'Lý do "Không có hóa đơn gốc"', mongDoi: 'Phiếu "Từ chối" kèm lý do; tồn I, J không đổi; nhân viên nhận thông báo kèm lý do' }, async (t) => {
  const tI = await tongTon(S.hh.I.maHH)
  const tJ = await tongTon(S.hh.J.maHH)
  const r = await S.cq.post('/duyet-doi-tra/tu-choi', { maPDT: S.pdt.doiThap.maPDT, lyDo: 'Không có hóa đơn gốc' })
  t.status(r, 200)
  t.bang(r.data?.trangThai, 'Từ chối', 'trạng thái')
  t.bang(r.data?.lyDoTuChoi, 'Không có hóa đơn gốc', 'lý do')
  t.bang(await tongTon(S.hh.I.maHH), tI, 'tồn I')
  t.bang(await tongTon(S.hh.J.maHH), tJ, 'tồn J')
  const tb = (await S.nv.get('/thong-bao')).data?.danhSach?.find((x) => x.maThamChieu === S.pdt.doiThap.maPDT)
  t.dung(/Không có hóa đơn gốc/.test(tb?.noiDung ?? ''), `Thông báo NV: ${tb?.noiDung}`)
  return `${r.data?.maPDT}: ${r.data?.trangThai} – ${r.data?.lyDoTuChoi}; thông báo NV: ${tb?.noiDung}`
})
tc('TC-UC6.4-07', { ...U('UC_6.4'), ten: 'Phiếu do Chủ quán lập được Chủ quán tự duyệt', loai: 'Quy tắc nghiệp vụ', nguon: 'BR01 (SUA_BAO_CAO 3.15)', tienDieuKien: 'Hóa đơn Ngay7 trong hạn', buoc: 'Chủ quán lập phiếu trả G ×1 rồi tự duyệt', duLieu: 'Ngay7', mongDoi: 'Duyệt thành công' }, async (t) => {
  const l = await lap(S.cq, phieu(S.x.Ngay7.maHD, 'Trả hàng', [{ maHH: S.hh.G.maHH, soLuong: 1 }]))
  t.status(l, [200, 201])
  const d = await S.cq.post('/duyet-doi-tra/duyet', { maPDT: l.data?.maPDT })
  t.status(d, 200)
  S.pdt.cq = d.data
  return `${l.data?.maPDT}: lập bởi ${l.data?.nguoiLap} (${l.data?.vaiTroNguoiLap}) → ${d.data?.trangThai}`
})

// ================================================================== UC_6.2 – xử lý sau duyệt
tc('TC-UC6.2-16', { ...U('UC_6.2'), ten: 'Hoàn tiền phiếu trả hàng đã duyệt – cộng lại tồn kho, hoàn tất', loai: 'Luồng chính', nguon: 'Main flow 13–18, BR06', tienDieuKien: 'Phiếu trả I ×1 "Đã duyệt"', buoc: 'Nhân viên hoàn tiền cho khách, xác nhận trên hệ thống', duLieu: 'Phiếu trả', mongDoi: 'Phiếu hoàn tất; tồn I tăng 1' }, async (t) => {
  const ton = await tongTon(S.hh.I.maHH)
  const r = await S.nv.post('/doi-tra/xu-ly', { maPDT: S.pdt.tra.maPDT })
  t.status(r, 200)
  t.dung(r.data?.ngayGioHoanTat, 'Phải ghi thời điểm hoàn tất')
  t.bang(await tongTon(S.hh.I.maHH), ton + 1, 'tồn I')
  return `${r.data?.maPDT}: xử lý "${r.data?.trangThaiXuLy}", hoàn tất ${r.data?.ngayGioHoanTat}; tồn I ${ton} → ${ton + 1}`
})
tc('TC-UC6.2-17', { ...U('UC_6.2'), ten: 'Phiếu đã hoàn tất không xử lý / sửa lại được', loai: 'Quy tắc nghiệp vụ', nguon: 'BR07', tienDieuKien: 'Phiếu trả đã hoàn tất', buoc: 'Gọi xử lý lần nữa', duLieu: 'Phiếu trả', mongDoi: 'Bị từ chối' }, async (t) => {
  const r = await S.nv.post('/doi-tra/xu-ly', { maPDT: S.pdt.tra.maPDT })
  t.status(r, LOI)
  return moTa(r)
})
tc('TC-UC6.2-18', { ...U('UC_6.2'), ten: 'Đổi hàng giá cao hơn – QR thất bại, không thanh toán lại → "Không hoàn tất"', loai: 'Luồng thay thế', nguon: 'Alternative 14.a.7.3.a', tienDieuKien: 'Phiếu đổi J→I (thu thêm 20.000) được duyệt', buoc: '1. Chủ quán duyệt\n2. Thu thêm bằng QR, ngân hàng báo lỗi\n3. Không thanh toán lại', duLieu: 'Phiếu đổi giá cao', mongDoi: 'Báo thanh toán không thành công; phiếu "Không hoàn tất"; tồn kho không đổi' }, async (t) => {
  t.status(await S.cq.post('/duyet-doi-tra/duyet', { maPDT: S.pdt.doiCao.maPDT }), 200)
  const tI = await tongTon(S.hh.I.maHH)
  const q = await S.nv.post('/doi-tra/xu-ly', { maPDT: S.pdt.doiCao.maPDT, phuongThuc: 'Chuyển khoản QR', ketQuaQrGiaLap: 'ThatBai' })
  const kq = t.loiNV(q, 402, 'không thành công')
  const k = await S.nv.post('/doi-tra/khong-hoan-tat', { maPDT: S.pdt.doiCao.maPDT })
  t.status(k, 200)
  t.bang(k.data?.trangThai, 'Không hoàn tất', 'trạng thái')
  t.bang(await tongTon(S.hh.I.maHH), tI, 'tồn I')
  return `QR: ${kq}; không thanh toán lại: ${k.data?.trangThai}`
})
tc('TC-UC6.2-19', { ...U('UC_6.2'), ten: 'Đổi hàng giá cao hơn – thu thêm tiền mặt, cập nhật tồn hàng cũ và mới', loai: 'Luồng thay thế', nguon: 'Alternative 14.a.4–14.a.6, BR06', tienDieuKien: 'Hóa đơn DT2 còn J ×1 chưa đổi', buoc: '1. Lập phiếu đổi J ×1 → I ×1\n2. Chủ quán duyệt\n3. Thu thêm 20.000 tiền mặt', duLieu: 'J → I', mongDoi: 'Hoàn tất; tồn J +1, tồn I −1' }, async (t) => {
  const l = await lap(S.nv, phieu(S.x.DT2.maHD, 'Đổi hàng', [{ maHH: S.hh.J.maHH, soLuong: 1, maHHMoi: S.hh.I.maHH, soLuongMoi: 1 }]))
  t.status(l, [200, 201])
  await S.cq.post('/duyet-doi-tra/duyet', { maPDT: l.data?.maPDT })
  const tI = await tongTon(S.hh.I.maHH)
  const tJ = await tongTon(S.hh.J.maHH)
  const r = await S.nv.post('/doi-tra/xu-ly', { maPDT: l.data?.maPDT, phuongThuc: 'Tiền mặt' })
  t.status(r, 200)
  t.dung(r.data?.ngayGioHoanTat, 'Phải hoàn tất')
  t.bang(await tongTon(S.hh.I.maHH), tI - 1, 'tồn I')
  t.bang(await tongTon(S.hh.J.maHH), tJ + 1, 'tồn J')
  S.pdt.doiXong = r.data
  return `${l.data?.maPDT}: ${r.data?.trangThai}/${r.data?.trangThaiXuLy}; tồn I ${tI} → ${tI - 1}, J ${tJ} → ${tJ + 1}`
})
tc('TC-UC6.2-20', { ...U('UC_6.2'), ten: 'Đổi hàng giá thấp hơn – hoàn lại chênh lệch cho khách', loai: 'Luồng thay thế', nguon: 'Alternative 14.a.3, BR05', tienDieuKien: 'Hóa đơn DT3 còn I ×2', buoc: '1. Lập phiếu đổi I ×1 → J ×1 (đủ điều kiện)\n2. Chủ quán duyệt\n3. Nhân viên hoàn 20.000 cho khách', duLieu: 'I → J', mongDoi: 'Hoàn tất; tiền hoàn khách 20.000' }, async (t) => {
  const l = await lap(S.nv, phieu(S.x.DT3.maHD, 'Đổi hàng', [{ maHH: S.hh.I.maHH, soLuong: 1, maHHMoi: S.hh.J.maHH, soLuongMoi: 1 }]))
  t.status(l, [200, 201])
  t.bang(l.data?.tienHoanKhach, 20000, 'tiền hoàn khách')
  await S.cq.post('/duyet-doi-tra/duyet', { maPDT: l.data?.maPDT })
  const r = await S.nv.post('/doi-tra/xu-ly', { maPDT: l.data?.maPDT })
  t.status(r, 200)
  t.dung(r.data?.ngayGioHoanTat, 'Phải hoàn tất')
  return `${l.data?.maPDT}: chênh lệch ${l.data?.chenhLech}, hoàn khách ${l.data?.tienHoanKhach}; ${r.data?.trangThaiXuLy}`
})
tc('TC-UC6.3-10', { ...U('UC_6.3'), ten: 'Hóa đơn đã có phiếu đổi trả – không hủy được', loai: 'Luồng thay thế', nguon: 'Alternative 8.a, BR01', tienDieuKien: 'Hóa đơn DT1 đã có phiếu trả hàng', buoc: 'Chọn DT1 → "Hủy hóa đơn bán hàng"', duLieu: 'DT1', mongDoi: '"Hóa đơn không đủ điều kiện hủy: đã có phiếu đổi trả."' }, async (t) => {
  const k = await kiemHuy(S.cq, S.x.DT1.maHD)
  t.dung(k.data?.duocHuy === false && /đã có phiếu đổi trả/i.test(k.data?.thongBao ?? ''), `Kết quả: ${k.data?.duocHuy} "${k.data?.thongBao}"`)
  return `duocHuy=${k.data?.duocHuy}; "${k.data?.thongBao}"`
})
