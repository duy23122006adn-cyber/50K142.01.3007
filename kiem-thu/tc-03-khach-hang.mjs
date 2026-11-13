// Nhóm 3 – Quản lý khách hàng (UC_8.1–8.3).
import { CHU, RUN, S, moTa, sdtMoi, tc } from './lib.mjs'

const NHOM = 'Khách hàng'
const U81 = { uc: 'UC_8.1', nhom: NHOM }
const U82 = { uc: 'UC_8.2', nhom: NHOM }
const U83 = { uc: 'UC_8.3', nhom: NHOM }
const ten = (s) => `Khách Thử ${s} ${CHU}`

const loiThemKH = (ma, tenTc, nguon, duLieu, mongDoi, body, msg, truong) =>
  tc(ma, { ...U81, ten: tenTc, loai: 'Ngoại lệ', nguon, tienDieuKien: 'Nhân viên ở form "Thêm khách hàng"', buoc: '1. Nhập họ tên, số điện thoại\n2. Nhấn "Lưu"', duLieu, mongDoi }, async (t) => t.loiNV(await S.nv.post('/khach-hang', body()), 400, msg, truong))

tc('TC-UC8.1-01', { ...U81, ten: 'Nhân viên thêm khách hàng hợp lệ – mã KH-xxxxxx, tự bỏ khoảng trắng đầu/cuối', loai: 'Luồng chính', nguon: 'Main flow 1–7, BR02, BR03, BR04, BR09', tienDieuKien: 'Nhân viên đã đăng nhập, ở màn hình Quản lý khách hàng', buoc: '1. Chọn "Thêm khách hàng"\n2. Nhập họ tên có khoảng trắng đầu/cuối, SĐT hợp lệ\n3. "Lưu"', duLieu: '"  Khách Thử An  ", SĐT mới', mongDoi: 'Lưu thành công; mã KH-xxxxxx; họ tên được bỏ khoảng trắng đầu/cuối; SĐT giữ số 0 đầu' }, async (t) => {
  const sdt = sdtMoi()
  const r = await S.nv.post('/khach-hang', { hoTen: `  ${ten('An')}  `, sdt })
  t.status(r, [200, 201])
  t.dung(/^KH-\d{6}$/.test(r.data?.maKH ?? ''), `Mã đúng định dạng KH-xxxxxx, thực tế ${r.data?.maKH}`)
  t.bang(r.data?.hoTen, ten('An'), 'họ tên sau chuẩn hóa')
  t.bang(r.data?.sdt, sdt, 'số điện thoại')
  S.kh = { An: r.data }
  return `${moTa(r)}; ${r.data?.maKH} | "${r.data?.hoTen}" | ${r.data?.sdt}`
})
loiThemKH('TC-UC8.1-02', 'Bỏ trống họ tên', 'Exception 5a, BR01', 'Họ tên ""', '"Không được để trống thông tin bắt buộc"', () => ({ hoTen: '', sdt: sdtMoi() }), 'Không được để trống thông tin bắt buộc', 'hoTen')
loiThemKH('TC-UC8.1-03', 'Số điện thoại chỉ gồm khoảng trắng', 'Exception 5a, BR01', 'SĐT "   "', '"Không được để trống thông tin bắt buộc"', () => ({ hoTen: ten('B'), sdt: '   ' }), 'Không được để trống thông tin bắt buộc', 'sdt')
loiThemKH('TC-UC8.1-04', 'Họ tên chứa chữ số', 'Exception 5b, BR02', 'Họ tên "Khách 123"', '"Họ tên chỉ gồm chữ cái và khoảng trắng, tối đa 50 ký tự"', () => ({ hoTen: 'Khách 123', sdt: sdtMoi() }), 'Họ tên chỉ gồm chữ cái và khoảng trắng, tối đa 50 ký tự', 'hoTen')
loiThemKH('TC-UC8.1-05', 'Họ tên dài 51 ký tự', 'Exception 5b, BR02', 'Họ tên 51 chữ "a"', '"Họ tên chỉ gồm chữ cái và khoảng trắng, tối đa 50 ký tự"', () => ({ hoTen: 'a'.repeat(51), sdt: sdtMoi() }), 'Họ tên chỉ gồm chữ cái và khoảng trắng, tối đa 50 ký tự', 'hoTen')
loiThemKH('TC-UC8.1-06', 'Số điện thoại sai định dạng', 'Exception 5c, BR03', 'SĐT "1234567890"', '"Số điện thoại gồm 10 chữ số và bắt đầu bằng 0"', () => ({ hoTen: ten('C'), sdt: '1234567890' }), 'Số điện thoại gồm 10 chữ số và bắt đầu bằng 0', 'sdt')
tc('TC-UC8.1-07', { ...U81, ten: 'Số điện thoại đã được đăng ký – hiển thị khách đang dùng số đó', loai: 'Ngoại lệ', nguon: 'Exception 5d, BR05', tienDieuKien: 'Khách "Khách Thử An" đã tồn tại', buoc: 'Thêm khách mới trùng SĐT của An', duLieu: 'SĐT của An', mongDoi: '"Số điện thoại đã được đăng ký" kèm họ tên, SĐT khách đang dùng số đó; không tạo khách mới' }, async (t) => {
  const r = await S.nv.post('/khach-hang', { hoTen: ten('Trùng'), sdt: S.kh.An.sdt })
  const kq = t.loiNV(r, [400, 409], 'Số điện thoại đã được đăng ký')
  const dinhKem = JSON.stringify(r.data)
  t.dung(dinhKem.includes(S.kh.An.hoTen), `Phản hồi phải kèm thông tin khách đang dùng số: ${dinhKem}`)
  return `${kq}; dữ liệu kèm: ${dinhKem}`
})
tc('TC-UC8.1-08', { ...U81, ten: 'Cho phép trùng họ tên khác số điện thoại', loai: 'Quy tắc nghiệp vụ', nguon: 'BR06', tienDieuKien: 'Khách "Khách Thử An" đã tồn tại', buoc: 'Thêm khách cùng họ tên, SĐT khác', duLieu: `"${ten('An')}", SĐT mới`, mongDoi: 'Thêm thành công khách thứ hai' }, async (t) => {
  const r = await S.nv.post('/khach-hang', { hoTen: ten('An'), sdt: sdtMoi() })
  t.status(r, [200, 201])
  S.kh.An2 = r.data
  return `${moTa(r)}; ${r.data?.maKH}`
})
tc('TC-CB-04', { uc: 'Chuẩn bị', nhom: NHOM, ten: 'Thêm khách hàng Bình (dùng cho bán hàng, tìm kiếm)', loai: 'Chuẩn bị', nguon: 'UC_8.1', tienDieuKien: '-', buoc: 'Thêm khách', duLieu: ten(`Bình ${''}`), mongDoi: 'Tạo thành công' }, async (t) => {
  const r = await S.nv.post('/khach-hang', { hoTen: ten('Bình'), sdt: sdtMoi() })
  t.status(r, [200, 201])
  S.kh.Binh = r.data
  return `${r.data?.maKH} ${r.data?.sdt}`
})

