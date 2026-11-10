import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { LoiApi } from '../../api/client'
import { congNoApi, type FormKhachQuen as DuLieuKhachQuen } from '../../api/nghiepVu'
import { useXacThuc } from '../../auth/AuthContext'
import { HopThoai } from '../../components/HopThoai'
import { ThongBaoKetQua, type KetQua } from '../../components/ThongBaoKetQua'
import { ngay, tien } from '../../lib/dinhDang'

const TRANG_THAI_NO =['Còn hạn', 'Sắp hết hạn', 'Quá hạn', 'Không nợ'] as const

const MAU_NO: Record<string, string> = {
  'Còn hạn': 'xanh',
  'Sắp hết hạn': 'cam',
  'Quá hạn': 'do',
  'Không nợ': 'xam',
}

export function NhanTrangThaiNo({ trangThai }: { trangThai: string }) {
  return <span className={`nhan nhan--${MAU_NO[trangThai] ?? 'xam'}`}>{trangThai}</span>
}

// ====================================================================== 7.1.1–7.1.3 Tìm kiếm khách quen (UC_7.2)

export function TimKiemKhachQuen() {
  const navigate = useNavigate()
  const { nguoiDung } = useXacThuc()
  const [oTim, setOTim] = useState('')
  const [tuKhoa, setTuKhoa] = useState('')
  const [trangThai, setTrangThai] = useState('')

  const { data, error, isFetching } = useQuery({
    queryKey: ['khach-quen', tuKhoa, trangThai],
    queryFn: () => congNoApi.timKhachQuen(tuKhoa, trangThai),
    retry: false,
  })
  const loi = error instanceof LoiApi ? (error.loi.tuKhoa ?? error.message) : error ? 'Tìm kiếm không thành công' : null

  return (
    <>
      <h1>Tìm kiếm khách quen</h1>
      <section className="the the--rong">
        <div className="thanh-cong-cu">
          <form
            className="o-tim"
            onSubmit={(e) => {
              e.preventDefault()
              setTuKhoa(oTim.trim())
            }}
          >
            <input
              className={`truong__o ${loi ? 'truong__o--loi' : ''}`}
              placeholder="Nhập tên / số điện thoại để tìm kiếm"
              value={oTim}
              onChange={(e) => setOTim(e.target.value)}
              aria-label="Tên hoặc số điện thoại khách quen"
            />
            <button type="submit" className="nut">
              Tìm kiếm
            </button>
          </form>
          {nguoiDung?.vaiTro === 'ChuQuan' && (
            <button type="button" className="nut nut--chinh" onClick={() => navigate('/quan-ly-cong-no/them')}>
              Thêm khách quen
            </button>
          )}
        </div>

        {/* Bộ lọc trạng thái: bấm lại tab đang chọn để bỏ lọc. */}
        <div className="tab" role="tablist" aria-label="Lọc theo trạng thái nợ">
          {TRANG_THAI_NO.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={trangThai === t}
              className={`nut nut--nho ${trangThai === t ? 'nut--chinh' : ''}`}
              onClick={() => setTrangThai(trangThai === t ? '' : t)}
            >
              {t}
            </button>
          ))}
        </div>

        {loi && <p className="thong-bao thong-bao--do">{loi}</p>}
        {data && !loi && (
          <>
            <p className="ghi-chu">
              {data.length} khách quen{trangThai ? ` · ${trangThai}` : ''}
            </p>
            {data.length === 0 ? (
              <p className="thong-bao thong-bao--do">
                {tuKhoa || trangThai ? 'Không tìm thấy thông tin khách quen phù hợp!' : 'Hiện chưa có khách quen nào.'}
              </p>
            ) : (
              <div className={`bang-cuon ${isFetching ? 'dang-tai-mo' : ''}`}>
                <table className="bang">
                  <thead>
                    <tr>
                      <th>Tên khách hàng</th>
                      <th>SĐT</th>
                      <th>Trạng thái</th>
                      <th>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((k) => (
                      <tr key={k.maKH}>
                        <td>
                          {k.hoTen}
                          <br />
                          <span className="ghi-chu">{k.maKH}</span>
                        </td>
                        <td>{k.sdt}</td>
                        <td>
                          <NhanTrangThaiNo trangThai={k.trangThaiNo} />
                        </td>
                        <td>
                          <button type="button" className="nut nut--nho" onClick={() => navigate(`/quan-ly-cong-no/khach-quen/${k.maKH}`)}>
                            Xem
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>
    </>
  )
}

// ====================================================================== 7.1.4 Chi tiết khách quen + 7.5 Xóa (UC_7.6)

export function ChiTietKhachQuenTrang() {
  const { maKH = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { nguoiDung } = useXacThuc()
  const laChuQuan = nguoiDung?.vaiTro === 'ChuQuan'
  const [xacNhanXoa, setXacNhanXoa] = useState(false)
  const [ketQua, setKetQua] = useState<(KetQua & { daXoa?: boolean }) | null>(null)
  const [dangXoa, setDangXoa] = useState(false)

  const { data, error } = useQuery({ queryKey: ['khach-quen', 'chi-tiet', maKH], queryFn: () => congNoApi.chiTiet(maKH) })
  if (error) return <p className="thong-bao thong-bao--do">{(error as Error).message}</p>
  if (!data) return <p className="ghi-chu">Đang tải…</p>

  const xoa = async () => {
    setXacNhanXoa(false)
    setDangXoa(true)
    try {
      const kq = await congNoApi.xoa(maKH)
      setKetQua({ kieu: 'thanhCong', thongBao: kq.thongBao, nut: 'Kết thúc', daXoa: true })
      await queryClient.invalidateQueries({ queryKey: ['khach-quen'] })
    } catch (e) {
      setKetQua({ kieu: 'loi', thongBao: e instanceof LoiApi ? e.message : 'Không thể xóa khách quen.', nut: 'Kết thúc' })
    } finally {
      setDangXoa(false)
    }
  }

  return (
    <>
      <h1>Chi tiết khách quen</h1>
      <section className="the the--vua">
        <dl className="thong-tin">
          <dt>Mã KH</dt>
          <dd>{data.maKH}</dd>
          <dt>Tên khách hàng</dt>
          <dd>{data.hoTen}</dd>
          <dt>SĐT</dt>
          <dd>{data.sdt}</dd>
          <dt>CCCD</dt>
          <dd>{data.cccd}</dd>
          <dt>Địa chỉ</dt>
          <dd>{data.diaChi}</dd>
          <dt>Trạng thái</dt>
          <dd>
            <NhanTrangThaiNo trangThai={data.trangThaiNo} />
            {!data.quyenMuaNo && <span className="nhan nhan--do">Bị khóa quyền mua nợ</span>}
          </dd>
          <dt>Tổng dư nợ</dt>
          <dd className="so-lon">{tien(data.duNo)}</dd>
          <dt>Hạn thanh toán khoản nợ cũ nhất</dt>
          <dd>{data.hanThanhToanCuNhat ? ngay(data.hanThanhToanCuNhat) : '—'}</dd>
        </dl>

        <h2>Hóa đơn nợ chưa thanh toán</h2>
        {data.hoaDonChuaTra.length === 0 ? (
          <p className="ghi-chu">Khách quen không có hóa đơn nợ chưa thanh toán.</p>
        ) : (
          <div className="bang-cuon">
            <table className="bang">
              <thead>
                <tr>
                  <th>Mã hóa đơn nợ</th>
                  <th className="so">Số tiền</th>
                  <th>Hạn thanh toán</th>
                </tr>
              </thead>
              <tbody>
                {data.hoaDonChuaTra.map((h) => (
                  <tr key={h.maHD}>
                    <td>{h.maHD}</td>
                    <td className="so">{tien(h.soTien)}</td>
                    <td>{ngay(h.hanThanhToan)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="hang-nut">
          <button type="button" className="nut" onClick={() => navigate('/quan-ly-cong-no/tim-kiem')}>
            Quay lại danh sách
          </button>
          {laChuQuan && (
            <>
              <button type="button" className="nut" onClick={() => navigate(`/quan-ly-cong-no/khach-quen/${maKH}/sua`)}>
                Sửa khách quen
              </button>
              <button type="button" className="nut nut--nguy-hiem" disabled={dangXoa} onClick={() => setXacNhanXoa(true)}>
                Xóa khách quen
              </button>
            </>
          )}
        </div>
      </section>

      {/* 7.5.2 Xác nhận xóa */}
      <HopThoai
        mo={xacNhanXoa}
        tieuDe="Xác nhận xóa khách quen"
        onDong={() => setXacNhanXoa(false)}
        nut={
          <>
            <button type="button" className="nut" onClick={() => setXacNhanXoa(false)}>
              Hủy
            </button>
            <button type="button" className="nut nut--nguy-hiem-dac" onClick={xoa}>
              Xác nhận
            </button>
          </>
        }
      >
        <p>
          Xóa khách quen <strong>{data.hoTen}</strong> ({data.maKH})? Lịch sử hóa đơn nợ và phiếu thanh toán vẫn được giữ lại.
        </p>
      </HopThoai>

      {/* 7.5.1 / 7.5.3 */}
      <ThongBaoKetQua
        ketQua={ketQua}
        onDong={() => {
          const daXoa = ketQua?.daXoa
          setKetQua(null)
          if (daXoa) navigate('/quan-ly-cong-no/tim-kiem')
        }}
      />
    </>
  )
}

// ====================================================================== 7.3 Sửa (UC_7.4) và 7.4 Thêm khách quen (UC_7.5)

const RONG: DuLieuKhachQuen = { hoTen: '', sdt: '', cccd: '', diaChi: '' }

export function FormKhachQuenTrang({ cheDo }: { cheDo: 'them' | 'sua' }) {
  const { maKH = '' } = useParams()
  const laSua = cheDo === 'sua'
  const chiTiet = useQuery({ queryKey: ['khach-quen', 'chi-tiet', maKH], queryFn: () => congNoApi.chiTiet(maKH), enabled: laSua })
  if (laSua && chiTiet.error) return <p className="thong-bao thong-bao--do">{(chiTiet.error as Error).message}</p>
  if (laSua && !chiTiet.data) return <p className="ghi-chu">Đang tải…</p>
  const d = chiTiet.data
  const banDau = d ? { hoTen: d.hoTen, sdt: d.sdt, cccd: d.cccd, diaChi: d.diaChi } : RONG
  return <NoiDungFormKhachQuen key={maKH || 'moi'} laSua={laSua} maKH={maKH} banDau={banDau} />
}

function NoiDungFormKhachQuen({ laSua, maKH, banDau }: { laSua: boolean; maKH: string; banDau: DuLieuKhachQuen }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { datChuaLuu } = useXacThuc()
  const [form, setForm] = useState(banDau)
  const [goc, setGoc] = useState(banDau)
  const [loi, setLoi] = useState<Record<string, string>>({})
  const [ketQua, setKetQua] = useState<(KetQua & { xong?: boolean }) | null>(null)
  const [dangLuu, setDangLuu] = useState(false)

  const doi = (Object.keys(form) as (keyof DuLieuKhachQuen)[]).some((k) => form[k] !== goc[k])
  useEffect(() => {
    datChuaLuu(doi)
    return () => datChuaLuu(false)
  }, [doi, datChuaLuu])

  const quayVe = laSua ? `/quan-ly-cong-no/khach-quen/${maKH}` : '/quan-ly-cong-no/tim-kiem'

  const luu = async (e: React.FormEvent) => {
    e.preventDefault()
    const loiMay: Record<string, string> = {}
    for (const k of Object.keys(form) as (keyof DuLieuKhachQuen)[]) if (!form[k].trim()) loiMay[k] = 'Không được để trống!'
    setLoi(loiMay)
    if (Object.keys(loiMay).length) return

    setDangLuu(true)
    try {
      if (laSua) {
        const kq = await congNoApi.sua(maKH, form)
        setKetQua({ kieu: 'thanhCong', thongBao: kq.thongBao, nut: 'Kết thúc', xong: true })
        setGoc(form)
      } else {
        await congNoApi.them(form)
        setKetQua({ kieu: 'thanhCong', thongBao: 'Thêm khách quen thành công!', nut: 'Kết thúc', xong: true })
        // 7.4.3: "Kết thúc" quay về màn hình Thêm khách quen – làm trống biểu mẫu.
        setForm(RONG)
        setGoc(RONG)
      }
      datChuaLuu(false)
      await queryClient.invalidateQueries({ queryKey: ['khach-quen'] })
      await queryClient.invalidateQueries({ queryKey: ['khach-hang'] })
    } catch (e) {
      if (e instanceof LoiApi && Object.keys(e.loi).length) setLoi(e.loi)
      else
        setKetQua({
          kieu: 'loi',
          thongBao: e instanceof LoiApi ? e.message : laSua ? 'Cập nhật không thành công' : 'Không thể lưu khách quen.',
          nut: 'Đóng',
        })
    } finally {
      setDangLuu(false)
    }
  }

  const truong = (k: keyof DuLieuKhachQuen, nhan: string, goiY: string, them?: React.InputHTMLAttributes<HTMLInputElement>) => (
    <label className="truong">
      <span className="truong__nhan">
        {nhan}
        <span className="truong__sao"> *</span>
      </span>
      <input
        className={`truong__o ${loi[k] ? 'truong__o--loi' : ''}`}
        placeholder={goiY}
        value={form[k]}
        onChange={(e) => setForm({ ...form, [k]: e.target.value })}
        {...them}
      />
      {loi[k] && <span className="truong__loi">{loi[k]}</span>}
    </label>
  )

  return (
    <>
      <h1>{laSua ? 'Sửa thông tin khách quen' : 'Thêm khách quen'}</h1>
      <div className="luoi-form">
        <form className="the" onSubmit={luu} noValidate>
          <h2>Thông tin khách quen</h2>
          <label className="truong">
            <span className="truong__nhan">Mã KH</span>
            <input className="truong__o" disabled value={laSua ? maKH : 'Tự động tạo khi lưu'} />
          </label>
          {truong('hoTen', 'Họ tên', 'Nhập họ tên')}
          {truong('sdt', 'Số điện thoại', 'Nhập số điện thoại', { inputMode: 'numeric' })}
          {truong('cccd', 'CCCD', 'Nhập CCCD', { inputMode: 'numeric' })}
          {truong('diaChi', 'Địa chỉ', 'Nhập địa chỉ')}
          <div className="hang-nut">
            <button type="button" className="nut" onClick={() => navigate(quayVe)}>
              Hủy
            </button>
            <button type="submit" className="nut nut--chinh" disabled={dangLuu}>
              Lưu
            </button>
          </div>
        </form>
        {/* "4 quy tắc kiểm tra" – nội dung lấy từ UC_7.4 / UC_7.5 BR. */}
        <aside className="the">
          <h2>Quy tắc kiểm tra</h2>
          <ol className="quy-tac">
            <li>Họ tên: bắt buộc, chỉ gồm chữ cái và khoảng trắng, tối đa 50 ký tự.</li>
            <li>Số điện thoại: bắt buộc, đúng 10 chữ số, bắt đầu bằng 0, không trùng khách đang hoạt động.</li>
            <li>CCCD: bắt buộc, đúng 12 chữ số, không trùng khách quen đang hoạt động.</li>
            <li>Địa chỉ: bắt buộc, tối đa 200 ký tự.</li>
          </ol>
        </aside>
      </div>

      <ThongBaoKetQua
        ketQua={ketQua}
        onDong={() => {
          const xong = ketQua?.xong
          setKetQua(null)
          if (xong && laSua) navigate(quayVe)
        }}
      />
    </>
  )
}
