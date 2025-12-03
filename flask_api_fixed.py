from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import torch
import torch.nn as nn
from scipy.signal import find_peaks, resample

# ==================== MODEL ====================

class Swish(nn.Module):
    def forward(self, x):
        return x * torch.sigmoid(x)

class ResBlock(nn.Module):
    def __init__(self, in_channels, out_channels, kernel_size=3, stride=1):
        super().__init__()
        self.conv1 = nn.Conv1d(in_channels, out_channels, kernel_size, stride, padding=kernel_size//2)
        self.bn1 = nn.BatchNorm1d(out_channels)

        self.conv2 = nn.Conv1d(out_channels, out_channels, kernel_size, stride, padding=kernel_size//2)
        self.bn2 = nn.BatchNorm1d(out_channels)

        self.conv3 = nn.Conv1d(out_channels, out_channels, kernel_size, stride, padding=kernel_size//2)
        self.bn3 = nn.BatchNorm1d(out_channels)

        self.shortcut = nn.Sequential()
        if in_channels != out_channels:
            self.shortcut = nn.Sequential(
                nn.Conv1d(in_channels, out_channels, kernel_size=1),
                nn.BatchNorm1d(out_channels)
            )

        self.swish = Swish()

    def forward(self, x):
        identity = x
        out = self.swish(self.bn1(self.conv1(x)))
        out = self.swish(self.bn2(self.conv2(out)))
        out = self.bn3(self.conv3(out))
        out += self.shortcut(identity)
        return self.swish(out)

class ECGResNet(nn.Module):
    def __init__(self, num_classes=5):
        super().__init__()
        self.block1 = ResBlock(1, 32)
        self.block2 = ResBlock(32, 64)
        self.block3 = ResBlock(64, 128)

        self.global_max = nn.AdaptiveMaxPool1d(1)
        self.global_avg = nn.AdaptiveAvgPool1d(1)

        self.fc = nn.Linear(128*2, num_classes)
        self.softmax = nn.Softmax(dim=1)

    def forward(self, x):
        x = self.block1(x)
        x = self.block2(x)
        x = self.block3(x)

        feat = torch.cat([
            self.global_max(x).squeeze(-1),
            self.global_avg(x).squeeze(-1)
        ], dim=1)

        return self.softmax(self.fc(feat))


# ==================== ECG PREPROCESSING ====================
# DỮ LIỆU ĐẦU VÀO MẶC ĐỊNH LÀ 250Hz → giảm về 120Hz

def preprocess_ecg_window(ecg, fs=250, global_size=450, new_fs=120):
    """Resample heartbeat từ 250Hz → 120Hz"""
    new_length = int(global_size * new_fs / fs)
    ecg_down = resample(ecg, new_length)
    return (ecg_down - np.mean(ecg_down)) / (np.std(ecg_down) + 1e-8)


def ecg_to_beats(ecg_raw, fs=250, global_size=450, new_fs=120):
    """
    Dò R-peak → cắt nhịp → resample 250Hz → 120Hz
    """
    peaks, _ = find_peaks(ecg_raw, distance=int(0.25 * fs))
    if len(peaks) < 2:
        return np.array([])

    rr = np.diff(peaks)
    hb_size = int(np.mean(rr))

    beats = []
    for p in peaks:
        start = p - hb_size // 2
        end = p + hb_size // 2

        if start < 0 or end > len(ecg_raw):
            continue

        hb = ecg_raw[start:end]

        # Pad để đủ 450 samples trước khi resample
        hb = np.pad(hb, (0, max(0, global_size - len(hb))), 'constant')[:global_size]

        # RESAMPLE 250Hz → 120Hz
        beats.append(preprocess_ecg_window(hb, fs, global_size, new_fs))

    return np.array(beats)


# ==================== LOAD MODEL ====================

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = ECGResNet(num_classes=5).to(device)

try:
    model.load_state_dict(torch.load("resetECG.pth", map_location=device))
    model.eval()
    print(f"Model loaded successfully on {device}")
except FileNotFoundError:
    print("WARNING: Model file 'resetECG.pth' not found.")
    model.eval()


# ==================== FLASK API ====================

app = Flask(__name__)
CORS(app)

@app.route("/predict", methods=["POST"])
def predict():
    try:
        file = request.files.get("file")
        if file is None:
            return jsonify({"error": "No ECG file uploaded"}), 400

        ecg_raw = np.loadtxt(file)

        if len(ecg_raw) == 0:
            return jsonify({"error": "ECG file is empty"}), 400

        # Convert to beats
        X = ecg_to_beats(ecg_raw, fs=250, new_fs=120)
        if len(X) == 0:
            return jsonify({"error": "ECG too noisy or no R-peaks detected"}), 400

        X_tensor = torch.tensor(X, dtype=torch.float32).unsqueeze(1).to(device)

        with torch.no_grad():
            outputs = model(X_tensor)
            preds = torch.argmax(outputs, dim=1).cpu().numpy()

        final_pred = np.bincount(preds).argmax()
        mean_prob = outputs.mean(dim=0).cpu().numpy().tolist()

        return jsonify({
            "per_beat_predictions": preds.tolist(),
            "final_prediction": int(final_pred),
            "class_confidence": mean_prob
        })

    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({"error": f"Processing error: {str(e)}"}), 500


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "device": str(device)})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)





