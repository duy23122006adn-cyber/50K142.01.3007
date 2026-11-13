import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { LoiApi } from '../../api/client'
import { doiTraApi, duyetDoiTraApi, type PhieuDoiTra } from '../../api/nghiepVu'
import { useXacThuc } from '../../auth/AuthContext'
import { HopThoai } from '../../components/HopThoai'
import { ManChuyenKhoan } from '../../components/ManChuyenKhoan'
import { ngayGio, tien } from '../../lib/dinhDang'
import { docTien } from '../../lib/docSo'
import { docDaThu, docTo } from '../../lib/docTo'
import { useTrang } from '../../lib/useTrang'
import { ChenhLech, MatHang, NhanTrangThaiPhieu, ThongTinPhieu } from './ThongTinPhieu'

const GOC_DOI_TRA = '/quan-ly-ban-hang/doi-tra'
const GOC_DUYET = '/quan-ly-ban-hang/duyet-doi-tra'

/** Tiêu đề màn hình theo trạng thái phiếu (6.2.17–6.2.38). */
function tieuDePhieu(p: PhieuDoiTra, buocThu: 'chon' | 'tienMat' | 'qr'): { chu: string; do?: boolean } {
  const doi = p.loaiPhieu === 'Đổi hàng'
  if (p.trangThai === 'Chờ duyệt') return { chu: doi ? 'Phiếu đổi hàng chờ duyệt' : 'Phiếu trả hàng chờ duyệt' }
  if (p.trangThai === 'Từ chối') return { chu: 'Phiếu bị Chủ quán từ chối', do: true }
  if (p.trangThai === 'Không hoàn tất') return { chu: 'Không thanh toán lại · không hoàn tất', do: true }
  if (p.ngayGioHoanTat) return { chu: doi ? 'Đổi hàng hoàn tất' : 'Trả hàng hoàn tất' }
  if (!doi) return { chu: 'Phiếu trả đã duyệt · xác nhận hoàn tiền' }
  if (p.trangThaiXuLy === 'Chờ thu thêm')
    return { chu: buocThu === 'tienMat' ? 'Thu thêm tiền mặt' : buocThu === 'qr' ? 'Thu thêm tiền chuyển khoản' : 'Thu thêm tiền đổi hàng' }
  if (p.trangThaiXuLy === 'Chờ hoàn chênh lệch') return { chu: 'Đổi hàng giá thấp hơn · hoàn tiền' }
  return { chu: 'Phiếu đổi hàng đã duyệt' }
}

