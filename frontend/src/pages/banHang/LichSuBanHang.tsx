import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { LoiApi } from '../../api/client'
import { hoaDonApi, type DieuKienTimHoaDon } from '../../api/nghiepVu'
import { PhanTrang } from '../../components/PhanTrang'
import { NhanTrangThaiHoaDon, XemHoaDon } from '../../components/XemHoaDon'
import { homNayISO, ngayGio, tien } from '../../lib/dinhDang'

const TRUONG = ['ma', 'khach', 'tuNgay', 'denNgay', 'trangThai'] as const

/** Màn hình 6.1 – Tìm kiếm lịch sử bán hàng (UC_6.1). Điều kiện lưu trên URL để "Quay lại danh sách" giữ kết quả (9.a). */
export function LichSuBanHang() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const dk: DieuKienTimHoaDon = Object.fromEntries(TRUONG.map((k) => [k, params.get(k) ?? ''])) as DieuKienTimHoaDon
  const daTim = TRUONG.some((k) => params.get(k))
  const trang = Number(params.get('trang') ?? '1')
  const [form, setForm] = useState<DieuKienTimHoaDon>(dk)

  const { data, error, isFetching } = useQuery({
    queryKey: ['hoa-don', dk, trang, daTim],
    queryFn: () => hoaDonApi.timKiem(dk, trang, !daTim),
    placeholderData: keepPreviousData,
    retry: false,
  })
  const loi = error instanceof LoiApi ? error : null

  const tim = (e: React.FormEvent) => {
    e.preventDefault()
    const p = new URLSearchParams()
    for (const k of TRUONG) if (form[k]?.trim()) p.set(k, form[k]!.trim())
    p.set('tim', '1')
    setParams(p)
  }

  const chuaNhapDieuKien = params.get('tim') === '1' && !daTim
  const o = (k: keyof DieuKienTimHoaDon) => ({
    value: form[k] ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value }),
  })

  return (
    <>
      <h1>Lịch sử bán hàng</h1>
      <form className="the the--rong" onSubmit={tim} noValidate>
        <div className="luoi-loc">
          <label className="truong">
            <span className="truong__nhan">Mã hóa đơn</span>
            <input className={`truong__o ${loi?.loi.ma ? 'truong__o--loi' : ''}`} placeholder="Nhập mã đầy đủ" {...o('ma')} />
            {loi?.loi.ma && <span className="truong__loi">{loi.loi.ma}</span>}
          </label>
          <label className="truong">
            <span className="truong__nhan">Tên hoặc số điện thoại</span>
            <input className="truong__o" placeholder="Nhập tên hoặc số điện thoại" {...o('khach')} />
          </label>
          <label className="truong">
            <span className="truong__nhan">Trạng thái hóa đơn</span>
            <select className="truong__o" {...o('trangThai')}>
              <option value="">Chọn trạng thái</option>
              <option>Đã thanh toán</option>
              <option>Còn nợ</option>
              <option>Đã hủy</option>
            </select>
          </label>
          <label className="truong">
            <span className="truong__nhan">Từ ngày</span>
            <input className={`truong__o ${loi?.loi.tuNgay ? 'truong__o--loi' : ''}`} type="date" max={homNayISO()} {...o('tuNgay')} />
            {loi?.loi.tuNgay && <span className="truong__loi">{loi.loi.tuNgay}</span>}
          </label>
          <label className="truong">
            <span className="truong__nhan">Đến ngày (nếu có)</span>
            <input className={`truong__o ${loi?.loi.denNgay ? 'truong__o--loi' : ''}`} type="date" max={homNayISO()} {...o('denNgay')} />
            {loi?.loi.denNgay && <span className="truong__loi">{loi.loi.denNgay}</span>}
          </label>
        </div>
        {chuaNhapDieuKien && <p className="thong-bao thong-bao--do">Vui lòng nhập ít nhất một điều kiện.</p>}
        {loi && Object.keys(loi.loi).length === 0 && <p className="thong-bao thong-bao--do">{loi.message}</p>}
        <div className="hang-nut">
          <button type="button" className="nut" onClick={() => navigate('/')}>
            Thoát
          </button>
          <button type="submit" className="nut nut--chinh">
            Tìm kiếm
          </button>
        </div>
      </form>

      {data && (
        <section className="the the--rong">
          <h2>
            {daTim ? 'Kết quả tìm kiếm' : 'Tất cả hóa đơn'} · {data.tongSo} hóa đơn
          </h2>
          {data.tongSo === 0 ? (
            <p className="thong-bao thong-bao--do">{daTim ? 'Không tìm thấy hóa đơn phù hợp.' : 'Chưa có hóa đơn nào.'}</p>
          ) : (
            <div className={`bang-cuon ${isFetching ? 'dang-tai-mo' : ''}`}>
              <table className="bang">
                <thead>
                  <tr>
                    <th>Mã hóa đơn</th>
                    <th>Ngày giờ lập</th>
                    <th>Khách hàng</th>
                    <th className="so">Tổng tiền</th>
                    <th>Trạng thái</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {data.danhSach.map((h) => (
                    <tr key={h.maHD}>
                      <td>{h.maHD}</td>
                      <td>{ngayGio(h.ngayGioLap)}</td>
                      <td>{h.tenKhach ?? <span className="ghi-chu">Khách vãng lai</span>}</td>
                      <td className="so">{tien(h.tongTien)}</td>
                      <td>
                        <NhanTrangThaiHoaDon trangThai={h.trangThai} />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="nut nut--nho"
                          onClick={() => navigate(`/quan-ly-ban-hang/hoa-don?ma=${encodeURIComponent(h.maHD)}`)}
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
          <PhanTrang
            trang={data.trang}
            soTrang={data.soTrang}
            onDoiTrang={(t) => {
              const p = new URLSearchParams(params)
              p.set('trang', String(t))
              setParams(p)
            }}
          />
        </section>
      )}
    </>
  )
}

/** Màn hình 6.1.9–6.1.12 – Chi tiết hóa đơn. */
export function ChiTietHoaDonTrang() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const ma = params.get('ma') ?? ''
  const { data, error } = useQuery({ queryKey: ['hoa-don', 'chi-tiet', ma], queryFn: () => hoaDonApi.chiTiet(ma), enabled: !!ma })

  return (
    <>
      <h1>Chi tiết hóa đơn</h1>
      <section className="the the--vua">
        {error && <p className="thong-bao thong-bao--do">Không thể hiển thị chi tiết hóa đơn.</p>}
        {!data && !error && <p className="ghi-chu">Đang tải…</p>}
        {data && <XemHoaDon hd={data} />}
        <div className="hang-nut khong-in">
          {data && (
            <button type="button" className="nut" onClick={() => window.print()}>
              In hóa đơn
            </button>
          )}
          <button type="button" className="nut nut--chinh" onClick={() => navigate(-1)}>
            Quay lại danh sách
          </button>
        </div>
      </section>
    </>
  )
}
