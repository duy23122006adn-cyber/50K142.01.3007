@echo off
chcp 65001 > nul
title Khởi Động Hệ Thống Tạp Hóa Xóm Nhỏ

echo ========================================================
echo   🏪 HỆ THỐNG QUẢN LÝ BÁN HÀNG TẠP HÓA XÓM NHỎ
echo ========================================================
echo.
echo [1/3] Đang khởi động Backend (ASP.NET Core Web API - Port 5103)...
start "Backend - Xóm Nhỏ API" cmd /k "cd /d %~dp0backend && set ASPNETCORE_ENVIRONMENT=Development && dotnet run --project src/XomNho.Api --launch-profile http"

timeout /t 3 > nul

echo [2/3] Đang khởi động Frontend (React Vite - Port 5173)...
start "Frontend - Xóm Nhỏ Web" cmd /k "cd /d %~dp0frontend && npm run dev"

timeout /t 3 > nul

echo [3/3] Đang mở trình duyệt tại http://localhost:5173 ...
start http://localhost:5173

echo.
echo ========================================================
echo   ✅ Hệ thống đã được khởi động thành công!
echo.
echo   - Web giao diện:  http://localhost:5173
echo   - Backend API:    http://localhost:5103/swagger (nếu có)
echo.
echo   Tài khoản đăng nhập mẫu:
echo   + Chủ quán:   chuquan   / ChuQuan2026
echo   + Nhân viên:  nhanvien1 / NhanVien2026
echo ========================================================
echo.
pause
