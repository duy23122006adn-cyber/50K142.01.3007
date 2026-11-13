import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { hangHoaApi, loHangApi } from '../../api/nghiepVu'
import { useXacThuc } from '../../auth/AuthContext'
import { PhanTrang } from '../../components/PhanTrang'
import { ThongBaoKetQua, type KetQua } from '../../components/ThongBaoKetQua'
import { TruongNhap } from '../../components/TruongNhap'
import { ganLoiServer, homNayISO, ngay, so } from '../../lib/dinhDang'

/** Màn hình 10.1 – Danh sách lô hàng. */
export function DanhSachLoHang() {
  const [trang, setTrang] = useState(1)
  const { data, isFetching } = useQuery({
    queryKey: ['lo-hang', trang],
    queryFn: () => loHangApi.danhSach(trang),
    placeholderData: keepPreviousData,
  })

  return (
    <>
      <h1>Danh sách lô hàng</h1>
      <section className="the the--rong">
        <div className="thanh-cong-cu">
          <span />
          <Link to="/quan-ly-lo-hang/them" className="nut nut--chinh">
            Thêm lô hàng
          </Link>
        </div>
        {data && <h2 className="tieu-de-bang">Danh sách lô hàng · {data.tongSo} lô hàng</h2>}
        {data && data.tongSo === 0 && <p className="ghi-chu">Chưa có lô hàng nào.</p>}
        {data && data.tongSo > 0 && (
          <div className={`bang-cuon ${isFetching ? 'dang-tai-mo' : ''}`}>
            <table className="bang">
              <thead>
                <tr>
                  <th>Mã lô</th>
                  <th>Tên hàng</th>
                  <th className="so">Số lượng</th>
                  <th>Hạn sử dụng</th>
                </tr>
              </thead>
              <tbody>
                {data.danhSach.map((l) => (
                  <tr key={l.maLo}>
                    <td>{l.maLo}</td>
                    <td>{l.tenHH}</td>
                    <td className="so">{so(l.soLuongTon)}</td>
                    <td>{ngay(l.hanSuDung)}</td>
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

interface Form {
  tenHangHoa: string
  soLuong: string
  hanSuDung: string
}

const KHONG_TRONG = 'Không được để trống!'
const batBuoc = { validate: (v: string) => v.trim().length > 0 || KHONG_TRONG }

/** Màn hình 10.2 – Thêm lô hàng (UC_10.1). */
export function ThemLoHang() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { datChuaLuu } = useXacThuc()
  const [ketQua, setKetQua] = useState<(KetQua & { xong?: boolean }) | null>(null)

  // BR08 + Q16: hiển thị mã lô dự kiến; mã thật chỉ chốt khi lưu.
  const maDuKien = useQuery({ queryKey: ['lo-hang', 'ma-du-kien'], queryFn: loHangApi.maDuKien, gcTime: 0 })
  const form = useForm<Form>({ defaultValues: { tenHangHoa: '', soLuong: '', hanSuDung: '' } })
  const { errors, isSubmitting, isDirty } = form.formState

  const tenDangNhap = useWatch({ control: form.control, name: 'tenHangHoa' })
  const goiY = useQuery({
    queryKey: ['hang-hoa', 'goi-y', tenDangNhap.trim()],
    queryFn: () => hangHoaApi.goiY(tenDangNhap.trim()),
    enabled: tenDangNhap.trim().length >= 1,
    placeholderData: keepPreviousData,
  })

  useEffect(() => {
    datChuaLuu(isDirty)
    return () => datChuaLuu(false)
  }, [isDirty, datChuaLuu])

  const gui = form.handleSubmit(async (f) => {
    try {
      const kq = await loHangApi.them(f)
      datChuaLuu(false)
      await queryClient.invalidateQueries({ queryKey: ['lo-hang'] })
      await queryClient.invalidateQueries({ queryKey: ['ton-kho'] })
      await queryClient.invalidateQueries({ queryKey: ['canh-bao'] })
      setKetQua({ kieu: 'thanhCong', thongBao: `Thêm lô hàng thành công (mã ${kq.ma})`, xong: true })
    } catch (e) {
      const chung = ganLoiServer(form, e)
      if (chung) setKetQua({ kieu: 'loi', thongBao: chung })
    }
  })

  return (
    <>
      <h1>Thêm lô hàng</h1>
      <form className="the the--vua" onSubmit={gui} noValidate>
        <div className="truong">
          <span className="truong__nhan">Mã lô</span>
          <input className="truong__o truong__o--chi-doc" readOnly value={maDuKien.data?.ma ?? '…'} aria-label="Mã lô" />
        </div>
        <TruongNhap
          nhan="Tên hàng hóa"
          batBuoc
          placeholder="Nhập tên hàng hóa"
          list="goi-y-hang-hoa"
          autoComplete="off"
          loi={errors.tenHangHoa?.message}
          {...form.register('tenHangHoa', batBuoc)}
        />
        <datalist id="goi-y-hang-hoa">
          {goiY.data?.map((h) => (
            <option key={h.maHH} value={h.tenHH}>
              {h.maHH} · {h.donViTinh}
            </option>
          ))}
        </datalist>
        <div className="luoi-2">
          <TruongNhap nhan="Số lượng" batBuoc inputMode="numeric" placeholder="Nhập số lượng" loi={errors.soLuong?.message} {...form.register('soLuong', batBuoc)} />
          <TruongNhap nhan="Hạn sử dụng" batBuoc type="date" min={homNayISO()} loi={errors.hanSuDung?.message} {...form.register('hanSuDung', batBuoc)} />
        </div>
        <div className="hang-nut">
          <button type="button" className="nut" onClick={() => navigate('/quan-ly-lo-hang')}>
            Hủy
          </button>
          <button type="submit" className="nut nut--chinh" disabled={isSubmitting}>
            Lưu
          </button>
        </div>
      </form>

      <ThongBaoKetQua
        ketQua={ketQua}
        onDong={() => {
          const xong = ketQua?.xong
          setKetQua(null)
          if (xong) navigate('/quan-ly-lo-hang')
        }}
      />
    </>
  )
}
