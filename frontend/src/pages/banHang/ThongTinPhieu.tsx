import type { DongPhieuDoiTra, PhieuDoiTra } from '../../api/nghiepVu'
import { ngayGio, tien } from '../../lib/dinhDang'

const MAU_PHIEU: Record<string, string> = {
  'Chờ duyệt': 'cam',
  'Đã duyệt': 'xanh',
  'Từ chối': 'do',
  'Không hoàn tất': 'do',
}

export function NhanTrangThaiPhieu({ trangThai }: { trangThai: string }) {
  return <span className={`nhan nhan--${MAU_PHIEU[trangThai] ?? 'xam'}`}>{trangThai}</span>
}

/** "Mì Hảo Hảo × 1 → Mì Omachi × 1" (đổi) hoặc "Dầu ăn Neptune 1L / 1 chai" (trả). */
export function MatHang({ d }: { d: DongPhieuDoiTra }) {
  return d.tenHHMoi ? (
    <>
      {d.tenHH} × {d.soLuongTra} → {d.tenHHMoi} × {d.soLuongMoi}
    </>
  ) : (
    <>
      {d.tenHH} / {d.soLuongTra} {d.donViTinh}
    </>
  )
}

/** Chênh lệch giá theo UC_6.2 BR05: "+8.000 đ · Thu thêm", "−12.000 đ · Hoàn lại khách", "0 đ · Không phát sinh". */
export function ChenhLech({ soTien }: { soTien: number }) {
  if (soTien > 0) return <>+{tien(soTien)} · Thu thêm</>
  if (soTien < 0) return <>−{tien(-soTien)} · Hoàn lại khách</>
  return <>{tien(0)} · Không phát sinh</>
}

/** Thông tin phiếu đổi trả – UC_6.4 bước 4 (dùng ở màn hình 6.2.17–6.2.38 và 6.4.2–6.4.9). */
export function ThongTinPhieu({ p }: { p: PhieuDoiTra }) {
  const laDoi = p.loaiPhieu === 'Đổi hàng'
  return (
    <>
      <h2>{laDoi ? 'Thông tin phiếu đổi hàng' : 'Thông tin phiếu trả hàng'}</h2>
      <dl className="thong-tin">
        <dt>Mã phiếu</dt>
        <dd>{p.maPDT}</dd>
        <dt>Mã hóa đơn gốc</dt>
        <dd>{p.maHD}</dd>
        <dt>Tên khách hàng</dt>
        <dd>{p.tenKhach ?? 'Khách vãng lai'}</dd>
        <dt>Loại phiếu</dt>
        <dd>{p.loaiPhieu}</dd>
        <dt>Mặt hàng và số lượng</dt>
        <dd>
          {p.dong.map((d) => (
            <div key={d.maHH}>
              <MatHang d={d} />
            </div>
          ))}
        </dd>
        <dt>Lý do đổi trả</dt>
        <dd>{p.lyDoDoiTra}</dd>
        <dt>Tình trạng hàng</dt>
        <dd>
          {p.tinhTrangHang}
          {p.moTaLoi && <div className="ghi-chu">Mô tả lỗi: {p.moTaLoi}</div>}
        </dd>
        <dt>Người lập · thời gian</dt>
        <dd>
          {p.nguoiLap} ({p.vaiTroNguoiLap}) · {ngayGio(p.ngayGioLap)}
        </dd>
        {laDoi ? (
          <>
            <dt>Giá trị hàng cũ</dt>
            <dd>{tien(p.soTienHoan)}</dd>
            <dt>Giá trị hàng mới</dt>
            <dd>{tien(p.giaTriHangMoi)}</dd>
            <dt>Chênh lệch giá</dt>
            <dd className="so-lon">
              <ChenhLech soTien={p.chenhLech} />
            </dd>
          </>
        ) : (
          <>
            <dt>Số tiền hoàn</dt>
            <dd className="so-lon">{tien(p.soTienHoan)}</dd>
          </>
        )}
        <dt>Trạng thái</dt>
        <dd>
          <NhanTrangThaiPhieu trangThai={p.trangThai} />
        </dd>
        {p.nguoiDuyet && (
          <>
            <dt>Người duyệt · thời gian</dt>
            <dd>
              {p.nguoiDuyet} · {ngayGio(p.ngayGioDuyet)}
            </dd>
          </>
        )}
      </dl>
    </>
  )
}
