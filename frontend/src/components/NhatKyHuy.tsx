import { useQuery } from '@tanstack/react-query'
import { huyHoaDonApi } from '../api/nghiepVu'
import { ngayGio, tien } from '../lib/dinhDang'
import { XemHoaDon } from './XemHoaDon'

/** Màn hình 6.3.17 / 6.3.25 – nhật ký hủy kèm bản sao hóa đơn tại thời điểm hủy (UC_6.3 BR11, BR12). */
export function NhatKyHuy({ maHD, coBanSao = true }: { maHD: string; coBanSao?: boolean }) {
  const { data, error } = useQuery({ queryKey: ['hoa-don', 'nhat-ky-huy', maHD], queryFn: () => huyHoaDonApi.nhatKy(maHD) })
  if (error) return <p className="thong-bao thong-bao--do">{(error as Error).message}</p>
  if (!data) return <p className="ghi-chu">Đang tải nhật ký hủy…</p>
  return (
    <>
      <div className="khung-nhat-ky">
        <h2>Nhật ký hủy</h2>
        <p className="ghi-chu">Bản sao chi tiết hóa đơn tại thời điểm hủy, được lưu cố định.</p>
        <dl className="thong-tin">
          <dt>Người hủy</dt>
          <dd>
            {data.nguoiHuy} · Chủ quán
          </dd>
          <dt>Thời gian hủy</dt>
          <dd>{ngayGio(data.thoiGianHuy)}</dd>
          <dt>Lý do</dt>
          <dd>{data.lyDoHuy}</dd>
          <dt>Tiền cần hoàn</dt>
          <dd className="so-lon">{tien(data.soTienCanHoan)}</dd>
        </dl>
      </div>
      {coBanSao && <XemHoaDon hd={data.banSao} />}
    </>
  )
}
