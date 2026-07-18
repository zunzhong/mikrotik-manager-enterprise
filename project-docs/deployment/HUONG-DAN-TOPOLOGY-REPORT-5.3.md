# MikroTik Manager Enterprise 5.3 — Topology và Báo cáo Telegram

## Topology

MME 5.3 thu thập `/ip/neighbor/print` trong mỗi bản Inventory, đối chiếu Identity và địa chỉ IP với danh sách thiết bị đang quản lý, sau đó loại liên kết tự trỏ và liên kết trùng trước khi dựng sơ đồ.

- Inventory tự chạy ngay khi MME khởi động và lặp lại mỗi 30 phút.
- Trong **Sơ đồ mạng**, nút **Quét Inventory ngay** chạy một vòng thu thập mới cho toàn bộ thiết bị.
- Giao diện hiển thị lần thu thập gần nhất, lần kế tiếp, sơ đồ nút/liên kết và danh sách chi tiết.
- RouterOS Neighbor Discovery chỉ phát hiện được thiết bị trong cùng miền lớp 2 và phải cho phép MNDP, LLDP hoặc CDP trên interface tương ứng.
- Nếu chưa có liên kết, kiểm tra bằng RouterOS CLI: `/ip neighbor print`. Khi lệnh này chưa trả hàng xóm, MME cũng chưa thể dựng liên kết.
- Tài khoản RouterOS lưu trong MME cần quyền đọc `/ip/neighbor/print`, `/system/identity/print` và các mục Inventory hiện có.

## Báo cáo Telegram

Menu **Báo cáo** nằm dưới **Cảnh báo** và trên **Trung tâm sao lưu**.

1. Nhập tên lịch và chọn bật/tắt.
2. Chọn thời gian bắt đầu, số chu kỳ và đơn vị phút/giờ/ngày.
3. Chọn toàn bộ thiết bị hoặc từng thiết bị cụ thể.
4. Chọn một kênh Telegram đã cấu hình trong **Cảnh báo**, hoặc nhập Bot Token/Chat ID riêng cho báo cáo.
5. Bấm **Lưu lịch**. Có thể chỉnh sửa, xóa hoặc **Gửi ngay** để kiểm thử.

Mỗi thiết bị nhận một tin nhắn riêng, bắt đầu bằng RouterOS Identity và gồm:

- Điểm hiệu suất cùng trạng thái màu.
- CPU, RAM và nhiệt độ hiện có.
- Lưu lượng từng interface trong đúng chu kỳ của lịch.
- Tổng dữ liệu tích lũy trong cơ sở dữ liệu MME.

Báo cáo không tạo Excel, không có tình trạng WAN, không kiểm tra trùng IP và không kèm dòng chi tiết. Lịch sử gửi ghi rõ Identity, thời gian, trạng thái và lỗi Telegram nếu có.

## Dữ liệu và nâng cấp

- Lịch báo cáo được lưu bền vững trong vùng cấu hình dữ liệu của MME.
- Kênh Telegram dùng chung vẫn do menu **Cảnh báo** quản lý.
- Token riêng được che trên API/giao diện sau khi lưu; khi chỉnh sửa có thể để trống token để giữ giá trị hiện tại.
- Nâng cấp giữ nguyên thiết bị, Inventory, traffic, backup, cảnh báo và cấu hình hiện có.
