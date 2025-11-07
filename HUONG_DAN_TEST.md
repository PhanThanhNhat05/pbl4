# 🧪 Hướng dẫn test nhanh - Không cần thiết bị đo

## 🚀 Cách nhanh nhất

### Bước 1: Push dữ liệu giả lên Firebase

**Cách 1: Dùng script test nhanh (Khuyến nghị)**
```cmd
python test_mock_data.py
```

**Cách 2: Dùng script đầy đủ**
```cmd
python generate_mock_ecg.py
# Chọn option 1 (Normal ECG)
# Chọn y (push to Firebase)
```

**Cách 3: Dùng batch file (Windows)**
```cmd
push_mock_data.bat
```

### Bước 2: Cấu hình Firebase Rules

**QUAN TRỌNG:** Trước khi push, cần cấu hình Firebase Rules:

1. Mở [Firebase Console](https://console.firebase.google.com/)
2. Chọn project: `heartecg-4e084`
3. Vào **Realtime Database** > **Rules**
4. Sửa rules thành:

```json
{
  "rules": {
    "ECG": {
      ".write": true,
      ".read": true
    }
  }
}
```

5. Bấm **Publish**

### Bước 3: Test trên React App

1. **Mở React app** (nếu chưa: `cd client && npm start`)

2. **Đăng nhập** vào hệ thống

3. **Test đo ECG:**
   - Bấm **"Bắt đầu đo"** (không cần thiết bị)
   - Bấm **"Lấy dữ liệu"** → Sẽ tải dữ liệu từ Firebase
   - Bấm **"Dự đoán"** → Sẽ gọi Flask API để phân tích

4. **Xem kết quả:**
   - Kết quả hiển thị trong "Kết quả dự đoán"
   - Đồ thị hiển thị trong "Tín hiệu ECG"
   - Lịch sử cập nhật tự động

## 📊 Các loại dữ liệu test

### Option 1: ECG Bình thường (Normal)
```cmd
python test_mock_data.py
```
- Heart rate: 72 BPM
- Kết quả: Normal, Low risk

### Option 2: ECG Nhịp chậm (Bradycardia)
```cmd
python generate_mock_ecg.py
# Chọn 2
```
- Heart rate: 48 BPM
- Kết quả: Abnormal, High risk

### Option 3: ECG Arrhythmia
```cmd
python generate_mock_ecg.py
# Chọn 3
```
- Heart rate: ~65 BPM (variable)
- Kết quả: Abnormal, High risk

## ⚡ Quick Test

```cmd
# 1. Cấu hình Firebase Rules (chỉ cần làm 1 lần)
# 2. Push dữ liệu
python test_mock_data.py

# 3. Mở React app và test
```

## 🔍 Kiểm tra dữ liệu đã push

1. Vào [Firebase Console](https://console.firebase.google.com/)
2. Chọn project: `heartecg-4e084`
3. Vào **Realtime Database**
4. Kiểm tra data trong `ECG/raw`
5. Nên thấy các chunks: `chunk_1`, `chunk_2`, ...

## 🐛 Troubleshooting

### Lỗi: "Cannot push to Firebase"
- **Kiểm tra:** Firebase rules đã cho phép write chưa?
- **Giải pháp:** Xem Bước 2

### Lỗi: "No data" khi bấm "Lấy dữ liệu"
- **Kiểm tra:** Firebase có data trong `ECG/raw` không?
- **Giải pháp:** Chạy lại script push

### Lỗi: "Flask API không phân tích được"
- **Kiểm tra:** Flask API đang chạy không? (`python flask_api_fixed.py`)
- **Giải pháp:** Đảm bảo Flask API chạy trên port 5001

## 📝 Lưu ý

1. **Firebase Rules:** Chỉ dùng cho testing. Production cần authentication.
2. **Dữ liệu giả:** Chỉ để test. Không dùng cho mục đích y tế.
3. **Cleanup:** Có thể xóa data trong Firebase sau khi test.

## 🎯 Kết quả mong đợi

Sau khi test thành công:
- ✅ React app lấy được dữ liệu từ Firebase
- ✅ Flask API phân tích được dữ liệu
- ✅ Kết quả hiển thị đúng
- ✅ Đồ thị ECG hiển thị đúng
- ✅ Lịch sử đo được lưu

Chúc bạn test thành công! 🎉

