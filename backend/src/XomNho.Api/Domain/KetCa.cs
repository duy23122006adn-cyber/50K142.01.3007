namespace XomNho.Api.Domain;

/// <summary>Bảng BienBanKetCa – mỗi ca tối đa một biên bản (UC_9.1 BR05, BR10).</summary>
public class BienBanKetCa
{
    public string MaBB { get; set; } = null!;
    /// <summary>Thời điểm lưu – cũng là giờ kết thúc ca.</summary>
    public DateTime NgayGioLuu { get; set; }
    public string MaCa { get; set; } = null!;
    public CaLamViec CaLamViec { get; set; } = null!;
    /// <summary>Người kết ca (có thể khác người phụ trách ca).</summary>
    public string MaND { get; set; } = null!;
    public NguoiDung NguoiDung { get; set; } = null!;
    /// <summary>UC_9.2 BR06: có ít nhất một dòng chênh lệch ≠ 0.</summary>
    public bool CoChenhLech { get; set; }
    public List<ChiTietBienBan> ChiTiet { get; set; } = [];
}

/// <summary>Bảng ChiTietBienBan – một dòng / mặt hàng (UC_9.1 BR08, BR09).</summary>
public class ChiTietBienBan
{
    public int MaCTBB { get; set; }
    public string MaBB { get; set; } = null!;
    public BienBanKetCa BienBanKetCa { get; set; } = null!;
    public string MaHH { get; set; } = null!;
    public HangHoa HangHoa { get; set; } = null!;
    public int SoLuongLyThuyet { get; set; }
    public int SoLuongThucTe { get; set; }
    /// <summary>Cột tính toán SoLuongThucTe − SoLuongLyThuyet.</summary>
    public int ChenhLech { get; private set; }
    public string? NguyenNhan { get; set; }
}
