using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using XomNho.Api.Data;
using XomNho.Api.Domain;
using XomNho.Api.HeThongQL;

namespace XomNho.Tests;

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
