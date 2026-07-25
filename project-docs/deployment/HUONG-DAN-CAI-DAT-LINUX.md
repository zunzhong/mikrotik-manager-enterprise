# Cài MikroTik Manager Enterprise trên Ubuntu Server bằng CLI

## Phạm vi hỗ trợ

- Ubuntu Server 20.04, 22.04 hoặc 24.04, kiến trúc amd64.
- Máy thật hoặc máy ảo dùng `systemd`, còn tối thiểu 2 GB dung lượng trống.
- Toàn bộ thao tác thực hiện qua terminal/SSH; không có trình cài đặt đồ họa.
- Không cần Docker. Gói Linux phát hành kèm Node.js runtime và hỗ trợ ba nhóm engine:
  SQLite nhúng, PostgreSQL 12 trở lên, hoặc MariaDB 10.3+/MySQL 5.7+.

Gói Linux được build và chạy smoke test trực tiếp trong Ubuntu 20.04. Payload chứa cả Prisma engine OpenSSL 1.1 (Ubuntu 20.04) và OpenSSL 3 (Ubuntu 22.04/24.04).

## File cần tải

Đặt ba file sau trong cùng một thư mục:

```text
mikrotik-manager-enterprise_<phiên-bản>_amd64.deb
mme-ubuntu-install.sh
SHA256SUMS-LINUX.txt
```

## Cài mới 100% CLI

```bash
chmod +x mme-ubuntu-install.sh
sudo ./mme-ubuntu-install.sh install \
  ./mikrotik-manager-enterprise_<phiên-bản>_amd64.deb \
  ./SHA256SUMS-LINUX.txt
```

Script sẽ tự động:

1. Xác nhận đúng Ubuntu 20.04 trở lên và kiến trúc amd64.
2. Xác nhận máy đang dùng systemd.
3. Kiểm tra SHA-256 của gói DEB trước khi thay đổi hệ thống.
4. Cho phép giữ cổng mặc định `3000`, hoặc đặt riêng cổng backend/API và frontend/dashboard.
5. Hỏi có cho phép máy trong LAN truy cập dashboard hay không; mặc định là có khi cài mới.
6. Nếu UFW đang bật, tự mở đúng cổng dashboard cho subnet LAN kết nối trực tiếp.
7. Kiểm tra database hiện có và hiển thị lựa chọn SQLite/PostgreSQL/MariaDB/MySQL.
8. Cài dependency cần thiết, khởi tạo database và tài khoản quản trị.
9. Tạo file `/root/mme-thong-tin-dang-nhap.txt` với quyền `0600`.
10. Bật `mme.service` tự chạy cùng Ubuntu.
11. Chờ `/ready` xác nhận ứng dụng và database hoạt động.

Nếu phát hiện cấu hình database MME đã có, trình cài giữ nguyên khi nâng cấp. Khi cài mới,
trình cài phát hiện SQLite MME, PostgreSQL hoặc MariaDB/MySQL trên máy và hỏi trước khi sử dụng.
Mọi câu hỏi xác nhận trong lúc cài đặt đều hiển thị bằng tiếng Anh để tránh sai khác encoding
trên terminal. Nếu không dùng database đã phát hiện, danh sách hỗ trợ được hiển thị:

1. **SQLite tích hợp:** mặc định, không cài dịch vụ database riêng.
2. **PostgreSQL 12+:** dùng URL PostgreSQL đã cung cấp hoặc cài PostgreSQL bằng `apt`.
3. **MariaDB 10.3+/MySQL 5.7+:** dùng server đã có, dùng URL `mysql://` đã cung cấp, hoặc cài
   MariaDB bằng `apt`.

MME chỉ tạo database và tài khoản riêng của ứng dụng. Nếu database được chọn đã có bảng, trình
cài dừng và yêu cầu xác nhận rõ ràng; chế độ không tương tác chỉ tiếp tục khi có biến cho phép
tương ứng sau khi đã sao lưu.

### Cài không tương tác

SQLite và hai cổng riêng:

```bash
sudo env MME_NONINTERACTIVE=1 \
  MME_BACKEND_PORT=3000 MME_FRONTEND_PORT=8080 \
  MME_LAN_ACCESS=1 \
  MME_DATABASE_ENGINE=sqlite \
  ./mme-ubuntu-install.sh install ./mikrotik-manager-enterprise_<phiên-bản>_amd64.deb \
  ./SHA256SUMS-LINUX.txt
```

Đặt `MME_LAN_ACCESS=0` nếu chỉ muốn truy cập cục bộ hoặc qua SSH tunnel.

Tự cài PostgreSQL cục bộ:

