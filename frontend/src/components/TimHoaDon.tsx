import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { LoiApi } from '../api/client'
import { hoaDonApi, type DieuKienTimHoaDon } from '../api/nghiepVu'
import { ngayGio, tien } from '../lib/dinhDang'
import { PhanTrang } from './PhanTrang'
import { NhanTrangThaiHoaDon } from './XemHoaDon'

interface Props {
  tieuDe: string
  /** Thông báo khi tìm không có kết quả (6.2.5 / 6.3.3). */
  thongBaoRong: string
  onXem: (maHD: string) => void
}

/**
 * Danh sách hóa đơn + một ô tìm "mã hóa đơn hoặc tên khách hàng" (màn hình 6.2.1–6.2.5, 6.3.1–6.3.3).
 * Bắt đầu bằng "HD" → tìm đúng mã; ngược lại tìm theo tên/SĐT khách. Từ khóa lưu trên URL để "Về danh sách" giữ kết quả.
 */
export function TimHoaDon({ tieuDe, thongBaoRong, onXem }: Props) {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const tuKhoa = params.get('tuKhoa') ?? ''
  const trang = Number(params.get('trang') ?? '1')
  const [oTim, setOTim] = useState(tuKhoa)

  const dk: DieuKienTimHoaDon = /^hd/i.test(tuKhoa) ? { ma: tuKhoa.toUpperCase() } : { khach: tuKhoa }
  const { data, error, isFetching } = useQuery({
    queryKey: ['hoa-don', 'tim-don', tuKhoa, trang],
    queryFn: () => hoaDonApi.timKiem(dk, trang, !tuKhoa),
    placeholderData: keepPreviousData,
    retry: false,
  })
  const loi =
    error instanceof LoiApi && error.loi.ma
      ? 'Thông tin tìm kiếm không hợp lệ. Vui lòng kiểm tra mã hóa đơn.'
      : error
        ? 'Không thể tìm kiếm hóa đơn.'
        : null

  return (
    <>
      <h1>{tieuDe}</h1>
      <section className="the the--rong">
        <form
          className="thanh-cong-cu"
          onSubmit={(e) => {
            e.preventDefault()
            const p = new URLSearchParams()
            if (oTim.trim()) p.set('tuKhoa', oTim.trim())
            setParams(p)
          }}
        >
          <div className="o-tim">
            <input
              className={`truong__o ${loi ? 'truong__o--loi' : ''}`}
              placeholder="Nhập mã hóa đơn hoặc tên khách hàng"
              value={oTim}
              onChange={(e) => setOTim(e.target.value)}
              aria-label="Mã hóa đơn hoặc tên khách hàng"
            />
            <button type="submit" className="nut nut--chinh">
              Tìm kiếm
            </button>
          </div>
          <button type="button" className="nut" onClick={() => navigate('/')}>
            Thoát
          </button>
        </form>
        {loi && (
          <>
            <p className="thong-bao thong-bao--do">{loi}</p>
            <p className="ghi-chu">Kiểm tra lại điều kiện tìm kiếm.</p>
          </>
        )}

        {data && !loi && (
          <>
            <h2 className="tieu-de-bang">
              {tuKhoa ? 'Kết quả tìm kiếm' : 'Danh sách hóa đơn'} · {data.tongSo} hóa đơn
            </h2>
            {data.tongSo === 0 ? (
              <p className="thong-bao thong-bao--do">{tuKhoa ? thongBaoRong : 'Chưa có hóa đơn nào.'}</p>
            ) : (
              <div className={`bang-cuon ${isFetching ? 'dang-tai-mo' : ''}`}>
                <table className="bang">
                  <thead>
                    <tr>
                      <th>Mã hóa đơn</th>
                      <th>Ngày giờ lập</th>
                      <th>Khách hàng</th>
                      <th className="so">Tổng tiền</th>
                      <th>Trạng thái</th>
                      <th>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.danhSach.map((h) => (
                      <tr key={h.maHD}>
                        <td>{h.maHD}</td>
                        <td>{ngayGio(h.ngayGioLap)}</td>
                        <td>{h.tenKhach ?? <span className="ghi-chu">Khách vãng lai</span>}</td>
                        <td className="so">{tien(h.tongTien)}</td>
                        <td>
                          <NhanTrangThaiHoaDon trangThai={h.trangThai} />
                        </td>
                        <td>
                          <button type="button" className="nut nut--nho" onClick={() => onXem(h.maHD)}>
                            Xem
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <PhanTrang
              trang={data.trang}
              soTrang={data.soTrang}
              onDoiTrang={(t) => {
                const p = new URLSearchParams(params)
                p.set('trang', String(t))
                setParams(p)
              }}
            />
          </>
        )}
      </section>
    </>
  )
}
