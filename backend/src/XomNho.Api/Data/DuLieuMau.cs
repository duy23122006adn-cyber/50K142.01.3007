using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using XomNho.Api.BanHangQL;
using XomNho.Api.CaLam;
using XomNho.Api.Common;
using XomNho.Api.CongNoQL;
using XomNho.Api.Domain;
using XomNho.Api.DoiTraQL;
using XomNho.Api.HangHoaQL;
using XomNho.Api.KhachHangQL;
using XomNho.Api.NhanVienQL;
using XomNho.Api.TichHop;
using XomNho.Api.TonKho;

namespace XomNho.Api.Data;

/// <summary>
/// Dữ liệu mẫu cho môi trường phát triển / demo: mô phỏng 30 ngày hoạt động của cửa hàng
/// (khoảng 30 bản ghi cho mỗi chức năng). Chạy MỘT LẦN:
/// <c>dotnet run --project src/XomNho.Api --launch-profile http -- --du-lieu-mau</c>.
/// Mọi thao tác đi qua chính các dịch vụ nghiệp vụ (kiểm tra quy tắc, sinh mã theo ngày, FEFO, giá vốn, cảnh báo,
/// công nợ, nhật ký) với một đồng hồ lùi về từng ngày – nên số liệu nhất quán như dữ liệu thật.
/// </summary>
public static class DuLieuMau
{
    private sealed class DongHoMo : IDongHo
    {
        public DateTime BayGio { get; set; }
    }

    private sealed class NguoiDungMo : INguoiDungHienTai
    {
        public string? MaND { get; set; }
        public string? TenDangNhap { get; set; }
        public string? VaiTro { get; set; }
        public Guid? MaPhien => null;
        public string? DiaChiIP => "127.0.0.1";
    }

    /// <summary>Một "phiên làm việc" ngắn: DbContext mới + các dịch vụ, giống một request HTTP.</summary>
    private sealed class Phien(DbContextOptions<XomNhoDbContext> opt, DongHoMo dh, NguoiDungMo nd) : IDisposable
    {
        public XomNhoDbContext Db { get; } = new(opt, nd, dh);
        private SinhMaSqlServer SinhMa => new(Db, dh);
        private ThamSoHeThong ThamSo => new(Db);
        private DichVuQr Qr => new(Db, Options.Create(new TuyChonNganHang()), dh, NullLogger<DichVuQr>.Instance);
        private GuiChungTuGiaLap Gui => new(NullLogger<GuiChungTuGiaLap>.Instance);
        public DichVuCa Ca => new(Db, SinhMa, dh, NullLogger<DichVuCa>.Instance);
        public DichVuCanhBao CanhBao => new(Db, dh);
        public DichVuNhanVien NhanVien => new(Db, SinhMa, dh, nd, new RangBuocNhanVien(Db));
        public DichVuHangHoa HangHoa => new(Db, SinhMa, ThamSo);
        public DichVuTonKho TonKho => new(Db, SinhMa, dh, ThamSo, nd, CanhBao, Ca);
        public DichVuKhachHang KhachHang => new(Db, SinhMa, ThamSo);
        public DichVuCongNo CongNo => new(Db, SinhMa, dh, nd, ThamSo, Gui, Qr);
        public DichVuBanHang BanHang => new(Db, SinhMa, dh, nd, ThamSo, Ca, CanhBao, Gui, CongNo, Qr);
        public DichVuHuyHoaDon HuyHoaDon => new(Db, dh, nd, BanHang, Ca, CanhBao, CongNo);
        public DichVuDoiTra DoiTra => new(Db, SinhMa, dh, nd, BanHang, Ca, CanhBao, Qr);
        public DichVuKetCa KetCa => new(Db, SinhMa, dh, nd, CanhBao);
        public void Dispose() => Db.Dispose();
    }

    // ------------------------------------------------------------------ Danh mục dữ liệu

