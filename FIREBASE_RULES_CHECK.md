# Kiểm tra Firebase Rules

## Vấn đề
Dữ liệu có trong Firebase nhưng app không lấy được, có thể do Firebase Rules chưa cho phép đọc.

## Cách kiểm tra và sửa:

1. Mở Firebase Console: https://console.firebase.google.com/
2. Chọn project "HeartECG"
3. Vào **Realtime Database** → Tab **Rules**
4. Kiểm tra rules hiện tại

## Rules đề xuất (cho phép đọc công khai):

```json
{
  "rules": {
    "ECG": {
      ".read": true,
      ".write": false,
      "raw": {
        ".read": true,
        ".write": false
      },
      "$userId": {
        "raw": {
          ".read": true,
          ".write": false
        }
      }
    }
  }
}
```

## Rules an toàn hơn (chỉ cho phép đọc khi authenticated):

```json
{
  "rules": {
    "ECG": {
      ".read": "auth != null",
      ".write": false,
      "raw": {
        ".read": "auth != null",
        ".write": false
      },
      "$userId": {
        "raw": {
          ".read": "auth != null && auth.uid == $userId",
          ".write": false
        }
      }
    }
  }
}
```

## Lưu ý:
- Nếu dùng rules công khai (`.read: true`), Firebase sẽ cảnh báo về bảo mật
- Nếu dùng rules authenticated, cần đảm bảo user đã đăng nhập
- Sau khi thay đổi rules, nhấn **Publish** để áp dụng

