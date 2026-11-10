using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using XomNho.Api.BanHangQL;
using XomNho.Api.CaLam;
using XomNho.Api.CongNoQL;
using XomNho.Api.KhachHangQL;
using XomNho.Api.Common;
using XomNho.Api.Data;
using XomNho.Api.Domain;
using XomNho.Api.HangHoaQL;
using XomNho.Api.NhanVienQL;
using XomNho.Api.TichHop;
using XomNho.Api.TonKho;
using XomNho.Api.XacThuc;

namespace XomNho.Tests;

public sealed class DongHoGia : IDongHo
{
    public DateTime BayGio { get; set; } = new(2026, 11, 10, 8, 0, 0);
    public DateOnly HomNay => DateOnly.FromDateTime(BayGio);
    public void Tien(TimeSpan khoang) => BayGio = BayGio.Add(khoang);
}

/// <summary>Sinh mã giả – đếm trong bộ nhớ, dùng đúng định dạng mã thật.</summary>
/// <remarks>
/// InMemory không theo dõi transaction nên không kiểm tra được yêu cầu "sinh mã trong transaction" của SinhMaSqlServer –
/// lỗi loại này chỉ bắt được bằng kiểm thử E2E trên SQL Server.
/// </remarks>
public sealed class SinhMaGia(IDongHo dongHo) : ISinhMa
{

    // Đếm theo (loại, kỳ) giống bảng BoDemMa. NV001 và CQ001 đã có sẵn trong môi trường thử.
    private readonly Dictionary<(LoaiMa, string), int> _dem = new()
    {
        [(LoaiMa.NhanVien, DinhDangMa.KyToanCuc)] = 1,
        [(LoaiMa.ChuQuan, DinhDangMa.KyToanCuc)] = 1,
    };

    public Task<string> SinhMaAsync(LoaiMa loai, CancellationToken ct = default)
    {
        var khoa = (loai, DinhDangMa.Ky(loai, dongHo.HomNay));
        _dem[khoa] = _dem.GetValueOrDefault(khoa) + 1;
        return Task.FromResult(DinhDangMa.Tao(loai, _dem[khoa], dongHo.HomNay));
    }

    public Task<string> XemTruocAsync(LoaiMa loai, CancellationToken ct = default) =>
        Task.FromResult(DinhDangMa.Tao(loai, _dem.GetValueOrDefault((loai, DinhDangMa.Ky(loai, dongHo.HomNay))) + 1, dongHo.HomNay));
}

/// <summary>Người dùng hiện tại giả – mặc định Chủ quán CQ001.</summary>
public sealed class NguoiDungHienTaiGia : INguoiDungHienTai
{
    public string? MaND { get; set; } = "CQ001";
    public string? TenDangNhap { get; set; } = "chuquan";
    public string? VaiTro { get; set; } = VaiTroNguoiDung.ChuQuan;
    public Guid? MaPhien { get; set; }
    public string? DiaChiIP => "127.0.0.1";
}

public sealed class GuiChungTuGia : IGuiChungTu
{
    public List<(string Kenh, string Sdt)> DaGui { get; } = [];
    public bool ThanhCong { get; set; } = true;

    public Task<bool> GuiAsync(string kenh, string soDienThoai, string noiDung, CancellationToken ct = default)
    {
        DaGui.Add((kenh, soDienThoai));
        return Task.FromResult(ThanhCong);
    }
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
    public NguoiDungHienTaiGia HienTai { get; } = new();
    public SinhMaGia SinhMa { get; }
    public DichVuXacThuc DichVu { get; }

