// Gộp kết quả kiểm thử (API + giao diện) thành file Excel docs/KiemThu_XomNho.xlsx – tự ghi định dạng XLSX, không cần thư viện.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { crc32, deflateRawSync } from 'node:zlib'

const THU_MUC = dirname(fileURLToPath(import.meta.url))
const docJson = (f) => (existsSync(join(THU_MUC, 'ket-qua', f)) ? JSON.parse(readFileSync(join(THU_MUC, 'ket-qua', f), 'utf8')) : null)
const api = docJson('ket-qua-api.json')
const gd = docJson('ket-qua-giao-dien.json')
if (!api) throw new Error('Chưa có ket-qua-api.json – chạy node kiem-thu/chay.mjs trước')

const TEN_UC = {
  'UC_1': 'Đăng nhập', 'UC_2.1': 'Thêm mới tài khoản nhân viên', 'UC_2.2': 'Sửa nhân viên', 'UC_2.3': 'Đổi mật khẩu tài khoản', 'UC_2.4': 'Xóa tài khoản nhân viên',
  'UC_3.1': 'Tìm kiếm tồn kho', 'UC_3.2': 'Xem cảnh báo tồn kho', 'UC_3.3': 'Điều chỉnh tồn kho',
  'UC_4.1': 'Thêm hàng hóa', 'UC_4.2': 'Sửa hàng hóa', 'UC_4.3': 'Xóa hàng hóa', 'UC_4.4': 'Tìm kiếm hàng hóa',
  'UC_5.1': 'Xem báo cáo lợi nhuận', 'UC_5.2': 'Xem báo cáo doanh thu', 'UC_5.3': 'Xem báo cáo số lượng bán ra', 'UC_5.4': 'Xem báo cáo tồn kho',
  'UC_6.1': 'Tìm kiếm lịch sử bán hàng', 'UC_6.2': 'Xử lý đổi trả', 'UC_6.3': 'Hủy hóa đơn bán hàng', 'UC_6.4': 'Duyệt phiếu đổi trả', 'UC_6.5': 'Tạo hóa đơn bán hàng',
  'UC_7.1': 'Tạo hóa đơn nợ', 'UC_7.2': 'Tìm kiếm khách quen', 'UC_7.3': 'Tạo phiếu thanh toán nợ', 'UC_7.4': 'Sửa khách quen', 'UC_7.5': 'Thêm khách quen', 'UC_7.6': 'Xóa khách quen',
  'UC_8.1': 'Thêm khách hàng', 'UC_8.2': 'Sửa thông tin khách hàng', 'UC_8.3': 'Tìm kiếm khách hàng',
  'UC_9.1': 'Lưu biên bản', 'UC_9.2': 'Xem biên bản', 'UC_10.1': 'Thêm lô hàng', 'UC_11': 'Đăng xuất',
}
/** Nhận xét cho các test case không đạt (phân tích sau khi chạy). */
const NHAN_XET = {
  'TC-UC2.1-09': 'Lệch câu thông báo: đặc tả UC_2.1 (6e) ghi "Mật khẩu không đủ mạnh"; hệ thống dùng "Mật khẩu không đúng quy tắc" (cùng câu với UC_2.3 4c). Quy tắc mật khẩu được kiểm tra đúng. Đề xuất: thống nhất một câu – sửa đặc tả UC_2.1 6e hoặc sửa thông báo trong code.',
  'TC-UC2.1-10': 'Như TC-UC2.1-09 (cùng nguyên nhân).',
  'TC-UC4.3-02': 'Lệch câu thông báo: đặc tả UC_4.3 bước 7 ghi "Đã xoá thông tin hàng hóa này."; hệ thống báo "Xóa hàng hóa thành công". Hàng hóa vẫn được xóa thật đúng BR01. Đề xuất: sửa câu thông báo trong code cho khớp đặc tả.',
  'TC-UC6.2-18': 'Lệch câu thông báo: đặc tả 14.a.7.3.a.1 ghi "Thành toán không thành công" (có lỗi chính tả "Thành"); hệ thống báo "Thanh toán chưa thành công". Luồng xử lý (ghi nhận chưa thanh toán, chọn không thanh toán lại → "Không hoàn tất") đúng. Đề xuất: sửa đặc tả thành "Thanh toán không thành công" và thống nhất câu trong code.',
}

