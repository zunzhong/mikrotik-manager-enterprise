# Hướng dẫn cài đặt MikroTik Manager Enterprise trên Windows

## 1. Yêu cầu hệ thống

- Windows 10 22H2 (build 19045 trở lên) hoặc Windows 11 x64.
- Tối thiểu 2 GB dung lượng trống trên ổ cài Windows.
- Quyền Administrator để đăng ký Windows Service.
- Cổng TCP đã chọn chưa được ứng dụng khác sử dụng; mặc định frontend/backend dùng chung `3000`.

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
4. Tại bước **Cấu hình cổng MME**, giữ dấu chọn bỏ qua để dùng chung cổng `3000`; hoặc bỏ dấu
   chọn rồi nhập riêng cổng backend/API và frontend/dashboard.
5. Chờ bộ cài khởi tạo SQLite và Windows Service `MME`.
6. Mở shortcut **MikroTik Manager Enterprise** trên Desktop.

Dashboard chạy tại cổng frontend đã chọn. Nếu bỏ qua bước cấu hình, URL là
`http://localhost:3000`. Thông tin đăng nhập ban đầu được ghi vào file
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
Start-Process '.\MikroTik-Manager-Enterprise-Setup-5.5.1-x64.exe' `
  -ArgumentList '/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART','/SP-' `
  -Wait
```

Đặt cổng riêng khi cài im lặng:

```powershell
Start-Process '.\MikroTik-Manager-Enterprise-Setup-5.5.1-x64.exe' `
  -ArgumentList '/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART','/SP-', `
    '/BACKENDPORT=3000','/FRONTENDPORT=8080' `
  -Wait
```

Nếu bỏ hai tham số, cài mới dùng mặc định `3000`. Khi cài đè, bỏ qua tùy chỉnh sẽ giữ cổng đang
cấu hình để không làm gián đoạn URL hiện tại.

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

Chỉ chọn **API-SSL (TLS)** khi kết nối tới dịch vụ `api-ssl`; dịch vụ `api` thông thường phải chọn
**API (TCP)**.

### Test và thêm thiết bị trên web

1. Mở **Devices → RouterOS Live Probe**.
2. Chọn `API (TCP)` hoặc `API-SSL (TLS)` trong ô **Protocol**.
3. Cổng mặc định tự chuyển thành `8728` cho API hoặc `8729` cho API-SSL; vẫn có thể nhập port tùy chỉnh.
4. Nhập host, username, password rồi chọn **Test Connection**.
5. Khi trạng thái là **Online**, nhập tên quản lý và chọn **Add Device**.

Nút **Add Device** chỉ được bật cho đúng bộ thông tin vừa test thành công. Mật khẩu RouterOS được mã hóa
bằng AES-256-GCM trước khi ghi vào database. API-SSL chấp nhận chứng thư tự ký của MikroTik trong mạng
quản trị; nên dùng chứng thư tin cậy khi triển khai qua mạng không tin cậy.

## 10. Sử dụng giao diện quản trị 4.1.4

- **Settings → Thông tin tài khoản** hiển thị tên, email đăng nhập, vai trò và trạng thái mật khẩu.
  Mật khẩu hiện tại không thể hiển thị thành chữ vì MME chỉ lưu bản băm bảo mật; dùng mục
  **Password Security** để thay đổi.
- Dashboard tự đồng bộ trạng thái RouterOS mỗi 30 giây. Thiết bị vượt ngưỡng CPU, RAM, ổ đĩa hoặc
  nhiệt độ được đánh dấu `Warning/Degraded`; sự kiện ghi cả giá trị thực tế và ngưỡng cảnh báo.
- **Thiết bị → Thêm / Xóa thiết bị** dùng để test API/API-SSL, thêm router hoặc xóa
  router. **Thiết bị → Danh sách thiết bị** chỉ hiển thị danh sách; chọn router để mở
  trang chi tiết. Trang chi tiết không lặp lại form thêm hay danh sách router.
