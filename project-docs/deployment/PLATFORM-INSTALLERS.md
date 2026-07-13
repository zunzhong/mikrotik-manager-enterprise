# Bộ cài đặt Windows và Linux

## Kiến trúc phát hành

MME có hai chế độ:

- **MME Desktop:** ưu tiên Windows, dùng cơ sở dữ liệu SQLite nhúng và không bắt buộc Docker.
- **MME Enterprise Server:** dành cho Linux hoặc máy chủ tập trung, hỗ trợ PostgreSQL và Redis.

Phần Windows native đang được xây dựng theo hướng backend và frontend chạy chung một dịch vụ.
Docker Compose chỉ còn là tùy chọn cho bản Enterprise Server.

## Windows (nền tảng ưu tiên)

Bản phát hành chính thức có tên:

`MikroTik-Manager-Enterprise-Setup-<phiên-bản>-x64.exe`

Yêu cầu:

- Windows 10 22H2 hoặc Windows 11 x64.
- Đã bật phần cứng ảo hóa nếu sử dụng các tính năng cần WSL, nhưng MME Desktop không bắt buộc WSL.
- Tối thiểu 2 GB dung lượng trống.
- Microsoft Edge WebView2 hoặc trình duyệt hiện đại.

Installer thực hiện các việc sau:

1. Kiểm tra hệ điều hành, cổng mạng và dung lượng.
2. Tạo thư mục dữ liệu trong `C:\ProgramData\MikroTik Manager Enterprise`.
3. Tạo khóa JWT, khóa mã hóa và tài khoản quản trị đầu tiên.
4. Khởi tạo hoặc nâng cấp SQLite an toàn.
5. Đăng ký MME dưới dạng Windows Service.
6. Tạo shortcut mở Dashboard, khởi động, dừng và xem trạng thái dịch vụ.
7. Sao lưu dữ liệu trước khi nâng cấp.

Hướng dẫn cài đặt, kiểm tra checksum, sao lưu và xử lý sự cố chi tiết nằm tại
[`HUONG-DAN-CAI-DAT-WINDOWS.md`](./HUONG-DAN-CAI-DAT-WINDOWS.md).

Nếu installer chưa được ký số, Windows SmartScreen có thể cảnh báo. Bản phát hành công khai nên
được ký bằng chứng thư code-signing.

## Linux

Linux cung cấp hai profile:

- `standalone`: SQLite + systemd, phù hợp một máy quản trị.
- `enterprise`: PostgreSQL + Redis, phù hợp nhiều người dùng và dữ liệu lớn.

Gói cài đặt dự kiến:

`mikrotik-manager-enterprise_<phiên-bản>_amd64.deb`

## Quy trình tạo bản phát hành

1. Chạy đầy đủ format, lint, typecheck, test và build.
2. Chạy security audit và không cho phép lỗ hổng mức moderate trở lên.
3. Kiểm tra migration trên bản cài mới và bản nâng cấp.
4. Kiểm tra backup/restore.
5. Tạo EXE trên Windows runner và DEB trên Linux runner.
6. Chạy smoke test bản đã cài trước khi phát hành artifact.
