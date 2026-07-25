# Kiểm tra tính năng MME Linux 5.7.0

MME 5.7.0 bổ sung quality gate thực tế cho Linux, tập trung vào hai lỗi dễ bị bỏ sót khi chỉ kiểm
tra service: Terminal không thực thi RouterOS API và Overview không có dữ liệu dù router online.

## Kiểm tra nền tảng MME

```bash
sudo mme-control status
sudo mme-control health
sudo mme-control database-check
sudo mme-control network-check
sudo mme-control feature-check
```

`feature-check` phải kết thúc bằng:

```text
MME Linux platform feature check: PASS
Dashboard HTML/CSS/JavaScript: ready
Backend proxy and Topology API: ready
Linux ping runtime: ready
```

Nếu lỗi, lấy log:

```bash
sudo mme-control logs 300
sudo journalctl -u mme.service --no-pager -n 300
```

## Kiểm tra RouterOS cho từng thiết bị

Trên MME, mở **Thiết bị → chọn router → Terminal → Check API connection**. Kết quả thành công
phải có Identity, phiên bản RouterOS, uptime và thời gian phản hồi.

Trên RouterOS, kiểm tra service:

```routeros
/ip service print where name=api
/ip service print where name=api-ssl
```

MME dùng đúng host, cổng, username, password và lựa chọn API/API-SSL đã lưu trong thiết bị.
Tài khoản cần policy `read,api`; các lệnh thay đổi cấu hình cần thêm `write`. Firewall giữa Ubuntu
và router phải cho phép TCP 8728 hoặc 8729 tương ứng.

Các lệnh Terminal dùng API đã được kiểm thử:

```routeros
/log
/system resource print
/interface print .proplist=name,type,running,rx-byte,tx-byte
/log print where message~"error"
/ping address=8.8.8.8 count=4
```

Với cú pháp CLI phức tạp không thể ánh xạ an toàn sang query word của RouterOS API, chọn
**REST Script**. RouterOS phải bật `www-ssl` hoặc `www` và tài khoản phải có quyền REST phù hợp.

## Kiểm tra Overview

Mở tab **Overview**. MME 5.7.0 chủ động đọc realtime:

- Identity, RouterOS, kiến trúc, board và serial.
- Uptime, CPU, RAM và dung lượng đĩa.
- Health sensor và interface.
- Độ trễ kết nối API.

Nếu realtime lỗi nhưng đã có Inventory, MME hiển thị snapshot gần nhất và nêu rõ lý do không đọc
được router. Bấm **Sync Now** để thu thập lại Inventory; kết quả lỗi không còn bị ẩn.

## Bằng chứng CI bắt buộc

Pipeline Linux chạy trên Ubuntu 20.04 và kiểm thử lại gói DEB bằng `dpkg/systemd`. Một RouterOS
giả lập được dùng để xác nhận end-to-end:

- Đăng nhập MME và thêm thiết bị.
- Test Connection trả đúng Identity/RouterOS.
- Overview realtime trả resource/interface.
- Terminal trả dữ liệu và mã hóa đúng bộ lọc `where`.
- Ping từ router và Ping từ Ubuntu.
- Thu thập và đọc Inventory.
- Dashboard HTML, CSS, JavaScript và frontend proxy.
- SQLite, PostgreSQL và MariaDB/MySQL.

Artifact chỉ được tạo khi toàn bộ quality gate Linux đạt.
