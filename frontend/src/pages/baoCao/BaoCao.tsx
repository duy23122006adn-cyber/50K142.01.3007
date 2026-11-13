import { useQuery } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { LoiApi } from '../../api/client'
import { baoCaoApi, type ChiTieuSoSanh, type DongSoLuongBan } from '../../api/nghiepVu'
import { ChonKy, MoTaKy, type CheDoKy, type Ky } from '../../components/ChonKy'
import { ngay, so, tien } from '../../lib/dinhDang'
import { useTrang } from '../../lib/useTrang'

const GOC = '/bao-cao'
const CHE_DO: CheDoKy[] = ['ngay', 'thang', 'quy', 'tuyChon']
const LOI_HE_THONG = 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.'

/** Kỳ lưu trên URL (?tu=&den=&che=) để "Quay lại" từ trang so sánh / top giữ nguyên kết quả. */
function docKy(params: URLSearchParams, tienTo = ''): Ky | null {
  const tu = params.get(`${tienTo}tu`)
  const den = params.get(`${tienTo}den`)
  if (!tu || !den) return null
  const che = params.get(`${tienTo}che`) as CheDoKy | null
  return { tu, den, cheDo: che && CHE_DO.includes(che) ? che : 'tuyChon' }
}

const thamSoKy = (ky: Ky) => new URLSearchParams({ tu: ky.tu, den: ky.den, che: ky.cheDo })

/** Tách lỗi API: lỗi theo trường (400) và thông báo chung (vd. 404 "Không tìm thấy dữ liệu bán hàng!"). */
function tachLoi(error: unknown): { truong: Record<string, string>; chung: string | null } {
  if (!error) return { truong: {}, chung: null }
  if (error instanceof LoiApi) return Object.keys(error.loi).length ? { truong: error.loi, chung: null } : { truong: {}, chung: error.message }
  return { truong: {}, chung: LOI_HE_THONG }
}

/** Thông báo đỏ căn giữa khu vực nội dung (màn hình 5.1.10, 5.2.10, 5.3.10). */
function KhongCoDuLieu({ thongBao }: { thongBao: string }) {
  return (
    <section className="the the--rong">
      <p className="thong-bao thong-bao--do canh-giua">{thongBao}</p>
    </section>
  )
}

function OSoLieu({ nhan, giaTri, chinh }: { nhan: string; giaTri: ReactNode; chinh?: boolean }) {
  return (
    <div className={`o-so-lieu ${chinh ? 'o-so-lieu--chinh' : ''}`}>
      <span className="o-so-lieu__nhan">{nhan}</span>
      <strong className="o-so-lieu__gia-tri">{giaTri}</strong>
    </div>
  )
}

function DauKy({ tu, den }: { tu: string; den: string }) {
  return (
    <p className="ghi-chu">
      Kỳ báo cáo: <MoTaKy tu={tu} den={den} />
    </p>
  )
}

/** Khung chung của UC_5.1–5.3: chọn kỳ → Xác nhận → tải báo cáo theo kỳ trên URL. */
function useKyTrenUrl() {
  const [params, setParams] = useSearchParams()
  const ky = docKy(params)
  return { ky, chonKy: (k: Ky) => setParams(thamSoKy(k)) }
}

// ====================================================================== UC_5.1

