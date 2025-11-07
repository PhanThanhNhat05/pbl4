"""
Script để generate dữ liệu ECG giả và push lên Firebase
Sử dụng khi không có thiết bị đo thật
"""

import numpy as np
import firebase_admin
from firebase_admin import credentials, db
import time
import json
import os

# ==================== GENERATE ECG DATA ====================

def generate_normal_ecg(num_points=5000, sample_rate=360, heart_rate=72):
    """
    Generate ECG signal giả với nhịp tim bình thường
    
    Args:
        num_points: Số điểm dữ liệu
        sample_rate: Tần số lấy mẫu (Hz)
        heart_rate: Nhịp tim (BPM)
    """
    t = np.linspace(0, num_points / sample_rate, num_points)
    
    # Tần số tim (Hz)
    f_heart = heart_rate / 60.0
    
    # Tạo tín hiệu ECG giả bằng cách kết hợp các thành phần
    # QRS complex (nhịp tim)
    qrs = np.zeros_like(t)
    rr_interval = 1.0 / f_heart
    num_beats = int(t[-1] / rr_interval)
    
    for i in range(num_beats):
        beat_time = i * rr_interval
        # QRS complex
        qrs_mask = (t >= beat_time) & (t < beat_time + 0.1)
        qrs[qrs_mask] = 2.0 * np.exp(-((t[qrs_mask] - beat_time - 0.05) / 0.02) ** 2)
        
        # P wave (nhỏ hơn, trước QRS)
        p_mask = (t >= beat_time - 0.15) & (t < beat_time - 0.05)
        qrs[p_mask] += 0.3 * np.exp(-((t[p_mask] - beat_time + 0.1) / 0.03) ** 2)
        
        # T wave (sau QRS)
        t_mask = (t >= beat_time + 0.15) & (t < beat_time + 0.35)
        qrs[t_mask] += 0.5 * np.exp(-((t[t_mask] - beat_time - 0.25) / 0.05) ** 2)
    
    # Thêm noise nhẹ
    noise = np.random.normal(0, 0.05, num_points)
    
    # Thêm baseline drift
    baseline = 0.1 * np.sin(2 * np.pi * 0.5 * t)
    
    # Kết hợp
    ecg = qrs + noise + baseline
    
    # Convert sang ADC values (0-1023), center tại 512
    adc_min = 0
    adc_max = 1023
    adc_center = 512
    adc_range = 200  # Range của ECG signal trong ADC
    
    # Normalize và scale
    ecg_normalized = (ecg - np.min(ecg)) / (np.max(ecg) - np.min(ecg) + 1e-8)
    ecg_adc = adc_center + (ecg_normalized - 0.5) * adc_range
    ecg_adc = np.clip(ecg_adc, adc_min, adc_max)
    
    return ecg_adc.astype(int)


