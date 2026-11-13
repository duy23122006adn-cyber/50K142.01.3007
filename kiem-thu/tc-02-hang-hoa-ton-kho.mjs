// Nhóm 2 – Hàng hóa (UC_4.1–4.4), Lô hàng (UC_10.1), Tồn kho & cảnh báo (UC_3.1–3.3).
import { RUN, S, moTa, ngayISO, sql, tc } from './lib.mjs'

const NHOM = 'Hàng hóa, Lô hàng & Tồn kho'
const TEN = (s) => `KT${RUN} ${s}`
const hh = (ten, doi = {}) => ({
  tenHH: ten,
  maVach: '',
  maDM: S.maDM,
  donViTinh: 'chai',
  giaNhap: '8000',
  giaBan: '10000',
  nguongCanhBaoHetHang: '5',
  nguongCanhBaoHetHan: '10',
  ...doi,
})
/** Thêm hàng (+ lô) phục vụ các nhóm sau; ném lỗi nếu không tạo được. */
export async function taoHang(khoa, ten, lo = [], doi = {}) {
  const r = await S.cq.post('/hang-hoa', hh(ten, doi))
  if (r.status !== 200 && r.status !== 201) throw new Error(`Không tạo được hàng ${ten}: ${moTa(r)}`)
  const maHH = r.data.ma
  S.hh ??= {}
  S.hh[khoa] = { maHH, ten, lo: [] }
  for (const [soLuong, lech] of lo) {
    const l = await S.cq.post('/lo-hang', { tenHangHoa: ten, soLuong: String(soLuong), hanSuDung: ngayISO(lech) })
    if (l.status !== 200 && l.status !== 201) throw new Error(`Không tạo được lô cho ${ten}: ${moTa(l)}`)
    S.hh[khoa].lo.push(l.data.ma)
  }
  return S.hh[khoa]
}
const loCua = async (maHH) => (await S.cq.get(`/ton-kho?tuKhoa=${encodeURIComponent(maHH)}`)).data?.danhSach ?? []
const canhBao = async (loai = '', caDaXuLy = false) =>
  (await S.cq.get(`/ton-kho/canh-bao?loai=${encodeURIComponent(loai)}${caDaXuLy ? '&caDaXuLy=true' : ''}`)).data?.danhSach ?? []
/** "Không tìm thấy": chấp nhận 404 kèm thông báo, hoặc 200 với danh sách rỗng (giao diện hiển thị thông báo). */
const khongThay = (t, r, msg) => {
  const rong = r.status === 200 && (r.data?.danhSach ?? r.data ?? []).length === 0
  if (!rong) t.loiNV(r, 404, msg)
  return rong ? `HTTP 200, danh sách rỗng (giao diện hiển thị "${msg}")` : moTa(r)
}

// ================================================================== Chuẩn bị
tc('TC-CB-02', { uc: 'Chuẩn bị', nhom: NHOM, ten: 'Lấy danh mục và đơn vị tính', loai: 'Chuẩn bị', nguon: '-', tienDieuKien: 'Chủ quán đã đăng nhập', buoc: 'Mở form thêm hàng hóa', duLieu: '-', mongDoi: 'Có danh sách danh mục' }, async (t) => {
  const dm = await S.cq.get('/hang-hoa/danh-muc')
  t.status(dm, 200)
  S.danhMuc = dm.data
  S.maDM = dm.data?.[0]?.maDM
  return `${dm.data?.length} danh mục`
})

// ================================================================== UC_4.1 Thêm hàng hóa
const U41 = { uc: 'UC_4.1', nhom: NHOM }
const loiThemHH = (ma, ten, nguon, duLieu, mongDoi, body, msg, truong) =>
  tc(ma, { ...U41, ten, loai: 'Ngoại lệ', nguon, tienDieuKien: 'Chủ quán ở form "Thêm hàng hóa"', buoc: '1. Nhập thông tin hàng hóa\n2. Nhấn "Lưu"', duLieu, mongDoi }, async (t) => t.loiNV(await S.cq.post('/hang-hoa', body()), 400, msg, truong))

