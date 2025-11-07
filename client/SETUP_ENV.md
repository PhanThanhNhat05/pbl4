# Cấu hình Environment Variables cho React Client

## Tạo file .env

Tạo file `.env` trong thư mục `client/` với nội dung sau:

```env
# Backend API URL (Node.js/Express) - Port 5000
REACT_APP_API_URL=http://localhost:5000

# Flask ML API URL (Python Flask) - Port 5001
REACT_APP_FLASK_API_URL=http://localhost:5001
```

## Lưu ý

- Flask API chạy trên port **5001** để tránh conflict với Node.js backend (port 5000)
- Sau khi tạo file `.env`, cần **restart React development server** để áp dụng thay đổi
- Nếu bạn thay đổi port Flask API, nhớ cập nhật `REACT_APP_FLASK_API_URL` tương ứng

## Cách tạo file .env trên Windows

1. Mở Command Prompt hoặc PowerShell trong thư mục `client/`
2. Chạy lệnh:
   ```cmd
   echo REACT_APP_API_URL=http://localhost:5000 > .env
   echo REACT_APP_FLASK_API_URL=http://localhost:5001 >> .env
   ```

Hoặc tạo file thủ công bằng Notepad và lưu với tên `.env` (không có phần mở rộng)

