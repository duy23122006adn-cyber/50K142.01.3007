using System.Globalization;
using Microsoft.EntityFrameworkCore;
using XomNho.Api.Data;
using XomNho.Api.Domain;

namespace XomNho.Api.Common;

/// <summary>Đọc tham số từ bảng CauHinh; nếu thiếu thì dùng giá trị mặc định theo báo cáo.</summary>
public interface IThamSoHeThong
{
    Task<int> LaySoAsync(string khoa, CancellationToken ct = default);
}

public sealed class ThamSoHeThong(XomNhoDbContext db) : IThamSoHeThong
{
    /// <summary>Giá trị mặc định – cũng là dữ liệu nạp sẵn vào bảng CauHinh.</summary>
    public static readonly IReadOnlyDictionary<string, (string GiaTri, string MoTa)> MacDinh =
        new Dictionary<string, (string, string)>
        {
            [KhoaCauHinh.TenCuaHang] = ("Tạp hóa Xóm Nhỏ", "Tên cửa hàng in trên hóa đơn (UC_6.5 BR05)"),
            [KhoaCauHinh.HanMucNo] = ("1000000", "Hạn mức nợ tối đa, VNĐ (UC_7.1 BR02)"),
            [KhoaCauHinh.SoNgayNo] = ("30", "Thời hạn thanh toán hóa đơn nợ, ngày (UC_7.1 BR03)"),
            [KhoaCauHinh.SoNgaySapHetHanNo] = ("23", "Từ ngày thứ này khoản nợ là Sắp hết hạn (UC_7.2 BR03)"),
            [KhoaCauHinh.SoNgayDoiTra] = ("7", "Thời hạn đổi trả, ngày (UC_6.2 BR01)"),
            [KhoaCauHinh.SoLanSaiToiDa] = ("10", "Số lần đăng nhập sai liên tiếp thì khóa tạm (UC_1 BR02)"),
            [KhoaCauHinh.ThoiHanOtpPhut] = ("5", "Thời hạn mã OTP mở khóa, phút (UC_1 BR03)"),
            [KhoaCauHinh.SoDongMoiTrang] = ("20", "Số dòng mỗi trang (UC_3.1, UC_4.4)"),
            [KhoaCauHinh.SoLanSaiDoiMatKhau] = ("5", "Số lần sai mật khẩu hiện tại thì khóa đổi mật khẩu (màn hình 2.4.9)"),
            [KhoaCauHinh.PhutKhoaDoiMatKhau] = ("15", "Thời gian khóa chức năng đổi mật khẩu, phút (màn hình 2.4.9)"),
        };

    public async Task<int> LaySoAsync(string khoa, CancellationToken ct = default)
    {
        var giaTri = await db.CauHinh.AsNoTracking()
            .Where(c => c.MaCauHinh == khoa)
            .Select(c => c.GiaTri)
            .FirstOrDefaultAsync(ct)
            ?? MacDinh[khoa].GiaTri;
        return int.Parse(giaTri, CultureInfo.InvariantCulture);
    }
}
