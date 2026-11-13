// Nhóm 5 – Công nợ & khách quen (UC_7.1–7.6).
import { S, cccdMoi, moTa, ngayISO, ngayVN, sdtMoi, sql, tc } from './lib.mjs'

const NHOM = 'Công nợ & Khách quen'
const U = (uc) => ({ uc, nhom: NHOM })
const kq = (hoTen, doi = {}) => ({ hoTen, sdt: sdtMoi(), cccd: cccdMoi(), diaChi: '12 Lê Lợi, Đà Nẵng', ...doi })
const ctKQ = async (ma) => (await S.cq.get(`/cong-no/khach-quen/${ma}`)).data
const ghiNo = (p, maKH, dong) => p.post('/ban-hang/hoa-don-no', { maKH, dong })
const kiemTraNo = (p, maKH, dong) => p.post('/ban-hang/kiem-tra-ghi-no', { maKH, dong })
/** Lùi ngày lập hóa đơn nợ (CSDL kiểm thử) để giả lập khoản nợ đã qua N ngày. */
const lui = (maHD, ngay) => sql(`UPDATE HoaDon SET NgayGioLap = DATEADD(DAY,-${ngay},NgayGioLap) WHERE MaHD='${maHD}'; UPDATE HoaDonNo SET HanThanhToan = DATEADD(DAY,-${ngay},HanThanhToan) WHERE MaHD='${maHD}'`)

// ================================================================== UC_7.5 Thêm khách quen
const loiThemKQ = (ma, ten, nguon, duLieu, mongDoi, body, msg, truong) =>
  tc(ma, { ...U('UC_7.5'), ten, loai: 'Ngoại lệ', nguon, tienDieuKien: 'Chủ quán ở form "Thêm khách quen"', buoc: '1. Nhập Họ tên, SĐT, CCCD, Địa chỉ\n2. "Lưu"', duLieu, mongDoi }, async (t) => t.loiNV(await S.cq.post('/cong-no/khach-quen', body()), [400, 409], msg, truong))
tc('TC-UC7.5-01', { ...U('UC_7.5'), ten: 'Thêm khách quen hợp lệ', loai: 'Luồng chính', nguon: 'Main flow 1–8, Post-condition, BR05', tienDieuKien: 'Chủ quán ở màn hình Quản lý công nợ', buoc: '1. "Thêm khách quen"\n2. Nhập đủ thông tin hợp lệ\n3. "Lưu"', duLieu: 'Quen An, SĐT, CCCD 12 số, địa chỉ', mongDoi: 'Lưu thành công; mã KH-xxxxxx; dư nợ 0; được mua nợ; trạng thái "Không nợ"' }, async (t) => {
  S.kq = {}
  const r = await S.cq.post('/cong-no/khach-quen', kq('Quen Thử An'))
  t.status(r, [200, 201])
  const ct = await ctKQ(r.data?.ma)
  t.dung(/^KH-\d{6}$/.test(ct?.maKH ?? ''), `Mã ${ct?.maKH}`)
  t.bang(ct?.duNo, 0, 'dư nợ')
  t.bang(ct?.quyenMuaNo, true, 'quyền mua nợ')
  t.bang(ct?.trangThaiNo, 'Không nợ', 'trạng thái')
  S.kq.An = ct
  return `${moTa(r)}; ${ct?.maKH} | dư nợ ${ct?.duNo} | quyền mua nợ ${ct?.quyenMuaNo} | ${ct?.trangThaiNo}`
})
loiThemKQ('TC-UC7.5-02', 'Bỏ trống địa chỉ', 'Exception 6.a, BR01', 'Địa chỉ ""', '"Không được để trống!" dưới trường Địa chỉ', () => kq('Quen Thiếu', { diaChi: '' }), 'Không được để trống!', 'diaChi')
loiThemKQ('TC-UC7.5-03', 'Số điện thoại sai định dạng', 'Exception 6.b, BR02', 'SĐT "09051234"', '"Số điện thoại không hợp lệ!"', () => kq('Quen Sai', { sdt: '09051234' }), 'Số điện thoại không hợp lệ!', 'sdt')
loiThemKQ('TC-UC7.5-04', 'Số điện thoại trùng khách quen đang hoạt động', 'Exception 6.c, BR02', 'SĐT của Quen An', '"Số điện thoại đã trùng!"', () => kq('Quen Trùng', { sdt: S.kq.An.sdt }), 'Số điện thoại đã trùng!', 'sdt')
loiThemKQ('TC-UC7.5-05', 'CCCD không đủ 12 số', 'Exception 6.d, BR03', 'CCCD 11 số', '"CCCD không hợp lệ!"', () => kq('Quen CCCD', { cccd: '07909912345' }), 'CCCD không hợp lệ!', 'cccd')
loiThemKQ('TC-UC7.5-06', 'CCCD trùng khách quen đang hoạt động', 'Exception 6.e, BR03', 'CCCD của Quen An', '"CCCD đã trùng!"', () => kq('Quen CCCD Trùng', { cccd: S.kq.An.cccd }), 'CCCD đã trùng!', 'cccd')
tc('TC-UC7.5-07', { ...U('UC_7.5'), ten: 'Nhân viên không được thêm khách quen', loai: 'Phân quyền', nguon: 'Actors: Chủ quán', tienDieuKien: 'Nhân viên đã đăng nhập', buoc: 'Nhân viên gọi "Thêm khách quen"', duLieu: 'Phiên nhanvien1', mongDoi: 'Bị từ chối (403)' }, async (t) => {
  const r = await S.nv.post('/cong-no/khach-quen', kq('Quen NV'))
  t.status(r, 403)
  return moTa(r)
})
tc('TC-CB-05', { uc: 'Chuẩn bị', nhom: NHOM, ten: 'Thêm các khách quen dùng cho ghi nợ', loai: 'Chuẩn bị', nguon: 'UC_7.5', tienDieuKien: '-', buoc: 'Thêm Quen Bảo (quá hạn), Quen Cúc (hạn mức), Quen Dung (sắp hết hạn), Quen Em (xóa)', duLieu: '-', mongDoi: 'Tạo đủ' }, async (t) => {
  for (const [k, ten] of [['Bao', 'Quen Thử Bảo'], ['Cuc', 'Quen Thử Cúc'], ['Dung', 'Quen Thử Dung'], ['Em', 'Quen Thử Em']]) {
    const r = await S.cq.post('/cong-no/khach-quen', kq(ten))
    t.status(r, [200, 201])
    S.kq[k] = await ctKQ(r.data?.ma)
  }
  return Object.entries(S.kq).map(([k, v]) => `${k}=${v?.maKH}`).join('; ')
})