tc('TC-UC4.1-01', { ...U41, ten: 'Droplist đơn vị tính và danh mục đúng đặc tả', loai: 'Quy tắc nghiệp vụ', nguon: 'BR05, BR06', tienDieuKien: 'Chủ quán mở form thêm hàng hóa', buoc: 'Xem droplist Đơn vị tính và Danh mục', duLieu: '-', mongDoi: 'ĐVT: gói, cái, chai, lon, hộp, lốc, thùng; 11 danh mục theo BR06' }, async (t) => {
  const dvt = (await S.cq.get('/hang-hoa/don-vi-tinh')).data ?? []
  const mong = ['gói', 'cái', 'chai', 'lon', 'hộp', 'lốc', 'thùng']
  t.dung(mong.every((x) => dvt.includes(x)) && dvt.length === mong.length, `ĐVT thực tế: ${dvt.join(', ')}`)
  const ten = (S.danhMuc ?? []).map((d) => d.tenDM)
  const mongDM = ['Gia vị', 'Bánh kẹo & Đồ ăn vặt', 'Mì tôm', 'Bún & Phở khô', 'Bột giặt / Nước giặt', 'Nước xả', 'Sữa tắm', 'Dầu gội', 'Nước giải khát', 'Sữa & Sản phẩm từ sữa', 'Gạo & Nông sản khô']
  t.dung(ten.length === 11 && mongDM.every((x) => ten.includes(x)), `Danh mục thực tế (${ten.length}): ${ten.join(', ')}`)
  return `ĐVT: ${dvt.join(', ')}\nDanh mục (${ten.length}): ${ten.join(', ')}`
})
tc('TC-UC4.1-02', { ...U41, ten: 'Thêm hàng hóa hợp lệ – mã HH-xxxx tự sinh', loai: 'Luồng chính', nguon: 'Main flow 1–7, BR04 (SUA_BAO_CAO 3.6)', tienDieuKien: 'Chủ quán ở màn hình Quản lý hàng hóa', buoc: '1. Chọn "Thêm hàng hóa" (xem mã dự kiến)\n2. Nhập đủ thông tin\n3. Nhấn "Lưu"', duLieu: `Tên "${TEN('Nước ngọt A')}", chai, nhập 8.000, bán 10.000, ngưỡng hết hàng 5, hết hạn 10`, mongDoi: 'Lưu thành công; mã hàng dạng HH-xxxx, đúng mã dự kiến hiển thị trên form' }, async (t) => {
  const duKien = (await S.cq.get('/hang-hoa/ma-du-kien')).data?.ma
  const r = await S.cq.post('/hang-hoa', hh(TEN('Nước ngọt A')))
  t.status(r, [200, 201])
  t.dung(/^HH-\d{4,}$/.test(r.data?.ma ?? ''), `Mã đúng định dạng HH-xxxx, thực tế ${r.data?.ma}`)
  t.bang(r.data?.ma, duKien, 'mã so với mã dự kiến')
  const ct = (await S.cq.get(`/hang-hoa/${r.data?.ma}`)).data
  t.bang(ct?.trangThai, 'Đang kinh doanh', 'trạng thái')
  S.hh = { A: { maHH: r.data?.ma, ten: TEN('Nước ngọt A'), lo: [] } }
  return `Mã dự kiến ${duKien}; ${moTa(r)}; mã ${r.data?.ma}; trạng thái ${ct?.trangThai}`
})
loiThemHH('TC-UC4.1-03', 'Bỏ trống tên hàng hóa', 'Exception 5a, BR01', 'Tên ""', '"Không được để trống!" dưới trường Tên', () => hh(''), 'Không được để trống!', 'tenHH')
loiThemHH('TC-UC4.1-04', 'Bỏ trống danh mục', 'Exception 5a, BR01', 'Danh mục ""', '"Không được để trống!" dưới trường Danh mục', () => hh(TEN('Thiếu DM'), { maDM: '' }), 'Không được để trống!', 'maDM')
loiThemHH('TC-UC4.1-05', 'Bỏ trống giá nhập', 'Exception 5a, BR01', 'Giá nhập ""', '"Không được để trống!" dưới trường Giá nhập', () => hh(TEN('Thiếu GN'), { giaNhap: '' }), 'Không được để trống!', 'giaNhap')
loiThemHH('TC-UC4.1-06', 'Tên hàng hóa đã tồn tại', 'Exception 5b, BR02', 'Tên trùng hàng A', '"Tên hàng hóa đã tồn tại!"', () => hh(TEN('Nước ngọt A')), 'Tên hàng hóa đã tồn tại!', 'tenHH')
loiThemHH('TC-UC4.1-07', 'Giá nhập bằng 0', 'Exception 5c, BR03', 'Giá nhập "0"', '"Giá nhập không hợp lệ!"', () => hh(TEN('GN0'), { giaNhap: '0' }), 'Giá nhập không hợp lệ!', 'giaNhap')
loiThemHH('TC-UC4.1-08', 'Giá bán không phải số', 'Exception 5d, BR03', 'Giá bán "abc"', '"Giá bán không hợp lệ!"', () => hh(TEN('GBabc'), { giaBan: 'abc' }), 'Giá bán không hợp lệ!', 'giaBan')
loiThemHH('TC-UC4.1-09', 'Giá bán âm', 'Exception 5d, BR03', 'Giá bán "-1000"', '"Giá bán không hợp lệ!"', () => hh(TEN('GBam'), { giaBan: '-1000' }), 'Giá bán không hợp lệ!', 'giaBan')
loiThemHH('TC-UC4.1-10', 'Ngưỡng cảnh báo hết hạn bằng 0', 'Exception 5e, BR03', 'Ngưỡng hết hạn "0"', '"Ngưỡng cảnh báo hết hạn không hợp lệ!"', () => hh(TEN('NH0'), { nguongCanhBaoHetHan: '0' }), 'Ngưỡng cảnh báo hết hạn không hợp lệ!', 'nguongCanhBaoHetHan')
loiThemHH('TC-UC4.1-11', 'Ngưỡng cảnh báo hết hàng không phải số', 'Exception 5f, BR03', 'Ngưỡng hết hàng "x"', '"Ngưỡng cảnh báo hết hàng không hợp lệ!"', () => hh(TEN('NHx'), { nguongCanhBaoHetHang: 'x' }), 'Ngưỡng cảnh báo hết hàng không hợp lệ!', 'nguongCanhBaoHetHang')
tc('TC-UC4.1-12', { ...U41, ten: 'Đơn vị tính ngoài droplist', loai: 'Quy tắc nghiệp vụ', nguon: 'BR05', tienDieuKien: 'Chủ quán ở form thêm hàng hóa', buoc: 'Gửi đơn vị tính không có trong droplist', duLieu: 'ĐVT "kg"', mongDoi: 'Không lưu, báo lỗi đơn vị tính' }, async (t) => {
  const r = await S.cq.post('/hang-hoa', hh(TEN('DVT kg'), { donViTinh: 'kg' }))
  t.status(r, 400)
  return moTa(r)
})
tc('TC-UC4.1-13', { ...U41, ten: 'Nhân viên không được thêm hàng hóa', loai: 'Phân quyền', nguon: 'Actors: Chủ quán', tienDieuKien: 'Nhân viên đã đăng nhập', buoc: 'Nhân viên gọi chức năng thêm hàng hóa', duLieu: 'Phiên nhanvien1', mongDoi: 'Bị từ chối (403)' }, async (t) => {
  const r = await S.nv.post('/hang-hoa', hh(TEN('NV them')))
  t.status(r, 403)
  return moTa(r)
})
tc('TC-CB-03', { uc: 'Chuẩn bị', nhom: NHOM, ten: 'Tạo hàng hóa và lô dùng cho các nhóm sau', loai: 'Chuẩn bị', nguon: 'UC_4.1, UC_10.1', tienDieuKien: 'Chủ quán đã đăng nhập', buoc: 'Thêm 8 mặt hàng và các lô', duLieu: 'B (2 lô cho FEFO), C (ít hàng), D (cận hạn), E (không tồn), F (còn tồn), G (bán chậm), H (2 cái), I/J (đổi trả)', mongDoi: 'Tạo đủ dữ liệu' }, async (t) => {
  await S.cq.post('/lo-hang', { tenHangHoa: S.hh.A.ten, soLuong: '50', hanSuDung: ngayISO(60) }).then((l) => S.hh.A.lo.push(l.data?.ma))
  await taoHang('B', TEN('Bánh B'), [[10, 90], [10, 20]], { donViTinh: 'gói', giaNhap: '15000', giaBan: '20000' })
  await taoHang('C', TEN('Mì C'), [[3, 120]], { donViTinh: 'gói', giaNhap: '3000', giaBan: '4000' })
  await taoHang('D', TEN('Sữa D'), [[8, 3]], { donViTinh: 'hộp', giaNhap: '6000', giaBan: '7000' })
  await taoHang('E', TEN('Xà phòng E'), [], { donViTinh: 'cái' })
  await taoHang('F', TEN('Dầu gội F'), [[4, 200]], { donViTinh: 'chai', giaNhap: '40000', giaBan: '50000' })
  await taoHang('G', TEN('Gia vị G'), [[30, 200]], { donViTinh: 'gói', giaNhap: '9000', giaBan: '12000' })
  await taoHang('H', TEN('Nước mắm H'), [[2, 200]], { donViTinh: 'chai', giaNhap: '25000', giaBan: '30000' })
  await taoHang('I', TEN('Bột giặt I'), [[40, 300]], { donViTinh: 'gói', giaNhap: '45000', giaBan: '52000' })
  await taoHang('J', TEN('Bánh quy J'), [[40, 300]], { donViTinh: 'hộp', giaNhap: '25000', giaBan: '32000' })
  await taoHang('K', TEN('Kẹo K'), [[2, 300]], { donViTinh: 'gói', giaNhap: '5000', giaBan: '6000' })
  return Object.entries(S.hh).map(([k, v]) => `${k}=${v.maHH}${v.lo.length ? ` (${v.lo.join(', ')})` : ''}`).join('; ')
})