def generate_abnormal_ecg(num_points=5000, sample_rate=360, heart_rate=48, abnormality='arrhythmia'):
    """
    Generate ECG signal giả với bất thường
    
    Args:
        num_points: Số điểm dữ liệu
        sample_rate: Tần số lấy mẫu (Hz)
        heart_rate: Nhịp tim (BPM) - có thể thấp hơn bình thường
        abnormality: Loại bất thường ('arrhythmia', 'tachycardia', 'bradycardia')
    """
    t = np.linspace(0, num_points / sample_rate, num_points)
    
    # Tần số tim (Hz)
    f_heart = heart_rate / 60.0
    
    # Tạo tín hiệu ECG
    qrs = np.zeros_like(t)
    rr_interval = 1.0 / f_heart
    num_beats = int(t[-1] / rr_interval)
    
    for i in range(num_beats):
        # Thêm biến thiên nhịp tim nếu là arrhythmia
        if abnormality == 'arrhythmia':
            variation = np.random.uniform(-0.1, 0.1)
            beat_time = i * rr_interval + variation
        else:
            beat_time = i * rr_interval
        
        if beat_time < 0 or beat_time > t[-1]:
            continue
            
        # QRS complex
        qrs_mask = (t >= beat_time) & (t < beat_time + 0.12)
        qrs[qrs_mask] = 2.5 * np.exp(-((t[qrs_mask] - beat_time - 0.06) / 0.025) ** 2)
        
        # P wave không rõ ràng (bất thường)
        if abnormality in ['arrhythmia', 'bradycardia']:
            p_mask = (t >= beat_time - 0.2) & (t < beat_time - 0.08)
            qrs[p_mask] += 0.2 * np.exp(-((t[p_mask] - beat_time + 0.14) / 0.04) ** 2)
        
        # T wave lớn hơn (có thể bất thường)
        t_mask = (t >= beat_time + 0.2) & (t < beat_time + 0.4)
        qrs[t_mask] += 0.6 * np.exp(-((t[t_mask] - beat_time - 0.3) / 0.06) ** 2)
    
    # Thêm noise nhiều hơn
    noise = np.random.normal(0, 0.1, num_points)
    
    # Baseline drift mạnh hơn
    baseline = 0.2 * np.sin(2 * np.pi * 0.3 * t)
    
    # Kết hợp
    ecg = qrs + noise + baseline
    
    # Convert sang ADC values
    adc_center = 512
    adc_range = 250
    
    ecg_normalized = (ecg - np.min(ecg)) / (np.max(ecg) - np.min(ecg) + 1e-8)
    ecg_adc = adc_center + (ecg_normalized - 0.5) * adc_range
    ecg_adc = np.clip(ecg_adc, 0, 1023)
    
    return ecg_adc.astype(int)


def load_ecg_from_file(filename='ecg_12s.txt'):
    """
    Load ECG từ file và convert sang ADC format
    """
    if not os.path.exists(filename):
        print(f"File {filename} không tồn tại")
        return None
    
    # Đọc file
    ecg_normalized = np.loadtxt(filename)
    
    # Convert sang ADC format (0-1023)
    adc_center = 512
    adc_range = 200
    
    # Scale từ normalized về ADC
    ecg_adc = adc_center + ecg_normalized * adc_range
    ecg_adc = np.clip(ecg_adc, 0, 1023)
    
    return ecg_adc.astype(int)


# ==================== FIREBASE SETUP ====================

def init_firebase():
    """Initialize Firebase Admin SDK"""
    try:
        # Kiểm tra xem đã initialize chưa
        firebase_admin.get_app()
        print("Firebase đã được khởi tạo")
    except ValueError:
        # Khởi tạo Firebase
        # Bạn cần tải service account key từ Firebase Console
        # Hoặc dùng database URL với quyền public (không khuyến khích cho production)
        
        # Cách 1: Dùng service account key (an toàn hơn)
        # cred = credentials.Certificate('path/to/serviceAccountKey.json')
        # firebase_admin.initialize_app(cred, {
        #     'databaseURL': 'https://heartecg-4e084-default-rtdb.firebaseio.com'
        # })
        
        # Cách 2: Dùng REST API (đơn giản hơn, nhưng cần config Firebase rules)
        print("Chưa có service account key. Sẽ dùng REST API để push data.")
        return False
    
    return True


# ==================== PUSH TO FIREBASE ====================

def push_to_firebase_rest(ecg_data, chunk_size=100, database_url='https://heartecg-4e084-default-rtdb.firebaseio.com'):
    """
    Push ECG data lên Firebase bằng REST API
    
    Args:
        ecg_data: Mảng số ECG data
        chunk_size: Kích thước mỗi chunk
        database_url: URL của Firebase Realtime Database
    """
    import requests
    
    # Chia thành chunks
    chunks = {}
    num_chunks = (len(ecg_data) + chunk_size - 1) // chunk_size
    
    for i in range(num_chunks):
        start_idx = i * chunk_size
        end_idx = min((i + 1) * chunk_size, len(ecg_data))
        chunk_data = ecg_data[start_idx:end_idx]
        
        # Convert sang string với dấu phẩy
        chunk_str = ','.join(map(str, chunk_data))
        chunks[f'chunk_{i+1}'] = chunk_str
    
    # Push lên Firebase
    # LƯU Ý: Firebase rules phải cho phép write
    # Trong Firebase Console, vào Realtime Database > Rules, set:
    # {
    #   "rules": {
    #     "ECG": {
    #       ".write": true,
    #       ".read": true
    #     }
    #   }
    # }
    
    url = f"{database_url}/ECG/raw.json"
    
    try:
        response = requests.put(url, json=chunks, params={'print': 'silent'})
        if response.status_code == 200:
            print(f"✅ Đã push {num_chunks} chunks lên Firebase thành công!")
            print(f"   Tổng số điểm dữ liệu: {len(ecg_data)}")
            return True
        else:
            print(f"❌ Lỗi khi push lên Firebase: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Lỗi khi kết nối Firebase: {str(e)}")
        print("   Hãy kiểm tra:")
        print("   1. Firebase rules cho phép write")
        print("   2. Database URL đúng")
        print("   3. Internet connection")
        return False


