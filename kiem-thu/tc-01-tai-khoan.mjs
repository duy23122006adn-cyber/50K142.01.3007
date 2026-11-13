// Nhóm 1 – Đăng nhập (UC_1), Quản lý tài khoản (UC_2.1–2.4), Đăng xuất (UC_11).
import { CQ, NV1, Phien, RUN, S, moTa, phien, sdtMoi, sql, tc } from './lib.mjs'

const NHOM = 'Đăng nhập & Tài khoản'
const nv = (ten, sdt, email, matKhau = 'MatKhau123') => ({
  hoTen: 'Nguyễn Kiểm Thử',
  ngaySinh: '15/05/2000',
  sdt,
  email,
  tenDangNhap: ten,
  matKhau,
})
const dsNv = async (cq) => (await cq.get('/nhan-vien')).data ?? []
const timNv = async (cq, ten) => {
  for (const d of await dsNv(cq)) {
    const ct = (await cq.get(`/nhan-vien/${d.maND}`)).data
    if (ct?.tenDangNhap === ten) return ct
  }
  return null
}

// ================================================================== Chuẩn bị
tc('TC-CB-01', { uc: 'Chuẩn bị', nhom: NHOM, ten: 'Đăng nhập các phiên dùng chung (Chủ quán, Nhân viên)', loai: 'Chuẩn bị', nguon: '-', tienDieuKien: 'CSDL kiểm thử mới', buoc: 'Đăng nhập chuquan và nhanvien1', duLieu: 'chuquan / nhanvien1', mongDoi: 'Có 2 phiên đăng nhập hợp lệ' }, async (t) => {
  S.cq = await phien(CQ)
  S.nv = await phien(NV1)
  t.bang(S.cq.nguoiDung.vaiTro, 'ChuQuan', 'vai trò CQ')
  t.bang(S.nv.nguoiDung.vaiTro, 'NhanVien', 'vai trò NV')
  return `CQ: ${S.cq.nguoiDung.maND}, NV: ${S.nv.nguoiDung.maND}`
})

// ================================================================== UC_1 Đăng nhập
const U1 = { uc: 'UC_1', nhom: NHOM }
tc('TC-UC1-01', { ...U1, ten: 'Đăng nhập thành công – Chủ quán', loai: 'Luồng chính', nguon: 'Main flow 1–6, BR05', tienDieuKien: 'Tài khoản chuquan đang hoạt động', buoc: '1. Nhập tên đăng nhập, mật khẩu đúng\n2. Nhấn "Đăng nhập"', duLieu: 'chuquan / ChuQuan2026', mongDoi: 'Đăng nhập thành công, vào Trang chủ với đầy đủ chức năng Chủ quán' }, async (t) => {
  const p = new Phien()
  const r = await p.dangNhap(CQ.ten, CQ.mk)
  t.status(r, 200)
  t.bang(r.data?.nguoiDung?.vaiTro, 'ChuQuan', 'vai trò')
  const bc = await p.get(`/bao-cao/ton-kho?trangThai=${encodeURIComponent('Tất cả')}`)
  t.dung(bc.status !== 403, 'Chủ quán phải truy cập được chức năng báo cáo')
  return `HTTP 200, vai trò ${r.data?.nguoiDung?.vaiTro}; truy cập báo cáo: HTTP ${bc.status}`
})
tc('TC-UC1-02', { ...U1, ten: 'Đăng nhập thành công – Nhân viên, chỉ thấy chức năng được phân quyền', loai: 'Luồng thay thế', nguon: 'Alternative 6.a, BR05', tienDieuKien: 'Tài khoản nhanvien1 đang hoạt động', buoc: '1. Đăng nhập bằng tài khoản Nhân viên\n2. Gọi chức năng chỉ dành cho Chủ quán (Quản lý tài khoản, Báo cáo)', duLieu: 'nhanvien1 / NhanVien2026', mongDoi: 'Đăng nhập thành công với vai trò Nhân viên; các chức năng của Chủ quán bị từ chối (403)' }, async (t) => {
  const p = new Phien()
  const r = await p.dangNhap(NV1.ten, NV1.mk)
  t.status(r, 200)
  t.bang(r.data?.nguoiDung?.vaiTro, 'NhanVien', 'vai trò')
  const a = await p.get('/nhan-vien')
  const b = await p.get(`/bao-cao/doanh-thu?tuNgay=2026-01-01&denNgay=2026-01-02`)
  t.status(a, 403)
  t.status(b, 403)
  return `HTTP 200, vai trò NhanVien; /nhan-vien: ${a.status}; /bao-cao: ${b.status}`
})
tc('TC-UC1-03', { ...U1, ten: 'Bỏ trống tên đăng nhập', loai: 'Ngoại lệ', nguon: 'Exception 5.a, BR01', tienDieuKien: '-', buoc: 'Để trống "Tên đăng nhập", nhập mật khẩu, nhấn Đăng nhập', duLieu: '"" / ChuQuan2026', mongDoi: 'Thông báo "Không được bỏ trống!"' }, async (t) => {
  const r = await new Phien().post('/auth/dang-nhap', { tenDangNhap: '', matKhau: CQ.mk })
  return t.loiNV(r, 400, 'Không được bỏ trống!', 'tenDangNhap')
})
tc('TC-UC1-04', { ...U1, ten: 'Bỏ trống mật khẩu', loai: 'Ngoại lệ', nguon: 'Exception 5.a, BR01', tienDieuKien: '-', buoc: 'Nhập tên đăng nhập, để trống mật khẩu, nhấn Đăng nhập', duLieu: 'chuquan / ""', mongDoi: 'Thông báo "Không được bỏ trống!"' }, async (t) => {
  const r = await new Phien().post('/auth/dang-nhap', { tenDangNhap: CQ.ten, matKhau: '' })
  return t.loiNV(r, 400, 'Không được bỏ trống!', 'matKhau')
})
tc('TC-UC1-05', { ...U1, ten: 'Tên đăng nhập chỉ gồm khoảng trắng', loai: 'Ngoại lệ', nguon: 'Exception 5.a, BR01', tienDieuKien: '-', buoc: 'Nhập "   " vào Tên đăng nhập', duLieu: '"   " / ChuQuan2026', mongDoi: 'Thông báo "Không được bỏ trống!"' }, async (t) => {
  const r = await new Phien().post('/auth/dang-nhap', { tenDangNhap: '   ', matKhau: CQ.mk })
  return t.loiNV(r, 400, 'Không được bỏ trống!')
})

