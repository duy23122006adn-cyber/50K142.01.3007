// Nhóm 8 – Kết ca (UC_9.1, UC_9.2) và các luồng xóa tài khoản cần có ca / hóa đơn (UC_2.4).
// Chạy cuối cùng vì "Đang kết ca" tạm dừng mọi giao dịch của cửa hàng.
import { Phien, RUN, S, moTa, ngayISO, ngayVN, phien, sdtMoi, tc } from './lib.mjs'
import { ban } from './tc-04-ban-hang.mjs'

const NHOM = 'Kết ca'
const U = (uc) => ({ uc, nhom: uc === 'UC_2.4' ? 'Đăng nhập & Tài khoản' : NHOM })
const ca = async (p = S.cq) => (await p.get('/ca/hien-tai')).data
const luu = (p, maCa, dong) => p.post('/ket-ca/luu', { maCa, dong })
const dongTheoLyThuyet = (bb, doi = {}) => (bb?.dong ?? []).map((d) => ({ maHH: d.maHH, soLuongThucTe: d.soLuongLyThuyet, nguyenNhan: null, ...(doi[d.maHH] ?? {}) }))

// ================================================================== UC_2.4 – nhân viên đã có hóa đơn
tc('TC-UC2.4-03', { ...U('UC_2.4'), ten: 'Nhân viên đã có hóa đơn – chuyển "Ngừng hoạt động", giữ lịch sử', loai: 'Luồng thay thế', nguon: 'Alternative 5a, BR04, Post-condition', tienDieuKien: 'Nhân viên kt_nv đã bán 1 hóa đơn, không phụ trách ca', buoc: '1. kt_nv bán 1 hóa đơn\n2. Chủ quán chọn kt_nv → "Xóa tài khoản" → xác nhận', duLieu: 'kt_nv', mongDoi: 'Hệ thống chuyển "Ngừng hoạt động" (không xóa hẳn); kt_nv không đăng nhập được; hóa đơn của kt_nv vẫn tra cứu được' }, async (t) => {
  const p = await phien(S.nvMoi)
  const { hd } = await ban(p, [{ maHH: S.hh.G.maHH, soLuong: 1 }])
  t.status(hd, [200, 201])
  const k = await S.cq.get(`/nhan-vien/${S.nvMoi.ma}/kiem-tra-xoa`)
  t.bang(k.data?.cheDo, 'NgungHoatDong', 'chế độ')
  const x = await S.cq.post(`/nhan-vien/${S.nvMoi.ma}/xoa`, { cheDo: 'NgungHoatDong' })
  t.status(x, 200)
  const ct = (await S.cq.get(`/nhan-vien/${S.nvMoi.ma}`)).data
  t.bang(ct?.trangThai, 'Ngừng hoạt động', 'trạng thái')
  const dn = await new Phien().post('/auth/dang-nhap', { tenDangNhap: S.nvMoi.ten, matKhau: S.nvMoi.mk })
  t.status(dn, 401)
  const ls = await S.cq.get(`/hoa-don/chi-tiet?ma=${encodeURIComponent(hd?.data?.maHD)}`)
  t.bang(ls.data?.maNguoiBan, S.nvMoi.ma, 'người bán trên hóa đơn cũ')
  return `Kiểm tra: ${k.data?.cheDo}; ${moTa(x)} "${x.data?.thongBao}"; trạng thái ${ct?.trangThai}; đăng nhập: ${moTa(dn)}; hóa đơn ${hd?.data?.maHD} vẫn ghi người bán ${ls.data?.maNguoiBan}`
})

