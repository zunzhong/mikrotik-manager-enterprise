# MME 5.5.0 — Cổng dịch vụ và database Linux

## Cổng frontend/backend

MME mặc định dùng chung cổng `3000` để giữ tương thích với các bản trước. Trong lúc cài Windows
hoặc Linux, có thể chọn hai cổng khác nhau:

- **Backend/API:** Fastify, `/api`, `/health` và `/ready`.
- **Frontend/dashboard:** giao diện web; khi tách cổng, listener frontend chuyển tiếp API nội bộ
  tới backend nên trình duyệt vẫn dùng URL cùng nguồn.

Bộ cài xác thực phạm vi `1–65535` và kiểm tra cổng đang bị chiếm trước khi khởi động. Cài đè giữ
cấu hình hiện tại nếu bỏ qua bước tùy chỉnh. Thông tin cổng nằm trong `mme.env` dưới hai biến
`SERVER_PORT` và `FRONTEND_PORT`.

## Database Linux

Trình cài Ubuntu hỗ trợ:

| Engine     | Phiên bản        | Cách chuẩn bị                       |
| ---------- | ---------------- | ----------------------------------- |
| SQLite     | Tích hợp Node.js | Mặc định; không cài service ngoài   |
| PostgreSQL | 12 trở lên       | Dùng URL có sẵn hoặc cài bằng `apt` |

Luồng bảo vệ dữ liệu:

1. Cấu hình MME đã tồn tại được giữ nguyên khi nâng cấp thông thường.
2. Nếu người dùng cung cấp PostgreSQL URL, trình cài chỉ xác minh kết nối/phiên bản và không đổi
   mật khẩu hay tạo/xóa database.
3. Nếu chọn tự cài PostgreSQL, MME tạo database/role riêng. Nếu role `mme` đã tồn tại, trình cài
   tạo một role tên khác thay vì đổi mật khẩu role cũ.
4. Database PostgreSQL có bảng sẵn chỉ được đồng bộ sau một lần xác nhận bổ sung trong chế độ
   tương tác.
5. MySQL/MariaDB chưa được hỗ trợ; khi phát hiện, MME chỉ cảnh báo và không thay đổi chúng.

## Topology

Zoom sơ đồ bằng nút `+/-` hoặc giữ `Ctrl` rồi lăn chuột. Lăn chuột không kèm `Ctrl` không thay đổi
mức zoom, giúp tránh phóng/thu ngoài ý muốn khi cuộn trang.
