# Hướng dẫn cài đặt MikroTik Manager Enterprise trên Windows

## 1. Yêu cầu hệ thống

- Windows 10 22H2 (build 19045 trở lên) hoặc Windows 11 x64.
- Tối thiểu 2 GB dung lượng trống trên ổ cài Windows.
- Quyền Administrator để đăng ký Windows Service.
- Cổng TCP `3000` chưa được ứng dụng khác sử dụng.

Bản Windows Desktop dùng SQLite nhúng. Node.js runtime, Prisma SQLite engine và Windows Service
wrapper đã nằm trong bộ cài, vì vậy không cần cài Docker, PostgreSQL, Redis, Node.js hay pnpm.

## 2. Kiểm tra checksum trước khi cài

Đặt file EXE và file `.sha256` trong cùng một thư mục, mở PowerShell rồi chạy:

```powershell
$installer = Get-ChildItem '.\MikroTik-Manager-Enterprise-Setup-*-x64.exe' | Select-Object -First 1
$expected = (Get-Content "$($installer.FullName).sha256").Split(' ')[0].Trim()
$actual = (Get-FileHash $installer.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actual -ne $expected) { throw 'Checksum không khớp. Không được chạy bộ cài.' }
'Checksum hợp lệ.'
```

## 3. Cài đặt

1. Nhấp phải file `MikroTik-Manager-Enterprise-Setup-<phiên-bản>-x64.exe`.
2. Chọn **Run as administrator**.
3. Giữ đường dẫn mặc định `%ProgramFiles%\MikroTik Manager Enterprise` trên ổ cài Windows
   (thông thường là `C:\Program Files\MikroTik Manager Enterprise`).
4. Chờ bộ cài khởi tạo SQLite và Windows Service `MME`.
5. Mở shortcut **MikroTik Manager Enterprise** trên Desktop.

Dashboard chạy tại `http://localhost:3000`. Thông tin đăng nhập ban đầu được ghi vào file
`MME-Thong-Tin-Dang-Nhap.txt` trên Desktop. Hãy đổi mật khẩu ngay sau lần đăng nhập đầu tiên.

## 4. Vị trí dữ liệu

| Nội dung      | Đường dẫn                                                  |
| ------------- | ---------------------------------------------------------- |
| Chương trình  | `%ProgramFiles%\MikroTik Manager Enterprise`               |
| Cơ sở dữ liệu | `%ProgramData%\MikroTik Manager Enterprise\data\mme.db`    |
| Cấu hình      | `%ProgramData%\MikroTik Manager Enterprise\config\mme.env` |
| Bản sao lưu   | `%ProgramData%\MikroTik Manager Enterprise\backups`        |
| Nhật ký       | `%ProgramData%\MikroTik Manager Enterprise\logs`           |

Dữ liệu được tách khỏi thư mục chương trình để nâng cấp hoặc gỡ ứng dụng không làm mất database.

## 5. Kiểm tra sau cài đặt

Mở PowerShell bằng quyền Administrator:

```powershell
Get-Service MME
Invoke-RestMethod http://127.0.0.1:3000/ready
Test-Path 'C:\ProgramData\MikroTik Manager Enterprise\data\mme.db'
```

Kết quả mong đợi: Service có trạng thái `Running`, API trả về `status: ready`, database tồn tại.

## 6. Cài đặt im lặng

```powershell
Start-Process '.\MikroTik-Manager-Enterprise-Setup-4.1.1-x64.exe' `
  -ArgumentList '/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART','/SP-' `
  -Wait
```

## 7. Sao lưu và nâng cấp

- Dùng shortcut **Backup Data** trong Start Menu trước khi bảo trì.
- Chạy bộ cài phiên bản mới bằng quyền Administrator để nâng cấp tại chỗ.
- Bộ cài tự dừng Service và tạo bản sao lưu trước khi nâng cấp database.
- Nếu quá trình khởi tạo thất bại, database trước nâng cấp được rollback tự động.

## 8. Gỡ cài đặt

Gỡ ứng dụng tại **Settings → Apps → Installed apps → MikroTik Manager Enterprise**. Windows
Service và chương trình sẽ bị xóa, nhưng dữ liệu trong `%ProgramData%\MikroTik Manager Enterprise`
được giữ lại để tránh mất dữ liệu ngoài ý muốn.

## 9. Xử lý sự cố

Kiểm tra theo thứ tự:

```powershell
Get-Service MME
Get-Content 'C:\ProgramData\MikroTik Manager Enterprise\logs\bootstrap.log' -Tail 200
Get-ChildItem 'C:\ProgramData\MikroTik Manager Enterprise\logs'
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
```

Nếu cổng `3000` đang bị ứng dụng khác chiếm dụng, hãy dừng ứng dụng đó rồi dùng shortcut
**Start MME**. Không đăng công khai file `mme.env`, database hoặc thông tin đăng nhập vì chúng chứa
dữ liệu nhạy cảm.

Để mở nhanh thư mục dữ liệu, dùng shortcut **Open Data Folder** trong Start Menu hoặc chạy:

```powershell
explorer.exe "$env:ProgramData\MikroTik Manager Enterprise"
```

Nếu RouterOS Live Probe báo timeout, kiểm tra từ chính máy Windows đang cài MME:

```powershell
Test-NetConnection 10.0.0.2 -Port 1890
```

Trên MikroTik, xác nhận dịch vụ API, port và dải địa chỉ được phép:

```routeros
/ip/service/print detail where name=api
/ip/service/print detail where name=api-ssl
```

Chỉ bật **Use API-SSL** khi kết nối tới dịch vụ `api-ssl`; dịch vụ `api` thông thường phải bỏ chọn.