# import torch
# import torch.nn as nn
# import torch.nn.functional as F
# from scipy.signal import find_peaks, resample
# from flask import Flask, request, jsonify
# from flask_cors import CORS
# import numpy as np
# import os

# app = Flask(__name__)
# CORS(app)

# # -----------------------------
# # 1. Định nghĩa mô hình
# # -----------------------------
# class ResNet1DBlock(nn.Module):
#     def __init__(self, in_channels):
#         super(ResNet1DBlock, self).__init__()
#         self.conv1 = nn.Conv1d(in_channels, in_channels, kernel_size=3, padding=1)
#         self.bn1 = nn.BatchNorm1d(in_channels)

#         self.conv2 = nn.Conv1d(in_channels, in_channels, kernel_size=3, padding=1)
#         self.bn2 = nn.BatchNorm1d(in_channels)

#     def forward(self, x):
#         identity = x
#         out = F.relu(self.bn1(self.conv1(x)))
#         out = self.bn2(self.conv2(out))
#         out += identity
#         return F.relu(out)


# class CustomResNet1D(nn.Module):
#     def __init__(self, num_classes=2):
#         super(CustomResNet1D, self).__init__()

#         self.conv1 = nn.Conv1d(1200, 1200, kernel_size=3, padding=1)
#         self.bn1 = nn.BatchNorm1d(1200)

#         self.resnet_blocks = nn.Sequential(
#             ResNet1DBlock(1200),
#             ResNet1DBlock(1200),
#             ResNet1DBlock(1200)
#         )

#         self.global_pool = nn.AdaptiveAvgPool1d(1)
#         self.fc = nn.Linear(1200, num_classes)

#     def forward(self, x):
#         out = F.relu(self.bn1(self.conv1(x)))
#         out = self.resnet_blocks(out)
#         out = self.global_pool(out)
#         out = out.squeeze(-1)
#         return torch.sigmoid(self.fc(out))


# # -----------------------------
# # 2. Load mô hình
# # -----------------------------
# device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
# MODEL_PATH = "ré.pth"

# model = CustomResNet1D().to(device)
# if os.path.exists(MODEL_PATH):
#     model.load_state_dict(torch.load(MODEL_PATH, map_location=device))
#     print(">>> Model loaded thành công!")
# else:
#     print(">>> KHÔNG tìm thấy model_final.pth – server vẫn chạy nhưng inference sẽ lỗi.")

# model.eval()

# # -----------------------------
# # 3. Xử lý ECG
# # -----------------------------
# def detect_r_peaks(ecg_signal, sampling_rate=250):
#     """Tìm R-peaks trong tín hiệu ECG raw 250Hz"""
#     peaks, _ = find_peaks(ecg_signal, distance=int(0.2 * sampling_rate))
#     return peaks


# def extract_heartbeat(ecg_signal, r_peaks, window_size=250):
#     """Cắt nhịp tim từng R-peak"""
#     beats = []
#     half = window_size // 2

#     for r in r_peaks:
#         start = max(0, r - half)
#         end = min(len(ecg_signal), r + half)
#         beat = ecg_signal[start:end]

#         if len(beat) < window_size:
#             beat = np.pad(beat, (0, window_size - len(beat)), mode='constant')

#         beats.append(beat)

#     return np.array(beats)


# def preprocess_beat(beat):
#     """Resample từ 250Hz → 120Hz"""
#     target_length = 120  
#     processed = resample(beat, target_length)
#     return processed


# # -----------------------------
# # 4. API
# # -----------------------------
# @app.route('/predict', methods=['POST'])
# def predict():
#     if 'file' not in request.files:
#         return jsonify({"error": "Không có file tải lên"}), 400

#     file = request.files['file']
#     try:
#         ecg_raw = np.loadtxt(file)
#     except:
#         return jsonify({"error": "File không hợp lệ"}), 400

#     # 1) R-peaks
#     r_peaks = detect_r_peaks(ecg_raw, sampling_rate=250)

#     # 2) Cắt nhịp
#     beats = extract_heartbeat(ecg_raw, r_peaks)

#     # 3) Resample từng nhịp từ 250 → 120
#     beats = np.array([preprocess_beat(b) for b in beats])

#     # 4) Reshape cho đúng input model
#     beats = beats.reshape(beats.shape[0], -1)

#     # 5) Định dạng cho PyTorch
#     input_tensor = torch.tensor([beats], dtype=torch.float32).to(device)

#     # 6) Inference
#     with torch.no_grad():
#         output = model(input_tensor)

#     prediction = torch.argmax(output, dim=1).item()
#     confidence = torch.max(output).item()

#     return jsonify({
#         "prediction": int(prediction),
#         "confidence": float(confidence)
#     })


# @app.route('/health', methods=['GET'])
# def health():
#     return jsonify({"status": "Server đang chạy"})


# # -----------------------------
# # 5. Run server
# # -----------------------------
# if __name__ == '__main__':
#     app.run(host="0.0.0.0", port=5001)

