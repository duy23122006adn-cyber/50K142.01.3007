import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { tonKhoApi } from '../../api/nghiepVu'
import { ngay, so } from '../../lib/dinhDang'
import { useTrang } from '../../lib/useTrang'

const CAC_TAB = ['Tất cả', 'Sắp hết hàng', 'Sắp hết hạn', 'Hết hàng', 'Hết hạn'] as const

/** Màn hình 3.2 – Xem cảnh báo tồn kho (UC_3.2). */
export function CanhBaoTonKho() {
  const [tab, setTab] = useState<(typeof CAC_TAB)[number]>('Tất cả')
  const [caDaXuLy, setCaDaXuLy] = useState(false)
  const loai = tab === 'Tất cả' ? '' : tab

  const { data, isLoading } = useQuery({
    queryKey: ['canh-bao', loai, caDaXuLy],
    queryFn: () => tonKhoApi.canhBao(loai, caDaXuLy),
  })
  const tong = data ? Object.values(data.soLuongTheoLoai).reduce((a, b) => a + b, 0) : 0
  const { dsTrang, phanTrang } = useTrang(data?.danhSach, `${loai}|${caDaXuLy}|${data?.danhSach.length}`)

  return (
    <>
      <h1>Xem cảnh báo tồn kho</h1>
      <section className="the the--rong">
        <div className="thanh-cong-cu">
          <div className="tab" role="tablist" aria-label="Loại cảnh báo">
            {CAC_TAB.map((t) => {
              const sl = t === 'Tất cả' ? tong : (data?.soLuongTheoLoai[t] ?? 0)
              return (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={tab === t}
                  className={`nut nut--nho ${tab === t ? 'nut--chon' : ''}`}
                  onClick={() => setTab(t)}
                >
                  {t} ({sl})
                </button>
              )
            })}
          </div>
          <label className="o-chon">
            <input type="checkbox" checked={caDaXuLy} onChange={(e) => setCaDaXuLy(e.target.checked)} />
            Hiện cả cảnh báo đã xử lý
          </label>
        </div>

        {isLoading && <p className="ghi-chu">Đang tải…</p>}
        {data && data.danhSach.length === 0 && (
          <p className="thong-bao thong-bao--do">
            {tab === 'Tất cả' ? 'Hiện không có cảnh báo tồn kho' : 'Hiện không có cảnh báo trong mục này'}
          </p>
        )}
        {data && data.danhSach.length > 0 && (
          <div className="bang-cuon">
            <table className="bang">
              <thead>
                <tr>
                  <th>Mã lô</th>
                  <th>Tên hàng</th>
                  <th>Đơn vị tính</th>
                  <th className="so">Số lượng tồn</th>
                  <th className="so">Số ngày còn lại</th>
                  <th>Hạn sử dụng</th>
                  <th>Loại cảnh báo</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {dsTrang.map((c) => (
                  <tr key={c.maCB} className={c.trangThai === 'Đã xử lý' ? 'dong-mo' : ''}>
                    <td>{c.maLo}</td>
                    <td>{c.tenHH}</td>
                    <td>{c.donViTinh}</td>
                    <td className="so">{so(c.soLuongTon)}</td>
                    <td className={`so ${c.soNgayConLai < 0 ? 'chu-do' : ''}`}>{c.soNgayConLai}</td>
                    <td>{ngay(c.hanSuDung)}</td>
                    <td>
                      <span className={`nhan nhan--${c.loaiCanhBao.startsWith('Hết') ? 'do' : 'cam'}`}>{c.loaiCanhBao}</span>
                    </td>
                    <td>{c.trangThai}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {phanTrang}
      </section>
    </>
  )
}