// ================================================================== UC_7.4 Sửa khách quen
tc('TC-UC7.4-01', { ...U('UC_7.4'), ten: 'Sửa khách quen hợp lệ', loai: 'Luồng chính', nguon: 'Main flow 1–8, BR05', tienDieuKien: 'Quen An tồn tại', buoc: '1. Chọn Quen An → "Sửa thông tin khách quen"\n2. Đổi địa chỉ\n3. "Lưu"', duLieu: 'Địa chỉ "99 Trần Phú"', mongDoi: '"Cập nhật thông tin khách quen thành công!"' }, async (t) => {
  const a = S.kq.An
  const r = await S.cq.put(`/cong-no/khach-quen/${a.maKH}`, { hoTen: a.hoTen, sdt: a.sdt, cccd: a.cccd, diaChi: '99 Trần Phú' })
  t.status(r, 200)
  t.thongBao(r, 'Cập nhật thông tin khách quen thành công!')
  t.bang((await ctKQ(a.maKH))?.diaChi, '99 Trần Phú', 'địa chỉ')
  return `${moTa(r)} "${r.data?.thongBao}"`
})
tc('TC-UC7.4-02', { ...U('UC_7.4'), ten: 'Sửa SĐT trùng khách quen khác', loai: 'Ngoại lệ', nguon: 'Exception 6.c, BR02', tienDieuKien: 'Quen An, Quen Em tồn tại', buoc: 'Đổi SĐT Quen An thành SĐT Quen Em', duLieu: 'SĐT Quen Em', mongDoi: '"Số điện thoại đã trùng!"' }, async (t) => {
  const a = S.kq.An
  return t.loiNV(await S.cq.put(`/cong-no/khach-quen/${a.maKH}`, { hoTen: a.hoTen, sdt: S.kq.Em.sdt, cccd: a.cccd, diaChi: a.diaChi }), [400, 409], 'Số điện thoại đã trùng!', 'sdt')
})
tc('TC-UC7.4-03', { ...U('UC_7.4'), ten: 'Sửa CCCD sai định dạng', loai: 'Ngoại lệ', nguon: 'Exception 6.d, BR03', tienDieuKien: 'Quen An tồn tại', buoc: 'Đổi CCCD thành "12345abc9012"', duLieu: '12345abc9012', mongDoi: '"CCCD không hợp lệ!"' }, async (t) => {
  const a = S.kq.An
  return t.loiNV(await S.cq.put(`/cong-no/khach-quen/${a.maKH}`, { hoTen: a.hoTen, sdt: a.sdt, cccd: '12345abc9012', diaChi: a.diaChi }), 400, 'CCCD không hợp lệ!', 'cccd')
})
tc('TC-UC7.4-04', { ...U('UC_7.4'), ten: 'Sửa bỏ trống họ tên', loai: 'Ngoại lệ', nguon: 'Exception 6.a, BR01', tienDieuKien: 'Quen An tồn tại', buoc: 'Xóa trống họ tên', duLieu: '""', mongDoi: '"Không được để trống!"' }, async (t) => {
  const a = S.kq.An
  return t.loiNV(await S.cq.put(`/cong-no/khach-quen/${a.maKH}`, { hoTen: '', sdt: a.sdt, cccd: a.cccd, diaChi: a.diaChi }), 400, 'Không được để trống!', 'hoTen')
})
tc('TC-UC7.4-05', { ...U('UC_7.4'), ten: 'Nhân viên không được sửa khách quen', loai: 'Phân quyền', nguon: 'Actors: Chủ quán', tienDieuKien: 'Nhân viên đã đăng nhập', buoc: 'Nhân viên gọi sửa khách quen', duLieu: 'Phiên nhanvien1', mongDoi: 'Bị từ chối (403)' }, async (t) => {
  const a = S.kq.An
  const r = await S.nv.put(`/cong-no/khach-quen/${a.maKH}`, { hoTen: a.hoTen, sdt: a.sdt, cccd: a.cccd, diaChi: 'x' })
  t.status(r, 403)
  return moTa(r)
})

