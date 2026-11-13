// Kiểm thử trên giao diện: điều khiển Microsoft Edge (headless) qua Chrome DevTools Protocol, không cài thêm gì.
// Cần: backend kiểm thử (XN_API, mặc định :5104) và frontend trỏ vào nó (XN_WEB, mặc định http://localhost:5180):
//   $env:XOMNHO_API='http://localhost:5104'; npx vite --port 5180 --strictPort   (trong thư mục frontend)
// Chạy: node kiem-thu/giao-dien.mjs → kiem-thu/ket-qua/ket-qua-giao-dien.json + ảnh trong kiem-thu/ket-qua/anh/
import { execSync, spawn } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CQ, NV1, Phien, RUN, S, chayTatCa, ngayISO, phien, sdtMoi, tc } from './lib.mjs'

const WEB = process.env.XN_WEB ?? 'http://localhost:5180'
const EDGE = process.env.XN_EDGE ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const CONG = 9334
const THU_MUC = dirname(fileURLToPath(import.meta.url))
const ANH = join(THU_MUC, 'ket-qua', 'anh')
mkdirSync(ANH, { recursive: true })
const ngu = (ms) => new Promise((r) => setTimeout(r, ms))

// ------------------------------------------------------------------ Trình duyệt
class TrinhDuyet {
  async mo() {
    this.hoSo = join(tmpdir(), `xomnho-kiemthu-${Date.now()}`)
    this.tienTrinh = spawn(EDGE, ['--headless=new', '--disable-gpu', '--no-first-run', `--remote-debugging-port=${CONG}`, `--user-data-dir=${this.hoSo}`, '--window-size=1366,860', 'about:blank'], { stdio: 'ignore' })
    let trang
    for (let i = 0; i < 60 && !trang; i++) {
      await ngu(250)
      try {
        trang = (await (await fetch(`http://127.0.0.1:${CONG}/json`)).json()).find((x) => x.type === 'page')
      } catch {
        /* chưa sẵn sàng */
      }
    }
    if (!trang) throw new Error('Không mở được Edge headless')
    this.ws = new WebSocket(trang.webSocketDebuggerUrl)
    await new Promise((ok, loi) => ((this.ws.onopen = ok), (this.ws.onerror = loi)))
    this.id = 0
    this.cho = new Map()
    this.ws.onmessage = (e) => {
      const m = JSON.parse(e.data)
      if (m.id && this.cho.has(m.id)) {
        this.cho.get(m.id)(m)
        this.cho.delete(m.id)
      }
    }
    await this.gui('Page.enable')
    await this.gui('Network.enable')
    await this.gui('Emulation.setDeviceMetricsOverride', { width: 1366, height: 860, deviceScaleFactor: 1, mobile: false })
  }
  gui(method, params = {}) {
    return new Promise((ok) => {
      const id = ++this.id
      this.cho.set(id, ok)
      this.ws.send(JSON.stringify({ id, method, params }))
    })
  }
  /** Chạy JS trong trang; code có sẵn các hàm $$, nut(chữ), go(ô, giá trị), coChu(chữ). */
  async js(code) {
    const PRE = `const $$=(s)=>[...document.querySelectorAll(s)];
      const nut=(t)=>$$('button,a').find(b=>b.offsetParent!==null&&b.textContent.replace(/\\s+/g,' ').trim()===t)||$$('button,a').find(b=>b.offsetParent!==null&&b.textContent.replace(/\\s+/g,' ').trim().includes(t));
      const go=(el,v)=>{const p=el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,'value').set.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))};
      const coChu=(t)=>document.body.innerText.includes(t);`
    const r = await this.gui('Runtime.evaluate', { expression: `(async()=>{${PRE}\n${code}})()`, awaitPromise: true, returnByValue: true })
    if (r.result?.exceptionDetails) throw new Error(`Lỗi JS: ${r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text}`)
    return r.result?.result?.value
  }
  /** Đợi đến khi biểu thức trả về giá trị đúng. */
  async doi(code, moTa, ms = 9000) {
    const bd = Date.now()
    while (Date.now() - bd < ms) {
      try {
        if (await this.js(`return (${code})`)) return true
      } catch {
        /* trang đang tải */
      }
      await ngu(150)
    }
    throw new Error(`Hết thời gian chờ: ${moTa}`)
  }
  async den(duongDan) {
    await this.gui('Page.navigate', { url: WEB + duongDan })
    await ngu(400)
    await this.doi(`document.readyState==='complete' && !!document.querySelector('#root > *')`, `tải ${duongDan}`)
    await ngu(500)
  }
  async chup(ma) {
    const r = await this.gui('Page.captureScreenshot', { format: 'png' })
    const tep = join(ANH, `${ma}.png`)
    writeFileSync(tep, Buffer.from(r.result.data, 'base64'))
    return `kiem-thu/ket-qua/anh/${ma}.png`
  }
  async xoaCookie() {
    await this.gui('Network.clearBrowserCookies')
  }
  dong() {
    try {
      this.ws.close()
    } catch {
      /* bỏ qua */
    }
    try {
      execSync(`taskkill /PID ${this.tienTrinh.pid} /T /F`, { stdio: 'ignore' })
    } catch {
      /* đã tắt */
    }
    try {
      rmSync(this.hoSo, { recursive: true, force: true })
    } catch {
      /* Edge còn giữ tệp */
    }
  }
}

