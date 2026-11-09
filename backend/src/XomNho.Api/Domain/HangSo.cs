namespace XomNho.Api.Domain;

/// <summary>Vai trò người dùng (claim "role" trong JWT).</summary>
public static class VaiTroNguoiDung
{
    public const string ChuQuan = "ChuQuan";
    public const string NhanVien = "NhanVien";
}

/// <summary>NguoiDung.TrangThai – Q26 (KE_HOACH.md).</summary>
public static class TrangThaiTaiKhoan
{
    public const string HoatDong = "Hoạt động";
    public const string KhoaTam = "Khóa tạm";
    public const string NgungHoatDong = "Ngừng hoạt động";
}

/// <summary>Khóa trong bảng CauHinh (THIET_KE_DB_V2.md mục 3.23).</summary>
public static class KhoaCauHinh
{
    public const string TenCuaHang = "TenCuaHang";
    public const string HanMucNo = "HanMucNo";
    public const string SoNgayNo = "SoNgayNo";
    public const string SoNgaySapHetHanNo = "SoNgaySapHetHanNo";
    public const string SoNgayDoiTra = "SoNgayDoiTra";
    public const string SoLanSaiToiDa = "SoLanSaiToiDa";
    public const string ThoiHanOtpPhut = "ThoiHanOtpPhut";
    public const string SoDongMoiTrang = "SoDongMoiTrang";
    public const string SoLanSaiDoiMatKhau = "SoLanSaiDoiMatKhau";
    public const string PhutKhoaDoiMatKhau = "PhutKhoaDoiMatKhau";
}
