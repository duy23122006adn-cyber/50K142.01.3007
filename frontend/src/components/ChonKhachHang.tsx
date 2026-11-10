import { useState } from 'react'
import { LoiApi } from '../api/client'
import { khachHangApi, type KhachHangDong } from '../api/nghiepVu'
import { HopThoai } from './HopThoai'

interface Props {
  mo: boolean
  onChon: (kh: KhachHangDong | null) => void
  onDong: () => void
}

/**
 * Popup 6.5.7 / 6.5.8 – Tìm và chọn khách hàng (UC_6.5 bước 8–9, 8.b).
 * "Thêm khách hàng" mở biểu mẫu ngay trong popup để giỏ hàng được giữ nguyên (8.b.2).
 */
export function ChonKhachHang({ mo, onChon, onDong }: Props) {
  const [tuKhoa, setTuKhoa] = useState('')
  const [ketQua, setKetQua] = useState<KhachHangDong[] | null>(null)
  const [loi, setLoi] = useState<string | null>(null)
  const [themMoi, setThemMoi] = useState(false)
  const [form, setForm] = useState({ hoTen: '', sdt: '' })
  const [loiForm, setLoiForm] = useState<Record<string, string>>({})
  const [khachTrung, setKhachTrung] = useState<KhachHangDong | null>(null)

  const datLai = () => {
    setTuKhoa('')
    setKetQua(null)
    setLoi(null)
    setThemMoi(false)
    setForm({ hoTen: '', sdt: '' })
    setLoiForm({})
    setKhachTrung(null)
  }

  const tim = async () => {
    setLoi(null)
    if (!tuKhoa.trim()) {
      setLoi('Vui lòng nhập tên hoặc số điện thoại khách hàng.')
      return
    }
    try {
      setKetQua((await khachHangApi.timKiem(tuKhoa.trim())).danhSach)
    } catch (e) {
      setLoi(e instanceof LoiApi ? (e.loi.tuKhoa ?? e.message) : 'Tìm kiếm không thành công')
      setKetQua(null)
    }
  }

  const luuKhachMoi = async () => {
    setLoiForm({})
    setKhachTrung(null)
    try {
      const kh = await khachHangApi.them(form)
      datLai()
      onChon(kh)
    } catch (e) {
      if (e instanceof LoiApi) {
        setLoiForm(Object.keys(e.loi).length ? e.loi : { chung: e.message })
        setKhachTrung((e.duLieu.khachTrung as KhachHangDong | undefined) ?? null)
      } else setLoiForm({ chung: 'Không thể lưu khách hàng' })
    }
  }

  return (
    <HopThoai
      mo={mo}
      tieuDe={themMoi ? 'Thêm khách hàng' : 'Chọn khách hàng'}
      onDong={() => {
        datLai()
        onDong()
      }}
      nut={
        themMoi ? (
          <>
            <button type="button" className="nut" onClick={() => setThemMoi(false)}>
              Hủy
            </button>
            <button type="button" className="nut nut--chinh" onClick={luuKhachMoi}>
              Lưu và chọn
            </button>
          </>
        ) : (
          <button
            type="button"
            className="nut"
            onClick={() => {
              datLai()
              onDong()
            }}
          >
            Đóng
          </button>
        )
      }
    >
      {!themMoi ? (
        <>
          <p className="ghi-chu">Tìm khách hàng đã có bằng tên hoặc số điện thoại.</p>
          <form
            className="o-tim"
            onSubmit={(e) => {
              e.preventDefault()
              void tim()
            }}
          >
            <input
              className={`truong__o ${loi ? 'truong__o--loi' : ''}`}
              placeholder="Nhập tên hoặc số điện thoại"
              value={tuKhoa}
              onChange={(e) => setTuKhoa(e.target.value)}
              aria-label="Tên hoặc số điện thoại khách hàng"
              autoFocus
            />
            <button type="submit" className="nut">Tìm</button>
          </form>
          {loi && <p className="truong__loi">{loi}</p>}
          {ketQua && ketQua.length > 0 && (
            <ul className="ds-chon">
              {ketQua.map((kh) => (
                <li key={kh.maKH}>
                  <span>
                    <strong>{kh.hoTen}</strong>
                    <br />
                    <small className="ghi-chu">
                      {kh.sdt} · {kh.maKH}
                    </small>
                  </span>
                  <button
                    type="button"
                    className="nut nut--nho nut--chinh"
                    onClick={() => {
                      datLai()
                      onChon(kh)
                    }}
                  >
                    Chọn
                  </button>
                </li>
              ))}
            </ul>
          )}
          {ketQua && ketQua.length === 0 && (
            <>
              <p className="thong-bao thong-bao--do">Không tìm thấy khách hàng phù hợp</p>
              <div className="hang-nut hang-nut--trai">
                <button
                  type="button"
                  className="nut"
                  onClick={() => {
                    datLai()
                    onChon(null)
                  }}
                >
                  Tiếp tục với khách vãng lai
                </button>
                <button
                  type="button"
                  className="nut nut--chinh"
                  onClick={() => {
                    setThemMoi(true)
                    setForm({ hoTen: /\d/.test(tuKhoa) ? '' : tuKhoa.trim(), sdt: /^\d+$/.test(tuKhoa.trim()) ? tuKhoa.trim() : '' })
                  }}
                >
                  Thêm khách hàng
                </button>
              </div>
            </>
          )}
        </>
      ) : (
        <div>
          <label className="truong">
            <span className="truong__nhan">
              Họ tên<span className="truong__sao"> *</span>
            </span>
            <input
              className={`truong__o ${loiForm.hoTen ? 'truong__o--loi' : ''}`}
              placeholder="Nhập họ tên"
              value={form.hoTen}
              onChange={(e) => setForm({ ...form, hoTen: e.target.value })}
            />
            {loiForm.hoTen && <span className="truong__loi">{loiForm.hoTen}</span>}
          </label>
          <label className="truong">
            <span className="truong__nhan">
              Số điện thoại<span className="truong__sao"> *</span>
            </span>
            <input
              className={`truong__o ${loiForm.sdt ? 'truong__o--loi' : ''}`}
              placeholder="Nhập số điện thoại"
              inputMode="numeric"
              value={form.sdt}
              onChange={(e) => setForm({ ...form, sdt: e.target.value })}
            />
            {loiForm.sdt && <span className="truong__loi">{loiForm.sdt}</span>}
          </label>
          {khachTrung && (
            <p className="khung-goi-y">
              Số này đang được dùng bởi <strong>{khachTrung.hoTen}</strong> ({khachTrung.sdt}).{' '}
              <button
                type="button"
                className="nut nut--nho"
                onClick={() => {
                  const kh = khachTrung
                  datLai()
                  onChon(kh)
                }}
              >
                Chọn khách này
              </button>
            </p>
          )}
          {loiForm.chung && <p className="thong-bao thong-bao--do">{loiForm.chung}</p>}
        </div>
      )}
    </HopThoai>
  )
}
