using Microsoft.EntityFrameworkCore;
using XomNho.Api.Common;
using XomNho.Api.Data;
using XomNho.Api.Domain;

namespace XomNho.Api.TonKho;

public sealed record LoTonKhoDong(string MaLo, string MaHH, string TenHH, string DonViTinh, int SoLuongTon, DateOnly HanSuDung);

public sealed record CanhBaoDong(
    int MaCB, string MaLo, string TenHH, string DonViTinh, int SoLuongTon, DateOnly HanSuDung,
    int SoNgayConLai, string LoaiCanhBao, string TrangThai);

public sealed record KetQuaCanhBao(IReadOnlyList<CanhBaoDong> DanhSach, IReadOnlyDictionary<string, int> SoLuongTheoLoai);

public sealed record LoDieuChinh(
    string MaLo, string MaHH, string TenHH, string DonViTinh, int SoLuongTon, DateOnly HanSuDung,
    bool KhoaHanSuDung, bool KhoaToanBo);

public sealed record YeuCauDieuChinh(string? SoLuongThucTe, string? HanSuDung, string? LyDo);

public sealed record LoHangDong(string MaLo, string TenHH, int SoLuongTon, DateOnly HanSuDung);
public sealed record YeuCauThemLo(string? TenHangHoa, string? SoLuong, string? HanSuDung);

