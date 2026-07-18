# MME 5.3.2 — Nâng cấp tại chỗ an toàn trên Windows

Phiên bản 5.3.2 khắc phục lỗi Windows từ chối thay thế `runtime\node.exe` hoặc native DLL khi cài đè lên phiên bản đang chạy.

Từ phiên bản này, payload được đặt theo release, ví dụ:

```text
C:\Program Files\MikroTik Manager Enterprise\releases\5.3.2
```

Phiên bản mới không ghi trực tiếp lên `node.exe` của release cũ. Sau khi service mới hoạt động ổn định, MME giữ tối đa một release trước đó và dọn các release cũ hơn.

## Cơ chế bảo vệ mới

Trước khi Inno Setup ghi file chương trình, bộ cài chạy một preflight độc lập:

1. Yêu cầu Windows Service MME dừng đúng quy trình.
2. Tìm service wrapper, Node.js runtime và toàn bộ tiến trình con thuộc thư mục cài đặt.
3. Diệt cả cây tiến trình còn sót bằng `taskkill /T /F`.
4. Gỡ đăng ký service cũ để ngăn chính sách tự khởi động lại trong lúc thay file.
5. Thử mở độc quyền toàn bộ file `.exe`, `.dll` và `.node` trong tối đa 60 giây.
6. Chỉ cho phép Inno Setup bắt đầu giải nén khi không còn tiến trình, service cũ hoặc file bị khóa.

Preflight cũng lưu đường dẫn release/service cũ vào vùng cấu hình bền vững. Nếu quá trình khởi tạo SQLite, đăng ký service mới hoặc health check thất bại sau khi đã giải nén, MME rollback database và tự đăng ký lại service của release trước.

Nếu preflight không thể giải phóng file, quá trình dừng trước khi thay đổi file chương trình và cố gắng đăng ký/khởi động lại service cũ. Chi tiết được lưu tại:

```text
C:\ProgramData\MikroTik Manager Enterprise\logs\upgrade-preflight.log
```

Nếu người dùng hủy bộ cài hoặc Inno Setup gặp lỗi trong lúc giải nén, guard lúc đóng bộ cài đọc `upgrade-state.json` và tự khôi phục service của release cũ. Khi máy bị tắt đột ngột, lần chạy bộ cài kế tiếp cũng khôi phục trạng thái dang dở trước rồi mới bắt đầu preflight mới.

Không chọn **Skip this file** nếu Windows từng hiển thị hộp thoại khóa file. Hủy bộ cài và gửi `upgrade-preflight.log` để chẩn đoán.

## Kiểm thử chống tái diễn

Pipeline Windows thực hiện cài mới rồi ba vòng nâng cấp liên tiếp. Trước mỗi vòng, pipeline cố ý chạy thêm một tiến trình bằng chính `runtime\node.exe` đã cài để mô phỏng file đang bị khóa. Mỗi vòng phải đạt đủ các điều kiện:

- Tiến trình giả lập bị preflight giải phóng.
- API `/ready` trả `database: true`.
- Windows Service trở lại trạng thái `Running`.
- SHA-256 của toàn bộ `.exe`, `.dll` và `.node` sau cài đặt trùng với payload mới; không file nào bị bỏ qua.
- Cơ sở dữ liệu trong ProgramData vẫn tồn tại sau nâng cấp và sau khi gỡ ứng dụng.

## Cài đặt

Chạy installer 5.3.2 bằng quyền Administrator và cài trực tiếp lên phiên bản cũ. Không cần gỡ MME trước; dữ liệu, cấu hình, backup và tài khoản được giữ nguyên.