// ================================================================== UC_7.1 Tạo hóa đơn nợ
tc('TC-UC7.1-01', { ...U('UC_7.1'), ten: 'Nhân viên tạo hóa đơn nợ cho khách quen hợp lệ', loai: 'Luồng chính', nguon: 'Main flow 1–13, BR01–BR03, BR05', tienDieuKien: 'Quen An không nợ; giỏ A ×2, G ×1', buoc: '1. Chọn "Ghi nợ", tìm và chọn Quen An\n2. Xem thông tin hóa đơn nợ\n3. "Tạo hóa đơn nợ"', duLieu: 'A ×2, G ×1 (34.000 đ)', mongDoi: 'Hiển thị nợ trước 0, tổng nợ sau đơn, hạn mức 1.000.000, hạn thanh toán = hôm nay + 30; tạo hóa đơn "Còn nợ" mã HD-dd/mm/yyyy.nnn; dư nợ khách tăng; tồn kho giảm' }, async (t) => {
  const dong = [{ maHH: S.hh.A.maHH, soLuong: 2 }, { maHH: S.hh.G.maHH, soLuong: 1 }]
  const k = await kiemTraNo(S.nv, S.kq.An.maKH, dong)
  t.status(k, 200)
  t.bang(k.data?.noTruoc, 0, 'nợ trước')
  t.bang(k.data?.hanMuc, 1000000, 'hạn mức')
  t.bang(k.data?.hanThanhToan, ngayISO(30), 'hạn thanh toán')
  const tonA = (await S.cq.get(`/hang-hoa/${S.hh.A.maHH}`)).data?.tongTon
  const r = await ghiNo(S.nv, S.kq.An.maKH, dong)
  t.status(r, [200, 201])
  t.bang(r.data?.trangThai, 'Còn nợ', 'trạng thái hóa đơn')
  t.dung(/^HD-\d{2}\/\d{2}\/\d{4}\.\d{3,}$/.test(r.data?.maHD ?? '') && r.data.maHD.includes(ngayVN()), `Mã ${r.data?.maHD}`)
  const ct = await ctKQ(S.kq.An.maKH)
  t.bang(ct?.duNo, k.data?.tongNoSauDon, 'dư nợ khách')
  t.bang((await S.cq.get(`/hang-hoa/${S.hh.A.maHH}`)).data?.tongTon, tonA - 2, 'tồn A')
  S.hdNo = { An1: r.data }
  return `Kiểm tra: nợ trước ${k.data?.noTruoc}, đơn ${k.data?.donHienTai}, tổng sau ${k.data?.tongNoSauDon}, hạn mức ${k.data?.hanMuc}, hạn TT ${k.data?.hanThanhToan}\nHóa đơn: ${r.data?.maHD} | ${r.data?.loaiHoaDon} | ${r.data?.trangThai} | còn nợ ${r.data?.soTienConNo}; dư nợ khách ${ct?.duNo}; trạng thái ${ct?.trangThaiNo}`
})
tc('TC-UC7.1-02', { ...U('UC_7.1'), ten: 'Khách hàng không phải khách quen', loai: 'Ngoại lệ', nguon: 'Exception 7.a, BR01', tienDieuKien: 'Khách Bình là khách hàng thường', buoc: 'Chọn "Ghi nợ", chọn khách Bình', duLieu: 'Khách Bình', mongDoi: '"Khách hàng chưa là khách quen, không thể ghi nợ!"' }, async (t) => t.loiNV(await kiemTraNo(S.nv, S.kh.Binh.maKH, [{ maHH: S.hh.G.maHH, soLuong: 1 }]), [400, 409], 'Khách hàng chưa là khách quen, không thể ghi nợ!'))
tc('TC-UC7.1-03', { ...U('UC_7.1'), ten: 'Đơn hiện tại vượt hạn mức 1.000.000 đ', loai: 'Ngoại lệ', nguon: 'Exception 8.a, BR02', tienDieuKien: 'Quen Cúc không nợ', buoc: 'Ghi nợ đơn I ×20 (1.040.000 đ)', duLieu: 'I ×20', mongDoi: '"Tổng nợ vượt quá hạn mức cho phép!"; không tạo hóa đơn' }, async (t) => t.loiNV(await ghiNo(S.nv, S.kq.Cuc.maKH, [{ maHH: S.hh.I.maHH, soLuong: 20 }]), [400, 409], 'Tổng nợ vượt quá hạn mức cho phép!'))
tc('TC-UC7.1-04', { ...U('UC_7.1'), ten: 'Nợ cũ + đơn mới vượt hạn mức', loai: 'Ngoại lệ', nguon: 'Exception 8.a, BR02', tienDieuKien: 'Quen An đang nợ 34.000 đ', buoc: 'Ghi nợ thêm I ×19 (988.000 đ)', duLieu: 'I ×19', mongDoi: '"Tổng nợ vượt quá hạn mức cho phép!"' }, async (t) => t.loiNV(await kiemTraNo(S.nv, S.kq.An.maKH, [{ maHH: S.hh.I.maHH, soLuong: 19 }]), [400, 409], 'Tổng nợ vượt quá hạn mức cho phép!'))
tc('TC-UC7.1-05', { ...U('UC_7.1'), ten: 'Khách có khoản nợ cũ nhất quá 30 ngày', loai: 'Ngoại lệ', nguon: 'Exception 9.a, BR03', tienDieuKien: 'Quen Bảo có hóa đơn nợ lập cách đây 31 ngày (lùi ngày trong CSDL kiểm thử)', buoc: '1. Ghi nợ cho Quen Bảo C ×2\n2. Khoản nợ đó quá 30 ngày\n3. Ghi nợ tiếp', duLieu: 'C ×1', mongDoi: '"Khách hàng có khoản nợ quá hạn!"' }, async (t) => {
  const r = await ghiNo(S.nv, S.kq.Bao.maKH, [{ maHH: S.hh.C.maHH, soLuong: 2 }])
  t.status(r, [200, 201])
  S.hdNo.Bao = r.data
  lui(r.data?.maHD, 31)
  return t.loiNV(await kiemTraNo(S.nv, S.kq.Bao.maKH, [{ maHH: S.hh.C.maHH, soLuong: 1 }]), [400, 409], 'Khách hàng có khoản nợ quá hạn!')
})
tc('TC-UC7.1-06', { ...U('UC_7.1'), ten: 'Gửi hóa đơn nợ điện tử qua Zalo', loai: 'Luồng thay thế', nguon: 'Alternative 14.a', tienDieuKien: 'Đã tạo hóa đơn nợ TC-UC7.1-01', buoc: 'Chọn "Gửi hóa đơn điện tử", kênh Zalo, nhập SĐT', duLieu: 'SĐT Quen An', mongDoi: 'Gửi thành công' }, async (t) => {
  const r = await S.nv.post('/ban-hang/gui-hoa-don', { maHD: S.hdNo.An1.maHD, kenh: 'Zalo', sdt: S.kq.An.sdt })
  t.status(r, 200)
  return `${moTa(r)} "${r.data?.thongBao}"`
})