// ================================================================== UC_4.2 Sửa hàng hóa
const U42 = { uc: 'UC_4.2', nhom: NHOM }
const formHH = (ct, doi = {}) => ({
  tenHH: ct.tenHH,
  maVach: ct.maVach ?? '',
  maDM: ct.maDM,
  donViTinh: ct.donViTinh,
  giaNhap: String(ct.giaNhap),
  giaBan: String(ct.giaBan),
  nguongCanhBaoHetHang: String(ct.nguongCanhBaoHetHang ?? ''),
  nguongCanhBaoHetHan: String(ct.nguongCanhBaoHetHan ?? ''),
  ...doi,
})
const loiSuaHH = (ma, ten, nguon, duLieu, mongDoi, doi, msg, truong) =>
  tc(ma, { ...U42, ten, loai: 'Ngoại lệ', nguon, tienDieuKien: 'Chủ quán đang sửa hàng A', buoc: '1. Sửa thông tin\n2. Nhấn "Lưu"', duLieu, mongDoi }, async (t) => {
    const ct = (await S.cq.get(`/hang-hoa/${S.hh.A.maHH}`)).data
    return t.loiNV(await S.cq.put(`/hang-hoa/${S.hh.A.maHH}`, formHH(ct, doi())), 400, msg, truong)
  })
tc('TC-UC4.2-01', { ...U42, ten: 'Sửa hàng hóa hợp lệ (giữ nguyên tên của chính nó)', loai: 'Luồng chính', nguon: 'Main flow 1–7, BR04', tienDieuKien: 'Hàng A tồn tại', buoc: '1. Chọn hàng A → "Sửa"\n2. Đổi giá bán 10.000 → 11.000\n3. Nhấn "Lưu"', duLieu: 'Giá bán 11000', mongDoi: '"Cập nhật hàng hóa thành công"; giá bán mới được lưu' }, async (t) => {
  const ct = (await S.cq.get(`/hang-hoa/${S.hh.A.maHH}`)).data
  const r = await S.cq.put(`/hang-hoa/${S.hh.A.maHH}`, formHH(ct, { giaBan: '11000' }))
  t.status(r, 200)
  t.thongBao(r, 'Cập nhật hàng hóa thành công')
  const sau = (await S.cq.get(`/hang-hoa/${S.hh.A.maHH}`)).data
  t.bang(sau?.giaBan, 11000, 'giá bán')
  return `${moTa(r)} "${r.data?.thongBao}"; giá bán sau sửa ${sau?.giaBan}`
})
loiSuaHH('TC-UC4.2-02', 'Đổi tên trùng hàng hóa khác', 'Exception 5b, BR02', 'Tên = tên hàng B', '"Tên hàng hóa đã tồn tại!"', () => ({ tenHH: S.hh.B.ten }), 'Tên hàng hóa đã tồn tại!', 'tenHH')
loiSuaHH('TC-UC4.2-03', 'Bỏ trống giá bán', 'Exception 5a, BR01', 'Giá bán ""', '"Không được để trống!"', () => ({ giaBan: '' }), 'Không được để trống!', 'giaBan')
loiSuaHH('TC-UC4.2-04', 'Giá nhập bằng 0', 'Exception 5c, BR03', 'Giá nhập "0"', '"Giá nhập không hợp lệ!"', () => ({ giaNhap: '0' }), 'Giá nhập không hợp lệ!', 'giaNhap')
loiSuaHH('TC-UC4.2-05', 'Ngưỡng cảnh báo hết hàng âm', 'Exception 5f, BR03', 'Ngưỡng hết hàng "-3"', '"Ngưỡng cảnh báo hết hàng không hợp lệ!"', () => ({ nguongCanhBaoHetHang: '-3' }), 'Ngưỡng cảnh báo hết hàng không hợp lệ!', 'nguongCanhBaoHetHang')
tc('TC-UC4.2-06', { ...U42, ten: 'Nhân viên không được sửa hàng hóa', loai: 'Phân quyền', nguon: 'Actors: Chủ quán', tienDieuKien: 'Nhân viên đã đăng nhập', buoc: 'Nhân viên gọi chức năng sửa', duLieu: 'Phiên nhanvien1', mongDoi: 'Bị từ chối (403)' }, async (t) => {
  const r = await S.nv.put(`/hang-hoa/${S.hh.A.maHH}`, hh(S.hh.A.ten))
  t.status(r, 403)
  return moTa(r)
})

