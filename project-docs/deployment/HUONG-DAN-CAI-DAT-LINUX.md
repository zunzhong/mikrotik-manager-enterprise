# Cài MikroTik Manager Enterprise trên Ubuntu Server bằng CLI

## Phạm vi hỗ trợ

- Ubuntu Server 20.04, 22.04 hoặc 24.04, kiến trúc amd64.
- Máy thật hoặc máy ảo dùng `systemd`, còn tối thiểu 2 GB dung lượng trống.
- Toàn bộ thao tác thực hiện qua terminal/SSH; không có trình cài đặt đồ họa.
- Không cần Docker và PostgreSQL. Gói Linux phát hành kèm Node.js runtime và dùng SQLite nhúng.

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
4. Cài các dependency hệ thống tối thiểu.
5. Cài payload, khởi tạo SQLite và tài khoản quản trị.
6. Bật `mme.service` tự chạy cùng Ubuntu.
7. Chờ `/ready` xác nhận ứng dụng và database hoạt động.

Thông tin đăng nhập ban đầu nằm tại:

```bash
sudo cat /root/mme-thong-tin-dang-nhap.txt
```

## Kiểm tra backend và dashboard

Backend đã chạy dưới dạng systemd service ngay sau khi cài. Các lệnh kiểm tra đầy đủ:

```bash
sudo systemctl status mme.service --no-pager
sudo mme-control status
sudo mme-control health
curl --fail http://127.0.0.1:3000/ready
```

Dashboard nội bộ chạy tại `http://127.0.0.1:3000`. Để xem an toàn từ máy Windows qua SSH:

```bash
ssh -L 3000:127.0.0.1:3000 <user>@<ip-server-ubuntu>
```

Sau đó mở `http://127.0.0.1:3000` trên máy Windows. Khi triển khai dùng lâu dài, nên đặt reverse proxy HTTPS phía trước MME thay vì đổi `SERVER_HOST` để mở thẳng cổng 3000 ra Internet.

## Nâng cấp

```bash
sudo ./mme-ubuntu-install.sh upgrade \
  ./mikrotik-manager-enterprise_<phiên-bản-mới>_amd64.deb \
  ./SHA256SUMS-LINUX.txt
```

Trước khi chạy migration, MME tự sao lưu database và file môi trường. Nếu migration hoặc readiness check thất bại, `mme-control` phục hồi database/cấu hình trước đó rồi khởi động lại service cũ.

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
/var/lib/mikrotik-manager-enterprise/data    SQLite database
/var/lib/mikrotik-manager-enterprise/backups backup trước nâng cấp
/etc/mikrotik-manager-enterprise/mme.env     cấu hình service
```
