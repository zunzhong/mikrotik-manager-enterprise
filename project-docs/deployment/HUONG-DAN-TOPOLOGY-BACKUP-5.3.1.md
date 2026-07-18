# MME 5.3.1 — Topology tương tác và quản lý dung lượng backup

## Topology tổng thể và từng thiết bị

Menu **Sơ đồ mạng** có hai phạm vi kiểm tra:

- **Dashboard tổng thể** hiển thị toàn bộ thiết bị được thêm vào MME, hàng xóm RouterOS đã phát hiện và các liên kết giữa chúng.
- Chọn một thiết bị cụ thể rồi bấm **Kiểm tra thiết bị này** để thu thập Inventory và Neighbor Discovery riêng cho thiết bị đó. Sơ đồ chỉ giữ node đang chọn cùng các hàng xóm trực tiếp.

Các thẻ tổng quan phân biệt số thiết bị MME đã liên kết, chưa liên kết và số liên kết MME–MME. Đường màu xanh lá biểu thị liên kết giữa hai thiết bị đều đang được MME quản lý.

Sơ đồ hỗ trợ:

- Cuộn chuột hoặc nút **+ / −** để zoom từ 55% đến 250%.
- Kéo từng node đến vị trí phù hợp. Bố cục được lưu trong trình duyệt và giữ nguyên sau khi tải lại trang.
- Nút **Đặt lại** đưa các node trong phạm vi hiện tại về bố cục vòng tròn mặc định.

Inventory vẫn tự chạy khi MME khởi động và lặp lại mỗi 30 phút. Để có liên kết, RouterOS phải bật MNDP, LLDP hoặc CDP trên interface liên quan và tài khoản MME phải đọc được `/ip/neighbor/print`.

## Chọn và thao tác nhiều bản sao lưu

Trong **Trung tâm sao lưu**:

1. Tích vào từng file hoặc chọn **Chọn tất cả đang hiển thị**. Bộ lọc tên và ngày vẫn áp dụng trước khi chọn tất cả.
2. Bấm **Tải file** để MME đóng gói các file đang tồn tại thành một file ZIP rồi tải về.
3. Bấm **Xóa file đã chọn** và xác nhận thêm một lần. MME xóa cả bản ghi cơ sở dữ liệu lẫn file vật lý trong vùng lưu trữ.

Các bản sao lưu lỗi hoặc không còn file vật lý vẫn có thể chọn để xóa, nhưng không được đưa vào gói tải ZIP.

## Giới hạn số file lưu trên MME

Mỗi lịch auto backup có trường **Số file tối đa / thiết bị**, từ 1 đến 500, mặc định 30. Sau khi một file mới được tạo và lưu thành công, MME kiểm tra riêng thiết bị đó. Nếu vượt giới hạn, file hoàn tất cũ nhất và bản ghi tương ứng được xóa trước, luôn giữ các file mới nhất.

## Icon ứng dụng Windows

Bộ cài Windows và các shortcut Start Menu/Desktop dùng logo MME nhiều kích thước thay cho icon PowerShell. Nâng cấp tại chỗ sẽ tạo lại shortcut với icon mới và giữ nguyên dữ liệu hiện có.
