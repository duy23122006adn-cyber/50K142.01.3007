/*
 * Service worker – Giai đoạn 8c (NFR Availability-02): giữ giao diện để mở lại trang khi mất mạng.
 * - Trang (điều hướng): lấy từ mạng trước, mất mạng thì dùng bản index.html đã lưu.
 * - Tệp tĩnh /assets/* (tên có mã băm): lưu lần đầu, lần sau dùng bản đã lưu.
 * - Không bao giờ lưu /api (dữ liệu nghiệp vụ luôn lấy từ máy chủ; dữ liệu offline do ứng dụng tự quản lý).
 * Chỉ được đăng ký ở bản build (main.tsx).
 */
const KHO = 'xomnho-giao-dien-v1'

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(KHO).then((c) => c.addAll(['/', '/index.html'])).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ds) => Promise.all(ds.filter((k) => k !== KHO).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api')) return

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const banSao = res.clone()
          caches.open(KHO).then((c) => c.put('/index.html', banSao))
          return res
        })
        .catch(() => caches.match('/index.html')),
    )
    return
  }

  if (url.pathname.startsWith('/assets/') || /\.(svg|png|ico|webmanifest)$/.test(url.pathname)) {
    e.respondWith(
      caches.match(req).then(
        (daLuu) =>
          daLuu ??
          fetch(req).then((res) => {
            if (res.ok) {
              const banSao = res.clone()
              caches.open(KHO).then((c) => c.put(req, banSao))
            }
            return res
          }),
      ),
    )
  }
})
