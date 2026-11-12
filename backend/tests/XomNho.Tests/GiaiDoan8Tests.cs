using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using XomNho.Api.BanHangQL;
using XomNho.Api.CaLam;
using XomNho.Api.Common;
using XomNho.Api.Data;
using XomNho.Api.Domain;
using XomNho.Api.HeThongQL;
using XomNho.Api.TichHop;

namespace XomNho.Tests;

/// <summary>Giai đoạn 8d – khung VietQR + webhook xác nhận tiền vào.</summary>
public class VietQrTests
{
    private const string Khoa = "khoa-bi-mat-thu";

    private static async Task<MoiTruongThu> CoHangVietQrAsync()
    {
        var mt = new MoiTruongThu();
        mt.NganHang.CheDo = TuyChonNganHang.VietQr;
        mt.NganHang.MaNganHang = "970436";
        mt.NganHang.SoTaiKhoan = "0123456789";
        mt.NganHang.TenTaiKhoan = "TAP HOA XOM NHO";
        mt.NganHang.Webhook.KhoaBiMat = Khoa;
        await mt.ThemHangAsync("Nước cam");
        await mt.ThemLoAsync("Nước cam", 10, 365);
        return mt;
    }

    private static string SePay(string id, decimal soTien, string noiDung, string loai = "in") =>
        $$"""{"id":{{id}},"gateway":"Vietcombank","transferType":"{{loai}}","transferAmount":{{soTien}},"content":"{{noiDung}}"}""";

    private static Task<KetQuaThanhToan> BanQr(MoiTruongThu mt, string? maThamChieu) =>
        mt.DvBanHang().ThanhToanAsync(new YeuCauThanhToan(null, [new DongGioHang("HH-0001", 1)], PhuongThucThanhToan.ChuyenKhoanQr, null, null, maThamChieu), default);

    [Fact]
    public async Task Tao_anh_VietQR_theo_tai_khoan_cau_hinh()
    {
        using var mt = await CoHangVietQrAsync();
        var qr = mt.DvQr().TaoQr(10000);
        Assert.Matches("^XN[A-Z0-9]{8}$", qr.MaThamChieu);
        Assert.StartsWith("https://img.vietqr.io/image/970436-0123456789-compact2.png?amount=10000&addInfo=" + qr.MaThamChieu, qr.UrlAnh);
        Assert.Contains("accountName=TAP%20HOA%20XOM%20NHO", qr.UrlAnh);
    }

    [Fact]
    public void Xac_thuc_webhook_bang_token_hoac_HMAC()
    {
        using var mt = new MoiTruongThu();
        mt.NganHang.Webhook.KhoaBiMat = Khoa;
        Assert.True(mt.DvQr().XacThucWebhook("Apikey " + Khoa, "{}"));
        Assert.False(mt.DvQr().XacThucWebhook("Apikey sai", "{}"));
        Assert.False(mt.DvQr().XacThucWebhook(null, "{}"));

        mt.NganHang.Webhook.KieuXacThuc = "HMAC";
        var than = """{"id":1}""";
        var chuKy = Convert.ToHexString(System.Security.Cryptography.HMACSHA256.HashData(
            System.Text.Encoding.UTF8.GetBytes(Khoa), System.Text.Encoding.UTF8.GetBytes(than))).ToLowerInvariant();
        Assert.True(mt.DvQr().XacThucWebhook(chuKy, than));
        Assert.False(mt.DvQr().XacThucWebhook(chuKy, than + " "));
    }

    [Fact]
    public async Task Chua_co_tien_vao_thi_that_bai_co_tien_vao_khop_ma_thi_ban_duoc_va_khong_dung_lai()
    {
        using var mt = await CoHangVietQrAsync();
        var qr = mt.DvQr().TaoQr(10000);
        var loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() => BanQr(mt, qr.MaThamChieu)); // chưa có tiền vào
        Assert.Equal(StatusCodes.Status402PaymentRequired, loi.MaTrangThai);
        Assert.False(await mt.DvQr().DaNhanAsync(qr.MaThamChieu, 10000, default));

