# 🚀 Hướng dẫn nhanh - Chạy toàn bộ hệ thống

## 📋 Tổng quan

Hệ thống gồm 3 phần:
1. **Node.js Backend** - Port 5000 (API chính)
2. **Flask ML API** - Port 5001 (Phân tích ECG bằng AI)
3. **React Frontend** - Port 3000 (Giao diện người dùng)

## ✅ Đã cấu hình sẵn

- ✅ Flask API đã được sửa lỗi và cấu hình
- ✅ React client đã được tích hợp với Flask API
- ✅ File `.env` đã được tạo trong `client/`
- ✅ Scripts tự động để chạy Flask API
- ✅ Ports đã được cấu hình để tránh conflict

## 🎯 Các bước chạy hệ thống

### Bước 1: Cài đặt và chạy Flask API

**Trên Windows:**
```cmd
start_flask.bat
```

**Trên Linux/Mac:**
```bash
chmod +x start_flask.sh
./start_flask.sh
```

Flask API sẽ chạy tại: `http://localhost:5001`

**Kiểm tra:**
- Mở trình duyệt: `http://localhost:5001/health`
- Hoặc chạy: `curl http://localhost:5001/health`

### Bước 2: Chạy Node.js Backend

Mở terminal mới:
```cmd
# Cài đặt dependencies (nếu chưa)
npm install

# Chạy backend
npm start
# hoặc
node server.js
```

Backend sẽ chạy tại: `http://localhost:5000`

### Bước 3: Chạy React Frontend

Mở terminal mới:
```cmd
cd client

# Cài đặt dependencies (nếu chưa)
npm install

# Chạy React app
npm start
```

Frontend sẽ mở tại: `http://localhost:3000`

## 🧪 Test hệ thống

1. **Đăng nhập vào ứng dụng**
   - Truy cập: `http://localhost:3000`
   - Đăng nhập với tài khoản của bạn

2. **Thực hiện đo ECG**
   - Bấm "Bắt đầu đo" (để lắng nghe dữ liệu từ Arduino)
   - Bấm "Lấy dữ liệu" (để tải dữ liệu từ Firebase)
   - Bấm "Dự đoán" (để phân tích bằng Flask API)

3. **Kiểm tra kết quả**
   - Kết quả sẽ hiển thị trong ô "Kết quả dự đoán"
   - Đồ thị ECG sẽ hiển thị trong ô "Tín hiệu ECG"
   - Lịch sử đo sẽ cập nhật tự động

## 📁 Cấu trúc file quan trọng

```
pbl/
├── flask_api_fixed.py          # Flask ML API (Port 5001)
├── requirements.txt             # Python dependencies
├── start_flask.bat             # Script chạy Flask (Windows)
├── start_flask.sh              # Script chạy Flask (Linux/Mac)
├── resetECG.pth                # Model AI (phải có)
├── server.js                   # Node.js Backend (Port 5000)
├── client/
│   ├── .env                    # Cấu hình React (đã tạo)
│   └── src/
│       └── pages/
│           └── Measurement.tsx # Trang đo ECG (đã tích hợp Flask API)
└── HUONG_DAN_CHAY_FLASK.md    # Hướng dẫn chi tiết
```

## ⚠️ Lưu ý quan trọng

1. **Thứ tự chạy:**
   - Nên chạy Flask API trước (port 5001)
   - Sau đó chạy Node.js Backend (port 5000)
   - Cuối cùng chạy React Frontend (port 3000)

2. **File model:**
   - Đảm bảo file `resetECG.pth` nằm cùng thư mục với `flask_api_fixed.py`

3. **Ports:**
   - Node.js: 5000
   - Flask: 5001
   - React: 3000
   - Nếu port bị chiếm, đổi trong file tương ứng

4. **Environment variables:**
   - File `.env` trong `client/` đã được tạo sẵn
   - Nếu sửa `.env`, cần restart React dev server

## 🔧 Troubleshooting

### Lỗi: "Cannot connect to Flask API"
- Kiểm tra Flask API đã chạy chưa: `http://localhost:5001/health`
- Kiểm tra file `.env` trong `client/` có đúng URL không

### Lỗi: "Model file not found"
- Đảm bảo `resetECG.pth` nằm cùng thư mục với `flask_api_fixed.py`

### Lỗi: "Port already in use"
- Kiểm tra port nào đang bị chiếm
- Đổi port trong file tương ứng và `.env`

### Lỗi: "CORS error"
- Đảm bảo Flask API đã import `CORS` và gọi `CORS(app)`
- File `flask_api_fixed.py` đã có sẵn CORS

## 📚 Tài liệu tham khảo

- `HUONG_DAN_CHAY_FLASK.md` - Hướng dẫn chi tiết về Flask API
- `FLASK_API_SETUP.md` - Hướng dẫn cài đặt Flask API
- `client/SETUP_ENV.md` - Hướng dẫn cấu hình React

## 🎉 Hoàn thành!

Sau khi chạy cả 3 services, hệ thống sẽ hoạt động đầy đủ:
- ✅ Backend API để quản lý users và measurements
- ✅ Flask ML API để phân tích ECG
- ✅ React Frontend để hiển thị giao diện và tương tác

Chúc bạn thành công! 🚀

