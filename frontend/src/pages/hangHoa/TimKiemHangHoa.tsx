import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { hangHoaApi } from '../../api/nghiepVu'
import { PhanTrang } from '../../components/PhanTrang'

/** Màn hình 4.2 – Tìm kiếm hàng hóa (UC_4.4). */
export function TimKiemHangHoa() {
  const navigate = useNavigate()
  const [oTim, setOTim] = useState('')
  const [tuKhoa, setTuKhoa] = useState('')
  const [trang, setTrang] = useState(1)

  const { data, isFetching } = useQuery({
    queryKey: ['hang-hoa', tuKhoa, trang],
    queryFn: () => hangHoaApi.timKiem(tuKhoa, trang),
    placeholderData: keepPreviousData,
  })

  return (
    <>
      <h1>{tuKhoa ? 'Tìm kiếm hàng hóa' : 'Danh sách hàng hóa'}</h1>
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
              placeholder="Nhập tên hàng hóa để tìm kiếm"
              value={oTim}
              onChange={(e) => setOTim(e.target.value)}
              aria-label="Tên hàng hóa"
            />
            <button type="submit" className="nut">Tìm kiếm</button>
          </form>
          <Link to="/quan-ly-hang-hoa/them" className="nut nut--chinh">
            Thêm hàng hóa
          </Link>
        </div>

        {data && tuKhoa && <p className="ghi-chu">Kết quả tìm kiếm: {data.tongSo} hàng hóa</p>}
        {data && data.tongSo === 0 && (
          <p className="khung-loi">{tuKhoa ? 'Không tìm thấy hàng hóa' : 'Chưa có hàng hóa nào.'}</p>
        )}
        {data && data.tongSo > 0 && (
          <div className={`bang-cuon ${isFetching ? 'dang-tai-mo' : ''}`}>
            <table className="bang">
              <thead>
                <tr>
                  <th>Mã hàng</th>
                  <th>Tên hàng</th>
                  <th>Đơn vị tính</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {data.danhSach.map((h) => (
                  <tr key={h.maHH}>
                    <td>{h.maHH}</td>
                    <td>{h.tenHH}</td>
                    <td>{h.donViTinh}</td>
                    <td>{h.trangThai}</td>
                    <td>
                      <button type="button" className="nut nut--nho" onClick={() => navigate(`/quan-ly-hang-hoa/${h.maHH}`)}>
                        Chọn
                      </button>
                    </td>
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
