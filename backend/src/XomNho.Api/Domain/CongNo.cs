namespace XomNho.Api.Domain;

/// <summary>Bảng KhachQuen – bảng con của KhachHang (THIET_KE_DB_V2.md mục 3.5).</summary>
public class KhachQuen
{
    public string MaKH { get; set; } = null!;
    public KhachHang KhachHang { get; set; } = null!;
    public string CCCD { get; set; } = null!;
    public string DiaChi { get; set; } = null!;
    /// <summary>Q24: xóa mềm – "Đang hoạt động" / "Đã xóa".</summary>
    public string TrangThai { get; set; } = TrangThaiKhachQuen.DangHoatDong;
    /// <summary>Q23: false khi có khoản nợ quá hạn; tự bật lại khi hết khoản quá hạn.</summary>
    public bool QuyenMuaNo { get; set; } = true;
    public byte[] PhienBan { get; set; } = [];
}

/// <summary>Bảng HoaDonNo – hóa đơn "Ghi nợ" (THIET_KE_DB_V2.md mục 3.16).</summary>
public class HoaDonNo
{
    public string MaHD { get; set; } = null!;
    public HoaDon HoaDon { get; set; } = null!;
    /// <summary>Ngày lập + 30 ngày (UC_7.1 BR03).</summary>
    public DateOnly HanThanhToan { get; set; }
    public string MaKQ { get; set; } = null!;
    public KhachQuen KhachQuen { get; set; } = null!;
}

/// <summary>Bảng PhanBoThanhToan – phiếu thu nợ phân bổ cho từng hóa đơn nợ (THIET_KE_DB_V2.md mục 3.22).</summary>
public class PhanBoThanhToan
{
    public string MaPTT { get; set; } = null!;
    public PhieuThanhToan PhieuThanhToan { get; set; } = null!;
    public string MaHDNo { get; set; } = null!;
    public HoaDonNo HoaDonNo { get; set; } = null!;
    public decimal SoTienPhanBo { get; set; }
}

public static class TrangThaiKhachQuen
{
    public const string DangHoatDong = "Đang hoạt động";
    public const string DaXoa = "Đã xóa";
}

/// <summary>Trạng thái nợ của khách quen (UC_7.2 BR02–BR05) – tính, không lưu.</summary>
public static class TrangThaiNo
{
    public const string ConHan = "Còn hạn";
    public const string SapHetHan = "Sắp hết hạn";
    public const string QuaHan = "Quá hạn";
    public const string KhongNo = "Không nợ";
    public static readonly string[] TatCa = [ConHan, SapHetHan, QuaHan, KhongNo];
}
