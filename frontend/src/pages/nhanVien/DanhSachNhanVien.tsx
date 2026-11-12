import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LoiApi } from '../../api/client'
import { nhanVienApi, type CheDoXoa } from '../../api/nghiepVu'
import { HopThoai } from '../../components/HopThoai'
import { ThongBaoKetQua, type KetQua } from '../../components/ThongBaoKetQua'

interface XacNhanXoa {
  maND: string
  hoTen: string
  cheDo: CheDoXoa
}

/** Màn hình 2.1 – Danh sách nhân viên; 2.5 – Xóa / ngừng hoạt động tài khoản (UC_2.4). */
export function DanhSachNhanVien() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [oTim, setOTim] = useState('')
  const [tuKhoa, setTuKhoa] = useState('')
  const [xacNhan, setXacNhan] = useState<XacNhanXoa | null>(null)
  const [ketQua, setKetQua] = useState<KetQua | null>(null)
  const [dangXoa, setDangXoa] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['nhan-vien', tuKhoa],
    queryFn: () => nhanVienApi.danhSach(tuKhoa),
  })

  const batDauXoa = async (maND: string) => {
    try {
      setXacNhan(await nhanVienApi.kiemTraXoa(maND))
    } catch (e) {
      // 5b, 5c: đang trong ca / còn ca chưa đối soát.
      setKetQua({ kieu: 'loi', thongBao: e instanceof LoiApi ? e.message : 'Xóa tài khoản thất bại' })
    }
  }

  const thucHienXoa = async () => {
    if (!xacNhan) return
    setDangXoa(true)
    try {
      const kq = await nhanVienApi.xoa(xacNhan.maND, xacNhan.cheDo)
      setKetQua({ kieu: 'thanhCong', thongBao: kq.thongBao })
      await queryClient.invalidateQueries({ queryKey: ['nhan-vien'] })
    } catch (e) {
      const macDinh = xacNhan.cheDo === 'XoaHan' ? 'Xóa tài khoản thất bại' : 'Ngừng hoạt động tài khoản thất bại'
      setKetQua({ kieu: 'loi', thongBao: e instanceof LoiApi ? e.message : macDinh })
    } finally {
      setXacNhan(null)
      setDangXoa(false)
    }
  }

  return (
    <div className="trang-tai-khoan">
      <h1>Quản lý tài khoản</h1>
      <section className="the the--rong">
        <div className="thanh-cong-cu">
          <h2>Danh sách nhân viên</h2>
          <form
            className="o-tim"
            onSubmit={(e) => {
              e.preventDefault()
              setTuKhoa(oTim.trim())
            }}
          >
            <input
              className="truong__o"
              placeholder="Tìm theo tên / số điện thoại"
              value={oTim}
              onChange={(e) => setOTim(e.target.value)}
              aria-label="Tìm theo tên hoặc số điện thoại"
            />
            <button type="submit" className="nut nut--chinh">Tìm kiếm</button>
          </form>
          <Link to="/quan-ly-tai-khoan/them" className="nut nut--chinh">
            Thêm tài khoản
          </Link>
        </div>

        {isLoading && <p className="ghi-chu">Đang tải…</p>}
        {error && <p className="thong-bao thong-bao--do">{(error as Error).message}</p>}
        {data && data.length === 0 && <p className="thong-bao thong-bao--do">Không tìm thấy nhân viên phù hợp</p>}
        {data && data.length > 0 && (
          <div className="bang-cuon">
            <table className="bang bang--xen-ke bang--gon">
              <thead>
                <tr>
                  <th>Họ tên</th>
                  <th>Mã nhân viên</th>
                  <th>Số điện thoại</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {data.map((nv) => (
                  <tr key={nv.maND}>
                    <td>{nv.hoTen}</td>
                    <td>{nv.maND}</td>
                    <td>{nv.sdt}</td>
                    <td>{nv.trangThai}</td>
                    <td>
                      <div className="o-hanh-dong">
                      <button type="button" className="nut nut--nho" onClick={() => navigate(`/quan-ly-tai-khoan/${nv.maND}/sua`)}>
                        Sửa
                      </button>
                      <button
                        type="button"
                        className="nut nut--nho"
                        disabled={nv.trangThai === 'Ngừng hoạt động'}
                        onClick={() => batDauXoa(nv.maND)}
                      >
                        Xóa
                      </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 2.5.1 Xác nhận xóa / 2.5.3 Xác nhận ngừng hoạt động */}
      <HopThoai
        mo={xacNhan !== null}
        tieuDe={xacNhan?.cheDo === 'XoaHan' ? 'Xóa tài khoản nhân viên?' : 'Ngừng hoạt động tài khoản?'}
        className="hop-thoai--xac-nhan"
        onDong={() => setXacNhan(null)}
        nut={
          <>
            <button type="button" className="nut" onClick={() => setXacNhan(null)}>
              Hủy
            </button>
            <button type="button" className="nut nut--chinh" onClick={thucHienXoa} disabled={dangXoa}>
              Xác nhận
            </button>
          </>
        }
      >
        <div className={xacNhan?.cheDo === 'XoaHan' ? '' : 'chu-do-thuong'}>
          <p>
            {xacNhan?.maND} — {xacNhan?.hoTen}
          </p>
          <p>
            {xacNhan?.cheDo === 'XoaHan'
              ? 'Bạn có chắc muốn xóa tài khoản này?'
              : 'Nhân viên đã có hóa đơn hoặc lịch sử ca làm việc. Tài khoản sẽ chuyển sang “Ngừng hoạt động” và không thể đăng nhập.'}
          </p>
        </div>
      </HopThoai>

      <ThongBaoKetQua ketQua={ketQua} onDong={() => setKetQua(null)} />
    </div>
  )
}
