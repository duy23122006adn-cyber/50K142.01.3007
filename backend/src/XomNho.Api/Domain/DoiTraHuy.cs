namespace XomNho.Api.Domain;

/// <summary>Bảng NhatKyHuy – nhật ký hủy hóa đơn, lưu cố định (UC_6.3 BR11, BR12).</summary>
public class NhatKyHuy
{
    public int MaNK { get; set; }
    public string MaHD { get; set; } = null!;
    public HoaDon HoaDon { get; set; } = null!;
    /// <summary>Người hủy (chỉ Chủ quán).</summary>
    public string MaCQ { get; set; } = null!;
    public ChuQuan ChuQuan { get; set; } = null!;
    public string LyDoHuy { get; set; } = null!;
    public DateTime ThoiGianHuy { get; set; }
    public decimal TongTien { get; set; }
    /// <summary>BR06: hóa đơn "Đã thanh toán" = tổng tiền; hóa đơn nợ = 0.</summary>
    public decimal SoTienCanHoan { get; set; }
    public bool XacNhanChuaNhanHang { get; set; }
    /// <summary>Bản sao chi tiết hóa đơn tại thời điểm hủy (JSON).</summary>
    public string BanSaoHoaDon { get; set; } = null!;
}

/// <summary>Bảng PhieuDoiTra (UC_6.2, UC_6.4).</summary>
public class PhieuDoiTra
{
    public string MaPDT { get; set; } = null!;
    public string LoaiPhieu { get; set; } = null!;
    public DateTime NgayGioLap { get; set; }
    public string LyDoDoiTra { get; set; } = null!;
    public string TrangThai { get; set; } = TrangThaiPhieuDoiTra.ChoDuyet;
    /// <summary>Tổng giá trị hàng trả theo giá trên hóa đơn gốc (BR04).</summary>
    public decimal SoTienHoan { get; set; }
    /// <summary>BR05: giá trị hàng mới − giá trị hàng trả. &gt; 0 thu thêm, &lt; 0 hoàn lại. Phiếu trả hàng = −SoTienHoan.</summary>
    public decimal ChenhLech { get; set; }
    public string? LyDoTuChoi { get; set; }
    public DateTime? NgayGioDuyet { get; set; }
    /// <summary>Thời điểm đã hoàn/thu tiền và cập nhật tồn kho.</summary>
    public DateTime? NgayGioHoanTat { get; set; }
    public string MaHD { get; set; } = null!;
    public HoaDon HoaDon { get; set; } = null!;
    /// <summary>Người lập.</summary>
    public string MaND { get; set; } = null!;
    public NguoiDung NguoiDung { get; set; } = null!;
    /// <summary>Người duyệt.</summary>
    public string? MaCQ { get; set; }
    public ChuQuan? ChuQuan { get; set; }
    public List<ChiTietDoiTra> ChiTiet { get; set; } = [];
    public byte[] PhienBan { get; set; } = [];
}

/// <summary>Bảng ChiTietDoiTra – mỗi dòng gắn với một dòng hóa đơn gốc (qua đó biết lô để hoàn).</summary>
public class ChiTietDoiTra
{
    public int MaCTDT { get; set; }
    public string MaPDT { get; set; } = null!;
    public PhieuDoiTra PhieuDoiTra { get; set; } = null!;
    public int MaCTHD { get; set; }
    public ChiTietHoaDon ChiTietHoaDon { get; set; } = null!;
    public int SoLuongTra { get; set; }
    public decimal GiaTriHoan { get; set; }
    public string TinhTrangHang { get; set; } = null!;
    public bool LoiNhaSanXuat { get; set; }
    public string? MoTaLoi { get; set; }
    /// <summary>Chỉ dùng cho phiếu đổi hàng.</summary>
    public string? MaHHMoi { get; set; }
    public HangHoa? HangHoaMoi { get; set; }
    public int? SoLuongMoi { get; set; }
    public decimal? GiaTriHangMoi { get; set; }
    /// <summary>Giá vốn một đơn vị hàng mới = giá nhập lúc xuất hàng (ghi khi hoàn tất) – dùng cho báo cáo lợi nhuận (Q20).</summary>
    public decimal? GiaVonHangMoi { get; set; }
    /// <summary>Lô xuất hàng mới – ghi khi hoàn tất. Nhiều lô thì ghi lô đầu tiên.</summary>
    public string? MaLoMoi { get; set; }
}

/// <summary>Bảng ThongBao – gửi kết quả duyệt phiếu cho người lập (UC_6.4 BR08).</summary>
public class ThongBao
{
    public int MaTB { get; set; }
    public string MaND { get; set; } = null!;
    public string LoaiThongBao { get; set; } = null!;
    public string NoiDung { get; set; } = null!;
    public string? MaThamChieu { get; set; }
    public DateTime ThoiDiemTao { get; set; }
    public bool DaDoc { get; set; }
}

public static class TrangThaiPhieuDoiTra
{
    public const string ChoDuyet = "Chờ duyệt";
    public const string DaDuyet = "Đã duyệt";
    public const string TuChoi = "Từ chối";
    public const string KhongHoanTat = "Không hoàn tất";
    public static readonly string[] TatCa = [ChoDuyet, DaDuyet, TuChoi, KhongHoanTat];
}

public static class LoaiPhieuDoiTra
{
    public const string DoiHang = "Đổi hàng";
    public const string TraHang = "Trả hàng";
}
