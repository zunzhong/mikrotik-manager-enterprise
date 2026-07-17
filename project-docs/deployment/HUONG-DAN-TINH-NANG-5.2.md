# MikroTik Manager Enterprise 5.2 — Cảnh báo và Backup

## Bản sửa lỗi 5.2.2: tự khôi phục dịch vụ truyền backup

- MME đọc cổng và trạng thái hiện tại của `ssh`/`ftp` trên từng RouterOS.
- MME ưu tiên dịch vụ đang bật để không thay đổi cấu hình không cần thiết; nếu cả hai đang tắt, MME bật tạm SSH/SFTP trước và FTP sau nếu cần.
- Dịch vụ do MME bật tạm luôn được tắt lại trong bước `finally`, kể cả khi tải backup lỗi.
- Dịch vụ vốn đã bật trước khi backup được giữ nguyên trạng thái bật.
- Nếu RouterOS không cho phép MME khôi phục trạng thái tắt, tác vụ dừng và hiển thị lỗi rõ ràng để quản trị viên kiểm tra ngay.

## Bản sửa lỗi 5.2.1: tải binary backup

- File `.backup` là dữ liệu nhị phân nên không được đọc bằng thuộc tính `contents` của RouterOS API.
- MME 5.2.1 ưu tiên tải file qua SSH/SFTP và tự dự phòng qua FTP, sử dụng đúng cổng đang cấu hình trong **IP → Services**.
- Trên thiết bị cần bật ít nhất một trong hai dịch vụ `ssh` hoặc `ftp`; tài khoản thiết bị lưu trong MME phải có quyền truy cập file.
- Chỉ cho phép dịch vụ từ địa chỉ máy MME bằng firewall hoặc trường **Available From** trên RouterOS. Nên ưu tiên SSH/SFTP vì được mã hóa.
- MME chỉ xóa bản tạm trên RouterOS sau khi file đã được tải và ghi thành công vào vùng dữ liệu bền vững của MME.

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
