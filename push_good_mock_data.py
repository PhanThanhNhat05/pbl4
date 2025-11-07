"""
Script đơn giản để push dữ liệu ECG bình thường (72 BPM) lên Firebase
Dùng để test khi không có thiết bị đo
"""

import numpy as np
import requests
import time
import sys
import io

# Fix encoding cho Windows PowerShell
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def generate_good_ecg(num_points=10000, heart_rate=72, sample_rate=360):
    """
    Generate ECG signal tốt, liên tục, có nhiều nhịp tim
    """
    print(f"Generating ECG: {num_points} points, {heart_rate} BPM, {sample_rate} Hz...")
    
    # Thời gian
    duration = num_points / sample_rate  # seconds
    t = np.linspace(0, duration, num_points)
    
    # Tần số tim (Hz)
    f_heart = heart_rate / 60.0
    rr_interval = 1.0 / f_heart  # Khoảng cách giữa các nhịp (seconds)
    
    # Tạo tín hiệu ECG
    ecg = np.zeros(num_points)
    
    # Số lượng nhịp tim trong dữ liệu
    num_beats = int(duration * f_heart)
    print(f"  Số nhịp tim: {num_beats} beats")
    
    # Tạo từng nhịp tim
    for beat_idx in range(num_beats):
        # Thời gian của nhịp tim này
        beat_time = beat_idx * rr_interval
        
        # Chỉ tạo nhịp nếu nằm trong khoảng dữ liệu
        if beat_time >= duration:
            break
            
        # Tìm index trong mảng t
        beat_idx_array = int(beat_time * sample_rate)
        if beat_idx_array >= num_points:
            break
        
        # === P WAVE (trước QRS) ===
        p_start = beat_idx_array - int(0.15 * sample_rate)
        p_end = beat_idx_array - int(0.05 * sample_rate)
        if p_start >= 0:
            for i in range(max(0, p_start), min(num_points, p_end)):
                p_time = (i - beat_idx_array) / sample_rate
                p_value = 0.3 * np.exp(-((p_time + 0.1) / 0.03) ** 2)
                ecg[i] += p_value
        
        # === QRS COMPLEX (chính) ===
        qrs_start = beat_idx_array - int(0.02 * sample_rate)
        qrs_end = beat_idx_array + int(0.08 * sample_rate)
        for i in range(max(0, qrs_start), min(num_points, qrs_end)):
            qrs_time = (i - beat_idx_array) / sample_rate
            # Tạo QRS với shape giống thật
            if -0.02 <= qrs_time <= 0:
                # Q wave (âm)
                qrs_value = -0.5 * np.exp(-((qrs_time + 0.01) / 0.005) ** 2)
            elif 0 < qrs_time <= 0.04:
                # R wave (dương, cao nhất)
                qrs_value = 2.5 * np.exp(-((qrs_time - 0.02) / 0.01) ** 2)
            elif 0.04 < qrs_time <= 0.08:
                # S wave (âm)
                qrs_value = -0.8 * np.exp(-((qrs_time - 0.06) / 0.01) ** 2)
            else:
                qrs_value = 0
            ecg[i] += qrs_value
        
        # === T WAVE (sau QRS) ===
        t_start = beat_idx_array + int(0.15 * sample_rate)
        t_end = beat_idx_array + int(0.4 * sample_rate)
        for i in range(max(0, t_start), min(num_points, t_end)):
            t_time = (i - beat_idx_array) / sample_rate
            t_value = 0.6 * np.exp(-((t_time - 0.275) / 0.06) ** 2)
            ecg[i] += t_value
    
    # Thêm noise nhẹ (giống nhiễu thực tế)
    noise = np.random.normal(0, 0.03, num_points)
    ecg += noise
    
    # Thêm baseline drift nhẹ
    baseline = 0.05 * np.sin(2 * np.pi * 0.3 * t)
    ecg += baseline
    
    # Convert sang ADC values (0-1023)
    # Center tại 512, range khoảng 300
    adc_center = 512
    adc_range = 300
    
    # Normalize về -1 đến 1
    ecg_min = np.min(ecg)
    ecg_max = np.max(ecg)
    ecg_range = ecg_max - ecg_min
    if ecg_range > 0:
        ecg_normalized = 2 * (ecg - ecg_min) / ecg_range - 1
    else:
        ecg_normalized = ecg
    
    # Scale về ADC range
    ecg_adc = adc_center + ecg_normalized * (adc_range / 2)
    ecg_adc = np.clip(ecg_adc, 0, 1023)
    
    return ecg_adc.astype(int)


