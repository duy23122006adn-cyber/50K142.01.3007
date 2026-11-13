import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { LoiApi } from '../../api/client'
import { khachHangApi, type KhachHangDong } from '../../api/nghiepVu'
import { useXacThuc } from '../../auth/AuthContext'
import { PhanTrang } from '../../components/PhanTrang'
import { ThongBaoKetQua, type KetQua } from '../../components/ThongBaoKetQua'
import { so } from '../../lib/dinhDang'

/** Màn hình 8.3 – Tìm kiếm khách hàng (UC_8.3). */
export function DanhSachKhachHang() {
  const navigate = useNavigate()
  const [oTim, setOTim] = useState('')
  const [tuKhoa, setTuKhoa] = useState('')
  const [trang, setTrang] = useState(1)

  const { data, error, isFetching } = useQuery({
    queryKey: ['khach-hang', tuKhoa, trang],
    queryFn: () => khachHangApi.timKiem(tuKhoa, trang),
    placeholderData: keepPreviousData,
    retry: false,
  })
  const loi = error instanceof LoiApi ? (error.loi.tuKhoa ?? error.message) : error ? 'Tìm kiếm không thành công' : null

  return (
    <>
      <h1>Quản lý khách hàng</h1>
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
              className={`truong__o ${loi ? 'truong__o--loi' : ''}`}
              placeholder="Nhập tên hoặc số điện thoại"
              value={oTim}
              onChange={(e) => setOTim(e.target.value)}
              aria-label="Tên hoặc số điện thoại"
            />
            <button type="submit" className="nut nut--chinh">Tìm kiếm</button>
          </form>
        </div>
        {loi && <p className="thong-bao thong-bao--do">{loi}</p>}

        {data && !loi && (
          <>
            <h2 className="tieu-de-bang">
              {tuKhoa ? 'Kết quả tìm kiếm' : 'Danh sách khách hàng'} · {data.tongSo} khách hàng
            </h2>
            {data.tongSo === 0 ? (
              <p className="thong-bao thong-bao--do">{tuKhoa ? 'Không tìm thấy khách hàng' : 'Hiện không có khách hàng nào'}</p>
            ) : (
              <div className={`bang-cuon ${isFetching ? 'dang-tai-mo' : ''}`}>
                <table className="bang">
                  <thead>
                    <tr>
                      <th>Mã KH</th>
                      <th>Họ tên</th>
                      <th>Số điện thoại</th>
                      <th>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.danhSach.map((kh) => (
                      <tr key={kh.maKH}>
                        <td>{kh.maKH}</td>
                        <td>{kh.hoTen}</td>
                        <td>{kh.sdt}</td>
                        <td>
                          <div className="o-hanh-dong">
                            <button type="button" className="nut nut--nho" onClick={() => navigate(`/quan-ly-khach-hang/${kh.maKH}`)}>
                              Xem
                            </button>
                            <button type="button" className="nut nut--nho" onClick={() => navigate(`/quan-ly-khach-hang/${kh.maKH}/sua`)}>
                              Sửa
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <PhanTrang trang={data.trang} soTrang={data.soTrang} onDoiTrang={setTrang} />
          </>
        )}
      </section>
    </>
  )
}

/** Màn hình 8.3.3 – Chi tiết khách hàng (chỉ xem – BR07). */
export function ChiTietKhachHangTrang() {
  const { maKH = '' } = useParams()
  const navigate = useNavigate()
  const { data, error } = useQuery({ queryKey: ['khach-hang', 'chi-tiet', maKH], queryFn: () => khachHangApi.chiTiet(maKH) })
  if (error) return <p className="thong-bao thong-bao--do">{(error as Error).message}</p>
  if (!data) return <p className="ghi-chu">Đang tải…</p>

  return (
    <>
      <h1>Chi tiết khách hàng</h1>
      <section className="the the--vua">
        <dl className="thong-tin">
          <dt>Mã KH</dt>
          <dd>{data.maKH}</dd>
          <dt>Họ tên</dt>
          <dd>{data.hoTen}</dd>
          <dt>Số điện thoại</dt>
          <dd>{data.sdt}</dd>
        </dl>
        <h2>Mặt hàng thường mua</h2>
        {data.matHangThuongMua.length === 0 ? (
          <p className="ghi-chu">Khách hàng chưa có hóa đơn mua hàng nào.</p>
        ) : (
          <div className="bang-cuon">
            <table className="bang">
              <thead>
                <tr>
                  <th>Mã hàng</th>
                  <th>Tên mặt hàng</th>
                  <th>Đơn vị tính</th>
                  <th className="so">Số lượng đã mua</th>
                </tr>
              </thead>
              <tbody>
                {data.matHangThuongMua.map((m) => (
                  <tr key={m.maHH}>
                    <td>{m.maHH}</td>
                    <td>{m.tenHH}</td>
                    <td>{m.donViTinh}</td>
                    <td className="so">{so(m.soLuongDaMua)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="hang-nut">
          <button type="button" className="nut" onClick={() => navigate('/quan-ly-khach-hang')}>
            Quay lại danh sách
          </button>
        </div>
      </section>
    </>
  )
}

/** Màn hình 8.1 Thêm khách hàng (UC_8.1) và 8.2 Sửa thông tin khách hàng (UC_8.2). */
export function FormKhachHang({ cheDo }: { cheDo: 'them' | 'sua' }) {
  const { maKH = '' } = useParams()
  const laSua = cheDo === 'sua'
  const chiTiet = useQuery({ queryKey: ['khach-hang', 'chi-tiet', maKH], queryFn: () => khachHangApi.chiTiet(maKH), enabled: laSua })
  if (laSua && chiTiet.error) return <p className="thong-bao thong-bao--do">{(chiTiet.error as Error).message}</p>
  if (laSua && !chiTiet.data) return <p className="ghi-chu">Đang tải…</p>
  const banDau = chiTiet.data ? { hoTen: chiTiet.data.hoTen, sdt: chiTiet.data.sdt } : { hoTen: '', sdt: '' }
  return <NoiDungFormKhachHang key={maKH} laSua={laSua} maKH={maKH} banDau={banDau} />
}

function NoiDungFormKhachHang({ laSua, maKH, banDau }: { laSua: boolean; maKH: string; banDau: { hoTen: string; sdt: string } }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { datChuaLuu } = useXacThuc()
  const [form, setForm] = useState(banDau)
  const [loi, setLoi] = useState<Record<string, string>>({})
  const [khachTrung, setKhachTrung] = useState<KhachHangDong | null>(null)
  const [ketQua, setKetQua] = useState<(KetQua & { xong?: boolean }) | null>(null)
  const [dangLuu, setDangLuu] = useState(false)

  const doi = form.hoTen !== banDau.hoTen || form.sdt !== banDau.sdt
  useEffect(() => {
    datChuaLuu(doi)
    return () => datChuaLuu(false)
  }, [doi, datChuaLuu])

  const BAT_BUOC = 'Không được để trống thông tin bắt buộc'
  const luu = async (e: React.FormEvent) => {
    e.preventDefault()
    setKhachTrung(null)
    const loiMay: Record<string, string> = {}
    if (!form.hoTen.trim()) loiMay.hoTen = BAT_BUOC
    if (!form.sdt.trim()) loiMay.sdt = BAT_BUOC
    setLoi(loiMay)
    if (Object.keys(loiMay).length) return

    setDangLuu(true)
    try {
      if (laSua) {
        const kq = await khachHangApi.sua(maKH, form)
        setKetQua({ kieu: 'thanhCong', thongBao: kq.thongBao, nut: 'Đóng', xong: true })
      } else {
        await khachHangApi.them(form)
        setKetQua({ kieu: 'thanhCong', thongBao: 'Thêm khách hàng thành công', nut: 'Kết thúc', xong: true })
      }
      datChuaLuu(false)
      await queryClient.invalidateQueries({ queryKey: ['khach-hang'] })
    } catch (e) {
      if (e instanceof LoiApi && Object.keys(e.loi).length) {
        setLoi(e.loi)
        setKhachTrung((e.duLieu.khachTrung as KhachHangDong | undefined) ?? null)
      } else {
        setKetQua({ kieu: 'loi', thongBao: laSua ? 'Cập nhật không thành công' : 'Không thể lưu khách hàng', nut: laSua ? 'Đóng' : 'Kết thúc' })
      }
    } finally {
      setDangLuu(false)
    }
  }

  return (
    <>
      <h1>{laSua ? 'Sửa thông tin khách hàng' : 'Thêm khách hàng'}</h1>
      {/* Mẫu màn hình Thêm khách hàng: ô nhập kéo hết khung, nút Hủy (trắng) – Lưu (đỏ) bên phải. */}
      <form className="the" onSubmit={luu} noValidate>
        <h2>Thông tin khách hàng</h2>
        {laSua && (
          <label className="truong">
            <span className="truong__nhan">Mã KH</span>
            <input className="truong__o truong__o--chi-doc" readOnly value={maKH} />
          </label>
        )}
        <label className="truong">
          <span className="truong__nhan">
            Họ tên<span className="truong__sao"> *</span>
          </span>
          <input
            className={`truong__o ${loi.hoTen ? 'truong__o--loi' : ''}`}
            placeholder="Nhập họ tên"
            value={form.hoTen}
            onChange={(e) => setForm({ ...form, hoTen: e.target.value })}
          />
          {loi.hoTen && <span className="truong__loi">{loi.hoTen}</span>}
        </label>
        <label className="truong">
          <span className="truong__nhan">
            Số điện thoại<span className="truong__sao"> *</span>
          </span>
          <input
            className={`truong__o ${loi.sdt ? 'truong__o--loi' : ''}`}
            placeholder="Nhập số điện thoại"
            inputMode="numeric"
            value={form.sdt}
            onChange={(e) => setForm({ ...form, sdt: e.target.value })}
          />
          {loi.sdt && <span className="truong__loi">{loi.sdt}</span>}
        </label>
        {khachTrung && (
          <p className="khung-goi-y">
            Khách hàng đang dùng số này: <strong>{khachTrung.hoTen}</strong> · {khachTrung.sdt} ({khachTrung.maKH})
          </p>
        )}
        <div className="hang-nut">
          <button type="button" className="nut" onClick={() => navigate('/quan-ly-khach-hang')}>
            Hủy
          </button>
          <button type="submit" className="nut nut--do" disabled={dangLuu}>
            Lưu
          </button>
        </div>
      </form>

      <ThongBaoKetQua
        ketQua={ketQua}
        onDong={() => {
          const xong = ketQua?.xong
          setKetQua(null)
          if (xong) navigate('/quan-ly-khach-hang')
        }}
      />
    </>
  )
}
