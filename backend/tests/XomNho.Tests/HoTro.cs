using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using XomNho.Api.Common;
using XomNho.Api.Data;
using XomNho.Api.Domain;
using XomNho.Api.TichHop;
using XomNho.Api.XacThuc;

namespace XomNho.Tests;

public sealed class DongHoGia : IDongHo
{
    public DateTime BayGio { get; set; } = new(2026, 11, 10, 8, 0, 0);
    public void Tien(TimeSpan khoang) => BayGio = BayGio.Add(khoang);
}

public sealed class GuiOtpGia : IGuiOtp
{
    public List<(string Sdt, string Ma, string TenDangNhap)> DaGui { get; } = [];

    public Task GuiAsync(string soDienThoai, string maOtp, string tenDangNhapBiKhoa, CancellationToken ct = default)
    {
        DaGui.Add((soDienThoai, maOtp, tenDangNhapBiKhoa));
        return Task.CompletedTask;
    }
}

/// <summary>Môi trường kiểm thử: DB trong bộ nhớ + 1 Chủ quán + 1 Nhân viên.</summary>
public sealed class MoiTruongThu : IDisposable
{
    public const string MatKhauCQ = "ChuQuan2026";
    public const string MatKhauNV = "NhanVien2026";
    public const string SdtChuQuan = "0905123456";

    public XomNhoDbContext Db { get; }
    public DongHoGia DongHo { get; } = new();
    public GuiOtpGia GuiOtp { get; } = new();
    public DichVuXacThuc DichVu { get; }

    public MoiTruongThu(bool hienOtp = true)
    {
        var options = new DbContextOptionsBuilder<XomNhoDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        Db = new XomNhoDbContext(options, null, DongHo);

        var jwt = Options.Create(new TuyChonJwt { Key = new string('k', 48) });
        DichVu = new DichVuXacThuc(
            Db, DongHo, GuiOtp, new DichVuToken(jwt, DongHo), new ThamSoHeThong(Db),
            Options.Create(new TuyChonTichHop { HienOtpGiaLap = hienOtp }));

        Db.ChuQuan.Add(new ChuQuan
        {
            MaND = "CQ001", HoTen = "Nguyễn Văn An", NgaySinh = new DateOnly(1985, 5, 20),
            SDT = SdtChuQuan, Email = "cq@xomnho.vn", TenDangNhap = "chuquan",
            MatKhau = DichVuXacThuc.BamMatKhau(MatKhauCQ),
        });
        Db.NhanVien.Add(new NhanVien
        {
            MaND = "NV001", HoTen = "Trần Thị Mai", NgaySinh = new DateOnly(2000, 3, 15),
            SDT = "0912345678", Email = "nv@xomnho.vn", TenDangNhap = "nhanvien1",
            MatKhau = DichVuXacThuc.BamMatKhau(MatKhauNV),
        });
        Db.SaveChanges();
    }

    public NguoiDung Lay(string maND)
    {
        Db.ChangeTracker.Clear();
        return Db.NguoiDung.Single(x => x.MaND == maND);
    }

    public void Dispose() => Db.Dispose();
}
