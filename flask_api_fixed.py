from flask import Flask, request, jsonify
from flask_cors import CORS  # Thêm CORS support
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
        feat = torch.cat([self.global_max(x).squeeze(-1), self.global_avg(x).squeeze(-1)], dim=1)
        return self.softmax(self.fc(feat))

# ==================== ECG PREPROCESSING ====================

def preprocess_ecg_window(ecg, fs=360, global_size=450, new_fs=120):
    ecg_down = resample(ecg, int(global_size * new_fs / fs))
    return (ecg_down - np.mean(ecg_down)) / (np.std(ecg_down) + 1e-8)

def ecg_to_beats(ecg_raw, fs=360, global_size=450, new_fs=120):
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
        hb = np.pad(hb, (0, max(0, global_size - len(hb))), 'constant')[:global_size]
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
    print("WARNING: Model file 'resetECG.pth' not found. Please ensure the model file is in the same directory.")
    model.eval()  # Vẫn chạy nhưng sẽ lỗi khi predict

# ==================== FLASK API ====================

app = Flask(__name__)
CORS(app)  # Cho phép React frontend gọi API

@app.route("/predict", methods=["POST"])
def predict():
    try:
        file = request.files.get("file")
        if file is None:
            return jsonify({"error": "No ECG file uploaded"}), 400

        # Load ECG
        ecg_raw = np.loadtxt(file)

        # Validate data
        if len(ecg_raw) == 0:
            return jsonify({"error": "ECG file is empty"}), 400

        # Convert to beats
        X = ecg_to_beats(ecg_raw)

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
        print(f"Error in predict: {str(e)}")
        return jsonify({"error": f"Processing error: {str(e)}"}), 500

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "device": str(device)})

if __name__ == "__main__":
    # Chạy trên port 5001 để tránh conflict với Node.js backend (port 5000)
    app.run(host="0.0.0.0", port=5001, debug=True)

