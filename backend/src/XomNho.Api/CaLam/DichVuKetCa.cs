using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using XomNho.Api.Common;
using XomNho.Api.Data;
using XomNho.Api.Domain;
using XomNho.Api.TonKho;

namespace XomNho.Api.CaLam;

// ------------------------------------------------------------------ DTO

public sealed record DongKiemKe(
    string MaHH, string TenHH, string DonViTinh, int SoLuongLyThuyet, int SoLuongThucTe, int ChenhLech, string? NguyenNhan);

/// <summary>Màn hình 9.1.1–9.1.3 – biên bản kết ca của ca hiện tại (đang kiểm kê hoặc vừa lưu).</summary>
public sealed record BienBanDto(
    string? MaBB, string MaCa, DateOnly NgayLamViec, TimeOnly GioBatDau, TimeOnly? GioKetThuc,
    string MaNguoiKetCa, string NguoiKetCa, string TrangThaiCa, bool CoChenhLech, IReadOnlyList<DongKiemKe> Dong);

public sealed record DongNhapKiemKe(string? MaHH, int SoLuongThucTe, string? NguyenNhan);
public sealed record YeuCauLuuBienBan(string? MaCa, IReadOnlyList<DongNhapKiemKe>? Dong);
public sealed record YeuCauMaCa(string? MaCa);

public sealed record BienBanDong(string MaBB, DateOnly NgayLamViec, string MaCa, string MaNguoiKetCa, string NguoiKetCa, bool CoChenhLech);