    /// <summary>(tên, mã danh mục, ĐVT, giá nhập, giá bán, ngưỡng hết hàng, ngưỡng hết hạn, số lượng nhập, hạn dùng (ngày), mức bán chạy).</summary>
    private static readonly (string Ten, string DM, string Dvt, int Nhap, int Ban, int NguongHang, int NguongHan, int SoLuong, int HanDung, int BanChay)[] SanPham =
    [
        ("Nước mắm Nam Ngư 500ml", "DM01", "chai", 28000, 35000, 5, 30, 24, 540, 2),
        ("Nước tương Maggi 300ml", "DM01", "chai", 14000, 18000, 5, 30, 24, 365, 2),
        ("Hạt nêm Knorr 400g", "DM01", "gói", 30000, 38000, 5, 30, 20, 365, 2),
        ("Muối i-ốt 500g", "DM01", "gói", 4000, 6000, 10, 30, 40, 720, 2),
        ("Dầu ăn Neptune 1L", "DM01", "chai", 45000, 52000, 5, 30, 25, 365, 2),
        ("Bánh Choco Pie 66g", "DM02", "hộp", 9500, 12000, 5, 15, 18, 75, 3),
        ("Snack Oishi tôm cay 40g", "DM02", "gói", 4000, 6000, 10, 15, 60, 50, 4),
        ("Bánh quy Cosy 240g", "DM02", "hộp", 25000, 32000, 5, 20, 15, 120, 1),
        ("Mì Hảo Hảo tôm chua cay", "DM03", "gói", 3500, 4500, 20, 20, 120, 150, 5),
        ("Mì Omachi sườn hầm ngũ quả", "DM03", "gói", 6000, 8000, 15, 20, 60, 150, 3),
        ("Mì Kokomi đại 90g", "DM03", "gói", 3000, 4000, 20, 20, 100, 150, 4),
        ("Phở khô Bích Chi 500g", "DM04", "gói", 18000, 24000, 5, 30, 20, 300, 1),
        ("Bún gạo khô Safoco 300g", "DM04", "gói", 12000, 16000, 5, 30, 20, 300, 1),
        ("Bột giặt OMO 800g", "DM05", "gói", 42000, 52000, 5, 30, 20, 720, 1),
        ("Nước giặt Ariel túi 2kg", "DM05", "gói", 98000, 118000, 3, 30, 12, 720, 1),
        ("Nước xả Comfort 800ml", "DM06", "chai", 48000, 58000, 3, 30, 12, 720, 1),
        ("Nước xả Downy 800ml", "DM06", "chai", 52000, 64000, 3, 30, 12, 720, 1),
        ("Sữa tắm Lifebuoy 850g", "DM07", "chai", 115000, 138000, 3, 30, 10, 720, 1),
        ("Dầu gội Clear 630g", "DM08", "chai", 135000, 160000, 3, 30, 8, 720, 1),
        ("Dầu gội Sunsilk 320g", "DM08", "chai", 62000, 75000, 3, 30, 10, 720, 1),
        ("Nước suối Aquafina 500ml", "DM09", "chai", 4500, 6000, 15, 30, 96, 300, 5),
        ("Nước ngọt Coca-Cola 330ml", "DM09", "lon", 7500, 10000, 12, 30, 72, 240, 5),
        ("Trà xanh Không Độ 455ml", "DM09", "chai", 7000, 10000, 12, 30, 48, 240, 4),
        ("Nước tăng lực Sting 330ml", "DM09", "chai", 7500, 10000, 12, 30, 48, 240, 4),
        ("Bia Sài Gòn Lager 330ml", "DM09", "lon", 10500, 13000, 12, 30, 48, 270, 3),
        ("Sữa Vinamilk có đường 180ml", "DM10", "hộp", 5800, 7500, 10, 10, 48, 32, 5),
        ("Sữa chua uống Yakult", "DM10", "lốc", 22000, 28000, 4, 7, 16, 26, 2),
        ("Sữa đặc Ông Thọ 380g", "DM10", "lon", 21000, 26000, 5, 30, 20, 300, 2),
        ("Gạo ST25 túi 5kg", "DM11", "gói", 150000, 180000, 3, 30, 12, 270, 1),
        ("Đậu xanh cà vỏ 500g", "DM11", "gói", 22000, 28000, 4, 30, 15, 240, 1),
    ];