/** Màn hình 6.2.17–6.2.38 – theo dõi kết quả duyệt và hoàn tất phiếu (UC_6.2 bước 12–18, 13.a, 14.a). */
export function PhieuDoiTraTrang() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { nguoiDung } = useXacThuc()
  const [params] = useSearchParams()
  const ma = params.get('ma') ?? ''
  const { data: p, error, refetch, isFetching } = useQuery({
    queryKey: ['doi-tra', 'phieu', ma],
    queryFn: () => doiTraApi.phieu(ma),
    enabled: !!ma,
  })
  const [buocThu, setBuocThu] = useState<'chon' | 'tienMat' | 'qr'>('chon')
  const [dangXuLy, setDangXuLy] = useState(false)
  const [popup, setPopup] = useState<{ loai: 'qrLoi' } | { loai: 'loi'; thongBao: string } | null>(null)

  if (error) return <p className="thong-bao thong-bao--do">{(error as Error).message}</p>
  if (!p) return <p className="ghi-chu">Đang tải…</p>

  const capNhat = (moi: PhieuDoiTra) => {
    queryClient.setQueryData(['doi-tra', 'phieu', ma], moi)
    void queryClient.invalidateQueries({ queryKey: ['doi-tra', 'dang-xu-ly'] })
    void queryClient.invalidateQueries({ queryKey: ['ban-hang', 'san-pham'] })
  }

  const xuLy = async (phuongThuc?: 'Tiền mặt' | 'Chuyển khoản QR', ketQuaQrGiaLap?: 'ThanhCong' | 'ThatBai', maThamChieuQr?: string) => {
    setDangXuLy(true)
    try {
      const moi = await doiTraApi.xuLy({ maPDT: p.maPDT, phuongThuc, ketQuaQrGiaLap, maThamChieuQr })
      // Usability NFR-02: đọc số tiền thu thêm / hoàn lại.
      if (phuongThuc && moi.chenhLech > 0) docDaThu(phuongThuc, moi.chenhLech)
      else if (moi.tienHoanKhach > 0) docTo(`Hoàn lại khách ${docTien(moi.tienHoanKhach)}`)
      capNhat(moi)
      setBuocThu('chon')
    } catch (e) {
      if (e instanceof LoiApi && e.status === 402) setPopup({ loai: 'qrLoi' }) // 6.2.29
      else setPopup({ loai: 'loi', thongBao: e instanceof LoiApi ? e.message : 'Cập nhật không thành công' })
      void refetch()
    } finally {
      setDangXuLy(false)
    }
  }

  const khongHoanTat = async () => {
    setPopup(null)
    setDangXuLy(true)
    try {
      capNhat(await doiTraApi.khongHoanTat(p.maPDT))
    } catch (e) {
      setPopup({ loai: 'loi', thongBao: e instanceof LoiApi ? e.message : 'Cập nhật không thành công' })
    } finally {
      setDangXuLy(false)
    }
  }

  const td = tieuDePhieu(p, buocThu)
  const doi = p.loaiPhieu === 'Đổi hàng'
  const choXuLy = p.trangThai === 'Đã duyệt' && !p.ngayGioHoanTat
  // Thu thêm bằng QR: màn hình chuyển khoản riêng, giống bước "Chuyển khoản QR" của bán hàng (6.5).
  const manQr = choXuLy && doi && p.trangThaiXuLy === 'Chờ thu thêm' && buocThu === 'qr'

  return (
    <>
      <h1 className={td.do ? 'chu-do' : undefined}>{td.chu}</h1>
      {manQr ? (
        <ManChuyenKhoan
          moTa={`Thu thêm chênh lệch đổi hàng · Phiếu ${p.maPDT}`}
          soTien={p.canThuThem}
          dangXuLy={dangXuLy}
          onKetQua={(ok, maQr) => xuLy('Chuyển khoản QR', ok ? 'ThanhCong' : 'ThatBai', maQr)}
          onDoiHinhThuc={() => setBuocThu('chon')}
        />
      ) : (
        <div className="pos">
          <section className="the pos__hang">
            <ThongTinPhieu p={p} />
          </section>

          <aside className="the pos__gio">
            <h2>{doi ? 'Phiếu đổi hàng' : 'Phiếu trả hàng'}</h2>
            <p>
              Phiếu: <NhanTrangThaiPhieu trangThai={p.trangThai} />
            </p>
            <p className={p.trangThai === 'Từ chối' || p.trangThai === 'Không hoàn tất' ? 'chu-do' : 'chu-xanh'}>
              Xử lý: {p.trangThaiXuLy}
            </p>
            <dl className="thong-tin">
              {p.dong.map((d) => (
                <div key={d.maHH} className="thong-tin__dong">
                  <dt>{doi ? 'Đổi' : 'Hàng trả'}</dt>
                  <dd>
                    <MatHang d={d} />
                  </dd>
                </div>
              ))}
              {doi && p.canThuThem > 0 && (
                <>
                  <dt>Cần thu thêm</dt>
                  <dd className="so-lon">{tien(p.canThuThem)}</dd>
                </>
              )}
              {p.tienHoanKhach > 0 && (
                <>
                  <dt>{doi ? 'Hoàn lại khách' : 'Số tiền hoàn'}</dt>
                  <dd className="so-lon">{tien(p.tienHoanKhach)}</dd>
                </>
              )}
            </dl>

            {/* 6.2.17 / 6.2.25 / 6.2.33 / 6.2.36 – chờ Chủ quán duyệt */}
            {p.trangThai === 'Chờ duyệt' && (
              <>
                <button type="button" className="nut nut--chinh nut--rong" disabled={isFetching} onClick={() => void refetch()}>
                  Tải lại kết quả duyệt
                </button>
                {nguoiDung?.vaiTro === 'ChuQuan' && (
                  <button
                    type="button"
                    className="nut nut--rong"
                    onClick={() => navigate(`${GOC_DUYET}/phieu?ma=${encodeURIComponent(p.maPDT)}`)}
                  >
                    Duyệt phiếu
                  </button>
                )}
              </>
            )}

            {/* 6.2.18 – bị từ chối */}
            {p.trangThai === 'Từ chối' && (
              <>
                <p className="thong-bao thong-bao--do">Phiếu đổi trả bị từ chối</p>
                <p>Lý do: {p.lyDoTuChoi}</p>
                <p className="ghi-chu">Thông báo lý do cho khách. Phiếu đã chốt, không sửa được.</p>
              </>
            )}

            {/* 6.2.19 – trả hàng đã duyệt */}
            {choXuLy && !doi && (
              <>
                <h3>Hoàn tiền cho khách</h3>
                <button type="button" className="nut nut--chinh nut--rong" disabled={dangXuLy} onClick={() => xuLy()}>
                  Xác nhận đã hoàn {tien(p.tienHoanKhach)}
                </button>
              </>
            )}

            {/* 6.2.26–6.2.28 – đổi hàng giá cao hơn, thu thêm */}
            {choXuLy && doi && p.trangThaiXuLy === 'Chờ thu thêm' && (
              <>
                <h3 className="tieu-de-nhom">Thu thêm chênh lệch</h3>
                <p className="ghi-chu nhan-nhom">
                  <ChenhLech soTien={p.chenhLech} />
                </p>
                {buocThu === 'chon' && (
                  <div className="luoi-thanh-toan">
                    <button type="button" className="nut nut--chinh" onClick={() => setBuocThu('tienMat')}>
                      Tiền mặt
                    </button>
                    <button type="button" className="nut nut--chinh" onClick={() => setBuocThu('qr')}>
                      Chuyển khoản QR
                    </button>
                  </div>
                )}
                {buocThu === 'tienMat' && (
                  <>
                    <p className="ghi-chu">Thanh toán tiền mặt · Xử lý: Chờ xác nhận thu</p>
                    <button type="button" className="nut nut--chinh nut--rong" disabled={dangXuLy} onClick={() => xuLy('Tiền mặt')}>
                      Đã thu đủ {tien(p.canThuThem)}
                    </button>
                  </>
                )}
                {buocThu === 'tienMat' && (
                  <button type="button" className="nut nut--chu nut--rong" onClick={() => setBuocThu('chon')}>
                    Đổi hình thức thanh toán
                  </button>
                )}
              </>
            )}

            {/* 6.2.37 – đổi hàng giá thấp hơn */}
            {choXuLy && doi && p.trangThaiXuLy === 'Chờ hoàn chênh lệch' && (
              <button type="button" className="nut nut--chinh nut--rong" disabled={dangXuLy} onClick={() => xuLy()}>
                Đã hoàn {tien(p.tienHoanKhach)}
              </button>
            )}

            {/* 6.2.34 – ngang giá, hoặc đã thu thêm nhưng cập nhật kho lỗi (6.2.30) */}
            {choXuLy && doi && p.trangThaiXuLy === 'Chờ cập nhật kho' && (
              <>
                {p.daThuThem && <p className="ghi-chu">Đã thu thêm {tien(p.canThuThem)}. Khoản thu được giữ nguyên.</p>}
                <button type="button" className="nut nut--chinh nut--rong" disabled={dangXuLy} onClick={() => xuLy()}>
                  {p.daThuThem ? 'Thực hiện lại cập nhật' : 'Xác nhận đổi hàng'}
                </button>
              </>
            )}

            {/* 6.2.20 / 6.2.32 / 6.2.35 / 6.2.38 – hoàn tất */}
            {p.ngayGioHoanTat && (
              <>
                <h3>Xử lý hoàn tất</h3>
                <dl className="thong-tin">
                  <dt>Cộng tồn kho</dt>
                  <dd>
                    {p.dong.map((d) => (
                      <div key={d.maHH}>
                        {d.soLuongTra} {d.donViTinh} {d.tenHH}
                      </div>
                    ))}
                  </dd>
                  {doi && (
                    <>
                      <dt>Trừ tồn kho</dt>
                      <dd>
                        {p.dong.map((d) => (
                          <div key={d.maHH}>
                            {d.soLuongMoi} {d.donViTinhMoi} {d.tenHHMoi}
                          </div>
                        ))}
                      </dd>
                    </>
                  )}
                  {!doi && (
                    <>
                      <dt>Giảm doanh thu</dt>
                      <dd>{tien(p.soTienHoan)}</dd>
                      <dt>Đã hoàn tiền</dt>
                      <dd>{tien(p.tienHoanKhach)}</dd>
                    </>
                  )}
                  {doi && p.chenhLech !== 0 && (
                    <>
                      <dt>{p.chenhLech > 0 ? 'Đã thu thêm' : 'Đã hoàn chênh lệch'}</dt>
                      <dd>{tien(Math.abs(p.chenhLech))}</dd>
                    </>
                  )}
                  <dt>Thời điểm hoàn tất</dt>
                  <dd>{ngayGio(p.ngayGioHoanTat)}</dd>
                </dl>
              </>
            )}

            {/* 6.2.31 */}
            {p.trangThai === 'Không hoàn tất' && <p className="thong-bao thong-bao--do">Giao dịch không hoàn tất</p>}

            <button type="button" className="nut nut--chu nut--rong" onClick={() => navigate(GOC_DOI_TRA)}>
              Về danh sách
            </button>
          </aside>
        </div>
      )}

      {/* 6.2.29 */}
      <HopThoai
        mo={popup?.loai === 'qrLoi'}
        kieu="loi"
        onDong={() => setPopup(null)}
        nut={
          <>
            <button type="button" className="nut" disabled={dangXuLy} onClick={khongHoanTat}>
              Hủy giao dịch
            </button>
            <button
              type="button"
              className="nut nut--chinh"
              onClick={() => {
                setPopup(null)
                setBuocThu('chon')
              }}
            >
              Thanh toán lại
            </button>
          </>
        }
      >
        <p className="thong-bao thong-bao--do">Thanh toán chưa thành công</p>
      </HopThoai>

      {/* 6.2.21 / 6.2.30 */}
      <HopThoai
        mo={popup?.loai === 'loi'}
        kieu="loi"
        onDong={() => setPopup(null)}
        nut={
          <button type="button" className="nut nut--chinh" onClick={() => setPopup(null)}>
            Đóng
          </button>
        }
      >
        <p className="thong-bao thong-bao--do">Cập nhật không thành công</p>
        {popup?.loai === 'loi' && popup.thongBao !== 'Cập nhật không thành công' && <p className="ghi-chu">{popup.thongBao}</p>}
      </HopThoai>
    </>
  )
}

