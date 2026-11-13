import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { tonKhoApi } from '../../api/nghiepVu'
import { PhanTrang } from '../../components/PhanTrang'
import { ngay, so } from '../../lib/dinhDang'

/**
 * Màn hình 3.1 Tìm kiếm tồn kho (UC_3.1) và 3.3 danh sách lô cần điều chỉnh (UC_3.3).
 * <paramref name="cheDoDieuChinh"/>: hiện thêm cột "Hành động" với nút "Sửa".
 */
export function TimKiemTonKho({ cheDoDieuChinh = false }: { cheDoDieuChinh?: boolean }) {
  const navigate = useNavigate()
  const [oTim, setOTim] = useState('')
  const [tuKhoa, setTuKhoa] = useState('')
  const [trang, setTrang] = useState(1)

  const { data, isFetching } = useQuery({
    queryKey: ['ton-kho', tuKhoa, trang],
    queryFn: () => tonKhoApi.timKiem(tuKhoa, trang),
    placeholderData: keepPreviousData,
  })

  return (
    <>
      <h1>{cheDoDieuChinh ? 'Điều chỉnh tồn kho' : 'Tìm kiếm tồn kho'}</h1>
      <section className="the the--rong">
        <div className="thanh-cong-cu">
          <form
            className="o-tim"
            onSubmit={(e) => {
              e.preventDefault()
              setTuKhoa(oTim.trim())
              setTrang(1)
            }}
          >
            <input
              className="truong__o"
              placeholder="Nhập tên hàng hóa"
              value={oTim}
              onChange={(e) => setOTim(e.target.value)}
              aria-label="Tên hoặc mã hàng hóa"
            />
            <button type="submit" className="nut nut--chinh">Tìm kiếm</button>
          </form>
        </div>

        {data && (
          <h2 className="tieu-de-bang">
            {tuKhoa ? 'Kết quả tìm kiếm' : 'Danh sách tồn kho'} · {data.tongSo} lô hàng
          </h2>
        )}
        {/* Mẫu 3.1.x / 3.3.x: không có kết quả vẫn giữ khung bảng, thông báo căn giữa trong bảng. */}
        {data && (
          <div className={`bang-cuon ${isFetching ? 'dang-tai-mo' : ''}`}>
            <table className="bang">
              <thead>
                <tr>
                  <th>Mã lô</th>
                  <th>Mã hàng</th>
                  <th>Tên hàng</th>
                  <th>Đơn vị tính</th>
                  <th className="so">Số lượng tồn</th>
                  <th>Hạn sử dụng</th>
                  {cheDoDieuChinh && <th>Hành động</th>}
                </tr>
              </thead>
              <tbody>
                {data.tongSo === 0 && (
                  <tr>
                    <td colSpan={cheDoDieuChinh ? 7 : 6} className="chu-do o-bang-trong">
                      {tuKhoa ? 'Không tìm thấy hàng hóa!' : 'Chưa có lô hàng nào.'}
                    </td>
                  </tr>
                )}
                {data.danhSach.map((l) => (
                  <tr key={l.maLo}>
                    <td>{l.maLo}</td>
                    <td>{l.maHH}</td>
                    <td>{l.tenHH}</td>
                    <td>{l.donViTinh}</td>
                    <td className="so">{so(l.soLuongTon)}</td>
                    <td>{ngay(l.hanSuDung)}</td>
                    {cheDoDieuChinh && (
                      <td>
                        <button type="button" className="nut nut--nho" onClick={() => navigate(`/quan-ly-ton-kho/dieu-chinh/${l.maLo}`)}>
                          Sửa
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <PhanTrang trang={data.trang} soTrang={data.soTrang} onDoiTrang={setTrang} />}
      </section>
    </>
  )
}