const b = new TrinhDuyet()
async function dangNhapUI(ten, mk, choTrangChu = true) {
  await b.xoaCookie()
  await b.den('/dang-nhap')
  await b.doi(`!!document.querySelector('input[autocomplete=username]')`, 'form đăng nhập')
  await b.js(`go(document.querySelector('input[autocomplete=username]'),${JSON.stringify(ten)}); go(document.querySelector('input[autocomplete=current-password]'),${JSON.stringify(mk)}); nut('Đăng nhập').click()`)
  if (choTrangChu) await b.doi(`location.pathname==='/' && coChu('Xin chào')`, 'vào Trang chủ')
}
const G = (uc, ten, info) => ({ uc, nhom: 'Giao diện', cachChay: 'Tự động (giao diện – trình duyệt Edge)', ten, ...info })

// ================================================================== Chuẩn bị dữ liệu qua API
tc('TC-GD-CB', G('Chuẩn bị', 'Chuẩn bị dữ liệu cho kiểm thử giao diện', { loai: 'Chuẩn bị', nguon: '-', tienDieuKien: 'Backend kiểm thử đang chạy', buoc: 'Tạo hàng hóa, lô, nhân viên, hóa đơn qua API', duLieu: '-', mongDoi: 'Tạo đủ' }), async (t) => {
  S.cq = await phien(CQ)
  const ten = `KT${RUN} GD Nước`
  const h = await S.cq.post('/hang-hoa', { tenHH: ten, maVach: '', maDM: (await S.cq.get('/hang-hoa/danh-muc')).data[0].maDM, donViTinh: 'chai', giaNhap: '9000', giaBan: '12000', nguongCanhBaoHetHang: '3', nguongCanhBaoHetHan: '7' })
  t.status(h, [200, 201])
  await S.cq.post('/lo-hang', { tenHangHoa: ten, soLuong: '30', hanSuDung: ngayISO(120) })
  S.gd = { ten, maHH: h.data?.ma, khoa: { ten: `kt_gd${RUN}`, mk: 'GiaoDien123' } }
  await S.cq.post('/nhan-vien', { hoTen: 'Giao Diện Thử', ngaySinh: '02/02/2002', sdt: sdtMoi(), email: `gd${RUN}@x.vn`, tenDangNhap: S.gd.khoa.ten, matKhau: S.gd.khoa.mk })
  const tt = await S.cq.post('/ban-hang/thanh-toan', { maKH: null, dong: [{ maHH: S.gd.maHH, soLuong: 2 }], phuongThuc: 'Tiền mặt', tienKhachDua: '50000' })
  const hd = await S.cq.post('/ban-hang/hoa-don', { maPTT: tt.data?.maPTT, maKH: null, dong: [{ maHH: S.gd.maHH, soLuong: 2 }] })
  S.gd.hdHuy = hd.data?.maHD
  await b.mo()
  return `Hàng ${S.gd.maHH}; nhân viên ${S.gd.khoa.ten}; hóa đơn để hủy ${S.gd.hdHuy}`
})