tc('TC-UC1-CB', { ...U1, ten: 'Chuẩn bị: tạo tài khoản nhân viên riêng để thử khóa tài khoản', loai: 'Chuẩn bị', nguon: '-', tienDieuKien: 'Đã đăng nhập Chủ quán', buoc: 'Thêm nhân viên kt_khoa', duLieu: `kt_khoa${RUN}`, mongDoi: 'Tạo thành công' }, async (t) => {
  S.tkKhoa = { ten: `kt_khoa${RUN}`, mk: 'KhoaThu123' }
  const r = await S.cq.post('/nhan-vien', nv(S.tkKhoa.ten, sdtMoi(), `khoa${RUN}@xomnho.vn`, S.tkKhoa.mk))
  t.status(r, [200, 201])
  return moTa(r)
})
tc('TC-UC1-06', { ...U1, ten: 'Sai mật khẩu (dưới 10 lần liên tiếp)', loai: 'Ngoại lệ', nguon: 'Exception 5.b', tienDieuKien: 'Tài khoản kt_khoa đang hoạt động, chưa nhập sai', buoc: 'Nhập đúng tên, sai mật khẩu 1 lần', duLieu: 'kt_khoa / SaiMatKhau1', mongDoi: 'Thông báo "Đăng nhập không thành công!", tài khoản chưa bị khóa' }, async (t) => {
  const r = await new Phien().post('/auth/dang-nhap', { tenDangNhap: S.tkKhoa.ten, matKhau: 'SaiMatKhau1' })
  const kq = t.loiNV(r, 401, 'Đăng nhập không thành công!')
  const tt = sql(`SELECT TrangThai + '|' + CAST(SoLanNhapSai AS varchar) FROM NguoiDung WHERE TenDangNhap='${S.tkKhoa.ten}'`)
  t.bang(tt, 'Hoạt động|1', 'trạng thái|số lần sai')
  return `${kq}; CSDL: ${tt}`
})
tc('TC-UC1-07', { ...U1, ten: 'Tên đăng nhập không tồn tại – không đếm số lần sai', loai: 'Ngoại lệ', nguon: 'Exception 5.b, BR06', tienDieuKien: '-', buoc: 'Đăng nhập 12 lần với tên không tồn tại', duLieu: 'khong_ton_tai_xyz / abc12345', mongDoi: 'Luôn báo "Đăng nhập không thành công!", không có tài khoản nào bị khóa' }, async (t) => {
  let r
  for (let i = 0; i < 12; i++) r = await new Phien().post('/auth/dang-nhap', { tenDangNhap: `khong_ton_tai_${RUN}`, matKhau: 'abc12345' })
  return t.loiNV(r, 401, 'Đăng nhập không thành công!') + ' (sau 12 lần)'
})
tc('TC-UC1-08', { ...U1, ten: 'Đăng nhập đúng sau vài lần sai – đặt lại số lần sai về 0', loai: 'Quy tắc nghiệp vụ', nguon: 'BR07', tienDieuKien: 'kt_khoa đã sai 1 lần (TC-UC1-06)', buoc: '1. Sai thêm 2 lần\n2. Đăng nhập đúng', duLieu: 'kt_khoa', mongDoi: 'Đăng nhập thành công, số lần nhập sai = 0' }, async (t) => {
  for (let i = 0; i < 2; i++) await new Phien().post('/auth/dang-nhap', { tenDangNhap: S.tkKhoa.ten, matKhau: 'SaiMatKhau1' })
  const truoc = sql(`SELECT SoLanNhapSai FROM NguoiDung WHERE TenDangNhap='${S.tkKhoa.ten}'`)
  const r = await new Phien().dangNhap(S.tkKhoa.ten, S.tkKhoa.mk)
  t.status(r, 200)
  const sau = sql(`SELECT SoLanNhapSai FROM NguoiDung WHERE TenDangNhap='${S.tkKhoa.ten}'`)
  t.bang(truoc, '3', 'số lần sai trước')
  t.bang(sau, '0', 'số lần sai sau')
  return `Trước khi đăng nhập đúng: ${truoc} lần sai; sau: ${sau}`
})
tc('TC-UC1-09', { ...U1, ten: 'Sai đủ 10 lần liên tiếp – khóa tạm, gửi mã tới SĐT Chủ quán', loai: 'Ngoại lệ', nguon: 'Exception 5.c.1–5.c.2, BR02, BR03', tienDieuKien: 'kt_khoa đang hoạt động, số lần sai = 0', buoc: 'Nhập sai mật khẩu 10 lần liên tiếp', duLieu: 'kt_khoa / SaiMatKhau1 ×10', mongDoi: 'Lần 10: "Tài khoản đang bị khóa tạm thời!", tài khoản ở trạng thái khóa tạm, mã xác nhận gửi tới SĐT Chủ quán (090****456)' }, async (t) => {
  let r
  for (let i = 0; i < 10; i++) r = await new Phien().post('/auth/dang-nhap', { tenDangNhap: S.tkKhoa.ten, matKhau: 'SaiMatKhau1' })
  const kq = t.loiNV(r, 423, 'Tài khoản đang bị khóa tạm thời!')
  t.bang(r.data?.sdtNhanMa, '090****456', 'SĐT nhận mã (Chủ quán, đã che)')
  t.dung(/^\d{6}$/.test(r.data?.maOtpGiaLap ?? ''), 'Có mã OTP giả lập 6 số')
  const tt = sql(`SELECT TrangThai FROM NguoiDung WHERE TenDangNhap='${S.tkKhoa.ten}'`)
  t.bang(tt, 'Khóa tạm', 'trạng thái CSDL')
  S.otp1 = r.data?.maOtpGiaLap
  return `${kq}; gửi tới ${r.data?.sdtNhanMa}; CSDL: ${tt}`
})
tc('TC-UC1-10', { ...U1, ten: 'Đăng nhập khi đang khóa tạm (kể cả đúng mật khẩu) – gửi lại mã', loai: 'Ngoại lệ', nguon: 'Exception 5.f, BR04', tienDieuKien: 'kt_khoa đang khóa tạm', buoc: 'Đăng nhập với mật khẩu đúng', duLieu: 'kt_khoa / KhoaThu123', mongDoi: 'Không đăng nhập được, báo "Tài khoản đang bị khóa tạm thời!", gửi lại mã mới (mã cũ hết hiệu lực)' }, async (t) => {
  const r = await new Phien().post('/auth/dang-nhap', { tenDangNhap: S.tkKhoa.ten, matKhau: S.tkKhoa.mk })
  const kq = t.loiNV(r, 423, 'Tài khoản đang bị khóa tạm thời!')
  S.otp2 = r.data?.maOtpGiaLap
  t.dung(S.otp2 && S.otp2 !== S.otp1, 'Phải sinh mã mới khác mã trước')
  const cu = await new Phien().post('/auth/mo-khoa', { tenDangNhap: S.tkKhoa.ten, maOtp: S.otp1 })
  t.dung(cu.status !== 200, 'Mã cũ không còn dùng được')
  return `${kq}; mã cũ dùng lại: ${moTa(cu)}`
})
tc('TC-UC1-11', { ...U1, ten: 'Nhập sai mã xác nhận', loai: 'Ngoại lệ', nguon: 'Exception 5.c.3 (theo SUA_BAO_CAO 3.1)', tienDieuKien: 'kt_khoa đang khóa tạm', buoc: 'Nhập mã OTP sai', duLieu: '000000', mongDoi: 'Báo mã xác nhận không đúng, tài khoản vẫn khóa' }, async (t) => {
  const sai = S.otp2 === '000000' ? '111111' : '000000'
  const r = await new Phien().post('/auth/mo-khoa', { tenDangNhap: S.tkKhoa.ten, maOtp: sai })
  const kq = t.loiNV(r, 400, 'Mã xác nhận không đúng!')
  t.bang(sql(`SELECT TrangThai FROM NguoiDung WHERE TenDangNhap='${S.tkKhoa.ten}'`), 'Khóa tạm', 'trạng thái')
  return kq
})
tc('TC-UC1-12', { ...U1, ten: 'Nhập đúng mã trong 5 phút – mở khóa, đăng nhập lại được', loai: 'Ngoại lệ', nguon: 'Exception 5.c.3–5.c.5, BR07', tienDieuKien: 'kt_khoa đang khóa tạm, có mã còn hiệu lực', buoc: '1. Nhập mã OTP đúng\n2. Đăng nhập lại', duLieu: 'Mã OTP vừa nhận', mongDoi: 'Mở khóa thành công, số lần sai về 0, đăng nhập lại thành công' }, async (t) => {
  const r = await new Phien().post('/auth/mo-khoa', { tenDangNhap: S.tkKhoa.ten, maOtp: S.otp2 })
  t.status(r, 200)
  const tt = sql(`SELECT TrangThai + '|' + CAST(SoLanNhapSai AS varchar) FROM NguoiDung WHERE TenDangNhap='${S.tkKhoa.ten}'`)
  t.bang(tt, 'Hoạt động|0', 'trạng thái|số lần sai')
  const dn = await new Phien().dangNhap(S.tkKhoa.ten, S.tkKhoa.mk)
  t.status(dn, 200)
  return `${moTa(r)} "${r.data?.thongBao}"; CSDL: ${tt}; đăng nhập lại: HTTP ${dn.status}`
})
tc('TC-UC1-13', { ...U1, ten: 'Mã xác nhận quá 5 phút – tài khoản vẫn khóa', loai: 'Ngoại lệ', nguon: 'Exception 5.e, BR03', tienDieuKien: 'kt_khoa bị khóa lại; mã đã quá hạn 5 phút (lùi thời điểm hết hạn trong CSDL kiểm thử)', buoc: '1. Sai 10 lần để khóa\n2. Đợi quá 5 phút\n3. Nhập mã', duLieu: 'Mã OTP đã hết hạn', mongDoi: 'Báo mã hết hạn, tài khoản vẫn ở trạng thái khóa tạm' }, async (t) => {
  let r
  for (let i = 0; i < 10; i++) r = await new Phien().post('/auth/dang-nhap', { tenDangNhap: S.tkKhoa.ten, matKhau: 'SaiMatKhau1' })
  const ma = r.data?.maOtpGiaLap
  sql(`UPDATE MaXacThuc SET HetHan = DATEADD(MINUTE,-1,SYSDATETIME()), ThoiDiemGui = DATEADD(MINUTE,-6,SYSDATETIME()) WHERE MaND = (SELECT MaND FROM NguoiDung WHERE TenDangNhap='${S.tkKhoa.ten}') AND ThoiDiemSuDung IS NULL`)
  const m = await new Phien().post('/auth/mo-khoa', { tenDangNhap: S.tkKhoa.ten, maOtp: ma })
  const kq = t.loiNV(m, 400, 'hết hạn')
  t.bang(sql(`SELECT TrangThai FROM NguoiDung WHERE TenDangNhap='${S.tkKhoa.ten}'`), 'Khóa tạm', 'trạng thái')
  // dọn: lấy mã mới và mở khóa
  const moi = await new Phien().post('/auth/dang-nhap', { tenDangNhap: S.tkKhoa.ten, matKhau: S.tkKhoa.mk })
  await new Phien().post('/auth/mo-khoa', { tenDangNhap: S.tkKhoa.ten, maOtp: moi.data?.maOtpGiaLap })
  return kq
})