    public MoiTruongThu(bool hienOtp = true)
    {
        var options = new DbContextOptionsBuilder<XomNhoDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;
        Db = new XomNhoDbContext(options, HienTai, DongHo);
        SinhMa = new SinhMaGia(DongHo);
        // Dữ liệu nạp sẵn bằng HasData (danh mục) – InMemory cần EnsureCreated để có.
        Db.Database.EnsureCreated();

        var jwt = Options.Create(new TuyChonJwt { Key = new string('k', 48) });
        DichVu = new DichVuXacThuc(
            Db, DongHo, GuiOtp, new DichVuToken(jwt, DongHo), new ThamSoHeThong(Db),
            Options.Create(new TuyChonTichHop { HienOtpGiaLap = hienOtp }), DvCa());

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

    public GuiChungTuGia GuiChungTu { get; } = new();

    public DichVuNhanVien DvNhanVien() => new(Db, SinhMa, DongHo, HienTai, new RangBuocNhanVien(Db));
    public DichVuHangHoa DvHangHoa() => new(Db, SinhMa, new ThamSoHeThong(Db));
    public DichVuCanhBao DvCanhBao() => new(Db, DongHo);
    public DichVuCa DvCa() => new(Db, SinhMa, DongHo, NullLogger<DichVuCa>.Instance);
    public DichVuTonKho DvTonKho() => new(Db, SinhMa, DongHo, new ThamSoHeThong(Db), HienTai, DvCanhBao(), DvCa());
    public DichVuKhachHang DvKhachHang() => new(Db, SinhMa, new ThamSoHeThong(Db));
    public DichVuCongNo DvCongNo() => new(Db, SinhMa, DongHo, HienTai, new ThamSoHeThong(Db), GuiChungTu);
    public DichVuBanHang DvBanHang() =>
        new(Db, SinhMa, DongHo, HienTai, new ThamSoHeThong(Db), DvCa(), DvCanhBao(), GuiChungTu, DvCongNo());

    public DichVuHuyHoaDon DvHuyHoaDon() => new(Db, DongHo, HienTai, DvBanHang(), DvCa(), DvCanhBao(), DvCongNo());
    public XomNho.Api.DoiTraQL.DichVuDoiTra DvDoiTra() => new(Db, SinhMa, DongHo, HienTai, DvBanHang(), DvCa(), DvCanhBao());

    /// <summary>Đổi người đang đăng nhập (mặc định Chủ quán CQ001).</summary>
    public void DangNhapLa(string maND)
    {
        HienTai.MaND = maND;
        HienTai.VaiTro = maND.StartsWith("CQ") ? VaiTroNguoiDung.ChuQuan : VaiTroNguoiDung.NhanVien;
        HienTai.TenDangNhap = maND.StartsWith("CQ") ? "chuquan" : "nhanvien1";
    }

    /// <summary>Tồn hiện tại của một lô (đọc lại từ DB).</summary>
    public int Ton(string maLo)
    {
        Db.ChangeTracker.Clear();
        return Db.LoHang.Single(l => l.MaLo == maLo).SoLuongTon;
    }

    /// <summary>Tạo nhanh hóa đơn nợ cho khách quen.</summary>
    public Task<ChiTietHoaDonDto> GhiNoAsync(string maKH, params (string MaHH, int SoLuong)[] dong) =>
        DvBanHang().TaoHoaDonNoAsync(new YeuCauGhiNo(maKH, dong.Select(d => new DongGioHang(d.MaHH, d.SoLuong)).ToList()), default);

    /// <summary>Bán nhanh: thanh toán tiền mặt rồi tạo hóa đơn.</summary>
    public async Task<ChiTietHoaDonDto> BanAsync(string? maKH, params (string MaHH, int SoLuong)[] dong)
    {
        var gio = dong.Select(d => new DongGioHang(d.MaHH, d.SoLuong)).ToList();
        var tt = await DvBanHang().ThanhToanAsync(new YeuCauThanhToan(maKH, gio, PhuongThucThanhToan.TienMat, "10000000", null), default);
        return await DvBanHang().TaoHoaDonAsync(new YeuCauTaoHoaDon(tt.MaPTT, maKH, gio), default);
    }

    /// <summary>Thêm nhanh một hàng hóa hợp lệ, trả mã.</summary>
    public Task<string> ThemHangAsync(string ten, string? nguongHang = "5", string? nguongHan = "10") =>
        DvHangHoa().ThemAsync(new YeuCauHangHoa(ten, null, "DM09", "chai", "8000", "10000", nguongHang, nguongHan), default);

    /// <summary>Thêm nhanh một lô hàng (HSD tính theo số ngày từ hôm nay).</summary>
    public Task<string> ThemLoAsync(string tenHang, int soLuong, int hsdSauSoNgay) =>
        DvTonKho().ThemLoAsync(new YeuCauThemLo(tenHang, soLuong.ToString(),
            DongHo.HomNay.AddDays(hsdSauSoNgay).ToString("yyyy-MM-dd")), default);

    public NguoiDung Lay(string maND)
    {
        Db.ChangeTracker.Clear();
        return Db.NguoiDung.Single(x => x.MaND == maND);
    }

    public void Dispose() => Db.Dispose();
}
