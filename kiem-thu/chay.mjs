// Chạy bộ kiểm thử API: node kiem-thu/chay.mjs [lọc mã TC, vd "UC1|UC2.1"]
// Kết quả: kiem-thu/ket-qua/ket-qua-api.json
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { API, chayTatCa } from './lib.mjs'

const THU_MUC = dirname(fileURLToPath(import.meta.url))
const NHOM = [
  './tc-01-tai-khoan.mjs',
  './tc-02-hang-hoa-ton-kho.mjs',
  './tc-03-khach-hang.mjs',
  './tc-04-ban-hang.mjs',
  './tc-05-cong-no.mjs',
  './tc-06-doi-tra-huy.mjs',
  './tc-07-bao-cao.mjs',
  './tc-08-ket-ca.mjs',
]
const chiNhom = process.env.XN_NHOM ? process.env.XN_NHOM.split(',').map(Number) : null
for (const [i, f] of NHOM.entries()) {
  if (chiNhom && !chiNhom.includes(i + 1)) continue
  try {
    await import(f)
  } catch (e) {
    if (e.code === 'ERR_MODULE_NOT_FOUND' && e.message.includes(f.slice(2))) continue
    throw e
  }
}

console.log(`Chạy kiểm thử API tại ${API}\n`)
const loc = process.argv[2] ? new RegExp(process.argv[2]) : null
const bd = Date.now()
const kq = await chayTatCa(loc ? (t) => loc.test(t.ma) || t.loai === 'Chuẩn bị' : null)
const dat = kq.filter((k) => k.ketQua === 'Đạt').length
console.log(`\nTổng: ${kq.length} | Đạt: ${dat} | Không đạt: ${kq.length - dat} | ${((Date.now() - bd) / 1000).toFixed(1)} giây`)

mkdirSync(join(THU_MUC, 'ket-qua'), { recursive: true })
writeFileSync(join(THU_MUC, 'ket-qua', 'ket-qua-api.json'), JSON.stringify({ thoiDiem: new Date().toISOString(), api: API, ketQua: kq }, null, 2))