    private static readonly string[] Ho = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý"];
    private static readonly string[] Dem = ["Văn", "Thị", "Minh", "Ngọc", "Thanh", "Hoài", "Quốc", "Thu", "Đức", "Gia", "Kim", "Hữu", "Bảo", "Mỹ"];
    private static readonly string[] Ten = ["An", "Bình", "Chi", "Dũng", "Giang", "Hà", "Hải", "Hạnh", "Hiếu", "Hòa", "Hùng", "Hương", "Khang", "Lan", "Linh", "Long", "Mai", "Nam", "Nga", "Phong", "Phúc", "Quân", "Sơn", "Tâm", "Thảo", "Trang", "Tuấn", "Uyên", "Vy", "Yến"];
    private static readonly string[] Duong = ["Lê Duẩn", "Nguyễn Văn Linh", "Hùng Vương", "Trần Phú", "Ông Ích Khiêm", "Hải Phòng", "Lê Lợi", "Phan Châu Trinh", "Điện Biên Phủ", "Hàm Nghi", "Ngũ Hành Sơn", "Tôn Đức Thắng"];

    private static string HoTen(Random r, HashSet<string> daDung)
    {
        while (true)
        {
            var ten = $"{Ho[r.Next(Ho.Length)]} {Dem[r.Next(Dem.Length)]} {Ten[r.Next(Ten.Length)]}";
            if (daDung.Add(ten)) return ten;
        }
    }

    // ------------------------------------------------------------------ Chạy

