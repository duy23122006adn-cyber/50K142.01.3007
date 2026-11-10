import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { dangKyKhiLamMoi, datAccessToken, lamMoiToken, type NguoiDung } from '../api/client'
import * as api from '../api/xacThuc'
import { luuNguoiDung, nguoiDungDaLuu, xoaNguoiDungDaLuu } from '../lib/offline'

interface GiaTriXacThuc {
  nguoiDung: NguoiDung | null
  /** Đang khôi phục phiên từ cookie khi mở trang. */
  dangKhoiPhuc: boolean
  dangNhap: (tenDangNhap: string, matKhau: string) => Promise<void>
  dangXuat: () => Promise<void>
  /** Xóa phiên phía giao diện (dùng sau khi đổi mật khẩu – server đã thu hồi mọi phiên). */
  xoaPhien: () => void
  /** UC_11 1.a: màn hình đánh dấu đang có thao tác chưa lưu. */
  datChuaLuu: (chuaLuu: boolean) => void
  coThaoTacChuaLuu: () => boolean
}

const XacThucContext = createContext<GiaTriXacThuc | null>(null)

export function XacThucProvider({ children }: { children: ReactNode }) {
  const [nguoiDung, setNguoiDung] = useState<NguoiDung | null>(null)
  const [dangKhoiPhuc, setDangKhoiPhuc] = useState(true)
  const chuaLuu = useRef(false)

  useEffect(() => {
    dangKyKhiLamMoi((kq, loiMang) => {
      if (kq) {
        luuNguoiDung(kq.nguoiDung)
        setNguoiDung(kq.nguoiDung)
      } else if (loiMang) {
        // Giai đoạn 8c: mất mạng – giữ phiên đang có; nếu vừa mở trang thì dùng người đăng nhập gần nhất trên máy (chỉ bán offline).
        setNguoiDung((hienTai) => {
          if (hienTai) return hienTai
          const daLuu = nguoiDungDaLuu()
          return daLuu ? { ...daLuu, ngoaiTuyen: true } : null
        })
      } else {
        setNguoiDung(null)
      }
    })
    // Khôi phục phiên nếu cookie refresh còn hiệu lực.
    lamMoiToken().finally(() => setDangKhoiPhuc(false))
  }, [])

  const dangNhap = useCallback(async (tenDangNhap: string, matKhau: string) => {
    const kq = await api.dangNhap(tenDangNhap, matKhau)
    datAccessToken(kq.accessToken)
    luuNguoiDung(kq.nguoiDung)
    setNguoiDung(kq.nguoiDung)
  }, [])

  const xoaPhien = useCallback(() => {
    datAccessToken(null)
    chuaLuu.current = false
    xoaNguoiDungDaLuu()
    setNguoiDung(null)
  }, [])

  const dangXuat = useCallback(async () => {
    try {
      await api.dangXuat()
    } finally {
      xoaPhien()
    }
  }, [xoaPhien])

  const giaTri = useMemo<GiaTriXacThuc>(
    () => ({
      nguoiDung,
      dangKhoiPhuc,
      dangNhap,
      dangXuat,
      xoaPhien,
      datChuaLuu: (v) => {
        chuaLuu.current = v
      },
      coThaoTacChuaLuu: () => chuaLuu.current,
    }),
    [nguoiDung, dangKhoiPhuc, dangNhap, dangXuat, xoaPhien],
  )

  return <XacThucContext.Provider value={giaTri}>{children}</XacThucContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useXacThuc() {
  const ctx = useContext(XacThucContext)
  if (!ctx) throw new Error('useXacThuc phải nằm trong XacThucProvider')
  return ctx
}
