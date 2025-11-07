# Hướng dẫn chạy Flask API - Bước nhanh

## ✅ Các bước đã được tự động hóa

Tôi đã tạo sẵn các file cần thiết cho bạn:

### 1. File đã tạo:
- ✅ `requirements.txt` - Danh sách các thư viện Python cần cài
- ✅ `flask_api_fixed.py` - File Flask API đã được sửa lỗi và cấu hình
- ✅ `start_flask.bat` - Script tự động cho Windows
- ✅ `start_flask.sh` - Script tự động cho Linux/Mac
- ✅ File `.env` trong thư mục `client/` - Cấu hình React

### 2. Flask API được cấu hình:
- ✅ Port: **5001** (tránh conflict với Node.js backend port 5000)
- ✅ CORS: Đã bật để React có thể gọi API
- ✅ Error handling: Đã thêm xử lý lỗi
- ✅ Health check endpoint: `/health`

## 🚀 Cách chạy Flask API

### Trên Windows:

**Cách 1: Dùng script tự động (Khuyến nghị)**
```cmd
start_flask.bat
```

Script này sẽ:
- Tự động tạo virtual environment
- Cài đặt tất cả dependencies
- Chạy Flask API

**Cách 2: Chạy thủ công**
```cmd
# Tạo virtual environment
python -m venv venv

# Kích hoạt virtual environment
venv\Scripts\activate

# Cài đặt dependencies
pip install -r requirements.txt

# Chạy Flask API
python flask_api_fixed.py
```

### Trên Linux/Mac:

```bash
# Cho phép thực thi script
chmod +x start_flask.sh

# Chạy script
./start_flask.sh
```

Hoặc chạy thủ công:
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python flask_api_fixed.py
```

## 🔍 Kiểm tra Flask API đã chạy

Mở trình duyệt hoặc dùng curl:

```bash
# Kiểm tra health
curl http://localhost:5001/health

# Kết quả mong đợi:
# {"status":"ok","device":"cpu"} hoặc {"status":"ok","device":"cuda"}
```

## ⚠️ Lưu ý quan trọng

1. **File model**: Đảm bảo file `resetECG.pth` nằm cùng thư mục với `flask_api_fixed.py`

2. **Port conflict**: 
   - Node.js backend: Port 5000
   - Flask API: Port 5001
   - Nếu cần đổi port Flask, sửa trong `flask_api_fixed.py` và file `.env` của React

3. **React client**: 
   - File `.env` đã được tạo trong `client/`
   - Cần **restart React dev server** sau khi tạo/sửa file `.env`

4. **Cài đặt Python**: 
   - Cần Python 3.8 trở lên
   - Kiểm tra: `python --version`

## 🧪 Test API

Sau khi Flask API đã chạy, bạn có thể test:

```bash
# Tạo file test ECG
echo -e "512\n515\n518\n520\n515\n510\n508\n512" > test_ecg.txt

# Gọi API (Windows PowerShell)
curl -X POST http://localhost:5001/predict -F "file=@test_ecg.txt"

# Hoặc dùng Postman/Insomnia
```

## 📝 Troubleshooting

### Lỗi: "Module not found"
```cmd
pip install -r requirements.txt
```

### Lỗi: "Model file not found"
- Đảm bảo file `resetECG.pth` nằm cùng thư mục với `flask_api_fixed.py`

### Lỗi: "Port already in use"
- Kiểm tra xem port 5001 đã được sử dụng chưa
- Đổi port trong `flask_api_fixed.py` và `.env`

### Lỗi: "CORS error" trong React
- Đảm bảo Flask API đã import và sử dụng `CORS(app)`
- Kiểm tra URL trong file `.env` của React

## 🎯 Tiếp theo

1. ✅ Chạy Flask API bằng `start_flask.bat`
2. ✅ Kiểm tra API đã chạy: `http://localhost:5001/health`
3. ✅ Restart React dev server (nếu đang chạy)
4. ✅ Test trên ứng dụng React: Đăng nhập → Bắt đầu đo → Lấy dữ liệu → Dự đoán

