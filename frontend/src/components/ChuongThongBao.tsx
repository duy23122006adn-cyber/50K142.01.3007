import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { thongBaoApi, type ThongBaoDong } from '../api/nghiepVu'
import { ngayGio } from '../lib/dinhDang'

/**
 * Thông báo kết quả duyệt phiếu cho người lập phiếu (UC_6.4 BR08) và lỗi sao lưu.
 * Cập nhật ngay qua kết nối thời gian thực (lib/suKien.ts); tự tải lại mỗi 2 phút để dự phòng.
 */
export function ChuongThongBao() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [mo, setMo] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { data } = useQuery({ queryKey: ['thong-bao'], queryFn: thongBaoApi.danhSach, refetchInterval: 120_000 })

  useEffect(() => {
    if (!mo) return
    const dong = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setMo(false)
    }
    document.addEventListener('mousedown', dong)
    return () => document.removeEventListener('mousedown', dong)
  }, [mo])

  const moThongBao = async (t: ThongBaoDong) => {
    setMo(false)
    if (!t.daDoc) {
      await thongBaoApi.daDoc(t.maTB)
      void queryClient.invalidateQueries({ queryKey: ['thong-bao'] })
    }
    if (t.maThamChieu) {
      void queryClient.invalidateQueries({ queryKey: ['doi-tra'] })
      navigate(`/quan-ly-ban-hang/doi-tra/phieu?ma=${encodeURIComponent(t.maThamChieu)}`)
    }
  }

  const soChuaDoc = data?.soChuaDoc ?? 0
  return (
    <div className="chuong" ref={ref}>
      <button
        type="button"
        className="chuong__nut"
        aria-haspopup="menu"
        aria-expanded={mo}
        aria-label={soChuaDoc ? `Thông báo, ${soChuaDoc} chưa đọc` : 'Thông báo'}
        onClick={() => setMo(!mo)}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
          <path
            fill="currentColor"
            d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm7-6V11a7 7 0 0 0-5.5-6.84V3a1.5 1.5 0 0 0-3 0v1.16A7 7 0 0 0 5 11v5l-2 2v1h18v-1l-2-2Z"
          />
        </svg>
        {soChuaDoc > 0 && <span className="chuong__so">{soChuaDoc}</span>}
      </button>
      {mo && (
        <div className="chuong__danh-sach" role="menu">
          <div className="chuong__dau">
            <strong>Thông báo</strong>
            {soChuaDoc > 0 && (
              <button
                type="button"
                className="nut nut--chu nut--nho"
                onClick={async () => {
                  await thongBaoApi.daDoc()
                  void queryClient.invalidateQueries({ queryKey: ['thong-bao'] })
                }}
              >
                Đánh dấu đã đọc
              </button>
            )}
          </div>
          {!data || data.danhSach.length === 0 ? (
            <p className="ghi-chu">Chưa có thông báo.</p>
          ) : (
            data.danhSach.map((t) => (
              <button
                key={t.maTB}
                type="button"
                role="menuitem"
                className={`chuong__muc ${t.daDoc ? '' : 'chuong__muc--moi'}`}
                onClick={() => void moThongBao(t)}
              >
                <span>{t.noiDung}</span>
                <span className="ghi-chu">{ngayGio(t.thoiDiemTao)}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