// ================================================================== UC_1 Đăng nhập
tc('TC-GD-01', G('UC_1', 'Giao diện: bỏ trống tên đăng nhập và mật khẩu', { loai: 'Ngoại lệ', nguon: 'Exception 5.a; màn hình 1.2', tienDieuKien: 'Mở trang đăng nhập', buoc: 'Để trống 2 ô, bấm "Đăng nhập"', duLieu: '-', mongDoi: 'Dưới mỗi ô hiện "Không được bỏ trống!"; vẫn ở trang đăng nhập' }), async (t) => {
  await b.xoaCookie()
  await b.den('/dang-nhap')
  await b.js(`nut('Đăng nhập').click()`)
  await b.doi(`$$('.truong__loi').length>=2`, 'thông báo lỗi')
  const loi = await b.js(`return $$('.truong__loi').map(e=>e.textContent.trim())`)
  t.dung(loi.length === 2 && loi.every((x) => x === 'Không được bỏ trống!'), `Thông báo: ${loi.join(' | ')}`)
  return `Thông báo: ${loi.join(' | ')}\nẢnh: ${await b.chup('TC-GD-01')}`
})
tc('TC-GD-02', G('UC_1', 'Giao diện: sai mật khẩu', { loai: 'Ngoại lệ', nguon: 'Exception 5.b', tienDieuKien: 'Mở trang đăng nhập', buoc: 'Nhập chuquan / sai mật khẩu → "Đăng nhập"', duLieu: 'chuquan / SaiMatKhau9', mongDoi: 'Hiện "Đăng nhập không thành công!"' }), async (t) => {
  await dangNhapUI(CQ.ten, 'SaiMatKhau9', false)
  await b.doi(`coChu('Đăng nhập không thành công!')`, 'thông báo sai')
  return `Hiện "Đăng nhập không thành công!"\nẢnh: ${await b.chup('TC-GD-02')}`
})
tc('TC-GD-03', G('UC_1', 'Giao diện: Chủ quán đăng nhập – Trang chủ đủ chức năng', { loai: 'Luồng chính', nguon: 'Main flow 1–6, BR05', tienDieuKien: 'Tài khoản chuquan', buoc: 'Đăng nhập chuquan / ChuQuan2026', duLieu: 'chuquan', mongDoi: 'Vào Trang chủ "Xin chào…", có các thẻ Quản lý tài khoản, Xem báo cáo và thống kê, Quản lý bán hàng…' }), async (t) => {
  await dangNhapUI(CQ.ten, CQ.mk)
  const the = await b.js(`return $$('.o-chuc-nang strong').map(e=>e.textContent.trim())`)
  t.dung(['Quản lý tài khoản', 'Xem báo cáo và thống kê', 'Quản lý bán hàng', 'Quản lý hàng hóa'].every((x) => the.includes(x)), `Thẻ: ${the.join(', ')}`)
  return `${the.length} thẻ: ${the.join(', ')}\nẢnh: ${await b.chup('TC-GD-03')}`
})
tc('TC-GD-04', G('UC_1', 'Giao diện: Nhân viên chỉ thấy chức năng được phân quyền', { loai: 'Luồng thay thế', nguon: 'Alternative 6.a, BR05', tienDieuKien: 'Tài khoản nhanvien1', buoc: '1. Đăng nhập nhanvien1\n2. Mở thẳng địa chỉ /bao-cao/doanh-thu', duLieu: 'nhanvien1', mongDoi: 'Không có thẻ Quản lý tài khoản, Xem báo cáo; mở thẳng trang báo cáo không xem được' }), async (t) => {
  await dangNhapUI(NV1.ten, NV1.mk)
  const the = await b.js(`return $$('.o-chuc-nang strong').map(e=>e.textContent.trim())`)
  t.dung(!the.includes('Quản lý tài khoản') && !the.includes('Xem báo cáo và thống kê'), `Thẻ: ${the.join(', ')}`)
  const anh = await b.chup('TC-GD-04')
  await b.den('/bao-cao/doanh-thu')
  const vao = await b.js(`return location.pathname + ' | ' + (document.querySelector('h1')?.textContent ?? '')`)
  t.dung(!/Báo cáo doanh thu/.test(vao), `Vẫn vào được báo cáo: ${vao}`)
  return `Thẻ (${the.length}): ${the.join(', ')}\nMở /bao-cao/doanh-thu → ${vao}\nẢnh: ${anh}, ${await b.chup('TC-GD-04b')}`
})
tc('TC-GD-05', G('UC_1', 'Giao diện: sai 10 lần → màn hình Nhập OTP (mẫu 1.4) → nhập mã mở khóa', { loai: 'Ngoại lệ', nguon: 'Exception 5.c, BR02, BR03; màn hình 1.4', tienDieuKien: `Nhân viên kt_gd${RUN} đang hoạt động`, buoc: '1. Đăng nhập sai mật khẩu đến lần 10\n2. Đọc mã trong tin nhắn giả lập gửi điện thoại Chủ quán\n3. Nhập mã → "Xác nhận"', duLieu: `kt_gd${RUN}`, mongDoi: 'Màn hình "Nhập OTP" có dòng "Tài khoản đang bị khóa tạm thời!"; tin nhắn giả lập gửi tới điện thoại Chủ quán; nhập đúng mã thì "Mở khóa tài khoản thành công"' }), async (t) => {
  for (let i = 0; i < 9; i++) await new Phien().post('/auth/dang-nhap', { tenDangNhap: S.gd.khoa.ten, matKhau: 'SaiMatKhau1' })
  await dangNhapUI(S.gd.khoa.ten, 'SaiMatKhau1', false)
  await b.doi(`coChu('Nhập OTP') && coChu('Tài khoản đang bị khóa tạm thời!')`, 'màn hình Nhập OTP')
  await b.doi(`!!document.querySelector('.sms-noi__ma')`, 'tin nhắn giả lập')
  const sms = await b.js(`return document.querySelector('.sms-noi').innerText`)
  const ma = await b.js(`return document.querySelector('.sms-noi__ma').textContent.trim()`)
  t.dung(/Chủ quán/.test(sms), `Tin nhắn: ${sms}`)
  const anh1 = await b.chup('TC-GD-05a')
  await b.js(`go(document.querySelector('input[aria-label="Mã OTP"]'),'${ma}'); nut('Xác nhận').click()`)
  await b.doi(`coChu('Mở khóa tài khoản thành công')`, 'mở khóa thành công')
  return `Tin nhắn giả lập: ${sms.replace(/\n/g, ' ')}\nNhập mã ${ma} → "Mở khóa tài khoản thành công"\nẢnh: ${anh1}, ${await b.chup('TC-GD-05b')}`
})

