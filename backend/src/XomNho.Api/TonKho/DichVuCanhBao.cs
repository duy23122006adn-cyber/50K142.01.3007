using Microsoft.EntityFrameworkCore;
using XomNho.Api.Common;
using XomNho.Api.Data;
using XomNho.Api.Domain;

namespace XomNho.Api.TonKho;

/// <summary>
/// Sinh và đóng cảnh báo tồn kho theo lô – UC_3.2 BR01–BR08, Q13, SUA_BAO_CAO mục 3.4.
/// Các hàm chỉ thay đổi dữ liệu trong DbContext; người gọi chịu trách nhiệm SaveChanges.
/// </summary>
public sealed class DichVuCanhBao(XomNhoDbContext db, IDongHo dongHo)
{
    /// <summary>
    /// Đánh giá lại cảnh báo của một lô (BR04: sau mỗi lần tồn kho thay đổi và kiểm tra định kỳ).
    /// <paramref name="capNhatNeuDaCo"/>: BR05 – cảnh báo cùng loại đang "Chưa xử lý" thì cập nhật thay vì tạo mới.
    /// </summary>
    public async Task DanhGiaLoAsync(LoHang lo, HangHoa hh, bool xetHang, bool xetHan, bool capNhatNeuDaCo, CancellationToken ct)
    {
        if (hh.TrangThai != TrangThaiHangHoa.DangKinhDoanh) return; // UC_4.3 BR01

        var bayGio = dongHo.BayGio;
        var cuaLo = await CanhBaoCuaLoAsync(lo.MaLo, ct);

        void Sinh(string loai)
        {
            var dangMo = cuaLo.FirstOrDefault(c => c.LoaiCanhBao == loai && c.TrangThai == TrangThaiCanhBao.ChuaXuLy);
            if (dangMo is not null)
            {
                if (capNhatNeuDaCo) dangMo.ThoiDiemCapNhat = bayGio;
                return;
            }
            var moi = new CanhBaoTonKho
            {
                LoaiCanhBao = loai,
                TrangThai = TrangThaiCanhBao.ChuaXuLy,
                MaLo = lo.MaLo,
                MaHH = lo.MaHH,
                ThoiDiemTao = bayGio,
                ThoiDiemCapNhat = bayGio,
            };
            db.CanhBaoTonKho.Add(moi);
            cuaLo.Add(moi);
        }

        if (xetHang)
        {
            if (lo.SoLuongTon == 0) Sinh(LoaiCanhBao.HetHang);                                    // BR03
            else if (hh.NguongCanhBaoHetHang is int n && lo.SoLuongTon <= n) Sinh(LoaiCanhBao.SapHetHang); // BR01
        }

        // Cảnh báo hạn chỉ có nghĩa khi lô còn hàng (cùng điều kiện "Hết hạn" ở UC_5.4 BR02).
        // BR07: lô đã được đóng cảnh báo hạn do nhập lô mới thì không sinh lại cảnh báo hạn.
        if (xetHan && lo.SoLuongTon > 0
            && !cuaLo.Any(c => LoaiCanhBao.LaCanhBaoHan(c.LoaiCanhBao) && c.TrangThai == TrangThaiCanhBao.DaXuLy))
        {
            var conLai = SoNgayConLai(lo.HanSuDung);                                               // BR08
            if (conLai < 0) Sinh(LoaiCanhBao.HetHan);                                              // BR03: HSD < hôm nay
            else if (hh.NguongCanhBaoHetHan is int m && conLai <= m) Sinh(LoaiCanhBao.SapHetHan);  // BR02
        }
    }

    /// <summary>
    /// UC_10.1 bước 9 + BR06 (SUA_BAO_CAO 3.4): thêm lô mới cho mặt hàng →
    /// đóng cảnh báo hàng của các lô cũ; đóng cảnh báo hạn của lô cũ có HSD sớm hơn lô mới.
    /// </summary>
    public async Task DongKhiNhapLoMoiAsync(LoHang loMoi, CancellationToken ct)
    {
        var bayGio = dongHo.BayGio;
        var dangMo = await db.CanhBaoTonKho.Include(c => c.LoHang)
            .Where(c => c.MaHH == loMoi.MaHH && c.MaLo != loMoi.MaLo && c.TrangThai == TrangThaiCanhBao.ChuaXuLy)
            .ToListAsync(ct);

        foreach (var c in dangMo)
        {
            var dong = LoaiCanhBao.LaCanhBaoHang(c.LoaiCanhBao)
                || (LoaiCanhBao.LaCanhBaoHan(c.LoaiCanhBao) && c.LoHang.HanSuDung < loMoi.HanSuDung);
            if (dong) Dong(c, bayGio);
        }
    }

