using Microsoft.EntityFrameworkCore;
using XomNho.Api.Common;
using XomNho.Api.Data;
using XomNho.Api.Domain;
using XomNho.Api.NhanVienQL;

namespace XomNho.Api.HangHoaQL;

public sealed record DanhMucDong(string MaDM, string TenDM);
public sealed record HangHoaDong(string MaHH, string TenHH, string DonViTinh, string TrangThai);

public sealed record ChiTietHangHoa(
    string MaHH, string TenHH, string? MaVach, string MaDM, string TenDM, string DonViTinh,
    decimal GiaNhap, decimal GiaBan, int? NguongCanhBaoHetHang, int? NguongCanhBaoHetHan,
    string TrangThai, int TongTon);

/// <summary>Các trường số nhận dạng chuỗi để báo đúng lỗi "không phải số" (UC_4.1 5c–5f).</summary>
public sealed record YeuCauHangHoa(
    string? TenHH, string? MaVach, string? MaDM, string? DonViTinh,
    string? GiaNhap, string? GiaBan, string? NguongCanhBaoHetHang, string? NguongCanhBaoHetHan);

public sealed record KetQuaKiemTraXoaHangHoa(string MaHH, string TenHH, string CheDo);

/// <summary>UC_4.1 Thêm, UC_4.2 Sửa, UC_4.3 Xóa, UC_4.4 Tìm kiếm hàng hóa (chỉ Chủ quán – Q7).</summary>
public sealed class DichVuHangHoa(XomNhoDbContext db, ISinhMa sinhMa, IThamSoHeThong thamSo)
{
    public const string KhongDuocTrong = "Không được để trống!";
    public const string TenTrung = "Tên hàng hóa đã tồn tại!";
    public const string GiaNhapSai = "Giá nhập không hợp lệ!";
    public const string GiaBanSai = "Giá bán không hợp lệ!";
    public const string NguongHanSai = "Ngưỡng cảnh báo hết hạn không hợp lệ!";
    public const string NguongHangSai = "Ngưỡng cảnh báo hết hàng không hợp lệ!";
    public const string MaVachSai = "Mã vạch không hợp lệ!";
    public const string MaVachTrung = "Mã vạch đã tồn tại!";
    public const string KhongTimThay = "Không tìm thấy hàng hóa";
    public const string ConTonKho = "Hàng hóa còn tồn kho, vui lòng điều chỉnh số lượng về 0";

    private const long GiaToiDa = 999_999_999_999_999; // DECIMAL(15,0)

    public Task<List<DanhMucDong>> DanhMucAsync(CancellationToken ct) =>
        db.DanhMuc.AsNoTracking().OrderBy(x => x.MaDM).Select(x => new DanhMucDong(x.MaDM, x.TenDM)).ToListAsync(ct);

    public Task<string> MaDuKienAsync(CancellationToken ct) => sinhMa.XemTruocAsync(LoaiMa.HangHoa, ct);

    // ================================================================ UC_4.4 Tìm kiếm

    /// <summary>BR01: khớp một phần theo tên, không phân biệt hoa thường. BR02: A→Z, 20 dòng/trang.
    /// UC_4.3 BR01: hàng "Ngừng kinh doanh" không hiển thị ở tìm kiếm.</summary>
    public async Task<KetQuaTrang<HangHoaDong>> TimKiemAsync(string? tuKhoa, int trang, CancellationToken ct)
    {
        var q = db.HangHoa.AsNoTracking().Where(x => x.TrangThai == TrangThaiHangHoa.DangKinhDoanh);
        if (!QuyTac.Trong(tuKhoa))
        {
            var k = tuKhoa!.Trim().ToLower();
            q = q.Where(x => x.TenHH.ToLower().Contains(k));
        }
        var soDong = await thamSo.LaySoAsync(KhoaCauHinh.SoDongMoiTrang, ct);
        return await PhanTrang.LayTrangAsync(
            q.OrderBy(x => x.TenHH).Select(x => new HangHoaDong(x.MaHH, x.TenHH, x.DonViTinh, x.TrangThai)),
            trang, soDong, ct);
    }

