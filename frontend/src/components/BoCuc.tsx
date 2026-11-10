import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { caApi } from '../api/nghiepVu'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useXacThuc } from '../auth/AuthContext'
import { TEN_TRANG, TEN_VAI_TRO, chucNangCua } from '../auth/chucNang'
import { HopThoai } from './HopThoai'

/** Breadcrumb theo đặc tả: "Trang chủ / … / …". Đoạn là mã (NV001, HH-0001…) giữ nguyên. */
function Breadcrumb() {
  const { pathname } = useLocation()
  const cacPhan = pathname.split('/').filter(Boolean)
  return (
    <nav className="breadcrumb" aria-label="Vị trí hiện tại">
      <Link to="/">Trang chủ</Link>
      {cacPhan.map((p, i) => {
        const den = '/' + cacPhan.slice(0, i + 1).join('/')
        const ten = TEN_TRANG[den] ?? (p === 'sua' ? 'Sửa' : decodeURIComponent(p))
        return (
          <span key={den}>
            {' / '}
            {i === cacPhan.length - 1 ? <span aria-current="page">{ten}</span> : <Link to={den}>{ten}</Link>}
          </span>
        )
      })}
    </nav>
  )
}

/** Ca đang mở của cửa hàng (Q10) – hiển thị trên thanh tiêu đề. */
function ThongTinCa() {
  const { data: ca } = useQuery({ queryKey: ['ca-hien-tai'], queryFn: caApi.hienTai, refetchInterval: 60_000 })
  if (!ca) return <span className="the-ca the-ca--trong">Chưa mở ca</span>
  return (
    <span className="the-ca" title={`Người phụ trách: ${ca.hoTenPhuTrach}`}>
      {ca.maCa} · {ca.gioBatDau.slice(0, 5)} · {ca.trangThai}
    </span>
  )
}

/** Khung chung sau đăng nhập: thanh tiêu đề, menu tài khoản, menu chức năng theo vai trò. */
export function BoCuc() {
  const { nguoiDung, dangXuat, coThaoTacChuaLuu } = useXacThuc()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [moMenu, setMoMenu] = useState(false)
  const [hoiDangXuat, setHoiDangXuat] = useState<null | 'thuong' | 'chuaLuu'>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!moMenu) return
    const dong = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMoMenu(false)
    }
    document.addEventListener('mousedown', dong)
    return () => document.removeEventListener('mousedown', dong)
  }, [moMenu])

  if (!nguoiDung) return null
  const vaiTro = TEN_VAI_TRO[nguoiDung.vaiTro]
  const viettat = nguoiDung.vaiTro === 'ChuQuan' ? 'CQ' : 'NV'

  const xacNhanDangXuat = async () => {
    setHoiDangXuat(null)
    await dangXuat()
    navigate('/dang-nhap', { replace: true })
  }

  return (
    <div className="bo-cuc">
      <header className="thanh-tieu-de">
        <Link to="/" className="thuong-hieu">
          <span className="thuong-hieu__logo" aria-hidden>XN</span>
          <span>Tạp hóa Xóm Nhỏ</span>
        </Link>

        <ThongTinCa />

        <div className="tai-khoan" ref={menuRef}>
          <button
            type="button"
            className="tai-khoan__nut"
            aria-haspopup="menu"
            aria-expanded={moMenu}
            onClick={() => setMoMenu((v) => !v)}
          >
            <span className="tai-khoan__avatar" aria-hidden>{viettat}</span>
            <span className="tai-khoan__ten">
              <strong>{nguoiDung.hoTen}</strong>
              <small>{vaiTro}</small>
            </span>
          </button>
          {moMenu && (
            <div className="tai-khoan__menu" role="menu">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMoMenu(false)
                  navigate('/tai-khoan/doi-mat-khau')
                }}
              >
                Đổi mật khẩu
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMoMenu(false)
                  setHoiDangXuat(coThaoTacChuaLuu() ? 'chuaLuu' : 'thuong')
                }}
              >
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="bo-cuc__than">
        <nav className="menu-trai" aria-label="Chức năng">
          <NavLink to="/" end>
            Trang chủ
          </NavLink>
          {chucNangCua(nguoiDung.vaiTro).map((c) => {
            const dangMo = pathname === c.duongDan || pathname.startsWith(c.duongDan + '/')
            const con = c.con?.filter((m) => m.vaiTro.includes(nguoiDung.vaiTro)) ?? []
            return (
              <div key={c.duongDan} className="menu-trai__nhom">
                <NavLink to={con[0]?.duongDan ?? c.duongDan} className={dangMo ? 'active' : undefined}>
                  {c.ten}
                </NavLink>
                {dangMo && con.length > 0 && (
                  <div className="menu-trai__con">
                    {con.map((m) => (
                      <NavLink key={m.duongDan} to={m.duongDan} end>
                        {m.ten}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        <main className="noi-dung">
          <Breadcrumb />
          <Outlet />
        </main>
      </div>

      {/* Màn hình 11.2 / 11.3 */}
      <HopThoai
        mo={hoiDangXuat !== null}
        onDong={() => setHoiDangXuat(null)}
        nut={
          <>
            <button type="button" className="nut nut--chinh" onClick={xacNhanDangXuat}>
              Xác nhận
            </button>
            <button type="button" className="nut" onClick={() => setHoiDangXuat(null)}>
              Hủy
            </button>
          </>
        }
      >
        <p>
          {hoiDangXuat === 'chuaLuu'
            ? 'Thao tác chưa hoàn tất sẽ không được lưu. Bạn có muốn đăng xuất?'
            : 'Bạn có muốn đăng xuất không?'}
        </p>
      </HopThoai>
    </div>
  )
}