// ================================================================== UC_2.1 Thêm tài khoản nhân viên
const U21 = { uc: 'UC_2.1', nhom: NHOM }
const loiThemNv = (ma, ten, loai, nguon, duLieu, mongDoi, body, msg, truong) =>
  tc(ma, { ...U21, ten, loai, nguon, tienDieuKien: 'Chủ quán đã đăng nhập, ở màn hình thêm tài khoản', buoc: '1. Nhập thông tin nhân viên\n2. Chọn "Lưu"', duLieu, mongDoi }, async (t) => t.loiNV(await S.cq.post('/nhan-vien', body()), 400, msg, truong))

tc('TC-UC2.1-01', { ...U21, ten: 'Thêm tài khoản nhân viên hợp lệ', loai: 'Luồng chính', nguon: 'Main flow 1–9, BR05, BR06, NFR mã hóa mật khẩu', tienDieuKien: 'Chủ quán đã đăng nhập', buoc: '1. Chọn "Thêm tài khoản"\n2. Nhập đủ thông tin hợp lệ\n3. Chọn "Lưu"', duLieu: `Họ tên: Nguyễn Kiểm Thử; 15/05/2000; SĐT mới; kt_nv${RUN}@xomnho.vn; kt_nv${RUN}; MatKhau123`, mongDoi: 'Thông báo thêm thành công; mã NV dạng NV###; vai trò Nhân viên; trạng thái Hoạt động; mật khẩu được mã hóa' }, async (t) => {
  S.nvMoi = { ten: `kt_nv${RUN}`, mk: 'MatKhau123', sdt: sdtMoi(), email: `kt_nv${RUN}@xomnho.vn` }
  const r = await S.cq.post('/nhan-vien', nv(S.nvMoi.ten, S.nvMoi.sdt, S.nvMoi.email, S.nvMoi.mk))
  t.status(r, [200, 201])
  t.thongBao(r, 'thành công')
  const ct = await timNv(S.cq, S.nvMoi.ten)
  t.dung(ct, 'Nhân viên mới phải có trong danh sách')
  t.dung(/^NV\d{3,}$/.test(ct?.maND ?? ''), `Mã NV đúng định dạng NV###, thực tế ${ct?.maND}`)
  t.bang(ct?.trangThai, 'Hoạt động', 'trạng thái')
  const mk = sql(`SELECT LEFT(MatKhau,4) FROM NguoiDung WHERE TenDangNhap='${S.nvMoi.ten}'`)
  t.dung(mk.startsWith('$2'), `Mật khẩu phải được băm bcrypt, thực tế bắt đầu "${mk}"`)
  const vt = (await new Phien().dangNhap(S.nvMoi.ten, S.nvMoi.mk)).data?.nguoiDung?.vaiTro
  t.bang(vt, 'NhanVien', 'vai trò')
  S.nvMoi.ma = ct?.maND
  return `${moTa(r)} "${r.data?.thongBao}"; mã ${ct?.maND}; trạng thái ${ct?.trangThai}; vai trò ${vt}; mật khẩu lưu dạng băm (${mk}…)`
})
loiThemNv('TC-UC2.1-02', 'Bỏ trống thông tin bắt buộc (email)', 'Ngoại lệ', 'Exception 6a, BR01', 'Email để trống', 'Thông báo "Vui lòng nhập đầy đủ thông tin bắt buộc"', () => nv(`kt_a${RUN}`, sdtMoi(), ''), 'Vui lòng nhập đầy đủ thông tin bắt buộc')
loiThemNv('TC-UC2.1-03', 'Họ tên chỉ gồm khoảng trắng', 'Ngoại lệ', 'Exception 6a, BR01', 'Họ tên "   "', 'Thông báo "Vui lòng nhập đầy đủ thông tin bắt buộc"', () => ({ ...nv(`kt_b${RUN}`, sdtMoi(), `b${RUN}@x.vn`), hoTen: '   ' }), 'Vui lòng nhập đầy đủ thông tin bắt buộc')
loiThemNv('TC-UC2.1-04', 'Tên đăng nhập dưới 4 ký tự', 'Ngoại lệ', 'Exception 6b, BR02', 'Tên đăng nhập "ab1"', 'Thông báo "Tên đăng nhập không hợp lệ"', () => nv('ab1', sdtMoi(), `c${RUN}@x.vn`), 'Tên đăng nhập không hợp lệ', 'tenDangNhap')
loiThemNv('TC-UC2.1-05', 'Tên đăng nhập có khoảng trắng / ký tự có dấu', 'Ngoại lệ', 'Exception 6b, BR02', 'Tên đăng nhập "nhân viên"', 'Thông báo "Tên đăng nhập không hợp lệ"', () => nv('nhân viên', sdtMoi(), `d${RUN}@x.vn`), 'Tên đăng nhập không hợp lệ', 'tenDangNhap')
loiThemNv('TC-UC2.1-06', 'Số điện thoại sai định dạng (9 số)', 'Ngoại lệ', 'Exception 6c, BR02', 'SĐT "090512345"', 'Thông báo "Số điện thoại không hợp lệ"', () => nv(`kt_e${RUN}`, '090512345', `e${RUN}@x.vn`), 'Số điện thoại không hợp lệ', 'sdt')
loiThemNv('TC-UC2.1-07', 'Số điện thoại không bắt đầu bằng 0', 'Ngoại lệ', 'Exception 6c, BR02', 'SĐT "8905123456"', 'Thông báo "Số điện thoại không hợp lệ"', () => nv(`kt_f${RUN}`, '8905123456', `f${RUN}@x.vn`), 'Số điện thoại không hợp lệ', 'sdt')
loiThemNv('TC-UC2.1-08', 'Email sai định dạng', 'Ngoại lệ', 'Exception 6d, BR02', 'Email "nva.gmail.com"', 'Thông báo "Email không hợp lệ"', () => nv(`kt_g${RUN}`, sdtMoi(), 'nva.gmail.com'), 'Email không hợp lệ', 'email')
loiThemNv('TC-UC2.1-09', 'Mật khẩu không đủ mạnh (chỉ có chữ)', 'Ngoại lệ', 'Exception 6e, BR04', 'Mật khẩu "matkhaumoi"', 'Thông báo "Mật khẩu không đủ mạnh"', () => nv(`kt_h${RUN}`, sdtMoi(), `h${RUN}@x.vn`, 'matkhaumoi'), 'Mật khẩu không đủ mạnh', 'matKhau')
loiThemNv('TC-UC2.1-10', 'Mật khẩu dưới 8 ký tự', 'Ngoại lệ', 'Exception 6e, BR04', 'Mật khẩu "abc123"', 'Thông báo "Mật khẩu không đủ mạnh"', () => nv(`kt_i${RUN}`, sdtMoi(), `i${RUN}@x.vn`, 'abc123'), 'Mật khẩu không đủ mạnh', 'matKhau')
loiThemNv('TC-UC2.1-11', 'Tên đăng nhập đã tồn tại (khác chữ hoa/thường)', 'Ngoại lệ', 'Exception 6f, BR03', 'Tên đăng nhập "NHANVIEN1"', 'Thông báo "Tên đăng nhập đã tồn tại"', () => nv('NHANVIEN1', sdtMoi(), `j${RUN}@x.vn`), 'Tên đăng nhập đã tồn tại', 'tenDangNhap')
loiThemNv('TC-UC2.1-12', 'Số điện thoại đã được tài khoản khác sử dụng', 'Ngoại lệ', 'Exception 6g, BR03', 'SĐT của nhanvien1 (0912345678)', 'Thông báo "Số điện thoại đã được sử dụng"', () => nv(`kt_k${RUN}`, '0912345678', `k${RUN}@x.vn`), 'Số điện thoại đã được sử dụng', 'sdt')
loiThemNv('TC-UC2.1-13', 'Email đã được tài khoản khác sử dụng', 'Ngoại lệ', 'Exception 6h, BR03', 'Email của nhanvien1 (mai.tran@xomnho.vn)', 'Thông báo "Email đã được sử dụng"', () => nv(`kt_l${RUN}`, sdtMoi(), 'mai.tran@xomnho.vn'), 'Email đã được sử dụng', 'email')
tc('TC-UC2.1-14', { ...U21, ten: 'Mã nhân viên của tài khoản đã xóa không được cấp lại', loai: 'Quy tắc nghiệp vụ', nguon: 'BR05', tienDieuKien: 'Chủ quán đã đăng nhập', buoc: '1. Thêm nhân viên A\n2. Xóa hẳn A (chưa có lịch sử)\n3. Thêm nhân viên B', duLieu: 'kt_xa / kt_xb', mongDoi: 'Mã của B = mã của A + 1 (mã A không được dùng lại)' }, async (t) => {
  const a = await S.cq.post('/nhan-vien', nv(`kt_xa${RUN}`, sdtMoi(), `xa${RUN}@x.vn`))
  t.status(a, [200, 201])
  const ctA = await timNv(S.cq, `kt_xa${RUN}`)
  const x = await S.cq.post(`/nhan-vien/${ctA?.maND}/xoa`, { cheDo: 'XoaHan' })
  t.status(x, 200)
  await S.cq.post('/nhan-vien', nv(`kt_xb${RUN}`, sdtMoi(), `xb${RUN}@x.vn`))
  const ctB = await timNv(S.cq, `kt_xb${RUN}`)
  const so = (m) => Number(String(m).replace(/\D/g, ''))
  t.bang(so(ctB?.maND), so(ctA?.maND) + 1, 'số thứ tự mã B')
  S.nvXoaHan = ctB
  return `A = ${ctA?.maND} (đã xóa hẳn), B = ${ctB?.maND}`
})
tc('TC-UC2.1-15', { ...U21, ten: 'Nhân viên không được thêm tài khoản', loai: 'Phân quyền', nguon: 'Actors: Chủ quán; BR06', tienDieuKien: 'Nhân viên đã đăng nhập', buoc: 'Nhân viên gọi chức năng thêm tài khoản', duLieu: 'Phiên nhanvien1', mongDoi: 'Bị từ chối (403), không tạo tài khoản' }, async (t) => {
  const r = await S.nv.post('/nhan-vien', nv(`kt_m${RUN}`, sdtMoi(), `m${RUN}@x.vn`))
  t.status(r, 403)
  return moTa(r)
})

