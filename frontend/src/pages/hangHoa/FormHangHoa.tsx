import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { hangHoaApi, type FormHangHoa } from '../../api/nghiepVu'
import { useXacThuc } from '../../auth/AuthContext'
import { ThongBaoKetQua, type KetQua } from '../../components/ThongBaoKetQua'
import { TruongNhap } from '../../components/TruongNhap'
import { ganLoiServer } from '../../lib/dinhDang'

const KHONG_TRONG = 'Không được để trống!'
const batBuoc = { validate: (v?: string) => (v ?? '').trim().length > 0 || KHONG_TRONG }
const RONG: FormHangHoa = {
  tenHH: '', maVach: '', maDM: '', donViTinh: '', giaNhap: '', giaBan: '', nguongCanhBaoHetHang: '', nguongCanhBaoHetHan: '',
}

/** Màn hình 4.1 Thêm hàng hóa (UC_4.1) và 4.4 Sửa hàng hóa (UC_4.2). */
export function FormHangHoaTrang({ cheDo }: { cheDo: 'them' | 'sua' }) {
  const { maHH = '' } = useParams()
  const laSua = cheDo === 'sua'
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { datChuaLuu } = useXacThuc()
  const [ketQua, setKetQua] = useState<(KetQua & { den?: string }) | null>(null)

  const danhMuc = useQuery({ queryKey: ['danh-muc'], queryFn: hangHoaApi.danhMuc, staleTime: Infinity })
  const donViTinh = useQuery({ queryKey: ['don-vi-tinh'], queryFn: hangHoaApi.donViTinh, staleTime: Infinity })
  // Q16: mã dự kiến hiển thị khi mở biểu mẫu; mã thật chỉ chốt khi lưu thành công.
  const maDuKien = useQuery({ queryKey: ['hang-hoa', 'ma-du-kien'], queryFn: hangHoaApi.maDuKien, enabled: !laSua, gcTime: 0 })
  const chiTiet = useQuery({ queryKey: ['hang-hoa', 'chi-tiet', maHH], queryFn: () => hangHoaApi.chiTiet(maHH), enabled: laSua })

  const form = useForm<FormHangHoa>({ defaultValues: RONG })
  const { errors, isSubmitting, isDirty } = form.formState

  useEffect(() => {
    const d = chiTiet.data
    if (!d) return
    form.reset({
      tenHH: d.tenHH, maVach: d.maVach ?? '', maDM: d.maDM, donViTinh: d.donViTinh,
      giaNhap: String(d.giaNhap), giaBan: String(d.giaBan),
      nguongCanhBaoHetHang: d.nguongCanhBaoHetHang?.toString() ?? '',
      nguongCanhBaoHetHan: d.nguongCanhBaoHetHan?.toString() ?? '',
    })
  }, [chiTiet.data, form])

  useEffect(() => {
    datChuaLuu(isDirty)
    return () => datChuaLuu(false)
  }, [isDirty, datChuaLuu])

  const gui = form.handleSubmit(async (f) => {
    try {
      if (laSua) {
        const kq = await hangHoaApi.sua(maHH, f)
        datChuaLuu(false)
        setKetQua({ kieu: 'thanhCong', thongBao: kq.thongBao, nut: 'Đóng', den: `/quan-ly-hang-hoa/${maHH}` })
      } else {
        const kq = await hangHoaApi.them(f)
        datChuaLuu(false)
        setKetQua({ kieu: 'thanhCong', thongBao: `Thêm hàng hóa thành công (mã ${kq.ma})`, nut: 'Kết thúc', den: '/quan-ly-hang-hoa' })
      }
      await queryClient.invalidateQueries({ queryKey: ['hang-hoa'] })
    } catch (e) {
      const chung = ganLoiServer(form, e)
      if (chung) setKetQua({ kieu: 'loi', thongBao: chung })
    }
  })

  if (laSua && chiTiet.error) return <p className="thong-bao thong-bao--do">{(chiTiet.error as Error).message}</p>
  // Chỉ hiện form khi droplist đã có dữ liệu, để giá trị đang chọn hiển thị đúng.
  if (!danhMuc.data || !donViTinh.data || (laSua && !chiTiet.data)) return <p className="ghi-chu">Đang tải…</p>

  return (
    <>
      <h1>{laSua ? 'Sửa hàng hóa' : 'Thêm hàng hóa'}</h1>
      <form className="the the--vua" onSubmit={gui} noValidate>
        <h2>Thông tin hàng hóa</h2>
        <div className="luoi-2">
          <div className="truong">
            <span className="truong__nhan">Mã hàng hóa</span>
            <input className="truong__o truong__o--chi-doc" readOnly value={laSua ? maHH : (maDuKien.data?.ma ?? '…')} aria-label="Mã hàng hóa" />
          </div>
          <TruongNhap nhan="Tên hàng hóa" batBuoc placeholder="Nhập tên hàng hóa" loi={errors.tenHH?.message} {...form.register('tenHH', batBuoc)} />

          <div className="truong">
            <label className="truong__nhan" htmlFor="maDM">Danh mục<span className="truong__sao"> *</span></label>
            <select id="maDM" className={`truong__o ${errors.maDM ? 'truong__o--loi' : ''}`} {...form.register('maDM', batBuoc)}>
              <option value="">— Chọn danh mục —</option>
              {danhMuc.data?.map((d) => (
                <option key={d.maDM} value={d.maDM}>{d.tenDM}</option>
              ))}
            </select>
            {errors.maDM && <p className="truong__loi" role="alert">{errors.maDM.message}</p>}
          </div>
          <div className="truong">
            <label className="truong__nhan" htmlFor="donViTinh">Đơn vị tính<span className="truong__sao"> *</span></label>
            <select id="donViTinh" className={`truong__o ${errors.donViTinh ? 'truong__o--loi' : ''}`} {...form.register('donViTinh', batBuoc)}>
              <option value="">— Chọn đơn vị tính —</option>
              {donViTinh.data?.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            {errors.donViTinh && <p className="truong__loi" role="alert">{errors.donViTinh.message}</p>}
          </div>

          <TruongNhap nhan="Giá nhập (đ)" batBuoc inputMode="numeric" placeholder="Ví dụ: 45000" loi={errors.giaNhap?.message} {...form.register('giaNhap', batBuoc)} />
          <TruongNhap nhan="Giá bán (đ)" batBuoc inputMode="numeric" placeholder="Ví dụ: 55000" loi={errors.giaBan?.message} {...form.register('giaBan', batBuoc)} />
          <TruongNhap nhan="Ngưỡng cảnh báo hết hàng" inputMode="numeric" placeholder="Số lượng, ví dụ: 5" loi={errors.nguongCanhBaoHetHang?.message} {...form.register('nguongCanhBaoHetHang')} />
          <TruongNhap nhan="Ngưỡng cảnh báo hết hạn (ngày)" inputMode="numeric" placeholder="Số ngày, ví dụ: 10" loi={errors.nguongCanhBaoHetHan?.message} {...form.register('nguongCanhBaoHetHan')} />
          <TruongNhap nhan="Mã vạch" placeholder="Quét hoặc nhập mã vạch (không bắt buộc)" loi={errors.maVach?.message} {...form.register('maVach')} />
        </div>
        <p className="ghi-chu">Để trống ngưỡng cảnh báo nếu không cần cảnh báo cho mặt hàng này.</p>

        <div className="hang-nut">
          <button type="button" className="nut" onClick={() => navigate(laSua ? `/quan-ly-hang-hoa/${maHH}` : '/quan-ly-hang-hoa')}>
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
          const den = ketQua?.den
          setKetQua(null)
          if (den) navigate(den)
        }}
      />
    </>
  )
}
