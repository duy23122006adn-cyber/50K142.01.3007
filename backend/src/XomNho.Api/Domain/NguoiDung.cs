namespace XomNho.Api.Domain;

/// <summary>
/// Bảng NguoiDung (lớp trừu tượng). Kế thừa TPT: NhanVien, ChuQuan.
/// </summary>
public abstract class NguoiDung
{
    public string MaND { get; set; } = null!;
    public string HoTen { get; set; } = null!;
    public DateOnly NgaySinh { get; set; }
    public string SDT { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string TenDangNhap { get; set; } = null!;

    /// <summary>Chỉ lưu chuỗi băm BCrypt.</summary>
    public string MatKhau { get; set; } = null!;

    public string TrangThai { get; set; } = TrangThaiTaiKhoan.HoatDong;

    /// <summary>Số lần nhập sai mật khẩu đăng nhập liên tiếp (UC_1 BR02, BR07).</summary>
    public int SoLanNhapSai { get; set; }

    /// <summary>Số lần nhập sai "mật khẩu hiện tại" khi đổi mật khẩu (màn hình 2.4.9).</summary>
    public int SoLanSaiMatKhauHienTai { get; set; }

    /// <summary>Chức năng đổi mật khẩu bị khóa đến thời điểm này (màn hình 2.4.9, 2.4.10).</summary>
    public DateTime? KhoaDoiMatKhauDen { get; set; }

    public byte[] PhienBan { get; set; } = [];

    /// <summary>Không lưu DB – suy ra từ bảng con.</summary>
    public abstract string VaiTro { get; }
}

public class NhanVien : NguoiDung
{
    public override string VaiTro => VaiTroNguoiDung.NhanVien;
}

public class ChuQuan : NguoiDung
{
    public override string VaiTro => VaiTroNguoiDung.ChuQuan;
}
