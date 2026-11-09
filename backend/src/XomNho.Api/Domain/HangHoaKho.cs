namespace XomNho.Api.Domain;

/// <summary>Bảng DanhMuc – 11 danh mục cố định (UC_4.1 BR06, Q15).</summary>
public class DanhMuc
{
    public string MaDM { get; set; } = null!;
    public string TenDM { get; set; } = null!;
}

/// <summary>Bảng HangHoa (THIET_KE_DB_V2.md mục 3.7).</summary>
public class HangHoa
{
    public string MaHH { get; set; } = null!;
    public string TenHH { get; set; } = null!;
    public string? MaVach { get; set; }
    public string DonViTinh { get; set; } = null!;
    public decimal GiaNhap { get; set; }
    public decimal GiaBan { get; set; }
    /// <summary>NULL = chưa thiết lập, không sinh cảnh báo hàng.</summary>
    public int? NguongCanhBaoHetHang { get; set; }
    /// <summary>Số ngày trước hạn sử dụng. NULL = chưa thiết lập.</summary>
    public int? NguongCanhBaoHetHan { get; set; }
    public string TrangThai { get; set; } = TrangThaiHangHoa.DangKinhDoanh;
    public string MaDM { get; set; } = null!;
    public DanhMuc DanhMuc { get; set; } = null!;
    public byte[] PhienBan { get; set; } = [];
    public List<LoHang> LoHang { get; set; } = [];
}

/// <summary>Bảng LoHang (THIET_KE_DB_V2.md mục 3.8).</summary>
public class LoHang
{
    public string MaLo { get; set; } = null!;
    public string MaHH { get; set; } = null!;
    public HangHoa HangHoa { get; set; } = null!;
    public int SoLuongTon { get; set; }
    public DateOnly HanSuDung { get; set; }
    public DateTime NgayNhap { get; set; }
    public byte[] PhienBan { get; set; } = [];
}

/// <summary>Bảng CanhBaoTonKho – mọi cảnh báo gắn với lô (Q13).</summary>
public class CanhBaoTonKho
{
    public int MaCB { get; set; }
    public string LoaiCanhBao { get; set; } = null!;
    public string TrangThai { get; set; } = TrangThaiCanhBao.ChuaXuLy;
    public string MaLo { get; set; } = null!;
    public string MaHH { get; set; } = null!;
    public LoHang LoHang { get; set; } = null!;
    public DateTime ThoiDiemTao { get; set; }
    public DateTime ThoiDiemCapNhat { get; set; }
    public DateTime? ThoiDiemXuLy { get; set; }
}

/// <summary>Bảng PhieuDieuChinhTon – điều chỉnh tồn theo lô (UC_3.3).</summary>
public class PhieuDieuChinhTon
{
    public int MaPDC { get; set; }
    public DateTime NgayGio { get; set; }
    public string MaLo { get; set; } = null!;
    public string MaHH { get; set; } = null!;
    public LoHang LoHang { get; set; } = null!;
    public int SoLuongHeThong { get; set; }
    public int SoLuongThucTe { get; set; }
    /// <summary>Cột tính toán: SoLuongThucTe − SoLuongHeThong (UC_3.3 BR06).</summary>
    public int ChenhLech { get; private set; }
    public DateOnly HanSuDungCu { get; set; }
    public DateOnly HanSuDungMoi { get; set; }
    public string LyDo { get; set; } = null!;
    public string MaCQ { get; set; } = null!;
    public ChuQuan ChuQuan { get; set; } = null!;
}

/// <summary>Bảng LichSuSuaNhanVien (UC_2.2 BR06).</summary>
public class LichSuSuaNhanVien
{
    public int MaLS { get; set; }
    public string MaNV { get; set; } = null!;
    public NhanVien NhanVien { get; set; } = null!;
    public string HoTenNV { get; set; } = null!;
    public string MaCQ { get; set; } = null!;
    public ChuQuan ChuQuan { get; set; } = null!;
    public string HoTenCQ { get; set; } = null!;
    public DateTime ThoiDiemSua { get; set; }
    public string NoiDungTruoc { get; set; } = null!;
    public string NoiDungSau { get; set; } = null!;
}

public static class TrangThaiHangHoa
{
    public const string DangKinhDoanh = "Đang kinh doanh";
    public const string NgungKinhDoanh = "Ngừng kinh doanh";
}

public static class LoaiCanhBao
{
    public const string SapHetHang = "Sắp hết hàng";
    public const string HetHang = "Hết hàng";
    public const string SapHetHan = "Sắp hết hạn";
    public const string HetHan = "Hết hạn";

    public static readonly string[] TatCa = [SapHetHang, HetHang, SapHetHan, HetHan];
    public static bool LaCanhBaoHang(string loai) => loai is SapHetHang or HetHang;
    public static bool LaCanhBaoHan(string loai) => loai is SapHetHan or HetHan;
}

public static class TrangThaiCanhBao
{
    public const string ChuaXuLy = "Chưa xử lý";
    public const string DaXuLy = "Đã xử lý";
}

/// <summary>UC_4.1 BR05, BR06 – danh sách cố định.</summary>
public static class DanhSachCoDinh
{
    public static readonly string[] DonViTinh = ["gói", "cái", "chai", "lon", "hộp", "lốc", "thùng"];

    public static readonly string[] DanhMuc =
    [
        "Gia vị", "Bánh kẹo & Đồ ăn vặt", "Mì tôm", "Bún & Phở khô", "Bột giặt / Nước giặt",
        "Nước xả", "Sữa tắm", "Dầu gội", "Nước giải khát", "Sữa & Sản phẩm từ sữa", "Gạo & Nông sản khô",
    ];
}