    /// <summary>Gợi ý tên hàng đang kinh doanh cho ô "Tên hàng hóa" khi thêm lô (UC_10.1).</summary>
    public Task<List<HangHoaDong>> GoiYAsync(string? tuKhoa, CancellationToken ct)
    {
        var q = db.HangHoa.AsNoTracking().Where(x => x.TrangThai == TrangThaiHangHoa.DangKinhDoanh);
        if (!QuyTac.Trong(tuKhoa))
        {
            var k = tuKhoa!.Trim().ToLower();
            q = q.Where(x => x.TenHH.ToLower().Contains(k));
        }
        return q.OrderBy(x => x.TenHH).Take(20)
            .Select(x => new HangHoaDong(x.MaHH, x.TenHH, x.DonViTinh, x.TrangThai)).ToListAsync(ct);
    }

    public async Task<ChiTietHangHoa> ChiTietAsync(string maHH, CancellationToken ct)
    {
        var h = await db.HangHoa.AsNoTracking().Include(x => x.DanhMuc).FirstOrDefaultAsync(x => x.MaHH == maHH, ct)
            ?? throw new LoiNghiepVuException(StatusCodes.Status404NotFound, KhongTimThay);
        var tongTon = await db.LoHang.Where(l => l.MaHH == maHH).SumAsync(l => (int?)l.SoLuongTon, ct) ?? 0;
        return new ChiTietHangHoa(h.MaHH, h.TenHH, h.MaVach, h.MaDM, h.DanhMuc.TenDM, h.DonViTinh, h.GiaNhap, h.GiaBan,
            h.NguongCanhBaoHetHang, h.NguongCanhBaoHetHan, h.TrangThai, tongTon);
    }

    // ================================================================ UC_4.1 Thêm

    public async Task<string> ThemAsync(YeuCauHangHoa yc, CancellationToken ct)
    {
        var kt = new BoKiemTra();
        var gt = await KiemTraAsync(kt, yc, null, ct);
        kt.NemNeuCoLoi();

        // BR04 + Q16: mã chỉ được chốt khi lưu thành công.
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var h = new HangHoa
        {
            MaHH = await sinhMa.SinhMaAsync(LoaiMa.HangHoa, ct),
            TrangThai = TrangThaiHangHoa.DangKinhDoanh,
        };
        GanGiaTri(h, gt);
        db.HangHoa.Add(h);
        await LuuAsync(ct);
        await tx.CommitAsync(ct);
        return h.MaHH;
    }

    // ================================================================ UC_4.2 Sửa

    public async Task SuaAsync(string maHH, YeuCauHangHoa yc, CancellationToken ct)
    {
        var h = await db.HangHoa.FirstOrDefaultAsync(x => x.MaHH == maHH, ct)
            ?? throw new LoiNghiepVuException(StatusCodes.Status404NotFound, KhongTimThay);
        var kt = new BoKiemTra();
        var gt = await KiemTraAsync(kt, yc, h, ct);
        kt.NemNeuCoLoi();
        GanGiaTri(h, gt);
        await LuuAsync(ct);
    }

    // ================================================================ UC_4.3 Xóa

    public async Task<KetQuaKiemTraXoaHangHoa> KiemTraXoaAsync(string maHH, CancellationToken ct)
    {
        var h = await db.HangHoa.AsNoTracking().FirstOrDefaultAsync(x => x.MaHH == maHH, ct)
            ?? throw new LoiNghiepVuException(StatusCodes.Status404NotFound, KhongTimThay);
        if (h.TrangThai == TrangThaiHangHoa.NgungKinhDoanh)
            throw LoiNghiepVuException.KhongHopLe("Hàng hóa đã ở trạng thái “Ngừng kinh doanh”");

        // 5a – BR02: tổng số lượng tồn phải bằng 0.
        var tongTon = await db.LoHang.Where(l => l.MaHH == maHH).SumAsync(l => (int?)l.SoLuongTon, ct) ?? 0;
        if (tongTon > 0) throw new LoiNghiepVuException(StatusCodes.Status409Conflict, ConTonKho);

        // BR01: đã phát sinh giao dịch (đã nhập lô hoặc đã bán) → chỉ ngừng kinh doanh.
        var coGiaoDich = await db.LoHang.AnyAsync(l => l.MaHH == maHH, ct)
            || await db.ChiTietHoaDon.AnyAsync(c => c.MaHH == maHH, ct);
        return new KetQuaKiemTraXoaHangHoa(h.MaHH, h.TenHH, coGiaoDich ? CheDoXoa.NgungKinhDoanh : CheDoXoa.XoaHan);
    }

