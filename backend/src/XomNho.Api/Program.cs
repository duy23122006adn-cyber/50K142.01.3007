using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using XomNho.Api.BanHangQL;
using XomNho.Api.CaLam;
using XomNho.Api.Common;
using XomNho.Api.CongNoQL;
using XomNho.Api.KhachHangQL;
using XomNho.Api.Data;
using XomNho.Api.Domain;
using XomNho.Api.HangHoaQL;
using XomNho.Api.NhanVienQL;
using XomNho.Api.TichHop;
using XomNho.Api.TonKho;
using XomNho.Api.XacThuc;

var builder = WebApplication.CreateBuilder(args);

// ------------------------------------------------------------------ Cấu hình
// Thông tin riêng của cửa hàng (tài khoản ngân hàng, khóa dịch vụ…) đặt trong appsettings.{Môi trường}.local.json –
// tệp này bị .gitignore bỏ qua nên không bị đẩy lên GitHub. Biến môi trường vẫn được ưu tiên hơn.
builder.Configuration
    .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.local.json", optional: true, reloadOnChange: true)
    .AddEnvironmentVariables();
builder.Services.Configure<TuyChonJwt>(builder.Configuration.GetSection("Jwt"));
builder.Services.Configure<TuyChonTichHop>(builder.Configuration.GetSection("TichHop"));
builder.Services.Configure<XomNho.Api.HeThongQL.TuyChonSaoLuu>(builder.Configuration.GetSection("SaoLuu"));
var jwt = builder.Configuration.GetSection("Jwt").Get<TuyChonJwt>() ?? new TuyChonJwt();
if (jwt.Key.Length < 32)
    throw new InvalidOperationException("Thiếu cấu hình Jwt:Key (tối thiểu 32 ký tự).");

// ------------------------------------------------------------------ Dữ liệu
builder.Services.AddHttpContextAccessor();
builder.Services.AddSingleton<IDongHo, DongHoVietNam>();
builder.Services.AddScoped<INguoiDungHienTai, NguoiDungHienTai>();
// Giai đoạn 8b: gom thay đổi dữ liệu để phát sự kiện thời gian thực sau khi lưu / commit.
builder.Services.AddSingleton<XomNho.Api.HeThongQL.IKenhSuKien, XomNho.Api.HeThongQL.KenhSuKienSignalR>();
builder.Services.AddSingleton<XomNho.Api.HeThongQL.GomSuKien>();
builder.Services.AddSingleton<XomNho.Api.HeThongQL.GomSuKienKhiLuu>();
builder.Services.AddSingleton<XomNho.Api.HeThongQL.GomSuKienGiaoDich>();
builder.Services.AddDbContext<XomNhoDbContext>((sp, o) => o
    .UseSqlServer(builder.Configuration.GetConnectionString("XomNho"))
    .AddInterceptors(
        sp.GetRequiredService<XomNho.Api.HeThongQL.GomSuKienKhiLuu>(),
        sp.GetRequiredService<XomNho.Api.HeThongQL.GomSuKienGiaoDich>()));
builder.Services.AddScoped<ISinhMa, SinhMaSqlServer>();
builder.Services.AddScoped<IThamSoHeThong, ThamSoHeThong>();

// ------------------------------------------------------------------ Nghiệp vụ (Giai đoạn 2)
builder.Services.AddScoped<IRangBuocNhanVien, RangBuocNhanVien>();
builder.Services.AddScoped<DichVuCa>();
builder.Services.AddScoped<DichVuKhachHang>();
builder.Services.AddScoped<DichVuBanHang>();
builder.Services.AddScoped<DichVuCongNo>();
builder.Services.AddScoped<DichVuHuyHoaDon>();
builder.Services.AddScoped<DichVuKetCa>();
builder.Services.AddScoped<XomNho.Api.DoiTraQL.DichVuDoiTra>();
builder.Services.AddScoped<XomNho.Api.BaoCaoQL.DichVuBaoCao>();
builder.Services.AddScoped<DichVuNhanVien>();
builder.Services.AddScoped<DichVuHangHoa>();
builder.Services.AddScoped<DichVuCanhBao>();
builder.Services.AddScoped<DichVuTonKho>();
builder.Services.AddHostedService<QuetCanhBaoNen>();

// ------------------------------------------------------------------ Giai đoạn 8: sao lưu (Backup NFR-01)
builder.Services.AddScoped<XomNho.Api.HeThongQL.DichVuSaoLuu>();
builder.Services.AddHostedService<XomNho.Api.HeThongQL.SaoLuuNen>();

