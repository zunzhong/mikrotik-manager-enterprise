# MME 5.4.0 — Topology Enterprise đa nguồn

## Mục tiêu

MME 5.4.0 hợp nhất toàn bộ tính năng topology thành một bản phát hành duy nhất: sơ đồ tổng thể, kiểm tra riêng từng thiết bị, canvas tương tác, panel chi tiết, dữ liệu vận hành, lịch sử thay đổi, liên kết thủ công và mô hình đánh giá độ tin cậy.

Nguyên tắc quan trọng nhất là **không biến dữ liệu gián tiếp thành một liên kết chắc chắn**. Nếu RouterOS chỉ cung cấp ARP hoặc DHCP, MME vẫn hiển thị node để chẩn đoán nhưng đánh dấu liên kết là `Chưa đủ căn cứ` và không tính thiết bị đó là đã kết nối.

## Nguồn dữ liệu được thu thập

Inventory tự chạy ngay khi MME khởi động và lặp lại mỗi 30 phút. Nút `Quét ngay` cho phép thu thập lại toàn hệ thống hoặc một thiết bị cụ thể.

| Nguồn RouterOS                                  | Mục đích                                            | Mức bằng chứng cơ sở |
| ----------------------------------------------- | --------------------------------------------------- | -------------------: |
| `/ip/neighbor/print`                            | MNDP, LLDP hoặc CDP; nhận diện láng giềng trực tiếp |                  94% |
| `/interface/bridge/host/print`                  | MAC xuất hiện trên bridge/port                      |                  75% |
| `/interface/wifi/registration-table/print`      | Client Wi‑Fi RouterOS v7                            |                  96% |
| `/interface/wifiwave2/registration-table/print` | Client WiFiWave2                                    |                  96% |
| `/interface/wireless/registration-table/print`  | Client wireless kiểu cũ                             |                  96% |
| `/caps-man/registration-table/print`            | Client do CAPsMAN quản lý                           |                  96% |
| `/routing/ospf/neighbor/print`                  | Quan hệ định tuyến OSPF trực tiếp                   |                  92% |
| `/ip/arp/print`                                 | Ánh xạ IP–MAC gián tiếp                             |                  30% |
| `/ip/dhcp-server/lease/print`                   | IP, MAC và hostname của client                      |                  28% |

Các collector Wi‑Fi/CAPsMAN/OSPF là collector tùy chọn. RouterOS không hỗ trợ menu tương ứng sẽ không làm Inventory bị đánh dấu lỗi hoặc làm thiết bị chuyển trạng thái sai.

## Cách MME quyết định liên kết

- **Đã xác nhận**: điểm tổng hợp từ 90% trở lên, thường là MNDP/LLDP, Wi‑Fi registration hoặc OSPF adjacency.
- **Suy luận có bằng chứng**: từ 65% đến dưới 90%, ví dụ bridge FDB được bổ sung bởi ARP/DHCP.
- **Chưa đủ căn cứ**: dưới 65%. MME hiển thị để người quản trị đối chiếu nhưng không khẳng định đây là kết nối vật lý.
- **Khóa thủ công**: liên kết do quản trị viên tạo và khóa. Loại này luôn được phân biệt với dữ liệu RouterOS.

Điểm tổng hợp dùng xác suất bù của nhiều bằng chứng độc lập, không cộng điểm tuyến tính. Alias chỉ được ghép tự động khi duy nhất; identity trùng giữa nhiều thiết bị không được dùng để quyết định node đích. MAC được ưu tiên hơn IP, IP được ưu tiên hơn identity/hostname.

## Sử dụng giao diện

1. Mở menu **Sơ đồ mạng**.
2. Chọn **Dashboard tổng thể** hoặc một thiết bị MME ở **Phạm vi kiểm tra**.
3. Bấm **Quét toàn bộ ngay** hoặc **Quét thiết bị này** nếu cần dữ liệu mới tức thời.
4. Dùng ô tìm kiếm và bộ lọc loại thiết bị, trạng thái, độ tin cậy.
5. Kéo nền để di chuyển, cuộn chuột hoặc nút `+/-` để zoom, kéo node để bố trí lại.
6. Bấm **Lưu bố cục** để lưu vị trí node vào database theo từng phạm vi.
7. Click node để xem CPU, RAM, nhiệt độ, RX/TX của interface hoạt động mạnh nhất, model, RouterOS, uptime và các liên kết.
8. Click link để xem từng bằng chứng, đường dẫn RouterOS, interface, thời điểm quan sát và trọng số.
9. Tab **Lịch sử** chỉ lưu một bản mới khi cấu trúc topology thực sự thay đổi; tối đa 200 bản cho mỗi phạm vi.

## Chuẩn bị RouterOS để phát hiện láng giềng

MME không tự thay đổi cấu hình discovery của router. Người quản trị nên kiểm tra trên từng thiết bị:

```routeros
/ip neighbor discovery-settings print
/interface list member print
/ip neighbor print detail
```

Nếu chính sách bảo mật cho phép, đặt `discover-interface-list` vào danh sách interface nội bộ cần quan sát. Không nên bật discovery trên interface Internet/WAN chỉ để làm đẹp sơ đồ.

## Lưu ý về độ chính xác

- ARP/DHCP chứng minh thiết bị đã giao tiếp ở lớp 3, không chứng minh vị trí cắm dây. Vì vậy MME không dùng chúng một mình để tạo liên kết chắc chắn.
- Bridge FDB có thể nhìn thấy MAC nằm sau switch trung gian; MME đánh dấu đây là suy luận trừ khi có nguồn trực tiếp bổ sung.
- NAT, tunnel, VRF hoặc mạng qua Internet có thể làm địa chỉ quan sát khác địa chỉ MME dùng để quản lý. Khi không thể ghép duy nhất, MME giữ node riêng.
- Số liệu RX/TX trong panel là interface đang có tổng tốc độ tức thời cao nhất, không cộng toàn bộ interface để tránh đếm trùng traffic bridge/VLAN.
- MME lưu bằng chứng và lịch sử topology trong SQLite/PostgreSQL; database cũ được nâng schema tự động khi cài đè 5.4.0.

## Nâng cấp Windows

MME 5.4.0 tiếp tục dùng cơ chế release tách biệt đã có từ 5.3.2. Bộ cài dừng service/cây tiến trình cũ, cài vào `releases\5.4.0`, chạy migration và `/ready`, sau đó mới chuyển service sang release mới. Nếu bước kiểm tra thất bại, service và database trước nâng cấp được khôi phục.