// ================================================================== UC_2.2 Sửa nhân viên
const U22 = { uc: 'UC_2.2', nhom: NHOM }
const formSua = (ct, doi = {}) => ({ hoTen: ct.hoTen, ngaySinh: ct.ngaySinh.split('-').reverse().join('/'), sdt: ct.sdt, email: ct.email, ...doi })
const loiSuaNv = (ma, ten, nguon, duLieu, mongDoi, doi, msg, truong) =>
  tc(ma, { ...U22, ten, loai: 'Ngoại lệ', nguon, tienDieuKien: 'Chủ quán đang sửa nhân viên kt_nv', buoc: '1. Sửa thông tin\n2. Chọn "Lưu"', duLieu, mongDoi }, async (t) => {
    const ct = (await S.cq.get(`/nhan-vien/${S.nvMoi.ma}`)).data
    const r = await S.cq.put(`/nhan-vien/${S.nvMoi.ma}`, formSua(ct, doi()))
    return t.loiNV(r, 400, msg, truong)
  })
tc('TC-UC2.2-01', { ...U22, ten: 'Sửa thông tin nhân viên hợp lệ – ghi lịch sử chỉnh sửa', loai: 'Luồng chính', nguon: 'Main flow 1–10, BR04 (loại trừ chính NV), BR06', tienDieuKien: 'Nhân viên kt_nv tồn tại', buoc: '1. Chọn nhân viên\n2. Đổi họ tên (giữ nguyên SĐT, email của chính NV)\n3. Chọn "Lưu"', duLieu: 'Họ tên mới: "Trần Kiểm Thử"', mongDoi: '"Sửa thông tin nhân viên thành công"; thông tin mới được lưu; lịch sử ghi người sửa, thời điểm, nội dung trước/sau' }, async (t) => {
  const ct = (await S.cq.get(`/nhan-vien/${S.nvMoi.ma}`)).data
  const r = await S.cq.put(`/nhan-vien/${S.nvMoi.ma}`, formSua(ct, { hoTen: 'Trần Kiểm Thử' }))
  t.status(r, 200)
  t.thongBao(r, 'Sửa thông tin nhân viên thành công')
  const sau = (await S.cq.get(`/nhan-vien/${S.nvMoi.ma}`)).data
  t.bang(sau?.hoTen, 'Trần Kiểm Thử', 'họ tên')
  const ls = sau?.lichSu ?? []
  t.bang(ls.length, (ct?.lichSu?.length ?? 0) + 1, 'số dòng lịch sử')
  const d = ls[0]
  t.dung(d?.maCQ === S.cq.nguoiDung.maND && /Nguyễn Kiểm Thử/.test(d?.noiDungTruoc ?? '') && /Trần Kiểm Thử/.test(d?.noiDungSau ?? ''), 'Lịch sử phải ghi người sửa và nội dung trước/sau')
  return `${moTa(r)} "${r.data?.thongBao}"; lịch sử: ${d?.maCQ} ${d?.thoiDiemSua} | trước: ${d?.noiDungTruoc} | sau: ${d?.noiDungSau}`
})
tc('TC-UC2.2-02', { ...U22, ten: 'Lưu nhưng không thay đổi thông tin', loai: 'Luồng thay thế', nguon: 'Alternative 4b', tienDieuKien: 'Đang sửa kt_nv', buoc: 'Chọn "Lưu" khi chưa đổi gì', duLieu: 'Giữ nguyên dữ liệu', mongDoi: '"Không có thông tin thay đổi", không ghi lịch sử' }, async (t) => {
  const ct = (await S.cq.get(`/nhan-vien/${S.nvMoi.ma}`)).data
  const r = await S.cq.put(`/nhan-vien/${S.nvMoi.ma}`, formSua(ct))
  t.thongBao(r, 'Không có thông tin thay đổi')
  const sau = (await S.cq.get(`/nhan-vien/${S.nvMoi.ma}`)).data
  t.bang(sau?.lichSu?.length, ct?.lichSu?.length, 'số dòng lịch sử')
  return `${moTa(r)}; lịch sử: ${ct?.lichSu?.length} → ${sau?.lichSu?.length}`
})
loiSuaNv('TC-UC2.2-03', 'Bỏ trống số điện thoại', 'Exception 6a, BR01', 'SĐT ""', '"Vui lòng nhập đầy đủ thông tin bắt buộc"', () => ({ sdt: '' }), 'Vui lòng nhập đầy đủ thông tin bắt buộc')
loiSuaNv('TC-UC2.2-04', 'Số điện thoại sai định dạng', 'Exception 6b, BR03', 'SĐT "09abc12345"', '"Số điện thoại không hợp lệ"', () => ({ sdt: '09abc12345' }), 'Số điện thoại không hợp lệ', 'sdt')
loiSuaNv('TC-UC2.2-05', 'Email sai định dạng', 'Exception 6c, BR03', 'Email "a b@x.vn"', '"Email không hợp lệ"', () => ({ email: 'a b@x.vn' }), 'Email không hợp lệ', 'email')
loiSuaNv('TC-UC2.2-06', 'Số điện thoại trùng nhân viên khác', 'Exception 6d, BR04', 'SĐT của nhanvien1', '"Số điện thoại đã được sử dụng"', () => ({ sdt: '0912345678' }), 'Số điện thoại đã được sử dụng', 'sdt')
loiSuaNv('TC-UC2.2-07', 'Email trùng nhân viên khác', 'Exception 6e, BR04', 'Email của nhanvien1', '"Email đã được sử dụng"', () => ({ email: 'mai.tran@xomnho.vn' }), 'Email đã được sử dụng', 'email')
tc('TC-UC2.2-08', { ...U22, ten: 'Không sửa được tên đăng nhập và mã nhân viên', loai: 'Quy tắc nghiệp vụ', nguon: 'BR02, BR05', tienDieuKien: 'Đang sửa kt_nv', buoc: 'Gửi kèm tên đăng nhập khác khi lưu', duLieu: 'tenDangNhap = "doi_ten_dang_nhap"', mongDoi: 'Tên đăng nhập và mã NV giữ nguyên' }, async (t) => {
  const ct = (await S.cq.get(`/nhan-vien/${S.nvMoi.ma}`)).data
  await S.cq.put(`/nhan-vien/${S.nvMoi.ma}`, { ...formSua(ct, { hoTen: 'Lê Kiểm Thử' }), tenDangNhap: 'doi_ten_dang_nhap', maND: 'NV999' })
  const sau = (await S.cq.get(`/nhan-vien/${S.nvMoi.ma}`)).data
  t.bang(sau?.tenDangNhap, S.nvMoi.ten, 'tên đăng nhập')
  t.bang(sau?.maND, S.nvMoi.ma, 'mã NV')
  return `Tên đăng nhập: ${sau?.tenDangNhap}; mã: ${sau?.maND}`
})
tc('TC-UC2.2-09', { ...U22, ten: 'Nhân viên không được sửa thông tin nhân viên', loai: 'Phân quyền', nguon: 'BR05', tienDieuKien: 'Nhân viên đã đăng nhập', buoc: 'Nhân viên gọi chức năng sửa', duLieu: 'Phiên nhanvien1', mongDoi: 'Bị từ chối (403)' }, async (t) => {
  const r = await S.nv.put(`/nhan-vien/${S.nvMoi.ma}`, { hoTen: 'X', ngaySinh: '01/01/2000', sdt: sdtMoi(), email: 'x@x.vn' })
  t.status(r, 403)
  return moTa(r)
})