- **Ping to Device** chạy ping từ máy Windows cài MME tới địa chỉ quản lý của router.
- **Device Ping To** yêu cầu một IP/DDNS và chạy `/ping` từ chính MikroTik tới đích đó.
- **Create Backup**, **Create Supout** và **Reboot** đều yêu cầu xác nhận; kết quả hiển thị trạng thái,
  thời điểm hoàn tất và thời gian thực hiện.
- **Terminal** có ba chế độ: RouterOS API/API-SSL, REST API JSON và REST Script. API tự
  chuyển menu `/log` thành lệnh print và hỗ trợ tham số có dấu ngoặc kép. REST Script gửi
  nguyên cú pháp CLI, ví dụ `/log print where message~"error"`. Lệnh có khả năng thay
  đổi/xóa dữ liệu vẫn yêu cầu xác nhận.
- Inventory phân cấp theo nhóm có thể thu gọn/mở rộng. Bridge Port hiển thị riêng hai trường
  `Interface` và `Bridge`; MAC được lấy từ `/interface/print` kết hợp `/interface/ethernet/print`.
- Alert đang tồn tại được cập nhật theo cặp `thiết bị + rule`, không tạo bản ghi trùng. Trạng thái
  **Đang kích hoạt** nghĩa là chưa xác nhận, **Đã xác nhận** nghĩa là quản trị viên đã tiếp nhận,
  và **Đã xử lý** nghĩa là sự cố đã được đóng.

## 11. Bật REST API an toàn trên RouterOS

MME khuyến nghị REST qua HTTPS. Trên RouterOS, bật `www-ssl`, gán certificate phù hợp và
giới hạn địa chỉ được phép truy cập trong `/ip service`. Tài khoản router dùng bởi MME cần
policy `rest-api` và các policy chức năng tương ứng (`read`, `write`, `test`, `reboot`...).

Không khuyến nghị bật `www` HTTP vì Basic Auth có thể bị nghe lén. Chỉ dùng HTTP trong
mạng lab cô lập hoặc bên trong tunnel được mã hóa.

MME hỗ trợ các khả năng REST sau ngay trong Terminal:

- Đọc và lọc tài nguyên với `print`, `.proplist` và `.query`.
- Dùng REST CRUD Workbench với GET, POST, PUT, PATCH và DELETE; PUT/PATCH/DELETE/POST yêu cầu
  xác nhận trước khi gửi tới router.
- Gọi lệnh tùy ý qua POST, gồm ping có giới hạn count, monitor `once`, export và OID.
- Chạy cú pháp CLI nguyên bản qua `/rest/execute`.
- Hiển thị JSON trả về, trạng thái thành công/thất bại, thời điểm và thời gian thực thi.
- Chặn bước xác nhận đối với remove, reboot, shutdown, reset, backup, supout và xóa file.

Tài liệu tham chiếu chính thức: <https://manual.mikrotik.com/docs/developer-guides/rest-api/>.

## 12. Traffic Monitor, ngôn ngữ và kênh cảnh báo

- Trong trang chi tiết thiết bị, mở tab **Traffic Monitor**. MME thu thập counter RX/TX của
  toàn bộ Interface theo lịch realtime, tính phần chênh lệch và lưu vào SQLite.
- Có thể lọc một Interface hoặc tất cả, chọn ngày tham chiếu và tổng hợp theo
  **giờ / ngày / tháng / năm**. Biểu đồ và bảng dùng dữ liệu database, không mất khi
  đóng trình duyệt.
- **Snapshot History** đã được gỡ khỏi giao diện. Backend vẫn giữ snapshot Inventory cần
  thiết cho đồng bộ và phát hiện thay đổi; người dùng không còn phải thao tác với lịch sử này.
- Vào **Cài đặt → Ngôn ngữ hệ thống** để chọn Tiếng Việt hoặc English. Lựa chọn
  được lưu trên trình duyệt.
- Vào **Cảnh báo → Kênh gửi cảnh báo** để tạo Email SMTP, Telegram Bot,
  Slack hoặc Webhook. Sau khi lưu, bấm **Gửi kiểm thử** để xác nhận thông tin kết nối.
- Dark Mode và Light Mode dùng hai palette tách biệt; bảng, form, menu, Alerts và thẻ dữ liệu
  kế thừa surface hiện tại, tránh nền trắng xuất hiện trong giao diện tối.