tc('TC-UC8.2-01', { ...U82, ten: 'Nhân viên sửa thông tin khách hàng hợp lệ', loai: 'Luồng chính', nguon: 'Main flow 1–8, BR04 (loại trừ chính khách), BR05, BR06', tienDieuKien: 'Khách An2 tồn tại', buoc: '1. Chọn "Sửa" khách An2\n2. Đổi họ tên (giữ SĐT)\n3. "Lưu"', duLieu: `"${ten('Cường')}"`, mongDoi: '"Cập nhật thông tin khách hàng thành công!"; mã KH không đổi' }, async (t) => {
  const r = await S.nv.put(`/khach-hang/${S.kh.An2.maKH}`, { hoTen: ten('Cường'), sdt: S.kh.An2.sdt })
  t.status(r, 200)
  t.thongBao(r, 'Cập nhật thông tin khách hàng thành công!')
  const ct = (await S.nv.get(`/khach-hang/${S.kh.An2.maKH}`)).data
  t.bang(ct?.hoTen, ten('Cường'), 'họ tên')
  t.bang(ct?.maKH, S.kh.An2.maKH, 'mã KH')
  return `${moTa(r)} "${r.data?.thongBao}"; sau sửa: ${ct?.maKH} ${ct?.hoTen}`
})
tc('TC-UC8.2-02', { ...U82, ten: 'Sửa số điện thoại trùng khách hàng khác', loai: 'Ngoại lệ', nguon: 'Exception 6d, BR04', tienDieuKien: 'Khách An, An2 tồn tại', buoc: 'Sửa SĐT của An2 thành SĐT của An', duLieu: 'SĐT của An', mongDoi: '"Số điện thoại đã được đăng ký" kèm thông tin khách đang dùng số' }, async (t) => t.loiNV(await S.nv.put(`/khach-hang/${S.kh.An2.maKH}`, { hoTen: ten('Cường'), sdt: S.kh.An.sdt }), [400, 409], 'Số điện thoại đã được đăng ký'))
tc('TC-UC8.2-03', { ...U82, ten: 'Sửa họ tên sai định dạng', loai: 'Ngoại lệ', nguon: 'Exception 6b, BR02', tienDieuKien: 'Khách An2 tồn tại', buoc: 'Sửa họ tên thành "Cường@@"', duLieu: '"Cường@@"', mongDoi: '"Họ tên chỉ gồm chữ cái và khoảng trắng, tối đa 50 ký tự"' }, async (t) => t.loiNV(await S.nv.put(`/khach-hang/${S.kh.An2.maKH}`, { hoTen: 'Cường@@', sdt: S.kh.An2.sdt }), 400, 'Họ tên chỉ gồm chữ cái và khoảng trắng, tối đa 50 ký tự', 'hoTen'))
tc('TC-UC8.2-04', { ...U82, ten: 'Sửa bỏ trống số điện thoại', loai: 'Ngoại lệ', nguon: 'Exception 6a, BR01', tienDieuKien: 'Khách An2 tồn tại', buoc: 'Xóa trống SĐT rồi lưu', duLieu: 'SĐT ""', mongDoi: '"Không được để trống thông tin bắt buộc"' }, async (t) => t.loiNV(await S.nv.put(`/khach-hang/${S.kh.An2.maKH}`, { hoTen: ten('Cường'), sdt: '' }), 400, 'Không được để trống thông tin bắt buộc'))

