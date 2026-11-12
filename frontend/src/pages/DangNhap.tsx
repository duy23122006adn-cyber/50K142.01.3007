import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { LoiApi } from '../api/client'
import { moKhoa } from '../api/xacThuc'
import { useXacThuc } from '../auth/AuthContext'
import { TruongNhap } from '../components/TruongNhap'

const KHONG_DUOC_BO_TRONG = 'Không được bỏ trống!'
const khongTrong = z.string().refine((v) => v.trim().length > 0, KHONG_DUOC_BO_TRONG)

const schemaDangNhap = z.object({ tenDangNhap: khongTrong, matKhau: khongTrong })
const schemaOtp = z.object({ maOtp: khongTrong })

type FormDangNhap = z.infer<typeof schemaDangNhap>
type FormOtp = z.infer<typeof schemaOtp>

/** Chỉ có khi máy chủ bật giả lập SMS: mô phỏng tin nhắn đến điện thoại Chủ quán. */
interface SmsGiaLap {
  nguoiNhan: string
  sdtNhan: string
  taiKhoanBiKhoa: string
  hoTenBiKhoa: string
  vaiTroBiKhoa: 'Chủ quán' | 'Nhân viên'
  noiDung: string
}

interface ThongTinKhoa {
  tenDangNhap: string
  sdtNhanMa?: string
  maOtpGiaLap?: string
  giaLapSms?: SmsGiaLap
}

