/**
 * Đọc số thành chữ tiếng Việt (Usability NFR-02: đọc to số tiền khi tính tiền).
 * Tự chuyển sang chữ thay vì đưa chữ số cho trình duyệt, để máy không có giọng tiếng Việt đầy đủ vẫn đọc đúng cách nói.
 * Ví dụ: 125000 → "một trăm hai mươi lăm nghìn", 1000005 → "một triệu không trăm linh năm".
 */
const CHU_SO = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín']

/** Một nhóm ba chữ số. <paramref name="dayDu"/>: nhóm đứng sau nhóm khác nên đọc cả "không trăm", "linh". */
function docBaSo(n: number, dayDu: boolean): string {
  const tram = Math.floor(n / 100)
  const chuc = Math.floor(n / 10) % 10
  const dv = n % 10
  const t: string[] = []
  if (tram > 0 || dayDu) t.push(`${CHU_SO[tram]} trăm`)
  if (chuc === 0) {
    if (dv > 0 && (tram > 0 || dayDu)) t.push('linh')
  } else if (chuc === 1) t.push('mười')
  else t.push(`${CHU_SO[chuc]} mươi`)
  if (dv > 0) {
    if (dv === 1 && chuc >= 2) t.push('mốt')
    else if (dv === 5 && chuc >= 1) t.push('lăm')
    else if (dv === 4 && chuc >= 2) t.push('tư')
    else t.push(CHU_SO[dv])
  }
  return t.join(' ')
}

function docDuoiTy(n: number, dayDu: boolean): string {
  const nhom = [Math.floor(n / 1e6), Math.floor(n / 1e3) % 1000, n % 1000]
  const ten = ['triệu', 'nghìn', '']
  const t: string[] = []
  let daDoc = dayDu
  nhom.forEach((g, i) => {
    if (g === 0) return
    t.push([docBaSo(g, daDoc), ten[i]].filter(Boolean).join(' '))
    daDoc = true
  })
  return t.join(' ')
}

export function docSo(giaTri: number): string {
  const n = Math.floor(Math.abs(giaTri))
  if (n === 0) return 'không'
  if (n >= 1e9) {
    const du = n % 1e9
    return [`${docSo(Math.floor(n / 1e9))} tỷ`, du ? docDuoiTy(du, true) : ''].filter(Boolean).join(' ')
  }
  return docDuoiTy(n, false)
}

export const docTien = (soTien: number) => `${docSo(soTien)} đồng`
