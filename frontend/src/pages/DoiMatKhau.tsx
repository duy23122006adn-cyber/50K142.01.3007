import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { LoiApi } from '../api/client'
import { doiMatKhau, layTrangThaiDoiMatKhau } from '../api/xacThuc'
import { useXacThuc } from '../auth/AuthContext'
import { HopThoai } from '../components/HopThoai'
import { TruongNhap } from '../components/TruongNhap'

const VUI_LONG_NHAP = 'Vui lòng nhập đầy đủ thông tin'
const batBuoc = z.string().refine((v) => v.trim().length > 0, VUI_LONG_NHAP)

/** UC_2.3 – kiểm tra phía giao diện theo đúng thứ tự 4a → 4c → 4d → 4e (4b do server kiểm tra). */
const schema = z
  .object({ matKhauHienTai: batBuoc, matKhauMoi: batBuoc, xacNhanMatKhauMoi: batBuoc })
  .superRefine((v, ctx) => {
    const { matKhauHienTai, matKhauMoi, xacNhanMatKhauMoi } = v
    if (!matKhauHienTai.trim() || !matKhauMoi.trim() || !xacNhanMatKhauMoi.trim()) return
    const dungQuyTac = matKhauMoi.length >= 8 && /\p{L}/u.test(matKhauMoi) && /\d/.test(matKhauMoi)
    if (!dungQuyTac) ctx.addIssue({ code: 'custom', path: ['matKhauMoi'], message: 'Mật khẩu không đúng quy tắc' })
    else if (xacNhanMatKhauMoi !== matKhauMoi)
      ctx.addIssue({ code: 'custom', path: ['xacNhanMatKhauMoi'], message: 'Mật khẩu xác nhận không khớp' })
  })

type Form = z.infer<typeof schema>
type HopThoaiMo = null | { kieu: 'thanhCong' } | { kieu: 'khoa'; thongBao: string } | { kieu: 'thatBai'; thongBao: string }

/** UC_2.3 Đổi mật khẩu tài khoản – màn hình 2.4.2 đến 2.4.11. */
export function DoiMatKhau() {
  const { xoaPhien, datChuaLuu } = useXacThuc()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [hopThoai, setHopThoai] = useState<HopThoaiMo>(null)
  const trangThai = useQuery({ queryKey: ['doi-mat-khau', 'trang-thai'], queryFn: layTrangThaiDoiMatKhau })

  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { matKhauHienTai: '', matKhauMoi: '', xacNhanMatKhauMoi: '' },
  })
  const { errors, isSubmitting, isDirty } = form.formState

  // UC_11 1.a: báo cho nút Đăng xuất biết đang có thao tác chưa lưu.
  useEffect(() => {
    datChuaLuu(isDirty)
    return () => datChuaLuu(false)
  }, [isDirty, datChuaLuu])

  // Màn hình 2.4.10: chức năng đang bị khóa thì quay về Tài khoản cá nhân.
  if (trangThai.data?.biKhoa && !hopThoai) return <Navigate to="/tai-khoan" replace />

  const gui = form.handleSubmit(async (v) => {
    try {
      await doiMatKhau(v.matKhauHienTai, v.matKhauMoi, v.xacNhanMatKhauMoi)
      datChuaLuu(false)
      setHopThoai({ kieu: 'thanhCong' })
    } catch (e) {
      if (!(e instanceof LoiApi)) {
        setHopThoai({ kieu: 'thatBai', thongBao: 'Đổi mật khẩu thất bại' })
        return
      }
      if (e.status === 423) {
        await queryClient.invalidateQueries({ queryKey: ['doi-mat-khau', 'trang-thai'] })
        setHopThoai({ kieu: 'khoa', thongBao: e.message })
        return
      }
      const cacLoi = Object.entries(e.loi)
      if (cacLoi.length > 0) {
        for (const [truong, tb] of cacLoi) form.setError(truong as keyof Form, { message: tb })
        return
      }
      setHopThoai({ kieu: 'thatBai', thongBao: 'Đổi mật khẩu thất bại' })
    }
  })

  return (
    <>
      <h1>Đổi mật khẩu</h1>
      <form className="the the--hep" onSubmit={gui} noValidate>
        <h2>Đổi mật khẩu tài khoản</h2>
        <TruongNhap
          nhan="Mật khẩu hiện tại"
          batBuoc
          type="password"
          placeholder="Nhập mật khẩu hiện tại"
          autoComplete="current-password"
          loi={errors.matKhauHienTai?.message}
          {...form.register('matKhauHienTai')}
        />
        <TruongNhap
          nhan="Mật khẩu mới"
          batBuoc
          type="password"
          placeholder="Nhập mật khẩu mới"
          autoComplete="new-password"
          loi={errors.matKhauMoi?.message}
          {...form.register('matKhauMoi')}
        />
        <p className="ghi-chu">Tối thiểu 8 ký tự, gồm cả chữ và số.</p>
        <TruongNhap
          nhan="Xác nhận mật khẩu mới"
          batBuoc
          type="password"
          placeholder="Nhập xác nhận mật khẩu mới"
          autoComplete="new-password"
          loi={errors.xacNhanMatKhauMoi?.message}
          {...form.register('xacNhanMatKhauMoi')}
        />
        <div className="hang-nut">
          <button type="button" className="nut" onClick={() => navigate(-1)}>
            Hủy
          </button>
          <button type="submit" className="nut nut--chinh" disabled={isSubmitting}>
            Lưu
          </button>
        </div>
      </form>

      {/* 2.4.3 – thành công: "Kết thúc" đăng xuất mọi phiên và về màn hình đăng nhập. */}
      <HopThoai
        mo={hopThoai?.kieu === 'thanhCong'}
        kieu="thanhCong"
        nut={
          <button
            type="button"
            className="nut nut--chinh"
            onClick={() => {
              xoaPhien()
              navigate('/dang-nhap', { replace: true })
            }}
          >
            Kết thúc
          </button>
        }
      >
        <p className="thong-bao thong-bao--xanh">Đổi mật khẩu thành công</p>
        <p className="ghi-chu">Tất cả phiên đăng nhập đã kết thúc. Vui lòng đăng nhập lại bằng mật khẩu mới.</p>
      </HopThoai>

      {/* 2.4.9 – khóa 15 phút; 2.4.11 – thất bại. */}
      <HopThoai
        mo={hopThoai?.kieu === 'khoa' || hopThoai?.kieu === 'thatBai'}
        kieu="loi"
        onDong={() => setHopThoai(null)}
        nut={
          <button
            type="button"
            className="nut"
            onClick={() => {
              const laKhoa = hopThoai?.kieu === 'khoa'
              setHopThoai(null)
              if (laKhoa) navigate('/tai-khoan', { replace: true })
            }}
          >
            Đóng
          </button>
        }
      >
        <p className="thong-bao thong-bao--do">{hopThoai && 'thongBao' in hopThoai ? hopThoai.thongBao : ''}</p>
      </HopThoai>
    </>
  )
}