tc('TC-UC8.3-01', { ...U83, ten: 'Tìm theo một phần tên, không phân biệt hoa thường', loai: 'Luồng chính', nguon: 'Main flow 1–6, BR01', tienDieuKien: 'Có khách "Khách Thử Bình"', buoc: 'Nhập "khách thử bình" → "Tìm kiếm"', duLieu: 'khách thử bình', mongDoi: 'Hiển thị khách Bình với Mã KH, Họ tên, SĐT' }, async (t) => {
  const r = await S.nv.get(`/khach-hang?tuKhoa=${encodeURIComponent(`khách thử bình ${CHU}`)}`)
  t.status(r, 200)
  t.dung(r.data?.danhSach?.some((k) => k.maKH === S.kh.Binh.maKH), 'Phải tìm thấy khách Bình')
  return `${r.data?.danhSach?.length} kết quả`
})
tc('TC-UC8.3-02', { ...U83, ten: 'Tìm theo một phần số điện thoại', loai: 'Luồng chính', nguon: 'BR01', tienDieuKien: 'Khách Bình tồn tại', buoc: 'Nhập 6 số cuối SĐT của Bình', duLieu: '6 số cuối', mongDoi: 'Hiển thị khách Bình' }, async (t) => {
  const r = await S.nv.get(`/khach-hang?tuKhoa=${S.kh.Binh.sdt.slice(-6)}`)
  t.dung(r.data?.danhSach?.some((k) => k.maKH === S.kh.Binh.maKH), 'Phải tìm thấy khách Bình')
  return `${r.data?.danhSach?.length} kết quả`
})
tc('TC-UC8.3-03', { ...U83, ten: 'SĐT bắt đầu "+84" tương đương "0"', loai: 'Quy tắc nghiệp vụ', nguon: 'BR02', tienDieuKien: 'Khách Bình tồn tại', buoc: 'Nhập "+84" + SĐT bỏ số 0 đầu', duLieu: `+84${S.kh?.Binh?.sdt?.slice(1) ?? '…'}`, mongDoi: 'Hiển thị khách Bình' }, async (t) => {
  const r = await S.nv.get(`/khach-hang?tuKhoa=${encodeURIComponent('+84' + S.kh.Binh.sdt.slice(1))}`)
  t.dung(r.data?.danhSach?.some((k) => k.maKH === S.kh.Binh.maKH), `Phải tìm thấy khách Bình; ${moTa(r)}`)
  return `${moTa(r)}; ${r.data?.danhSach?.length ?? 0} kết quả`
})
tc('TC-UC8.3-04', { ...U83, ten: 'Từ khóa chứa ký tự không hợp lệ', loai: 'Ngoại lệ', nguon: 'Exception 5b, BR03', tienDieuKien: '-', buoc: 'Nhập "an@#" → "Tìm kiếm"', duLieu: 'an@#', mongDoi: '"Thông tin chứa ký tự không hợp lệ"' }, async (t) => t.loiNV(await S.nv.get(`/khach-hang?tuKhoa=${encodeURIComponent('an@#')}`), 400, 'Thông tin chứa ký tự không hợp lệ'))
tc('TC-UC8.3-05', { ...U83, ten: 'Không tìm thấy khách hàng', loai: 'Ngoại lệ', nguon: 'Exception 5d', tienDieuKien: '-', buoc: 'Nhập tên không tồn tại', duLieu: `Không Có Ai ${RUN}`, mongDoi: '"Không tìm thấy khách hàng"' }, async (t) => {
  const r = await S.nv.get(`/khach-hang?tuKhoa=${encodeURIComponent('Zzzz Khong Co Ai')}`)
  const rong = r.status === 200 && (r.data?.danhSach ?? []).length === 0
  if (!rong) t.loiNV(r, 404, 'Không tìm thấy khách hàng')
  return rong ? 'HTTP 200, danh sách rỗng (giao diện hiển thị "Không tìm thấy khách hàng")' : moTa(r)
})
tc('TC-UC8.3-06', { ...U83, ten: 'Từ khóa bỏ trống – hiển thị toàn bộ danh sách', loai: 'Luồng thay thế', nguon: 'Alternative 5a', tienDieuKien: 'Có nhiều khách hàng', buoc: 'Để trống ô tìm kiếm → "Tìm kiếm"', duLieu: '""', mongDoi: 'Hiển thị toàn bộ khách hàng (có phân trang)' }, async (t) => {
  const r = await S.nv.get('/khach-hang')
  t.status(r, 200)
  t.dung((r.data?.tongSo ?? 0) >= 3, `Tổng số khách: ${r.data?.tongSo}`)
  return `Tổng ${r.data?.tongSo} khách, trang 1: ${r.data?.danhSach?.length} dòng`
})