// ================================================================== UC_2.3 Đổi mật khẩu
const U23 = { uc: 'UC_2.3', nhom: NHOM }
tc('TC-UC2.3-CB', { ...U23, ten: 'Chuẩn bị: tài khoản riêng để đổi mật khẩu', loai: 'Chuẩn bị', nguon: '-', tienDieuKien: '-', buoc: 'Thêm nhân viên kt_mk, đăng nhập 2 phiên', duLieu: `kt_mk${RUN} / DoiMatKhau1`, mongDoi: 'Có 2 phiên đăng nhập' }, async (t) => {
  S.tkMk = { ten: `kt_mk${RUN}`, mk: 'DoiMatKhau1' }
  t.status(await S.cq.post('/nhan-vien', nv(S.tkMk.ten, sdtMoi(), `mk${RUN}@x.vn`, S.tkMk.mk)), [200, 201])
  S.mk1 = await phien(S.tkMk)
  S.mk2 = await phien(S.tkMk)
})
const loiDoiMk = (ma, ten, nguon, duLieu, mongDoi, body, msg) =>
  tc(ma, { ...U23, ten, loai: 'Ngoại lệ', nguon, tienDieuKien: 'Người dùng đã đăng nhập, mở form đổi mật khẩu', buoc: '1. Nhập mật khẩu hiện tại, mới, xác nhận\n2. Chọn "Lưu"', duLieu, mongDoi }, async (t) => t.loiNV(await S.mk1.post('/tai-khoan/doi-mat-khau', body()), [400, 401], msg))
