import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { LoiApi } from '../api/client'
import { saoLuuApi } from '../api/nghiepVu'
import { ngayGio, so } from '../lib/dinhDang'
import { useTrang } from '../lib/useTrang'

/** Backup NFR-01 (đề xuất màn hình, SUA_BAO_CAO mục 15): xem bản sao lưu và sao lưu ngay. Chỉ Chủ quán. */
export function SaoLuu() {
  const queryClient = useQueryClient()
  const { data, error, isLoading } = useQuery({ queryKey: ['sao-luu'], queryFn: saoLuuApi.thongTin, retry: false })
  const [dangChay, setDangChay] = useState(false)
  const [thongBao, setThongBao] = useState<{ loai: 'xanh' | 'do'; chu: string } | null>(null)
  const { dsTrang, phanTrang } = useTrang(data?.cacBan)

  const saoLuuNgay = async () => {
    setDangChay(true)
    setThongBao(null)
    try {
      const b = await saoLuuApi.saoLuuNgay()
      setThongBao({ loai: 'xanh', chu: `Sao lưu thành công lúc ${ngayGio(b.thoiDiem)} (${so(b.dungLuongMB)} MB).` })
      void queryClient.invalidateQueries({ queryKey: ['sao-luu'] })
    } catch (e) {
      setThongBao({ loai: 'do', chu: e instanceof LoiApi ? e.message : 'Sao lưu dữ liệu thất bại' })
    } finally {
      setDangChay(false)
    }
  }

  return (
    <>
      <h1>Sao lưu dữ liệu</h1>
      <section className="the the--rong">
        {isLoading && <p className="ghi-chu">Đang tải…</p>}
        {error && <p className="thong-bao thong-bao--do">{(error as Error).message}</p>}
        {data && (
          <dl className="thong-tin">
            <dt>Sao lưu tự động</dt>
            <dd>{data.batTuDong ? `Hằng ngày lúc ${data.gioChay}` : 'Đang tắt'}</dd>
            {data.lanKeTiep && (
              <>
                <dt>Lần kế tiếp</dt>
                <dd>{ngayGio(data.lanKeTiep)}</dd>
              </>
            )}
            <dt>Giữ bản sao lưu</dt>
            <dd>{data.soNgayGiu} ngày gần nhất</dd>
            <dt>Thư mục (trên máy chủ CSDL)</dt>
            <dd className="chu-nho">{data.thuMuc}</dd>
          </dl>
        )}
        <div className="hang-nut hang-nut--trai">
          <button type="button" className="nut nut--chinh" disabled={dangChay} onClick={saoLuuNgay}>
            {dangChay ? 'Đang sao lưu…' : 'Sao lưu ngay'}
          </button>
        </div>
        {thongBao && <p className={`thong-bao thong-bao--${thongBao.loai}`}>{thongBao.chu}</p>}
      </section>

      <section className="the the--rong">
        <h2>Các bản sao lưu</h2>
        <div className="bang-cuon">
          <table className="bang bang--xen-ke">
            <thead>
              <tr>
                <th>Thời điểm</th>
                <th>Loại</th>
                <th className="so">Dung lượng</th>
                <th>Tệp</th>
              </tr>
            </thead>
            <tbody>
              {data?.cacBan.length === 0 && (
                <tr>
                  <td colSpan={4} className="canh-giua">
                    Chưa có bản sao lưu nào
                  </td>
                </tr>
              )}
              {dsTrang.map((b) => (
                <tr key={b.tepTin}>
                  <td>{ngayGio(b.thoiDiem)}</td>
                  <td>{b.tuDong ? 'Tự động' : 'Thủ công'}</td>
                  <td className="so">{so(b.dungLuongMB)} MB</td>
                  <td className="chu-nho">{b.tepTin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {phanTrang}
      </section>
    </>
  )
}
