# 🧪 Hướng dẫn test hệ thống không cần thiết bị đo

## 📋 Tổng quan

Khi không có thiết bị đo thật (Arduino), bạn có thể sử dụng script `generate_mock_ecg.py` để:
- Generate dữ liệu ECG giả giống thật
- Push dữ liệu lên Firebase
- Test toàn bộ hệ thống (React → Firebase → Flask API → Kết quả)

## 🚀 Cách sử dụng

### Bước 1: Cài đặt dependencies

```cmd
pip install numpy requests
```

### Bước 2: Cấu hình Firebase Rules

**QUAN TRỌNG:** Để script có thể push dữ liệu lên Firebase, bạn cần cấu hình Firebase Rules:

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

**⚠️ LƯU Ý:** Rules này cho phép write/read public. Chỉ dùng cho testing! 
Trong production, cần authentication.

### Bước 3: Chạy script generate dữ liệu

```cmd
python generate_mock_ecg.py
```

Script sẽ hỏi bạn:
1. Chọn loại dữ liệu:
   - `1` - ECG bình thường (72 BPM)
   - `2` - ECG bất thường - Nhịp chậm (48 BPM)
   - `3` - ECG bất thường - Arrhythmia
   - `4` - Load từ file `ecg_12s.txt`

2. Có muốn push lên Firebase không? (`y/n`)

### Bước 4: Test trên React App

Sau khi push dữ liệu lên Firebase:

1. **Mở ứng dụng React** (nếu chưa chạy: `cd client && npm start`)

2. **Đăng nhập** vào hệ thống

3. **Thực hiện đo:**
   - Bấm **"Bắt đầu đo"** (không cần thiết bị, chỉ để bắt đầu process)
   - Bấm **"Lấy dữ liệu"** (sẽ tải dữ liệu từ Firebase)
   - Đợi vài giây để dữ liệu load
   - Bấm **"Dự đoán"** (sẽ gọi Flask API để phân tích)

4. **Xem kết quả:**
   - Kết quả sẽ hiển thị trong ô "Kết quả dự đoán"
   - Đồ thị ECG sẽ hiển thị trong ô "Tín hiệu ECG"
   - Lịch sử đo sẽ cập nhật

## 📊 Các loại dữ liệu test

### 1. ECG Bình thường (Normal)
- **Heart rate:** 72 BPM
- **Kết quả mong đợi:** Normal, Low risk
- **Dùng để test:** Hệ thống hoạt động bình thường

### 2. ECG Nhịp chậm (Bradycardia)
- **Heart rate:** 48 BPM
- **Kết quả mong đợi:** Có thể là "Other" hoặc "Bất thường", High risk
- **Dùng để test:** Phát hiện bất thường

### 3. ECG Arrhythmia
- **Heart rate:** ~65 BPM (biến thiên)
- **Kết quả mong đợi:** "Bất thường", High risk
- **Dùng để test:** Phát hiện rối loạn nhịp tim

### 4. Load từ file
- Load từ file `ecg_12s.txt` (nếu có)
- Dữ liệu thật từ database ECG

## 🔄 Workflow test

```
1. Generate Mock Data
   ↓
2. Push to Firebase
   ↓
3. React App: "Lấy dữ liệu"
   ↓
4. React App: "Dự đoán"
   ↓
5. Flask API phân tích
   ↓
6. Hiển thị kết quả trên React
```

## 🐛 Troubleshooting

### Lỗi: "Cannot push to Firebase"
**Nguyên nhân:** Firebase rules không cho phép write

**Giải pháp:**
1. Kiểm tra Firebase rules (xem Bước 2)
2. Đảm bảo Internet connection
3. Kiểm tra database URL đúng

### Lỗi: "No data in Firebase"
**Nguyên nhân:** Chưa push dữ liệu hoặc push thất bại

**Giải pháp:**
1. Chạy lại script và chọn push (`y`)
2. Kiểm tra console output có thông báo thành công không
3. Vào Firebase Console kiểm tra data có trong `ECG/raw` không

### Lỗi: "Flask API không phân tích được"
**Nguyên nhân:** Flask API chưa chạy hoặc dữ liệu không đúng format

**Giải pháp:**
1. Đảm bảo Flask API đang chạy: `python flask_api_fixed.py`
2. Kiểm tra file `.env` trong `client/` có đúng Flask API URL không
3. Kiểm tra console browser có lỗi gì không

### Dữ liệu hiển thị không đúng
**Nguyên nhân:** Dữ liệu quá ngắn hoặc không có peaks

**Giải pháp:**
1. Generate dữ liệu với số điểm lớn hơn (sửa trong code)
2. Thử loại dữ liệu khác (Normal thay vì Abnormal)

## 💡 Tips

1. **Test nhiều loại dữ liệu:**
   - Test với ECG bình thường trước
   - Sau đó test với ECG bất thường
   - So sánh kết quả

2. **Kiểm tra Firebase Console:**
   - Xem data đã được push chưa
   - Kiểm tra format chunks đúng không

3. **Xem console logs:**
   - Browser console (F12)
   - Flask API console
   - Script generate console

4. **Test lại nhiều lần:**
   - Mỗi lần push sẽ ghi đè data cũ
   - Có thể push nhiều lần để test

## 🎯 Kết quả mong đợi

Sau khi test thành công:

- ✅ React app có thể lấy dữ liệu từ Firebase
- ✅ Flask API có thể phân tích dữ liệu
- ✅ Kết quả hiển thị đúng trên giao diện
- ✅ Đồ thị ECG hiển thị đúng
- ✅ Lịch sử đo được lưu vào database

## 📝 Lưu ý

1. **Firebase Rules:** Chỉ dùng rules public cho testing. Production cần authentication.

2. **Dữ liệu giả:** Dữ liệu generate chỉ để test. Không dùng cho mục đích y tế thực.

3. **Cleanup:** Sau khi test xong, có thể xóa data trong Firebase Console.

4. **Performance:** Generate và push dữ liệu lớn có thể mất thời gian.

## 🚀 Quick Start

```cmd
# 1. Cài đặt
pip install numpy requests

# 2. Chạy script
python generate_mock_ecg.py

# 3. Chọn option 1 (Normal ECG)
# 4. Chọn y (push to Firebase)
# 5. Mở React app và test
```

Chúc bạn test thành công! 🎉

