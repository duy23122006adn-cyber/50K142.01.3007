import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { nhanVienApi, type FormNhanVien } from '../../api/nghiepVu'
import { useXacThuc } from '../../auth/AuthContext'
import { ThongBaoKetQua, type KetQua } from '../../components/ThongBaoKetQua'
import { TruongNgay } from '../../components/TruongNgay'
import { TruongNhap } from '../../components/TruongNhap'
import { ganLoiServer, ngay, ngayGio } from '../../lib/dinhDang'

const BAT_BUOC = 'Vui lòng nhập đầy đủ thông tin bắt buộc'
const batBuoc = { validate: (v?: string) => (v ?? '').trim().length > 0 || BAT_BUOC }

/** "Họ và tên: Nguyễn Văn An" → tên trường in đậm, giá trị dòng dưới (mẫu 2.3.5). */
function NoiDungSua({ noiDung }: { noiDung: string }) {
  return (
    <>
      {noiDung.split('\n').map((dong, i) => {
        const vt = dong.indexOf(':')
        if (vt < 0) return <div key={i}>{dong}</div>
        return (
          <div key={i} className="noi-dung-sua">
            <strong>{dong.slice(0, vt).trim()}</strong>
            <span>{dong.slice(vt + 1).trim()}</span>
          </div>
        )
      })}
    </>
  )
}

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
      form.reset({ hoTen: d.hoTen, ngaySinh: ngay(d.ngaySinh), sdt: d.sdt, email: d.email })
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
    <div className="trang-tai-khoan">
      <h1>{laSua ? 'Sửa thông tin nhân viên' : 'Thêm tài khoản nhân viên'}</h1>
      <form className="the the--rong" onSubmit={gui} noValidate>
        <h2>Thông tin nhân viên</h2>

        {/* 2.3.1 (3)–(8): mã nhân viên, tên đăng nhập, trạng thái – chỉ đọc, nền xanh nhạt. */}
        {laSua && chiTiet.data && (
          <div className="luoi-3">
            <div className="truong">
              <span className="truong__nhan">Mã nhân viên</span>
              <div className="o-chi-doc">{chiTiet.data.maND}</div>
            </div>
            <div className="truong">
              <span className="truong__nhan">Tên đăng nhập</span>
              <div className="o-chi-doc">{chiTiet.data.tenDangNhap}</div>
            </div>
            <div className="truong">
              <span className="truong__nhan">Trạng thái</span>
              <div className="o-chi-doc">{chiTiet.data.trangThai}</div>
            </div>
          </div>
        )}

        <div className="luoi-2">
          <TruongNhap nhan="Họ và tên" batBuoc placeholder="Nhập họ và tên" loi={errors.hoTen?.message} {...form.register('hoTen', batBuoc)} />
          <TruongNgay
            nhan="Ngày sinh"
            batBuoc
            placeholder="Nhập ngày sinh"
            loi={errors.ngaySinh?.message}
            onChonNgay={(d) => form.setValue('ngaySinh', d, { shouldDirty: true, shouldValidate: form.formState.isSubmitted })}
            {...form.register('ngaySinh', batBuoc)}
          />
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

        <div className="hang-nut">
          <button type="button" className="nut" onClick={() => navigate('/quan-ly-tai-khoan')}>
            Hủy
          </button>
          <button type="submit" className="nut nut--chinh" disabled={isSubmitting}>
            Lưu
          </button>
        </div>

        {/* 2.3.1 (15)(16) / 2.3.5: lịch sử chỉnh sửa nằm trong cùng khung. */}
        {laSua && chiTiet.data && (
          <div className="lich-su-sua">
            <h3>Lịch sử chỉnh sửa</h3>
            {chiTiet.data.lichSu.length === 0 ? (
              <div className="o-chi-doc">Chưa có lịch sử chỉnh sửa</div>
            ) : (
              <div className="bang-cuon bang-cuon--nhat">
                <table className="bang bang--nhat">
                  <thead>
                    <tr>
                      <th>Người thực hiện</th>
                      <th>Thời điểm chỉnh sửa</th>
                      <th>Nội dung trước sửa</th>
                      <th>Nội dung sau sửa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chiTiet.data.lichSu.map((ls, i) => {
                      const [ngaySua, gioSua] = ngayGio(ls.thoiDiemSua).split(' ')
                      return (
                        <tr key={i}>
                          <td>
                            <strong>{ls.maCQ}</strong>
                            <div>{ls.vaiTro}</div>
                          </td>
                          <td>
                            {ngaySua}
                            <div>{gioSua}</div>
                          </td>
                          <td>
                            <NoiDungSua noiDung={ls.noiDungTruoc} />
                          </td>
                          <td>
                            <NoiDungSua noiDung={ls.noiDungSau} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </form>

      <ThongBaoKetQua
        ketQua={ketQua}
        onDong={() => {
          const ve = ketQua?.veDanhSach
          setKetQua(null)
          if (ve) navigate('/quan-ly-tai-khoan')
        }}
      />
    </div>
  )
}