// ================================================================== UC_4.3 Xóa hàng hóa
const U43 = { uc: 'UC_4.3', nhom: NHOM }
tc('TC-UC4.3-01', { ...U43, ten: 'Xóa hàng hóa còn tồn kho', loai: 'Ngoại lệ', nguon: 'Exception 5a, BR02', tienDieuKien: 'Hàng F còn 4 chai trong kho', buoc: '1. Chọn hàng F → "Xóa"\n2. "Đồng ý"', duLieu: 'Hàng F', mongDoi: '"Hàng hóa còn tồn kho, vui lòng điều chỉnh số lượng về 0"; hàng không bị xóa' }, async (t) => {
  const k = await S.cq.get(`/hang-hoa/${S.hh.F.maHH}/kiem-tra-xoa`)
  const x = k.status === 200 ? await S.cq.post(`/hang-hoa/${S.hh.F.maHH}/xoa`, { cheDo: k.data?.cheDo ?? 'XoaHan' }) : k
  const kq = t.loiNV(x, [400, 409], 'Hàng hóa còn tồn kho, vui lòng điều chỉnh số lượng về 0')
  t.status(await S.cq.get(`/hang-hoa/${S.hh.F.maHH}`), 200)
  return kq
})
tc('TC-UC4.3-02', { ...U43, ten: 'Xóa hàng hóa chưa có giao dịch, tồn = 0 – xóa thật', loai: 'Luồng chính', nguon: 'Main flow 1–7, BR01', tienDieuKien: 'Hàng E chưa có lô, chưa có giao dịch', buoc: '1. Chọn hàng E → "Xóa"\n2. "Đồng ý"', duLieu: 'Hàng E', mongDoi: '"Đã xoá thông tin hàng hóa này."; hàng không còn trong hệ thống' }, async (t) => {
  const k = await S.cq.get(`/hang-hoa/${S.hh.E.maHH}/kiem-tra-xoa`)
  t.bang(k.data?.cheDo, 'XoaHan', 'chế độ')
  const x = await S.cq.post(`/hang-hoa/${S.hh.E.maHH}/xoa`, { cheDo: 'XoaHan' })
  t.status(x, 200)
  t.thongBao(x, 'Đã xoá thông tin hàng hóa này')
  t.status(await S.cq.get(`/hang-hoa/${S.hh.E.maHH}`), 404)
  return `${k.data?.cheDo}; ${moTa(x)} "${x.data?.thongBao}"`
})
tc('TC-UC4.3-03', { ...U43, ten: 'Mã hàng hóa đã xóa không được cấp lại', loai: 'Quy tắc nghiệp vụ', nguon: 'UC_4.1 BR04', tienDieuKien: 'Hàng E vừa bị xóa hẳn', buoc: 'Thêm hàng hóa mới', duLieu: TEN('Sau xoa'), mongDoi: 'Mã mới lớn hơn mã của mọi hàng đã cấp (không dùng lại mã E)' }, async (t) => {
  const r = await S.cq.post('/hang-hoa', hh(TEN('Sau xoa')))
  const so = (m) => Number(String(m).replace(/\D/g, ''))
  const lonNhat = Math.max(...Object.values(S.hh).map((h) => so(h.maHH)))
  t.dung(so(r.data?.ma) > lonNhat, `Mã mới ${r.data?.ma} phải lớn hơn mã lớn nhất đã cấp (${lonNhat})`)
  t.dung(r.data?.ma !== S.hh.E.maHH, 'Không dùng lại mã E')
  S.hh.Z = { maHH: r.data?.ma, ten: TEN('Sau xoa'), lo: [] }
  return `Mã E đã xóa: ${S.hh.E.maHH}; mã mới: ${r.data?.ma}`
})
tc('TC-UC4.3-04', { ...U43, ten: 'Nhân viên không được xóa hàng hóa', loai: 'Phân quyền', nguon: 'Actors: Chủ quán', tienDieuKien: 'Nhân viên đã đăng nhập', buoc: 'Nhân viên gọi chức năng xóa', duLieu: 'Phiên nhanvien1', mongDoi: 'Bị từ chối (403)' }, async (t) => {
  const r = await S.nv.post(`/hang-hoa/${S.hh.Z.maHH}/xoa`, { cheDo: 'XoaHan' })
  t.status(r, 403)
  return moTa(r)
})

// ================================================================== UC_4.4 Tìm kiếm hàng hóa
const U44 = { uc: 'UC_4.4', nhom: NHOM }
tc('TC-UC4.4-01', { ...U44, ten: 'Tìm theo một phần tên, không phân biệt hoa thường', loai: 'Luồng chính', nguon: 'Main flow 1–5, BR01', tienDieuKien: 'Có hàng "KT… Bánh B"', buoc: 'Nhập "bánh b" (chữ thường, một phần) → "Tìm kiếm"', duLieu: `kt${RUN} bánh b`, mongDoi: 'Hiển thị hàng B với Mã hàng, Tên hàng, ĐVT, Trạng thái' }, async (t) => {
  const r = await S.cq.get(`/hang-hoa?tuKhoa=${encodeURIComponent(`kt${RUN} bánh b`)}&trang=1`)
  t.status(r, 200)
  const d = r.data?.danhSach?.[0]
  t.bang(d?.maHH, S.hh.B.maHH, 'hàng tìm được')
  t.dung(d && 'tenHH' in d && 'donViTinh' in d && 'trangThai' in d, 'Đủ cột Mã, Tên, ĐVT, Trạng thái')
  return `${r.data?.danhSach?.length} kết quả: ${d?.maHH} ${d?.tenHH} ${d?.donViTinh} ${d?.trangThai}`
})
tc('TC-UC4.4-02', { ...U44, ten: 'Không tìm thấy hàng hóa', loai: 'Ngoại lệ', nguon: 'Exception 4a', tienDieuKien: '-', buoc: 'Nhập tên không tồn tại → "Tìm kiếm"', duLieu: 'zzz_khong_co', mongDoi: '"Không tìm thấy hàng hóa"' }, async (t) => khongThay(t, await S.cq.get('/hang-hoa?tuKhoa=zzz_khong_co&trang=1'), 'Không tìm thấy hàng hóa'))
tc('TC-UC4.4-03', { ...U44, ten: 'Kết quả sắp xếp A→Z và phân trang 20 dòng', loai: 'Quy tắc nghiệp vụ', nguon: 'BR02', tienDieuKien: 'Có 22 hàng hóa cùng tiền tố', buoc: '1. Thêm 22 hàng "KT… Trang xx"\n2. Tìm "Trang", xem trang 1 và 2', duLieu: '22 hàng hóa', mongDoi: 'Trang 1 có 20 dòng, trang 2 có 2 dòng, tên tăng dần A→Z' }, async (t) => {
  for (let i = 22; i >= 1; i--) await S.cq.post('/hang-hoa', hh(TEN(`Trang ${String(i).padStart(2, '0')}`)))
  const tk = encodeURIComponent(`KT${RUN} Trang`)
  const t1 = (await S.cq.get(`/hang-hoa?tuKhoa=${tk}&trang=1`)).data
  const t2 = (await S.cq.get(`/hang-hoa?tuKhoa=${tk}&trang=2`)).data
  t.bang(t1?.danhSach?.length, 20, 'số dòng trang 1')
  t.bang(t2?.danhSach?.length, 2, 'số dòng trang 2')
  const ten = [...(t1?.danhSach ?? []), ...(t2?.danhSach ?? [])].map((x) => x.tenHH)
  t.dung(ten.every((x, i) => i === 0 || ten[i - 1].localeCompare(x, 'vi') <= 0), `Thứ tự: ${ten.slice(0, 4).join(', ')}…`)
  return `Tổng ${t1?.tongSo}, ${t1?.soTrang} trang; trang 1: ${t1?.danhSach?.length} dòng, trang 2: ${t2?.danhSach?.length} dòng; đầu: ${ten[0]}, cuối: ${ten.at(-1)}`
})
tc('TC-UC4.4-04', { ...U44, ten: 'Xem chi tiết hàng hóa', loai: 'Luồng chính', nguon: 'Main flow 6–7', tienDieuKien: 'Đã tìm thấy hàng A', buoc: 'Chọn hàng A trong danh sách', duLieu: 'Hàng A', mongDoi: 'Hiển thị Mã, Tên, Danh mục, ĐVT, Giá nhập, Giá bán, Ngưỡng hết hạn, Ngưỡng hết hàng' }, async (t) => {
  const ct = (await S.cq.get(`/hang-hoa/${S.hh.A.maHH}`)).data ?? {}
  const can = ['maHH', 'tenHH', 'tenDM', 'donViTinh', 'giaNhap', 'giaBan', 'nguongCanhBaoHetHan', 'nguongCanhBaoHetHang']
  const thieu = can.filter((k) => !(k in ct))
  t.dung(thieu.length === 0, `Thiếu trường: ${thieu.join(', ')}`)
  return `${ct.maHH} | ${ct.tenHH} | ${ct.tenDM} | ${ct.donViTinh} | nhập ${ct.giaNhap} | bán ${ct.giaBan} | ngưỡng hạn ${ct.nguongCanhBaoHetHan} | ngưỡng hàng ${ct.nguongCanhBaoHetHang}`
})