def push_to_firebase(ecg_data, chunk_size=100):
    """
    Push ECG data lên Firebase Realtime Database
    """
    print(f"\nPreparing to push {len(ecg_data)} points to Firebase...")
    
    # Chia thành chunks
    chunks = {}
    num_chunks = (len(ecg_data) + chunk_size - 1) // chunk_size
    
    print(f"  Chia thành {num_chunks} chunks (mỗi chunk {chunk_size} points)...")
    
    for i in range(num_chunks):
        start_idx = i * chunk_size
        end_idx = min((i + 1) * chunk_size, len(ecg_data))
        chunk_data = ecg_data[start_idx:end_idx]
        
        # Convert sang string với dấu phẩy
        chunk_str = ','.join(map(str, chunk_data))
        chunks[f'chunk_{i+1}'] = chunk_str
        
        if (i + 1) % 10 == 0:
            print(f"  Đã chuẩn bị {i + 1}/{num_chunks} chunks...")
    
    # Push lên Firebase
    url = "https://heartecg-4e084-default-rtdb.firebaseio.com/ECG/raw.json"
    
    print(f"\nPushing {num_chunks} chunks to Firebase...")
    
    try:
        response = requests.put(url, json=chunks, params={'print': 'silent'}, timeout=30)
        
        # HTTP 200 và 204 đều là thành công
        # 204 = No Content (Firebase trả về khi PUT thành công)
        if response.status_code in [200, 204]:
            print(f"✅ THÀNH CÔNG! Đã push {num_chunks} chunks lên Firebase")
            print(f"   Tổng số điểm dữ liệu: {len(ecg_data)}")
            print(f"   Thời gian dữ liệu: {len(ecg_data) / 360:.2f} seconds")
            if response.status_code == 204:
                print(f"   (HTTP 204 = No Content - thành công bình thường)")
            return True
        else:
            print(f"❌ Lỗi HTTP {response.status_code}")
            print(f"   Response: {response.text[:200] if response.text else 'No response body'}")
            return False
            
    except requests.exceptions.Timeout:
        print("❌ Timeout - Kết nối Firebase quá lâu")
        print("   Hãy kiểm tra Internet connection")
        return False
    except Exception as e:
        print(f"❌ Lỗi: {str(e)}")
        print("\nHãy kiểm tra:")
        print("1. Firebase rules cho phép write (xem TEST_WITHOUT_DEVICE.md)")
        print("2. Internet connection")
        print("3. Database URL đúng")
        return False


def main():
    print("=" * 70)
    print("PUSH MOCK ECG DATA TO FIREBASE")
    print("=" * 70)
    print()
    
    # Generate ECG data tốt
    # 10000 points = ~27.8 seconds @ 360Hz = ~33 beats @ 72 BPM
    ecg_data = generate_good_ecg(
        num_points=10000,  # ~28 giây dữ liệu
        heart_rate=72,     # Nhịp tim bình thường
        sample_rate=360    # Tần số lấy mẫu
    )
    
    print(f"\n✅ Generated ECG data:")
    print(f"   Length: {len(ecg_data)} points")
    print(f"   Min: {np.min(ecg_data)}")
    print(f"   Max: {np.max(ecg_data)}")
    print(f"   Mean: {np.mean(ecg_data):.2f}")
    print(f"   Std: {np.std(ecg_data):.2f}")
    print(f"   Duration: {len(ecg_data) / 360:.2f} seconds")
    
    # Push lên Firebase
    print()
    success = push_to_firebase(ecg_data, chunk_size=100)
    
    if success:
        print()
        print("=" * 70)
        print("✅ HOÀN THÀNH!")
        print("=" * 70)
        print()
        print("Bây giờ bạn có thể test trên React app:")
        print()
        print("1. Mở ứng dụng React (cd client && npm start)")
        print("2. Đăng nhập vào hệ thống")
        print("3. Bấm 'Bắt đầu đo' (không cần thiết bị)")
        print("4. Bấm 'Lấy dữ liệu' (sẽ tải từ Firebase)")
        print("5. Đợi vài giây để dữ liệu load")
        print("6. Bấm 'Dự đoán' (sẽ gọi Flask API)")
        print()
        print("Kết quả mong đợi:")
        print("  - Nhịp tim: ~72 BPM")
        print("  - Dự đoán: Normal")
        print("  - Risk level: Low")
        print("  - Đồ thị ECG: Hiển thị đầy đủ, liên tục")
        print()
    else:
        print()
        print("=" * 70)
        print("❌ THẤT BẠI")
        print("=" * 70)
        print()
        print("Hãy xem file TEST_WITHOUT_DEVICE.md để biết cách:")
        print("1. Cấu hình Firebase rules")
        print("2. Kiểm tra kết nối")
        print()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nĐã hủy bởi người dùng")
    except Exception as e:
        print(f"\n\n❌ Lỗi không mong đợi: {str(e)}")
        import traceback
        traceback.print_exc()

