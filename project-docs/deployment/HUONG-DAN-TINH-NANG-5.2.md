# MikroTik Manager Enterprise 5.2 — Cảnh báo và Backup

## Trung tâm cảnh báo

- Quy tắc cảnh báo nằm ở cột bên trái.
- Danh sách cảnh báo nằm ở cột bên phải.
- Trên màn hình hẹp, hai cột tự chuyển thành bố cục dọc để giữ khả năng đọc.

## Lịch backup tự động

1. Chọn thiết bị hoặc **Tất cả thiết bị**.
2. Chọn bật lịch, định dạng `.rsc`/`.backup`, chu kỳ và giờ bắt đầu.
3. Bấm **Lưu lịch**.
4. Danh sách bên dưới hiển thị thiết bị, định dạng, thời gian, trạng thái và lần chạy kế tiếp.
5. Dùng **Chỉnh sửa** hoặc **Xóa lịch** để quản lý lịch đã tạo.

## Tải và đọc backup

- File backup mới được lưu bền vững tại `%ProgramData%\MikroTik Manager Enterprise\backups`.
- Nút **Tải xuống** tải file đã lưu trong MME về máy đang mở trình duyệt.
- Với file `.rsc`, nút **Đọc trên web** mở popup ngay tại Trung tâm sao lưu; đóng popup sẽ trở lại đúng danh sách trước đó.
- Khi nâng cấp, bộ cài cố gắng chuyển các file backup cũ còn tồn tại trong thư mục chương trình sang vùng dữ liệu bền vững.

Nếu một bản ghi cũ báo file không tồn tại và file gốc trên RouterOS cũng đã bị xóa, hãy tạo lại backup; MME không thể phục hồi nội dung file đã mất vật lý.
