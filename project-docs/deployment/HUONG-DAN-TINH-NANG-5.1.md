# MikroTik Manager Enterprise 5.1 — Ghi chú vận hành

## Log RouterOS

- MME thu thập trạng thái và log mỗi 10 giây.
- Fingerprint sử dụng toàn bộ trường gốc của bản ghi RouterOS và chỉ bỏ `.id`; các trường nội bộ bắt đầu bằng `_mme` không phải dữ liệu RouterOS nên không tham gia fingerprint.
- Một log đã có fingerprint sẽ không tạo lại cảnh báo sau khi MME kết nối lại RouterOS.

## Cảnh báo

- Tab **Hệ thống** quản lý kênh gửi, quy tắc gửi, kênh nhận và lịch sử Test.
- Nút **Kiểm thử** chỉ mở phần chọn thiết bị. Phải chọn một thiết bị hoặc toàn bộ thiết bị rồi bấm **Gửi kiểm thử**.
- Tab **Trung tâm cảnh báo** hiển thị quy tắc và danh sách cảnh báo theo chiều ngang.
- Xác nhận hoặc xử lý cập nhật đúng bản ghi hiện tại; MME không tạo cảnh báo mới cho thao tác đổi trạng thái.
- Dòng trạng thái dưới nội dung hiển thị thời điểm xác nhận hoặc xử lý theo múi giờ đã cấu hình trong MME.

## Sao lưu

- Tên file: `MME_<identity>_<thời-gian>.rsc` hoặc `.backup`.
- Nếu RouterOS không trả Identity, MME sử dụng tên thiết bị đã lưu.
- Có thể lọc theo tên file và khoảng ngày.
- File `.rsc` được lưu vào vùng dữ liệu MME, hỗ trợ **Đọc** trong hộp thoại và **Tải xuống**.
- File `.backup` vẫn được tạo trên RouterOS. Nút tải chỉ khả dụng khi file đã tồn tại trong vùng lưu trữ cục bộ MME.
- Auto backup cấu hình theo thiết bị hoặc áp dụng đồng thời cho toàn bộ thiết bị, với định dạng và chu kỳ tính bằng giờ.

## Windows

Bản 5.1 chỉ kích hoạt build installer Windows tự động khi push. Linux vẫn giữ ở chế độ build thủ công để xử lý sau.
