using System.Globalization;
using Microsoft.EntityFrameworkCore;
using XomNho.Api.Common;
using XomNho.Api.Data;
using XomNho.Api.Domain;
using XomNho.Api.XacThuc;

namespace XomNho.Api.NhanVienQL;

public sealed record NhanVienDong(string MaND, string HoTen, string SDT, string TrangThai);

public sealed record LichSuSuaDong(string MaCQ, string HoTenCQ, string VaiTro, DateTime ThoiDiemSua, string NoiDungTruoc, string NoiDungSau);

public sealed record ChiTietNhanVien(
    string MaND, string TenDangNhap, string HoTen, DateOnly NgaySinh, string SDT, string Email,
    string TrangThai, IReadOnlyList<LichSuSuaDong> LichSu);

public sealed record YeuCauThemNhanVien(string? HoTen, string? NgaySinh, string? SDT, string? Email, string? TenDangNhap, string? MatKhau);
public sealed record YeuCauSuaNhanVien(string? HoTen, string? NgaySinh, string? SDT, string? Email);

/// <summary>Kết quả kiểm tra trước khi xóa (UC_2.4 bước 5): xóa hẳn hay chuyển "Ngừng hoạt động".</summary>
public sealed record KetQuaKiemTraXoa(string MaND, string HoTen, string CheDo);
public sealed record YeuCauXoa(string? CheDo);

public static class CheDoXoa
{
    public const string XoaHan = "XoaHan";
    public const string NgungHoatDong = "NgungHoatDong";
    public const string NgungKinhDoanh = "NgungKinhDoanh";
}

/// <summary>
/// Ràng buộc của nhân viên với ca làm việc và hóa đơn (UC_2.4 BR02–BR04).
/// Bảng CaLamViec và HoaDon có từ Giai đoạn 3, khi đó lớp này được bổ sung truy vấn thật.
/// </summary>
public interface IRangBuocNhanVien
{
    Task<(bool DangTrongCa, bool ConCaChuaDoiSoat, bool CoLichSuGiaoDich)> KiemTraAsync(string maNV, CancellationToken ct);
}

public sealed class RangBuocNhanVienGiaiDoan2 : IRangBuocNhanVien
{
    public Task<(bool, bool, bool)> KiemTraAsync(string maNV, CancellationToken ct) =>
        Task.FromResult((false, false, false));
}