        // Ngân hàng chèn dấu cách / chữ thường vào nội dung; tiền ra và giao dịch trùng bị bỏ qua.
        var noiDung = $"CK {qr.MaThamChieu[..5].ToLowerInvariant()} {qr.MaThamChieu[5..]} cam on";
        Assert.Equal(1, await mt.DvQr().NhanWebhookAsync(SePay("101", 10000, noiDung), default));
        Assert.Equal(0, await mt.DvQr().NhanWebhookAsync(SePay("101", 10000, noiDung), default));
        Assert.Equal(0, await mt.DvQr().NhanWebhookAsync(SePay("102", 50000, qr.MaThamChieu, "out"), default));
        Assert.True(await mt.DvQr().DaNhanAsync(qr.MaThamChieu, 10000, default));
        Assert.False(await mt.DvQr().DaNhanAsync(qr.MaThamChieu, 20000, default)); // chuyển thiếu tiền

        var tt = await BanQr(mt, qr.MaThamChieu);
        Assert.Equal("101", mt.Db.PhieuThanhToan.Single(p => p.MaPTT == tt.MaPTT).MaGiaoDichNganHang);
        Assert.Equal(tt.MaPTT, mt.Db.GiaoDichNganHang.Single().MaPTT);

        loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() => BanQr(mt, qr.MaThamChieu)); // giao dịch đã dùng
        Assert.Equal(StatusCodes.Status402PaymentRequired, loi.MaTrangThai);
    }

    [Fact]
    public async Task Webhook_dang_Casso_doc_mang_data()
    {
        using var mt = new MoiTruongThu();
        var w = mt.NganHang.Webhook;
        (w.TruongDanhSach, w.TruongSoTien, w.TruongNoiDung) = ("data", "amount", "description");
        var than = """{"error":0,"data":[{"id":7,"amount":25000,"description":"XNABCDEFGH"},{"id":8,"amount":"30000","description":"khac"}]}""";
        Assert.Equal(2, await mt.DvQr().NhanWebhookAsync(than, default));
        Assert.Equal([25000m, 30000m], mt.Db.GiaoDichNganHang.OrderBy(g => g.MaGD).Select(g => g.SoTien));
    }
}

/// <summary>SUA_BAO_CAO 12.5 – NFR Security-04: Nhân viên chỉ xem lịch sử đổi trả khi có ca đang mở.</summary>
public class GioLamViecTests
{
    [Fact]
    public async Task Nhan_vien_khong_xem_duoc_khi_khong_co_ca_chu_quan_van_xem_duoc()
    {
        using var mt = new MoiTruongThu();
        mt.DangNhapLa("NV001");
        var loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() => mt.DvDoiTra().KiemTraGioLamViecAsync(default));
        Assert.Equal((StatusCodes.Status403Forbidden, XomNho.Api.DoiTraQL.DichVuDoiTra.NgoaiGioLamViec), (loi.MaTrangThai, loi.Message));

        mt.DangNhapLa("CQ001");
        await mt.DvDoiTra().KiemTraGioLamViecAsync(default);

        await mt.DvCa().DamBaoCaMoAsync("NV001", default);
        mt.DangNhapLa("NV001");
        await mt.DvDoiTra().KiemTraGioLamViecAsync(default); // có ca đang mở
    }
}

/// <summary>Đồng bộ thời gian thực: sau mỗi lần lưu, phát đúng nhóm dữ liệu và đúng người nhận thông báo.</summary>
public class SuKienTucThoiTests
{
    private sealed class KenhGia : IKenhSuKien
    {
        public List<(string[] Nhom, string[] NguoiNhan)> DaGui { get; } = [];
        public void Gui(IReadOnlyCollection<string> nhomDuLieu, IReadOnlyCollection<string> nguoiNhanThongBao) =>
            DaGui.Add(([.. nhomDuLieu.Order()], [.. nguoiNhanThongBao]));
    }

    private static (XomNhoDbContext Db, KenhGia Kenh) TaoDb()
    {
        var kenh = new KenhGia();
        var gom = new GomSuKien(kenh);
        var options = new DbContextOptionsBuilder<XomNhoDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .AddInterceptors(new GomSuKienKhiLuu(gom), new GomSuKienGiaoDich(gom))
            .Options;
        var db = new XomNhoDbContext(options, new NguoiDungHienTaiGia(), new DongHoGia());
        db.Database.EnsureCreated();
        kenh.DaGui.Clear(); // bỏ lần lưu dữ liệu nạp sẵn
        return (db, kenh);
    }

