# Cài MikroTik Manager Enterprise trên Ubuntu Server bằng CLI

## Phạm vi hỗ trợ

- Ubuntu Server 20.04, 22.04 hoặc 24.04, kiến trúc amd64.
- Máy thật hoặc máy ảo dùng `systemd`, còn tối thiểu 2 GB dung lượng trống.
- Toàn bộ thao tác thực hiện qua terminal/SSH; không có trình cài đặt đồ họa.
- Không cần Docker. Gói Linux phát hành kèm Node.js runtime và hỗ trợ hai engine:
  SQLite nhúng hoặc PostgreSQL 12 trở lên.

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
5. Kiểm tra database hiện có và hiển thị lựa chọn SQLite/PostgreSQL.
6. Cài dependency cần thiết, khởi tạo database và tài khoản quản trị.
7. Bật `mme.service` tự chạy cùng Ubuntu.
8. Chờ `/ready` xác nhận ứng dụng và database hoạt động.

Nếu phát hiện cấu hình database MME đã có, trình cài giữ nguyên khi nâng cấp. Khi cài mới,
trình cài phát hiện SQLite MME hoặc PostgreSQL trên máy và hỏi trước khi sử dụng. Nếu không dùng
database đã phát hiện, danh sách hỗ trợ được hiển thị:

1. **SQLite tích hợp:** mặc định, không cài dịch vụ database riêng.
2. **PostgreSQL 12+:** dùng URL PostgreSQL đã cung cấp hoặc cài PostgreSQL bằng `apt`.

MySQL/MariaDB không được hỗ trợ trong bản này. Trình cài chỉ cảnh báo khi phát hiện và không sửa,
xóa hoặc dùng database đó.

### Cài không tương tác

SQLite và hai cổng riêng:

```bash
sudo env MME_NONINTERACTIVE=1 \
  MME_BACKEND_PORT=3000 MME_FRONTEND_PORT=8080 \
  MME_DATABASE_ENGINE=sqlite \
  ./mme-ubuntu-install.sh install ./mikrotik-manager-enterprise_<phiên-bản>_amd64.deb \
  ./SHA256SUMS-LINUX.txt
```

Tự cài PostgreSQL cục bộ:

```bash
sudo env MME_NONINTERACTIVE=1 MME_DATABASE_ENGINE=postgresql MME_DATABASE_NAME=mme \
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

MME xác minh kết nối và phiên bản server trước khi cài. Với URL có sẵn, trình cài không đổi mật
khẩu, không tạo/xóa database khác và không ghi URL ra log. File `mme.env` chứa thông tin nhạy cảm,
được giới hạn quyền `0600`. Ký tự đặc biệt trong username/password phải được URL-encode; URL chứa
khoảng trắng hoặc xuống dòng sẽ bị từ chối.

Thông tin đăng nhập ban đầu nằm tại:

```bash
sudo cat /root/mme-thong-tin-dang-nhap.txt
```

## Kiểm tra backend và dashboard

Backend và frontend đã chạy dưới dạng systemd service ngay sau khi cài. Với cổng mặc định:

```bash
sudo systemctl status mme.service --no-pager
sudo mme-control status
sudo mme-control health
curl --fail http://127.0.0.1:3000/ready
```

Dashboard nội bộ chạy tại cổng frontend đã chọn. Nếu dùng mặc định, URL là
`http://127.0.0.1:3000`. Nếu đặt frontend `8080`, mở tunnel như sau:

```bash
ssh -L 8080:127.0.0.1:8080 <user>@<ip-server-ubuntu>
```

Sau đó mở `http://127.0.0.1:8080` trên máy Windows. Frontend tự chuyển tiếp `/api`, `/health`
và `/ready` tới cổng backend nên trình duyệt không cần truy cập trực tiếp backend. Khi triển khai
dùng lâu dài, nên đặt reverse proxy HTTPS phía trước cổng frontend thay vì mở thẳng ra Internet.

### Kiểm tra khi dashboard trắng

Từ bản 5.5.2, MME luôn gửi mới `index.html` sau nâng cấp, đồng thời kiểm tra CSS/JavaScript thật
thay vì chỉ kiểm tra trang HTML. Trước tiên xác định cổng frontend và kiểm tra asset:

```bash
FRONTEND_PORT="$(sudo sed -n 's/^FRONTEND_PORT=//p' /etc/mikrotik-manager-enterprise/mme.env)"
curl --fail --silent "http://127.0.0.1:${FRONTEND_PORT}/" -o /tmp/mme-index.html
grep -oE '/assets/[^" ]+\.(css|js)' /tmp/mme-index.html
```

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
Với PostgreSQL bên ngoài, phải có chính sách backup riêng của PostgreSQL trước khi nâng cấp.

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
