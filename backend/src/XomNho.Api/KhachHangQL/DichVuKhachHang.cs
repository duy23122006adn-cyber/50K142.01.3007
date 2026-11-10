using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using XomNho.Api.Common;
using XomNho.Api.Data;
using XomNho.Api.Domain;
using XomNho.Api.HangHoaQL;
using XomNho.Api.XacThuc;

namespace XomNho.Api.KhachHangQL;

public sealed record KhachHangDong(string MaKH, string HoTen, string SDT);
public sealed record MatHangThuongMua(string MaHH, string TenHH, string DonViTinh, int SoLuongDaMua);
public sealed record ChiTietKhachHang(string MaKH, string HoTen, string SDT, IReadOnlyList<MatHangThuongMua> MatHangThuongMua);
public sealed record YeuCauKhachHang(string? HoTen, string? SDT);

/// <summary>UC_8.1 Thêm, UC_8.2 Sửa, UC_8.3 Tìm kiếm khách hàng (Chủ quán, Nhân viên).</summary>
public sealed partial class DichVuKhachHang(XomNhoDbContext db, ISinhMa sinhMa, IThamSoHeThong thamSo)
{
    public const string BatBuoc = "Không được để trống thông tin bắt buộc";
    public const string HoTenSai = "Họ tên chỉ gồm chữ cái và khoảng trắng, tối đa 50 ký tự";
    public const string SdtSai = "Số điện thoại gồm 10 chữ số và bắt đầu bằng 0";
    public const string SdtTrung = "Số điện thoại đã được đăng ký";
    public const string TuKhoaSai = "Thông tin chứa ký tự không hợp lệ";
    public const string KhongTimThay = "Không tìm thấy khách hàng";

    // ================================================================ UC_8.3 Tìm kiếm

    /// <summary>
    /// BR01: tìm trên cả tên và SĐT, khớp một phần, không phân biệt hoa thường.
    /// BR02: "+84" ở đầu tương đương "0". BR03: chỉ chữ cái, chữ số, khoảng trắng.
    /// </summary>
    public async Task<KetQuaTrang<KhachHangDong>> TimKiemAsync(string? tuKhoa, int trang, CancellationToken ct)
    {
        var q = db.KhachHang.AsNoTracking();
        if (!QuyTac.Trong(tuKhoa))
        {
            var k = tuKhoa!.Trim();
            if (k.StartsWith("+84")) k = "0" + k[3..];
            if (!TuKhoaRegex().IsMatch(k))
                throw LoiNghiepVuException.TheoTruong("tuKhoa", TuKhoaSai);
            var thuong = k.ToLower();
            var soDienThoai = k.Replace(" ", "");
            q = q.Where(x => x.HoTen.ToLower().Contains(thuong) || x.SDT.Contains(soDienThoai));
        }
        var soDong = await thamSo.LaySoAsync(KhoaCauHinh.SoDongMoiTrang, ct);
        return await PhanTrang.LayTrangAsync(
            q.OrderBy(x => x.MaKH).Select(x => new KhachHangDong(x.MaKH, x.HoTen, x.SDT.Trim())), trang, soDong, ct);
    }

    /// <summary>Chi tiết + BR04–BR06: tối đa 5 mặt hàng mua nhiều nhất, chỉ tính hóa đơn có mã KH và chưa hủy.</summary>
    public async Task<ChiTietKhachHang> ChiTietAsync(string maKH, CancellationToken ct)
    {
        var kh = await db.KhachHang.AsNoTracking().FirstOrDefaultAsync(x => x.MaKH == maKH, ct)
            ?? throw new LoiNghiepVuException(StatusCodes.Status404NotFound, KhongTimThay);

        var thuongMua = await db.ChiTietHoaDon.AsNoTracking()
            .Where(c => c.HoaDon.TrangThai != TrangThaiHoaDon.DaHuy && c.HoaDon.ThanhToanNgay!.MaKH == maKH)
            .GroupBy(c => new { c.MaHH, c.HangHoa.TenHH, c.HangHoa.DonViTinh })
            .Select(g => new { g.Key.MaHH, g.Key.TenHH, g.Key.DonViTinh, SoLuong = g.Sum(c => c.SoLuong) })
            .OrderByDescending(x => x.SoLuong).ThenBy(x => x.TenHH)
            .Take(5)
            .ToListAsync(ct);

        return new ChiTietKhachHang(kh.MaKH, kh.HoTen, kh.SDT.Trim(),
            thuongMua.Select(x => new MatHangThuongMua(x.MaHH, x.TenHH, x.DonViTinh, x.SoLuong)).ToList());
    }

    // ================================================================ UC_8.1 Thêm