    [Fact]
    public async Task Them_lo_hang_phat_nhom_kho()
    {
        var (db, kenh) = TaoDb();
        using var _ = db;
        var hh = new HangHoa { MaHH = "HH-0001", TenHH = "Nước cam", DonViTinh = "chai", GiaNhap = 8000, GiaBan = 10000, MaDM = "DM09" };
        db.HangHoa.Add(hh);
        db.LoHang.Add(new LoHang { MaLo = "LO-000001", MaHH = hh.MaHH, SoLuongTon = 10, HanSuDung = new DateOnly(2027, 1, 1) });
        await db.SaveChangesAsync();
        Assert.Equal([NhomDuLieu.Kho], Assert.Single(kenh.DaGui).Nhom);
    }

    [Fact]
    public async Task Thong_bao_chi_gui_nguoi_nhan_va_bang_khong_theo_doi_thi_khong_phat()
    {
        var (db, kenh) = TaoDb();
        using var _ = db;
        db.ThongBao.Add(new ThongBao { MaND = "NV001", LoaiThongBao = "Duyệt phiếu", NoiDung = "Phiếu đã được duyệt" });
        await db.SaveChangesAsync();
        var gui = Assert.Single(kenh.DaGui);
        Assert.Empty(gui.Nhom);
        Assert.Equal(["NV001"], gui.NguoiNhan);

        kenh.DaGui.Clear();
        // Nhật ký gửi chứng từ không thuộc nhóm nào.
        db.Add(new NhatKyGuiChungTu { LoaiChungTu = "HoaDon", MaChungTu = "HD-1", Kenh = "SMS", SDTNhan = "0900000000", KetQua = "OK", MaND = "NV001" });
        await db.SaveChangesAsync();
        Assert.Empty(kenh.DaGui);
    }

    [Fact]
    public void Nhom_theo_bang()
    {
        Assert.Equal(NhomDuLieu.Ca, NhomDuLieu.Cua(typeof(CaLamViec)));
        Assert.Equal(NhomDuLieu.Khach, NhomDuLieu.Cua(typeof(KhachQuen)));
        Assert.Equal(NhomDuLieu.DoiTra, NhomDuLieu.Cua(typeof(ChiTietDoiTra)));
        Assert.Null(NhomDuLieu.Cua(typeof(NhatKyThaoTac)));
    }
}

/// <summary>Backup NFR-01: lịch sao lưu tự động hằng ngày.</summary>
public class LichSaoLuuTests
{
    private static readonly TimeOnly Gio = new(23, 30);

    [Theory]
    [InlineData("2026-11-10 08:00", "2026-11-10 23:30")]
    [InlineData("2026-11-10 23:29", "2026-11-10 23:30")]
    [InlineData("2026-11-10 23:30", "2026-11-11 23:30")]
    [InlineData("2026-11-30 23:45", "2026-12-01 23:30")]
    public void Lan_ke_tiep(string bayGio, string mongDoi) =>
        Assert.Equal(DateTime.Parse(mongDoi), LichSaoLuu.LanKeTiep(DateTime.Parse(bayGio), Gio));

    [Theory]
    [InlineData(null, "2026-11-10 08:00", true)]                 // chưa từng sao lưu
    [InlineData("2026-11-09 23:31", "2026-11-10 08:00", false)]  // đã chạy đúng lịch tối qua
    [InlineData("2026-11-09 21:00", "2026-11-10 08:00", true)]   // tối qua máy tắt trước 23:30
    [InlineData("2026-11-09 23:31", "2026-11-10 23:40", true)]   // khởi động sau giờ chạy hôm nay mà chưa chạy
    [InlineData("2026-11-10 23:31", "2026-11-10 23:40", false)]
    public void Sao_luu_bu_khi_khoi_dong(string? lanCuoi, string bayGio, bool canBu) =>
        Assert.Equal(canBu, LichSaoLuu.CanSaoLuuBu(lanCuoi is null ? null : DateTime.Parse(lanCuoi), DateTime.Parse(bayGio), Gio));

    [Fact]
    public void Gio_chay_sai_dinh_dang_dung_mac_dinh() =>
        Assert.Equal(new TimeOnly(23, 30), new TuyChonSaoLuu { GioChay = "abc" }.Gio);
}
