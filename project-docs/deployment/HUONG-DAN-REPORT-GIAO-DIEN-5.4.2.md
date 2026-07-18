# MME 5.4.2 — Báo cáo, trạng thái kết nối và giao diện sáng/tối

## Báo cáo Telegram

MME vẫn hỗ trợ hai cách gửi từ một lịch đã lưu:

1. Tự gửi khi lịch đến `Lần kế tiếp`.
2. Bấm **Gửi ngay** để gửi một lần theo đúng thiết bị và kênh Telegram của lịch đó.

**Gửi ngay** không cập nhật `Lần chạy gần nhất` và không thay đổi `Lần kế tiếp`, vì vậy không làm lệch chu kỳ tự động. API cũng từ chối ID lịch không tồn tại.

Định dạng lưu lượng ghi thứ tự số liệu một lần ở tiêu đề và thụt đầu dòng cho từng interface:

```text
📈 Lưu lượng tiêu thụ trong 1h (TX/RX):
   🟢 ether1: 2.00 GB / 8.00 GB
   🔵 sfp1: 512.0 MB / 2.00 GB
```

- Số bên trái là `TX` — dữ liệu RouterOS gửi ra, tương ứng upload.
- Số bên phải là `RX` — dữ liệu RouterOS nhận vào, tương ứng download.
- Mỗi dòng interface chỉ hiển thị hai giá trị kèm đơn vị.

## Trạng thái kết nối

Trạng thái thiết bị chỉ còn:

- **Online**: MME kết nối và thu thập RouterOS thành công.
- **Offline**: MME không kết nối được hoặc thiết bị chưa có lần thăm dò thành công.

CPU, RAM, lưu trữ, nhiệt độ và điện áp vẫn được đánh giá trong điểm sức khỏe và cảnh báo, nhưng không làm thay đổi trạng thái kết nối. Khi nâng cấp, dữ liệu `degraded` cũ được chuyển thành `online`; `unknown` cũ được chuyển thành `offline`.

## Giao diện sáng/tối và Topology

- Chữ phụ, viền, form và nút dùng bảng màu tương phản cao hơn ở cả hai chế độ.
- Node Topology ở chế độ sáng dùng nền sáng và biểu tượng tối; chế độ tối dùng nền tối và biểu tượng sáng.
- Tên node và IP/MAC có viền nền tương phản để giữ độ rõ trên đường nối.
- Nhãn liên kết chỉ hiện khi rê chuột hoặc chọn liên kết, tránh chữ chồng lên toàn bộ sơ đồ.
- Bố cục tự động dàn node theo nhiều vòng với khoảng cách lớn hơn; có thể bấm **Sắp xếp** rồi **Lưu bố cục**.
