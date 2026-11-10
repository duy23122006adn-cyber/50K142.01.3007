namespace XomNho.Api.Domain;

/// <summary>Bảng CaLamViec – toàn quán chỉ một ca chưa kết thúc (Q10).</summary>
public class CaLamViec
{
    public string MaCa { get; set; } = null!;
    public DateOnly NgayLamViec { get; set; }
    public TimeOnly GioBatDau { get; set; }
    public TimeOnly? GioKetThuc { get; set; }
    public string TrangThai { get; set; } = TrangThaiCa.DangHoatDong;
    /// <summary>Người mở ca = người phụ trách.</summary>
    public string MaND { get; set; } = null!;
    public NguoiDung NguoiDung { get; set; } = null!;
    /// <summary>Cột tính toán có UNIQUE: mọi ca chưa kết thúc cùng giá trị 'DANG_MO'.</summary>
    public string? KhoaCaMo { get; private set; }
    public byte[] PhienBan { get; set; } = [];
}

/// <summary>Bảng KhachHang (UC_8.1–8.3).</summary>
public class KhachHang
{
    public string MaKH { get; set; } = null!;
    public string HoTen { get; set; } = null!;
    public string SDT { get; set; } = null!;
    public byte[] PhienBan { get; set; } = [];
}

/// <summary>Bảng HoaDon. Loại hóa đơn xác định qua bảng con HoaDonThanhToanNgay / HoaDonNo.</summary>
public class HoaDon
{
    public string MaHD { get; set; } = null!;
    public DateTime NgayGioLap { get; set; }
    public decimal TongTien { get; set; }
    public decimal SoTienDaTra { get; set; }
    public string TrangThai { get; set; } = null!;
    public string MaCa { get; set; } = null!;
    public CaLamViec CaLamViec { get; set; } = null!;
    /// <summary>Người bán (UC_6.5 BR9).</summary>
    public string MaND { get; set; } = null!;
    public NguoiDung NguoiDung { get; set; } = null!;
    public HoaDonThanhToanNgay? ThanhToanNgay { get; set; }
    /// <summary>Có giá trị nếu là hóa đơn "Ghi nợ" (Giai đoạn 4).</summary>
    public HoaDonNo? GhiNo { get; set; }
    public List<ChiTietHoaDon> ChiTiet { get; set; } = [];
}

/// <summary>Bảng HoaDonThanhToanNgay – hóa đơn "Thanh toán ngay".</summary>
public class HoaDonThanhToanNgay
{
    public string MaHD { get; set; } = null!;
    public HoaDon HoaDon { get; set; } = null!;
    /// <summary>NULL nếu là khách vãng lai.</summary>
    public string? MaKH { get; set; }
    public KhachHang? KhachHang { get; set; }
}

/// <summary>Bảng ChiTietHoaDon – mỗi dòng gắn với một lô đã xuất (FEFO) và giá vốn lúc bán (Q20).</summary>
public class ChiTietHoaDon
{
    public int MaCTHD { get; set; }
    public string MaHD { get; set; } = null!;
    public HoaDon HoaDon { get; set; } = null!;
    public string MaHH { get; set; } = null!;
    public HangHoa HangHoa { get; set; } = null!;
    public string MaLo { get; set; } = null!;
    public LoHang LoHang { get; set; } = null!;
    public int SoLuong { get; set; }
    public decimal DonGia { get; set; }
    public decimal GiaVon { get; set; }
    /// <summary>Cột tính toán SoLuong × DonGia.</summary>
    public decimal ThanhTien { get; private set; }
}

/// <summary>Bảng PhieuThanhToan – khoản thu/chi gắn với bán hàng, thu nợ, đổi trả.</summary>
public class PhieuThanhToan
{
    public string MaPTT { get; set; } = null!;
    public DateTime NgayGio { get; set; }
    public string LoaiPhieu { get; set; } = null!;
    public string HuongTien { get; set; } = HuongTienTe.Thu;
    public decimal SoTien { get; set; }
    public string PhuongThuc { get; set; } = null!;
    public string TrangThai { get; set; } = TrangThaiPhieuThanhToan.ThanhCong;
    public string? MaGiaoDichNganHang { get; set; }
    public string MaND { get; set; } = null!;
    public NguoiDung NguoiDung { get; set; } = null!;
    /// <summary>Gắn vào sau khi hóa đơn tạo xong (UC_6.5 14.a: khoản thu được giữ khi tạo hóa đơn lỗi).</summary>
    public string? MaHDTTN { get; set; }
    public HoaDonThanhToanNgay? HoaDonThanhToanNgay { get; set; }
    /// <summary>Có giá trị khi thu nợ khách quen (Giai đoạn 4).</summary>
    public string? MaKQ { get; set; }
    public KhachQuen? KhachQuen { get; set; }
    public List<PhanBoThanhToan> PhanBo { get; set; } = [];
}

/// <summary>Bảng NhatKyGuiChungTu – kết quả gửi hóa đơn / phiếu qua SMS, Zalo.</summary>
public class NhatKyGuiChungTu
{
    public int MaGui { get; set; }
    public string LoaiChungTu { get; set; } = null!;
    public string MaChungTu { get; set; } = null!;
    public string Kenh { get; set; } = null!;
    public string SDTNhan { get; set; } = null!;
    public DateTime ThoiDiemGui { get; set; }
    public string KetQua { get; set; } = null!;
    public string MaND { get; set; } = null!;
}

public static class TrangThaiCa
{
    public const string DangHoatDong = "Đang hoạt động";
    public const string DangKetCa = "Đang kết ca";
    public const string DaKetThuc = "Đã kết thúc";
}

public static class TrangThaiHoaDon
{
    public const string DaThanhToan = "Đã thanh toán";
    public const string ConNo = "Còn nợ";
    public const string DaHuy = "Đã hủy";
    public static readonly string[] TatCa = [DaThanhToan, ConNo, DaHuy];
}

public static class LoaiPhieuThanhToan
{
    public const string BanHang = "Bán hàng";
    public const string ThuNo = "Thu nợ";
    public const string DoiTra = "Đổi trả";
}

public static class HuongTienTe
{
    public const string Thu = "Thu";
    public const string Chi = "Chi";
}

public static class PhuongThucThanhToan
{
    public const string TienMat = "Tiền mặt";
    public const string ChuyenKhoanQr = "Chuyển khoản QR";
    public const string GhiNo = "Ghi nợ";
}

public static class TrangThaiPhieuThanhToan
{
    public const string ThanhCong = "Thành công";
    public const string KhongThanhCong = "Không thành công";
    public const string DaHuy = "Đã hủy";
}