// ================================================================== UC_7.2 Tìm kiếm khách quen
const timKQ = (p, tuKhoa = '', trangThai = '') => p.get(`/cong-no/khach-quen?${new URLSearchParams({ tuKhoa, trangThai })}`)
tc('TC-UC7.2-01', { ...U('UC_7.2'), ten: 'Tìm khách quen theo một phần tên, không phân biệt hoa thường', loai: 'Luồng chính', nguon: 'Main flow 1–6, BR01', tienDieuKien: 'Có Quen Thử An', buoc: 'Nhập "quen thử an" → "Tìm kiếm"', duLieu: 'quen thử an', mongDoi: 'Hiển thị Quen An với tên, SĐT, trạng thái' }, async (t) => {
  const ds = (await timKQ(S.nv, 'quen thử an')).data ?? []
  t.dung(ds.some((x) => x.maKH === S.kq.An.maKH), 'Phải có Quen An')
  return ds.map((x) => `${x.hoTen} ${x.sdt} ${x.trangThaiNo}`).join('\n')
})
tc('TC-UC7.2-02', { ...U('UC_7.2'), ten: 'Tìm khách quen theo số điện thoại', loai: 'Luồng chính', nguon: 'Main flow 3', tienDieuKien: 'Có Quen Cúc', buoc: 'Nhập SĐT Quen Cúc', duLieu: 'SĐT Quen Cúc', mongDoi: 'Hiển thị Quen Cúc' }, async (t) => {
  const ds = (await timKQ(S.nv, S.kq.Cuc.sdt)).data ?? []
  t.dung(ds.length === 1 && ds[0].maKH === S.kq.Cuc.maKH, `Kết quả: ${ds.map((x) => x.hoTen).join(', ')}`)
  return `${ds.length} kết quả`
})
tc('TC-UC7.2-03', { ...U('UC_7.2'), ten: 'Trạng thái nợ: Còn hạn / Quá hạn / Không nợ / Sắp hết hạn', loai: 'Quy tắc nghiệp vụ', nguon: 'Alternative 3.b, BR02–BR05', tienDieuKien: 'Quen An nợ hôm nay; Quen Bảo nợ 31 ngày; Quen Cúc không nợ; Quen Dung nợ 25 ngày (lùi ngày trong CSDL kiểm thử)', buoc: 'Lọc lần lượt theo từng trạng thái', duLieu: '4 khách quen', mongDoi: 'An: Còn hạn; Bảo: Quá hạn; Cúc: Không nợ; Dung: Sắp hết hạn' }, async (t) => {
  const r = await ghiNo(S.nv, S.kq.Dung.maKH, [{ maHH: S.hh.C.maHH, soLuong: 1 }])
  lui(r.data?.maHD, 25)
  const mong = { An: 'Còn hạn', Bao: 'Quá hạn', Cuc: 'Không nợ', Dung: 'Sắp hết hạn' }
  const thuc = []
  for (const [k, tt] of Object.entries(mong)) {
    const ds = (await timKQ(S.nv, S.kq[k].hoTen, tt)).data ?? []
    const co = ds.some((x) => x.maKH === S.kq[k].maKH && x.trangThaiNo === tt)
    t.dung(co, `${S.kq[k].hoTen} phải có trạng thái "${tt}"`)
    thuc.push(`${S.kq[k].hoTen}: lọc "${tt}" → ${co ? 'có' : 'không có'}`)
  }
  return thuc.join('\n')
})
tc('TC-UC7.2-04', { ...U('UC_7.2'), ten: 'Không tìm thấy khách quen phù hợp', loai: 'Ngoại lệ', nguon: 'Exception 5.a', tienDieuKien: '-', buoc: 'Nhập tên không tồn tại', duLieu: 'Zzz Không Có', mongDoi: '"Không tìm thấy thông tin khách quen phù hợp!"' }, async (t) => {
  const r = await timKQ(S.nv, 'Zzz Khong Co')
  const rong = r.status === 200 && (r.data ?? []).length === 0
  if (!rong) t.loiNV(r, 404, 'Không tìm thấy thông tin khách quen phù hợp!')
  return rong ? 'HTTP 200, danh sách rỗng (giao diện hiển thị "Không tìm thấy thông tin khách quen phù hợp!")' : moTa(r)
})
tc('TC-UC7.2-05', { ...U('UC_7.2'), ten: 'Xem chi tiết khách quen', loai: 'Luồng thay thế', nguon: 'Alternative 6.a', tienDieuKien: 'Quen An đang nợ', buoc: 'Chọn Quen An trong danh sách', duLieu: 'Quen An', mongDoi: 'Hiển thị tên, SĐT, CCCD, địa chỉ, trạng thái, tổng dư nợ, hóa đơn nợ chưa thanh toán, hạn thanh toán khoản cũ nhất' }, async (t) => {
  const r = await S.nv.get(`/cong-no/khach-quen/${S.kq.An.maKH}`)
  t.status(r, 200)
  const c = r.data ?? {}
  const thieu = ['hoTen', 'sdt', 'cccd', 'diaChi', 'trangThaiNo', 'duNo', 'hoaDonChuaTra', 'hanThanhToanCuNhat'].filter((k) => c[k] === undefined || c[k] === null)
  t.dung(thieu.length === 0, `Thiếu: ${thieu.join(', ')}`)
  t.bang(c.hoaDonChuaTra?.length, 1, 'số hóa đơn chưa trả')
  return `${c.hoTen} | ${c.sdt} | ${c.cccd} | ${c.diaChi} | ${c.trangThaiNo} | dư nợ ${c.duNo} | ${c.hoaDonChuaTra?.length} HĐ chưa trả | hạn cũ nhất ${c.hanThanhToanCuNhat}`
})

