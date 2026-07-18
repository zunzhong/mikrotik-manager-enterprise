# MME 5.4.1 — Báo cáo Telegram chỉ chạy theo lịch

## Định dạng lưu lượng

Dòng tiêu đề báo cáo ghi rõ thứ tự số liệu:

```text
📈 Lưu lượng tiêu thụ trong 1h (TX/RX):
🟢 ether1: 2.00 GB / 8.00 GB
🔵 sfp1: 512.0 MB / 2.00 GB
```

- Số bên trái là `TX` — dữ liệu RouterOS gửi ra, tương ứng upload.
- Số bên phải là `RX` — dữ liệu RouterOS nhận vào, tương ứng download.
- Mỗi dòng interface chỉ hiển thị hai giá trị kèm đơn vị; không lặp lại chữ TX/RX.
- Số liệu được cộng từ chênh lệch counter của đúng interface trong chu kỳ lịch báo cáo.

## Quy tắc gửi báo cáo

MME 5.4.1 chỉ gửi báo cáo Telegram khi có một lịch hợp lệ thỏa mãn đồng thời:

1. Lịch đang bật.
2. Đã đến `Lần kế tiếp` của lịch.
3. Lịch có kênh Telegram hợp lệ.
4. Thiết bị thuộc phạm vi đã chọn trong lịch.

Nút **Gửi ngay**, API gửi thủ công và đường gọi service không qua bộ lập lịch đã được loại bỏ. Lịch đã tắt, lịch chưa đến giờ hoặc report không có lịch sẽ không được gửi.

## Trạng thái thiết bị “Suy giảm / Degraded”

`Degraded` không có nghĩa là thiết bị mất kết nối. MME vẫn kết nối API RouterOS thành công, nhưng điểm sức khỏe đã thấp hơn 90 vì một lỗi nghiêm trọng hoặc tổng hợp nhiều cảnh báo:

- CPU: cảnh báo từ 70%, nghiêm trọng từ 90%.
- RAM đã dùng: cảnh báo từ 80%, nghiêm trọng từ 90%.
- Bộ nhớ lưu trữ đã dùng: cảnh báo từ 80%, nghiêm trọng từ 90%.
- Nhiệt độ: cảnh báo từ 55°C, nghiêm trọng từ 65°C.
- Điện áp: cảnh báo khi từ 10 V trở xuống hoặc từ 60 V trở lên.

Mỗi cảnh báo trừ 10 điểm; mỗi lỗi nghiêm trọng trừ 25 điểm. Một cảnh báo đơn lẻ tạo điểm 90 nên thiết bị vẫn là `online`. Điểm từ 60 đến 89 là sức khỏe cảnh báo, dưới 60 là sức khỏe nghiêm trọng. Hai mức dưới 90 đều được thể hiện ở danh sách thiết bị bằng trạng thái `degraded`; khi API không kết nối được, trạng thái mới là `offline`.