/// <summary>
/// UC_9.1 Lưu biên bản, UC_9.2 Xem biên bản. Bắt đầu kết ca → ca "Đang kết ca" (khóa giao dịch toàn quán, Q11)
/// → kiểm kê → lưu biên bản + cập nhật tồn + kết thúc ca trong một giao dịch (BR04). Không hiển thị tiền (UC_9.2 BR04).
/// </summary>
public sealed class DichVuKetCa(
    XomNhoDbContext db,
    ISinhMa sinhMa,
    IDongHo dongHo,
    INguoiDungHienTai hienTai,
    DichVuCanhBao canhBao)
{
    public const string CaDaKetThuc = "Ca này đã được kết thúc, không thể lưu thêm biên bản";
    public const string LuuThatBai = "Lưu biên bản thất bại, vui lòng thử lại";
    public const string ThieuNguyenNhan = "Vui lòng nhập nguyên nhân chênh lệch";

    // ================================================================ UC_9.1

    /// <summary>Ca chưa kết thúc của cửa hàng; nếu đang kết ca thì kèm bảng kiểm kê (bước 1–2).</summary>
    public async Task<BienBanDto?> HienTaiAsync(CancellationToken ct)
    {
        var ca = await db.CaLamViec.AsNoTracking().FirstOrDefaultAsync(c => c.TrangThai != TrangThaiCa.DaKetThuc, ct);
        if (ca is null) return null;
        var dong = ca.TrangThai == TrangThaiCa.DangKetCa ? await BangLyThuyetAsync(ct) : [];
        var nd = await NguoiKetCaAsync(ct);
        return new BienBanDto(null, ca.MaCa, ca.NgayLamViec, ca.GioBatDau, null, nd.MaND, nd.HoTen, ca.TrangThai, false, dong);
    }

    private async Task<NguoiDung> NguoiKetCaAsync(CancellationToken ct) =>
        await db.NguoiDung.AsNoTracking().FirstAsync(n => n.MaND == hienTai.MaND, ct);

    /// <summary>
    /// BR08: tồn lý thuyết = tồn đầu ca + nhập − xuất/bán/hủy trong ca = tổng tồn hệ thống của mặt hàng
    /// (mọi biến động đều đã ghi theo lô). Gồm hàng đã từng có lô: đang kinh doanh, hoặc ngừng kinh doanh nhưng còn tồn.
    /// </summary>
    private async Task<List<DongKiemKe>> BangLyThuyetAsync(CancellationToken ct) =>
        (await db.HangHoa.AsNoTracking()
            .Where(h => h.LoHang.Any() && (h.TrangThai == TrangThaiHangHoa.DangKinhDoanh || h.LoHang.Sum(l => l.SoLuongTon) > 0))
            .OrderBy(h => h.MaHH)
            .Select(h => new { h.MaHH, h.TenHH, h.DonViTinh, Ton = h.LoHang.Sum(l => l.SoLuongTon) })
            .ToListAsync(ct))
        .Select(h => new DongKiemKe(h.MaHH, h.TenHH, h.DonViTinh, h.Ton, h.Ton, 0, null)).ToList();

    /// <summary>Người dùng chọn "Kết ca": ca chuyển sang "Đang kết ca" (BR07 – khóa giao dịch toàn quán).</summary>
    public async Task<BienBanDto> BatDauAsync(YeuCauMaCa yc, CancellationToken ct)
    {
        var ca = await LayCaAsync(yc.MaCa, ct);
        if (ca.TrangThai == TrangThaiCa.DaKetThuc) throw new LoiNghiepVuException(StatusCodes.Status409Conflict, CaDaKetThuc);
        if (ca.TrangThai == TrangThaiCa.DangHoatDong)
        {
            ca.TrangThai = TrangThaiCa.DangKetCa;
            await LuuCaAsync(ct);
        }
        return (await HienTaiAsync(ct))!;
    }

    /// <summary>6a: Hủy – không lưu biên bản, tồn kho giữ nguyên, ca quay về "Đang hoạt động".</summary>
    public async Task HuyAsync(YeuCauMaCa yc, CancellationToken ct)
    {
        var ca = await LayCaAsync(yc.MaCa, ct);
        if (ca.TrangThai == TrangThaiCa.DaKetThuc) throw new LoiNghiepVuException(StatusCodes.Status409Conflict, CaDaKetThuc);
        if (ca.TrangThai != TrangThaiCa.DangKetCa) return;
        ca.TrangThai = TrangThaiCa.DangHoatDong;
        await LuuCaAsync(ct);
    }

    private async Task<CaLamViec> LayCaAsync(string? maCa, CancellationToken ct) =>
        await db.CaLamViec.FirstOrDefaultAsync(c => c.MaCa == maCa, ct)
        ?? throw new LoiNghiepVuException(StatusCodes.Status404NotFound, "Không tìm thấy ca làm việc.");

    private async Task LuuCaAsync(CancellationToken ct)
    {
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            db.ChangeTracker.Clear();
            throw new LoiNghiepVuException(StatusCodes.Status409Conflict, "Ca vừa được người khác cập nhật. Vui lòng tải lại.");
        }
    }

    /// <summary>Bước 6–11.</summary>
    public async Task<BienBanDto> LuuAsync(YeuCauLuuBienBan yc, CancellationToken ct)
    {
        var maND = hienTai.MaND!;
        try
        {
            await using var tx = await db.MoGiaoDichTuanTuAsync(ct);
            var ca = await LayCaAsync(yc.MaCa, ct);
            // 8a: ca đã có biên bản do người khác lưu trước.
            if (ca.TrangThai == TrangThaiCa.DaKetThuc || await db.BienBanKetCa.AnyAsync(b => b.MaCa == ca.MaCa, ct))
                throw new LoiNghiepVuException(StatusCodes.Status409Conflict, CaDaKetThuc);
            if (ca.TrangThai != TrangThaiCa.DangKetCa)
                throw new LoiNghiepVuException(StatusCodes.Status409Conflict, "Ca chưa ở trạng thái “Đang kết ca”. Vui lòng chọn Kết ca trước khi lưu biên bản.");

            // Bước 3–7: đối chiếu, kiểm tra nguyên nhân (BR02, BR06).
            var nhap = (yc.Dong ?? []).Where(d => !QuyTac.Trong(d.MaHH))
                .GroupBy(d => d.MaHH!.Trim()).ToDictionary(g => g.Key, g => g.Last());
            var lyThuyet = await BangLyThuyetAsync(ct);
            var kt = new BoKiemTra();
            var dong = new List<DongKiemKe>();
            foreach (var l in lyThuyet)
            {
                var n = nhap.GetValueOrDefault(l.MaHH);
                var thucTe = n?.SoLuongThucTe ?? l.SoLuongLyThuyet; // không nhập = khớp lý thuyết
                if (thucTe < 0) { kt.Kiem($"thucTe.{l.MaHH}", false, "Tồn thực tế phải là số nguyên không âm."); continue; }
                var chenh = thucTe - l.SoLuongLyThuyet;
                string? nguyenNhan = null;
                if (chenh != 0)
                {
                    nguyenNhan = QuyTac.ChuanHoa(n?.NguyenNhan ?? "");
                    kt.Kiem($"nguyenNhan.{l.MaHH}", nguyenNhan.Length > 0, ThieuNguyenNhan);
                    kt.Kiem($"nguyenNhan.{l.MaHH}", nguyenNhan.Length <= 255, "Nguyên nhân tối đa 255 ký tự.");
                }
                dong.Add(l with { SoLuongThucTe = thucTe, ChenhLech = chenh, NguyenNhan = nguyenNhan });
            }
            kt.NemNeuCoLoi(ThieuNguyenNhan); // 7a

            // Bước 8: sinh mã, lưu biên bản (BR05, BR09). Giờ kết thúc = thời điểm lưu.
            var bayGio = dongHo.BayGio;
            var bb = new BienBanKetCa
            {
                MaBB = await sinhMa.SinhMaAsync(LoaiMa.BienBan, ct),
                NgayGioLuu = bayGio,
                MaCa = ca.MaCa,
                MaND = maND,
                CoChenhLech = dong.Any(d => d.ChenhLech != 0),
            };
            foreach (var d in dong)
                bb.ChiTiet.Add(new ChiTietBienBan
                {
                    MaHH = d.MaHH, SoLuongLyThuyet = d.SoLuongLyThuyet, SoLuongThucTe = d.SoLuongThucTe, NguyenNhan = d.NguyenNhan,
                });
            db.BienBanKetCa.Add(bb);

            // Bước 9: tồn kho = tồn thực tế, phân vào lô theo Q11 (cũng là tồn đầu ca kế tiếp).
            foreach (var d in dong.Where(d => d.ChenhLech != 0))
                await DieuChinhLoAsync(d.MaHH, d.ChenhLech, ct);

            // Bước 10.
            ca.TrangThai = TrangThaiCa.DaKetThuc;
            ca.GioKetThuc = TimeOnly.FromDateTime(bayGio);
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            return await ChiTietAsync(bb.MaBB, chiDongChenhLech: false, ct);
        }
        catch (LoiNghiepVuException)
        {
            db.ChangeTracker.Clear();
            throw;
        }
        catch (DbUpdateConcurrencyException)
        {
            db.ChangeTracker.Clear();
            throw new LoiNghiepVuException(StatusCodes.Status409Conflict, CaDaKetThuc);
        }
        catch (DbUpdateException ex) when (LoiTrungKhoa.TenChiMuc(ex) == "UX_BienBanKetCa_MaCa")
        {
            db.ChangeTracker.Clear();
            throw new LoiNghiepVuException(StatusCodes.Status409Conflict, CaDaKetThuc); // 8a
        }
        catch (DbUpdateException)
        {
            // 8b, 9a, 10a: không ghi nhận gì, ca vẫn "Đang kết ca".
            db.ChangeTracker.Clear();
            throw new LoiNghiepVuException(StatusCodes.Status500InternalServerError, LuuThatBai);
        }
    }

    /// <summary>Q11: thiếu → trừ dần từ lô có HSD gần nhất; thừa → cộng vào lô có HSD xa nhất.</summary>
    private async Task DieuChinhLoAsync(string maHH, int chenhLech, CancellationToken ct)
    {
        var cacLo = await db.LoHang.Include(l => l.HangHoa).Where(l => l.MaHH == maHH)
            .OrderBy(l => l.HanSuDung).ThenBy(l => l.MaLo).ToListAsync(ct);
        var thayDoi = new List<LoHang>();
        if (chenhLech > 0)
        {
            var lo = cacLo[^1];
            lo.SoLuongTon += chenhLech;
            thayDoi.Add(lo);
        }
        else
        {
            var canTru = -chenhLech;
            foreach (var lo in cacLo.Where(l => l.SoLuongTon > 0))
            {
                if (canTru == 0) break;
                var tru = Math.Min(canTru, lo.SoLuongTon);
                lo.SoLuongTon -= tru;
                canTru -= tru;
                thayDoi.Add(lo);
            }
        }
        foreach (var lo in thayDoi)
        {
            await canhBao.DongCanhBaoHangKhiDuHangAsync(lo, lo.HangHoa, ct);
            await canhBao.DanhGiaLoAsync(lo, lo.HangHoa, xetHang: true, xetHan: true, capNhatNeuDaCo: true, ct);
        }
    }

    // ================================================================ UC_9.2

    /// <summary>BR01, BR03, BR07: lọc theo khoảng ngày làm việc và/hoặc chỉ biên bản có chênh lệch; mới nhất trước.</summary>
    public async Task<List<BienBanDong>> DanhSachAsync(string? tuNgay, string? denNgay, bool chiCoChenhLech, CancellationToken ct)
    {
        var kt = new BoKiemTra();
        DateOnly? tu = null, den = null;
        if (!QuyTac.Trong(tuNgay)) { kt.Kiem("tuNgay", QuyTac.DocNgay(tuNgay, out var d), "Ngày không hợp lệ (dd/mm/yyyy)."); tu = d; }
        if (!QuyTac.Trong(denNgay)) { kt.Kiem("denNgay", QuyTac.DocNgay(denNgay, out var d), "Ngày không hợp lệ (dd/mm/yyyy)."); den = d; }
        if (tu is not null && den is not null && !kt.CoLoi)
            kt.Kiem("tuNgay", tu <= den, "Từ ngày không được lớn hơn đến ngày"); // 3a
        kt.NemNeuCoLoi();

        var q = db.BienBanKetCa.AsNoTracking();
        if (hienTai.VaiTro != VaiTroNguoiDung.ChuQuan) q = q.Where(b => b.MaND == hienTai.MaND); // BR01
        if (tu is not null) q = q.Where(b => b.CaLamViec.NgayLamViec >= tu);
        if (den is not null) q = q.Where(b => b.CaLamViec.NgayLamViec <= den);
        if (chiCoChenhLech) q = q.Where(b => b.CoChenhLech);
        return await q.OrderByDescending(b => b.NgayGioLuu).ThenByDescending(b => b.MaBB).Take(500)
            .Select(b => new BienBanDong(b.MaBB, b.CaLamViec.NgayLamViec, b.MaCa, b.MaND, b.NguoiDung.HoTen, b.CoChenhLech))
            .ToListAsync(ct);
    }

    /// <summary>BR08: chi tiết chỉ gồm dòng chênh lệch ≠ 0. Ngay sau khi lưu (màn hình 9.1.3) trả về đủ các dòng.</summary>
    public async Task<BienBanDto> ChiTietAsync(string? maBB, bool chiDongChenhLech, CancellationToken ct)
    {
        var bb = await db.BienBanKetCa.AsNoTracking().Include(b => b.CaLamViec).Include(b => b.NguoiDung)
            .FirstOrDefaultAsync(b => b.MaBB == maBB, ct)
            ?? throw new LoiNghiepVuException(StatusCodes.Status404NotFound, "Không tìm thấy biên bản kết ca.");
        if (hienTai.VaiTro != VaiTroNguoiDung.ChuQuan && bb.MaND != hienTai.MaND) // 6a
            throw new LoiNghiepVuException(StatusCodes.Status403Forbidden, "Bạn không có quyền xem biên bản này");

        var q = db.ChiTietBienBan.AsNoTracking().Where(c => c.MaBB == bb.MaBB);
        if (chiDongChenhLech) q = q.Where(c => c.SoLuongThucTe != c.SoLuongLyThuyet);
        var dong = await q.OrderBy(c => c.MaHH)
            .Select(c => new DongKiemKe(c.MaHH, c.HangHoa.TenHH, c.HangHoa.DonViTinh, c.SoLuongLyThuyet, c.SoLuongThucTe,
                c.SoLuongThucTe - c.SoLuongLyThuyet, c.NguyenNhan))
            .ToListAsync(ct);
        return new BienBanDto(bb.MaBB, bb.MaCa, bb.CaLamViec.NgayLamViec, bb.CaLamViec.GioBatDau, bb.CaLamViec.GioKetThuc,
            bb.MaND, bb.NguoiDung.HoTen, bb.CaLamViec.TrangThai, bb.CoChenhLech, dong);
    }
}