# ==================== MAIN ====================

def main():
    print("=" * 50)
    print("ECG Mock Data Generator")
    print("=" * 50)
    print()
    
    # Chọn loại dữ liệu
    print("Chọn loại dữ liệu ECG:")
    print("1. ECG bình thường (72 BPM)")
    print("2. ECG bất thường - Nhịp chậm (48 BPM)")
    print("3. ECG bất thường - Arrhythmia")
    print("4. Load từ file ecg_12s.txt")
    
    choice = input("Chọn (1-4): ").strip()
    
    if choice == '1':
        print("\nGenerating normal ECG...")
        ecg_data = generate_normal_ecg(num_points=5000, heart_rate=72)
        print(f"✅ Generated {len(ecg_data)} points, heart rate: 72 BPM")
    elif choice == '2':
        print("\nGenerating abnormal ECG (bradycardia)...")
        ecg_data = generate_abnormal_ecg(num_points=5000, heart_rate=48, abnormality='bradycardia')
        print(f"✅ Generated {len(ecg_data)} points, heart rate: 48 BPM")
    elif choice == '3':
        print("\nGenerating abnormal ECG (arrhythmia)...")
        ecg_data = generate_abnormal_ecg(num_points=5000, heart_rate=65, abnormality='arrhythmia')
        print(f"✅ Generated {len(ecg_data)} points, heart rate: ~65 BPM (variable)")
    elif choice == '4':
        print("\nLoading ECG from file...")
        ecg_data = load_ecg_from_file('ecg_12s.txt')
        if ecg_data is None:
            return
        print(f"✅ Loaded {len(ecg_data)} points from file")
    else:
        print("❌ Lựa chọn không hợp lệ")
        return
    
    # Hiển thị thông tin
    print(f"\nECG Data Info:")
    print(f"  Length: {len(ecg_data)} points")
    print(f"  Min: {np.min(ecg_data)}")
    print(f"  Max: {np.max(ecg_data)}")
    print(f"  Mean: {np.mean(ecg_data):.2f}")
    print(f"  Std: {np.std(ecg_data):.2f}")
    
    # Hỏi có muốn push lên Firebase không
    push = input("\nPush lên Firebase? (y/n): ").strip().lower()
    
    if push == 'y':
        print("\nPushing to Firebase...")
        success = push_to_firebase_rest(ecg_data, chunk_size=100)
        
        if success:
            print("\n✅ Hoàn thành! Bây giờ bạn có thể:")
            print("   1. Mở ứng dụng React")
            print("   2. Bấm 'Bắt đầu đo'")
            print("   3. Bấm 'Lấy dữ liệu' để tải dữ liệu từ Firebase")
            print("   4. Bấm 'Dự đoán' để phân tích")
        else:
            print("\n❌ Không thể push lên Firebase. Hãy kiểm tra cấu hình.")
    else:
        print("\nĐã generate dữ liệu nhưng không push lên Firebase.")
        print("Bạn có thể lưu vào file hoặc push sau.")


if __name__ == "__main__":
    try:
        import requests
    except ImportError:
        print("❌ Cần cài đặt requests: pip install requests")
        exit(1)
    
    main()

