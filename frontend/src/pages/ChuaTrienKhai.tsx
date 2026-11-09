import { Link } from 'react-router-dom'
import type { ChucNang } from '../auth/chucNang'

/** Trang tạm cho chức năng thuộc giai đoạn sau (KE_HOACH.md mục 3). */
export function ChuaTrienKhai({ chucNang }: { chucNang: ChucNang }) {
  return (
    <>
      <h1>{chucNang.ten}</h1>
      <section className="the">
        <p>{chucNang.moTa}.</p>
        <p className="ghi-chu">
          Chức năng này được triển khai ở <strong>Giai đoạn {chucNang.giaiDoan}</strong> theo kế hoạch.
        </p>
        <Link to="/" className="nut">
          Về Trang chủ
        </Link>
      </section>
    </>
  )
}

export function KhongCoQuyen() {
  return (
    <>
      <h1>Không có quyền truy cập</h1>
      <section className="the">
        <p className="thong-bao thong-bao--do">Tài khoản của bạn không được phân quyền sử dụng chức năng này.</p>
        <Link to="/" className="nut">
          Về Trang chủ
        </Link>
      </section>
    </>
  )
}