    public async Task<string> XoaAsync(string maHH, string? cheDo, CancellationToken ct)
    {
        var kq = await KiemTraXoaAsync(maHH, ct);
        if (kq.CheDo != cheDo)
            throw new LoiNghiepVuException(StatusCodes.Status409Conflict, "Thông tin hàng hóa đã thay đổi, vui lòng thử lại.");

        var h = await db.HangHoa.FirstAsync(x => x.MaHH == maHH, ct);
        if (kq.CheDo == CheDoXoa.XoaHan)
        {
            db.HangHoa.Remove(h);
            await LuuAsync(ct);
            return "Xóa hàng hóa thành công";
        }
        h.TrangThai = TrangThaiHangHoa.NgungKinhDoanh;
        await LuuAsync(ct);
        return "Đã chuyển hàng hóa sang trạng thái “Ngừng kinh doanh”";
    }

    // ================================================================ Kiểm tra dữ liệu

    private sealed record GiaTriHopLe(
        string TenHH, string? MaVach, string MaDM, string DonViTinh,
        decimal GiaNhap, decimal GiaBan, int? NguongHang, int? NguongHan);

    /// <summary>
    /// UC_4.1 BR01–BR03, BR05, BR06. Khi sửa (<paramref name="cu"/> khác null) chỉ kiểm tra
    /// những trường đã thay đổi so với giá trị hiện tại (UC_4.2 BR04).
    /// </summary>
    private async Task<GiaTriHopLe> KiemTraAsync(BoKiemTra kt, YeuCauHangHoa yc, HangHoa? cu, CancellationToken ct)
    {
        var ten = QuyTac.Trong(yc.TenHH) ? "" : QuyTac.ChuanHoa(yc.TenHH!);
        var maVach = QuyTac.Trong(yc.MaVach) ? null : yc.MaVach!.Trim();
        var maDM = yc.MaDM?.Trim() ?? "";
        var dvt = yc.DonViTinh?.Trim().ToLowerInvariant() ?? "";

        var docGiaNhap = QuyTac.DocSoNguyen(yc.GiaNhap, out var giaNhap);
        var docGiaBan = QuyTac.DocSoNguyen(yc.GiaBan, out var giaBan);
        var docNguongHang = QuyTac.DocSoNguyen(yc.NguongCanhBaoHetHang, out var nguongHang);
        var docNguongHan = QuyTac.DocSoNguyen(yc.NguongCanhBaoHetHan, out var nguongHan);
        int? nHang = QuyTac.Trong(yc.NguongCanhBaoHetHang) ? null : (int)Math.Min(nguongHang, int.MaxValue);
        int? nHan = QuyTac.Trong(yc.NguongCanhBaoHetHan) ? null : (int)Math.Min(nguongHan, int.MaxValue);

        bool Doi(bool khacGiaTriCu) => cu is null || khacGiaTriCu;

        // Tên hàng hóa
        if (Doi(ten != cu?.TenHH))
        {
            kt.Kiem("tenHH", ten.Length > 0, KhongDuocTrong).Kiem("tenHH", ten.Length <= 100, "Tên hàng hóa tối đa 100 ký tự!");
            if (!kt.CoLoiTai("tenHH"))
            {
                var tenThuong = ten.ToLowerInvariant();
                var maBoQua = cu?.MaHH ?? "";
                kt.Kiem("tenHH", !await db.HangHoa.AnyAsync(x => x.MaHH != maBoQua && x.TenHH.ToLower() == tenThuong, ct), TenTrung);
            }
        }
        // Mã vạch (không bắt buộc – Q15)
        if (Doi(maVach != cu?.MaVach) && maVach is not null)
        {
            kt.Kiem("maVach", maVach.Length <= 50 && maVach.All(char.IsAsciiLetterOrDigit), MaVachSai);
            if (!kt.CoLoiTai("maVach"))
            {
                var maBoQua = cu?.MaHH ?? "";
                kt.Kiem("maVach", !await db.HangHoa.AnyAsync(x => x.MaHH != maBoQua && x.MaVach == maVach, ct), MaVachTrung);
            }
        }
        // Danh mục, đơn vị tính (droplist cố định)
        if (Doi(maDM != cu?.MaDM))
        {
            kt.Kiem("maDM", maDM.Length > 0, KhongDuocTrong);
            if (!kt.CoLoiTai("maDM"))
                kt.Kiem("maDM", await db.DanhMuc.AnyAsync(x => x.MaDM == maDM, ct), "Danh mục không hợp lệ!");
        }
        if (Doi(dvt != cu?.DonViTinh))
            kt.Kiem("donViTinh", dvt.Length > 0, KhongDuocTrong)
              .Kiem("donViTinh", DanhSachCoDinh.DonViTinh.Contains(dvt), "Đơn vị tính không hợp lệ!");

        // Giá – BR03: > 0
        if (Doi(!docGiaNhap || giaNhap != cu?.GiaNhap))
            kt.Kiem("giaNhap", !QuyTac.Trong(yc.GiaNhap), KhongDuocTrong)
              .Kiem("giaNhap", docGiaNhap && giaNhap > 0 && giaNhap <= GiaToiDa, GiaNhapSai);
        if (Doi(!docGiaBan || giaBan != cu?.GiaBan))
            kt.Kiem("giaBan", !QuyTac.Trong(yc.GiaBan), KhongDuocTrong)
              .Kiem("giaBan", docGiaBan && giaBan > 0 && giaBan <= GiaToiDa, GiaBanSai);

        // Ngưỡng cảnh báo – không bắt buộc (để trống = chưa thiết lập); nếu nhập thì phải > 0.
        if (!QuyTac.Trong(yc.NguongCanhBaoHetHang) && Doi(!docNguongHang || nguongHang != cu?.NguongCanhBaoHetHang))
            kt.Kiem("nguongCanhBaoHetHang", docNguongHang && nguongHang > 0 && nguongHang <= 1_000_000, NguongHangSai);
        if (!QuyTac.Trong(yc.NguongCanhBaoHetHan) && Doi(!docNguongHan || nguongHan != cu?.NguongCanhBaoHetHan))
            kt.Kiem("nguongCanhBaoHetHan", docNguongHan && nguongHan > 0 && nguongHan <= 36_500, NguongHanSai);

        return new GiaTriHopLe(ten, maVach, maDM, dvt, giaNhap, giaBan, nHang, nHan);
    }

    private static void GanGiaTri(HangHoa h, GiaTriHopLe gt)
    {
        h.TenHH = gt.TenHH;
        h.MaVach = gt.MaVach;
        h.MaDM = gt.MaDM;
        h.DonViTinh = gt.DonViTinh;
        h.GiaNhap = gt.GiaNhap;
        h.GiaBan = gt.GiaBan;
        h.NguongCanhBaoHetHang = gt.NguongHang;
        h.NguongCanhBaoHetHan = gt.NguongHan;
    }

    private async Task LuuAsync(CancellationToken ct)
    {
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex) when (LoiTrungKhoa.TenChiMuc(ex) is { } chiMuc)
        {
            throw chiMuc switch
            {
                "UX_HangHoa_TenHH" => LoiNghiepVuException.TheoTruong("tenHH", TenTrung),
                "UX_HangHoa_MaVach" => LoiNghiepVuException.TheoTruong("maVach", MaVachTrung),
                _ => new LoiNghiepVuException(StatusCodes.Status500InternalServerError, "Không thể lưu hàng hóa, vui lòng thử lại sau."),
            };
        }
    }
}