/// <summary>UC_2.1 Thêm, UC_2.2 Sửa, UC_2.4 Xóa tài khoản nhân viên (chỉ Chủ quán).</summary>
public sealed class DichVuNhanVien(
    XomNhoDbContext db,
    ISinhMa sinhMa,
    IDongHo dongHo,
    INguoiDungHienTai hienTai,
    IRangBuocNhanVien rangBuoc)
{
    public const string BatBuoc = "Vui lòng nhập đầy đủ thông tin bắt buộc";
    public const string HoTenSai = "Họ và tên không hợp lệ";
    public const string NgaySinhSai = "Ngày sinh không hợp lệ";
    public const string TenDangNhapSai = "Tên đăng nhập không hợp lệ";
    public const string SdtSai = "Số điện thoại không hợp lệ";
    public const string EmailSai = "Email không hợp lệ";
    public const string MatKhauSai = "Mật khẩu không đúng quy tắc";
    public const string TenDangNhapTrung = "Tên đăng nhập đã tồn tại";
    public const string SdtTrung = "Số điện thoại đã được sử dụng";
    public const string EmailTrung = "Email đã được sử dụng";
    public const string KhongThayDoi = "Không có thông tin thay đổi";
    public const string KhongTimThay = "Không tìm thấy nhân viên";

    /// <summary>Tuổi tối thiểu (màn hình 2.2.6 – đề xuất 15 tuổi theo độ tuổi lao động tối thiểu).</summary>
    public const int TuoiToiThieu = 15;

    // ================================================================ Danh sách

    public Task<List<NhanVienDong>> DanhSachAsync(string? tuKhoa, CancellationToken ct)
    {
        var q = db.NhanVien.AsNoTracking();
        if (!QuyTac.Trong(tuKhoa))
        {
            var k = tuKhoa!.Trim().ToLower();
            q = q.Where(x => x.HoTen.ToLower().Contains(k) || x.SDT.Contains(k));
        }
        return q.OrderBy(x => x.MaND)
            .Select(x => new NhanVienDong(x.MaND, x.HoTen, x.SDT, x.TrangThai))
            .ToListAsync(ct);
    }

    public async Task<ChiTietNhanVien> ChiTietAsync(string maND, CancellationToken ct)
    {
        var nv = await db.NhanVien.AsNoTracking().FirstOrDefaultAsync(x => x.MaND == maND, ct)
            ?? throw new LoiNghiepVuException(StatusCodes.Status404NotFound, KhongTimThay);
        var lichSu = await db.LichSuSuaNhanVien.AsNoTracking()
            .Where(x => x.MaNV == maND)
            .OrderByDescending(x => x.ThoiDiemSua).ThenByDescending(x => x.MaLS)
            .Select(x => new LichSuSuaDong(x.MaCQ, x.HoTenCQ, "Chủ quán", x.ThoiDiemSua, x.NoiDungTruoc, x.NoiDungSau))
            .ToListAsync(ct);
        return new ChiTietNhanVien(nv.MaND, nv.TenDangNhap, nv.HoTen, nv.NgaySinh, nv.SDT.Trim(), nv.Email, nv.TrangThai, lichSu);
    }

    // ================================================================ UC_2.1 Thêm

    public async Task<string> ThemAsync(YeuCauThemNhanVien yc, CancellationToken ct)
    {
        var kt = new BoKiemTra();
        // 6a – BR01: thông tin bắt buộc.
        kt.Kiem("hoTen", !QuyTac.Trong(yc.HoTen), BatBuoc)
          .Kiem("ngaySinh", !QuyTac.Trong(yc.NgaySinh), BatBuoc)
          .Kiem("sdt", !QuyTac.Trong(yc.SDT), BatBuoc)
          .Kiem("email", !QuyTac.Trong(yc.Email), BatBuoc)
          .Kiem("tenDangNhap", !QuyTac.Trong(yc.TenDangNhap), BatBuoc)
          .Kiem("matKhau", !QuyTac.Trong(yc.MatKhau), BatBuoc);
        kt.NemNeuCoLoi(BatBuoc);

        var hoTen = QuyTac.ChuanHoa(yc.HoTen!);
        var sdt = yc.SDT!.Trim();
        var email = yc.Email!.Trim();
        var ten = yc.TenDangNhap!.Trim();

        // 6b–6e – BR02, BR04: định dạng.
        KiemHoTenNgaySinh(kt, hoTen, yc.NgaySinh, out var ngaySinh);
        kt.Kiem("tenDangNhap", QuyTac.TenDangNhapHopLe(ten), TenDangNhapSai)
          .Kiem("sdt", QuyTac.SoDienThoaiHopLe(sdt), SdtSai)
          .Kiem("email", QuyTac.EmailHopLe(email), EmailSai)
          .Kiem("matKhau", QuyTac.MatKhauHopLe(yc.MatKhau), MatKhauSai);
        kt.NemNeuCoLoi();

        // 6f–6h – BR03: không trùng (tên đăng nhập không phân biệt hoa thường).
        var tenThuong = ten.ToLowerInvariant();
        kt.Kiem("tenDangNhap", !await db.NguoiDung.AnyAsync(x => x.TenDangNhap.ToLower() == tenThuong, ct), TenDangNhapTrung)
          .Kiem("sdt", !await db.NguoiDung.AnyAsync(x => x.SDT == sdt, ct), SdtTrung)
          .Kiem("email", !await db.NguoiDung.AnyAsync(x => x.Email == email, ct), EmailTrung);
        kt.NemNeuCoLoi();

        // BR05, BR08: mã NV chỉ sinh khi hợp lệ, cùng transaction với lệnh lưu.
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var nv = new NhanVien
        {
            MaND = await sinhMa.SinhMaAsync(LoaiMa.NhanVien, ct),
            HoTen = hoTen,
            NgaySinh = ngaySinh,
            SDT = sdt,
            Email = email,
            TenDangNhap = ten,
            MatKhau = DichVuXacThuc.BamMatKhau(yc.MatKhau!),
            TrangThai = TrangThaiTaiKhoan.HoatDong, // BR06: luôn vai trò Nhân viên, trạng thái Hoạt động
        };
        db.NhanVien.Add(nv);
        await LuuAsync("Thêm tài khoản không thành công. Vui lòng thử lại sau", ct);
        await tx.CommitAsync(ct);
        return nv.MaND;
    }

    // ================================================================ UC_2.2 Sửa

    public async Task SuaAsync(string maND, YeuCauSuaNhanVien yc, CancellationToken ct)
    {
        var nv = await db.NhanVien.FirstOrDefaultAsync(x => x.MaND == maND, ct)
            ?? throw new LoiNghiepVuException(StatusCodes.Status404NotFound, KhongTimThay);

        var kt = new BoKiemTra();
        kt.Kiem("hoTen", !QuyTac.Trong(yc.HoTen), BatBuoc)
          .Kiem("ngaySinh", !QuyTac.Trong(yc.NgaySinh), BatBuoc)
          .Kiem("sdt", !QuyTac.Trong(yc.SDT), BatBuoc)
          .Kiem("email", !QuyTac.Trong(yc.Email), BatBuoc);
        kt.NemNeuCoLoi(BatBuoc);

        var hoTen = QuyTac.ChuanHoa(yc.HoTen!);
        var sdt = yc.SDT!.Trim();
        var email = yc.Email!.Trim();
        KiemHoTenNgaySinh(kt, hoTen, yc.NgaySinh, out var ngaySinh);

        // 4b: không có gì thay đổi → không cập nhật, không ghi lịch sử.
        var thayDoi = new List<(string Ten, string Cu, string Moi)>();
        if (hoTen != nv.HoTen) thayDoi.Add(("Họ và tên", nv.HoTen, hoTen));
        if (!kt.CoLoiTai("ngaySinh") && ngaySinh != nv.NgaySinh)
            thayDoi.Add(("Ngày sinh", Ngay(nv.NgaySinh), Ngay(ngaySinh)));
        if (sdt != nv.SDT.Trim()) thayDoi.Add(("Số điện thoại", nv.SDT.Trim(), sdt));
        if (!string.Equals(email, nv.Email, StringComparison.Ordinal)) thayDoi.Add(("Email", nv.Email, email));
        if (thayDoi.Count == 0 && !kt.CoLoi) throw LoiNghiepVuException.KhongHopLe(KhongThayDoi);

        // 6b–6e – BR03, BR04 (loại trừ chính nhân viên đang sửa khi kiểm tra trùng).
        kt.Kiem("sdt", QuyTac.SoDienThoaiHopLe(sdt), SdtSai)
          .Kiem("email", QuyTac.EmailHopLe(email), EmailSai);
        kt.NemNeuCoLoi();
        kt.Kiem("sdt", !await db.NguoiDung.AnyAsync(x => x.MaND != maND && x.SDT == sdt, ct), SdtTrung)
          .Kiem("email", !await db.NguoiDung.AnyAsync(x => x.MaND != maND && x.Email == email, ct), EmailTrung);
        kt.NemNeuCoLoi();

        nv.HoTen = hoTen;
        nv.NgaySinh = ngaySinh;
        nv.SDT = sdt;
        nv.Email = email;

        // BR06 – 8a: lịch sử ghi cùng một lần lưu với thông tin nhân viên; lỗi thì hủy cả hai.
        var maCQ = hienTai.MaND!;
        var hoTenCQ = await db.NguoiDung.Where(x => x.MaND == maCQ).Select(x => x.HoTen).FirstAsync(ct);
        db.LichSuSuaNhanVien.Add(new LichSuSuaNhanVien
        {
            MaNV = nv.MaND,
            HoTenNV = nv.HoTen,
            MaCQ = maCQ,
            HoTenCQ = hoTenCQ,
            ThoiDiemSua = dongHo.BayGio,
            NoiDungTruoc = string.Join("\n", thayDoi.Select(t => $"{t.Ten}: {t.Cu}")),
            NoiDungSau = string.Join("\n", thayDoi.Select(t => $"{t.Ten}: {t.Moi}")),
        });
        await LuuAsync("Không thể cập nhật thông tin nhân viên, vui lòng thử lại sau", ct);
    }

    // ================================================================ UC_2.4 Xóa

    public async Task<KetQuaKiemTraXoa> KiemTraXoaAsync(string maND, CancellationToken ct)
    {
        var nv = await db.NhanVien.AsNoTracking().FirstOrDefaultAsync(x => x.MaND == maND, ct)
            ?? throw new LoiNghiepVuException(StatusCodes.Status404NotFound, KhongTimThay);
        if (nv.TrangThai == TrangThaiTaiKhoan.NgungHoatDong)
            throw LoiNghiepVuException.KhongHopLe("Tài khoản đã ở trạng thái “Ngừng hoạt động”");

        var (dangTrongCa, conCa, coLichSu) = await rangBuoc.KiemTraAsync(maND, ct);
        if (dangTrongCa)
            throw new LoiNghiepVuException(StatusCodes.Status409Conflict, "Không thể xử lý tài khoản nhân viên đang trong ca");
        if (conCa)
            throw new LoiNghiepVuException(StatusCodes.Status409Conflict, "Nhân viên còn ca chưa đối soát");

        return new KetQuaKiemTraXoa(nv.MaND, nv.HoTen, coLichSu ? CheDoXoa.NgungHoatDong : CheDoXoa.XoaHan);
    }

    public async Task<string> XoaAsync(string maND, string? cheDo, CancellationToken ct)
    {
        // Kiểm tra lại ngay lúc xác nhận (dữ liệu có thể đã đổi từ lúc mở hộp thoại).
        var kq = await KiemTraXoaAsync(maND, ct);
        if (kq.CheDo != cheDo)
            throw new LoiNghiepVuException(StatusCodes.Status409Conflict, "Thông tin nhân viên đã thay đổi, vui lòng thử lại.");

        var nv = await db.NhanVien.FirstAsync(x => x.MaND == maND, ct);
        if (kq.CheDo == CheDoXoa.XoaHan)
        {
            db.NhanVien.Remove(nv);
            await LuuAsync("Xóa tài khoản thất bại", ct);
            return "Xóa tài khoản thành công";
        }

        // BR04: đã có hóa đơn/ca → chỉ chuyển "Ngừng hoạt động"; NFR Security-05: khóa ngay mọi phiên.
        nv.TrangThai = TrangThaiTaiKhoan.NgungHoatDong;
        var bayGio = dongHo.BayGio;
        foreach (var p in await db.PhienDangNhap.Where(p => p.MaND == maND && p.ThoiDiemThuHoi == null).ToListAsync(ct))
            p.ThoiDiemThuHoi = bayGio;
        await LuuAsync("Ngừng hoạt động tài khoản thất bại", ct);
        return "Ngừng hoạt động tài khoản thành công";
    }

    // ================================================================ Hỗ trợ

    private void KiemHoTenNgaySinh(BoKiemTra kt, string hoTen, string? ngaySinhNhap, out DateOnly ngaySinh)
    {
        kt.Kiem("hoTen", QuyTac.HoTenHopLe(hoTen, 100), HoTenSai);
        var homNay = dongHo.HomNay;
        var docDuoc = QuyTac.DocNgay(ngaySinhNhap, out ngaySinh);
        kt.Kiem("ngaySinh", docDuoc && ngaySinh < homNay && ngaySinh <= homNay.AddYears(-TuoiToiThieu), NgaySinhSai);
    }

    private static string Ngay(DateOnly d) => d.ToString("dd/MM/yyyy", CultureInfo.InvariantCulture);

    /// <summary>Lưu; lỗi trùng do người khác vừa lưu cùng lúc (NFR Supportability-02) → báo đúng trường.</summary>
    private async Task LuuAsync(string thongBaoLoi, CancellationToken ct)
    {
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex) when (LoiTrungKhoa.TenChiMuc(ex) is { } chiMuc)
        {
            throw chiMuc switch
            {
                "UX_NguoiDung_TenDangNhap" => LoiNghiepVuException.TheoTruong("tenDangNhap", TenDangNhapTrung),
                "UX_NguoiDung_SDT" => LoiNghiepVuException.TheoTruong("sdt", SdtTrung),
                "UX_NguoiDung_Email" => LoiNghiepVuException.TheoTruong("email", EmailTrung),
                _ => new LoiNghiepVuException(StatusCodes.Status500InternalServerError, thongBaoLoi),
            };
        }
        catch (DbUpdateException)
        {
            throw new LoiNghiepVuException(StatusCodes.Status500InternalServerError, thongBaoLoi);
        }
    }
}
