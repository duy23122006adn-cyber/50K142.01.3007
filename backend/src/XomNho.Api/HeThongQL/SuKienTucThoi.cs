using System.Data.Common;
using System.Runtime.CompilerServices;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using XomNho.Api.Common;
using XomNho.Api.Domain;

namespace XomNho.Api.HeThongQL;

/// <summary>
/// Đồng bộ thời gian thực giữa máy tại quầy và điện thoại Chủ quán (phần tích hợp "Đồng bộ với thiết bị di động").
/// Mọi máy đang mở web nhận sự kiện:
/// <list type="bullet">
/// <item>"duLieu" (danh sách nhóm dữ liệu vừa thay đổi) → giao diện tải lại các màn hình liên quan;</item>
/// <item>"thongBao" → chỉ người nhận thông báo mới (chuông trên thanh tiêu đề).</item>
/// </list>
/// Sự kiện chỉ báo "có thay đổi", không mang dữ liệu nghiệp vụ; mỗi máy tự gọi lại API theo quyền của mình.
/// </summary>
[Authorize]
public sealed class SuKienHub : Hub
{
    public const string DuongDan = "/api/hub/su-kien";
    public static string NhomNguoiDung(string maND) => $"nd:{maND}";

    public override async Task OnConnectedAsync()
    {
        if (Context.User?.FindFirst(TenClaim.MaND)?.Value is { } maND)
            await Groups.AddToGroupAsync(Context.ConnectionId, NhomNguoiDung(maND));
        await base.OnConnectedAsync();
    }
}

/// <summary>Nhóm dữ liệu theo bảng. Bảng không có trong danh sách (nhật ký, phiên đăng nhập, bộ đếm mã…) không phát sự kiện.</summary>
public static class NhomDuLieu
{
    public const string Ca = "ca";
    public const string Kho = "kho";
    public const string CanhBao = "canh-bao";
    public const string HoaDon = "hoa-don";
    public const string DoiTra = "doi-tra";
    public const string Khach = "khach";
    public const string KetCa = "ket-ca";
    /// <summary>Tiền vào tài khoản (webhook) – màn hình QR kiểm tra ngay thay vì chờ lần hỏi kế tiếp.</summary>
    public const string NganHang = "ngan-hang";

    private static readonly Dictionary<Type, string> TheoBang = new()
    {
        [typeof(CaLamViec)] = Ca,
        [typeof(HangHoa)] = Kho,
        [typeof(LoHang)] = Kho,
        [typeof(PhieuDieuChinhTon)] = Kho,
        [typeof(CanhBaoTonKho)] = CanhBao,
        [typeof(HoaDon)] = HoaDon,
        [typeof(HoaDonThanhToanNgay)] = HoaDon,
        [typeof(ChiTietHoaDon)] = HoaDon,
        [typeof(PhieuThanhToan)] = HoaDon,
        [typeof(NhatKyHuy)] = HoaDon,
        [typeof(GiaoDichNganHang)] = NganHang,
        [typeof(PhieuDoiTra)] = DoiTra,
        [typeof(ChiTietDoiTra)] = DoiTra,
        [typeof(KhachHang)] = Khach,
        [typeof(KhachQuen)] = Khach,
        [typeof(HoaDonNo)] = Khach,
        [typeof(PhanBoThanhToan)] = Khach,
        [typeof(BienBanKetCa)] = KetCa,
        [typeof(ChiTietBienBan)] = KetCa,
    };

    public static string? Cua(Type bang) => TheoBang.GetValueOrDefault(bang);
}

/// <summary>Nơi phát sự kiện – tách giao diện để kiểm thử không cần SignalR.</summary>
public interface IKenhSuKien
{
    void Gui(IReadOnlyCollection<string> nhomDuLieu, IReadOnlyCollection<string> nguoiNhanThongBao);
}

public sealed class KenhSuKienSignalR(IHubContext<SuKienHub> hub, ILogger<KenhSuKienSignalR> log) : IKenhSuKien
{
    /// <summary>Không chờ gửi xong – yêu cầu nghiệp vụ không bị chậm vì mạng của các máy khác.</summary>
    public void Gui(IReadOnlyCollection<string> nhomDuLieu, IReadOnlyCollection<string> nguoiNhanThongBao) =>
        _ = Task.Run(async () =>
        {
            try
            {
                if (nhomDuLieu.Count > 0) await hub.Clients.All.SendAsync("duLieu", nhomDuLieu);
                foreach (var maND in nguoiNhanThongBao) await hub.Clients.Group(SuKienHub.NhomNguoiDung(maND)).SendAsync("thongBao");
            }
            catch (Exception ex)
            {
                log.LogWarning(ex, "Không phát được sự kiện thời gian thực.");
            }
        });
}

