# Database cho MME Linux 5.6.1

MME Linux 5.6.1 hỗ trợ SQLite, PostgreSQL và MariaDB/MySQL. Trình cài tự kiểm tra cấu hình MME
đã có và các database server đang cài trên máy trước khi thay đổi hệ thống.

Trình cài cũng hỏi bằng tiếng Anh có cho phép truy cập dashboard từ LAN hay không. Khi đồng ý,
listener frontend được bind đúng giao diện và UFW đang hoạt động sẽ được bổ sung rule giới hạn
theo subnet LAN.

## Cài mới có tương tác

Trình cài thực hiện theo thứ tự:

1. Nếu có database đã cấu hình cho MME, hỏi có tiếp tục dùng database đó hay không.
2. Nếu có file SQLite của MME, hỏi có tiếp tục dùng file đó hay không.
3. Nếu phát hiện PostgreSQL đang cài, liệt kê database và hỏi có dùng server đó hay không.
4. Nếu phát hiện MariaDB/MySQL đang cài, liệt kê database và hỏi có dùng server đó hay không.
5. Nếu không chọn database đã phát hiện, hiển thị SQLite, PostgreSQL và MariaDB/MySQL để chọn.
6. Nếu chọn PostgreSQL hoặc MariaDB mà máy chưa có, cài server và client bằng `apt`.
7. Tạo database/tài khoản riêng cho MME, đồng bộ schema, seed tài khoản quản trị và kiểm tra
   endpoint `/ready`.

Các câu hỏi xác nhận hiển thị bằng tiếng Anh. Tên database chỉ được chứa chữ, số và dấu gạch
dưới. Trình cài không thay đổi mật khẩu của tài khoản database đã tồn tại.

## Cài không tương tác

SQLite:

```bash
sudo env MME_NONINTERACTIVE=1 MME_DATABASE_ENGINE=sqlite \
  ./mme-ubuntu-install.sh install ./mikrotik-manager-enterprise_5.6.1_amd64.deb \
  ./SHA256SUMS-LINUX.txt
```

PostgreSQL cục bộ:

```bash
sudo env MME_NONINTERACTIVE=1 MME_DATABASE_ENGINE=postgresql MME_DATABASE_NAME=mme \
  ./mme-ubuntu-install.sh install ./mikrotik-manager-enterprise_5.6.1_amd64.deb \
  ./SHA256SUMS-LINUX.txt
```

MariaDB cục bộ:

```bash
sudo env MME_NONINTERACTIVE=1 MME_DATABASE_ENGINE=mariadb MME_DATABASE_NAME=mme \
  ./mme-ubuntu-install.sh install ./mikrotik-manager-enterprise_5.6.1_amd64.deb \
  ./SHA256SUMS-LINUX.txt
```

Database server bên ngoài:

```bash
sudo env MME_NONINTERACTIVE=1 \
  MME_DATABASE_URL='postgresql://user:password@db-host:5432/mme?schema=public' \
  ./mme-ubuntu-install.sh install ./mikrotik-manager-enterprise_5.6.1_amd64.deb \
  ./SHA256SUMS-LINUX.txt
```

```bash
sudo env MME_NONINTERACTIVE=1 \
  MME_DATABASE_URL='mysql://user:password@db-host:3306/mme' \
  ./mme-ubuntu-install.sh install ./mikrotik-manager-enterprise_5.6.1_amd64.deb \
  ./SHA256SUMS-LINUX.txt
```

Ký tự đặc biệt trong username/password phải được URL-encode. Trình cài xác minh kết nối và phiên
bản server nhưng không ghi URL chứa mật khẩu ra log.

## Bảo vệ database đã có dữ liệu

Nếu database PostgreSQL hoặc MariaDB/MySQL đã có bảng, cài đặt tương tác yêu cầu xác nhận lại.
Trong chế độ không tương tác, MME mặc định từ chối. Chỉ sau khi sao lưu và kiểm tra đúng database,
có thể dùng:

```bash
MME_ALLOW_EXISTING_POSTGRESQL=1
```

hoặc:

```bash
MME_ALLOW_EXISTING_MYSQL=1
```

MME tạo role/user mới nếu tên `mme` đã tồn tại, thay vì đổi mật khẩu của tài khoản cũ.