// ================================================================== UC_10.1 Thêm lô hàng
const U10 = { uc: 'UC_10.1', nhom: NHOM }
const loiThemLo = (ma, ten, nguon, duLieu, mongDoi, body, msg, truong) =>
  tc(ma, { ...U10, ten, loai: 'Ngoại lệ', nguon, tienDieuKien: 'Chủ quán ở form "Thêm lô hàng"', buoc: '1. Nhập tên hàng, số lượng, hạn sử dụng\n2. Nhấn "Lưu"', duLieu, mongDoi }, async (t) => t.loiNV(await S.cq.post('/lo-hang', body()), 400, msg, truong))
tc('TC-UC10.1-01', { ...U10, ten: 'Thêm lô hàng hợp lệ – mã LO-xxxxxx, cộng tổng tồn', loai: 'Luồng chính', nguon: 'Main flow 1–8, BR08 (SUA_BAO_CAO 3.23)', tienDieuKien: 'Hàng A đang kinh doanh, tồn 50', buoc: '1. Chọn "Thêm lô hàng" (xem mã dự kiến)\n2. Nhập tên hàng A, số lượng 20, HSD +90 ngày\n3. "Lưu"', duLieu: `Tên hàng A, 20, ${ngayISO(90)}`, mongDoi: 'Lưu thành công; mã lô dạng LO-xxxxxx đúng mã dự kiến; tổng tồn A = 70' }, async (t) => {
  const duKien = (await S.cq.get('/lo-hang/ma-du-kien')).data?.ma
  const r = await S.cq.post('/lo-hang', { tenHangHoa: S.hh.A.ten, soLuong: '20', hanSuDung: ngayISO(90) })
  t.status(r, [200, 201])
  t.dung(/^LO-\d{6,}$/.test(r.data?.ma ?? ''), `Mã đúng định dạng LO-xxxxxx, thực tế ${r.data?.ma}`)
  t.bang(r.data?.ma, duKien, 'mã so với mã dự kiến')
  const ton = (await S.cq.get(`/hang-hoa/${S.hh.A.maHH}`)).data?.tongTon
  t.bang(ton, 70, 'tổng tồn A')
  S.hh.A.lo.push(r.data?.ma)
  return `Mã dự kiến ${duKien}; ${moTa(r)}; mã ${r.data?.ma}; tổng tồn A = ${ton}`
})
tc('TC-UC10.1-02', { ...U10, ten: 'Tên hàng hóa khác chữ hoa/thường vẫn khớp', loai: 'Quy tắc nghiệp vụ', nguon: 'BR03', tienDieuKien: 'Hàng G đang kinh doanh', buoc: 'Nhập tên hàng G viết HOA toàn bộ', duLieu: 'Tên hàng G (in hoa), 5, +200 ngày', mongDoi: 'Thêm lô thành công cho hàng G' }, async (t) => {
  const r = await S.cq.post('/lo-hang', { tenHangHoa: S.hh.G.ten.toUpperCase(), soLuong: '5', hanSuDung: ngayISO(200) })
  t.status(r, [200, 201])
  return `${moTa(r)}; mã ${r.data?.ma}`
})
loiThemLo('TC-UC10.1-03', 'Bỏ trống tên hàng hóa', 'Exception 5a, BR01', 'Tên ""', '"Không được để trống!"', () => ({ tenHangHoa: '', soLuong: '5', hanSuDung: ngayISO(30) }), 'Không được để trống!', 'tenHangHoa')
loiThemLo('TC-UC10.1-04', 'Bỏ trống hạn sử dụng', 'Exception 5a, BR01', 'HSD ""', '"Không được để trống!"', () => ({ tenHangHoa: S.hh.A.ten, soLuong: '5', hanSuDung: '' }), 'Không được để trống!', 'hanSuDung')
loiThemLo('TC-UC10.1-05', 'Tên hàng không trùng khớp hàng đang kinh doanh', 'Exception 5b, BR03', 'Tên "Không có hàng này"', '"Vui lòng chọn hàng hóa đang kinh doanh có tên trùng khớp."', () => ({ tenHangHoa: 'Không có hàng này', soLuong: '5', hanSuDung: ngayISO(30) }), 'Vui lòng chọn hàng hóa đang kinh doanh có tên trùng khớp.')
loiThemLo('TC-UC10.1-06', 'Số lượng bằng 0', 'Exception 5c, BR02', 'Số lượng "0"', '"Số lượng không hợp lệ!"', () => ({ tenHangHoa: S.hh.A.ten, soLuong: '0', hanSuDung: ngayISO(30) }), 'Số lượng không hợp lệ!', 'soLuong')
loiThemLo('TC-UC10.1-07', 'Số lượng không phải số', 'Exception 5c, BR02', 'Số lượng "mười"', '"Số lượng không hợp lệ!"', () => ({ tenHangHoa: S.hh.A.ten, soLuong: 'mười', hanSuDung: ngayISO(30) }), 'Số lượng không hợp lệ!', 'soLuong')
loiThemLo('TC-UC10.1-08', 'Hạn sử dụng trước ngày hiện tại', 'Exception 5d, BR04', `HSD ${ngayISO(-1)}`, '"Hạn sử dụng phải từ ngày hiện tại trở đi!"', () => ({ tenHangHoa: S.hh.A.ten, soLuong: '5', hanSuDung: ngayISO(-1) }), 'Hạn sử dụng phải từ ngày hiện tại trở đi!', 'hanSuDung')
tc('TC-UC10.1-09', { ...U10, ten: 'Nhân viên không được thêm lô hàng', loai: 'Phân quyền', nguon: 'Actors: Chủ quán', tienDieuKien: 'Nhân viên đã đăng nhập', buoc: 'Nhân viên gọi chức năng thêm lô', duLieu: 'Phiên nhanvien1', mongDoi: 'Bị từ chối (403)' }, async (t) => {
  const r = await S.nv.post('/lo-hang', { tenHangHoa: S.hh.A.ten, soLuong: '5', hanSuDung: ngayISO(30) })
  t.status(r, 403)
  return moTa(r)
})