/** Màn hình 5.1.1–5.1.10. */
export function BaoCaoLoiNhuanTrang() {
  const navigate = useNavigate()
  const { ky, chonKy } = useKyTrenUrl()
  const { data, error, isFetching } = useQuery({
    queryKey: ['bao-cao', 'loi-nhuan', ky?.tu, ky?.den],
    queryFn: () => baoCaoApi.loiNhuan(ky!.tu, ky!.den),
    enabled: !!ky,
    retry: false,
  })
  const trang = useTrang(data?.dong, `${ky?.tu}|${ky?.den}|${data?.dong.length}`)
  const loi = tachLoi(error)
  return (
    <>
      <h1>Báo cáo lợi nhuận</h1>
      <ChonKy
        key={`${ky?.tu}-${ky?.den}`}
        banDau={ky}
        onXacNhan={chonKy}
        loiServer={loi.truong}
        dangTai={isFetching}
        hanhDong={
          data && (
            <button type="button" className="nut" onClick={() => navigate(`${GOC}/so-sanh-loi-nhuan?${thamSoKy(ky!)}`)}>
              So sánh lợi nhuận
            </button>
          )
        }
      />
      {loi.chung && <KhongCoDuLieu thongBao={loi.chung} />}
      {data && (
        <section className="the the--rong">
          <DauKy tu={data.tuNgay} den={data.denNgay} />
          <div className="luoi-so-lieu">
            <OSoLieu nhan="Tổng doanh thu" giaTri={tien(data.tongDoanhThu)} />
            <OSoLieu nhan="Tổng giá vốn" giaTri={tien(data.tongGiaVon)} />
            <OSoLieu nhan="Tổng lợi nhuận" giaTri={tien(data.tongLoiNhuan)} chinh />
          </div>
          <div className="bang-cuon">
            <table className="bang bang--xen-ke">
              <thead>
                <tr>
                  <th>Tên sản phẩm</th>
                  <th className="so">Doanh thu</th>
                  <th className="so">Giá vốn</th>
                  <th className="so">Lợi nhuận</th>
                </tr>
              </thead>
              <tbody>
                {trang.dsTrang.map((d) => (
                  <tr key={d.maHH}>
                    <td>{d.tenHH}</td>
                    <td className="so">{tien(d.doanhThu)}</td>
                    <td className="so">{tien(d.giaVon)}</td>
                    <td className={`so ${d.loiNhuan < 0 ? 'chu-do' : ''}`}>{tien(d.loiNhuan)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {trang.phanTrang}
        </section>
      )}
    </>
  )
}

// ====================================================================== UC_5.2

/** Màn hình 5.2.1–5.2.10. */
export function BaoCaoDoanhThuTrang() {
  const navigate = useNavigate()
  const { ky, chonKy } = useKyTrenUrl()
  const { data, error, isFetching } = useQuery({
    queryKey: ['bao-cao', 'doanh-thu', ky?.tu, ky?.den],
    queryFn: () => baoCaoApi.doanhThu(ky!.tu, ky!.den),
    enabled: !!ky,
    retry: false,
  })
  const trang = useTrang(data?.dong, `${ky?.tu}|${ky?.den}|${data?.dong.length}`)
  const loi = tachLoi(error)
  return (
    <>
      <h1>Báo cáo doanh thu</h1>
      <ChonKy
        key={`${ky?.tu}-${ky?.den}`}
        banDau={ky}
        onXacNhan={chonKy}
        loiServer={loi.truong}
        dangTai={isFetching}
        hanhDong={
          data && (
            <button type="button" className="nut" onClick={() => navigate(`${GOC}/so-sanh-doanh-thu?${thamSoKy(ky!)}`)}>
              So sánh doanh thu
            </button>
          )
        }
      />
      {loi.chung && <KhongCoDuLieu thongBao={loi.chung} />}
      {data && (
        <section className="the the--rong">
          <DauKy tu={data.tuNgay} den={data.denNgay} />
          <div className="luoi-so-lieu">
            <OSoLieu nhan="Tổng doanh thu" giaTri={tien(data.tongDoanhThu)} chinh />
            <OSoLieu nhan="Số đơn hàng" giaTri={`${so(data.soDonHang)} đơn`} />
            <OSoLieu nhan="Tiền mặt" giaTri={tien(data.tienMat)} />
            <OSoLieu nhan="Chuyển khoản" giaTri={tien(data.chuyenKhoan)} />
            <OSoLieu nhan="Ghi nợ" giaTri={tien(data.ghiNo)} />
          </div>
          <div className="bang-cuon">
            <table className="bang bang--xen-ke">
              <thead>
                <tr>
                  <th>Tên sản phẩm</th>
                  <th className="so">Doanh thu</th>
                </tr>
              </thead>
              <tbody>
                {trang.dsTrang.map((d) => (
                  <tr key={d.maHH}>
                    <td>{d.tenHH}</td>
                    <td className={`so ${d.doanhThu < 0 ? 'chu-do' : ''}`}>{tien(d.doanhThu)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {trang.phanTrang}
        </section>
      )}
    </>
  )
}

// ====================================================================== So sánh (UC_5.1, 5.2 bước 8–15)

const TEN_CHI_TIEU: Record<ChiTieuSoSanh, { tieuDe: string; quayLai: string }> = {
  'loi-nhuan': { tieuDe: 'So sánh lợi nhuận', quayLai: `${GOC}/loi-nhuan` },
  'doanh-thu': { tieuDe: 'So sánh doanh thu', quayLai: `${GOC}/doanh-thu` },
}

const dinhDangTyLe = new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const coDau = (so: number, chuoi: string) => (so > 0 ? `+${chuoi}` : chuoi)

/** Màn hình 5.1.11–5.1.21, 5.2.11–5.2.21. Kỳ báo cáo ở ?tu&den, kỳ so sánh ở ?ssTu&ssDen. */
export function SoSanhTrang({ chiTieu }: { chiTieu: ChiTieuSoSanh }) {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const ky = docKy(params)
  const kySoSanh = docKy(params, 'ss')
  const [loiTrung, setLoiTrung] = useState(false)
  const ten = TEN_CHI_TIEU[chiTieu]

  const { data, error, isFetching } = useQuery({
    queryKey: ['bao-cao', 'so-sanh', chiTieu, ky?.tu, ky?.den, kySoSanh?.tu, kySoSanh?.den],
    queryFn: () => baoCaoApi.soSanh(chiTieu, ky!.tu, ky!.den, kySoSanh!.tu, kySoSanh!.den),
    enabled: !!ky && !!kySoSanh,
    retry: false,
  })

  if (!ky)
    return (
      <>
        <h1>{ten.tieuDe}</h1>
        <KhongCoDuLieu thongBao="Vui lòng chọn kỳ báo cáo trước khi so sánh." />
      </>
    )

  const loi = tachLoi(error)
  // Lỗi kỳ so sánh trả về theo trường tuNgaySoSanh / denNgaySoSanh → hiển thị dưới ô tương ứng của bộ chọn.
  const loiTruong: Record<string, string> = {}
  if (loi.truong.tuNgaySoSanh) loiTruong.tuNgay = loi.truong.tuNgaySoSanh
  if (loi.truong.denNgaySoSanh) loiTruong.denNgay = loi.truong.denNgaySoSanh
  const thongBaoTrung = loiTrung ? 'Kỳ so sánh không được trùng kỳ báo cáo!' : (loi.truong.kySoSanh ?? null)

  const chonKySoSanh = (k: Ky) => {
    // 12b: kỳ so sánh không được trùng (giao nhau) với kỳ báo cáo – server kiểm tra lại.
    if (k.tu <= ky.den && ky.tu <= k.den) return setLoiTrung(true)
    setLoiTrung(false)
    const p = thamSoKy(ky)
    p.set('ssTu', k.tu)
    p.set('ssDen', k.den)
    p.set('ssche', k.cheDo)
    setParams(p)
  }

  return (
    <>
      <h1>{ten.tieuDe}</h1>
      <section className="the the--rong">
        <p className="ghi-chu">
          Kỳ báo cáo: <strong><MoTaKy tu={ky.tu} den={ky.den} /></strong>
        </p>
      </section>
      <ChonKy
        key={`${kySoSanh?.tu}-${kySoSanh?.den}`}
        banDau={kySoSanh}
        onXacNhan={chonKySoSanh}
        loiServer={loiTruong}
        dangTai={isFetching}
        hanhDong={
          <button type="button" className="nut" onClick={() => navigate(`${ten.quayLai}?${thamSoKy(ky)}`)}>
            Quay lại
          </button>
        }
      />
      {thongBaoTrung && (
        <section className="the the--rong">
          <p className="thong-bao thong-bao--do khung-do">{thongBaoTrung}</p>
        </section>
      )}
      {!thongBaoTrung && loi.chung && <KhongCoDuLieu thongBao={loi.chung} />}
      {!thongBaoTrung && data && (
        <section className="the the--rong">
          <p className="ghi-chu">
            Kỳ báo cáo: <MoTaKy tu={data.tuNgay} den={data.denNgay} /> · Kỳ so sánh: <MoTaKy tu={data.tuNgaySoSanh} den={data.denNgaySoSanh} />
          </p>
          <div className="bang-cuon">
            <table className="bang">
              <thead>
                <tr>
                  <th>Chỉ tiêu</th>
                  <th className="so">Kỳ báo cáo</th>
                  <th className="so">Kỳ so sánh</th>
                  <th className="so">Chênh lệch</th>
                  <th className="so">Tỷ lệ</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{data.chiTieu}</td>
                  <td className="so">{tien(data.kyBaoCao)}</td>
                  <td className="so">{tien(data.kySoSanh)}</td>
                  <td className={`so ${data.chenhLech < 0 ? 'chu-do' : data.chenhLech > 0 ? 'chu-xanh' : ''}`}>
                    {coDau(data.chenhLech, tien(data.chenhLech))}
                  </td>
                  <td className="so" title={data.tyLe === null ? 'Kỳ so sánh bằng 0 nên không tính được tỷ lệ' : undefined}>
                    {data.tyLe === null ? '—' : coDau(data.tyLe, `${dinhDangTyLe.format(data.tyLe)}%`)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  )
}

// ====================================================================== UC_5.3

function BangSoLuong({ dong }: { dong: DongSoLuongBan[] }) {
  const { dsTrang, phanTrang } = useTrang(dong)
  return (
    <>
    <div className="bang-cuon">
      <table className="bang bang--xen-ke">
        <thead>
          <tr>
            <th>Tên sản phẩm</th>
            <th>Nhóm hàng</th>
            <th>Đơn vị tính</th>
            <th className="so">Số lượng bán</th>
          </tr>
        </thead>
        <tbody>
          {dsTrang.map((d) => (
            <tr key={d.maHH}>
              <td>{d.tenHH}</td>
              <td>{d.nhomHang}</td>
              <td>{d.donViTinh}</td>
              <td className="so">{so(d.soLuongBan)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    {phanTrang}
    </>
  )
}

/** Màn hình 5.3.1–5.3.10. */
export function BaoCaoSoLuongBanTrang() {
  const navigate = useNavigate()
  const { ky, chonKy } = useKyTrenUrl()
  const { data, error, isFetching } = useQuery({
    queryKey: ['bao-cao', 'so-luong-ban', ky?.tu, ky?.den],
    queryFn: () => baoCaoApi.soLuongBan(ky!.tu, ky!.den),
    enabled: !!ky,
    retry: false,
  })
  const loi = tachLoi(error)
  return (
    <>
      <h1>Báo cáo số lượng bán ra</h1>
      <ChonKy
        key={`${ky?.tu}-${ky?.den}`}
        banDau={ky}
        onXacNhan={chonKy}
        loiServer={loi.truong}
        dangTai={isFetching}
        hanhDong={
          data && (
            <>
              <button type="button" className="nut" onClick={() => navigate(`${GOC}/top-ban-chay?${thamSoKy(ky!)}`)}>
                Top bán chạy
              </button>
              <button type="button" className="nut" onClick={() => navigate(`${GOC}/top-ban-cham?${thamSoKy(ky!)}`)}>
                Top bán chậm
              </button>
            </>
          )
        }
      />
      {loi.chung && <KhongCoDuLieu thongBao={loi.chung} />}
      {data && (
        <section className="the the--rong">
          <DauKy tu={data.tuNgay} den={data.denNgay} />
          <BangSoLuong dong={data.dong} />
        </section>
      )}
    </>
  )
}

/** Màn hình 5.3.11, 5.3.12. */
export function TopSanPhamTrang({ loai }: { loai: 'chay' | 'cham' }) {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const ky = docKy(params)
  const soLuong = params.get('n') ?? '5'
  const [nhap, setNhap] = useState(soLuong)
  const { data, error, isFetching } = useQuery({
    queryKey: ['bao-cao', 'top', loai, ky?.tu, ky?.den, soLuong],
    queryFn: () => baoCaoApi.soLuongBan(ky!.tu, ky!.den, loai, soLuong),
    enabled: !!ky,
    retry: false,
  })
  const tieuDe = loai === 'chay' ? 'Top bán chạy' : 'Top bán chậm'
  if (!ky)
    return (
      <>
        <h1>{tieuDe}</h1>
        <KhongCoDuLieu thongBao="Vui lòng chọn kỳ báo cáo số lượng bán ra trước." />
      </>
    )
  const loi = tachLoi(error)

  const xem = (e: React.FormEvent) => {
    e.preventDefault()
    const p = new URLSearchParams(params)
    p.set('n', nhap.trim())
    setParams(p)
  }

  return (
    <>
      <h1>{tieuDe}</h1>
      <form className="the the--rong khung-top" onSubmit={xem} noValidate>
        <div className="khung-top__dau">
          <DauKy tu={ky.tu} den={ky.den} />
          <button type="button" className="nut" onClick={() => navigate(`${GOC}/so-luong-ban-ra?${thamSoKy(ky)}`)}>
            Quay lại
          </button>
        </div>
        <label className="truong__nhan" htmlFor="so-luong-top">
          Số lượng sản phẩm mong muốn
        </label>
        <div className="khung-top__nhap">
          <input
            id="so-luong-top"
            className={`truong__o o-so-luong ${loi.truong.soLuong ? 'truong__o--loi' : ''}`}
            inputMode="numeric"
            value={nhap}
            onChange={(e) => setNhap(e.target.value)}
          />
          <button type="submit" className="nut nut--chinh" disabled={isFetching}>
            Xem
          </button>
        </div>
        {loi.truong.soLuong && <span className="truong__loi">{loi.truong.soLuong}</span>}
      </form>
      {loi.chung && <KhongCoDuLieu thongBao={loi.chung} />}
      {data && (
        <section className="the the--rong">
          <BangSoLuong dong={data.dong} />
        </section>
      )}
    </>
  )
}

// ====================================================================== UC_5.4

const TAB_TON_KHO = ['Tất cả', 'Sắp hết hàng', 'Hết hàng', 'Sắp hết hạn', 'Hết hạn']

/** Màn hình 5.4.1, 5.4.2 – xem theo lô (SUA_BAO_CAO 3.12), chỉ đọc. */
export function BaoCaoTonKhoTrang() {
  const [params, setParams] = useSearchParams()
  const daXem = params.get('trangThai')
  const [tab, setTab] = useState(daXem ?? 'Tất cả')
  const { data, error, isFetching, refetch } = useQuery({
    queryKey: ['bao-cao', 'ton-kho', daXem],
    queryFn: () => baoCaoApi.tonKho(daXem!),
    enabled: !!daXem,
    retry: false,
  })
  const loi = tachLoi(error)
  const trang = useTrang(data?.dong, `${daXem}|${data?.dong.length}`)

  return (
    <>
      <h1>Báo cáo tồn kho</h1>
      <section className="the the--rong">
        <div className="chon-ky__dau">
          <div className="tab" role="tablist" aria-label="Trạng thái tồn kho">
            {TAB_TON_KHO.map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                className={`nut nut--nho ${tab === t ? 'nut--chon' : ''}`}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="nut nut--chinh"
            disabled={isFetching}
            onClick={() => {
              // BR03: số liệu tính tại thời điểm xem – bấm lại cùng bộ lọc thì tải lại.
              if (tab === daXem) void refetch()
              else setParams(new URLSearchParams({ trangThai: tab }))
            }}
          >
            Xem báo cáo
          </button>
        </div>
      </section>
      {(loi.chung ?? loi.truong.trangThai) && <KhongCoDuLieu thongBao={loi.chung ?? loi.truong.trangThai} />}
      {data && data.dong.length === 0 && (
        <section className="the the--rong">
          <p className="thong-bao thong-bao--do khung-do">Không có sản phẩm phù hợp!</p>
        </section>
      )}
      {data && data.dong.length > 0 && (
        <section className="the the--rong">
          <div className="bang-cuon">
            <table className="bang bang--xen-ke">
              <thead>
                <tr>
                  <th>Mã lô</th>
                  <th>Tên sản phẩm</th>
                  <th>Đơn vị tính</th>
                  <th className="so">Số lượng tồn</th>
                  <th>Hạn sử dụng</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {trang.dsTrang.map((d) => (
                  <tr key={d.maLo}>
                    <td>{d.maLo}</td>
                    <td>{d.tenHH}</td>
                    <td>{d.donViTinh}</td>
                    <td className="so">{so(d.soLuongTon)}</td>
                    <td>{ngay(d.hanSuDung)}</td>
                    <td className={d.trangThai.includes('Còn hàng') ? undefined : 'chu-do'}>{d.trangThai.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {trang.phanTrang}
        </section>
      )}
    </>
  )
}