    public static async Task ChayAsync(IServiceProvider services, CancellationToken ct = default)
    {
        using var scope = services.CreateScope();
        var log = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("DuLieuMau");
        var chuoiKetNoi = scope.ServiceProvider.GetRequiredService<IConfiguration>().GetConnectionString("XomNho");
        var opt = new DbContextOptionsBuilder<XomNhoDbContext>().UseSqlServer(chuoiKetNoi).Options;
        var dh = new DongHoMo { BayGio = new DongHoVietNam().BayGio };
        var nd = new NguoiDungMo();
        var r = new Random(20261110);
        var dem = new Dictionary<string, int>();
        void Dem(string viec) => dem[viec] = dem.GetValueOrDefault(viec) + 1;

        void La(string maND) => (nd.MaND, nd.VaiTro, nd.TenDangNhap) =
            (maND, maND.StartsWith("CQ") ? VaiTroNguoiDung.ChuQuan : VaiTroNguoiDung.NhanVien, maND);

        /// Chạy một thao tác trong phiên riêng; lỗi nghiệp vụ (vd. không đủ hàng) thì bỏ qua thao tác đó.
        async Task<T?> Thu<T>(string viec, Func<Phien, Task<T>> f)
        {
            using var p = new Phien(opt, dh, nd);
            try
            {
                var kq = await f(p);
                Dem(viec);
                return kq;
            }
            catch (LoiNghiepVuException ex)
            {
                log.LogDebug("Bỏ qua {Viec} lúc {Gio}: {Loi}", viec, dh.BayGio, ex.Message);
                Dem("bỏ qua – " + viec);
                return default;
            }
        }

        using (var p = new Phien(opt, dh, nd))
        {
            if (await p.Db.HangHoa.AnyAsync(h => h.TenHH == SanPham[0].Ten, ct))
            {
                log.LogWarning("Dữ liệu mẫu đã có (tìm thấy \"{Ten}\") – không chạy lại.", SanPham[0].Ten);
                return;
            }
        }

        // 0. Ca đang mở (theo giờ thật) phải kết thúc trước khi mô phỏng các ngày trước đó (Q10: một ca mở toàn quán).
        La("CQ001");
        using (var p = new Phien(opt, dh, nd))
        {
            var mo = await p.Db.CaLamViec.AsNoTracking().FirstOrDefaultAsync(c => c.TrangThai != TrangThaiCa.DaKetThuc, ct);
            if (mo is not null)
            {
                await p.KetCa.BatDauAsync(new YeuCauMaCa(mo.MaCa), ct);
                await p.KetCa.LuuAsync(new YeuCauLuuBienBan(mo.MaCa, []), ct);
                log.LogInformation("Đã kết thúc ca đang mở {MaCa} trước khi tạo dữ liệu mẫu.", mo.MaCa);
            }
        }

        var homNayThat = DateOnly.FromDateTime(dh.BayGio);
        var ngayDau = homNayThat.AddDays(-31);          // 30 ngày: từ hôm nay − 31 đến hôm nay − 2
        DateTime Luc(int ngay, int gio, int phut) => ngayDau.AddDays(ngay).ToDateTime(new TimeOnly(gio, phut));

        var maHang = new List<(string Ma, int Index)>();
        var nhanVien = new List<string>();
        var khachThuong = new List<string>();
        var khachQuen = new List<string>();
        var tenDaDung = new HashSet<string>();
        var nvChuaTao = Enumerable.Range(2, 29).ToList();   // NV002 … NV030

        async Task ThemNhanVienAsync(int stt)
        {
            var ma = await Thu("Thêm nhân viên", p => p.NhanVien.ThemAsync(new YeuCauThemNhanVien(
                HoTen(r, tenDaDung), new DateOnly(1985 + r.Next(21), 1 + r.Next(12), 1 + r.Next(28)).ToString("yyyy-MM-dd"),
                $"0935{stt:D6}", $"nhanvien{stt:D2}@xomnho.vn", $"nhanvien{stt:D2}", "NhanVien2026"), ct));
            if (ma is not null) nhanVien.Add(ma);
        }

        async Task ThemKhachThuongAsync()
        {
            var stt = khachThuong.Count + 1;
            var kh = await Thu("Thêm khách hàng", p => p.KhachHang.ThemAsync(new YeuCauKhachHang(HoTen(r, tenDaDung), $"0976{stt:D6}"), ct));
            if (kh is not null) khachThuong.Add(kh.MaKH);
        }

        async Task ThemKhachQuenAsync()
        {
            var stt = khachQuen.Count + 1;
            var diaChi = $"{1 + r.Next(250)} {Duong[r.Next(Duong.Length)]}, Đà Nẵng";
            var ma = await Thu("Thêm khách quen", p => p.CongNo.ThemKhachQuenAsync(
                new YeuCauKhachQuen(HoTen(r, tenDaDung), $"0388{stt:D6}", $"04820{stt:D7}", diaChi), ct));
            if (ma is not null) khachQuen.Add(ma);
        }

        async Task ThemLoAsync(int idx, int ngay)
        {
            var sp = SanPham[idx];
            var soLuong = Math.Max(4, sp.SoLuong + r.Next(-sp.SoLuong / 5, sp.SoLuong / 5 + 1));
            var hsd = ngayDau.AddDays(ngay + sp.HanDung + r.Next(-3, 4));
            await Thu("Thêm lô hàng", p => p.TonKho.ThemLoAsync(new YeuCauThemLo(sp.Ten, soLuong.ToString(), hsd.ToString("yyyy-MM-dd")), ct));
        }

        /// Tồn bán được (lô còn hạn, còn hàng) theo mã hàng.
        async Task<Dictionary<string, int>> TonAsync()
        {
            using var p = new Phien(opt, dh, nd);
            var homNay = dh.BayGio.Date;
            var hn = DateOnly.FromDateTime(homNay);
            return await p.Db.LoHang.AsNoTracking().Where(l => l.SoLuongTon > 0 && l.HanSuDung >= hn)
                .GroupBy(l => l.MaHH).Select(g => new { g.Key, Ton = g.Sum(l => l.SoLuongTon) })
                .ToDictionaryAsync(x => x.Key, x => x.Ton, ct);
        }

        int ChonHang()
        {
            var tong = maHang.Sum(h => SanPham[h.Index].BanChay);
            var x = r.Next(tong);
            foreach (var h in maHang)
            {
                x -= SanPham[h.Index].BanChay;
                if (x < 0) return h.Index;
            }
            return maHang[0].Index;
        }

        /// Một giao dịch bán: tiền mặt / QR (giả lập) / ghi nợ cho khách quen.
        async Task<(string? MaHD, bool TienMat)> BanAsync()
        {
            var ton = await TonAsync();
            var gio = new Dictionary<string, int>();
            for (var i = 0; i < 1 + r.Next(3); i++)
            {
                var idx = ChonHang();
                var ma = maHang.First(h => h.Index == idx).Ma;
                var sl = 1 + r.Next(SanPham[idx].BanChay >= 4 ? 4 : 2);
                if (ton.GetValueOrDefault(ma) - gio.GetValueOrDefault(ma) >= sl) gio[ma] = gio.GetValueOrDefault(ma) + sl;
            }
            if (gio.Count == 0) return (null, false);
            var dong = gio.Select(g => new DongGioHang(g.Key, g.Value)).ToList();
            var tong = gio.Sum(g => g.Value * SanPham[maHang.First(h => h.Ma == g.Key).Index].Ban);

            var xuc = r.NextDouble();
            if (xuc < 0.18 && khachQuen.Count > 0) // ghi nợ (UC_7.1) – không đạt điều kiện thì khách trả tiền mặt
            {
                var kq = khachQuen[r.Next(khachQuen.Count)];
                var hd = await Thu("Hóa đơn ghi nợ", p => p.BanHang.TaoHoaDonNoAsync(new YeuCauGhiNo(kq, dong), ct));
                if (hd is not null) return (hd.MaHD, false);
            }
            var maKH = r.NextDouble() < 0.35 && khachThuong.Count > 0 ? khachThuong[r.Next(khachThuong.Count)] : null;
            var qr = xuc > 0.7;
            var tienDua = qr ? null : (Math.Ceiling(tong / 10000m) * 10000 + (r.NextDouble() < 0.4 ? 50000 : 0)).ToString("0");
            var tt = await Thu("Thanh toán", p => p.BanHang.ThanhToanAsync(new YeuCauThanhToan(
                maKH, dong, qr ? PhuongThucThanhToan.ChuyenKhoanQr : PhuongThucThanhToan.TienMat, tienDua, qr ? "ThanhCong" : null), ct));
            if (tt is null) return (null, false);
            var hoaDon = await Thu(qr ? "Hóa đơn chuyển khoản" : "Hóa đơn tiền mặt",
                p => p.BanHang.TaoHoaDonAsync(new YeuCauTaoHoaDon(tt.MaPTT, maKH, dong), ct));
            return (hoaDon?.MaHD, !qr);
        }

        string[] lyDoDoiTra = ["Khách mua nhầm vị", "Khách đổi ý, muốn lấy loại khác", "Mua dư, khách trả lại", "Khách muốn đổi sang loại lớn hơn"];
        string[] lyDoDieuChinh = ["Hàng bị vỡ khi sắp xếp lên kệ", "Kiểm kê thấy thiếu so với hệ thống", "Bao bì bị chuột cắn, hủy bỏ", "Hàng móp méo, trả nhà cung cấp"];
        string[] nguyenNhanKetCa = ["Thiếu hàng, chưa rõ nguyên nhân", "Khách lấy thêm nhưng quên tính tiền", "Đếm nhầm lúc nhập lô", "Hàng bị vỡ trong ca"];
        var ngayLechKetCa = new HashSet<int> { 3, 8, 13, 17, 23, 27 };
        var ngayDieuChinh = new HashSet<int> { 5, 9, 14, 18, 24, 26 };
        var ngayHuy = new HashSet<int> { 4, 10, 16, 20, 25 };
        var caLam = new List<string>();

        for (var ngay = 0; ngay < 30; ngay++)
        {
            // ---------------- Đầu ngày: ca do người phụ trách mở (Q10). Chủ nhật Chủ quán đứng quầy.
            var laChuNhat = ngayDau.AddDays(ngay).DayOfWeek == DayOfWeek.Sunday;
            var dangLam = nhanVien.Where(m => !caLam.Contains(m)).Take(6).Prepend("NV001").ToList();
            var phuTrach = ngay == 0 || laChuNhat ? "CQ001" : dangLam[ngay % dangLam.Count];
            dh.BayGio = Luc(ngay, 6, 30 + r.Next(20));
            La(phuTrach);
            var ca = await Thu("Mở ca", p => p.Ca.DamBaoCaMoAsync(phuTrach, ct));
            if (ca is null) continue;

            // ---------------- Việc của Chủ quán buổi sáng
            La("CQ001");
            dh.BayGio = Luc(ngay, 7, 0);
            if (ngay == 0)
            {
                foreach (var stt in nvChuaTao.Take(8).ToList()) { await ThemNhanVienAsync(stt); nvChuaTao.Remove(stt); }
                for (var i = 0; i < SanPham.Length; i++)
                {
                    var sp = SanPham[i];
                    var ma = await Thu("Thêm hàng hóa", p => p.HangHoa.ThemAsync(new YeuCauHangHoa(
                        sp.Ten, null, sp.DM, sp.Dvt, sp.Nhap.ToString(), sp.Ban.ToString(), sp.NguongHang.ToString(), sp.NguongHan.ToString()), ct));
                    if (ma is not null) maHang.Add((ma, i));
                }
                dh.BayGio = Luc(ngay, 7, 40);
                foreach (var h in maHang) await ThemLoAsync(h.Index, ngay);
                for (var i = 0; i < 5; i++) await ThemKhachThuongAsync();
                for (var i = 0; i < 8; i++) await ThemKhachQuenAsync();
            }
            else
            {
                if (nvChuaTao.Count > 0 && ngay <= 21) { await ThemNhanVienAsync(nvChuaTao[0]); nvChuaTao.RemoveAt(0); }
                if (khachThuong.Count < 30) await ThemKhachThuongAsync();
                if (khachQuen.Count < 30 && ngay % 4 != 3) await ThemKhachQuenAsync();
            }

            // Nhập thêm lô cho hàng sắp hết (ngày 11, 21) và đồ uống trước cuối tuần (ngày 25).
            if (ngay is 11 or 21 or 25)
            {
                dh.BayGio = Luc(ngay, 8, 0);
                var ton = await TonAsync();
                foreach (var h in maHang)
                {
                    var sp = SanPham[h.Index];
                    var canNhap = ngay == 25 ? sp.DM == "DM09" : ton.GetValueOrDefault(h.Ma) < Math.Max(sp.NguongHang * 2, sp.SoLuong / 2);
                    if (canNhap) await ThemLoAsync(h.Index, ngay);
                }
            }

            // Điều chỉnh tồn (UC_3.3) khi phát hiện hàng hỏng / thiếu.
            if (ngayDieuChinh.Contains(ngay))
            {
                dh.BayGio = Luc(ngay, 9, 15);
                using var p0 = new Phien(opt, dh, nd);
                var homNay = DateOnly.FromDateTime(dh.BayGio);
                var cacLo = await p0.Db.LoHang.AsNoTracking().Where(l => l.SoLuongTon >= 6 && l.HanSuDung > homNay)
                    .Select(l => new { l.MaLo, l.SoLuongTon }).ToListAsync(ct);
                if (cacLo.Count > 0)
                {
                    var lo = cacLo[r.Next(cacLo.Count)];
                    var moi = (lo.SoLuongTon - 1 - r.Next(3)).ToString();
                    var lyDo = lyDoDieuChinh[r.Next(lyDoDieuChinh.Length)];
                    await Thu("Điều chỉnh tồn", async p =>
                    {
                        await p.TonKho.DieuChinhAsync(lo.MaLo, new YeuCauDieuChinh(moi, null, lyDo), ct);
                        return true;
                    });
                }
            }

            // ---------------- Bán hàng trong ngày (người phụ trách ca đứng quầy)
            La(phuTrach);
            var soGiaoDich = 3 + r.Next(2) + (laChuNhat ? 1 : 0);
            var phut = Enumerable.Range(0, soGiaoDich).Select(_ => 7 * 60 + 15 + r.Next(13 * 60 + 15)).Order().ToList();
            foreach (var m in phut)
            {
                dh.BayGio = Luc(ngay, m / 60, m % 60);
                var (maHD, tienMat) = await BanAsync();

                // Hủy hóa đơn (UC_6.3): khách đổi ý ngay tại quầy, chưa nhận hàng.
                if (maHD is not null && tienMat && ngayHuy.Remove(ngay))
                {
                    La("CQ001");
                    dh.BayGio = dh.BayGio.AddMinutes(3);
                    await Thu("Hủy hóa đơn", p => p.HuyHoaDon.HuyAsync(new YeuCauHuyHoaDon(maHD, true, "Khách đổi ý, chưa nhận hàng"), ct));
                    La(phuTrach);
                }
            }

            // ---------------- Đổi trả (UC_6.2, 6.4) cho hóa đơn trong 7 ngày
            if (ngay >= 2 && (ngay % 2 == 0 || ngay == 29))
            {
                dh.BayGio = Luc(ngay, 16, 10 + r.Next(30));
                using var p0 = new Phien(opt, dh, nd);
                var tu = dh.BayGio.Date.AddDays(-5);
                var ung = await p0.Db.HoaDon.AsNoTracking()
                    .Where(h => h.TrangThai == TrangThaiHoaDon.DaThanhToan && h.GhiNo == null && h.NgayGioLap >= tu && h.NgayGioLap < dh.BayGio)
                    .Where(h => !p0.Db.PhieuDoiTra.Any(x => x.MaHD == h.MaHD))
                    .Select(h => new { h.MaHD, MaHH = h.ChiTiet.Select(c => c.MaHH).First() })
                    .ToListAsync(ct);
                if (ung.Count > 0)
                {
                    var hd = ung[r.Next(ung.Count)];
                    var doi = r.NextDouble() < 0.4;
                    var ton = await TonAsync();
                    var giaCu = SanPham[maHang.First(h => h.Ma == hd.MaHH).Index].Ban;
                    var hangMoi = maHang.Where(h => h.Ma != hd.MaHH && ton.GetValueOrDefault(h.Ma) > 2 && Math.Abs(SanPham[h.Index].Ban - giaCu) <= 6000)
                        .Select(h => h.Ma).FirstOrDefault();
                    if (hangMoi is null) doi = false;
                    var phieu = await Thu(doi ? "Phiếu đổi hàng" : "Phiếu trả hàng", p => p.DoiTra.LapPhieuAsync(new YeuCauLapPhieu(
                        hd.MaHD, doi ? LoaiPhieuDoiTra.DoiHang : LoaiPhieuDoiTra.TraHang,
                        [new DongYeuCauDoiTra(hd.MaHH, 1, doi ? hangMoi : null, doi ? 1 : null)],
                        DichVuDoiTra.TinhTrangDat, false, null, lyDoDoiTra[r.Next(lyDoDoiTra.Length)]), ct));
                    // Ngày cuối để lại một phiếu "Chờ duyệt" cho Chủ quán.
                    if (phieu is not null && ngay < 29)
                    {
                        La("CQ001");
                        dh.BayGio = dh.BayGio.AddMinutes(40);
                        var tuChoi = r.NextDouble() < 0.18;
                        var kq = tuChoi
                            ? await Thu("Từ chối phiếu", p => p.DoiTra.TuChoiAsync(new YeuCauTuChoi(phieu.MaPDT, "Hàng đã mở bao bì, không đủ điều kiện đổi trả"), ct))
                            : await Thu("Duyệt phiếu", p => p.DoiTra.DuyetAsync(phieu.MaPDT, ct));
                        La(phuTrach);
                        if (kq is not null && !tuChoi)
                        {
                            dh.BayGio = dh.BayGio.AddMinutes(10);
                            await Thu("Hoàn tất đổi trả", p => p.DoiTra.XuLyAsync(new YeuCauXuLyPhieu(
                                phieu.MaPDT, kq.ChenhLech > 0 ? PhuongThucThanhToan.TienMat : null, null), ct));
                        }
                    }
                }
            }

            // ---------------- Thu nợ (UC_7.3): trả các hóa đơn nợ cũ nhất
            dh.BayGio = Luc(ngay, 17, 30);
            using (var p0 = new Phien(opt, dh, nd))
            {
                var no = await p0.Db.HoaDonNo.AsNoTracking()
                    .Where(n => n.HoaDon.TrangThai == TrangThaiHoaDon.ConNo && n.HoaDon.NgayGioLap < dh.BayGio.Date.AddDays(-3))
                    .OrderBy(n => n.HoaDon.NgayGioLap)
                    .Select(n => new { n.MaKQ, n.MaHD, ConNo = n.HoaDon.TongTien - n.HoaDon.SoTienDaTra })
                    .ToListAsync(ct);
                foreach (var g in no.GroupBy(n => n.MaKQ))
                {
                    if (r.NextDouble() > 0.22) continue;
                    var tra = g.Take(1 + r.Next(g.Count())).ToList();
                    var tong = tra.Sum(x => x.ConNo);
                    var qr = r.NextDouble() < 0.4;
                    dh.BayGio = dh.BayGio.AddMinutes(7);
                    await Thu("Phiếu thu nợ", p => p.CongNo.ThuNoAsync(new YeuCauThuNo(g.Key, tra.Select(x => x.MaHD).ToList(),
                        qr ? PhuongThucThanhToan.ChuyenKhoanQr : PhuongThucThanhToan.TienMat,
                        qr ? null : (Math.Ceiling(tong / 10000m) * 10000).ToString("0"), qr ? "ThanhCong" : null), ct));
                }
            }

            // ---------------- Nhân viên nghỉ việc (UC_2.4: đã có giao dịch → "Ngừng hoạt động")
            if (ngay is 24 or 28 && dangLam.Count > 3)
            {
                var nghi = dangLam[^1];
                if (nghi != phuTrach)
                {
                    La("CQ001");
                    dh.BayGio = Luc(ngay, 18, 0);
                    var xong = await Thu("Nhân viên nghỉ việc", p => p.NhanVien.XoaAsync(nghi, CheDoXoa.NgungHoatDong, ct));
                    if (xong is not null) caLam.Add(nghi); // không xếp ca cho người đã nghỉ
                    La(phuTrach);
                }
            }

            // ---------------- Kết ca cuối ngày (UC_9.1): đôi khi có chênh lệch kèm nguyên nhân
            dh.BayGio = Luc(ngay, 21, 30 + r.Next(20));
            var bb = await Thu("Bắt đầu kết ca", p => p.KetCa.BatDauAsync(new YeuCauMaCa(ca.MaCa), ct));
            if (bb is null) continue;
            var lech = new List<DongNhapKiemKe>();
            if (ngayLechKetCa.Contains(ngay))
            {
                var dong = bb.Dong.Where(d => d.SoLuongLyThuyet >= 4).ToList();
                if (dong.Count > 0)
                {
                    var d = dong[r.Next(dong.Count)];
                    var chenh = r.NextDouble() < 0.75 ? -1 - r.Next(2) : 1;
                    lech.Add(new DongNhapKiemKe(d.MaHH, d.SoLuongLyThuyet + chenh, nguyenNhanKetCa[r.Next(nguyenNhanKetCa.Length)]));
                }
            }
            dh.BayGio = dh.BayGio.AddMinutes(15);
            await Thu("Biên bản kết ca", p => p.KetCa.LuuAsync(new YeuCauLuuBienBan(ca.MaCa, lech), ct));
        }

        // Tài khoản còn lại tạo trong tháng, chưa từng đứng ca.
        La("CQ001");
        dh.BayGio = Luc(29, 22, 30);
        foreach (var stt in nvChuaTao.ToList()) await ThemNhanVienAsync(stt);

        // Theo giờ thật: quét cảnh báo hằng ngày và cập nhật quyền mua nợ (khoản nợ quá 30 ngày → khóa, Q23).
        dh.BayGio = new DongHoVietNam().BayGio;
        await Thu("Quét cảnh báo", p => p.CanhBao.QuetHangNgayAsync(ct));
        await Thu("Cập nhật quyền mua nợ", p => p.CongNo.CapNhatQuyenMuaNoAsync(null, ct));

        foreach (var (viec, so) in dem.OrderBy(x => x.Key)) log.LogInformation("{Viec,-28}: {So}", viec, so);
        log.LogInformation("Đã tạo dữ liệu mẫu cho {SoNgay} ngày, từ {Tu:dd/MM/yyyy} đến {Den:dd/MM/yyyy}.", 30, ngayDau, ngayDau.AddDays(29));
    }
}
