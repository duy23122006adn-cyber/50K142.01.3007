using XomNho.Api.Common;

namespace XomNho.Tests;

public class QuyTacTests
{
    [Theory]
    [InlineData("abc12345", true)]
    [InlineData("ChuQuan2026", true)]
    [InlineData("abc1234", false)]      // < 8 ký tự
    [InlineData("abcdefgh", false)]     // không có số
    [InlineData("12345678", false)]     // không có chữ
    [InlineData("", false)]
    public void MatKhau_toi_thieu_8_ky_tu_co_chu_va_so(string matKhau, bool hopLe) =>
        Assert.Equal(hopLe, QuyTac.MatKhauHopLe(matKhau));

    [Theory]
    [InlineData("nva_01", true)]
    [InlineData("abcd", true)]
    [InlineData("abc", false)]                      // < 4
    [InlineData("a23456789012345678901", false)]    // > 20
    [InlineData("nguyễn", false)]                   // có dấu
    [InlineData("nv a", false)]                     // khoảng trắng
    public void TenDangNhap_theo_UC_2_1_BR02(string ten, bool hopLe) =>
        Assert.Equal(hopLe, QuyTac.TenDangNhapHopLe(ten));

    [Theory]
    [InlineData("0905123456", true)]
    [InlineData("905123456", false)]
    [InlineData("1905123456", false)]
    [InlineData("09051234567", false)]
    [InlineData("0905 12345", false)]
    public void SoDienThoai_10_so_bat_dau_bang_0(string sdt, bool hopLe) =>
        Assert.Equal(hopLe, QuyTac.SoDienThoaiHopLe(sdt));

    [Theory]
    [InlineData("   ", true)]
    [InlineData("", true)]
    [InlineData(null, true)]
    [InlineData(" a ", false)]
    public void Chi_khoang_trang_la_de_trong(string? giaTri, bool trong) =>
        Assert.Equal(trong, QuyTac.Trong(giaTri));
}

public class DinhDangMaTests
{
    private static readonly DateOnly Ngay = new(2026, 11, 3);

    [Theory]
    [InlineData(LoaiMa.NhanVien, 1, "NV001")]
    [InlineData(LoaiMa.ChuQuan, 1, "CQ001")]
    [InlineData(LoaiMa.KhachHang, 1, "KH-000001")]
    [InlineData(LoaiMa.HangHoa, 1, "HH-0001")]
    [InlineData(LoaiMa.LoHang, 13, "LO-000013")]
    [InlineData(LoaiMa.DanhMuc, 1, "DM01")]
    [InlineData(LoaiMa.CaLamViec, 1, "CA-03112026-001")]
    [InlineData(LoaiMa.BienBan, 1, "BB-03112026-001")]
    [InlineData(LoaiMa.HoaDon, 1, "HD-03/11/2026.001")]
    [InlineData(LoaiMa.HoaDon, 1000, "HD-03/11/2026.1000")]   // > 999 thì 4 chữ số (UC_6.5 BR10)
    [InlineData(LoaiMa.PhieuThanhToanNo, 1, "PTTN-03/11/2026.001")]
    [InlineData(LoaiMa.PhieuDoiTra, 1, "PDT-03/11/2026.001")]
    public void Dinh_dang_dung_theo_bao_cao(LoaiMa loai, int so, string mong) =>
        Assert.Equal(mong, DinhDangMa.Tao(loai, so, Ngay));

    [Fact]
    public void Ma_dai_nhat_vua_VARCHAR_20() =>
        Assert.True(DinhDangMa.Tao(LoaiMa.PhieuThanhToanNo, 9999, Ngay).Length <= 20);

    [Fact]
    public void Ma_hoa_don_dem_theo_ngay_ma_nhan_vien_dem_toan_cuc()
    {
        Assert.Equal("20261103", DinhDangMa.Ky(LoaiMa.HoaDon, Ngay));
        Assert.Equal(DinhDangMa.KyToanCuc, DinhDangMa.Ky(LoaiMa.NhanVien, Ngay));
    }
}