/** UC_1 – màn hình 1.1 đến 1.4. */
export function DangNhap() {
  const { nguoiDung, dangNhap } = useXacThuc()
  const navigate = useNavigate()
  const [loiChung, setLoiChung] = useState<string | null>(null)
  const [thongBaoXanh, setThongBaoXanh] = useState<string | null>(null)
  const [khoa, setKhoa] = useState<ThongTinKhoa | null>(null)

  const formDN = useForm<FormDangNhap>({
    resolver: zodResolver(schemaDangNhap),
    defaultValues: { tenDangNhap: '', matKhau: '' },
  })
  const formOtp = useForm<FormOtp>({ resolver: zodResolver(schemaOtp), defaultValues: { maOtp: '' } })

  if (nguoiDung) return <Navigate to="/" replace />

  const guiDangNhap = formDN.handleSubmit(async ({ tenDangNhap, matKhau }) => {
    setLoiChung(null)
    setThongBaoXanh(null)
    try {
      await dangNhap(tenDangNhap, matKhau)
      navigate('/', { replace: true })
    } catch (e) {
      if (e instanceof LoiApi && e.status === 423) {
        // 5.c / 5.f: tài khoản bị khóa tạm → chuyển sang nhập OTP.
        setKhoa({
          tenDangNhap: tenDangNhap.trim(),
          sdtNhanMa: e.duLieu.sdtNhanMa as string | undefined,
          maOtpGiaLap: e.duLieu.maOtpGiaLap as string | undefined,
          giaLapSms: e.duLieu.giaLapSms as SmsGiaLap | undefined,
        })
        formOtp.reset({ maOtp: '' })
        return
      }
      if (e instanceof LoiApi) {
        for (const [truong, tb] of Object.entries(e.loi)) formDN.setError(truong as keyof FormDangNhap, { message: tb })
        if (Object.keys(e.loi).length === 0) setLoiChung(e.message)
        return
      }
      setLoiChung('Đăng nhập không thành công!')
    }
  })

  const guiOtp = formOtp.handleSubmit(async ({ maOtp }) => {
    if (!khoa) return
    try {
      const kq = await moKhoa(khoa.tenDangNhap, maOtp.trim())
      // 5.c.5: mở khóa xong quay lại bước nhập thông tin đăng nhập.
      setKhoa(null)
      formDN.reset({ tenDangNhap: khoa.tenDangNhap, matKhau: '' })
      setThongBaoXanh(kq.thongBao)
    } catch (e) {
      const tb = e instanceof LoiApi ? (e.loi.maOtp ?? e.message) : 'Mã xác nhận không đúng!'
      formOtp.setError('maOtp', { message: tb })
    }
  })

  return (
    <div className="trang-dang-nhap">
      <section className="trang-dang-nhap__trai" aria-hidden>
        <div className="logo-lon">Xóm nhỏ</div>
      </section>

      <section className="trang-dang-nhap__phai">
        {!khoa ? (
          <form className="the-dang-nhap" onSubmit={guiDangNhap} noValidate>
            <h1>Đăng nhập</h1>
            {thongBaoXanh && <p className="thong-bao thong-bao--xanh">{thongBaoXanh}</p>}
            <TruongNhap
              nhan="Tên"
              placeholder="Nhập tên người dùng"
              autoComplete="username"
              autoFocus
              loi={formDN.formState.errors.tenDangNhap?.message}
              {...formDN.register('tenDangNhap')}
            />
            <TruongNhap
              nhan="Mật khẩu"
              type="password"
              placeholder="Nhập mật khẩu"
              autoComplete="current-password"
              loi={formDN.formState.errors.matKhau?.message}
              {...formDN.register('matKhau')}
            />
            {loiChung && (
              <p className="thong-bao thong-bao--do" role="alert">
                {loiChung}
              </p>
            )}
            <button type="submit" className="nut nut--chinh nut--rong" disabled={formDN.formState.isSubmitting}>
              {formDN.formState.isSubmitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
            </button>
          </form>
        ) : (
          <form className="the-dang-nhap" onSubmit={guiOtp} noValidate>
            <h1>Nhập OTP</h1>
            <p className="thong-bao thong-bao--do canh-giua" role="alert">
              Tài khoản đang bị khóa tạm thời!
            </p>
            <p className="ghi-chu">
              Mã xác nhận đã được gửi tới số điện thoại của Chủ quán{khoa.sdtNhanMa ? ` (${khoa.sdtNhanMa})` : ''}. Vui
              lòng liên hệ Chủ quán để nhận mã. Mã có hiệu lực trong 5 phút.
            </p>
            {khoa.giaLapSms ? (
              // Giả lập: thể hiện rõ mã đi tới điện thoại Chủ quán, tài khoản nào bị khóa và vai trò gì.
              <div className="gia-lap sms-gia-lap">
                <p className="sms-gia-lap__dong">
                  <strong>[Giả lập SMS]</strong> Tài khoản bị khóa: <strong>{khoa.giaLapSms.taiKhoanBiKhoa}</strong> –{' '}
                  {khoa.giaLapSms.hoTenBiKhoa} <span className="nhan-vai-tro">{khoa.giaLapSms.vaiTroBiKhoa}</span>
                </p>
                <div className="dt-gia-lap" aria-label="Điện thoại Chủ quán">
                  <div className="dt-gia-lap__dau">
                    📱 Điện thoại Chủ quán · {khoa.giaLapSms.nguoiNhan} · {khoa.giaLapSms.sdtNhan}
                  </div>
                  <p className="dt-gia-lap__tin">{khoa.giaLapSms.noiDung}</p>
                </div>
                <p className="sms-gia-lap__dong">
                  {khoa.giaLapSms.vaiTroBiKhoa === 'Nhân viên'
                    ? 'Thực tế nhân viên không thấy tin này: Chủ quán đọc mã cho nhân viên nhập vào ô bên dưới.'
                    : 'Tài khoản Chủ quán bị khóa: mã gửi tới chính điện thoại của Chủ quán.'}
                </p>
              </div>
            ) : (
              khoa.maOtpGiaLap && (
                <p className="gia-lap">
                  <strong>[Giả lập SMS]</strong> Mã OTP: <code>{khoa.maOtpGiaLap}</code>
                </p>
              )
            )}
            <TruongNhap
              nhan="Mã OTP"
              placeholder="Nhập OTP"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              loi={formOtp.formState.errors.maOtp?.message}
              {...formOtp.register('maOtp')}
            />
            <button type="submit" className="nut nut--chinh nut--rong" disabled={formOtp.formState.isSubmitting}>
              Xác nhận
            </button>
            <button
              type="button"
              className="nut nut--chu nut--rong"
              onClick={() => {
                setKhoa(null)
                formDN.reset({ tenDangNhap: khoa.tenDangNhap, matKhau: '' })
              }}
            >
              Quay lại đăng nhập
            </button>
          </form>
        )}
      </section>
    </div>
  )
}
