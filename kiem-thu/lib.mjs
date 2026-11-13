// Thư viện dùng chung cho bộ kiểm thử E2E Xóm Nhỏ (chạy qua API thật, CSDL riêng XomNho_KiemThu).
// Không phụ thuộc gói ngoài: Node >= 22 (fetch, WebSocket, zlib.crc32 có sẵn).
import { spawnSync } from 'node:child_process'

export const API = process.env.XN_API ?? 'http://localhost:5104/api'
export const CSDL = process.env.XN_CSDL ?? 'XomNho_KiemThu'
export const CQ = { ten: 'chuquan', mk: 'ChuQuan2026' }
export const NV1 = { ten: 'nhanvien1', mk: 'NhanVien2026' }

/** Hậu tố duy nhất cho mỗi lần chạy để chạy lại nhiều lần trên cùng CSDL không bị trùng tên. */
export const RUN = (() => {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}${String(d.getSeconds()).padStart(2, '0')}`
})()
/** Hậu tố chỉ gồm chữ cái (họ tên không được có chữ số), riêng cho mỗi lần chạy. */
export const CHU = RUN.replace(/\d/g, (d) => 'abcdeghikl'[d])
/** 3 chữ số ngẫu nhiên-ổn định trong lần chạy, dùng ghép số điện thoại / CCCD không trùng. */
export const SO = String(Date.now() % 1000).padStart(3, '0')
let demSo = 0
/** Số điện thoại mới 10 số, bắt đầu 0, không trùng trong lần chạy. */
export const sdtMoi = () => `09${SO}${String(++demSo).padStart(2, '0')}${String(Date.now() % 1000).padStart(3, '0')}`.slice(0, 10)
export const cccdMoi = () => `0790${SO}${String(++demSo).padStart(2, '0')}${String(Date.now() % 1000).padStart(3, '0')}`.slice(0, 12)

const p2 = (n) => String(n).padStart(2, '0')
/** Ngày hôm nay (giờ máy chạy test = giờ Việt Nam), dạng yyyy-MM-dd; lech = số ngày cộng thêm. */
export function ngayISO(lech = 0) {
  const d = new Date()
  d.setDate(d.getDate() + lech)
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
}
/** dd/mm/yyyy */
export const ngayVN = (lech = 0) => ngayISO(lech).split('-').reverse().join('/')

// ------------------------------------------------------------------ Phiên gọi API

export class Phien {
  constructor(ten = null, mk = null) {
    this.ten = ten
    this.mk = mk
    this.token = null
    this.cookie = ''
    this.nguoiDung = null
  }

  async goi(method, duongDan, body) {
    const headers = { Accept: 'application/json' }
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    if (this.token) headers.Authorization = `Bearer ${this.token}`
    if (this.cookie) headers.Cookie = this.cookie
    const res = await fetch(API + duongDan, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
    const sc = res.headers.getSetCookie?.() ?? []
    for (const c of sc) {
      const kv = c.split(';')[0]
      if (kv.startsWith('xn_refresh=')) this.cookie = kv.endsWith('=') ? '' : kv
    }
    const text = await res.text()
    let data = null
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      data = text
    }
    return { status: res.status, data }
  }
  get = (p) => this.goi('GET', p)
  post = (p, b) => this.goi('POST', p, b ?? {})
  put = (p, b) => this.goi('PUT', p, b ?? {})

  /** Đăng nhập; trả về phản hồi thô. Thành công thì lưu token. */
  async dangNhap(ten = this.ten, mk = this.mk) {
    const r = await this.post('/auth/dang-nhap', { tenDangNhap: ten, matKhau: mk })
    if (r.status === 200) {
      this.token = r.data.accessToken
      this.nguoiDung = r.data.nguoiDung
    }
    return r
  }
}

/** Phiên đã đăng nhập (ném lỗi nếu không đăng nhập được – lỗi chuẩn bị dữ liệu). */
export async function phien(tk) {
  const p = new Phien(tk.ten, tk.mk)
  const r = await p.dangNhap()
  if (r.status !== 200) throw new Error(`Không đăng nhập được ${tk.ten}: HTTP ${r.status} ${JSON.stringify(r.data)}`)
  return p
}

// ------------------------------------------------------------------ SQL trên CSDL kiểm thử (chỉ dùng để lùi ngày dữ liệu thử)

export function sql(lenh) {
  if (!/KiemThu/i.test(CSDL)) throw new Error('Chỉ chạy SQL trên CSDL kiểm thử')
  const r = spawnSync('sqlcmd', ['-S', 'localhost', '-E', '-C', '-d', CSDL, '-b', '-W', '-h', '-1', '-Q', `SET NOCOUNT ON; ${lenh}`], {
    encoding: 'utf8',
  })
  if (r.status !== 0) throw new Error(`SQL lỗi: ${r.stdout}${r.stderr}`)
  return r.stdout.trim()
}

// ------------------------------------------------------------------ Đăng ký & chạy test case

/** Trạng thái dùng chung giữa các nhóm test (phiên, hàng hóa, khách, hóa đơn đã tạo…). */
export const S = {}

export const DS = []
/**
 * Khai báo test case.
 * @param {string} ma Mã TC, vd "TC-UC1-01"
 * @param {object} info { uc, nhom, ten, loai, nguon, tienDieuKien, buoc, duLieu, mongDoi, cachChay }
 * @param {(t: KiemTra) => Promise<string|void>} fn trả về mô tả kết quả thực tế
 */
export function tc(ma, info, fn) {
  DS.push({ ma, cachChay: 'Tự động (API)', ...info, fn })
}

const chuan = (s) =>
  String(s ?? '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/[“”"]/g, '')
    .replace(/[\s.!]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()

/** Lấy mọi câu thông báo trong phản hồi lỗi: thongBao + loi{}. */
export const cacThongBao = (r) => {
  const d = r?.data ?? {}
  return [d.thongBao, ...Object.values(d.loi ?? {})].filter(Boolean)
}
export const moTa = (r) => {
  const tb = cacThongBao(r)
  return `HTTP ${r.status}${tb.length ? ` – "${tb.join('" | "')}"` : ''}`
}

export class KiemTra {
  constructor() {
    this.loi = []
    this.ghiChu = []
  }
  dung(dk, thongDiep) {
    if (!dk) this.loi.push(thongDiep)
    return !!dk
  }
  bang(thuc, mong, ten = 'giá trị') {
    return this.dung(thuc === mong, `${ten}: mong đợi ${JSON.stringify(mong)}, thực tế ${JSON.stringify(thuc)}`)
  }
  status(r, mong) {
    const ds = Array.isArray(mong) ? mong : [mong]
    return this.dung(ds.includes(r.status), `HTTP mong đợi ${ds.join('/')}, thực tế ${moTa(r)}`)
  }
  /** Phản hồi chứa câu thông báo mong đợi (so khớp không phân biệt hoa thường, bỏ dấu câu cuối). */
  thongBao(r, mong, truong) {
    const ds = truong ? [r?.data?.loi?.[truong]].filter(Boolean) : cacThongBao(r)
    const ok = ds.some((x) => chuan(x).includes(chuan(mong)) || chuan(mong).includes(chuan(x)))
    return this.dung(ok, `Thông báo mong đợi "${mong}"${truong ? ` ở trường ${truong}` : ''}, thực tế ${moTa(r)}`)
  }
  /** Lỗi nghiệp vụ: đúng mã HTTP và đúng câu thông báo. */
  loiNV(r, status, mong, truong) {
    this.status(r, status)
    if (mong) this.thongBao(r, mong, truong)
    return moTa(r)
  }
  ghi(s) {
    this.ghiChu.push(s)
  }
}

export async function chayTatCa(loc) {
  const kq = []
  for (const t of DS) {
    if (loc && !loc(t)) continue
    const k = new KiemTra()
    let thucTe = ''
    let loiChay = null
    const bd = Date.now()
    try {
      thucTe = (await t.fn(k)) ?? ''
    } catch (e) {
      loiChay = e
    }
    const dat = !loiChay && k.loi.length === 0
    const dong = {
      ma: t.ma,
      uc: t.uc,
      nhom: t.nhom,
      ten: t.ten,
      loai: t.loai,
      nguon: t.nguon,
      tienDieuKien: t.tienDieuKien,
      buoc: t.buoc,
      duLieu: t.duLieu,
      mongDoi: t.mongDoi,
      cachChay: t.cachChay,
      thucTe: [thucTe, ...k.ghiChu].filter(Boolean).join('\n') || (dat ? 'Đúng như mong đợi' : ''),
      ketQua: dat ? 'Đạt' : 'Không đạt',
      chiTietLoi: loiChay ? `Lỗi khi chạy: ${loiChay.message}` : k.loi.join('\n'),
      thoiGianMs: Date.now() - bd,
    }
    kq.push(dong)
    process.stdout.write(`${dat ? '✓' : '✗'} ${t.ma} ${t.ten}${dat ? '' : `\n    → ${dong.chiTietLoi.replace(/\n/g, '\n    → ')}`}\n`)
  }
  return kq
}
