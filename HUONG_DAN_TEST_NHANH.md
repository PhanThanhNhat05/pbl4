# 🚀 Hướng dẫn test nhanh - Không cần thiết bị đo

## ✅ Đã tạo script tự động

Tôi đã tạo script `push_good_mock_data.py` để:
- ✅ Generate dữ liệu ECG **tốt, liên tục, đầy đủ** (72 BPM, ~28 giây)
- ✅ Tự động push lên Firebase
- ✅ Dễ sử dụng, chỉ cần chạy 1 lệnh

## 🎯 Cách sử dụng nhanh nhất

### Bước 1: Cài đặt dependencies (chỉ cần 1 lần)

```cmd
pip install numpy requests
```

### Bước 2: Cấu hình Firebase Rules

**QUAN TRỌNG:** Phải làm bước này trước!

1. Mở [Firebase Console](https://console.firebase.google.com/)
2. Chọn project: `heartecg-4e084`
3. Vào **Realtime Database** > **Rules**
4. Thay đổi rules thành:

```json
{
  "rules": {
    "ECG": {
      ".write": true,
      ".read": true
    },
    ".read": false,
    ".write": false
  }
}
```

5. Bấm **Publish**

### Bước 3: Push dữ liệu mock lên Firebase

**Cách 1: Dùng script tự động (Khuyến nghị)**

```cmd
push_mock_data_simple.bat
```

**Cách 2: Chạy Python trực tiếp**

```cmd
python push_good_mock_data.py
```

Script sẽ:
- ✅ Generate ~10,000 điểm dữ liệu ECG (72 BPM, ~28 giây)
- ✅ Tự động push lên Firebase
- ✅ Hiển thị thông báo thành công

### Bước 4: Test trên React App

1. **Đảm bảo Flask API đang chạy:**
   ```cmd
   python flask_api_fixed.py
   ```
   (Chạy trong terminal riêng)

2. **Mở React app:**
   ```cmd
   cd client
   npm start
   ```

3. **Test trên giao diện:**
   - Đăng nhập vào hệ thống
   - Bấm **"Bắt đầu đo"** (không cần thiết bị)
   - Bấm **"Lấy dữ liệu"** (sẽ tải từ Firebase)
   - Đợi vài giây để dữ liệu load
   - Bấm **"Dự đoán"** (sẽ gọi Flask API)

4. **Kiểm tra kết quả:**
   - ✅ Nhịp tim: ~72 BPM
   - ✅ Dự đoán: **Normal** (Bình thường)
   - ✅ Risk level: **Low**
   - ✅ Đồ thị ECG: Hiển thị đầy đủ, liên tục, không bị phẳng

## 📊 So sánh với dữ liệu cũ

### Dữ liệu cũ (có vấn đề):
- ❌ Nhịp tim: 40-48 BPM (quá thấp)
- ❌ Dự đoán: "Khác", "Bất thường thất"
- ❌ Đồ thị: Chỉ vài nhịp đầu rồi phẳng

### Dữ liệu mới (tốt):
- ✅ Nhịp tim: 72 BPM (bình thường)
- ✅ Dự đoán: "Normal" (Bình thường)
- ✅ Đồ thị: Đầy đủ, liên tục, ~28 giây dữ liệu

## 🔄 Workflow

```
1. Push Mock Data (push_good_mock_data.py)
   ↓
2. Firebase Realtime Database (ECG/raw)
   ↓
3. React App: "Lấy dữ liệu"
   ↓
4. React App: "Dự đoán"
   ↓
5. Flask API: Phân tích dữ liệu
   ↓
6. Hiển thị kết quả: Normal, 72 BPM, Low risk
```

## 🐛 Troubleshooting

### Lỗi: "Cannot push to Firebase"

**Nguyên nhân:** Firebase rules chưa cho phép write

**Giải pháp:**
1. Kiểm tra Firebase rules (xem Bước 2)
2. Đảm bảo đã bấm **Publish** sau khi sửa rules
3. Đợi vài giây để rules được cập nhật

### Lỗi: "No data in Firebase"

**Nguyên nhân:** Push thất bại hoặc data bị xóa

**Giải pháp:**
1. Chạy lại script `push_good_mock_data.py`
2. Kiểm tra console output có thông báo thành công không
3. Vào Firebase Console kiểm tra data trong `ECG/raw`

### Lỗi: "Flask API không phân tích được"

**Nguyên nhân:** Flask API chưa chạy

**Giải pháp:**
1. Đảm bảo Flask API đang chạy: `python flask_api_fixed.py`
2. Kiểm tra port 5001 có đang được sử dụng không
3. Kiểm tra file `.env` trong `client/` có đúng Flask API URL không

### Đồ thị vẫn bị phẳng

**Nguyên nhân:** Dữ liệu cũ vẫn còn trong Firebase

**Giải pháp:**
1. Chạy lại script `push_good_mock_data.py` để ghi đè dữ liệu cũ
2. Xóa data trong Firebase Console (ECG/raw) rồi push lại
3. Đảm bảo đã bấm "Lấy dữ liệu" sau khi push

## 💡 Tips

1. **Test nhiều lần:**
   - Mỗi lần push sẽ ghi đè data cũ
   - Có thể push nhiều lần để test

2. **Kiểm tra Firebase Console:**
   - Vào Firebase Console > Realtime Database
   - Kiểm tra data trong `ECG/raw`
   - Nên có nhiều chunks (chunk_1, chunk_2, ...)

3. **Xem console logs:**
   - Browser console (F12) - xem lỗi React
   - Flask API console - xem lỗi phân tích
   - Script console - xem lỗi push data

## 🎯 Kết quả mong đợi

Sau khi test thành công:

- ✅ React app lấy được dữ liệu từ Firebase
- ✅ Flask API phân tích được dữ liệu
- ✅ Kết quả: **Normal, 72 BPM, Low risk**
- ✅ Đồ thị ECG: **Đầy đủ, liên tục, không bị phẳng**
- ✅ Lịch sử đo được lưu vào database

## 📝 Lưu ý

1. **Firebase Rules:** Chỉ dùng rules public cho testing. Production cần authentication.

2. **Dữ liệu giả:** Dữ liệu generate chỉ để test. Không dùng cho mục đích y tế thực.

3. **Cleanup:** Sau khi test xong, có thể xóa data trong Firebase Console.

## 🚀 Quick Start (Tóm tắt)

```cmd
# 1. Cài đặt
pip install numpy requests

# 2. Cấu hình Firebase rules (xem Bước 2 ở trên)

# 3. Push data
push_mock_data_simple.bat

# 4. Chạy Flask API (terminal riêng)
python flask_api_fixed.py

# 5. Chạy React (terminal riêng)
cd client && npm start

# 6. Test trên giao diện
```

Chúc bạn test thành công! 🎉

