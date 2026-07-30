# Hướng dẫn Syslog tập trung MME 5.8.0

MME 5.8.0 có bộ nhận Syslog trực tiếp, hoạt động trên cả Windows và Linux. Log được
phân tích, ánh xạ với thiết bị đã quản lý và lưu trong database đang được MME sử dụng.

## 1. Thành phần được hỗ trợ

- Nhận Syslog bằng UDP và TCP.
- Hỗ trợ bản tin RFC 3164, RFC 5424 và TCP framing RFC 6587.
- Nhận log RouterOS và vẫn lưu được bản tin không hoàn toàn đúng chuẩn.
- Tự ánh xạ nguồn theo IP, hostname, identity hoặc alias do quản trị viên khai báo.
- Lọc theo thiết bị, severity, facility, giao thức, thời gian và nội dung.
- Tự làm mới danh sách log mỗi 5 giây; có thể tắt chế độ realtime.
- Giới hạn thời gian lưu và tổng số bản ghi; bản ghi cũ nhất được dọn tự động.
- Cấu hình gửi Syslog hàng loạt cho các thiết bị RouterOS từ giao diện MME.
- Rule firewall được tạo cho UDP/TCP trên mạng Domain/Private (Windows) hoặc subnet
  LAN trực tiếp (UFW trên Linux).

## 2. Mở và kiểm tra bộ nhận

Đăng nhập bằng tài khoản có quyền quản trị, mở **Syslog** trong menu bên trái.

Mặc định:

- Bind address: `0.0.0.0`
- Port: `514`
- UDP: bật
- TCP: bật
- Retention: 30 ngày
- Số bản ghi tối đa: 500.000

Nhấn **Kiểm thử bộ nhận**. MME chỉ báo đạt khi bản tin đã đi qua listener, parser và
được ghi thành công vào database.

Trên Linux có thể kiểm tra thêm:

```bash
sudo mme-control syslog-check
sudo ss -lunp | grep ':514'
sudo ss -ltnp | grep ':514'
sudo ufw status
```

Trên Windows PowerShell (Administrator):

```powershell
Get-NetUDPEndpoint -LocalPort 514
Get-NetTCPConnection -State Listen -LocalPort 514
Get-NetFirewallRule -Group 'MikroTik Manager Enterprise Syslog'
```

## 3. Cấu hình RouterOS từ MME

Trong trang **Syslog**:

1. Nhập IP LAN của máy MME mà router có thể truy cập.
2. Giữ cổng `514` hoặc chọn cổng đã cấu hình cho listener.
3. Chọn topics, mặc định `info,!account,!debug`.
4. Chọn một, nhiều hoặc toàn bộ thiết bị.
5. Nhấn **Cấu hình RouterOS** và xác nhận.

MME tạo/cập nhật action `mme-syslog` và chỉ duy trì một rule tương ứng trên router.
Tài khoản RouterOS cần quyền cho `/system/logging` và `/system/logging/action`.

Có thể kiểm tra trực tiếp trên RouterOS:

```routeros
/system logging action print where name="mme-syslog"
/system logging print where action="mme-syslog"
```

## 4. Cấu hình thủ công

Ví dụ RouterOS gửi UDP tới máy MME `10.0.0.11`:

```routeros
/system logging action add name=mme-syslog target=remote remote=10.0.0.11 remote-port=514 bsd-syslog=yes syslog-facility=local0
/system logging add topics=info,!account,!debug action=mme-syslog
```

Nếu action/rule đã tồn tại, dùng `set` thay vì tạo bản ghi trùng.

## 5. Ánh xạ log chưa nhận dạng

Log không khớp IP/hostname vẫn được lưu nếu **Chấp nhận nguồn chưa ánh xạ** đang bật.
Trong khu vực ánh xạ, nhập hostname/IP/identity xuất hiện trong log và chọn thiết bị
tương ứng. Các bản tin mới sau đó sẽ được gắn vào thiết bị đó.

Không tự gộp hai thiết bị chỉ vì chúng có identity giống nhau. Ưu tiên địa chỉ nguồn
và alias được quản trị viên xác nhận.

## 6. Firewall và bảo mật

- Chỉ cho phép UDP/TCP Syslog từ VLAN hoặc subnet quản trị thiết bị.
- Không mở cổng Syslog trực tiếp ra Internet.
- UDP không có xác nhận truyền; dùng TCP khi đường truyền không ổn định.
- Syslog truyền thống không mã hóa. Khi đi qua WAN, dùng VPN site-to-site/WireGuard.
- Tránh thu thập topics chứa dữ liệu nhạy cảm không cần thiết.

Linux với UFW:

```bash
sudo ufw allow from 10.0.0.0/24 to any port 514 proto udp comment 'MME Syslog UDP'
sudo ufw allow from 10.0.0.0/24 to any port 514 proto tcp comment 'MME Syslog TCP'
```

## 7. Chẩn đoán

Nếu trang không có log:

1. Chạy self-test trên trang Syslog.
2. Kiểm tra listener và firewall bằng các lệnh ở mục 2.
3. Ping IP máy MME từ router.
4. Kiểm tra action/rule RouterOS.
5. Xem log dịch vụ:

```bash
sudo mme-control logs 200
sudo journalctl -u mme.service --no-pager -n 200
```

6. Dùng tcpdump để xác nhận gói đã tới máy MME:

```bash
sudo tcpdump -ni any 'udp port 514 or tcp port 514'
```

Nếu gói đã tới nhưng không thấy trong thiết bị, mở bộ lọc **Chưa ánh xạ** rồi tạo
alias cho source address hoặc hostname.

## 8. Biến môi trường

File Linux: `/etc/mikrotik-manager-enterprise/mme.env`.

File Windows: `C:\ProgramData\MikroTik Manager Enterprise\config\mme.env`.

```dotenv
SYSLOG_ENABLED=true
SYSLOG_UDP_ENABLED=true
SYSLOG_TCP_ENABLED=true
SYSLOG_BIND_ADDRESS=0.0.0.0
SYSLOG_PORT=514
SYSLOG_RETENTION_DAYS=30
SYSLOG_MAX_RECORDS=500000
SYSLOG_ACCEPT_UNMATCHED=true
```

Sau khi sửa thủ công, khởi động lại MME:

```bash
sudo mme-control restart
sudo mme-control syslog-check
```

Windows PowerShell (Administrator):

```powershell
Restart-Service MME
```