loiDoiMk('TC-UC2.3-01', 'Bỏ trống thông tin bắt buộc', 'Exception 4a, BR01', 'Xác nhận mật khẩu để trống', '"Vui lòng nhập đầy đủ thông tin"', () => ({ matKhauHienTai: S.tkMk.mk, matKhauMoi: 'MatKhauMoi2', xacNhanMatKhauMoi: '' }), 'Vui lòng nhập đầy đủ thông tin')
loiDoiMk('TC-UC2.3-02', 'Mật khẩu mới không đúng quy tắc', 'Exception 4c, BR02', 'Mật khẩu mới "12345678" (chỉ số)', '"Mật khẩu không đúng quy tắc"', () => ({ matKhauHienTai: S.tkMk.mk, matKhauMoi: '12345678', xacNhanMatKhauMoi: '12345678' }), 'Mật khẩu không đúng quy tắc')
loiDoiMk('TC-UC2.3-03', 'Mật khẩu xác nhận không khớp', 'Exception 4d, BR04', 'Mới "MatKhauMoi2", xác nhận "MatKhauMoi3"', '"Mật khẩu xác nhận không khớp"', () => ({ matKhauHienTai: S.tkMk.mk, matKhauMoi: 'MatKhauMoi2', xacNhanMatKhauMoi: 'MatKhauMoi3' }), 'Mật khẩu xác nhận không khớp')
loiDoiMk('TC-UC2.3-04', 'Mật khẩu mới trùng mật khẩu hiện tại', 'Exception 4e, BR03', 'Mới = hiện tại', '"Mật khẩu mới phải khác mật khẩu hiện tại"', () => ({ matKhauHienTai: S.tkMk.mk, matKhauMoi: S.tkMk.mk, xacNhanMatKhauMoi: S.tkMk.mk }), 'Mật khẩu mới phải khác mật khẩu hiện tại')
loiDoiMk('TC-UC2.3-05', 'Mật khẩu hiện tại không chính xác', 'Exception 4b, BR05', 'Hiện tại "SaiMatKhau9"', '"Mật khẩu hiện tại không chính xác"', () => ({ matKhauHienTai: 'SaiMatKhau9', matKhauMoi: 'MatKhauMoi2', xacNhanMatKhauMoi: 'MatKhauMoi2' }), 'Mật khẩu hiện tại không chính xác')
tc('TC-UC2.3-06', { ...U23, ten: 'Đổi mật khẩu thành công – đăng xuất mọi phiên', loai: 'Luồng chính', nguon: 'Main flow 1–8, BR06', tienDieuKien: 'kt_mk đang đăng nhập ở 2 phiên', buoc: '1. Nhập đúng mật khẩu hiện tại, mật khẩu mới hợp lệ, xác nhận khớp\n2. Chọn "Lưu"\n3. Dùng lại 2 phiên cũ\n4. Đăng nhập bằng mật khẩu mới / cũ', duLieu: 'DoiMatKhau1 → MatKhauMoi2', mongDoi: 'Đổi thành công; cả 2 phiên bị đăng xuất; đăng nhập bằng mật khẩu mới được, mật khẩu cũ không được' }, async (t) => {
  const r = await S.mk1.post('/tai-khoan/doi-mat-khau', { matKhauHienTai: S.tkMk.mk, matKhauMoi: 'MatKhauMoi2', xacNhanMatKhauMoi: 'MatKhauMoi2' })
  t.status(r, 200)
  const p1 = await S.mk1.get('/tai-khoan/toi')
  const p2 = await S.mk2.get('/tai-khoan/toi')
  t.status(p1, 401)
  t.status(p2, 401)
  const moi = await new Phien().dangNhap(S.tkMk.ten, 'MatKhauMoi2')
  const cu = await new Phien().dangNhap(S.tkMk.ten, S.tkMk.mk)
  t.status(moi, 200)
  t.status(cu, 401)
  return `${moTa(r)} "${r.data?.thongBao}"; phiên 1: HTTP ${p1.status}, phiên 2: HTTP ${p2.status}; mật khẩu mới: HTTP ${moi.status}; mật khẩu cũ: HTTP ${cu.status}`
})
tc('TC-UC2.3-07', { ...U23, ten: 'Sai mật khẩu hiện tại 5 lần liên tiếp – khóa đổi mật khẩu 15 phút', loai: 'Quy tắc nghiệp vụ', nguon: 'Đặc tả màn hình 2.4.9–2.4.10; SUA_BAO_CAO 3.2b (BR08)', tienDieuKien: 'Tài khoản kt_mk2 đã đăng nhập', buoc: 'Nhập sai mật khẩu hiện tại 5 lần, rồi nhập đúng', duLieu: 'Mật khẩu hiện tại sai ×5', mongDoi: 'Lần 5: "Bạn đã nhập sai mật khẩu 5 lần liên tiếp. Chức năng đổi mật khẩu bị khóa trong 15 phút"; lần sau (kể cả đúng) vẫn bị khóa' }, async (t) => {
  const tk = { ten: `kt_mk2${RUN}`, mk: 'DoiMatKhau1' }
  await S.cq.post('/nhan-vien', nv(tk.ten, sdtMoi(), `mk2${RUN}@x.vn`, tk.mk))
  const p = await phien(tk)
  let r
  for (let i = 0; i < 5; i++) r = await p.post('/tai-khoan/doi-mat-khau', { matKhauHienTai: 'SaiMatKhau9', matKhauMoi: 'MatKhauMoi2', xacNhanMatKhauMoi: 'MatKhauMoi2' })
  const kq = t.loiNV(r, [400, 423], 'Chức năng đổi mật khẩu bị khóa trong 15 phút')
  const dung = await p.post('/tai-khoan/doi-mat-khau', { matKhauHienTai: tk.mk, matKhauMoi: 'MatKhauMoi2', xacNhanMatKhauMoi: 'MatKhauMoi2' })
  t.dung(dung.status !== 200, 'Đang khóa thì không đổi được kể cả đúng mật khẩu')
  return `Lần 5: ${kq}; nhập đúng ngay sau đó: ${moTa(dung)}`
})