// ================================================================== UC_3.1 Tìm kiếm tồn kho
const U31 = { uc: 'UC_3.1', nhom: NHOM }
tc('TC-UC3.1-01', { ...U31, ten: 'Tìm tồn kho theo một phần tên, không phân biệt hoa thường – hiển thị theo lô', loai: 'Luồng chính', nguon: 'Main flow 1–5, BR01', tienDieuKien: 'Hàng B có 2 lô', buoc: 'Nhập "bánh b" (thường) → "Tìm kiếm"', duLieu: `kt${RUN} bánh b`, mongDoi: 'Hiển thị 2 lô của B gồm Mã lô, Mã hàng, Tên hàng, ĐVT, Số lượng tồn, HSD' }, async (t) => {
  const r = await S.nv.get(`/ton-kho?tuKhoa=${encodeURIComponent(`kt${RUN} bánh b`)}&trang=1`)
  t.status(r, 200)
  const ds = r.data?.danhSach ?? []
  t.bang(ds.length, 2, 'số lô')
  const d = ds[0] ?? {}
  t.dung(['maLo', 'maHH', 'tenHH', 'donViTinh', 'soLuongTon', 'hanSuDung'].every((k) => k in d), 'Đủ 6 cột')
  return ds.map((x) => `${x.maLo} ${x.maHH} ${x.tenHH} ${x.donViTinh} tồn ${x.soLuongTon} HSD ${x.hanSuDung}`).join('\n')
})
tc('TC-UC3.1-02', { ...U31, ten: 'Tìm tồn kho theo mã hàng hóa', loai: 'Quy tắc nghiệp vụ', nguon: 'BR01', tienDieuKien: 'Hàng A có lô', buoc: 'Nhập mã hàng A → "Tìm kiếm"', duLieu: 'Mã hàng A', mongDoi: 'Hiển thị các lô của hàng A' }, async (t) => {
  const ds = await loCua(S.hh.A.maHH)
  t.dung(ds.length > 0 && ds.every((x) => x.maHH === S.hh.A.maHH), `Kết quả: ${ds.map((x) => x.maHH).join(', ')}`)
  return `${ds.length} lô của ${S.hh.A.maHH}`
})
tc('TC-UC3.1-03', { ...U31, ten: 'Không tìm thấy hàng hóa trong tồn kho', loai: 'Ngoại lệ', nguon: 'Exception 4a', tienDieuKien: '-', buoc: 'Nhập tên không tồn tại → "Tìm kiếm"', duLieu: 'zzz_khong_co', mongDoi: '"Không tìm thấy hàng hóa!"' }, async (t) => khongThay(t, await S.nv.get('/ton-kho?tuKhoa=zzz_khong_co&trang=1'), 'Không tìm thấy hàng hóa!'))
tc('TC-UC3.1-04', { ...U31, ten: 'Kết quả tồn kho sắp xếp A→Z, 20 dòng/trang', loai: 'Quy tắc nghiệp vụ', nguon: 'BR02', tienDieuKien: 'Có > 20 lô', buoc: 'Mở danh sách tồn kho không lọc, xem trang 1', duLieu: '-', mongDoi: 'Tối đa 20 dòng/trang, tên tăng dần' }, async (t) => {
  const r = (await S.cq.get('/ton-kho?trang=1')).data
  const ten = (r?.danhSach ?? []).map((x) => x.tenHH)
  t.dung(ten.length <= 20 && r?.soDongMoiTrang === 20, `Số dòng ${ten.length}, mỗi trang ${r?.soDongMoiTrang}`)
  t.dung(ten.every((x, i) => i === 0 || ten[i - 1].localeCompare(x, 'vi', { sensitivity: 'base' }) <= 0), `Thứ tự: ${ten.slice(0, 5).join(', ')}…`)
  return `Tổng ${r?.tongSo} lô, ${r?.soTrang} trang; trang 1: ${ten.length} dòng`
})