// ================================================================== UC_7.3 Tạo phiếu thanh toán nợ
const thuNo = (p, maKH, maHoaDon, phuongThuc = 'Tiền mặt', them = {}) =>
  p.post('/cong-no/thu-no', { maKH, maHoaDon, phuongThuc, ...(phuongThuc === 'Tiền mặt' ? { tienKhachDua: '1000000' } : {}), ...them })
tc('TC-UC7.3-01', { ...U('UC_7.3'), ten: 'Nhân viên tìm khách đang có công nợ', loai: 'Luồng chính', nguon: 'Main flow 3–6', tienDieuKien: 'Quen An đang nợ', buoc: 'Nhập tên Quen An ở ô tìm khách thanh toán nợ', duLieu: 'Quen Thử An', mongDoi: 'Hiển thị Quen An trong danh sách khách có công nợ' }, async (t) => {
  const r = await S.nv.get(`/cong-no/khach-co-no?tuKhoa=${encodeURIComponent('Quen Thử An')}`)
  t.status(r, 200)
  t.dung((r.data ?? []).some((x) => x.maKH === S.kq.An.maKH), 'Phải có Quen An')
  return moTa(r)
})
tc('TC-UC7.3-02', { ...U('UC_7.3'), ten: 'Không tìm thấy khách có công nợ', loai: 'Ngoại lệ', nguon: 'Exception 6.a', tienDieuKien: 'Quen Cúc không nợ', buoc: 'Nhập tên Quen Cúc', duLieu: 'Quen Thử Cúc', mongDoi: '"Không tìm thấy khách hàng có công nợ!"' }, async (t) => {
  const r = await S.cq.get(`/cong-no/khach-co-no?tuKhoa=${encodeURIComponent('Quen Thử Cúc')}`)
  const rong = r.status === 200 && (r.data ?? []).length === 0
  if (!rong) t.loiNV(r, 404, 'Không tìm thấy khách hàng có công nợ!')
  return rong ? 'HTTP 200, danh sách rỗng (giao diện hiển thị "Không tìm thấy khách hàng có công nợ!")' : moTa(r)
})
tc('TC-UC7.3-03', { ...U('UC_7.3'), ten: 'Không được thanh toán bỏ qua hóa đơn nợ cũ nhất', loai: 'Quy tắc nghiệp vụ', nguon: 'BR02', tienDieuKien: 'Quen An có 2 hóa đơn nợ', buoc: '1. Ghi nợ thêm G ×1 cho Quen An\n2. Chỉ chọn hóa đơn mới hơn để thanh toán', duLieu: 'Hóa đơn nợ thứ 2', mongDoi: 'Bị từ chối – phải thanh toán theo thứ tự từ hóa đơn cũ nhất' }, async (t) => {
  const r2 = await ghiNo(S.nv, S.kq.An.maKH, [{ maHH: S.hh.G.maHH, soLuong: 1 }])
  t.status(r2, [200, 201])
  S.hdNo.An2 = r2.data
  const r = await thuNo(S.nv, S.kq.An.maKH, [r2.data?.maHD])
  t.status(r, [400, 409])
  return moTa(r)
})
tc('TC-UC7.3-04', { ...U('UC_7.3'), ten: 'Chuyển khoản không thành công', loai: 'Ngoại lệ', nguon: 'Exception 12.a.4', tienDieuKien: 'Quen An có hóa đơn nợ', buoc: 'Chọn hóa đơn cũ nhất, Chuyển khoản QR, ngân hàng báo lỗi', duLieu: 'HĐ nợ cũ nhất', mongDoi: '"Thanh toán không thành công!"; dư nợ không đổi' }, async (t) => {
  const truoc = (await ctKQ(S.kq.An.maKH))?.duNo
  const r = await thuNo(S.nv, S.kq.An.maKH, [S.hdNo.An1.maHD], 'Chuyển khoản QR', { ketQuaQrGiaLap: 'ThatBai' })
  const kq2 = t.loiNV(r, 402, 'Thanh toán không thành công!')
  t.bang((await ctKQ(S.kq.An.maKH))?.duNo, truoc, 'dư nợ')
  return kq2
})
tc('TC-UC7.3-05', { ...U('UC_7.3'), ten: 'Thanh toán nợ tiền mặt – hóa đơn cũ nhất', loai: 'Luồng chính', nguon: 'Main flow 1–17, BR02, BR03, BR06', tienDieuKien: 'Quen An có 2 hóa đơn nợ', buoc: '1. Chọn Quen An, tích hóa đơn cũ nhất\n2. "Xác nhận" → Tiền mặt → đã nhận đủ', duLieu: 'HĐ nợ cũ nhất (34.000 đ)', mongDoi: '"Tạo phiếu thanh toán thành công!"; mã PTTN-dd/mm/yyyy.nnn; hóa đơn chuyển "Đã thanh toán"; dư nợ giảm 34.000' }, async (t) => {
  const truoc = (await ctKQ(S.kq.An.maKH))?.duNo
  const r = await thuNo(S.nv, S.kq.An.maKH, [S.hdNo.An1.maHD])
  t.status(r, [200, 201])
  t.dung(/^PTTN-\d{2}\/\d{2}\/\d{4}\.\d{3,}$/.test(r.data?.maPTT ?? ''), `Mã phiếu ${r.data?.maPTT}`)
  const sau = await ctKQ(S.kq.An.maKH)
  t.bang(sau?.duNo, truoc - S.hdNo.An1.tongTienThanhToan, 'dư nợ sau')
  const hd = (await S.nv.get(`/hoa-don/chi-tiet?ma=${encodeURIComponent(S.hdNo.An1.maHD)}`)).data
  t.bang(hd?.trangThai, 'Đã thanh toán', 'trạng thái hóa đơn nợ')
  S.ptt = r.data
  return `${r.data?.maPTT} | ${r.data?.phuongThuc} | ${r.data?.tongTien} | người thu ${r.data?.nguoiThu}; dư nợ ${truoc} → ${sau?.duNo}; HĐ ${hd?.maHD}: ${hd?.trangThai}`
})
tc('TC-UC7.3-06', { ...U('UC_7.3'), ten: 'Khách bị khóa quyền mua nợ vẫn thanh toán được; hết quá hạn thì mở lại quyền mua nợ', loai: 'Quy tắc nghiệp vụ', nguon: 'BR04, BR05; Alternative 12.a (QR)', tienDieuKien: 'Quen Bảo có khoản nợ quá hạn', buoc: '1. Thanh toán hóa đơn nợ quá hạn của Quen Bảo bằng QR (ngân hàng xác nhận)\n2. Ghi nợ lại cho Quen Bảo', duLieu: 'HĐ nợ của Quen Bảo', mongDoi: 'Thanh toán thành công; sau đó Quen Bảo được ghi nợ trở lại' }, async (t) => {
  const q = await S.nv.post('/tich-hop/qr', { soTien: S.hdNo.Bao.tongTienThanhToan })
  const r = await thuNo(S.nv, S.kq.Bao.maKH, [S.hdNo.Bao.maHD], 'Chuyển khoản QR', { ketQuaQrGiaLap: 'ThanhCong', maThamChieuQr: q.data?.maThamChieu })
  t.status(r, [200, 201])
  const k = await kiemTraNo(S.nv, S.kq.Bao.maKH, [{ maHH: S.hh.C.maHH, soLuong: 1 }])
  t.status(k, 200)
  return `Thanh toán: ${moTa(r)} ${r.data?.maPTT ?? ''}; ghi nợ lại: ${moTa(k)}`
})
tc('TC-UC7.3-07', { ...U('UC_7.3'), ten: 'Gửi phiếu thanh toán điện tử qua SMS', loai: 'Luồng thay thế', nguon: 'Alternative 18.a', tienDieuKien: 'Đã có phiếu TC-UC7.3-05', buoc: 'Chọn gửi phiếu, kênh SMS, nhập SĐT', duLieu: 'SĐT Quen An', mongDoi: '"Gửi phiếu thanh toán điện tử thành công!"' }, async (t) => {
  const r = await S.nv.post('/cong-no/gui-phieu', { maPTT: S.ptt?.maPTT, kenh: 'SMS', sdt: S.kq.An.sdt })
  t.status(r, 200)
  t.thongBao(r, 'Gửi phiếu thanh toán điện tử thành công!')
  return `${moTa(r)} "${r.data?.thongBao}"`
})