    public async Task<KhachHangDong> ThemAsync(YeuCauKhachHang yc, CancellationToken ct)
    {
        var (hoTen, sdt) = await KiemTraAsync(yc, null, ct);

        // BR08: sinh mã và lưu trong cùng một bước; lỗi thì không dùng mã đó.
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var kh = new KhachHang { MaKH = await sinhMa.SinhMaAsync(LoaiMa.KhachHang, ct), HoTen = hoTen, SDT = sdt };
        db.KhachHang.Add(kh);
        await LuuAsync("Không thể lưu khách hàng", ct);
        await tx.CommitAsync(ct);
        return new KhachHangDong(kh.MaKH, kh.HoTen, kh.SDT);
    }

    // ================================================================ UC_8.2 Sửa

    public async Task SuaAsync(string maKH, YeuCauKhachHang yc, CancellationToken ct)
    {
        var kh = await db.KhachHang.FirstOrDefaultAsync(x => x.MaKH == maKH, ct)
            ?? throw new LoiNghiepVuException(StatusCodes.Status404NotFound, KhongTimThay);
        var (hoTen, sdt) = await KiemTraAsync(yc, maKH, ct);
        kh.HoTen = hoTen;
        kh.SDT = sdt;
        await LuuAsync("Cập nhật không thành công", ct);
    }

    // ================================================================ Hỗ trợ

    /// <summary>UC_8.1 BR01–BR03, BR05; UC_8.2 BR04 (loại trừ chính khách hàng đang sửa).</summary>
    private async Task<(string HoTen, string Sdt)> KiemTraAsync(YeuCauKhachHang yc, string? maBoQua, CancellationToken ct)
    {
        var kt = new BoKiemTra();
        kt.Kiem("hoTen", !QuyTac.Trong(yc.HoTen), BatBuoc).Kiem("sdt", !QuyTac.Trong(yc.SDT), BatBuoc);
        kt.NemNeuCoLoi(BatBuoc);

        var hoTen = QuyTac.ChuanHoa(yc.HoTen!); // BR02: tự bỏ khoảng trắng đầu/cuối
        var sdt = yc.SDT!.Trim();
        kt.Kiem("hoTen", QuyTac.HoTenHopLe(hoTen, 50), HoTenSai).Kiem("sdt", QuyTac.SoDienThoaiHopLe(sdt), SdtSai);
        kt.NemNeuCoLoi();

        // 5d: trùng SĐT → báo kèm khách hàng đang dùng số đó.
        var trung = await db.KhachHang.AsNoTracking()
            .Where(x => x.SDT == sdt && x.MaKH != (maBoQua ?? ""))
            .Select(x => new KhachHangDong(x.MaKH, x.HoTen, x.SDT.Trim()))
            .FirstOrDefaultAsync(ct);
        if (trung is not null) throw LoiSdtTrung(trung);
        return (hoTen, sdt);
    }

    private static LoiNghiepVuException LoiSdtTrung(KhachHangDong? trung) => new(
        StatusCodes.Status400BadRequest, SdtTrung,
        new Dictionary<string, string> { ["sdt"] = SdtTrung },
        trung is null ? null : new Dictionary<string, object?> { ["khachTrung"] = trung });

    private async Task LuuAsync(string thongBaoLoi, CancellationToken ct)
    {
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex) when (LoiTrungKhoa.TenChiMuc(ex) == "UX_KhachHang_SDT")
        {
            throw LoiSdtTrung(null);
        }
        catch (DbUpdateException)
        {
            throw new LoiNghiepVuException(StatusCodes.Status500InternalServerError, thongBaoLoi);
        }
    }

    [GeneratedRegex(@"^[\p{L}\p{M}0-9 ]+$")]
    private static partial Regex TuKhoaRegex();
}

[ApiController]
[Route("api/khach-hang")]
public sealed class KhachHangController(DichVuKhachHang dichVu) : ControllerBase
{
    [HttpGet]
    public Task<KetQuaTrang<KhachHangDong>> TimKiem([FromQuery] string? tuKhoa, [FromQuery] int trang = 1, CancellationToken ct = default) =>
        dichVu.TimKiemAsync(tuKhoa, trang, ct);

    [HttpGet("{maKH}")]
    public Task<ChiTietKhachHang> ChiTiet(string maKH, CancellationToken ct) => dichVu.ChiTietAsync(maKH, ct);

    [HttpPost]
    public Task<KhachHangDong> Them(YeuCauKhachHang yc, CancellationToken ct) => dichVu.ThemAsync(yc, ct);

    [HttpPut("{maKH}")]
    public async Task<PhanHoiThongBao> Sua(string maKH, YeuCauKhachHang yc, CancellationToken ct)
    {
        await dichVu.SuaAsync(maKH, yc, ct);
        return new PhanHoiThongBao("Cập nhật thông tin khách hàng thành công!");
    }
}
