import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { nhanVienApi, type FormNhanVien } from '../../api/nghiepVu'
import { useXacThuc } from '../../auth/AuthContext'
import { ThongBaoKetQua, type KetQua } from '../../components/ThongBaoKetQua'
import { TruongNhap } from '../../components/TruongNhap'
import { ganLoiServer, ngayGio } from '../../lib/dinhDang'

const BAT_BUOC = 'Vui lòng nhập đầy đủ thông tin bắt buộc'
const batBuoc = { validate: (v?: string) => (v ?? '').trim().length > 0 || BAT_BUOC }

/** Màn hình 2.2 Thêm tài khoản (UC_2.1) và 2.3 Sửa thông tin nhân viên (UC_2.2). */
export function FormNhanVienTrang({ cheDo }: { cheDo: 'them' | 'sua' }) {
  const { maND = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { datChuaLuu } = useXacThuc()
  const [ketQua, setKetQua] = useState<(KetQua & { veDanhSach?: boolean }) | null>(null)
  const laSua = cheDo === 'sua'

  const chiTiet = useQuery({
    queryKey: ['nhan-vien', 'chi-tiet', maND],
    queryFn: () => nhanVienApi.chiTiet(maND),
    enabled: laSua,
  })

  const form = useForm<FormNhanVien>({
    defaultValues: { hoTen: '', ngaySinh: '', sdt: '', email: '', tenDangNhap: '', matKhau: '' },
  })
  const { errors, isSubmitting, isDirty } = form.formState

  useEffect(() => {
    if (chiTiet.data) {
      const d = chiTiet.data
      form.reset({ hoTen: d.hoTen, ngaySinh: d.ngaySinh, sdt: d.sdt, email: d.email })
    }
  }, [chiTiet.data, form])

  useEffect(() => {
    datChuaLuu(isDirty)
    return () => datChuaLuu(false)
  }, [isDirty, datChuaLuu])

  const gui = form.handleSubmit(async (f) => {
    try {
      if (laSua) {
        const kq = await nhanVienApi.sua(maND, f)
        await queryClient.invalidateQueries({ queryKey: ['nhan-vien'] })
        datChuaLuu(false)
        setKetQua({ kieu: 'thanhCong', thongBao: kq.thongBao, nut: 'Đóng', veDanhSach: true })
      } else {
        await nhanVienApi.them(f)
        await queryClient.invalidateQueries({ queryKey: ['nhan-vien'] })
        datChuaLuu(false)
        setKetQua({ kieu: 'thanhCong', thongBao: 'Thêm tài khoản thành công', nut: 'Kết thúc', veDanhSach: true })
      }
    } catch (e) {
      const chung = ganLoiServer(form, e)
      if (chung) setKetQua({ kieu: 'loi', thongBao: chung, nut: laSua ? 'Đóng' : 'Thêm tài khoản lại' })
    }
  })

  if (laSua && chiTiet.isLoading) return <p className="ghi-chu">Đang tải…</p>
  if (laSua && chiTiet.error) return <p className="thong-bao thong-bao--do">{(chiTiet.error as Error).message}</p>

  return (
    <>
      <h1>{laSua ? 'Sửa thông tin nhân viên' : 'Thêm tài khoản nhân viên'}</h1>
      <form className="the the--vua" onSubmit={gui} noValidate>
        <h2>Thông tin nhân viên</h2>

        {laSua && chiTiet.data && (
          <dl className="thong-tin thong-tin--chi-doc">
            <dt>Mã nhân viên</dt>
            <dd>{chiTiet.data.maND}</dd>
            <dt>Tên đăng nhập</dt>
            <dd>{chiTiet.data.tenDangNhap}</dd>
            <dt>Trạng thái</dt>
            <dd>{chiTiet.data.trangThai}</dd>
          </dl>
        )}

        <div className="luoi-2">
          <TruongNhap nhan="Họ và tên" batBuoc placeholder="Nhập họ và tên" loi={errors.hoTen?.message} {...form.register('hoTen', batBuoc)} />
          <TruongNhap nhan="Ngày sinh" batBuoc type="date" loi={errors.ngaySinh?.message} {...form.register('ngaySinh', batBuoc)} />
          <TruongNhap nhan="Số điện thoại" batBuoc placeholder="Nhập số điện thoại" inputMode="numeric" loi={errors.sdt?.message} {...form.register('sdt', batBuoc)} />
          <TruongNhap nhan="Email" batBuoc type="email" placeholder="Nhập email" loi={errors.email?.message} {...form.register('email', batBuoc)} />
          {!laSua && (
            <>
              <TruongNhap
                nhan="Tên đăng nhập"
                batBuoc
                placeholder="Nhập tên đăng nhập"
                autoComplete="off"
                loi={errors.tenDangNhap?.message}
                {...form.register('tenDangNhap', batBuoc)}
              />
              <TruongNhap
                nhan="Mật khẩu"
                batBuoc
                type="password"
                placeholder="Nhập mật khẩu"
                autoComplete="new-password"
                loi={errors.matKhau?.message}
                {...form.register('matKhau', batBuoc)}
              />
            </>
          )}
        </div>
        {!laSua && <p className="ghi-chu">Tên đăng nhập 4–20 ký tự (chữ không dấu, số, dấu _). Mật khẩu tối thiểu 8 ký tự, gồm cả chữ và số.</p>}

        <div className="hang-nut">
          <button type="button" className="nut" onClick={() => navigate('/quan-ly-tai-khoan')}>
            Hủy
          </button>
          <button type="submit" className="nut nut--chinh" disabled={isSubmitting}>
            Lưu
          </button>
        </div>
      </form>

      {laSua && chiTiet.data && (
        <section className="the the--vua">
          <h2>Lịch sử chỉnh sửa</h2>
          {chiTiet.data.lichSu.length === 0 ? (
            <p className="ghi-chu">Chưa có lịch sử chỉnh sửa</p>
          ) : (
            <div className="bang-cuon">
              <table className="bang">
                <thead>
                  <tr>
                    <th>Người thực hiện</th>
                    <th>Thời điểm chỉnh sửa</th>
                    <th>Nội dung trước sửa</th>
                    <th>Nội dung sau sửa</th>
                  </tr>
                </thead>
                <tbody>
                  {chiTiet.data.lichSu.map((ls, i) => (
                    <tr key={i}>
                      <td>
                        {ls.maCQ}
                        <br />
                        <small className="ghi-chu">{ls.vaiTro}</small>
                      </td>
                      <td>{ngayGio(ls.thoiDiemSua)}</td>
                      <td className="xuong-dong">{ls.noiDungTruoc}</td>
                      <td className="xuong-dong">{ls.noiDungSau}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <ThongBaoKetQua
        ketQua={ketQua}
        onDong={() => {
          const ve = ketQua?.veDanhSach
          setKetQua(null)
          if (ve) navigate('/quan-ly-tai-khoan')
        }}
      />
    </>
  )
}
