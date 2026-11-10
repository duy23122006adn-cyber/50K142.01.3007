import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr'
import { useQueryClient, type QueryKey } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { tokenConHieuLuc } from '../api/client'

/**
 * Đồng bộ thời gian thực (Giai đoạn 8b): server phát "duLieu" kèm nhóm dữ liệu vừa thay đổi,
 * giao diện tải lại các màn hình đang mở có liên quan. "thongBao" → tải lại chuông thông báo.
 */
const QUERY_THEO_NHOM: Record<string, QueryKey[]> = {
  ca: [['ca-hien-tai'], ['ket-ca']],
  kho: [['ton-kho'], ['lo-hang'], ['hang-hoa'], ['ban-hang'], ['bao-cao', 'ton-kho'], ['ket-ca']],
  'canh-bao': [['canh-bao'], ['bao-cao', 'ton-kho']],
  'hoa-don': [['hoa-don'], ['bao-cao'], ['khach-quen'], ['khach-hang'], ['doi-tra', 'hoa-don']],
  'doi-tra': [['doi-tra'], ['duyet-doi-tra'], ['bao-cao']],
  khach: [['khach-hang'], ['khach-quen']],
  'ket-ca': [['ket-ca']],
}

export type TrangThaiKetNoi = 'dang-ket-noi' | 'truc-tuyen' | 'mat-ket-noi'

export function useKetNoiTucThoi(maND: string | undefined): TrangThaiKetNoi {
  const queryClient = useQueryClient()
  const [trangThai, setTrangThai] = useState<TrangThaiKetNoi>('dang-ket-noi')

  useEffect(() => {
    if (!maND) return
    let dung = false
    let henLamMoi: ReturnType<typeof setTimeout> | undefined
    let henThuLai: ReturnType<typeof setTimeout> | undefined
    const choLamMoi = new Set<string>()

    // Gộp các sự kiện đến dồn dập (ví dụ một giao dịch đổi trả chạm nhiều bảng) thành một lần tải lại.
    const lamMoi = (nhom: string[]) => {
      nhom.forEach((n) => choLamMoi.add(n))
      clearTimeout(henLamMoi)
      henLamMoi = setTimeout(() => {
        const khoa = new Map<string, QueryKey>()
        for (const n of choLamMoi) for (const k of QUERY_THEO_NHOM[n] ?? []) khoa.set(JSON.stringify(k), k)
        choLamMoi.clear()
        for (const k of khoa.values()) void queryClient.invalidateQueries({ queryKey: k })
      }, 300)
    }

    const ketNoi = new HubConnectionBuilder()
      .withUrl('/api/hub/su-kien', { accessTokenFactory: tokenConHieuLuc })
      .withAutomaticReconnect({ nextRetryDelayInMilliseconds: (c) => Math.min(30_000, 1000 * 2 ** c.previousRetryCount) })
      .configureLogging(LogLevel.Warning)
      .build()
    ketNoi.on('duLieu', (nhom: string[]) => lamMoi(nhom))
    ketNoi.on('thongBao', () => void queryClient.invalidateQueries({ queryKey: ['thong-bao'] }))
    ketNoi.onreconnecting(() => setTrangThai('mat-ket-noi'))
    ketNoi.onreconnected(() => {
      setTrangThai('truc-tuyen')
      void queryClient.invalidateQueries() // có thể đã lỡ sự kiện trong lúc mất kết nối
    })
    ketNoi.onclose(() => {
      if (!dung) setTrangThai('mat-ket-noi')
    })

    const batDau = async () => {
      try {
        await ketNoi.start()
        if (!dung) setTrangThai('truc-tuyen')
      } catch {
        if (dung) return
        setTrangThai('mat-ket-noi')
        henThuLai = setTimeout(() => void batDau(), 10_000)
      }
    }
    void batDau()

    return () => {
      dung = true
      clearTimeout(henLamMoi)
      clearTimeout(henThuLai)
      void ketNoi.stop()
    }
  }, [maND, queryClient])

  return trangThai
}