// ================================================================== UC_3.2 Cảnh báo tồn kho
const U32 = { uc: 'UC_3.2', nhom: NHOM }
tc('TC-UC3.2-01', { ...U32, ten: 'Cảnh báo "Sắp hết hàng" khi 0 < tồn lô ≤ ngưỡng', loai: 'Quy tắc nghiệp vụ', nguon: 'BR01, BR04, BR05', tienDieuKien: 'Hàng C ngưỡng hết hàng 5, nhập lô 3 gói', buoc: 'Mở "Xem cảnh báo", tab "Sắp hết hàng"', duLieu: 'Lô của C', mongDoi: 'Có 1 cảnh báo "Sắp hết hàng" trạng thái "Chưa xử lý" cho lô của C, đủ các cột' }, async (t) => {
  const ds = (await canhBao('Sắp hết hàng')).filter((c) => c.maLo === S.hh.C.lo[0])
  t.bang(ds.length, 1, 'số cảnh báo của lô C')
  t.bang(ds[0]?.trangThai, 'Chưa xử lý', 'trạng thái')
  t.dung(['maLo', 'tenHH', 'donViTinh', 'soLuongTon', 'soNgayConLai', 'hanSuDung', 'loaiCanhBao', 'trangThai'].every((k) => k in (ds[0] ?? {})), 'Đủ 8 cột')
  return ds.map((c) => `${c.maLo} ${c.tenHH} tồn ${c.soLuongTon} còn ${c.soNgayConLai} ngày – ${c.loaiCanhBao} – ${c.trangThai}`).join('\n')
})
tc('TC-UC3.2-02', { ...U32, ten: 'Cảnh báo "Sắp hết hạn" khi số ngày còn lại ≤ ngưỡng', loai: 'Quy tắc nghiệp vụ', nguon: 'BR02, BR08', tienDieuKien: 'Hàng D ngưỡng hết hạn 10 ngày, lô HSD còn 3 ngày', buoc: 'Mở tab "Sắp hết hạn"', duLieu: 'Lô của D', mongDoi: 'Có cảnh báo "Sắp hết hạn", số ngày còn lại = 3' }, async (t) => {
  const ds = (await canhBao('Sắp hết hạn')).filter((c) => c.maLo === S.hh.D.lo[0])
  t.bang(ds.length, 1, 'số cảnh báo của lô D')
  t.bang(ds[0]?.soNgayConLai, 3, 'số ngày còn lại')
  return ds.map((c) => `${c.maLo} HSD ${c.hanSuDung} còn ${c.soNgayConLai} ngày – ${c.loaiCanhBao}`).join('\n')
})
tc('TC-UC3.2-03', { ...U32, ten: 'Lọc theo tab chỉ hiện đúng loại cảnh báo', loai: 'Luồng chính', nguon: 'Main flow 3–4', tienDieuKien: 'Có nhiều loại cảnh báo', buoc: 'Chọn tab "Sắp hết hạn"', duLieu: '-', mongDoi: 'Mọi dòng đều là "Sắp hết hạn"' }, async (t) => {
  const ds = await canhBao('Sắp hết hạn')
  t.dung(ds.length > 0 && ds.every((c) => c.loaiCanhBao === 'Sắp hết hạn'), `Các loại: ${[...new Set(ds.map((c) => c.loaiCanhBao))].join(', ')}`)
  return `${ds.length} dòng, loại: ${[...new Set(ds.map((c) => c.loaiCanhBao))].join(', ')}`
})
tc('TC-UC3.2-04', { ...U32, ten: 'Thêm lô mới đóng cảnh báo "Sắp hết hàng"', loai: 'Quy tắc nghiệp vụ', nguon: 'UC_10.1 Main flow 9; UC_3.2 BR06 (SUA_BAO_CAO 3.4)', tienDieuKien: 'Lô C đang có cảnh báo "Sắp hết hàng"', buoc: 'Thêm lô mới 20 gói cho hàng C', duLieu: 'Hàng C, 20, +150 ngày', mongDoi: 'Cảnh báo "Sắp hết hàng" của lô C chuyển "Đã xử lý"' }, async (t) => {
  const l = await S.cq.post('/lo-hang', { tenHangHoa: S.hh.C.ten, soLuong: '20', hanSuDung: ngayISO(150) })
  t.status(l, [200, 201])
  S.hh.C.lo.push(l.data?.ma)
  const ds = (await canhBao('Sắp hết hàng', true)).filter((c) => c.maLo === S.hh.C.lo[0])
  t.dung(ds.length > 0 && ds.every((c) => c.trangThai === 'Đã xử lý'), `Trạng thái: ${ds.map((c) => c.trangThai).join(', ') || 'không thấy cảnh báo'}`)
  return `Thêm lô ${l.data?.ma}; cảnh báo lô ${S.hh.C.lo[0]}: ${ds.map((c) => c.trangThai).join(', ')}`
})
tc('TC-UC3.2-05', { ...U32, ten: 'Nhân viên không được xem cảnh báo tồn kho', loai: 'Phân quyền', nguon: 'Actors: Chủ quán', tienDieuKien: 'Nhân viên đã đăng nhập', buoc: 'Nhân viên mở "Xem cảnh báo"', duLieu: 'Phiên nhanvien1', mongDoi: 'Bị từ chối (403)' }, async (t) => {
  const r = await S.nv.get('/ton-kho/canh-bao')
  t.status(r, 403)
  return moTa(r)
})

// ================================================================== UC_3.3 Điều chỉnh tồn kho
const U33 = { uc: 'UC_3.3', nhom: NHOM }
const loiDC = (ma, ten, nguon, duLieu, mongDoi, body, msg, truong) =>
  tc(ma, { ...U33, ten, loai: 'Ngoại lệ', nguon, tienDieuKien: 'Chủ quán mở biểu mẫu điều chỉnh lô G', buoc: '1. Nhập số lượng thực tế, HSD, lý do\n2. Nhấn "Lưu"', duLieu, mongDoi }, async (t) => {
    const lo = (await S.cq.get(`/ton-kho/lo/${S.hh.G.lo[0]}`)).data
    return t.loiNV(await S.cq.post(`/ton-kho/lo/${S.hh.G.lo[0]}/dieu-chinh`, body(lo)), 400, msg, truong)
  })