// ================================================================== UC_7.6 Xóa khách quen
tc('TC-UC7.6-01', { ...U('UC_7.6'), ten: 'Không xóa khách quen còn dư nợ', loai: 'Ngoại lệ', nguon: 'Exception 3.a, BR01', tienDieuKien: 'Quen An còn dư nợ', buoc: 'Chọn Quen An → "Xóa khách quen"', duLieu: 'Quen An', mongDoi: '"Không thể xóa khách quen còn dư nợ!"' }, async (t) => t.loiNV(await S.cq.post(`/cong-no/khach-quen/${S.kq.An.maKH}/xoa`), [400, 409], 'Không thể xóa khách quen còn dư nợ!'))
tc('TC-UC7.6-02', { ...U('UC_7.6'), ten: 'Xóa khách quen không còn nợ – không mua nợ được nữa, giữ lịch sử', loai: 'Luồng chính', nguon: 'Main flow 1–7, BR02, BR03', tienDieuKien: 'Quen Em đã từng nợ và đã trả hết', buoc: '1. Ghi nợ cho Quen Em rồi thanh toán hết\n2. "Xóa khách quen" → "Xác nhận"\n3. Thử ghi nợ lại, tìm lịch sử hóa đơn', duLieu: 'Quen Em', mongDoi: '"Xóa khách quen thành công!"; không còn trong danh sách khách quen; ghi nợ bị từ chối; hóa đơn nợ cũ vẫn tra cứu được' }, async (t) => {
  const h = await ghiNo(S.nv, S.kq.Em.maKH, [{ maHH: S.hh.C.maHH, soLuong: 1 }])
  await thuNo(S.nv, S.kq.Em.maKH, [h.data?.maHD])
  const r = await S.cq.post(`/cong-no/khach-quen/${S.kq.Em.maKH}/xoa`)
  t.status(r, 200)
  t.thongBao(r, 'Xóa khách quen thành công!')
  const ds = (await timKQ(S.cq, S.kq.Em.hoTen)).data ?? []
  t.dung(!ds.some((x) => x.maKH === S.kq.Em.maKH), 'Không còn trong danh sách khách quen')
  const k = await kiemTraNo(S.nv, S.kq.Em.maKH, [{ maHH: S.hh.C.maHH, soLuong: 1 }])
  t.dung(k.status !== 200, 'Không được ghi nợ sau khi xóa')
  const ls = await S.cq.get(`/hoa-don/chi-tiet?ma=${encodeURIComponent(h.data?.maHD)}`)
  t.status(ls, 200)
  return `${moTa(r)} "${r.data?.thongBao}"; ghi nợ lại: ${moTa(k)}; hóa đơn nợ cũ ${h.data?.maHD}: HTTP ${ls.status}`
})
tc('TC-UC7.6-03', { ...U('UC_7.6'), ten: 'Nhân viên không được xóa khách quen', loai: 'Phân quyền', nguon: 'Actors: Chủ quán', tienDieuKien: 'Nhân viên đã đăng nhập', buoc: 'Nhân viên gọi xóa khách quen', duLieu: 'Phiên nhanvien1', mongDoi: 'Bị từ chối (403)' }, async (t) => {
  const r = await S.nv.post(`/cong-no/khach-quen/${S.kq.Cuc.maKH}/xoa`)
  t.status(r, 403)
  return moTa(r)
})