// ================================================================== UC_9.1 Lưu biên bản
tc('TC-UC9.1-01', { ...U('UC_9.1'), ten: 'Bắt đầu kết ca – ca "Đang kết ca", hiển thị biên bản', loai: 'Luồng chính', nguon: 'Main flow 1–4, BR08, BR09', tienDieuKien: 'Có ca "Đang hoạt động"', buoc: 'Nhân viên mở màn hình kết ca → bắt đầu kết ca', duLieu: 'Ca hiện tại', mongDoi: 'Ca chuyển "Đang kết ca"; biên bản có mã ca, ngày, giờ bắt đầu, người kết ca và bảng mặt hàng (tồn lý thuyết); tồn lý thuyết G = tồn hiện tại' }, async (t) => {
  const c = await ca()
  S.ca1 = c
  const r = await S.nv.post('/ket-ca/bat-dau', { maCa: c?.maCa })
  t.status(r, 200)
  t.bang(r.data?.trangThaiCa, 'Đang kết ca', 'trạng thái ca')
  t.bang(r.data?.maNguoiKetCa, S.nv.nguoiDung.maND, 'người kết ca')
  const g = r.data?.dong?.find((d) => d.maHH === S.hh.G.maHH)
  const tonG = (await S.cq.get(`/hang-hoa/${S.hh.G.maHH}`)).data?.tongTon
  t.bang(g?.soLuongLyThuyet, tonG, 'tồn lý thuyết G')
  S.bb = r.data
  return `Ca ${r.data?.maCa} (${r.data?.ngayLamViec} ${r.data?.gioBatDau}) – ${r.data?.trangThaiCa}; người kết ca ${r.data?.nguoiKetCa}; ${r.data?.dong?.length} mặt hàng; G lý thuyết ${g?.soLuongLyThuyet}`
})
tc('TC-UC9.1-02', { ...U('UC_9.1'), ten: 'Đang kết ca – tạm dừng bán, nhập, hủy', loai: 'Quy tắc nghiệp vụ', nguon: 'BR07 (SUA_BAO_CAO 3.22: toàn cửa hàng)', tienDieuKien: 'Ca "Đang kết ca"', buoc: 'Thử bán hàng, thêm lô, hủy hóa đơn', duLieu: 'G ×1; lô G; hóa đơn Huy2', mongDoi: 'Cả 3 thao tác bị từ chối với thông báo đang kết ca' }, async (t) => {
  const { tt } = await ban(S.cq, [{ maHH: S.hh.G.maHH, soLuong: 1 }])
  const lo = await S.cq.post('/lo-hang', { tenHangHoa: S.hh.G.ten, soLuong: '5', hanSuDung: ngayISO(100) })
  const h = await S.cq.post('/huy-hoa-don', { maHD: S.x.Huy2.maHD, khachChuaNhanHang: true, lyDoHuy: 'Thử' })
  for (const r of [tt, lo, h]) t.thongBao(r, 'Ca làm việc đang kết ca')
  return `Bán: ${moTa(tt)}\nThêm lô: ${moTa(lo)}\nHủy: ${moTa(h)}`
})
tc('TC-UC9.1-03', { ...U('UC_9.1'), ten: 'Hủy kết ca – ca quay về "Đang hoạt động"', loai: 'Luồng thay thế', nguon: 'Alternative 6a', tienDieuKien: 'Ca "Đang kết ca"', buoc: 'Chọn "Hủy" trên biên bản', duLieu: '-', mongDoi: 'Không lưu biên bản; ca "Đang hoạt động"; bán hàng lại được' }, async (t) => {
  const r = await S.nv.post('/ket-ca/huy', { maCa: S.ca1.maCa })
  t.status(r, [200, 204])
  t.bang((await ca())?.trangThai, 'Đang hoạt động', 'trạng thái ca')
  const { hd } = await ban(S.nv, [{ maHH: S.hh.G.maHH, soLuong: 1 }])
  t.status(hd, [200, 201])
  return `Hủy: HTTP ${r.status}; ca ${(await ca())?.trangThai}; bán thử ${hd?.data?.maHD}`
})
tc('TC-UC9.1-04', { ...U('UC_9.1'), ten: 'Dòng chênh lệch chưa có nguyên nhân', loai: 'Ngoại lệ', nguon: 'Exception 7a, BR02', tienDieuKien: 'Bắt đầu kết ca lại', buoc: 'Nhập thực tế G = lý thuyết − 2, không nhập nguyên nhân → "Lưu"', duLieu: 'G thiếu 2', mongDoi: '"Vui lòng nhập nguyên nhân chênh lệch"' }, async (t) => {
  S.bb = (await S.nv.post('/ket-ca/bat-dau', { maCa: S.ca1.maCa })).data
  const g = S.bb?.dong?.find((d) => d.maHH === S.hh.G.maHH)
  return t.loiNV(await luu(S.nv, S.ca1.maCa, dongTheoLyThuyet(S.bb, { [S.hh.G.maHH]: { soLuongThucTe: g.soLuongLyThuyet - 2 } })), [400, 409], 'Vui lòng nhập nguyên nhân chênh lệch')
})
tc('TC-UC9.1-05', { ...U('UC_9.1'), ten: 'Nguyên nhân chỉ gồm khoảng trắng', loai: 'Ngoại lệ', nguon: 'Exception 7a, BR06', tienDieuKien: 'Ca "Đang kết ca"', buoc: 'Nguyên nhân "   "', duLieu: '"   "', mongDoi: '"Vui lòng nhập nguyên nhân chênh lệch"' }, async (t) => {
  const g = S.bb?.dong?.find((d) => d.maHH === S.hh.G.maHH)
  return t.loiNV(await luu(S.nv, S.ca1.maCa, dongTheoLyThuyet(S.bb, { [S.hh.G.maHH]: { soLuongThucTe: g.soLuongLyThuyet - 2, nguyenNhan: '   ' } })), [400, 409], 'Vui lòng nhập nguyên nhân chênh lệch')
})
tc('TC-UC9.1-06', { ...U('UC_9.1'), ten: 'Nguyên nhân dài hơn 255 ký tự', loai: 'Ngoại lệ', nguon: 'BR06', tienDieuKien: 'Ca "Đang kết ca"', buoc: 'Nguyên nhân 256 ký tự', duLieu: '"x" × 256', mongDoi: 'Không lưu, báo lỗi nguyên nhân' }, async (t) => {
  const g = S.bb?.dong?.find((d) => d.maHH === S.hh.G.maHH)
  const r = await luu(S.nv, S.ca1.maCa, dongTheoLyThuyet(S.bb, { [S.hh.G.maHH]: { soLuongThucTe: g.soLuongLyThuyet - 2, nguyenNhan: 'x'.repeat(256) } }))
  t.status(r, [400, 409])
  return moTa(r)
})
tc('TC-UC9.1-07', { ...U('UC_9.1'), ten: 'Lưu biên bản thành công – cập nhật tồn kho, kết thúc ca', loai: 'Luồng chính', nguon: 'Main flow 5–11, BR04, BR05, BR08', tienDieuKien: 'Ca "Đang kết ca"', buoc: 'G thiếu 2 (nguyên nhân "Hàng vỡ"), B thừa 1 (nguyên nhân "Đếm sót"), còn lại khớp → "Lưu"', duLieu: 'G −2, B +1', mongDoi: 'Lưu thành công kèm mã BB-ddmmyyyy-nnn; ca "Đã kết thúc"; tồn G giảm 2, tồn B tăng 1' }, async (t) => {
  const g = S.bb.dong.find((d) => d.maHH === S.hh.G.maHH)
  const b = S.bb.dong.find((d) => d.maHH === S.hh.B.maHH)
  const r = await luu(S.nv, S.ca1.maCa, dongTheoLyThuyet(S.bb, {
    [S.hh.G.maHH]: { soLuongThucTe: g.soLuongLyThuyet - 2, nguyenNhan: 'Hàng vỡ' },
    [S.hh.B.maHH]: { soLuongThucTe: b.soLuongLyThuyet + 1, nguyenNhan: 'Đếm sót' },
  }))
  t.status(r, 200)
  const ddmmyyyy = ngayVN().replace(/\//g, '')
  t.dung(new RegExp(`^BB-${ddmmyyyy}-\\d{3}$`).test(r.data?.maBB ?? ''), `Mã biên bản ${r.data?.maBB}`)
  t.bang(r.data?.trangThaiCa, 'Đã kết thúc', 'trạng thái ca')
  t.bang((await S.cq.get(`/hang-hoa/${S.hh.G.maHH}`)).data?.tongTon, g.soLuongLyThuyet - 2, 'tồn G')
  t.bang((await S.cq.get(`/hang-hoa/${S.hh.B.maHH}`)).data?.tongTon, b.soLuongLyThuyet + 1, 'tồn B')
  S.bbLuu = r.data
  return `${r.data?.maBB} | ca ${r.data?.maCa} ${r.data?.trangThaiCa} | kết thúc ${r.data?.gioKetThuc} | có chênh lệch ${r.data?.coChenhLech}`
})
tc('TC-UC9.1-08', { ...U('UC_9.1'), ten: 'Ca đã có biên bản – không lưu thêm', loai: 'Ngoại lệ', nguon: 'Exception 8a, BR05', tienDieuKien: 'Ca đã "Đã kết thúc"', buoc: 'Chủ quán lưu biên bản cho cùng ca', duLieu: 'Ca vừa kết thúc', mongDoi: '"Ca này đã được kết thúc, không thể lưu thêm biên bản"' }, async (t) => t.loiNV(await luu(S.cq, S.ca1.maCa, dongTheoLyThuyet(S.bb)), [400, 409], 'Ca này đã được kết thúc, không thể lưu thêm biên bản'))

// ================================================================== UC_2.4 – nhân viên đang trong ca
tc('TC-UC2.4-04', { ...U('UC_2.4'), ten: 'Không xử lý tài khoản nhân viên đang trong ca', loai: 'Ngoại lệ', nguon: 'Exception 5b, BR02', tienDieuKien: 'Cửa hàng chưa có ca mở; nhân viên kt_ca đăng nhập → mở ca mới do kt_ca phụ trách', buoc: '1. kt_ca đăng nhập (mở ca)\n2. Chủ quán chọn kt_ca → "Xóa tài khoản"', duLieu: `kt_ca${RUN}`, mongDoi: '"Không thể xử lý tài khoản nhân viên đang trong ca"; tài khoản không đổi' }, async (t) => {
  S.tkCa = { ten: `kt_ca${RUN}`, mk: 'KetCa12345' }
  await S.cq.post('/nhan-vien', { hoTen: 'Phạm Ca Thử', ngaySinh: '01/01/2001', sdt: sdtMoi(), email: `ca${RUN}@x.vn`, tenDangNhap: S.tkCa.ten, matKhau: S.tkCa.mk })
  S.pCa = await phien(S.tkCa)
  const c = await ca()
  t.bang(c?.maND, S.pCa.nguoiDung.maND, 'người phụ trách ca mới')
  const k = await S.cq.get(`/nhan-vien/${S.pCa.nguoiDung.maND}/kiem-tra-xoa`)
  const x = k.status === 200 ? await S.cq.post(`/nhan-vien/${S.pCa.nguoiDung.maND}/xoa`, { cheDo: k.data?.cheDo }) : k
  const kq = t.loiNV(x, [400, 409], 'Không thể xử lý tài khoản nhân viên đang trong ca')
  S.ca2 = c
  return `Ca ${c?.maCa} phụ trách ${c?.maND}; ${kq}`
})
tc('TC-UC2.4-05', { ...U('UC_2.4'), ten: 'Không xử lý tài khoản nhân viên còn ca chưa đối soát (đang kết ca)', loai: 'Ngoại lệ', nguon: 'Exception 5c, BR03 (SUA_BAO_CAO 3.3)', tienDieuKien: 'Ca của kt_ca đang "Đang kết ca"', buoc: '1. kt_ca bắt đầu kết ca\n2. Chủ quán xóa kt_ca', duLieu: `kt_ca${RUN}`, mongDoi: 'Bị từ chối ("Nhân viên còn ca chưa đối soát" / đang trong ca); tài khoản không đổi' }, async (t) => {
  S.bb2 = (await S.pCa.post('/ket-ca/bat-dau', { maCa: S.ca2.maCa })).data
  const k = await S.cq.get(`/nhan-vien/${S.pCa.nguoiDung.maND}/kiem-tra-xoa`)
  const x = k.status === 200 ? await S.cq.post(`/nhan-vien/${S.pCa.nguoiDung.maND}/xoa`, { cheDo: k.data?.cheDo }) : k
  t.status(x, [400, 409])
  t.dung(/chưa đối soát|đang trong ca/i.test(JSON.stringify(x.data)), `Thông báo: ${moTa(x)}`)
  return moTa(x)
})
tc('TC-UC9.1-09', { ...U('UC_9.1'), ten: 'Không có chênh lệch – lưu không cần nguyên nhân', loai: 'Luồng thay thế', nguon: 'Alternative 3a', tienDieuKien: 'Ca của kt_ca "Đang kết ca"', buoc: 'Nhập thực tế = lý thuyết cho mọi mặt hàng → "Lưu"', duLieu: '-', mongDoi: 'Lưu thành công, biên bản "không chênh lệch"' }, async (t) => {
  const r = await luu(S.pCa, S.ca2.maCa, dongTheoLyThuyet(S.bb2))
  t.status(r, 200)
  t.bang(r.data?.coChenhLech, false, 'có chênh lệch')
  S.bbLuu2 = r.data
  return `${r.data?.maBB}: có chênh lệch = ${r.data?.coChenhLech}`
})

// ================================================================== UC_9.2 Xem biên bản
const ds = (p, o = {}) => p.get(`/ket-ca/bien-ban?${new URLSearchParams(o)}`)
tc('TC-UC9.2-01', { ...U('UC_9.2'), ten: 'Chủ quán xem danh sách biên bản – mới nhất trước', loai: 'Luồng chính', nguon: 'Main flow 1, BR01, BR03, BR05', tienDieuKien: 'Có 2 biên bản vừa lưu', buoc: 'Mở "Xem biên bản"', duLieu: '-', mongDoi: 'Danh sách gồm mã BB, ngày làm việc, mã ca, người kết ca, có chênh lệch; biên bản mới nhất ở đầu' }, async (t) => {
  const r = await ds(S.cq)
  t.status(r, 200)
  const d = r.data ?? []
  t.bang(d[0]?.maBB, S.bbLuu2?.maBB, 'biên bản đầu danh sách')
  t.dung(['maBB', 'ngayLamViec', 'maCa', 'nguoiKetCa', 'coChenhLech'].every((k) => k in (d[0] ?? {})), 'Đủ cột')
  return d.slice(0, 3).map((x) => `${x.maBB} | ${x.ngayLamViec} | ${x.maCa} | ${x.nguoiKetCa} | chênh lệch: ${x.coChenhLech ? 'Có' : 'Không'}`).join('\n')
})
tc('TC-UC9.2-02', { ...U('UC_9.2'), ten: 'Lọc từ ngày lớn hơn đến ngày', loai: 'Ngoại lệ', nguon: 'Exception 3a, BR07', tienDieuKien: '-', buoc: 'Từ ngày hôm nay, đến ngày hôm qua', duLieu: `${ngayISO(0)} → ${ngayISO(-1)}`, mongDoi: '"Từ ngày không được lớn hơn đến ngày"' }, async (t) => t.loiNV(await ds(S.cq, { tuNgay: ngayISO(0), denNgay: ngayISO(-1) }), 400, 'Từ ngày không được lớn hơn đến ngày'))
tc('TC-UC9.2-03', { ...U('UC_9.2'), ten: 'Lọc chỉ biên bản có chênh lệch', loai: 'Quy tắc nghiệp vụ', nguon: 'BR06, BR07', tienDieuKien: 'Có biên bản có và không có chênh lệch', buoc: 'Chọn "Chỉ biên bản có chênh lệch"', duLieu: '-', mongDoi: 'Mọi dòng có chênh lệch; có biên bản BB thứ nhất, không có biên bản thứ hai' }, async (t) => {
  const d = (await ds(S.cq, { coChenhLech: 'true' })).data ?? []
  t.dung(d.every((x) => x.coChenhLech), 'Mọi dòng phải có chênh lệch')
  t.dung(d.some((x) => x.maBB === S.bbLuu?.maBB) && !d.some((x) => x.maBB === S.bbLuu2?.maBB), 'Lọc sai biên bản')
  return `${d.length} biên bản có chênh lệch`
})
tc('TC-UC9.2-04', { ...U('UC_9.2'), ten: 'Không có biên bản phù hợp điều kiện lọc', loai: 'Ngoại lệ', nguon: 'Exception 3b', tienDieuKien: 'Tháng 01/2026 không có biên bản', buoc: 'Lọc 01/01/2026 → 31/01/2026', duLieu: '01/2026', mongDoi: '"Không tìm thấy biên bản phù hợp"' }, async (t) => {
  const r = await ds(S.cq, { tuNgay: '2026-01-01', denNgay: '2026-01-31' })
  const rong = r.status === 200 && (r.data ?? []).length === 0
  if (!rong) t.loiNV(r, 404, 'Không tìm thấy biên bản phù hợp')
  return rong ? 'HTTP 200, danh sách rỗng (giao diện hiển thị "Không tìm thấy biên bản phù hợp")' : moTa(r)
})
tc('TC-UC9.2-05', { ...U('UC_9.2'), ten: 'Chi tiết biên bản – chỉ mặt hàng chênh lệch, không hiển thị tiền', loai: 'Luồng chính', nguon: 'Main flow 5–8, BR04, BR08', tienDieuKien: 'Biên bản thứ nhất có G −2, B +1', buoc: 'Chọn biên bản thứ nhất', duLieu: S.bbLuu?.maBB ?? 'BB thứ nhất', mongDoi: 'Thông tin chung + đúng 2 dòng chênh lệch (G −2 "Hàng vỡ", B +1 "Đếm sót"); không có trường tiền/giá' }, async (t) => {
  const r = await S.cq.get(`/ket-ca/bien-ban/chi-tiet?ma=${encodeURIComponent(S.bbLuu.maBB)}`)
  t.status(r, 200)
  const dong = r.data?.dong ?? []
  t.bang(dong.length, 2, 'số dòng')
  t.dung(dong.every((d) => d.chenhLech !== 0 && d.nguyenNhan), 'Chỉ dòng chênh lệch, có nguyên nhân')
  t.dung(!/gia|tien|doanh/i.test(Object.keys(r.data ?? {}).join() + Object.keys(dong[0] ?? {}).join()), 'Không có trường tiền/giá')
  return `${r.data?.maBB} | ca ${r.data?.maCa} | ${r.data?.ngayLamViec} ${r.data?.gioBatDau}–${r.data?.gioKetThuc} | ${r.data?.nguoiKetCa}\n` + dong.map((d) => `${d.tenHH}: lý thuyết ${d.soLuongLyThuyet}, thực tế ${d.soLuongThucTe}, chênh ${d.chenhLech}, "${d.nguyenNhan}"`).join('\n')
})
tc('TC-UC9.2-06', { ...U('UC_9.2'), ten: 'Biên bản không có chênh lệch', loai: 'Luồng thay thế', nguon: 'Alternative 7a', tienDieuKien: 'Biên bản thứ hai không chênh lệch', buoc: 'Chọn biên bản thứ hai', duLieu: S.bbLuu2?.maBB ?? 'BB thứ hai', mongDoi: 'Hiển thị thông tin chung, bảng trống (giao diện báo "Ca này không có chênh lệch")' }, async (t) => {
  const r = await S.cq.get(`/ket-ca/bien-ban/chi-tiet?ma=${encodeURIComponent(S.bbLuu2.maBB)}`)
  t.status(r, 200)
  t.bang(r.data?.dong?.length, 0, 'số dòng chênh lệch')
  return `${r.data?.maBB}: ${r.data?.dong?.length} dòng chênh lệch`
})
tc('TC-UC9.2-07', { ...U('UC_9.2'), ten: 'Nhân viên chỉ xem biên bản của ca do mình kết', loai: 'Ngoại lệ', nguon: 'Exception 6a, BR01', tienDieuKien: 'Biên bản thứ nhất do nhanvien1 kết; biên bản thứ hai do kt_ca kết', buoc: '1. kt_ca xem danh sách\n2. kt_ca mở biên bản thứ nhất', duLieu: 'kt_ca', mongDoi: 'Danh sách chỉ có biên bản của kt_ca; mở biên bản của người khác báo "Bạn không có quyền xem biên bản này"' }, async (t) => {
  const d = (await ds(S.pCa)).data ?? []
  t.dung(d.length > 0 && d.every((x) => x.maNguoiKetCa === S.pCa.nguoiDung.maND), `Danh sách của kt_ca: ${d.map((x) => x.maBB).join(', ')}`)
  const r = await S.pCa.get(`/ket-ca/bien-ban/chi-tiet?ma=${encodeURIComponent(S.bbLuu.maBB)}`)
  const kq = t.loiNV(r, 403, 'Bạn không có quyền xem biên bản này')
  return `Danh sách kt_ca: ${d.length} biên bản; mở biên bản người khác: ${kq}`
})
