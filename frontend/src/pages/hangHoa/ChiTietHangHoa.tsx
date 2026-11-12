import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { LoiApi } from '../../api/client'
import { hangHoaApi, type CheDoXoa } from '../../api/nghiepVu'
import { HopThoai } from '../../components/HopThoai'
import { ThongBaoKetQua, type KetQua } from '../../components/ThongBaoKetQua'
import { so, tien } from '../../lib/dinhDang'

/** Màn hình 4.3 – Chi tiết thông tin hàng hóa; 4.5 – Xóa hàng hóa (UC_4.3). */
export function ChiTietHangHoa() {
  const { maHH = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [xacNhan, setXacNhan] = useState<{ tenHH: string; cheDo: CheDoXoa } | null>(null)
  const [ketQua, setKetQua] = useState<(KetQua & { veDanhSach?: boolean }) | null>(null)

  const { data: h, error } = useQuery({ queryKey: ['hang-hoa', 'chi-tiet', maHH], queryFn: () => hangHoaApi.chiTiet(maHH) })

  const batDauXoa = async () => {
    try {
      setXacNhan(await hangHoaApi.kiemTraXoa(maHH))
    } catch (e) {
      // 5a: còn tồn kho
      setKetQua({ kieu: 'loi', thongBao: e instanceof LoiApi ? e.message : 'Xóa hàng hóa thất bại', nut: 'Quay lại' })
    }
  }

  const thucHienXoa = async () => {
    if (!xacNhan) return
    try {
      const kq = await hangHoaApi.xoa(maHH, xacNhan.cheDo)
      await queryClient.invalidateQueries({ queryKey: ['hang-hoa'] })
      setKetQua({ kieu: 'thanhCong', thongBao: kq.thongBao, veDanhSach: true })
    } catch (e) {
      setKetQua({ kieu: 'loi', thongBao: e instanceof LoiApi ? e.message : 'Xóa hàng hóa thất bại', nut: 'Quay lại' })
    } finally {
      setXacNhan(null)
    }
  }

  if (error) return <p className="thong-bao thong-bao--do">{(error as Error).message}</p>
  if (!h) return <p className="ghi-chu">Đang tải…</p>

  const dong: [string, string][] = [
    ['Mã hàng hóa', h.maHH],
    ['Tên hàng hóa', h.tenHH],
    ['Danh mục', h.tenDM],
    ['Đơn vị tính', h.donViTinh],
    ['Giá nhập', tien(h.giaNhap)],
    ['Giá bán', tien(h.giaBan)],
    ['Ngưỡng cảnh báo hết hạn', h.nguongCanhBaoHetHan ? `${h.nguongCanhBaoHetHan} ngày` : 'Chưa thiết lập'],
    ['Ngưỡng cảnh báo hết hàng', h.nguongCanhBaoHetHang ? so(h.nguongCanhBaoHetHang) : 'Chưa thiết lập'],
    ['Mã vạch', h.maVach ?? '—'],
    ['Tổng tồn kho', so(h.tongTon)],
    ['Trạng thái', h.trangThai],
  ]

  return (
    <>
      <h1>Chi tiết thông tin hàng hóa</h1>
      <section className="the the--vua">
        <div className="bang-cuon">
          <table className="bang bang--thong-tin">
            <thead>
              <tr>
                <th>Thông tin</th>
                <th>Giá trị</th>
              </tr>
            </thead>
            <tbody>
              {dong.map(([k, v]) => (
                <tr key={k}>
                  <td>{k}</td>
                  <td>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {h.trangThai === 'Đang kinh doanh' && (
          <div className="hang-nut">
            <button type="button" className="nut" onClick={() => navigate(`/quan-ly-hang-hoa/${maHH}/sua`)}>
              Sửa
            </button>
            <button type="button" className="nut nut--nguy-hiem-dac" onClick={batDauXoa}>
              Xóa
            </button>
          </div>
        )}
      </section>

      {/* 4.5.1 Xác nhận xóa; hàng đã phát sinh giao dịch → chuyển "Ngừng kinh doanh" (BR01). */}
      <HopThoai
        mo={xacNhan !== null}
        tieuDe="Xác nhận xóa"
        kieu={xacNhan?.cheDo === 'XoaHan' ? 'thuong' : 'loi'}
        onDong={() => setXacNhan(null)}
        nut={
          <>
            <button type="button" className="nut" onClick={() => setXacNhan(null)}>
              Hủy
            </button>
            <button type="button" className="nut nut--nguy-hiem-dac" onClick={thucHienXoa}>
              Đồng ý
            </button>
          </>
        }
      >
        <p>
          Hàng hóa: <strong>{xacNhan?.tenHH}</strong>
        </p>
        {xacNhan?.cheDo === 'NgungKinhDoanh' && (
          <p className="thong-bao thong-bao--do">
            Hàng đã phát sinh giao dịch, không được phép xóa. Hàng hóa sẽ chuyển sang trạng thái “Ngừng kinh doanh” và không
            còn hiển thị ở tìm kiếm, bán hàng, tồn kho và cảnh báo.
          </p>
        )}
      </HopThoai>

      <ThongBaoKetQua
        ketQua={ketQua}
        onDong={() => {
          const ve = ketQua?.veDanhSach
          setKetQua(null)
          if (ve) navigate('/quan-ly-hang-hoa')
        }}
      />
    </>
  )
}
