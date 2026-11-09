import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { tonKhoApi } from '../../api/nghiepVu'
import { useXacThuc } from '../../auth/AuthContext'
import { ThongBaoKetQua, type KetQua } from '../../components/ThongBaoKetQua'
import { TruongNhap } from '../../components/TruongNhap'
import { ganLoiServer, homNayISO, so } from '../../lib/dinhDang'

interface Form {
  soLuongThucTe: string
  hanSuDung: string
  lyDo: string
}

const KHONG_TRONG = 'Không được để trống'

/** Màn hình 3.4 – Biểu mẫu điều chỉnh tồn kho một lô (UC_3.3). */
export function DieuChinhLo() {
  const { maLo = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { datChuaLuu } = useXacThuc()
  const [ketQua, setKetQua] = useState<(KetQua & { xong?: boolean }) | null>(null)

  const { data: lo, error } = useQuery({ queryKey: ['ton-kho', 'lo', maLo], queryFn: () => tonKhoApi.layLo(maLo) })
  const form = useForm<Form>({ defaultValues: { soLuongThucTe: '', hanSuDung: '', lyDo: '' } })
  const { errors, isSubmitting, isDirty } = form.formState

  useEffect(() => {
    if (lo) form.reset({ soLuongThucTe: '', hanSuDung: lo.hanSuDung, lyDo: '' })
  }, [lo, form])

  useEffect(() => {
    datChuaLuu(isDirty)
    return () => datChuaLuu(false)
  }, [isDirty, datChuaLuu])

  // BR06: chênh lệch = thực tế − tồn hệ thống, tự tính khi nhập.
  const thucTe = useWatch({ control: form.control, name: 'soLuongThucTe' }) ?? ''
  const soThucTe = /^\d+$/.test(thucTe.trim()) ? Number(thucTe.trim()) : null
  const chenhLech = lo && soThucTe !== null ? soThucTe - lo.soLuongTon : null

  const gui = form.handleSubmit(async (f) => {
    try {
      const kq = await tonKhoApi.dieuChinh(maLo, f)
      datChuaLuu(false)
      await queryClient.invalidateQueries({ queryKey: ['ton-kho'] })
      await queryClient.invalidateQueries({ queryKey: ['canh-bao'] })
      setKetQua({ kieu: 'thanhCong', thongBao: kq.thongBao, xong: true })
    } catch (e) {
      const chung = ganLoiServer(form, e)
      if (chung) setKetQua({ kieu: 'loi', thongBao: chung })
    }
  })

  if (error) return <p className="thong-bao thong-bao--do">{(error as Error).message}</p>
  if (!lo) return <p className="ghi-chu">Đang tải…</p>

  return (
    <>
      <h1>Điều chỉnh tồn kho</h1>
      <form className="the the--vua" onSubmit={gui} noValidate>
        <h2>Thông tin lô hàng</h2>
        {lo.khoaToanBo && (
          <p className="khung-loi">Lô hàng đã có cảnh báo hết hạn, không được điều chỉnh bất cứ thông tin nào.</p>
        )}
        <div className="luoi-2">
          {(
            [
              ['Mã lô', lo.maLo],
              ['Mã hàng', lo.maHH],
              ['Tên hàng', lo.tenHH],
              ['Đơn vị tính', lo.donViTinh],
              ['Số lượng tồn', so(lo.soLuongTon)],
              ['Chênh lệch', chenhLech === null ? '—' : chenhLech > 0 ? `+${chenhLech}` : String(chenhLech)],
            ] as const
          ).map(([nhan, giaTri]) => (
            <div className="truong" key={nhan}>
              <span className="truong__nhan">{nhan}</span>
              <input
                className={`truong__o truong__o--chi-doc ${nhan === 'Chênh lệch' && chenhLech ? 'chu-do' : ''}`}
                readOnly
                value={giaTri}
                aria-label={nhan}
              />
            </div>
          ))}
          <TruongNhap
            nhan="Số lượng thực tế"
            batBuoc
            inputMode="numeric"
            placeholder="Nhập số lượng thực tế"
            disabled={lo.khoaToanBo}
            loi={errors.soLuongThucTe?.message}
            {...form.register('soLuongThucTe', { validate: (v) => v.trim().length > 0 || KHONG_TRONG })}
          />
          <TruongNhap
            nhan="Hạn sử dụng"
            type="date"
            min={homNayISO()}
            disabled={lo.khoaToanBo || lo.khoaHanSuDung}
            loi={errors.hanSuDung?.message}
            {...form.register('hanSuDung')}
          />
        </div>
        {lo.khoaHanSuDung && !lo.khoaToanBo && (
          <p className="ghi-chu">Lô đang có cảnh báo sắp hết hạn nên không được sửa hạn sử dụng (UC_3.3 BR05).</p>
        )}
        <TruongNhap
          nhan="Lý do điều chỉnh"
          batBuoc
          placeholder="Nhập lý do điều chỉnh"
          disabled={lo.khoaToanBo}
          loi={errors.lyDo?.message}
          {...form.register('lyDo', { validate: (v) => v.trim().length > 0 || KHONG_TRONG })}
        />

        <div className="hang-nut">
          <button type="button" className="nut" onClick={() => navigate('/quan-ly-ton-kho/dieu-chinh')}>
            Hủy
          </button>
          <button type="submit" className="nut nut--chinh" disabled={isSubmitting || lo.khoaToanBo}>
            Lưu
          </button>
        </div>
      </form>

      <ThongBaoKetQua
        ketQua={ketQua}
        onDong={() => {
          const xong = ketQua?.xong
          setKetQua(null)
          if (xong) navigate('/quan-ly-ton-kho/dieu-chinh')
        }}
      />
    </>
  )
}