// ================================================================== UC_6.5 / UC_6.3
tc('TC-GD-06', G('UC_6.5', 'Giao diện: bán hàng tiền mặt từ giỏ hàng đến hóa đơn', { loai: 'Luồng chính', nguon: 'Main flow 1–16', tienDieuKien: 'Nhân viên đăng nhập; hàng "GD Nước" còn hàng', buoc: '1. Tìm "GD Nước", chọn vào giỏ\n2. "Tiếp tục thanh toán" → "Tiền mặt"\n3. Nhập tiền khách đưa 50.000 → xác nhận\n4. "Tiếp tục"', duLieu: 'GD Nước ×1; 50.000 đ', mongDoi: 'Hiện "Thanh toán thành công", sang màn hình "Hóa đơn bán hàng" có mã HD-dd/mm/yyyy.nnn, trạng thái Đã thanh toán' }), async (t) => {
  await dangNhapUI(NV1.ten, NV1.mk)
  await b.den('/quan-ly-ban-hang/ban-hang')
  await b.js(`go(document.querySelector('input[placeholder="Tìm tên sản phẩm"]'),${JSON.stringify(S.gd.ten)}); nut('Tìm kiếm').click()`)
  await b.doi(`$$('.ds-san-pham__dong').some(e=>e.textContent.includes(${JSON.stringify(S.gd.ten)}))`, 'kết quả tìm')
  await b.js(`$$('.ds-san-pham__dong').find(e=>e.textContent.includes(${JSON.stringify(S.gd.ten)})).click()`)
  await b.doi(`!!nut('Tiếp tục thanh toán') && !nut('Tiếp tục thanh toán').disabled`, 'giỏ có hàng')
  const anh1 = await b.chup('TC-GD-06a')
  await b.js(`nut('Tiếp tục thanh toán').click()`)
  await b.doi(`!!nut('Tiền mặt')`, 'bước thanh toán')
  await b.js(`nut('Tiền mặt').click()`)
  await b.doi(`!!document.querySelector('input[placeholder="0"]')`, 'ô tiền khách đưa')
  await b.js(`go(document.querySelector('input[placeholder="0"]'),'50000')`)
  await ngu(300)
  await b.js(`($$('button').find(x=>/Xác nhận/.test(x.textContent)&&!x.disabled)).click()`)
  await b.doi(`coChu('Thanh toán thành công')`, 'thanh toán thành công')
  const anh2 = await b.chup('TC-GD-06b')
  await b.js(`nut('Tiếp tục').click()`)
  await b.doi(`document.querySelector('h1')?.textContent.includes('Hóa đơn bán hàng')`, 'màn hình hóa đơn')
  const txt = await b.js(`return document.body.innerText`)
  const ma = txt.match(/HD-\d{2}\/\d{2}\/\d{4}\.\d{3,}/)?.[0]
  t.dung(ma && /Đã thanh toán/.test(txt), 'Hóa đơn phải có mã và trạng thái Đã thanh toán')
  return `Hóa đơn ${ma}, trạng thái Đã thanh toán\nẢnh: ${anh1}, ${anh2}, ${await b.chup('TC-GD-06c')}`
})
tc('TC-GD-07', G('UC_6.3', 'Giao diện: hủy hóa đơn bán hàng đầy đủ các bước', { loai: 'Luồng chính', nguon: 'Main flow 5–18', tienDieuKien: 'Chủ quán đăng nhập; hóa đơn chưa hủy, chưa đổi trả', buoc: '1. Mở hóa đơn → "Hủy hóa đơn bán hàng"\n2. "Khách chưa nhận hàng"\n3. Nhập lý do → "Tiếp tục"\n4. "Đồng ý · Hủy toàn bộ"', duLieu: 'Hóa đơn chuẩn bị sẵn; lý do "Khách đổi ý"', mongDoi: 'Hiện "Hủy hóa đơn thành công."' }), async (t) => {
  await dangNhapUI(CQ.ten, CQ.mk)
  await b.den(`/quan-ly-ban-hang/huy-hoa-don/hoa-don?ma=${encodeURIComponent(S.gd.hdHuy)}`)
  await b.doi(`!!nut('Hủy hóa đơn bán hàng')`, 'nút hủy')
  await b.js(`$$('aside button').find(x=>x.textContent.includes('Hủy hóa đơn bán hàng')).click()`)
  await b.doi(`coChu('Khách đã nhận hàng chưa?')`, 'hỏi nhận hàng')
  await b.js(`nut('Khách chưa nhận hàng').click()`)
  await b.doi(`!!document.querySelector('textarea')`, 'ô lý do')
  await b.js(`go(document.querySelector('textarea'),'Khách đổi ý'); nut('Tiếp tục').click()`)
  await b.doi(`coChu('Xác nhận hủy toàn bộ')`, 'xác nhận hủy')
  const anh1 = await b.chup('TC-GD-07a')
  await b.js(`nut('Đồng ý').click()`)
  await b.doi(`coChu('Hủy hóa đơn thành công.')`, 'hủy thành công')
  return `Hiện "Hủy hóa đơn thành công."\nẢnh: ${anh1}, ${await b.chup('TC-GD-07b')}`
})