// ================================================================== UC_2.4 Xóa tài khoản (trường hợp chưa có lịch sử)
const U24 = { uc: 'UC_2.4', nhom: NHOM }
tc('TC-UC2.4-01', { ...U24, ten: 'Xóa hẳn nhân viên chưa có hóa đơn / ca làm việc', loai: 'Luồng chính', nguon: 'Main flow 1–10, BR01, BR04', tienDieuKien: 'Nhân viên kt_xb chưa có hóa đơn, chưa phụ trách ca', buoc: '1. Chọn nhân viên\n2. Chọn "Xóa tài khoản"\n3. Xác nhận', duLieu: 'kt_xb', mongDoi: 'Hệ thống xác định xóa hẳn; xóa thành công; nhân viên không còn trong danh sách và không đăng nhập được' }, async (t) => {
  const ma = S.nvXoaHan?.maND
  const k = await S.cq.get(`/nhan-vien/${ma}/kiem-tra-xoa`)
  t.bang(k.data?.cheDo, 'XoaHan', 'chế độ xử lý')
  const x = await S.cq.post(`/nhan-vien/${ma}/xoa`, { cheDo: 'XoaHan' })
  t.status(x, 200)
  const ct = await S.cq.get(`/nhan-vien/${ma}`)
  t.status(ct, 404)
  const dn = await new Phien().post('/auth/dang-nhap', { tenDangNhap: `kt_xb${RUN}`, matKhau: 'MatKhau123' })
  t.status(dn, 401)
  return `Kiểm tra: ${k.data?.cheDo}; xóa: ${moTa(x)} "${x.data?.thongBao}"; xem lại: HTTP ${ct.status}; đăng nhập: HTTP ${dn.status}`
})
tc('TC-UC2.4-02', { ...U24, ten: 'Nhân viên không được xóa tài khoản', loai: 'Phân quyền', nguon: 'Actors: Chủ quán', tienDieuKien: 'Nhân viên đã đăng nhập', buoc: 'Nhân viên gọi chức năng xóa tài khoản', duLieu: 'Phiên nhanvien1', mongDoi: 'Bị từ chối (403)' }, async (t) => {
  const r = await S.nv.post(`/nhan-vien/${S.nvMoi.ma}/xoa`, { cheDo: 'XoaHan' })
  t.status(r, 403)
  return moTa(r)
})