    /// <summary>BR06 (SUA_BAO_CAO 3.4): điều chỉnh tồn của lô lên lớn hơn ngưỡng → đóng cảnh báo hàng của lô.</summary>
    public async Task DongCanhBaoHangKhiDuHangAsync(LoHang lo, HangHoa hh, CancellationToken ct)
    {
        if (lo.SoLuongTon <= (hh.NguongCanhBaoHetHang ?? 0)) return;
        var bayGio = dongHo.BayGio;
        foreach (var c in await CanhBaoCuaLoAsync(lo.MaLo, ct))
            if (c.TrangThai == TrangThaiCanhBao.ChuaXuLy && LoaiCanhBao.LaCanhBaoHang(c.LoaiCanhBao))
                Dong(c, bayGio);
    }

    /// <summary>BR04: kiểm tra định kỳ mỗi ngày – cảnh báo hạn phụ thuộc ngày hiện tại.</summary>
    public async Task<int> QuetHangNgayAsync(CancellationToken ct)
    {
        var cacLo = await db.LoHang.Include(l => l.HangHoa)
            .Where(l => l.SoLuongTon > 0 && l.HangHoa.TrangThai == TrangThaiHangHoa.DangKinhDoanh)
            .ToListAsync(ct);
        foreach (var lo in cacLo)
            await DanhGiaLoAsync(lo, lo.HangHoa, xetHang: false, xetHan: true, capNhatNeuDaCo: false, ct);
        return await db.SaveChangesAsync(ct);
    }

    /// <summary>Số ngày còn lại = Hạn sử dụng − ngày hiện tại (BR08).</summary>
    public int SoNgayConLai(DateOnly hanSuDung) => hanSuDung.DayNumber - dongHo.HomNay.DayNumber;

    private async Task<List<CanhBaoTonKho>> CanhBaoCuaLoAsync(string maLo, CancellationToken ct)
    {
        await db.CanhBaoTonKho.Where(c => c.MaLo == maLo).LoadAsync(ct);
        return db.CanhBaoTonKho.Local.Where(c => c.MaLo == maLo).ToList();
    }

    private static void Dong(CanhBaoTonKho c, DateTime bayGio)
    {
        c.TrangThai = TrangThaiCanhBao.DaXuLy;
        c.ThoiDiemXuLy = bayGio;
        c.ThoiDiemCapNhat = bayGio;
    }
}

/// <summary>Chạy quét cảnh báo lúc khởi động và mỗi ngày lúc 00:05 (giờ Việt Nam).</summary>
public sealed class QuetCanhBaoNen(IServiceScopeFactory scopeFactory, IDongHo dongHo, ILogger<QuetCanhBaoNen> log) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stop)
    {
        try
        {
            await Task.Delay(TimeSpan.FromSeconds(10), stop);
            while (!stop.IsCancellationRequested)
            {
                try
                {
                    using var scope = scopeFactory.CreateScope();
                    var dv = scope.ServiceProvider.GetRequiredService<DichVuCanhBao>();
                    var soThayDoi = await dv.QuetHangNgayAsync(stop);
                    log.LogInformation("Quét cảnh báo tồn kho hằng ngày: {SoThayDoi} thay đổi.", soThayDoi);
                    // Q23: khách có khoản nợ quá hạn bị khóa quyền mua nợ (và mở lại khi hết quá hạn).
                    var congNo = scope.ServiceProvider.GetRequiredService<CongNoQL.DichVuCongNo>();
                    var soKhach = await congNo.CapNhatQuyenMuaNoAsync(null, stop);
                    log.LogInformation("Cập nhật quyền mua nợ hằng ngày: {SoKhach} khách thay đổi.", soKhach);
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    log.LogWarning(ex, "Không quét được cảnh báo tồn kho (database chưa sẵn sàng?).");
                }

                var bayGio = dongHo.BayGio;
                var lanSau = bayGio.Date.AddDays(1).AddMinutes(5);
                await Task.Delay(lanSau - bayGio, stop);
            }
        }
        catch (OperationCanceledException)
        {
            // Ứng dụng đang tắt.
        }
    }
}