/// <summary>
/// Gom thay đổi của từng DbContext: ghi lại lúc SaveChanges, phát khi đã chắc chắn lưu vào CSDL –
/// ngay sau SaveChanges nếu không có giao dịch, hoặc sau khi giao dịch commit (máy khác tải lại sẽ thấy dữ liệu mới).
/// </summary>
public sealed class GomSuKien(IKenhSuKien kenh)
{
    private sealed class ChoGui
    {
        public HashSet<string> Nhom { get; } = [];
        public HashSet<string> NguoiNhan { get; } = [];
    }

    private readonly ConditionalWeakTable<DbContext, ChoGui> _cho = new();

    public void Ghi(DbContext ctx)
    {
        var cho = _cho.GetOrCreateValue(ctx);
        lock (cho)
            foreach (var e in ctx.ChangeTracker.Entries())
            {
                if (e.State is not (EntityState.Added or EntityState.Modified or EntityState.Deleted)) continue;
                if (NhomDuLieu.Cua(e.Metadata.ClrType) is { } nhom) cho.Nhom.Add(nhom);
                if (e is { State: EntityState.Added, Entity: ThongBao tb }) cho.NguoiNhan.Add(tb.MaND);
            }
    }

    public void Gui(DbContext ctx)
    {
        if (!_cho.TryGetValue(ctx, out var cho)) return;
        _cho.Remove(ctx);
        lock (cho)
            if (cho.Nhom.Count > 0 || cho.NguoiNhan.Count > 0)
                kenh.Gui([.. cho.Nhom], [.. cho.NguoiNhan]);
    }

    public void Bo(DbContext ctx) => _cho.Remove(ctx);
}

public sealed class GomSuKienKhiLuu(GomSuKien gom) : SaveChangesInterceptor
{
    public override InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
    {
        if (eventData.Context is { } ctx) gom.Ghi(ctx);
        return result;
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
    {
        if (eventData.Context is { } ctx) gom.Ghi(ctx);
        return ValueTask.FromResult(result);
    }

    public override int SavedChanges(SaveChangesCompletedEventData eventData, int result)
    {
        GuiNeuKhongCoGiaoDich(eventData.Context);
        return result;
    }

    public override ValueTask<int> SavedChangesAsync(SaveChangesCompletedEventData eventData, int result, CancellationToken cancellationToken = default)
    {
        GuiNeuKhongCoGiaoDich(eventData.Context);
        return ValueTask.FromResult(result);
    }

    public override void SaveChangesFailed(DbContextErrorEventData eventData) => BoNeuKhongCoGiaoDich(eventData.Context);

    public override Task SaveChangesFailedAsync(DbContextErrorEventData eventData, CancellationToken cancellationToken = default)
    {
        BoNeuKhongCoGiaoDich(eventData.Context);
        return Task.CompletedTask;
    }

    private void GuiNeuKhongCoGiaoDich(DbContext? ctx)
    {
        if (ctx is not null && ctx.Database.CurrentTransaction is null) gom.Gui(ctx);
    }

    private void BoNeuKhongCoGiaoDich(DbContext? ctx)
    {
        if (ctx is not null && ctx.Database.CurrentTransaction is null) gom.Bo(ctx);
    }
}

public sealed class GomSuKienGiaoDich(GomSuKien gom) : DbTransactionInterceptor
{
    public override void TransactionCommitted(DbTransaction transaction, TransactionEndEventData eventData)
    {
        if (eventData.Context is { } ctx) gom.Gui(ctx);
    }

    public override Task TransactionCommittedAsync(DbTransaction transaction, TransactionEndEventData eventData, CancellationToken cancellationToken = default)
    {
        if (eventData.Context is { } ctx) gom.Gui(ctx);
        return Task.CompletedTask;
    }

    public override void TransactionRolledBack(DbTransaction transaction, TransactionEndEventData eventData)
    {
        if (eventData.Context is { } ctx) gom.Bo(ctx);
    }

    public override Task TransactionRolledBackAsync(DbTransaction transaction, TransactionEndEventData eventData, CancellationToken cancellationToken = default)
    {
        if (eventData.Context is { } ctx) gom.Bo(ctx);
        return Task.CompletedTask;
    }
}