```bash
sudo env MME_NONINTERACTIVE=1 MME_DATABASE_ENGINE=postgresql MME_DATABASE_NAME=mme \
  ./mme-ubuntu-install.sh install ./mikrotik-manager-enterprise_<phiên-bản>_amd64.deb \
  ./SHA256SUMS-LINUX.txt
```

Tự cài MariaDB cục bộ:

```bash
sudo env MME_NONINTERACTIVE=1 MME_DATABASE_ENGINE=mariadb MME_DATABASE_NAME=mme \
  ./mme-ubuntu-install.sh install ./mikrotik-manager-enterprise_<phiên-bản>_amd64.deb \
  ./SHA256SUMS-LINUX.txt
```

Dùng PostgreSQL có sẵn:

```bash
sudo env MME_NONINTERACTIVE=1 \
  MME_DATABASE_URL='postgresql://user:password@db-host:5432/mme?schema=public' \
  ./mme-ubuntu-install.sh install ./mikrotik-manager-enterprise_<phiên-bản>_amd64.deb \
  ./SHA256SUMS-LINUX.txt
```

Dùng MariaDB/MySQL có sẵn:

```bash
sudo env MME_NONINTERACTIVE=1 \
  MME_DATABASE_URL='mysql://user:password@db-host:3306/mme' \
  ./mme-ubuntu-install.sh install ./mikrotik-manager-enterprise_<phiên-bản>_amd64.deb \
  ./SHA256SUMS-LINUX.txt
```

MME xác minh kết nối và phiên bản server trước khi cài. Với URL có sẵn, trình cài không đổi mật
khẩu, không tạo/xóa database khác và không ghi URL ra log. File `mme.env` chứa thông tin nhạy cảm,
được giới hạn quyền `0600`. Ký tự đặc biệt trong username/password phải được URL-encode; URL chứa
khoảng trắng hoặc xuống dòng sẽ bị từ chối.

Thông tin đăng nhập ban đầu nằm tại:

```bash
sudo cat /root/mme-thong-tin-dang-nhap.txt
sudo mme-control login-info
```

Từ bản 5.6.2, cài mới luôn tạo file này. Khi nâng cấp mà file bị thiếu, MME kiểm tra mật khẩu
trong `mme.env` với tài khoản quản trị trong database. Nếu hai giá trị không còn khớp, MME đồng
bộ lại mật khẩu quản trị trước khi tạo file, vì vậy thông tin ghi trong file có thể dùng để đăng
nhập. Quá trình này không xóa hoặc khởi tạo lại database.

## Kiểm tra MME đang dùng database nào

Lệnh an toàn sau chỉ hiển thị loại database và trạng thái kết nối, không in username hoặc mật khẩu:

```bash
sudo mme-control database-check
```

Ví dụ khi dùng MariaDB:

```text
Database engine: MariaDB/MySQL
Configuration file: /etc/mikrotik-manager-enterprise/mme.env
Database status: connected
```

Các kết quả engine có thể là `SQLite`, `PostgreSQL` hoặc `MariaDB/MySQL`.

## Kiểm tra các tính năng sau cài đặt

Chạy quality gate cục bộ của MME:

```bash
sudo mme-control feature-check
```

Lệnh kiểm tra service, kết nối database, HTML/CSS/JavaScript của dashboard, proxy frontend,
Topology API và binary Ping của Linux. Sau đó vào từng thiết bị, mở **Terminal** và bấm
**Check API connection** để xác minh chính xác host/cổng/tài khoản RouterOS đã lưu.

Để Overview và Terminal đọc được dữ liệu, RouterOS phải bật `api` hoặc `api-ssl`, cổng đó phải
đến được từ Ubuntu, và tài khoản dùng cho MME cần policy `read,api`; lệnh thay đổi cấu hình cần
thêm `write`. Overview ưu tiên dữ liệu realtime trực tiếp, đồng thời dùng snapshot Inventory gần
nhất làm dữ liệu dự phòng nếu router tạm mất kết nối.

## Kiểm tra backend và dashboard

Backend và frontend đã chạy dưới dạng systemd service ngay sau khi cài. Với cổng mặc định:

```bash
sudo systemctl status mme.service --no-pager
sudo mme-control status
sudo mme-control health
sudo mme-control network-check
sudo mme-control feature-check
sudo mme-control database-check
curl --fail http://127.0.0.1:3000/ready
```

Dashboard nội bộ chạy tại cổng frontend đã chọn. Khi cho phép LAN, trình cài bind listener vào
`0.0.0.0` và chỉ mở cổng frontend trên UFW; backend tiếp tục ở loopback nếu dùng cổng riêng.
Nếu tắt LAN và đặt frontend `8080`, mở tunnel như sau:

```bash
ssh -L 8080:127.0.0.1:8080 <user>@<ip-server-ubuntu>
```

