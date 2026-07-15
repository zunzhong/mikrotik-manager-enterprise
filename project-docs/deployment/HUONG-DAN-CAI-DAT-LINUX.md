# Hướng dẫn cài đặt MikroTik Manager Enterprise trên Linux

## Yêu cầu

- Ubuntu 22.04/24.04 hoặc Debian 12, kiến trúc amd64.
- Máy dùng systemd và còn tối thiểu 2 GB dung lượng trống.
- Không bắt buộc Docker hoặc PostgreSQL: bản DEB dùng SQLite nhúng.

## Kiểm tra checksum

Đặt file DEB và `SHA256SUMS-LINUX.txt` trong cùng thư mục rồi chạy:

```bash
sha256sum --check SHA256SUMS-LINUX.txt
```

## Cài mới

```bash
sudo dpkg -i mikrotik-manager-enterprise_<phiên-bản>_amd64.deb
sudo mme-control install
sudo mme-control status
curl --fail http://127.0.0.1:3000/ready
```

Thông tin đăng nhập ban đầu được lưu tại:

```text
/root/mme-thong-tin-dang-nhap.txt
```

Dashboard chạy tại `http://127.0.0.1:3000`. Nếu truy cập từ máy khác, hãy cấu hình reverse proxy HTTPS thay vì mở trực tiếp dịch vụ ra Internet.

## Nâng cấp

MME tự sao lưu database trước khi nâng cấp schema:

```bash
sudo dpkg -i mikrotik-manager-enterprise_<phiên-bản-mới>_amd64.deb
sudo mme-control install
curl --fail http://127.0.0.1:3000/ready
```

Dữ liệu nằm tại `/var/lib/mikrotik-manager-enterprise` và cấu hình nằm tại `/etc/mikrotik-manager-enterprise/mme.env`.

## Sao lưu và gỡ cài đặt

```bash
sudo mme-control backup
sudo dpkg -r mikrotik-manager-enterprise
```

Gỡ gói không xóa database, bản sao lưu hoặc file môi trường. Chỉ xóa các thư mục dữ liệu khi bạn chắc chắn không cần khôi phục.

## Chẩn đoán

```bash
sudo mme-control status
sudo journalctl -u mme.service --no-pager -n 300
sudo systemctl restart mme.service
curl --fail http://127.0.0.1:3000/ready
```