[ApiController]
[Route("api/ket-ca")]
public sealed class KetCaController(DichVuKetCa dichVu) : ControllerBase
{
    /// <summary>204 nếu cửa hàng chưa có ca đang mở.</summary>
    [HttpGet("hien-tai")]
    public async Task<ActionResult<BienBanDto>> HienTai(CancellationToken ct) =>
        await dichVu.HienTaiAsync(ct) is { } bb ? bb : NoContent();

    [HttpPost("bat-dau")]
    public Task<BienBanDto> BatDau(YeuCauMaCa yc, CancellationToken ct) => dichVu.BatDauAsync(yc, ct);

    [HttpPost("huy")]
    public async Task<NoContentResult> Huy(YeuCauMaCa yc, CancellationToken ct)
    {
        await dichVu.HuyAsync(yc, ct);
        return NoContent();
    }

    [HttpPost("luu")]
    public Task<BienBanDto> Luu(YeuCauLuuBienBan yc, CancellationToken ct) => dichVu.LuuAsync(yc, ct);

    [HttpGet("bien-ban")]
    public Task<List<BienBanDong>> DanhSach([FromQuery] string? tuNgay, [FromQuery] string? denNgay,
        [FromQuery] bool coChenhLech = false, CancellationToken ct = default) =>
        dichVu.DanhSachAsync(tuNgay, denNgay, coChenhLech, ct);

    /// <summary>Mã biên bản không có dấu "/" nhưng giữ cùng kiểu truyền mã qua query string với các màn hình khác.</summary>
    [HttpGet("bien-ban/chi-tiet")]
    public Task<BienBanDto> ChiTiet([FromQuery] string ma, CancellationToken ct) => dichVu.ChiTietAsync(ma, chiDongChenhLech: true, ct);
}
