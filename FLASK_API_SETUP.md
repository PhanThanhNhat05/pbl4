# Hướng dẫn cài đặt và sử dụng Flask API

## 1. Cài đặt dependencies

```bash
pip install flask torch numpy scipy
```

## 2. Sửa lỗi trong code Flask

Trong file Flask của bạn, cần sửa một số chỗ:

### Sửa `_name_` thành `__name__`:

```python
# Thay vì:
app = Flask(_name_)
if _name_ == "_main_":

# Sửa thành:
app = Flask(__name__)
if __name__ == "__main__":
```

### Thêm CORS support (quan trọng):

```python
from flask import Flask, request, jsonify
from flask_cors import CORS  # Thêm dòng này

app = Flask(__name__)
CORS(app)  # Cho phép React frontend gọi API

# ... rest of your code ...
```

Cài đặt flask-cors:
```bash
pip install flask-cors
```

## 3. Đảm bảo file model tồn tại

Đảm bảo file `resetECG.pth` nằm trong cùng thư mục với file Flask API.

## 4. Chạy Flask API

```bash
python your_flask_file.py
```

API sẽ chạy tại: `http://localhost:5000`

## 5. Cấu hình React Frontend

Tạo file `.env` trong thư mục `client/`:

```env
REACT_APP_FLASK_API_URL=http://localhost:5000
REACT_APP_API_URL=http://localhost:5000
```

Nếu Flask API chạy trên port khác, thay đổi URL tương ứng.

## 6. Test API

Bạn có thể test API bằng curl:

```bash
# Tạo file test ECG
echo -e "512\n515\n518\n520\n515\n510\n508\n512" > test_ecg.txt

# Gọi API
curl -X POST http://localhost:5000/predict -F "file=@test_ecg.txt"
```

## 7. Cấu trúc Response từ Flask API

Flask API sẽ trả về:

```json
{
  "per_beat_predictions": [0, 1, 0, ...],
  "final_prediction": 0,
  "class_confidence": [0.1, 0.2, 0.3, 0.4, 0.5]
}
```

Frontend sẽ tự động map:
- `final_prediction` (0-4) → Tên class (Normal, Supraventricular, Ventricular, Paced, Other)
- `class_confidence[final_prediction]` → Độ tin cậy
- Tự động tính heart rate từ dữ liệu ECG

## 8. Lưu ý

- Đảm bảo Flask API và React app có thể giao tiếp (CORS đã được cấu hình)
- Dữ liệu ECG gửi từ React là raw values (0-1023) từ Arduino
- Flask API sẽ tự động xử lý preprocessing (resample, normalize, detect beats)
- Timeout mặc định là 60 giây

