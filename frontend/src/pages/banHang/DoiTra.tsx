import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { LoiApi } from '../../api/client'
import {
  banHangApi,
  doiTraApi,
  type DongDoiTra,
  type HoaDonDoiTra,
  type LoaiPhieuDoiTra,
  type SanPhamBan,
  type XemTruocPhieu,
  type YeuCauLapPhieu,
} from '../../api/nghiepVu'
import { HopThoai } from '../../components/HopThoai'
import { TimHoaDon } from '../../components/TimHoaDon'
import { NhanTrangThaiHoaDon } from '../../components/XemHoaDon'
import { ngayGio, so, tien } from '../../lib/dinhDang'
import { ChenhLech, MatHang, NhanTrangThaiPhieu } from './ThongTinPhieu'

const GOC_DOI_TRA ='/quan-ly-ban-hang/doi-tra'
const TINH_TRANG_DAT = ['Còn nguyên vẹn', 'Chưa mở bao bì', 'Chưa qua sử dụng']
const LOI_NSX = 'Lỗi do nhà sản xuất'

/** Màn hình 6.2.1–6.2.5 – danh sách hóa đơn; kèm các phiếu đang chờ xử lý để mở lại. */
export function DoiTraDanhSach() {
  const navigate = useNavigate()
  const { data } = useQuery({ queryKey: ['doi-tra', 'dang-xu-ly'], queryFn: doiTraApi.dangXuLy })
  return (
    <>
      <TimHoaDon
        tieuDe="Xử lý đổi trả"
        thongBaoRong="Không có hóa đơn phù hợp."
        onXem={(ma) => navigate(`${GOC_DOI_TRA}/hoa-don?ma=${encodeURIComponent(ma)}`)}
      />
      {data && data.length > 0 && (
        <section className="the the--rong">
          <h2>Phiếu đổi trả đang xử lý · {data.length} phiếu</h2>
          <div className="bang-cuon">
            <table className="bang">
              <thead>
                <tr>
                  <th>Mã phiếu</th>
                  <th>Hóa đơn gốc</th>
                  <th>Loại phiếu</th>
                  <th>Người lập · thời gian</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {data.map((p) => (
                  <tr key={p.maPDT}>
                    <td>{p.maPDT}</td>
                    <td>{p.maHD}</td>
                    <td>{p.loaiPhieu}</td>
                    <td>
                      {p.nguoiLap} · {ngayGio(p.ngayGioLap)}
                    </td>
                    <td>
                      <NhanTrangThaiPhieu trangThai={p.trangThai} /> <span className="ghi-chu">{p.trangThaiXuLy}</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="nut nut--nho"
                        onClick={() => navigate(`${GOC_DOI_TRA}/phieu?ma=${encodeURIComponent(p.maPDT)}`)}
                      >
                        Mở
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  )
}

/** Màn hình 6.2.6–6.2.24 – kiểm tra hóa đơn và lập phiếu đổi/trả. */
export function DoiTraHoaDon() {
  const [params] = useSearchParams()
  const ma = params.get('ma') ?? ''
  const { data, error } = useQuery({ queryKey: ['doi-tra', 'hoa-don', ma], queryFn: () => doiTraApi.hoaDon(ma), enabled: !!ma })
  if (error) return <p className="thong-bao thong-bao--do">{(error as Error).message}</p>
  if (!data) return <p className="ghi-chu">Đang tải…</p>
  return <LapPhieu key={ma} hd={data} />
}

type Buoc = 'chon' | 'tinhTrang' | 'loiNsx' | 'khongDat' | 'hinhThuc' | 'chonHangMoi' | 'chenhLech'

interface HangMoi {
  sp: SanPhamBan
  soLuong: string
}

function LapPhieu({ hd }: { hd: HoaDonDoiTra }) {
  const navigate = useNavigate()
  const h = hd.hoaDon
  const [buoc, setBuoc] = useState<Buoc>('chon')
  const [soLuong, setSoLuong] = useState<Record<string, string>>({})
  const [loiSoLuong, setLoiSoLuong] = useState<Record<string, string>>({})
  const [tinhTrang, setTinhTrang] = useState<string[]>([])
  const [moTaLoi, setMoTaLoi] = useState('')
  const [loiMoTa, setLoiMoTa] = useState<string | null>(null)
  const [lyDo, setLyDo] = useState('')
  const [loiLyDo, setLoiLyDo] = useState<string | null>(null)
  const [hangMoi, setHangMoi] = useState<Record<string, HangMoi>>({})
  const [dangChonCho, setDangChonCho] = useState<string | null>(null)
  const [xemTruoc, setXemTruoc] = useState<XemTruocPhieu | null>(null)
  const [dangXuLy, setDangXuLy] = useState(false)
  const [loi, setLoi] = useState<string | null>(null)

  const daChon = hd.dong.filter((d) => soLuong[d.maHH] !== undefined)
  const sl = (d: DongDoiTra) => Number(soLuong[d.maHH]) || 0
  const loiNsx = tinhTrang.includes(LOI_NSX)
  const datDieuKien = TINH_TRANG_DAT.every((t) => tinhTrang.includes(t))
  const giaTriTra = daChon.reduce((s, d) => s + sl(d) * d.donGia, 0)

  // ------------------------------------------------------------ Không đủ điều kiện (6.2.6–6.2.9)
  if (!hd.duocDoiTra) {
    return (
      <>
        <h1 className="chu-do">{hd.tieuDeLoi}</h1>
        <section className="the the--vua">
          <BangHoaDon hd={hd} khoa />
          <p>
            <span className="nhan nhan--do">Không được đổi trả</span>
          </p>
          <p className="thong-bao thong-bao--do">{hd.thongBaoLoi}</p>
          <p className="ghi-chu">Không tạo phiếu và không thay đổi dữ liệu.</p>
          <button type="button" className="nut nut--chinh" onClick={() => navigate(GOC_DOI_TRA)}>
            Về danh sách
          </button>
        </section>
      </>
    )
  }

  const yeuCau = (loaiPhieu: LoaiPhieuDoiTra): YeuCauLapPhieu => ({
    maHD: h.maHD,
    loaiPhieu,
    dong: daChon.map((d) => ({
      maHH: d.maHH,
      soLuong: sl(d),
      maHHMoi: loaiPhieu === 'Đổi hàng' ? (hangMoi[d.maHH]?.sp.maHH ?? null) : null,
      soLuongMoi: loaiPhieu === 'Đổi hàng' ? Number(hangMoi[d.maHH]?.soLuong) || null : null,
    })),
    tinhTrang,
    loiNhaSanXuat: loiNsx,
    moTaLoi: loiNsx ? moTaLoi : null,
    lyDoDoiTra: lyDo,
  })

  const ganLoi = (e: unknown) => {
    if (e instanceof LoiApi) {
      const loiSl = Object.fromEntries(
        Object.entries(e.loi).filter(([k]) => k.startsWith('soLuong.')).map(([k, v]) => [k.slice(8), v]),
      )
      if (Object.keys(loiSl).length) {
        setLoiSoLuong(loiSl)
        setBuoc('chon')
        return
      }
      if (e.loi.lyDoDoiTra) {
        setLoiLyDo(e.loi.lyDoDoiTra)
        setBuoc('hinhThuc')
        return
      }
      if (e.loi.moTaLoi) {
        setLoiMoTa(e.loi.moTaLoi)
        setBuoc('loiNsx')
        return
      }
      setLoi(e.message)
    } else setLoi('Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.')
  }

  // Bước 6 / 6.a
  const tiepTucChon = () => {
    const l: Record<string, string> = {}
    for (const d of daChon)
      if (!/^\d+$/.test(soLuong[d.maHH] ?? '') || sl(d) <= 0 || sl(d) > d.conLai)
        l[d.maHH] = `Số lượng trả không hợp lệ. Số lượng còn được đổi trả: ${d.conLai}.`
    setLoiSoLuong(l)
    if (daChon.length === 0) return setLoi('Vui lòng chọn mặt hàng cần đổi trả.')
    if (Object.keys(l).length === 0) setBuoc('tinhTrang')
  }

  const kiemTraLyDo = () => {
    if (!lyDo.trim()) {
      setLoiLyDo('Vui lòng nhập lý do đổi trả.')
      return false
    }
    setLoiLyDo(null)
    return true
  }

  // Bước 9–12: trả hàng → tạo phiếu chờ duyệt.
  const guiPhieu = async (loaiPhieu: LoaiPhieuDoiTra) => {
    if (!kiemTraLyDo()) return
    setDangXuLy(true)
    try {
      const p = await doiTraApi.lapPhieu(yeuCau(loaiPhieu))
      navigate(`${GOC_DOI_TRA}/phieu?ma=${encodeURIComponent(p.maPDT)}`, { replace: true })
    } catch (e) {
      ganLoi(e)
    } finally {
      setDangXuLy(false)
    }
  }

  // 9.a.2–9.a.3: kiểm tra tồn hàng mới và tính chênh lệch ở server.
  const xemChenhLech = async () => {
    setDangXuLy(true)
    try {
      setXemTruoc(await doiTraApi.xemTruoc(yeuCau('Đổi hàng')))
      setBuoc('chenhLech')
    } catch (e) {
      ganLoi(e)
    } finally {
      setDangXuLy(false)
    }
  }

  const doiTinhTrang = (t: string) => setTinhTrang((ds) => (ds.includes(t) ? ds.filter((x) => x !== t) : [...ds, t]))

  const tieuDe: Record<Buoc, string> = {
    chon: 'Chọn sản phẩm và số lượng trả',
    tinhTrang: 'Kiểm tra tình trạng hàng hóa',
    loiNsx: 'Hàng lỗi do nhà sản xuất',
    khongDat: 'Hàng không đủ điều kiện',
    hinhThuc: 'Chọn trả hàng và xem tiền hoàn',
    chonHangMoi: 'Chọn hàng mới để đổi',
    chenhLech: 'Xem chênh lệch đổi hàng',
  }

  return (
    <>
      <h1 className={buoc === 'khongDat' ? 'chu-do' : undefined}>{tieuDe[buoc]}</h1>
      <div className="pos">
        <section className="the pos__hang">
          {buoc === 'chonHangMoi' ? (
            <ChonHangMoi
              dangChonCho={dangChonCho ? hd.dong.find((d) => d.maHH === dangChonCho)! : null}
              onChon={(sp) => {
                if (!dangChonCho) return
                const d = hd.dong.find((x) => x.maHH === dangChonCho)!
                setHangMoi({ ...hangMoi, [dangChonCho]: { sp, soLuong: String(sl(d)) } })
                setDangChonCho(daChon.find((x) => x.maHH !== dangChonCho && !hangMoi[x.maHH])?.maHH ?? null)
              }}
            />
          ) : (
            <BangHoaDon
              hd={hd}
              khoa={buoc !== 'chon'}
              daChon={(maHH) => soLuong[maHH] !== undefined}
              onChon={(d) => {
                const moi = { ...soLuong }
                if (moi[d.maHH] !== undefined) delete moi[d.maHH]
                else moi[d.maHH] = d.conLai > 0 ? '1' : '0'
                setSoLuong(moi)
              }}
            />
          )}
        </section>

        <aside className="the pos__gio">
          {buoc === 'chon' && (
            <>
              <p className="thong-bao thong-bao--xanh">{hd.thoiHan}</p>
              <h2>Chọn hàng và số lượng</h2>
              {daChon.map((d) => (
                <div key={d.maHH} className="khung-dong-doi-tra">
                  <strong>{d.tenHH}</strong>
                  <dl className="thong-tin">
                    <dt>Đã mua</dt>
                    <dd>
                      {d.daMua} {d.donViTinh}
                    </dd>
                    <dt>Đã duyệt / Chờ duyệt</dt>
                    <dd className="chu-xanh">
                      {d.daDoiTra} / {d.dangCho}
                    </dd>
                    <dt>Còn đổi trả</dt>
                    <dd>
                      {d.conLai} {d.donViTinh}
                    </dd>
                  </dl>
                  <label className="truong">
                    <span className="truong__nhan">Số lượng yêu cầu</span>
                    <input
                      className={`truong__o ${loiSoLuong[d.maHH] ? 'truong__o--loi' : ''}`}
                      inputMode="numeric"
                      value={soLuong[d.maHH]}
                      onChange={(e) => setSoLuong({ ...soLuong, [d.maHH]: e.target.value.trim() })}
                    />
                    {loiSoLuong[d.maHH] && <span className="truong__loi">{loiSoLuong[d.maHH]}</span>}
                  </label>
                </div>
              ))}
              <button type="button" className="nut nut--chinh nut--rong" disabled={daChon.length === 0} onClick={tiepTucChon}>
                Tiếp tục
              </button>
              <button type="button" className="nut nut--chu nut--rong" onClick={() => navigate(GOC_DOI_TRA)}>
                Về danh sách
              </button>
            </>
          )}

          {buoc === 'tinhTrang' && (
            <>
              <h2>Kiểm tra trực tiếp</h2>
              <div className="cot-chon">
                {[...TINH_TRANG_DAT, LOI_NSX].map((t) => (
                  <label key={t} className="o-chon">
                    <input type="checkbox" checked={tinhTrang.includes(t)} onChange={() => doiTinhTrang(t)} />
                    {t}
                  </label>
                ))}
              </div>
              <button
                type="button"
                className="nut nut--chinh nut--rong"
                disabled={!datDieuKien || loiNsx}
                onClick={() => setBuoc('hinhThuc')}
              >
                Hàng đủ điều kiện
              </button>
              <button type="button" className="nut nut--rong" disabled={!loiNsx} onClick={() => setBuoc('loiNsx')}>
                Ghi nhận lỗi nhà sản xuất
              </button>
              <button type="button" className="nut nut--nguy-hiem nut--rong" onClick={() => setBuoc('khongDat')}>
                Hàng không đủ điều kiện
              </button>
              <button type="button" className="nut nut--chu nut--rong" onClick={() => setBuoc('chon')}>
                Quay lại
              </button>
            </>
          )}

          {buoc === 'loiNsx' && (
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault()
                if (!moTaLoi.trim()) return setLoiMoTa('Vui lòng ghi rõ mô tả lỗi do nhà sản xuất.') // BR10
                setLoiMoTa(null)
                setBuoc('hinhThuc')
              }}
            >
              <h2>Lỗi do nhà sản xuất</h2>
              <label className="truong">
                <span className="truong__nhan">
                  Mô tả lỗi bắt buộc<span className="truong__sao"> *</span>
                </span>
                <textarea
                  className={`truong__o ${loiMoTa ? 'truong__o--loi' : ''}`}
                  rows={3}
                  maxLength={255}
                  placeholder="Nhập mô tả lỗi"
                  value={moTaLoi}
                  onChange={(e) => setMoTaLoi(e.target.value)}
                  autoFocus
                />
                {loiMoTa && <span className="truong__loi">{loiMoTa}</span>}
              </label>
              <button type="submit" className="nut nut--chinh nut--rong">
                Tiếp tục
              </button>
              <button type="button" className="nut nut--chu nut--rong" onClick={() => setBuoc('tinhTrang')}>
                Quay lại
              </button>
            </form>
          )}

          {buoc === 'khongDat' && (
            <>
              <p className="thong-bao thong-bao--do">Từ chối đổi trả</p>
              <p className="ghi-chu">Hàng không còn nguyên vẹn hoặc đã qua sử dụng và không phải lỗi do nhà sản xuất. Không tạo phiếu.</p>
              <button type="button" className="nut nut--chinh nut--rong" onClick={() => navigate(GOC_DOI_TRA)}>
                Về danh sách
              </button>
            </>
          )}

          {buoc === 'hinhThuc' && (
            <>
              <h2>Chọn hình thức xử lý</h2>
              <dl className="thong-tin">
                <dt>Hàng trả</dt>
                <dd>
                  {daChon.map((d) => (
                    <div key={d.maHH}>
                      {d.tenHH} × {sl(d)}
                    </div>
                  ))}
                </dd>
                <dt>Giá trị hàng trả</dt>
                <dd>{tien(giaTriTra)}</dd>
                <dt>Giảm công nợ</dt>
                <dd>{tien(0)}</dd>
                <dt>Tiền hoàn khách</dt>
                <dd className="so-lon">{tien(giaTriTra)}</dd>
              </dl>
              <TruongLyDo lyDo={lyDo} loi={loiLyDo} onDoi={setLyDo} />
              <button type="button" className="nut nut--chinh nut--rong" disabled={dangXuLy} onClick={() => guiPhieu('Trả hàng')}>
                Trả hàng · gửi duyệt
              </button>
              <button
                type="button"
                className="nut nut--rong"
                onClick={() => {
                  if (!kiemTraLyDo()) return
                  setDangChonCho(daChon.find((d) => !hangMoi[d.maHH])?.maHH ?? daChon[0]?.maHH ?? null)
                  setBuoc('chonHangMoi')
                }}
              >
                Đổi hàng · chọn hàng mới
              </button>
              <button type="button" className="nut nut--chu nut--rong" onClick={() => setBuoc('tinhTrang')}>
                Quay lại
              </button>
            </>
          )}

          {buoc === 'chonHangMoi' && (
            <>
              <h2>Đổi hàng</h2>
              <dl className="thong-tin">
                <dt>Giá trị hàng cũ</dt>
                <dd>{tien(giaTriTra)}</dd>
              </dl>
              {daChon.map((d) => {
                const m = hangMoi[d.maHH]
                const slMoi = Number(m?.soLuong) || 0
                const thieu = m && slMoi > m.sp.tonBanDuoc
                return (
                  <div key={d.maHH} className={`khung-dong-doi-tra ${dangChonCho === d.maHH ? 'khung-dong-doi-tra--chon' : ''}`}>
                    <strong>
                      {d.tenHH} × {sl(d)}
                    </strong>
                    {m ? (
                      <>
                        <p>
                          Hàng mới: {m.sp.tenHH} · {tien(m.sp.giaBan)}
                        </p>
                        <label className="truong">
                          <span className="truong__nhan">Số lượng đổi ({m.sp.donViTinh})</span>
                          <input
                            className={`truong__o ${thieu ? 'truong__o--loi' : ''}`}
                            inputMode="numeric"
                            value={m.soLuong}
                            onChange={(e) => setHangMoi({ ...hangMoi, [d.maHH]: { ...m, soLuong: e.target.value.trim() } })}
                          />
                          {thieu && (
                            <span className="truong__loi">
                              Hàng mới không đủ tồn kho. Yêu cầu {slMoi} {m.sp.donViTinh}, tồn hiện có {m.sp.tonBanDuoc} {m.sp.donViTinh}.
                            </span>
                          )}
                        </label>
                        <p className="ghi-chu">
                          Tồn hiện có {so(m.sp.tonBanDuoc)} {m.sp.donViTinh} · Yêu cầu {slMoi} {m.sp.donViTinh}.
                        </p>
                      </>
                    ) : (
                      <p className="ghi-chu">Chưa chọn hàng mới.</p>
                    )}
                    <button type="button" className="nut nut--nho" onClick={() => setDangChonCho(d.maHH)}>
                      {m ? 'Chọn lại hàng mới' : 'Chọn hàng mới'}
                    </button>
                  </div>
                )
              })}
              <button
                type="button"
                className="nut nut--chinh nut--rong"
                disabled={dangXuLy || daChon.some((d) => !hangMoi[d.maHH] || !(Number(hangMoi[d.maHH].soLuong) > 0))}
                onClick={xemChenhLech}
              >
                Xem chênh lệch
              </button>
              <button type="button" className="nut nut--chu nut--rong" onClick={() => setBuoc('hinhThuc')}>
                Quay lại
              </button>
            </>
          )}

          {buoc === 'chenhLech' && xemTruoc && (
            <>
              <h2>Chênh lệch đổi hàng</h2>
              <dl className="thong-tin">
                <dt>Mặt hàng</dt>
                <dd>
                  {xemTruoc.dong.map((d) => (
                    <div key={d.maHH}>
                      <MatHang d={d} />
                    </div>
                  ))}
                </dd>
                <dt>Giá trị hàng cũ</dt>
                <dd>{tien(xemTruoc.soTienHoan)}</dd>
                <dt>Giá hiện tại hàng mới</dt>
                <dd>{tien(xemTruoc.giaTriHangMoi)}</dd>
                <dt>Chênh lệch giá</dt>
                <dd>
                  <ChenhLech soTien={xemTruoc.chenhLech} />
                </dd>
                <dt>{xemTruoc.tienHoanKhach > 0 ? 'Tiền hoàn khách' : 'Cần thu thêm'}</dt>
                <dd className="so-lon">{tien(xemTruoc.tienHoanKhach > 0 ? xemTruoc.tienHoanKhach : xemTruoc.canThuThem)}</dd>
              </dl>
              <button type="button" className="nut nut--chinh nut--rong" disabled={dangXuLy} onClick={() => guiPhieu('Đổi hàng')}>
                Tạo phiếu đổi · gửi duyệt
              </button>
              <button type="button" className="nut nut--chu nut--rong" onClick={() => setBuoc('chonHangMoi')}>
                Quay lại
              </button>
            </>
          )}
        </aside>
      </div>

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

function TruongLyDo({ lyDo, loi, onDoi }: { lyDo: string; loi: string | null; onDoi: (v: string) => void }) {
  return (
    <label className="truong">
      <span className="truong__nhan">
        Lý do đổi trả<span className="truong__sao"> *</span>
      </span>
      <input
        className={`truong__o ${loi ? 'truong__o--loi' : ''}`}
        maxLength={255}
        placeholder="Ví dụ: Khách mua nhầm, khách muốn đổi vị"
        value={lyDo}
        onChange={(e) => onDoi(e.target.value)}
      />
      {loi && <span className="truong__loi">{loi}</span>}
    </label>
  )
}

/** Hóa đơn gốc với ô chọn từng mặt hàng (6.2.6, 6.2.10). */
function BangHoaDon({
  hd,
  khoa,
  daChon,
  onChon,
}: {
  hd: HoaDonDoiTra
  khoa: boolean
  daChon?: (maHH: string) => boolean
  onChon?: (d: DongDoiTra) => void
}) {
  const h = hd.hoaDon
  return (
    <article className="hoa-don-in">
      <header className="hoa-don-in__dau">
        <strong className="hoa-don-in__cua-hang">{h.tenCuaHang} · Hóa đơn gốc</strong>
        <span>{h.maHD}</span>
      </header>
      <dl className="thong-tin">
        <dt>Ngày lập</dt>
        <dd>{ngayGio(h.ngayGioLap)}</dd>
        <dt>Người bán</dt>
        <dd>{h.nguoiBan}</dd>
        <dt>Khách hàng</dt>
        <dd>{h.tenKhach ?? 'Khách vãng lai'}</dd>
        <dt>Điện thoại</dt>
        <dd>{h.sdtKhach ?? '—'}</dd>
        <dt>Loại / Trạng thái</dt>
        <dd>
          {h.loaiHoaDon} / <NhanTrangThaiHoaDon trangThai={h.trangThai} />
        </dd>
      </dl>
      <div className="bang-cuon">
        <table className="bang">
          <thead>
            <tr>
              <th>Chọn</th>
              <th>Tên / ĐVT</th>
              <th className="so">SL</th>
              <th className="so">Đơn giá</th>
              <th className="so">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {hd.dong.map((d) => (
              <tr key={d.maHH}>
                <td>
                  <input
                    type="checkbox"
                    className="o-tick"
                    disabled={khoa || d.conLai === 0}
                    checked={daChon?.(d.maHH) ?? false}
                    onChange={() => onChon?.(d)}
                    aria-label={`Chọn ${d.tenHH}`}
                  />
                </td>
                <td>
                  {d.tenHH} · <span className="ghi-chu">{d.donViTinh}</span>
                  {d.conLai === 0 && !khoa && <div className="ghi-chu">Đã hết số lượng được đổi trả</div>}
                </td>
                <td className="so">{d.daMua}</td>
                <td className="so">{tien(d.donGia)}</td>
                <td className="so">{tien(d.donGia * d.daMua)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="thong-tin thong-tin--tong">
        <dt>Tổng tiền hàng</dt>
        <dd>{tien(h.tongTienHang)}</dd>
        <dt>Tổng thanh toán</dt>
        <dd>{tien(h.tongTienThanhToan)}</dd>
        <dt>Đã thanh toán</dt>
        <dd className="chu-xanh">{tien(h.soTienDaTra)}</dd>
        <dt>Phương thức</dt>
        <dd>{h.phuongThuc}</dd>
      </dl>
    </article>
  )
}

/** Màn hình 6.2.22 – tìm và chọn hàng mới. */
function ChonHangMoi({ dangChonCho, onChon }: { dangChonCho: DongDoiTra | null; onChon: (sp: SanPhamBan) => void }) {
  const [oTim, setOTim] = useState('')
  const [tuKhoa, setTuKhoa] = useState('')
  const { data, isFetching } = useQuery({
    queryKey: ['ban-hang', 'san-pham', tuKhoa],
    queryFn: () => banHangApi.sanPham(tuKhoa),
  })
  return (
    <>
      <h2>Tìm và chọn hàng mới{dangChonCho ? ` cho ${dangChonCho.tenHH}` : ''}</h2>
      <form
        className="o-tim"
        onSubmit={(e) => {
          e.preventDefault()
          setTuKhoa(oTim.trim())
        }}
      >
        <input
          className="truong__o"
          placeholder="Nhập tên hoặc mã hàng"
          value={oTim}
          onChange={(e) => setOTim(e.target.value)}
          aria-label="Tên hoặc mã hàng mới"
        />
        <button type="submit" className="nut">
          Tìm kiếm
        </button>
      </form>
      {data && data.length === 0 && <p className="thong-bao thong-bao--do">Không tìm thấy sản phẩm</p>}
      {data && data.length > 0 && (
        <div className={`bang-cuon ${isFetching ? 'dang-tai-mo' : ''}`}>
          <table className="bang">
            <thead>
              <tr>
                <th>Tên hàng</th>
                <th className="so">Giá bán</th>
                <th className="so">Tồn</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {data.map((sp) => (
                <tr key={sp.maHH}>
                  <td>
                    {sp.tenHH} · <span className="ghi-chu">{sp.donViTinh}</span>
                  </td>
                  <td className="so">{tien(sp.giaBan)}</td>
                  <td className="so">{so(sp.tonBanDuoc)}</td>
                  <td>
                    <button
                      type="button"
                      className="nut nut--nho nut--chinh"
                      disabled={!dangChonCho || sp.tonBanDuoc === 0}
                      onClick={() => onChon(sp)}
                    >
                      Chọn
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
