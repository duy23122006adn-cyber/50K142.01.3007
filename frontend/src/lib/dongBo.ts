import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { goiApi, lamMoiToken, type NguoiDung } from '../api/client'
import { banHangApi } from '../api/nghiepVu'
import { useCoMang } from './mang'
import { dongBoHoaDonTam, luuSanPham, sanPhamDaLuu } from './offline'

const PHUT = 60_000

/**
 * Giai đoạn 8c (gắn ở khung trang):
 * - có mạng: gửi hóa đơn tạm chờ đồng bộ (ngay khi có mạng lại và mỗi phút), làm mới danh mục sản phẩm lưu trên máy mỗi 5 phút;
 * - phiên offline (mở trang lúc mất mạng): có mạng lại thì khôi phục phiên thật bằng cookie;
 * - mất mạng: 15 giây thử gọi máy chủ một lần để biết khi nào có mạng lại (trình duyệt có thể vẫn báo "online").
 */
export function useDongBoOffline(nguoiDung: NguoiDung | null) {
  const coMang = useCoMang()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!nguoiDung) return
    if (!coMang) {
      const thu = setInterval(() => void goiApi('/ca/hien-tai').catch(() => undefined), 15_000)
      return () => clearInterval(thu)
    }
    let dung = false
    const chay = async () => {
      if (nguoiDung.ngoaiTuyen) {
        await lamMoiToken() // thành công → AuthContext thay bằng phiên thật, effect chạy lại
        return
      }
      const soGui = await dongBoHoaDonTam(nguoiDung)
      if (dung) return
      if (soGui > 0) {
        void queryClient.invalidateQueries({ queryKey: ['hoa-don-tam'] })
        void queryClient.invalidateQueries({ queryKey: ['ban-hang', 'san-pham'] })
      }
      const daLuu = sanPhamDaLuu()
      if (!daLuu || Date.now() - new Date(daLuu.luc).getTime() > 5 * PHUT) {
        try {
          luuSanPham(await banHangApi.sanPham(''))
        } catch {
          // thử lại lần sau
        }
      }
    }
    void chay()
    const hen = setInterval(() => void chay(), PHUT)
    return () => {
      dung = true
      clearInterval(hen)
    }
  }, [nguoiDung, coMang, queryClient])
}
