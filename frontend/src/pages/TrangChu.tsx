import { Link } from 'react-router-dom'
import { useXacThuc } from '../auth/AuthContext'
import { TEN_VAI_TRO, chucNangCua } from '../auth/chucNang'

/** Trang chủ – hiển thị các chức năng theo vai trò (UC_1 bước 6, 6.a.1; BR05). */
export function TrangChu() {
  const { nguoiDung } = useXacThuc()
  if (!nguoiDung) return null

  return (
    <>
      <h1>Xin chào, {nguoiDung.hoTen}</h1>
      <p className="ghi-chu">
        Vai trò: <strong>{TEN_VAI_TRO[nguoiDung.vaiTro]}</strong>
      </p>
      <ul className="luoi-chuc-nang">
        {chucNangCua(nguoiDung.vaiTro).map((c) => (
          <li key={c.duongDan}>
            <Link to={c.duongDan} className="o-chuc-nang">
              <strong>{c.ten}</strong>
              <span>{c.moTa}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
