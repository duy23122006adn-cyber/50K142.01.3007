namespace XomNho.Api.Domain;

/// <summary>Bảng PhienDangNhap – phục vụ "đăng xuất mọi phiên" (UC_2.3 BR06) và đăng xuất (UC_11).</summary>
public class PhienDangNhap
{
    public Guid MaPhien { get; set; }
    public string MaND { get; set; } = null!;
    public NguoiDung NguoiDung { get; set; } = null!;
    public string RefreshTokenHash { get; set; } = null!;
    public DateTime ThoiDiemTao { get; set; }
    public DateTime HetHan { get; set; }
    public DateTime? ThoiDiemThuHoi { get; set; }
}

/// <summary>Bảng MaXacThuc – OTP mở khóa tài khoản (UC_1 5.c, Q25).</summary>
public class MaXacThuc
{
    public int MaOTP { get; set; }
    public string MaND { get; set; } = null!;
    public NguoiDung NguoiDung { get; set; } = null!;
    public string MaBam { get; set; } = null!;
    public DateTime ThoiDiemGui { get; set; }
    public DateTime HetHan { get; set; }
    public DateTime? ThoiDiemSuDung { get; set; }
    public int SoLanNhapSai { get; set; }
}

/// <summary>Bảng NhatKyThaoTac – Audit Log (NFR Security-06). Không có FK để giữ nhật ký khi xóa tài khoản.</summary>
public class NhatKyThaoTac
{
    public long MaNKTT { get; set; }
    public DateTime ThoiDiem { get; set; }
    public string? MaND { get; set; }
    public string? TenDangNhap { get; set; }
    public string HanhDong { get; set; } = null!;
    public string? BangDuLieu { get; set; }
    public string? MaBanGhi { get; set; }
    public string? DuLieuCu { get; set; }
    public string? DuLieuMoi { get; set; }
    public string? DiaChiIP { get; set; }
}

/// <summary>Bảng BoDemMa – bộ đếm sinh mã nghiệp vụ, không cấp lại mã.</summary>
public class BoDemMa
{
    public string TienTo { get; set; } = null!;
    /// <summary>yyyyMMdd cho mã đếm theo ngày; "00000000" cho mã đếm toàn cục.</summary>
    public string Ky { get; set; } = null!;
    public int SoHienTai { get; set; }
}

/// <summary>Bảng CauHinh – tham số hệ thống cố định (nạp sẵn).</summary>
public class CauHinh
{
    public string MaCauHinh { get; set; } = null!;
    public string GiaTri { get; set; } = null!;
    public string? MoTa { get; set; }
}