/// <summary>UC_3.1 Tìm kiếm tồn kho, UC_3.2 Xem cảnh báo, UC_3.3 Điều chỉnh tồn kho, UC_10.1 Thêm lô hàng.</summary>
public sealed class DichVuTonKho(
    XomNhoDbContext db,
    ISinhMa sinhMa,
    IDongHo dongHo,
    IThamSoHeThong thamSo,
    INguoiDungHienTai hienTai,
    DichVuCanhBao canhBao,
    CaLam.DichVuCa dichVuCa)
{
    public const string KhongDuocDeTrong = "Không được để trống";
    public const string GiaTriSai = "Giá trị không hợp lệ!";
    public const string HsdQuaKhu = "Hạn sử dụng phải từ ngày hiện tại trở đi!";
    public const string KhongTimThayLo = "Không tìm thấy lô hàng";

    // ================================================================ UC_3.1 Tìm kiếm tồn kho

    /// <summary>BR01: theo tên hoặc mã hàng, khớp một phần, không phân biệt hoa thường. BR02: A→Z, 20 dòng/trang.</summary>
    public async Task<KetQuaTrang<LoTonKhoDong>> TimKiemAsync(string? tuKhoa, int trang, CancellationToken ct)
    {
        var q = db.LoHang.AsNoTracking().Where(l => l.HangHoa.TrangThai == TrangThaiHangHoa.DangKinhDoanh);
        if (!QuyTac.Trong(tuKhoa))
        {
            var k = tuKhoa!.Trim().ToLower();
            q = q.Where(l => l.HangHoa.TenHH.ToLower().Contains(k) || l.MaHH.ToLower().Contains(k));
        }
        var soDong = await thamSo.LaySoAsync(KhoaCauHinh.SoDongMoiTrang, ct);
        return await PhanTrang.LayTrangAsync(
            q.OrderBy(l => l.HangHoa.TenHH).ThenBy(l => l.HanSuDung).ThenBy(l => l.MaLo)
             .Select(l => new LoTonKhoDong(l.MaLo, l.MaHH, l.HangHoa.TenHH, l.HangHoa.DonViTinh, l.SoLuongTon, l.HanSuDung)),
            trang, soDong, ct);
    }

    // ================================================================ UC_3.2 Xem cảnh báo

    public async Task<KetQuaCanhBao> CanhBaoAsync(string? loai, bool caDaXuLy, CancellationToken ct)
    {
        var q = db.CanhBaoTonKho.AsNoTracking()
            .Where(c => c.LoHang.HangHoa.TrangThai == TrangThaiHangHoa.DangKinhDoanh);
        if (!caDaXuLy) q = q.Where(c => c.TrangThai == TrangThaiCanhBao.ChuaXuLy);

        var soLuong = await q.GroupBy(c => c.LoaiCanhBao).Select(g => new { g.Key, SoLuong = g.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.SoLuong, ct);

        if (!QuyTac.Trong(loai)) q = q.Where(c => c.LoaiCanhBao == loai);
        var ds = await q
            .OrderBy(c => c.TrangThai == TrangThaiCanhBao.ChuaXuLy ? 0 : 1)
            .ThenBy(c => c.LoHang.HanSuDung).ThenBy(c => c.MaLo)
            .Select(c => new
            {
                c.MaCB, c.MaLo, c.LoHang.HangHoa.TenHH, c.LoHang.HangHoa.DonViTinh,
                c.LoHang.SoLuongTon, c.LoHang.HanSuDung, c.LoaiCanhBao, c.TrangThai,
            })
            .ToListAsync(ct);

        return new KetQuaCanhBao(
            ds.Select(x => new CanhBaoDong(x.MaCB, x.MaLo, x.TenHH, x.DonViTinh, x.SoLuongTon, x.HanSuDung,
                canhBao.SoNgayConLai(x.HanSuDung), x.LoaiCanhBao, x.TrangThai)).ToList(),
            soLuong);
    }

    // ================================================================ UC_3.3 Điều chỉnh tồn kho

    public async Task<LoDieuChinh> LayLoDieuChinhAsync(string maLo, CancellationToken ct)
    {
        var lo = await db.LoHang.AsNoTracking().Include(l => l.HangHoa).FirstOrDefaultAsync(l => l.MaLo == maLo, ct)
            ?? throw new LoiNghiepVuException(StatusCodes.Status404NotFound, KhongTimThayLo);
        var (khoaHan, khoaToanBo) = await KhoaTheoCanhBaoAsync(maLo, ct);
        return new LoDieuChinh(lo.MaLo, lo.MaHH, lo.HangHoa.TenHH, lo.HangHoa.DonViTinh, lo.SoLuongTon, lo.HanSuDung, khoaHan, khoaToanBo);
    }

    public async Task DieuChinhAsync(string maLo, YeuCauDieuChinh yc, CancellationToken ct)
    {
        await dichVuCa.KiemTraKhongDangKetCaAsync(ct); // UC_9.1 BR07
        var lo = await db.LoHang.Include(l => l.HangHoa).FirstOrDefaultAsync(l => l.MaLo == maLo, ct)
            ?? throw new LoiNghiepVuException(StatusCodes.Status404NotFound, KhongTimThayLo);
        var (khoaHan, khoaToanBo) = await KhoaTheoCanhBaoAsync(maLo, ct);

        // BR05: lô có cảnh báo "Hết hạn" → không được điều chỉnh bất cứ thông tin nào.
        if (khoaToanBo)
            throw LoiNghiepVuException.KhongHopLe("Lô hàng đã có cảnh báo hết hạn, không được điều chỉnh.");

        var kt = new BoKiemTra();
        // 11a – BR01; màn hình 3.4.3: số lượng thực tế cũng không được để trống.
        kt.Kiem("lyDo", !QuyTac.Trong(yc.LyDo), KhongDuocDeTrong)
          .Kiem("lyDo", QuyTac.Trong(yc.LyDo) || yc.LyDo!.Trim().Length <= 255, "Lý do tối đa 255 ký tự")
          .Kiem("soLuongThucTe", !QuyTac.Trong(yc.SoLuongThucTe), KhongDuocDeTrong);

        // 11b – BR04: số lượng thực tế ≥ 0 và là số.
        var docSo = QuyTac.DocSoNguyen(yc.SoLuongThucTe, out var soThucTe);
        kt.Kiem("soLuongThucTe", docSo && soThucTe <= int.MaxValue, GiaTriSai);

        // BR07: chỉ kiểm tra hạn sử dụng khi người dùng đổi khác giá trị hiện tại.
        var hsdMoi = lo.HanSuDung;
        if (!QuyTac.Trong(yc.HanSuDung))
        {
            if (!QuyTac.DocNgay(yc.HanSuDung, out hsdMoi)) kt.Kiem("hanSuDung", false, "Hạn sử dụng không hợp lệ!");
            else if (hsdMoi != lo.HanSuDung)
            {
                kt.Kiem("hanSuDung", !khoaHan, "Lô hàng đã có cảnh báo sắp hết hạn, không được sửa hạn sử dụng.") // BR05
                  .Kiem("hanSuDung", hsdMoi >= dongHo.HomNay, HsdQuaKhu);                                       // 11c
            }
        }
        kt.NemNeuCoLoi();

        var soMoi = (int)soThucTe;
        if (soMoi == lo.SoLuongTon && hsdMoi == lo.HanSuDung)
            throw LoiNghiepVuException.KhongHopLe("Không có thông tin thay đổi");

        // BR06: chênh lệch tính theo tồn hệ thống tại thời điểm xác nhận (PhienBan bảo vệ tranh chấp).
        db.PhieuDieuChinhTon.Add(new PhieuDieuChinhTon
        {
            NgayGio = dongHo.BayGio,
            MaLo = lo.MaLo,
            MaHH = lo.MaHH,
            SoLuongHeThong = lo.SoLuongTon,
            SoLuongThucTe = soMoi,
            HanSuDungCu = lo.HanSuDung,
            HanSuDungMoi = hsdMoi,
            LyDo = yc.LyDo!.Trim(),
            MaCQ = hienTai.MaND!,
        });
        lo.SoLuongTon = soMoi;
        lo.HanSuDung = hsdMoi;

        await canhBao.DongCanhBaoHangKhiDuHangAsync(lo, lo.HangHoa, ct);
        await canhBao.DanhGiaLoAsync(lo, lo.HangHoa, xetHang: true, xetHan: true, capNhatNeuDaCo: true, ct);
        await db.SaveChangesAsync(ct);
    }

    /// <summary>UC_3.3 BR05: (khóa sửa HSD, khóa toàn bộ) theo cảnh báo hạn đang mở của lô.</summary>
    private async Task<(bool KhoaHan, bool KhoaToanBo)> KhoaTheoCanhBaoAsync(string maLo, CancellationToken ct)
    {
        var loai = await db.CanhBaoTonKho.AsNoTracking()
            .Where(c => c.MaLo == maLo && c.TrangThai == TrangThaiCanhBao.ChuaXuLy)
            .Select(c => c.LoaiCanhBao).ToListAsync(ct);
        return (loai.Any(LoaiCanhBao.LaCanhBaoHan), loai.Contains(LoaiCanhBao.HetHan));
    }

    // ================================================================ UC_10.1 Thêm lô hàng

    public async Task<KetQuaTrang<LoHangDong>> DanhSachLoAsync(int trang, CancellationToken ct)
    {
        var soDong = await thamSo.LaySoAsync(KhoaCauHinh.SoDongMoiTrang, ct);
        return await PhanTrang.LayTrangAsync(
            db.LoHang.AsNoTracking().OrderByDescending(l => l.NgayNhap).ThenByDescending(l => l.MaLo)
              .Select(l => new LoHangDong(l.MaLo, l.HangHoa.TenHH, l.SoLuongTon, l.HanSuDung)),
            trang, soDong, ct);
    }

    public Task<string> MaLoDuKienAsync(CancellationToken ct) => sinhMa.XemTruocAsync(LoaiMa.LoHang, ct);

    public async Task<string> ThemLoAsync(YeuCauThemLo yc, CancellationToken ct)
    {
        const string KhongTrong = "Không được để trống!";
        await dichVuCa.KiemTraKhongDangKetCaAsync(ct); // UC_9.1 BR07
        var kt = new BoKiemTra();
        // 5a – BR01
        kt.Kiem("tenHangHoa", !QuyTac.Trong(yc.TenHangHoa), KhongTrong)
          .Kiem("soLuong", !QuyTac.Trong(yc.SoLuong), KhongTrong)
          .Kiem("hanSuDung", !QuyTac.Trong(yc.HanSuDung), KhongTrong);

        // 5b – BR03, BR07: trùng khớp hoàn toàn (không phân biệt hoa thường) với hàng đang kinh doanh.
        HangHoa? hh = null;
        if (!kt.CoLoiTai("tenHangHoa"))
        {
            var ten = QuyTac.ChuanHoa(yc.TenHangHoa!).ToLowerInvariant();
            hh = await db.HangHoa.FirstOrDefaultAsync(
                h => h.TenHH.ToLower() == ten && h.TrangThai == TrangThaiHangHoa.DangKinhDoanh, ct);
            kt.Kiem("tenHangHoa", hh is not null, "Vui lòng chọn hàng hóa đang kinh doanh có tên trùng khớp.");
        }
        // 5c – BR02
        var docSo = QuyTac.DocSoNguyen(yc.SoLuong, out var soLuong);
        kt.Kiem("soLuong", docSo && soLuong > 0 && soLuong <= int.MaxValue, "Số lượng không hợp lệ!");
        // 5d – BR04
        var docNgay = QuyTac.DocNgay(yc.HanSuDung, out var hsd);
        kt.Kiem("hanSuDung", docNgay, "Hạn sử dụng không hợp lệ!")
          .Kiem("hanSuDung", !docNgay || hsd >= dongHo.HomNay, HsdQuaKhu);
        kt.NemNeuCoLoi();

        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var lo = new LoHang
        {
            MaLo = await sinhMa.SinhMaAsync(LoaiMa.LoHang, ct), // BR08: mã chỉ chốt khi lưu
            MaHH = hh!.MaHH,
            SoLuongTon = (int)soLuong,
            HanSuDung = hsd,
            NgayNhap = dongHo.BayGio,
        };
        db.LoHang.Add(lo);

        // Bước 8–9: đóng cảnh báo của các lô cũ, rồi đánh giá cảnh báo cho lô mới.
        await canhBao.DongKhiNhapLoMoiAsync(lo, ct);
        await canhBao.DanhGiaLoAsync(lo, hh, xetHang: true, xetHan: true, capNhatNeuDaCo: true, ct);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return lo.MaLo;
    }
}