// ------------------------------------------------------------------ Tích hợp – mặc định giả lập (Q5); Giai đoạn 8d: bật bằng cấu hình
builder.Services.Configure<TuyChonNganHang>(builder.Configuration.GetSection("TichHop:NganHang"));
builder.Services.Configure<TuyChonTinNhan>(builder.Configuration.GetSection("TichHop:TinNhan"));
builder.Services.AddScoped<DichVuQr>();
var tinNhan = builder.Configuration.GetSection("TichHop:TinNhan").Get<TuyChonTinNhan>() ?? new TuyChonTinNhan();
if (tinNhan.LaThat)
{
    builder.Services.AddHttpClient();
    builder.Services.AddSingleton<GuiTinHttp>();
    builder.Services.AddSingleton<IGuiOtp, GuiOtpHttp>();
    builder.Services.AddSingleton<IGuiChungTu, GuiChungTuHttp>();
}
else
{
    builder.Services.AddSingleton<IGuiOtp, GuiOtpGiaLap>();
    builder.Services.AddSingleton<IGuiChungTu, GuiChungTuGiaLap>();
}

// ------------------------------------------------------------------ Xác thực & phân quyền
builder.Services.AddSingleton<DichVuToken>();
builder.Services.AddScoped<DichVuXacThuc>();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.MapInboundClaims = false;
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidIssuer = jwt.Issuer,
            ValidAudience = jwt.Audience,
            IssuerSigningKey = jwt.KhoaKy(),
            NameClaimType = TenClaim.HoTen,
            RoleClaimType = TenClaim.VaiTro,
            ClockSkew = TimeSpan.FromSeconds(30),
        };
        o.Events = new JwtBearerEvents
        {
            // WebSocket của SignalR không gửi được header Authorization → token đi qua query string, chỉ cho đường dẫn hub.
            OnMessageReceived = ctx =>
            {
                if (ctx.Request.Path.StartsWithSegments(XomNho.Api.HeThongQL.SuKienHub.DuongDan)
                    && ctx.Request.Query["access_token"] is { Count: > 0 } token)
                    ctx.Token = token;
                return Task.CompletedTask;
            },
            // Phiên đã đăng xuất / đổi mật khẩu / tài khoản bị khóa → token không còn dùng được.
            OnTokenValidated = async ctx =>
            {
                var sid = ctx.Principal?.FindFirst(TenClaim.MaPhien)?.Value;
                var dv = ctx.HttpContext.RequestServices.GetRequiredService<DichVuXacThuc>();
                if (!Guid.TryParse(sid, out var maPhien) || !await dv.PhienConHieuLucAsync(maPhien))
                    ctx.Fail("Phiên đăng nhập đã hết hiệu lực.");
            },
        };
    });

builder.Services.AddAuthorizationBuilder()
    // Mặc định mọi API đều yêu cầu đăng nhập; API công khai phải ghi [AllowAnonymous].
    .SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build())
    .AddPolicy(ChinhSach.ChiChuQuan, p => p.RequireRole(VaiTroNguoiDung.ChuQuan));

// ------------------------------------------------------------------ API
builder.Services.AddControllers()
    .ConfigureApiBehaviorOptions(o =>
        // JSON sai định dạng → trả lỗi cùng khuôn { thongBao } bằng tiếng Việt thay vì ProblemDetails tiếng Anh.
        o.InvalidModelStateResponseFactory = _ => new Microsoft.AspNetCore.Mvc.BadRequestObjectResult(
            new { thongBao = "Dữ liệu gửi lên không hợp lệ." }));
builder.Services.AddSignalR();
builder.Services.AddExceptionHandler<XuLyLoiToanCuc>();
builder.Services.AddProblemDetails();
builder.Services.AddOpenApi();

var app = builder.Build();

app.UseExceptionHandler();
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi().AllowAnonymous();
}
else
{
    app.UseHttpsRedirection();
}

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<XomNho.Api.HeThongQL.SuKienHub>(XomNho.Api.HeThongQL.SuKienHub.DuongDan);

await KhoiTaoDuLieu.ChayAsync(app.Services);

// Dữ liệu mẫu 30 ngày cho môi trường phát triển / demo: dotnet run -- --du-lieu-mau (chạy xong thì thoát).
if (args.Contains("--du-lieu-mau"))
{
    if (!app.Environment.IsDevelopment())
        throw new InvalidOperationException("Chỉ tạo dữ liệu mẫu ở môi trường Development.");
    await DuLieuMau.ChayAsync(app.Services);
    return;
}

app.Run();

/// <summary>Tên chính sách phân quyền.</summary>
public static class ChinhSach
{
    public const string ChiChuQuan = "ChiChuQuan";
}

/// <summary>Cho phép project test tham chiếu Program.</summary>
public partial class Program;