// ------------------------------------------------------------------ XML / XLSX tối giản
const esc = (s) =>
  String(s ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
const cot = (i) => {
  let s = ''
  for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s
  return s
}
// Kiểu ô: 0 thường, 1 tiêu đề bảng, 2 nội dung có viền, 3 Đạt, 4 Không đạt, 5 tiêu đề lớn, 6 đậm, 7 số có viền, 8 nhãn đậm có viền
const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="6"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FF006100"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FF9C0006"/><name val="Calibri"/></font><font><b/><sz val="16"/><color rgb="FFCB001E"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="6"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFCB001E"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFC6EFCE"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFC7CE"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF2F7FF"/></patternFill></fill></fills>
<borders count="2"><border/><border><left style="thin"><color rgb="FFBFC7D5"/></left><right style="thin"><color rgb="FFBFC7D5"/></right><top style="thin"><color rgb="FFBFC7D5"/></top><bottom style="thin"><color rgb="FFBFC7D5"/></bottom></border></borders>
<cellStyleXfs count="1"><xf/></cellStyleXfs>
<cellXfs count="9">
<xf/>
<xf fontId="1" fillId="2" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf borderId="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf fontId="2" fillId="3" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf>
<xf fontId="3" fillId="4" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf>
<xf fontId="4" applyFont="1"/>
<xf fontId="5" applyFont="1"/>
<xf borderId="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf>
<xf fontId="5" fillId="5" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
</cellXfs>
</styleSheet>`

/** Một sheet: rows = mảng dòng, mỗi ô là { v, s } hoặc giá trị thô. */
function sheetXml(rows, { widths = [], freeze = 0, filter = null } = {}) {
  const r = rows
    .map((row, i) => {
      if (!row) return ''
      const cells = row
        .map((c, j) => {
          if (c === null || c === undefined || c === '') return ''
          const o = typeof c === 'object' ? c : { v: c }
          const ref = `${cot(j)}${i + 1}`
          const s = o.s ? ` s="${o.s}"` : ''
          if (typeof o.v === 'number') return `<c r="${ref}"${s}><v>${o.v}</v></c>`
          return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${esc(o.v)}</t></is></c>`
        })
        .join('')
      return `<row r="${i + 1}">${cells}</row>`
    })
    .join('')
  const pane = freeze ? `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${freeze}" topLeftCell="A${freeze + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` : ''
  const cols = widths.length ? `<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>` : ''
  const af = filter ? `<autoFilter ref="${filter}"/>` : ''
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${pane}${cols}<sheetData>${r}</sheetData>${af}</worksheet>`
}

function zip(files) {
  const chunks = []
  const central = []
  let offset = 0
  for (const [name, content] of files) {
    const data = Buffer.from(content, 'utf8')
    const comp = deflateRawSync(data)
    const crc = crc32(data)
    const nameBuf = Buffer.from(name, 'utf8')
    const lh = Buffer.alloc(30)
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt16LE(8, 8)
    lh.writeUInt32LE(0, 10); lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(data.length, 22)
    lh.writeUInt16LE(nameBuf.length, 26); lh.writeUInt16LE(0, 28)
    chunks.push(lh, nameBuf, comp)
    const ch = Buffer.alloc(46)
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8); ch.writeUInt16LE(8, 10)
    ch.writeUInt32LE(0, 12); ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(comp.length, 20); ch.writeUInt32LE(data.length, 24)
    ch.writeUInt16LE(nameBuf.length, 28); ch.writeUInt16LE(0, 30); ch.writeUInt16LE(0, 32); ch.writeUInt16LE(0, 34); ch.writeUInt16LE(0, 36)
    ch.writeUInt32LE(0, 38); ch.writeUInt32LE(offset, 42)
    central.push(ch, nameBuf)
    offset += lh.length + nameBuf.length + comp.length
  }
  const cd = Buffer.concat(central)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10)
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16)
  return Buffer.concat([...chunks, cd, end])
}

// ------------------------------------------------------------------ Dữ liệu
const tatCa = [...api.ketQua, ...(gd?.ketQua ?? [])]
const chinh = tatCa.filter((k) => k.loai !== 'Chuẩn bị')
const chuanBi = tatCa.filter((k) => k.loai === 'Chuẩn bị')
const soUC = (u) => (u.match(/[\d.]+/)?.[0] ?? '0').split('.').map(Number)
const cmpUC = (a, b) => {
  const [x, y] = [soUC(a), soUC(b)]
  return x[0] - y[0] || (x[1] ?? 0) - (y[1] ?? 0)
}
const dat = chinh.filter((k) => k.ketQua === 'Đạt').length
const ngay = new Date(api.thoiDiem)
const thoiDiem = `${String(ngay.getDate()).padStart(2, '0')}/${String(ngay.getMonth() + 1).padStart(2, '0')}/${ngay.getFullYear()} ${String(ngay.getHours()).padStart(2, '0')}:${String(ngay.getMinutes()).padStart(2, '0')}`

const H = (s) => ({ v: s, s: 1 })
const T = (s) => ({ v: s, s: 2 })
const KQ = (k) => ({ v: k, s: k === 'Đạt' ? 3 : 4 })
const N = (n) => ({ v: n, s: 7 })
const L = (s) => ({ v: s, s: 8 })
const COT_TC = ['Mã TC', 'UC', 'Tên test case', 'Loại', 'Nguồn trong đặc tả', 'Tiền điều kiện', 'Các bước thực hiện', 'Dữ liệu kiểm thử', 'Kết quả mong đợi', 'Kết quả thực tế', 'Kết quả', 'Chi tiết khi không đạt', 'Cách chạy']
const RONG_TC = [13, 9, 34, 14, 22, 26, 34, 24, 38, 46, 11, 40, 16]
const dongTC = (k) => [T(k.ma), T(k.uc), T(k.ten), T(k.loai), T(k.nguon), T(k.tienDieuKien), T(k.buoc), T(k.duLieu), T(k.mongDoi), T(k.thucTe), KQ(k.ketQua), T([k.chiTietLoi, NHAN_XET[k.ma]].filter(Boolean).join('\n')), T(k.cachChay)]

// Sheet Tổng hợp
const tong = []
tong.push([{ v: 'KẾT QUẢ KIỂM THỬ HỆ THỐNG BÁN HÀNG TẠP HÓA XÓM NHỎ', s: 5 }])
tong.push([{ v: 'Test case xây dựng từ đặc tả use case trong báo cáo NHÓM_1_PTTKHTTT (34 UC, đã đối chiếu docs/SUA_BAO_CAO.md)', s: 0 }])
tong.push(null)
tong.push([L('Thời điểm chạy'), T(thoiDiem)])
tong.push([L('Môi trường'), T(`API ${api.api} · giao diện ${gd?.web ?? '-'} · CSDL riêng XomNho_KiemThu (SQL Server) · trình duyệt Microsoft Edge (headless)`)])
tong.push([L('Cách chạy'), T('node kiem-thu/chay.mjs (API) · node kiem-thu/giao-dien.mjs (giao diện) · node kiem-thu/xuat-excel.mjs (xuất file này)')])
tong.push([L('Tổng số test case'), N(chinh.length)])
tong.push([L('Đạt'), N(dat)])
tong.push([L('Không đạt'), N(chinh.length - dat)])
tong.push([L('Tỷ lệ đạt'), T(`${((dat / chinh.length) * 100).toFixed(1)}%`)])
tong.push([L('Bước chuẩn bị dữ liệu'), T(`${chuanBi.length} bước (sheet "Dữ liệu chuẩn bị"), không tính vào tổng`)])
tong.push(null)
tong.push([H('UC'), H('Tên use case'), H('Số TC'), H('Đạt'), H('Không đạt'), H('Tỷ lệ đạt')])
const theoUC = new Map()
for (const k of chinh) theoUC.set(k.uc, [...(theoUC.get(k.uc) ?? []), k])
for (const uc of [...theoUC.keys()].sort(cmpUC)) {
  const ds = theoUC.get(uc)
  const d = ds.filter((k) => k.ketQua === 'Đạt').length
  tong.push([T(uc), T(TEN_UC[uc] ?? ''), N(ds.length), N(d), N(ds.length - d), T(`${Math.round((d / ds.length) * 100)}%`)])
}
const khongDat = chinh.filter((k) => k.ketQua !== 'Đạt')
tong.push(null)
tong.push([{ v: `CÁC TEST CASE KHÔNG ĐẠT (${khongDat.length})`, s: 6 }])
tong.push([H('Mã TC'), H('UC'), H('Tên test case'), H('Mong đợi'), H('Thực tế'), H('Nhận xét / đề xuất')])
for (const k of khongDat) tong.push([T(k.ma), T(k.uc), T(k.ten), T(k.mongDoi), T(k.chiTietLoi), T(NHAN_XET[k.ma] ?? '')])

const sheets = [['Tổng hợp', sheetXml(tong, { widths: [22, 30, 36, 34, 46, 60] })]]
const NHOM = ['Đăng nhập & Tài khoản', 'Hàng hóa, Lô hàng & Tồn kho', 'Khách hàng', 'Bán hàng & Lịch sử', 'Công nợ & Khách quen', 'Hủy hóa đơn & Đổi trả', 'Báo cáo', 'Kết ca', 'Giao diện']
for (const nhom of NHOM) {
  const ds = chinh.filter((k) => k.nhom === nhom).sort((a, b) => cmpUC(a.uc, b.uc))
  if (!ds.length) continue
  const rows = [COT_TC.map(H), ...ds.map(dongTC)]
  sheets.push([nhom.replace(/[\\/?*[\]:]/g, '-').slice(0, 31), sheetXml(rows, { widths: RONG_TC, freeze: 1, filter: `A1:M${rows.length}` })])
}
const cb = [COT_TC.map(H), ...chuanBi.map(dongTC)]
sheets.push(['Dữ liệu chuẩn bị', sheetXml(cb, { widths: RONG_TC, freeze: 1 })])

// ------------------------------------------------------------------ Ghi file
const files = [
  ['[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`],
  ['_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
  ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map(([ten], i) => `<sheet name="${esc(ten)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>${sheets.slice(1, -1).length ? `<definedNames>${sheets.map(([ten, xml], i) => (/autoFilter/.test(xml) ? `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${esc(ten)}'!$A$1:$M$${(xml.match(/<row /g) ?? []).length}</definedName>` : '')).join('')}</definedNames>` : ''}</workbook>`],
  ['xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
  ['xl/styles.xml', STYLES],
  ...sheets.map(([, xml], i) => [`xl/worksheets/sheet${i + 1}.xml`, xml]),
]
const ra = join(THU_MUC, '..', 'docs', 'KiemThu_XomNho.xlsx')
mkdirSync(dirname(ra), { recursive: true })
writeFileSync(ra, zip(files))
console.log(`Đã ghi ${ra}\nTổng ${chinh.length} TC | Đạt ${dat} | Không đạt ${chinh.length - dat} | ${sheets.length} sheet`)