// ================================================================== UC_4.x / UC_8.3 / UC_5.2
tc('TC-GD-08', G('UC_4.1', 'Giao diện: thêm hàng hóa bỏ trống trường bắt buộc', { loai: 'Ngoại lệ', nguon: 'Exception 5a', tienDieuKien: 'Chủ quán ở form "Thêm hàng hóa"', buoc: 'Để trống các trường → "Lưu"', duLieu: '-', mongDoi: '"Không được để trống!" hiện ngay dưới các trường bắt buộc' }), async (t) => {
  await b.den('/quan-ly-hang-hoa/them')
  await b.doi(`!!nut('Lưu')`, 'form')
  await b.js(`nut('Lưu').click()`)
  await b.doi(`$$('.truong__loi').some(e=>e.textContent.includes('Không được để trống!'))`, 'lỗi trống')
  const n = await b.js(`return $$('.truong__loi').filter(e=>e.textContent.includes('Không được để trống!')).length`)
  t.dung(n >= 3, `Số trường báo trống: ${n}`)
  return `${n} trường hiện "Không được để trống!"\nẢnh: ${await b.chup('TC-GD-08')}`
})
tc('TC-GD-09', G('UC_4.4', 'Giao diện: tìm hàng hóa không có', { loai: 'Ngoại lệ', nguon: 'Exception 4a', tienDieuKien: 'Chủ quán ở màn hình Quản lý hàng hóa', buoc: 'Nhập "zzz_khong_co" → "Tìm kiếm"', duLieu: 'zzz_khong_co', mongDoi: 'Hiện "Không tìm thấy hàng hóa"' }), async (t) => {
  await b.den('/quan-ly-hang-hoa')
  await b.js(`go($$('form input')[0],'zzz_khong_co'); nut('Tìm kiếm').click()`)
  await b.doi(`coChu('Không tìm thấy hàng hóa')`, 'thông báo không tìm thấy')
  return `Hiện "Không tìm thấy hàng hóa"\nẢnh: ${await b.chup('TC-GD-09')}`
})
tc('TC-GD-10', G('UC_5.2', 'Giao diện: báo cáo doanh thu – số tiền có dấu phân cách hàng nghìn', { loai: 'Luồng chính', nguon: 'Main flow 1–7, BR03', tienDieuKien: 'Hôm nay có bán hàng', buoc: 'Mở "Xem báo cáo doanh thu", kỳ Ngày hôm nay → "Xác nhận"', duLieu: 'Hôm nay', mongDoi: 'Hiện tổng doanh thu, số đơn, theo phương thức; số tiền dạng 1.234.000 đ' }), async (t) => {
  await b.den('/bao-cao/doanh-thu')
  await b.doi(`!!nut('Xác nhận')`, 'bộ chọn kỳ')
  await b.js(`nut('Xác nhận').click()`)
  await b.doi(`coChu('Tổng doanh thu')`, 'báo cáo')
  const txt = await b.js(`return document.querySelector('.luoi-so-lieu')?.innerText ?? ''`)
  t.dung(/\d{1,3}(\.\d{3})+\s?đ/.test(txt), `Số tiền: ${txt}`)
  return `${txt.replace(/\n/g, ' | ')}\nẢnh: ${await b.chup('TC-GD-10')}`
})
tc('TC-GD-11', G('UC_8.3', 'Giao diện: tìm khách hàng không có', { loai: 'Ngoại lệ', nguon: 'Exception 5d', tienDieuKien: 'Ở màn hình Quản lý khách hàng', buoc: 'Nhập "Zzz Khong Co" → "Tìm kiếm"', duLieu: 'Zzz Khong Co', mongDoi: 'Hiện "Không tìm thấy khách hàng"' }), async (t) => {
  await b.den('/quan-ly-khach-hang')
  await b.js(`go($$('form input')[0],'Zzz Khong Co'); nut('Tìm kiếm').click()`)
  await b.doi(`coChu('Không tìm thấy khách hàng')`, 'thông báo')
  return `Hiện "Không tìm thấy khách hàng"\nẢnh: ${await b.chup('TC-GD-11')}`
})