tc('TC-UC3.3-01', { ...U33, ten: 'Điều chỉnh tồn kho hợp lệ – tồn = số thực tế', loai: 'Luồng chính', nguon: 'Main flow 1–14, BR06', tienDieuKien: 'Lô A đầu tiên tồn 50', buoc: '1. Tìm hàng A → "Sửa" lô\n2. Nhập thực tế 45, lý do "Kiểm kê thiếu"\n3. "Lưu"', duLieu: 'Thực tế 45; lý do "Kiểm kê thiếu"', mongDoi: '"Điều chỉnh tồn kho thành công"; tồn lô = 45 (chênh lệch −5)' }, async (t) => {
  const maLo = S.hh.A.lo[0]
  const lo = (await S.cq.get(`/ton-kho/lo/${maLo}`)).data
  const r = await S.cq.post(`/ton-kho/lo/${maLo}/dieu-chinh`, { soLuongThucTe: '45', hanSuDung: lo?.hanSuDung, lyDo: 'Kiểm kê thiếu' })
  t.status(r, 200)
  t.thongBao(r, 'Điều chỉnh tồn kho thành công')
  const sau = (await S.cq.get(`/ton-kho/lo/${maLo}`)).data
  t.bang(sau?.soLuongTon, 45, 'tồn sau điều chỉnh')
  return `Tồn trước ${lo?.soLuongTon}; ${moTa(r)} "${r.data?.thongBao}"; tồn sau ${sau?.soLuongTon}`
})
loiDC('TC-UC3.3-02', 'Bỏ trống lý do điều chỉnh', 'Exception 11a, BR01', 'Lý do ""', '"Không được để trống" dưới trường Lý do', (lo) => ({ soLuongThucTe: '28', hanSuDung: lo?.hanSuDung, lyDo: '' }), 'Không được để trống', 'lyDo')
loiDC('TC-UC3.3-03', 'Số lượng thực tế âm', 'Exception 11b, BR04', 'Thực tế "-1"', '"Giá trị không hợp lệ!"', (lo) => ({ soLuongThucTe: '-1', hanSuDung: lo?.hanSuDung, lyDo: 'Thử' }), 'Giá trị không hợp lệ!', 'soLuongThucTe')
loiDC('TC-UC3.3-04', 'Số lượng thực tế không phải số', 'Exception 11b, BR04', 'Thực tế "abc"', '"Giá trị không hợp lệ!"', (lo) => ({ soLuongThucTe: 'abc', hanSuDung: lo?.hanSuDung, lyDo: 'Thử' }), 'Giá trị không hợp lệ!', 'soLuongThucTe')
loiDC('TC-UC3.3-05', 'Hạn sử dụng trước ngày hiện tại', 'Exception 11c', `HSD ${ngayISO(-2)}`, '"Hạn sử dụng phải từ ngày hiện tại trở đi!"', () => ({ soLuongThucTe: '30', hanSuDung: ngayISO(-2), lyDo: 'Thử' }), 'Hạn sử dụng phải từ ngày hiện tại trở đi!', 'hanSuDung')
tc('TC-UC3.3-06', { ...U33, ten: 'Lô có cảnh báo "Sắp hết hạn" không được sửa hạn sử dụng', loai: 'Quy tắc nghiệp vụ', nguon: 'BR05', tienDieuKien: 'Lô D có cảnh báo "Sắp hết hạn"', buoc: 'Mở biểu mẫu điều chỉnh lô D, đổi HSD', duLieu: `HSD mới ${ngayISO(60)}`, mongDoi: 'Trường HSD bị khóa; đổi HSD không được chấp nhận' }, async (t) => {
  const maLo = S.hh.D.lo[0]
  const lo = (await S.cq.get(`/ton-kho/lo/${maLo}`)).data
  t.bang(lo?.khoaHanSuDung, true, 'khóa HSD')
  const r = await S.cq.post(`/ton-kho/lo/${maLo}/dieu-chinh`, { soLuongThucTe: String(lo?.soLuongTon), hanSuDung: ngayISO(60), lyDo: 'Đổi hạn' })
  t.dung(r.status !== 200 || (await S.cq.get(`/ton-kho/lo/${maLo}`)).data?.hanSuDung === lo?.hanSuDung, 'HSD không được thay đổi')
  return `khoaHanSuDung = ${lo?.khoaHanSuDung}; gửi đổi HSD: ${moTa(r)}`
})
tc('TC-UC3.3-07', { ...U33, ten: 'Lô hết hạn sinh cảnh báo "Hết hạn" và bị khóa toàn bộ', loai: 'Quy tắc nghiệp vụ', nguon: 'BR05; UC_3.2 BR03, BR04', tienDieuKien: 'Lô F hết hạn (lùi HSD về hôm qua trong CSDL kiểm thử)', buoc: '1. Lô F hết hạn\n2. Điều chỉnh tồn lô F 4 → 3 (tồn kho thay đổi → hệ thống kiểm tra cảnh báo)\n3. Mở lại điều chỉnh lô F và lưu số lượng mới', duLieu: 'Thực tế 3, rồi 2', mongDoi: 'Sinh cảnh báo "Hết hạn" cho lô F; biểu mẫu khóa toàn bộ, lần điều chỉnh sau bị từ chối' }, async (t) => {
  const maLo = S.hh.F.lo[0]
  sql(`UPDATE LoHang SET HanSuDung = DATEADD(DAY,-1,CAST(SYSDATETIME() AS date)) WHERE MaLo='${maLo}'`)
  const lo0 = (await S.cq.get(`/ton-kho/lo/${maLo}`)).data
  const r1 = await S.cq.post(`/ton-kho/lo/${maLo}/dieu-chinh`, { soLuongThucTe: '3', hanSuDung: lo0?.hanSuDung, lyDo: 'Kiểm kê' })
  const cb = (await canhBao('Hết hạn')).filter((c) => c.maLo === maLo)
  t.dung(cb.length === 1, `Cảnh báo "Hết hạn" của lô F: ${cb.length}`)
  const lo = (await S.cq.get(`/ton-kho/lo/${maLo}`)).data
  t.bang(lo?.khoaToanBo, true, 'khóa toàn bộ')
  const r = await S.cq.post(`/ton-kho/lo/${maLo}/dieu-chinh`, { soLuongThucTe: '2', hanSuDung: lo?.hanSuDung, lyDo: 'Thử' })
  t.dung(r.status !== 200, 'Không được điều chỉnh lô hết hạn')
  return `Điều chỉnh lần 1 (kích hoạt kiểm tra): ${moTa(r1)}; cảnh báo Hết hạn: ${cb.length}; khoaToanBo = ${lo?.khoaToanBo}; điều chỉnh lần 2: ${moTa(r)}`
})
tc('TC-UC3.3-08', { ...U33, ten: 'Điều chỉnh về 0 sinh cảnh báo "Hết hàng"', loai: 'Quy tắc nghiệp vụ', nguon: 'UC_3.2 BR03, BR04', tienDieuKien: 'Lô K tồn 2', buoc: 'Điều chỉnh lô K về 0, lý do "Hỏng"', duLieu: 'Thực tế 0', mongDoi: 'Điều chỉnh thành công; có cảnh báo "Hết hàng" cho lô K' }, async (t) => {
  const maLo = S.hh.K.lo[0]
  const lo = (await S.cq.get(`/ton-kho/lo/${maLo}`)).data
  const r = await S.cq.post(`/ton-kho/lo/${maLo}/dieu-chinh`, { soLuongThucTe: '0', hanSuDung: lo?.hanSuDung, lyDo: 'Hỏng' })
  t.status(r, 200)
  const cb = (await canhBao('Hết hàng')).filter((c) => c.maLo === maLo)
  t.bang(cb.length, 1, 'số cảnh báo Hết hàng của lô K')
  return `${moTa(r)}; cảnh báo Hết hàng lô K: ${cb.length}`
})
tc('TC-UC3.3-09', { ...U33, ten: 'Nhân viên không được điều chỉnh tồn kho', loai: 'Phân quyền', nguon: 'SUA_BAO_CAO 3.5 (chỉ Chủ quán)', tienDieuKien: 'Nhân viên đã đăng nhập', buoc: 'Nhân viên gọi điều chỉnh lô G', duLieu: 'Phiên nhanvien1', mongDoi: 'Bị từ chối (403)' }, async (t) => {
  const r = await S.nv.post(`/ton-kho/lo/${S.hh.G.lo[0]}/dieu-chinh`, { soLuongThucTe: '1', hanSuDung: ngayISO(200), lyDo: 'x' })
  t.status(r, 403)
  return moTa(r)
})