// ================================================================== UC_11 Đăng xuất
const U11 = { uc: 'UC_11', nhom: NHOM }
tc('TC-UC11-01', { ...U11, ten: 'Đăng xuất – kết thúc phiên, không truy cập được nữa', loai: 'Luồng chính', nguon: 'Main flow 1–5, BR02', tienDieuKien: 'Người dùng đã đăng nhập', buoc: '1. Nhấn "Đăng xuất" → "Đăng xuất"\n2. Gọi lại chức năng bằng phiên cũ / làm mới phiên', duLieu: 'Phiên nhanvien1 mới', mongDoi: 'Đăng xuất thành công; phiên cũ không dùng được (401) cho đến khi đăng nhập lại' }, async (t) => {
  const p = await phien(NV1)
  const r = await p.post('/auth/dang-xuat')
  t.status(r, [200, 204])
  const toi = await p.get('/tai-khoan/toi')
  const lm = await p.post('/auth/lam-moi')
  t.status(toi, 401)
  t.status(lm, 401)
  return `Đăng xuất: HTTP ${r.status}; gọi lại bằng phiên cũ: HTTP ${toi.status}; làm mới phiên: HTTP ${lm.status}`
})
tc('TC-UC11-02', { ...U11, ten: 'Chưa đăng nhập không dùng được chức năng', loai: 'Quy tắc nghiệp vụ', nguon: 'BR01, BR02', tienDieuKien: 'Chưa đăng nhập', buoc: 'Gọi chức năng tra cứu tồn kho khi chưa đăng nhập', duLieu: '-', mongDoi: 'Bị từ chối (401)' }, async (t) => {
  const r = await new Phien().get('/ton-kho')
  t.status(r, 401)
  return moTa(r)
})
tc('TC-UC11-03', { ...U11, ten: 'Đăng xuất không làm mất dữ liệu đã lưu', loai: 'Quy tắc nghiệp vụ', nguon: 'BR03', tienDieuKien: 'Nhân viên đã đăng nhập', buoc: '1. Thêm khách hàng\n2. Đăng xuất\n3. Đăng nhập lại và tìm khách hàng đó', duLieu: 'Khách "Đăng Xuất Thử"', mongDoi: 'Khách hàng vẫn còn sau khi đăng nhập lại' }, async (t) => {
  const p = await phien(NV1)
  const sdt = sdtMoi()
  await p.post('/khach-hang', { hoTen: 'Đăng Xuất Thử', sdt })
  await p.post('/auth/dang-xuat')
  const p2 = await phien(NV1)
  const r = await p2.get(`/khach-hang?tuKhoa=${sdt}`)
  t.dung(r.data?.danhSach?.some((k) => k.sdt === sdt), 'Khách hàng phải còn trong hệ thống')
  return `Tìm lại theo SĐT ${sdt}: ${r.data?.danhSach?.length ?? 0} kết quả`
})
