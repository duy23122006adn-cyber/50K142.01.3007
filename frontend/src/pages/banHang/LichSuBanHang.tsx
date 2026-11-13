import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { LoiApi } from '../../api/client'
import { hoaDonApi, type DieuKienTimHoaDon } from '../../api/nghiepVu'
import { NhatKyHuy } from '../../components/NhatKyHuy'
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
  // Mẫu 6.1-04…07: điều kiện sai → báo lỗi một dòng dưới khung tìm kiếm, danh sách "Tất cả hóa đơn" vẫn hiển thị như chưa tìm.
  const tatCa = useQuery({
    queryKey: ['hoa-don', 'tat-ca', trang],
    queryFn: () => hoaDonApi.timKiem(Object.fromEntries(TRUONG.map((k) => [k, ''])) as DieuKienTimHoaDon, trang, true),
    enabled: !!error,
    placeholderData: keepPreviousData,
  })
  const hienTim = daTim && !error
  const ds = error ? tatCa.data : data
  const thongBaoLoi = loi ? (Object.values(loi.loi)[0] ?? loi.message) : error ? 'Tìm kiếm không thành công.' : null

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
        {/* Mẫu 6.1: 3 cột; hàng 2 gồm Từ ngày, Đến ngày và nút Tìm kiếm / Thoát. */}
        <div className="luoi-loc luoi-loc--3">
          <label className="truong">
            <span className="truong__nhan">Mã hóa đơn</span>
            <input className={`truong__o ${loi?.loi.ma ? 'truong__o--loi' : ''}`} placeholder="Nhập mã hoặc một phần mã" {...o('ma')} />
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
          </label>
          <label className="truong">
            <span className="truong__nhan">Đến ngày (nếu có)</span>
            <input className={`truong__o ${loi?.loi.denNgay ? 'truong__o--loi' : ''}`} type="date" max={homNayISO()} {...o('denNgay')} />
          </label>
          <div className="truong luoi-loc__nut">
            <button type="submit" className="nut nut--chinh">
              Tìm kiếm
            </button>
            <button type="button" className="nut" onClick={() => navigate('/')}>
              Thoát
            </button>
          </div>
        </div>
        {chuaNhapDieuKien && <p className="truong__loi loi-tim">Vui lòng nhập ít nhất một điều kiện.</p>}
        {thongBaoLoi && <p className="truong__loi loi-tim">{thongBaoLoi}</p>}
      </form>

      {ds && (
        <section className="the the--rong">
          <h2>
            {hienTim ? 'Kết quả tìm kiếm' : 'Tất cả hóa đơn'} · {ds.tongSo} hóa đơn
          </h2>
          {ds.tongSo === 0 ? (
            <p className="chu-do canh-giua o-trong-the">{hienTim ? 'Không tìm thấy hóa đơn phù hợp.' : 'Chưa có hóa đơn nào.'}</p>
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
                  {ds.danhSach.map((h) => (
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
            trang={ds.trang}
            soTrang={ds.soTrang}
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
        {/* UC_6.3 BR12: hóa đơn đã hủy vẫn xem được cùng thông tin hủy. */}
        {data?.trangThai === 'Đã hủy' && <NhatKyHuy maHD={data.maHD} coBanSao={false} />}
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