// ====================================================================== UC_6.4 Duyệt phiếu đổi trả

const TAB_DUYET = ['Chờ duyệt', 'Đã duyệt', 'Từ chối', 'Không hoàn tất'] as const

/** Màn hình 6.4.1 – danh sách phiếu chờ duyệt, mới nhất trước (BR09). */
export function DuyetDoiTraDanhSach() {
  const navigate = useNavigate()
  const [trangThai, setTrangThai] = useState<string>('Chờ duyệt')
  const { data, error, isFetching } = useQuery({
    queryKey: ['duyet-doi-tra', trangThai],
    queryFn: () => duyetDoiTraApi.danhSach(trangThai),
  })
  const { dsTrang, phanTrang } = useTrang(data, `${trangThai}|${data?.length}`)
  return (
    <>
      <h1>Duyệt phiếu đổi trả</h1>
      <section className="the the--rong">
        <div className="tab" role="tablist" aria-label="Lọc theo trạng thái phiếu">
          {TAB_DUYET.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={trangThai === t}
              className={`nut nut--nho ${trangThai === t ? 'nut--chon' : ''}`}
              onClick={() => setTrangThai(t)}
            >
              {t}
            </button>
          ))}
        </div>
        {error && <p className="thong-bao thong-bao--do">Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.</p>}
        {data && (
          <>
            <p className="ghi-chu">
              {data.length} phiếu đang ở trạng thái {trangThai}
            </p>
            {data.length === 0 ? (
              <p className="ghi-chu">Không có phiếu nào.</p>
            ) : (
              <div className={`bang-cuon ${isFetching ? 'dang-tai-mo' : ''}`}>
                <table className="bang">
                  <thead>
                    <tr>
                      <th>Mã phiếu</th>
                      <th>Hóa đơn gốc</th>
                      <th>Khách hàng</th>
                      <th>Loại phiếu</th>
                      <th>Người lập · thời gian</th>
                      <th>Trạng thái</th>
                      <th>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dsTrang.map((p) => (
                      <tr key={p.maPDT}>
                        <td>{p.maPDT}</td>
                        <td>{p.maHD}</td>
                        <td>{p.tenKhach ?? <span className="ghi-chu">Khách vãng lai</span>}</td>
                        <td>{p.loaiPhieu}</td>
                        <td>
                          {p.vaiTroNguoiLap} {p.nguoiLap} · {ngayGio(p.ngayGioLap)}
                        </td>
                        <td>
                          <NhanTrangThaiPhieu trangThai={p.trangThai} />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="nut nut--nho"
                            onClick={() => navigate(`${GOC_DUYET}/phieu?ma=${encodeURIComponent(p.maPDT)}`)}
                          >
                            Xem
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {phanTrang}
          </>
        )}
      </section>
    </>
  )
}

/** Màn hình 6.4.2–6.4.9 – chi tiết phiếu, duyệt hoặc từ chối. */
export function DuyetDoiTraChiTiet() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [params] = useSearchParams()
  const ma = params.get('ma') ?? ''
  const { data: p, error } = useQuery({ queryKey: ['doi-tra', 'phieu', ma], queryFn: () => doiTraApi.phieu(ma), enabled: !!ma })
  const [moTuChoi, setMoTuChoi] = useState(false)
  const [lyDo, setLyDo] = useState('')
  const [loiLyDo, setLoiLyDo] = useState<string | null>(null)
  const [ketQua, setKetQua] = useState<PhieuDoiTra | null>(null)
  const [loi, setLoi] = useState<string | null>(null)
  const [dangXuLy, setDangXuLy] = useState(false)

  const veDanhSach = () => navigate(GOC_DUYET)

  // 6.4.7
  if (error)
    return (
      <HopThoai
        mo
        kieu="loi"
        onDong={veDanhSach}
        nut={
          <button type="button" className="nut nut--chinh" onClick={veDanhSach}>
            Kết thúc
          </button>
        }
      >
        <p className="thong-bao thong-bao--do">Đã xảy ra lỗi</p>
        <p>Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.</p>
      </HopThoai>
    )
  if (!p) return <p className="ghi-chu">Đang tải…</p>

  const xong = async (lam: () => Promise<PhieuDoiTra>) => {
    setDangXuLy(true)
    try {
      const kq = await lam()
      setKetQua(kq)
      setMoTuChoi(false)
      queryClient.setQueryData(['doi-tra', 'phieu', ma], kq)
      void queryClient.invalidateQueries({ queryKey: ['duyet-doi-tra'] })
    } catch (e) {
      if (e instanceof LoiApi && e.loi.lyDo) setLoiLyDo(e.loi.lyDo)
      else {
        setMoTuChoi(false)
        setLoi(e instanceof LoiApi ? e.message : 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.')
      }
    } finally {
      setDangXuLy(false)
    }
  }

  const xacNhanTuChoi = () => {
    if (!lyDo.trim()) return setLoiLyDo('Vui lòng nhập lý do từ chối.') // 6.4.5
    setLoiLyDo(null)
    void xong(() => duyetDoiTraApi.tuChoi(p.maPDT, lyDo))
  }

  const hien = ketQua ?? p
  return (
    <>
      <h1>
        {ketQua ? (ketQua.trangThai === 'Đã duyệt' ? 'Đã duyệt phiếu đổi trả' : 'Từ chối phiếu đổi trả') : 'Chi tiết phiếu đổi trả'}
      </h1>
      <section className="the the--vua">
        <ThongTinPhieu p={hien} />
        {ketQua?.trangThai === 'Đã duyệt' && <p className="thong-bao thong-bao--xanh">Đã duyệt phiếu. Kết quả đã gửi cho người lập phiếu.</p>}
        {hien.trangThai === 'Từ chối' && <p className="thong-bao thong-bao--do">Lý do: {hien.lyDoTuChoi}</p>}
        <div className="hang-nut">
          <button type="button" className="nut" onClick={veDanhSach}>
            {ketQua ? 'Về danh sách phiếu chờ duyệt' : 'Quay lại'}
          </button>
          {!ketQua && p.trangThai === 'Chờ duyệt' && (
            <>
              <button type="button" className="nut nut--nguy-hiem" disabled={dangXuLy} onClick={() => setMoTuChoi(true)}>
                Từ chối
              </button>
              <button
                type="button"
                className="nut nut--chinh"
                disabled={dangXuLy}
                onClick={() => void xong(() => duyetDoiTraApi.duyet(p.maPDT))}
              >
                Duyệt
              </button>
            </>
          )}
        </div>
      </section>

      {/* 6.4.3–6.4.5 */}
      <HopThoai
        mo={moTuChoi}
        tieuDe="Từ chối phiếu"
        onDong={() => setMoTuChoi(false)}
        nut={
          <>
            <button type="button" className="nut" onClick={() => setMoTuChoi(false)}>
              Hủy
            </button>
            <button type="button" className="nut nut--nguy-hiem-dac" disabled={dangXuLy} onClick={xacNhanTuChoi}>
              Xác nhận từ chối
            </button>
          </>
        }
      >
        <label className="truong">
          <span className="truong__nhan">Lý do từ chối (bắt buộc)</span>
          <textarea
            className={`truong__o ${loiLyDo ? 'truong__o--loi' : ''}`}
            rows={3}
            maxLength={255}
            placeholder="Nhập lý do từ chối…"
            value={lyDo}
            onChange={(e) => setLyDo(e.target.value)}
          />
          {loiLyDo && <span className="truong__loi">{loiLyDo}</span>}
        </label>
      </HopThoai>

      <HopThoai
        mo={!!loi}
        kieu="loi"
        onDong={() => setLoi(null)}
        nut={
          <button type="button" className="nut nut--chinh" onClick={() => setLoi(null)}>
            Đóng
          </button>
        }
      >
        <p className="thong-bao thong-bao--do">{loi}</p>
      </HopThoai>
    </>
  )
}
