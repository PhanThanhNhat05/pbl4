"""
Script test nhanh - Generate và push dữ liệu ECG giả lên Firebase
"""

import numpy as np
import requests
import time

def generate_normal_ecg(num_points=5000, heart_rate=72):
    """Generate ECG signal bình thường"""
    t = np.linspace(0, num_points / 360, num_points)
    f_heart = heart_rate / 60.0
    qrs = np.zeros_like(t)
    rr_interval = 1.0 / f_heart
    num_beats = int(t[-1] / rr_interval)
    
    for i in range(num_beats):
        beat_time = i * rr_interval
        qrs_mask = (t >= beat_time) & (t < beat_time + 0.1)
        qrs[qrs_mask] = 2.0 * np.exp(-((t[qrs_mask] - beat_time - 0.05) / 0.02) ** 2)
        
        p_mask = (t >= beat_time - 0.15) & (t < beat_time - 0.05)
        qrs[p_mask] += 0.3 * np.exp(-((t[p_mask] - beat_time + 0.1) / 0.03) ** 2)
        
        t_mask = (t >= beat_time + 0.15) & (t < beat_time + 0.35)
        qrs[t_mask] += 0.5 * np.exp(-((t[t_mask] - beat_time - 0.25) / 0.05) ** 2)
    
    noise = np.random.normal(0, 0.05, num_points)
    baseline = 0.1 * np.sin(2 * np.pi * 0.5 * t)
    ecg = qrs + noise + baseline
    
    adc_center = 512
    adc_range = 200
    ecg_normalized = (ecg - np.min(ecg)) / (np.max(ecg) - np.min(ecg) + 1e-8)
    ecg_adc = adc_center + (ecg_normalized - 0.5) * adc_range
    ecg_adc = np.clip(ecg_adc, 0, 1023)
    
    return ecg_adc.astype(int)

def push_to_firebase(ecg_data, chunk_size=100):
    """Push ECG data lên Firebase"""
    chunks = {}
    num_chunks = (len(ecg_data) + chunk_size - 1) // chunk_size
    
    for i in range(num_chunks):
        start_idx = i * chunk_size
        end_idx = min((i + 1) * chunk_size, len(ecg_data))
        chunk_data = ecg_data[start_idx:end_idx]
        chunk_str = ','.join(map(str, chunk_data))
        chunks[f'chunk_{i+1}'] = chunk_str
    
    url = "https://heartecg-4e084-default-rtdb.firebaseio.com/ECG/raw.json"
    
    try:
        response = requests.put(url, json=chunks, params={'print': 'silent'}, timeout=10)
        if response.status_code == 200:
            print(f"✅ Đã push {num_chunks} chunks ({len(ecg_data)} points) lên Firebase!")
            return True
        else:
            print(f"❌ Lỗi: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Lỗi: {str(e)}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("Test Mock ECG Data Generator")
    print("=" * 60)
    print()
    
    print("Generating normal ECG (72 BPM, 5000 points)...")
    ecg_data = generate_normal_ecg(num_points=5000, heart_rate=72)
    
    print(f"✅ Generated: {len(ecg_data)} points")
    print(f"   Range: {np.min(ecg_data)} - {np.max(ecg_data)}")
    print(f"   Mean: {np.mean(ecg_data):.2f}")
    print()
    
    print("Pushing to Firebase...")
    if push_to_firebase(ecg_data):
        print()
        print("=" * 60)
        print("✅ HOÀN THÀNH!")
        print("=" * 60)
        print()
        print("Bây giờ bạn có thể:")
        print("1. Mở ứng dụng React")
        print("2. Bấm 'Bắt đầu đo'")
        print("3. Bấm 'Lấy dữ liệu'")
        print("4. Bấm 'Dự đoán'")
        print()
    else:
        print()
        print("❌ Không thể push lên Firebase.")
        print("Hãy kiểm tra:")
        print("1. Firebase rules cho phép write")
        print("2. Internet connection")
        print("3. Xem file TEST_WITHOUT_DEVICE.md để biết thêm")

