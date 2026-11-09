using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using XomNho.Api.Common;
using XomNho.Api.Data;
using XomNho.Api.Domain;
using XomNho.Api.TichHop;

namespace XomNho.Api.XacThuc;

public sealed record ThongTinNguoiDung(string MaND, string HoTen, string TenDangNhap, string VaiTro);

public sealed record KetQuaDangNhap(
    string AccessToken, DateTime HetHan, ThongTinNguoiDung NguoiDung,
    string RefreshToken, DateTime RefreshHetHan);

public sealed record TrangThaiDoiMatKhau(bool BiKhoa, DateTime? KhoaDen);

/// <summary>
/// UC_1 Đăng nhập (khóa tạm sau 10 lần sai, OTP mở khóa), UC_2.3 Đổi mật khẩu, UC_11 Đăng xuất.
/// Mọi thông báo dùng đúng câu chữ trong báo cáo.
/// </summary>
public sealed class DichVuXacThuc(
    XomNhoDbContext db,
    IDongHo dongHo,
    IGuiOtp guiOtp,
    DichVuToken dichVuToken,
    IThamSoHeThong thamSo,
    IOptions<TuyChonTichHop> tichHop)
{
    public const string KhongDuocBoTrong = "Không được bỏ trống!";
    public const string DangNhapKhongThanhCong = "Đăng nhập không thành công!";
    public const string TaiKhoanBiKhoaTam = "Tài khoản đang bị khóa tạm thời!";
    public const string MaXacNhanKhongDung = "Mã xác nhận không đúng!";
    public const string MaXacNhanHetHan = "Mã xác nhận đã hết hạn hoặc không còn hiệu lực. Vui lòng đăng nhập lại để nhận mã mới.";
    public const string PhienHetHan = "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";

    public const string VuiLongNhapDayDu = "Vui lòng nhập đầy đủ thông tin";
    public const string MatKhauHienTaiSai = "Mật khẩu hiện tại không chính xác";
    public const string MatKhauSaiQuyTac = "Mật khẩu không đúng quy tắc";
    public const string XacNhanKhongKhop = "Mật khẩu xác nhận không khớp";
    public const string MatKhauMoiTrungCu = "Mật khẩu mới phải khác mật khẩu hiện tại";
    public const string DoiMatKhauThatBai = "Đổi mật khẩu thất bại";
    public const string DoiMatKhauBiKhoa = "Chức năng đổi mật khẩu đang bị khóa trong 15 phút.";
    public const string DoiMatKhauVuaBiKhoa = "Bạn đã nhập sai mật khẩu 5 lần liên tiếp. Chức năng đổi mật khẩu bị khóa trong 15 phút";

    private const int SoLanNhapSaiOtpToiDa = 5; // Đề xuất chống dò mã (THIET_KE_DB_V2.md – MaXacThuc).

    // ================================================================ UC_1 Đăng nhập

    public async Task<KetQuaDangNhap> DangNhapAsync(string? tenDangNhap, string? matKhau, CancellationToken ct = default)
    {
        // 5.a – BR01: bỏ trống tên đăng nhập hoặc mật khẩu.
        var loi = new Dictionary<string, string>();
        if (QuyTac.Trong(tenDangNhap)) loi["tenDangNhap"] = KhongDuocBoTrong;
        if (QuyTac.Trong(matKhau)) loi["matKhau"] = KhongDuocBoTrong;
        if (loi.Count > 0) throw LoiNghiepVuException.KhongHopLe(KhongDuocBoTrong, loi);

        var ten = tenDangNhap!.Trim();
        var nd = await db.NguoiDung.FirstOrDefaultAsync(x => x.TenDangNhap == ten, ct);

        if (nd is null)
        {
            // BR06: tên đăng nhập không tồn tại thì không đếm số lần sai.
            db.GhiNhatKy("Đăng nhập thất bại", tenDangNhap: Cat(ten, 20), chiTiet: new { lyDo = "Tên đăng nhập không tồn tại" });
            await db.SaveChangesAsync(ct);
            throw new LoiNghiepVuException(StatusCodes.Status401Unauthorized, DangNhapKhongThanhCong);
        }

        if (nd.TrangThai == TrangThaiTaiKhoan.NgungHoatDong)
        {
            // UC_2.4 BR04: tài khoản ngừng hoạt động không được đăng nhập.
            db.GhiNhatKy("Đăng nhập thất bại", nd.MaND, nd.TenDangNhap, chiTiet: new { lyDo = "Tài khoản ngừng hoạt động" });
            await db.SaveChangesAsync(ct);
            throw new LoiNghiepVuException(StatusCodes.Status401Unauthorized, DangNhapKhongThanhCong);
        }

        if (nd.TrangThai == TrangThaiTaiKhoan.KhoaTam)
        {
            // 5.f – BR04: đang khóa tạm → gửi lại mã xác nhận tới SĐT Chủ quán.
            var otp = await TaoOtpAsync(nd, ct);
            db.GhiNhatKy("Gửi lại mã mở khóa", nd.MaND, nd.TenDangNhap);
            await db.SaveChangesAsync(ct);
            await guiOtp.GuiAsync(otp.SdtChuQuan, otp.Ma, nd.TenDangNhap, ct);
            throw LoiTaiKhoanBiKhoa(otp);
        }

        if (!BCrypt.Net.BCrypt.Verify(matKhau, nd.MatKhau))
        {
            nd.SoLanNhapSai++;
            var soLanToiDa = await thamSo.LaySoAsync(KhoaCauHinh.SoLanSaiToiDa, ct);

            if (nd.SoLanNhapSai >= soLanToiDa)
            {
                // 5.c – BR02: sai liên tiếp 10 lần → khóa tạm + gửi OTP cho Chủ quán.
                nd.TrangThai = TrangThaiTaiKhoan.KhoaTam;
                var otp = await TaoOtpAsync(nd, ct);
                db.GhiNhatKy("Khóa tạm tài khoản", nd.MaND, nd.TenDangNhap,
                    chiTiet: new { lyDo = $"Nhập sai mật khẩu {nd.SoLanNhapSai} lần liên tiếp" });
                await db.SaveChangesAsync(ct);
                await guiOtp.GuiAsync(otp.SdtChuQuan, otp.Ma, nd.TenDangNhap, ct);
                throw LoiTaiKhoanBiKhoa(otp);
            }

            // 5.b
            db.GhiNhatKy("Đăng nhập thất bại", nd.MaND, nd.TenDangNhap,
                chiTiet: new { lyDo = "Sai mật khẩu", soLanNhapSai = nd.SoLanNhapSai });
            await db.SaveChangesAsync(ct);
            throw new LoiNghiepVuException(StatusCodes.Status401Unauthorized, DangNhapKhongThanhCong);
        }

        // Thành công – BR07: đặt lại số lần nhập sai.
        nd.SoLanNhapSai = 0;
        var refresh = DichVuToken.TaoRefreshToken();
        var phien = new PhienDangNhap
        {
            MaPhien = Guid.NewGuid(),
            MaND = nd.MaND,
            RefreshTokenHash = DichVuToken.Bam(refresh),
            ThoiDiemTao = dongHo.BayGio,
            HetHan = dichVuToken.HetHanRefreshToken(),
        };
        db.PhienDangNhap.Add(phien);
        db.GhiNhatKy("Đăng nhập", nd.MaND, nd.TenDangNhap);
        await db.SaveChangesAsync(ct);

        var (access, hetHan) = dichVuToken.TaoAccessToken(nd, phien.MaPhien);
        return new KetQuaDangNhap(access, hetHan, ThongTin(nd), refresh, phien.HetHan);
    }

    /// <summary>UC_1 5.c.3–5.c.5: nhập mã xác nhận do Chủ quán cung cấp để mở khóa (Q25).</summary>
    public async Task MoKhoaAsync(string? tenDangNhap, string? maOtp, CancellationToken ct = default)
    {
        var loi = new Dictionary<string, string>();
        if (QuyTac.Trong(tenDangNhap)) loi["tenDangNhap"] = KhongDuocBoTrong;
        if (QuyTac.Trong(maOtp)) loi["maOtp"] = KhongDuocBoTrong;
        if (loi.Count > 0) throw LoiNghiepVuException.KhongHopLe(KhongDuocBoTrong, loi);

        var ten = tenDangNhap!.Trim();
        var nd = await db.NguoiDung.FirstOrDefaultAsync(x => x.TenDangNhap == ten, ct);
        if (nd is null || nd.TrangThai != TrangThaiTaiKhoan.KhoaTam)
            throw LoiNghiepVuException.TheoTruong("maOtp", MaXacNhanKhongDung);

        var bayGio = dongHo.BayGio;
        var otp = await db.MaXacThuc
            .Where(x => x.MaND == nd.MaND && x.ThoiDiemSuDung == null)
            .OrderByDescending(x => x.ThoiDiemGui).ThenByDescending(x => x.MaOTP)
            .FirstOrDefaultAsync(ct);

        // 5.e: quá 5 phút (hoặc đã bị vô hiệu) → tài khoản vẫn khóa.
        if (otp is null || otp.HetHan <= bayGio || otp.SoLanNhapSai >= SoLanNhapSaiOtpToiDa)
            throw LoiNghiepVuException.TheoTruong("maOtp", MaXacNhanHetHan);

        if (!KhopBam(maOtp!.Trim(), otp.MaBam))
        {
            otp.SoLanNhapSai++;
            if (otp.SoLanNhapSai >= SoLanNhapSaiOtpToiDa) otp.HetHan = bayGio;
            db.GhiNhatKy("Nhập sai mã mở khóa", nd.MaND, nd.TenDangNhap);
            await db.SaveChangesAsync(ct);
            throw LoiNghiepVuException.TheoTruong("maOtp", MaXacNhanKhongDung);
        }

        // 5.c.4 – BR07: mở khóa và đặt lại số lần nhập sai.
        otp.ThoiDiemSuDung = bayGio;
        nd.TrangThai = TrangThaiTaiKhoan.HoatDong;
        nd.SoLanNhapSai = 0;
        db.GhiNhatKy("Mở khóa tài khoản", nd.MaND, nd.TenDangNhap);
        await db.SaveChangesAsync(ct);
    }

    // ================================================================ Phiên đăng nhập

    /// <summary>Cấp access token mới từ refresh token (cookie HttpOnly), đồng thời xoay vòng refresh token.</summary>
    public async Task<KetQuaDangNhap> LamMoiAsync(string? refreshToken, CancellationToken ct = default)
    {
        if (QuyTac.Trong(refreshToken))
            throw new LoiNghiepVuException(StatusCodes.Status401Unauthorized, PhienHetHan);

        var bam = DichVuToken.Bam(refreshToken!);
        var phien = await db.PhienDangNhap.Include(p => p.NguoiDung)
            .FirstOrDefaultAsync(p => p.RefreshTokenHash == bam, ct);

        if (phien is null || phien.ThoiDiemThuHoi is not null || phien.HetHan <= dongHo.BayGio
            || phien.NguoiDung.TrangThai != TrangThaiTaiKhoan.HoatDong)
            throw new LoiNghiepVuException(StatusCodes.Status401Unauthorized, PhienHetHan);

        var refreshMoi = DichVuToken.TaoRefreshToken();
        phien.RefreshTokenHash = DichVuToken.Bam(refreshMoi);
        phien.HetHan = dichVuToken.HetHanRefreshToken();
        await db.SaveChangesAsync(ct);

        var (access, hetHan) = dichVuToken.TaoAccessToken(phien.NguoiDung, phien.MaPhien);
        return new KetQuaDangNhap(access, hetHan, ThongTin(phien.NguoiDung), refreshMoi, phien.HetHan);
    }

    /// <summary>UC_11: kết thúc phiên hiện tại. BR03: không ảnh hưởng dữ liệu đã lưu.</summary>
    public async Task DangXuatAsync(Guid? maPhien, string? refreshToken, CancellationToken ct = default)
    {
        PhienDangNhap? phien = null;
        if (maPhien is not null)
            phien = await db.PhienDangNhap.FirstOrDefaultAsync(p => p.MaPhien == maPhien, ct);
        if (phien is null && !QuyTac.Trong(refreshToken))
        {
            var bam = DichVuToken.Bam(refreshToken!);
            phien = await db.PhienDangNhap.FirstOrDefaultAsync(p => p.RefreshTokenHash == bam, ct);
        }
        if (phien is null || phien.ThoiDiemThuHoi is not null) return;

        phien.ThoiDiemThuHoi = dongHo.BayGio;
        db.GhiNhatKy("Đăng xuất", phien.MaND);
        await db.SaveChangesAsync(ct);
    }

    /// <summary>Kiểm tra phiên còn hiệu lực – gọi ở mỗi request có JWT.</summary>
    public Task<bool> PhienConHieuLucAsync(Guid maPhien, CancellationToken ct = default)
    {
        var bayGio = dongHo.BayGio;
        return db.PhienDangNhap.AnyAsync(p =>
            p.MaPhien == maPhien
            && p.ThoiDiemThuHoi == null
            && p.HetHan > bayGio
            && p.NguoiDung.TrangThai == TrangThaiTaiKhoan.HoatDong, ct);
    }

    // ================================================================ UC_2.3 Đổi mật khẩu

    public async Task<TrangThaiDoiMatKhau> LayTrangThaiDoiMatKhauAsync(string maND, CancellationToken ct = default)
    {
        var khoaDen = await db.NguoiDung.Where(x => x.MaND == maND)
            .Select(x => x.KhoaDoiMatKhauDen).FirstOrDefaultAsync(ct);
        var biKhoa = khoaDen is not null && khoaDen > dongHo.BayGio;
        return new TrangThaiDoiMatKhau(biKhoa, biKhoa ? khoaDen : null);
    }

    public async Task DoiMatKhauAsync(string maND, string? matKhauHienTai, string? matKhauMoi,
        string? xacNhanMatKhauMoi, CancellationToken ct = default)
    {
        var nd = await db.NguoiDung.FirstOrDefaultAsync(x => x.MaND == maND, ct)
            ?? throw new LoiNghiepVuException(StatusCodes.Status401Unauthorized, PhienHetHan);
        var bayGio = dongHo.BayGio;

        // Màn hình 2.4.10: chức năng đang bị khóa 15 phút.
        if (nd.KhoaDoiMatKhauDen is not null && nd.KhoaDoiMatKhauDen > bayGio)
            throw LoiDoiMatKhauBiKhoa(DoiMatKhauBiKhoa, nd.KhoaDoiMatKhauDen.Value);

        // 4a – BR01: ba ô bắt buộc.
        var loi = new Dictionary<string, string>();
        if (QuyTac.Trong(matKhauHienTai)) loi["matKhauHienTai"] = VuiLongNhapDayDu;
        if (QuyTac.Trong(matKhauMoi)) loi["matKhauMoi"] = VuiLongNhapDayDu;
        if (QuyTac.Trong(xacNhanMatKhauMoi)) loi["xacNhanMatKhauMoi"] = VuiLongNhapDayDu;
        if (loi.Count > 0) throw LoiNghiepVuException.KhongHopLe(VuiLongNhapDayDu, loi);

        // 4b – BR05: phải đúng mật khẩu hiện tại. Màn hình 2.4.9: sai 5 lần liên tiếp → khóa 15 phút.
        if (!BCrypt.Net.BCrypt.Verify(matKhauHienTai, nd.MatKhau))
        {
            nd.SoLanSaiMatKhauHienTai++;
            var soLanToiDa = await thamSo.LaySoAsync(KhoaCauHinh.SoLanSaiDoiMatKhau, ct);
            if (nd.SoLanSaiMatKhauHienTai >= soLanToiDa)
            {
                var phut = await thamSo.LaySoAsync(KhoaCauHinh.PhutKhoaDoiMatKhau, ct);
                nd.KhoaDoiMatKhauDen = bayGio.AddMinutes(phut);
                nd.SoLanSaiMatKhauHienTai = 0;
                db.GhiNhatKy("Khóa chức năng đổi mật khẩu", nd.MaND, nd.TenDangNhap);
                await db.SaveChangesAsync(ct);
                throw LoiDoiMatKhauBiKhoa(DoiMatKhauVuaBiKhoa, nd.KhoaDoiMatKhauDen.Value);
            }
            await db.SaveChangesAsync(ct);
            throw LoiNghiepVuException.TheoTruong("matKhauHienTai", MatKhauHienTaiSai);
        }
        nd.SoLanSaiMatKhauHienTai = 0;

        // 4c – BR02, 4d – BR04, 4e – BR03.
        string? truongLoi = null, thongBao = null;
        if (!QuyTac.MatKhauHopLe(matKhauMoi)) (truongLoi, thongBao) = ("matKhauMoi", MatKhauSaiQuyTac);
        else if (xacNhanMatKhauMoi != matKhauMoi) (truongLoi, thongBao) = ("xacNhanMatKhauMoi", XacNhanKhongKhop);
        else if (matKhauMoi == matKhauHienTai) (truongLoi, thongBao) = ("matKhauMoi", MatKhauMoiTrungCu);
        if (truongLoi is not null)
        {
            await db.SaveChangesAsync(ct); // lưu việc đặt lại bộ đếm sai
            throw LoiNghiepVuException.TheoTruong(truongLoi, thongBao!);
        }

        // 5–6: cập nhật mật khẩu và đăng xuất MỌI phiên, kể cả phiên đang dùng (BR06).
        nd.MatKhau = BamMatKhau(matKhauMoi!);
        var cacPhien = await db.PhienDangNhap
            .Where(p => p.MaND == nd.MaND && p.ThoiDiemThuHoi == null).ToListAsync(ct);
        foreach (var p in cacPhien) p.ThoiDiemThuHoi = bayGio;
        db.GhiNhatKy("Đổi mật khẩu", nd.MaND, nd.TenDangNhap, chiTiet: new { soPhienBiDangXuat = cacPhien.Count });

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            // 5a: giữ nguyên mật khẩu hiện tại và không đăng xuất các phiên.
            throw new LoiNghiepVuException(StatusCodes.Status500InternalServerError, DoiMatKhauThatBai);
        }
        // BR07: việc đăng xuất do đổi mật khẩu không kết thúc ca đang mở (ca được quản lý riêng ở Giai đoạn 3).
    }

    public async Task<ThongTinNguoiDung> LayThongTinAsync(string maND, CancellationToken ct = default)
    {
        var nd = await db.NguoiDung.AsNoTracking().FirstOrDefaultAsync(x => x.MaND == maND, ct)
            ?? throw new LoiNghiepVuException(StatusCodes.Status401Unauthorized, PhienHetHan);
        return ThongTin(nd);
    }

    // ================================================================ Hỗ trợ

    public static string BamMatKhau(string matKhau) => BCrypt.Net.BCrypt.HashPassword(matKhau, workFactor: 11);

    private static ThongTinNguoiDung ThongTin(NguoiDung nd) => new(nd.MaND, nd.HoTen, nd.TenDangNhap, nd.VaiTro);

    private sealed record OtpMoi(string Ma, string SdtChuQuan);

    /// <summary>Tạo OTP 6 số, vô hiệu các OTP cũ chưa dùng của tài khoản.</summary>
    private async Task<OtpMoi> TaoOtpAsync(NguoiDung nd, CancellationToken ct)
    {
        var bayGio = dongHo.BayGio;
        var cu = await db.MaXacThuc
            .Where(x => x.MaND == nd.MaND && x.ThoiDiemSuDung == null && x.HetHan > bayGio)
            .ToListAsync(ct);
        foreach (var x in cu) x.HetHan = bayGio;

        var ma = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
        var phut = await thamSo.LaySoAsync(KhoaCauHinh.ThoiHanOtpPhut, ct);
        db.MaXacThuc.Add(new MaXacThuc
        {
            MaND = nd.MaND,
            MaBam = DichVuToken.Bam(ma),
            ThoiDiemGui = bayGio,
            HetHan = bayGio.AddMinutes(phut),
        });

        // BR03: mã chỉ gửi tới số điện thoại của Chủ quán.
        var sdtChuQuan = await db.ChuQuan.OrderBy(c => c.MaND).Select(c => c.SDT).FirstOrDefaultAsync(ct)
            ?? nd.SDT;
        return new OtpMoi(ma, sdtChuQuan.Trim());
    }

    private LoiNghiepVuException LoiTaiKhoanBiKhoa(OtpMoi otp)
    {
        var them = new Dictionary<string, object?>
        {
            ["canNhapOtp"] = true,
            ["sdtNhanMa"] = QuyTac.CheSoDienThoai(otp.SdtChuQuan),
        };
        if (tichHop.Value.HienOtpGiaLap) them["maOtpGiaLap"] = otp.Ma;
        return new LoiNghiepVuException(StatusCodes.Status423Locked, TaiKhoanBiKhoaTam, duLieuThem: them);
    }

    private static LoiNghiepVuException LoiDoiMatKhauBiKhoa(string thongBao, DateTime khoaDen) =>
        new(StatusCodes.Status423Locked, thongBao, duLieuThem: new Dictionary<string, object?> { ["khoaDen"] = khoaDen });

    private static bool KhopBam(string giaTri, string bamDaLuu) =>
        CryptographicOperations.FixedTimeEquals(
            Encoding.ASCII.GetBytes(DichVuToken.Bam(giaTri)),
            Encoding.ASCII.GetBytes(bamDaLuu));

    private static string Cat(string s, int doDai) => s.Length <= doDai ? s : s[..doDai];
}