Sau đó mở `http://127.0.0.1:8080` trên máy Windows. Frontend tự chuyển tiếp `/api`, `/health`
và `/ready` tới cổng backend nên trình duyệt không cần truy cập trực tiếp backend. Khi triển khai
dùng lâu dài, nên đặt reverse proxy HTTPS phía trước cổng frontend thay vì mở thẳng ra Internet.

### Dashboard timeout từ máy khác

Kiểm tra listener, truy cập cục bộ và UFW:

```bash
sudo ss -lntp | grep ':<frontend-port>'
curl --fail "http://127.0.0.1:<frontend-port>/ready"
sudo ufw status verbose
```

Nếu service bind `0.0.0.0:<frontend-port>` và curl cục bộ đạt nhưng máy khác vẫn timeout, cho phép
subnet LAN truy cập cổng frontend, ví dụ:

```bash
sudo ufw allow from 10.0.0.0/24 to any port 3003 proto tcp comment 'MME dashboard'
```

Nếu UFW không hoạt động, cần kiểm tra firewall bên ngoài, VLAN/ACL và kết nối từ Windows:

```powershell
Test-NetConnection 10.0.0.11 -Port 3003
```

### Kiểm tra khi dashboard trắng

Từ bản 5.5.3, MME luôn gửi mới `index.html` sau nâng cấp, không ép các asset HTTP sang HTTPS khi
truy cập trực tiếp bằng IP LAN, đồng thời kiểm tra CSS/JavaScript thật thay vì chỉ kiểm tra trang
HTML. Trước tiên xác định cổng frontend và kiểm tra asset:

```bash
FRONTEND_PORT="$(sudo sed -n 's/^FRONTEND_PORT=//p' /etc/mikrotik-manager-enterprise/mme.env)"
curl --fail --silent "http://127.0.0.1:${FRONTEND_PORT}/" -o /tmp/mme-index.html
grep -oE '/assets/[^" ]+\.(css|js)' /tmp/mme-index.html
curl --silent --dump-header - --output /dev/null "http://127.0.0.1:${FRONTEND_PORT}/" \
  | grep -i '^content-security-policy:'
```

Header CSP hợp lệ không được chứa `upgrade-insecure-requests`; nếu có, trình duyệt sẽ đổi CSS/JS
từ HTTP sang HTTPS và báo `ERR_SSL_PROTOCOL_ERROR`.

Nếu service và asset đều tốt nhưng tab đã mở từ phiên bản cũ vẫn trắng, dùng `Ctrl+Shift+R` hoặc
xóa dữ liệu trang của địa chỉ MME một lần. Không cần xóa database hay cài lại hệ điều hành.

## Nâng cấp

```bash
sudo ./mme-ubuntu-install.sh upgrade \
  ./mikrotik-manager-enterprise_<phiên-bản-mới>_amd64.deb \
  ./SHA256SUMS-LINUX.txt
```

Trước khi chạy migration, MME tự sao lưu SQLite và file môi trường. Nếu migration hoặc readiness
check thất bại, `mme-control` phục hồi database/cấu hình trước đó rồi khởi động lại service cũ.
Với PostgreSQL hoặc MariaDB/MySQL bên ngoài, phải có chính sách backup riêng của database trước
khi nâng cấp.

Dữ liệu và cấu hình không nằm trong thư mục payload:

```text
/var/lib/mikrotik-manager-enterprise
/etc/mikrotik-manager-enterprise/mme.env
```

Vì vậy nâng cấp DEB không ghi đè dữ liệu người dùng.

## Quản trị hoàn toàn bằng CLI

```bash
sudo mme-control start
sudo mme-control stop
sudo mme-control restart
sudo mme-control status
sudo mme-control health
sudo mme-control network-check
sudo mme-control feature-check
sudo mme-control database-check
sudo mme-control login-info
sudo mme-control logs 300
sudo mme-control backup
sudo mme-control version
```

## Gỡ ứng dụng

```bash
sudo ./mme-ubuntu-install.sh uninstall
```

Lệnh gỡ dừng service và xóa payload, nhưng giữ database, backup và file môi trường để có thể cài lại. Chỉ xóa các thư mục dữ liệu khi chắc chắn không cần khôi phục.

## Chẩn đoán

```bash
sudo systemctl restart mme.service
sudo systemctl status mme.service --no-pager
sudo journalctl -u mme.service --no-pager -n 300
sudo mme-control health
```

Các vị trí quan trọng:

```text
/opt/mikrotik-manager-enterprise             payload ứng dụng
/var/lib/mikrotik-manager-enterprise/data    SQLite database (nếu chọn SQLite)
/var/lib/mikrotik-manager-enterprise/backups backup trước nâng cấp
/etc/mikrotik-manager-enterprise/mme.env     cấu hình service
```
