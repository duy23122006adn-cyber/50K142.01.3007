import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useXacThuc } from '../auth/AuthContext'
import { TEN_TRANG, TEN_TRANG_MAU, TEN_VAI_TRO, chucNangCua } from '../auth/chucNang'
import { useKetNoiTucThoi } from '../lib/suKien'
import { ChuongThongBao } from './ChuongThongBao'
import { HopThoai } from './HopThoai'

/** Breadcrumb theo đặc tả: "Trang chủ / … / …". Đoạn là mã (NV001, HH-0001…) giữ nguyên. */
function Breadcrumb() {
  const { pathname } = useLocation()
  const mau = TEN_TRANG_MAU.find(([m]) => m.test(pathname))
  if (mau) {
    const [, cha, ten] = mau
    return (
      <nav className="breadcrumb" aria-label="Vị trí hiện tại">
        <Link to="/">Trang chủ</Link>
        {' / '}
        <Link to={cha}>{TEN_TRANG[cha] ?? cha}</Link>
        {' / '}
        <span aria-current="page">{ten}</span>
      </nav>
    )
  }
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

/** Khung chung sau đăng nhập: thanh tiêu đề, menu tài khoản, menu chức năng theo vai trò. */
export function BoCuc() {
  const { nguoiDung, dangXuat, coThaoTacChuaLuu } = useXacThuc()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [moMenu, setMoMenu] = useState(false)
  const [moMenuChucNang, setMoMenuChucNang] = useState(false) // điện thoại: menu dạng ngăn kéo
  const ketNoi = useKetNoiTucThoi(nguoiDung?.maND)
  const [hoiDangXuat, setHoiDangXuat] = useState<null | 'thuong' | 'chuaLuu'>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  // Nhóm menu bị người dùng thu gọn; chỉ có hiệu lực khi còn ở đúng trang lúc thu gọn
  // (chuyển trang thì nhóm của trang mới tự mở lại).
  const [thuGon, setThuGon] = useState<{ nhom: string; pathname: string } | null>(null)
  const nhomThuGon = thuGon?.pathname === pathname ? thuGon.nhom : null

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
        <button
          type="button"
          className="nut-menu"
          aria-label="Mở menu chức năng"
          aria-expanded={moMenuChucNang}
          onClick={() => setMoMenuChucNang((v) => !v)}
        >
          ☰
        </button>
        <Link to="/" className="thuong-hieu" aria-label="Tạp hóa Xóm Nhỏ – Trang chủ">
          <span className="thuong-hieu__ten">Xóm nhỏ</span>
        </Link>

        <span
          className={`den-ket-noi den-ket-noi--${ketNoi}`}
          title={ketNoi === 'truc-tuyen' ? 'Đang đồng bộ thời gian thực' : ketNoi === 'mat-ket-noi' ? 'Mất kết nối máy chủ – đang thử kết nối lại' : 'Đang kết nối…'}
        >
          <span className="den-ket-noi__cham" aria-hidden />
          <span className="den-ket-noi__chu">{ketNoi === 'truc-tuyen' ? 'Trực tuyến' : ketNoi === 'mat-ket-noi' ? 'Mất kết nối' : 'Đang kết nối'}</span>
        </span>
        <ChuongThongBao />

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
        {moMenuChucNang && <div className="man-che" aria-hidden onClick={() => setMoMenuChucNang(false)} />}
        <nav
          className={`menu-trai ${moMenuChucNang ? 'menu-trai--mo' : ''}`}
          aria-label="Chức năng"
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('a')) setMoMenuChucNang(false)
          }}
        >
          <NavLink to="/" end>
            Trang chủ
          </NavLink>
          {chucNangCua(nguoiDung.vaiTro).map((c) => {
            const dangMo = pathname === c.duongDan || pathname.startsWith(c.duongDan + '/')
            const con = c.con?.filter((m) => m.vaiTro.includes(nguoiDung.vaiTro)) ?? []
            const moCon = dangMo && con.length > 0 && nhomThuGon !== c.duongDan
            return (
              <div key={c.duongDan} className="menu-trai__nhom">
                <NavLink
                  to={c.moTrangCha ? c.duongDan : (con[0]?.duongDan ?? c.duongDan)}
                  className={[dangMo && 'active', moCon && 'mo'].filter(Boolean).join(' ')}
                  aria-expanded={con.length > 0 ? moCon : undefined}
                  onClick={(e) => {
                    if (moCon) {
                      // Đang mở mục con → ấn lại để thu gọn, không chuyển trang, không đóng ngăn kéo.
                      e.preventDefault()
                      e.stopPropagation()
                      setThuGon({ nhom: c.duongDan, pathname })
                    } else {
                      setThuGon(null)
                    }
                  }}
                >
                  {c.ten}
                </NavLink>
                {moCon && (
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