// ================================================================== UC_11 Đăng xuất
tc('TC-GD-12', G('UC_11', 'Giao diện: đăng xuất khi có thao tác chưa lưu → chọn "Hủy"', { loai: 'Luồng thay thế', nguon: 'Alternative 1.a, 1.b', tienDieuKien: 'Chủ quán đang nhập dở form Thêm hàng hóa', buoc: '1. Nhập tên hàng\n2. Menu tài khoản → "Đăng xuất"\n3. Chọn "Hủy"', duLieu: 'Tên "Đang nhập dở"', mongDoi: 'Cảnh báo "Thao tác chưa hoàn tất sẽ không được lưu. Bạn có muốn đăng xuất?"; chọn Hủy thì giữ nguyên màn hình' }), async (t) => {
  await b.den('/quan-ly-hang-hoa/them')
  await b.doi(`!!document.querySelector('input[placeholder="Nhập tên hàng hóa"]')`, 'form')
  await b.js(`go(document.querySelector('input[placeholder="Nhập tên hàng hóa"]'),'Đang nhập dở')`)
  await ngu(300)
  await b.js(`document.querySelector('.tai-khoan__nut').click()`)
  await b.doi(`!!nut('Đăng xuất')`, 'menu tài khoản')
  await b.js(`nut('Đăng xuất').click()`)
  await b.doi(`coChu('Thao tác chưa hoàn tất sẽ không được lưu. Bạn có muốn đăng xuất?')`, 'cảnh báo chưa lưu')
  const anh = await b.chup('TC-GD-12')
  await b.js(`$$('dialog button').find(x=>x.textContent.trim()==='Hủy').click()`)
  await ngu(400)
  const o = await b.js(`return location.pathname`)
  t.bang(o, '/quan-ly-hang-hoa/them', 'màn hình sau khi Hủy')
  return `Hiện cảnh báo chưa lưu; chọn Hủy → vẫn ở ${o}\nẢnh: ${anh}`
})
tc('TC-GD-13', G('UC_11', 'Giao diện: đăng xuất – xác nhận, quay về màn hình đăng nhập', { loai: 'Luồng chính', nguon: 'Main flow 1–5, BR02', tienDieuKien: 'Chủ quán đang ở Trang chủ', buoc: '1. Menu tài khoản → "Đăng xuất"\n2. "Xác nhận"\n3. Mở lại Trang chủ', duLieu: '-', mongDoi: 'Hỏi "Bạn có muốn đăng xuất không?"; sau xác nhận về màn hình đăng nhập; mở lại Trang chủ vẫn bị đưa về đăng nhập' }), async (t) => {
  await b.den('/')
  await b.js(`document.querySelector('.tai-khoan__nut').click()`)
  await b.doi(`!!nut('Đăng xuất')`, 'menu tài khoản')
  await b.js(`nut('Đăng xuất').click()`)
  await b.doi(`coChu('Bạn có muốn đăng xuất không?')`, 'hộp thoại')
  const anh = await b.chup('TC-GD-13')
  await b.js(`$$('dialog button').find(x=>x.textContent.trim()==='Xác nhận').click()`)
  await b.doi(`location.pathname==='/dang-nhap'`, 'về đăng nhập')
  await b.den('/')
  await b.doi(`location.pathname==='/dang-nhap'`, 'bị chặn khi chưa đăng nhập')
  return `Hỏi xác nhận → về /dang-nhap; mở lại "/" → /dang-nhap\nẢnh: ${anh}`
})

// ------------------------------------------------------------------ Chạy
console.log(`Kiểm thử giao diện tại ${WEB}\n`)
let kq
try {
  kq = await chayTatCa()
} finally {
  b.dong()
}
const dat = kq.filter((k) => k.ketQua === 'Đạt').length
console.log(`\nTổng: ${kq.length} | Đạt: ${dat} | Không đạt: ${kq.length - dat}`)
mkdirSync(join(THU_MUC, 'ket-qua'), { recursive: true })
writeFileSync(join(THU_MUC, 'ket-qua', 'ket-qua-giao-dien.json'), JSON.stringify({ thoiDiem: new Date().toISOString(), web: WEB, ketQua: kq }, null, 2))
