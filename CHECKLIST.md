# ✅ Checklist - Đã hoàn thành các bước cài đặt

## 📦 Files đã tạo/cấu hình

- [x] `requirements.txt` - Danh sách Python dependencies
- [x] `flask_api_fixed.py` - Flask API đã sửa lỗi và cấu hình
- [x] `start_flask.bat` - Script tự động chạy Flask (Windows)
- [x] `start_flask.sh` - Script tự động chạy Flask (Linux/Mac)
- [x] `client/.env` - File cấu hình React (đã tạo)
- [x] Flask API port: **5001** (tránh conflict với Node.js port 5000)
- [x] React đã được tích hợp với Flask API trong `Measurement.tsx`

## 🔧 Cấu hình đã thực hiện

- [x] Sửa lỗi `_name_` → `__name__` trong Flask
- [x] Thêm CORS support để React có thể gọi API
- [x] Thêm error handling trong Flask API
- [x] Thêm health check endpoint `/health`
- [x] Cấu hình port 5001 cho Flask API
- [x] Tạo file `.env` cho React với đúng URLs
- [x] Tích hợp Flask API vào React frontend
- [x] Map kết quả từ Flask về format frontend

## 📝 Các bước tiếp theo (Bạn cần làm)

### 1. Cài đặt Python dependencies
```cmd
# Trong thư mục pbl/
pip install -r requirements.txt
```

Hoặc chạy script tự động:
```cmd
start_flask.bat
```

### 2. Kiểm tra file model
- [ ] Đảm bảo file `resetECG.pth` nằm cùng thư mục với `flask_api_fixed.py`

### 3. Chạy Flask API
```cmd
python flask_api_fixed.py
```

Hoặc dùng script:
```cmd
start_flask.bat
```

### 4. Kiểm tra Flask API đã chạy
- [ ] Mở trình duyệt: `http://localhost:5001/health`
- [ ] Hoặc chạy: `curl http://localhost:5001/health`
- [ ] Kết quả mong đợi: `{"status":"ok","device":"cpu"}` hoặc `{"status":"ok","device":"cuda"}`

### 5. Chạy Node.js Backend (nếu chưa chạy)
```cmd
npm start
# hoặc
node server.js
```

### 6. Restart React Frontend (nếu đang chạy)
- [ ] Dừng React dev server (Ctrl+C)
- [ ] Chạy lại: `cd client && npm start`
- [ ] File `.env` đã được tạo, React sẽ tự động load

### 7. Test hệ thống
- [ ] Đăng nhập vào ứng dụng
- [ ] Bấm "Bắt đầu đo"
- [ ] Bấm "Lấy dữ liệu"
- [ ] Bấm "Dự đoán"
- [ ] Kiểm tra kết quả hiển thị đúng

## 🎯 Kết quả mong đợi

Sau khi hoàn thành các bước trên:

1. ✅ Flask API chạy trên port 5001
2. ✅ Node.js Backend chạy trên port 5000
3. ✅ React Frontend chạy trên port 3000
4. ✅ React có thể gọi Flask API thành công
5. ✅ Kết quả phân tích ECG hiển thị trên giao diện

## 📚 Tài liệu tham khảo

- `QUICK_START.md` - Hướng dẫn nhanh chạy toàn bộ hệ thống
- `HUONG_DAN_CHAY_FLASK.md` - Hướng dẫn chi tiết về Flask API
- `FLASK_API_SETUP.md` - Hướng dẫn cài đặt Flask API
- `client/SETUP_ENV.md` - Hướng dẫn cấu hình React

## ⚠️ Lưu ý

1. **Thứ tự chạy services:**
   - Flask API (5001) → Node.js Backend (5000) → React (3000)

2. **File model:**
   - Phải có file `resetECG.pth` trong thư mục gốc

3. **Environment variables:**
   - File `.env` trong `client/` đã được tạo sẵn
   - Không cần sửa gì trừ khi bạn đổi port

4. **Restart React:**
   - Sau khi tạo/sửa `.env`, cần restart React dev server

## 🎉 Hoàn thành!

Tất cả các file cần thiết đã được tạo và cấu hình. Bạn chỉ cần:
1. Cài đặt Python dependencies
2. Chạy Flask API
3. Test hệ thống

Chúc bạn thành công! 🚀

