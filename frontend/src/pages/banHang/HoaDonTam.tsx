import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LoiApi } from '../../api/client'
import { hoaDonTamApi, type HoaDonTamMayChu } from '../../api/nghiepVu'
import { useXacThuc } from '../../auth/AuthContext'
import { HopThoai } from '../../components/HopThoai'
import { ngayGio, tien } from '../../lib/dinhDang'
import { useCoMang } from '../../lib/mang'
import { dongBoHoaDonTam, useHoaDonTam, xoaHoaDonTam } from '../../lib/offline'

const TAB = ['Chờ Chủ quán xử lý', 'Đã ghi nhận', 'Đã hủy']

/**
 * Giai đoạn 8c – hóa đơn tạm bán offline (đề xuất màn hình, SUA_BAO_CAO 15.4).
 * "Trên máy này": hóa đơn tạm lưu trong trình duyệt, chờ gửi lên máy chủ.
 * "Trên máy chủ": kết quả đồng bộ; Chủ quán ghi nhận hoặc hủy các hóa đơn tạm cần xử lý.
 */
export function HoaDonTamTrang() {
  const { nguoiDung } = useXacThuc()
  const queryClient = useQueryClient()
  const coMang = useCoMang()
  const cuc = useHoaDonTam()
  const [tab, setTab] = useState(TAB[0])
  const [dangGui, setDangGui] = useState(false)
  const [thongBao, setThongBao] = useState<string | null>(null)
  const [huy, setHuy] = useState<{ maTam: string; lyDo: string; loi?: string } | null>(null)
  const laCQ = nguoiDung?.vaiTro === 'ChuQuan'

  const mayChu = useQuery({
    queryKey: ['hoa-don-tam', tab],
    queryFn: () => hoaDonTamApi.danhSach(tab),
    enabled: coMang && !nguoiDung?.ngoaiTuyen,
    retry: false,
  })

  const guiNgay = async () => {
    if (!nguoiDung) return
    setDangGui(true)
    try {
      const n = await dongBoHoaDonTam(nguoiDung)
      setThongBao(n > 0 ? `Đã gửi ${n} hóa đơn tạm lên máy chủ.` : 'Không gửi được hóa đơn nào (đang mất mạng hoặc chưa có hóa đơn chờ).')
      void queryClient.invalidateQueries({ queryKey: ['hoa-don-tam'] })
    } finally {
      setDangGui(false)
    }
  }

  const xuLy = async (viec: () => Promise<HoaDonTamMayChu>, xong: string) => {
    try {
      await viec()
      setThongBao(xong)
      void queryClient.invalidateQueries({ queryKey: ['hoa-don-tam'] })
      return true
    } catch (e) {
      setThongBao(e instanceof LoiApi ? e.message : 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.')
      return false
    }
  }

  return (
    <>
      <h1>Hóa đơn tạm (bán offline)</h1>

      <section className="the the--rong">
        <h2>Trên máy này</h2>
        <p className="ghi-chu">
          Hóa đơn tạm được tạo khi bán tiền mặt lúc mất mạng và tự gửi lên máy chủ khi có mạng trở lại. Chỉ người bán hoặc Chủ quán gửi được.
        </p>
        {cuc.length === 0 ? (
          <p className="ghi-chu">Máy này không có hóa đơn tạm.</p>
        ) : (
          <div className="bang-cuon">
            <table className="bang bang--xen-ke">
              <thead>
                <tr>
                  <th>Mã tạm</th>
                  <th>Thời gian bán</th>
                  <th>Người bán</th>
                  <th className="so">Tổng tiền</th>
                  <th>Trạng thái</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {cuc.map((t) => (
                  <tr key={t.maTam}>
                    <td>{t.maTam}</td>
                    <td>{ngayGio(t.ngayGioBan)}</td>
                    <td>{t.hoTen}</td>
                    <td className="so">{tien(t.tongTien)}</td>
                    <td>
                      <span className={t.trangThai === 'Đã ghi nhận' ? 'chu-xanh' : t.trangThai === 'Chờ đồng bộ' ? 'chu-cam' : 'chu-do'}>
                        {t.trangThai}
                      </span>
                      {t.maHD && <> → {t.maHD}</>}
                      {(t.loi ?? t.lyDo) && <small className="ghi-chu"> · {t.loi ?? t.lyDo}</small>}
                    </td>
                    <td>
                      {t.trangThai === 'Lỗi' && (
                        <button type="button" className="nut nut--nho" onClick={() => xoaHoaDonTam(t.maTam)}>
                          Xóa khỏi máy
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="hang-nut hang-nut--trai">
          <button
            type="button"
            className="nut nut--chinh"
            disabled={dangGui || !coMang || !!nguoiDung?.ngoaiTuyen || !cuc.some((t) => t.trangThai === 'Chờ đồng bộ')}
            onClick={guiNgay}
          >
            {dangGui ? 'Đang gửi…' : 'Đồng bộ ngay'}
          </button>
        </div>
        {thongBao && <p className="thong-bao">{thongBao}</p>}
      </section>

      <section className="the the--rong">
        <h2>Trên máy chủ</h2>
        {!coMang || nguoiDung?.ngoaiTuyen ? (
          <p className="ghi-chu">Cần có mạng để xem kết quả đồng bộ.</p>
        ) : (
          <>
            <div className="tab" role="tablist">
              {TAB.map((t) => (
                <button key={t} type="button" role="tab" aria-selected={tab === t} className={`nut nut--nho ${tab === t ? 'nut--chinh' : ''}`} onClick={() => setTab(t)}>
                  {t}
                </button>
              ))}
            </div>
            {!laCQ && <p className="ghi-chu">Chỉ hiển thị hóa đơn tạm do bạn bán.</p>}
            {mayChu.error && <p className="thong-bao thong-bao--do">{(mayChu.error as Error).message}</p>}
            <div className="bang-cuon">
              <table className="bang bang--xen-ke">
                <thead>
                  <tr>
                    <th>Mã tạm</th>
                    <th>Thời gian bán</th>
                    <th>Người bán</th>
                    <th>Sản phẩm</th>
                    <th className="so">Tổng tiền</th>
                    <th>{tab === 'Đã ghi nhận' ? 'Hóa đơn' : 'Lý do'}</th>
                    {laCQ && tab === TAB[0] && <th>Xử lý</th>}
                  </tr>
                </thead>
                <tbody>
                  {mayChu.data?.length === 0 && (
                    <tr>
                      <td colSpan={7} className="canh-giua">
                        Không có hóa đơn tạm
                      </td>
                    </tr>
                  )}
                  {mayChu.data?.map((h) => (
                    <tr key={h.maTam}>
                      <td>{h.maTam}</td>
                      <td>{ngayGio(h.ngayGioBan)}</td>
                      <td>{h.nguoiBan}</td>
                      <td>{h.dong.map((d) => `${d.tenHH} ×${d.soLuong}`).join(', ')}</td>
                      <td className="so">{tien(h.tongTien)}</td>
                      <td>
                        {h.maHD ? (
                          <Link to={`/quan-ly-ban-hang/hoa-don?ma=${encodeURIComponent(h.maHD)}`}>{h.maHD}</Link>
                        ) : (
                          h.lyDo
                        )}
                      </td>
                      {laCQ && tab === TAB[0] && (
                        <td>
                          <div className="o-hanh-dong">
                            <button
                              type="button"
                              className="nut nut--nho nut--chinh"
                              onClick={() => void xuLy(() => hoaDonTamApi.ghiNhan(h.maTam), `Đã ghi nhận ${h.maTam}.`)}
                            >
                              Ghi nhận
                            </button>
                            <button type="button" className="nut nut--nho nut--nguy-hiem" onClick={() => setHuy({ maTam: h.maTam, lyDo: '' })}>
                              Hủy
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {laCQ && tab === TAB[0] && (
              <p className="ghi-chu">
                “Ghi nhận” lập hóa đơn chính thức theo giá khách đã trả; nếu thiếu tồn, hãy điều chỉnh tồn kho trước (Quản lý tồn kho → Điều
                chỉnh tồn kho).
              </p>
            )}
          </>
        )}
      </section>

      <HopThoai
        mo={huy !== null}
        tieuDe="Hủy hóa đơn tạm"
        onDong={() => setHuy(null)}
        nut={
          <>
            <button type="button" className="nut" onClick={() => setHuy(null)}>
              Quay lại
            </button>
            <button
              type="button"
              className="nut nut--nguy-hiem-dac"
              onClick={async () => {
                if (!huy) return
                if (!huy.lyDo.trim()) return setHuy({ ...huy, loi: 'Vui lòng nhập lý do hủy.' })
                if (await xuLy(() => hoaDonTamApi.huy(huy.maTam, huy.lyDo), `Đã hủy ${huy.maTam}.`)) setHuy(null)
              }}
            >
              Hủy hóa đơn tạm
            </button>
          </>
        }
      >
        <label className="truong">
          <span className="truong__nhan">Lý do hủy</span>
          <input
            className={`truong__o ${huy?.loi ? 'truong__o--loi' : ''}`}
            value={huy?.lyDo ?? ''}
            maxLength={200}
            onChange={(e) => huy && setHuy({ ...huy, lyDo: e.target.value, loi: undefined })}
          />
          {huy?.loi && <span className="truong__loi">{huy.loi}</span>}
        </label>
      </HopThoai>
    </>
  )
}
