from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import torch
import torch.nn as nn
from scipy.signal import find_peaks, resample, butter, filtfilt

# =========================================================
# MODEL
# =========================================================

class Swish(nn.Module):
    def forward(self, x):
        return x * torch.sigmoid(x)


class ResBlock(nn.Module):
    def __init__(self, in_channels, out_channels):
        super().__init__()
        self.conv1 = nn.Conv1d(in_channels, out_channels, 3, padding=1)
        self.bn1 = nn.BatchNorm1d(out_channels)
        self.conv2 = nn.Conv1d(out_channels, out_channels, 3, padding=1)
        self.bn2 = nn.BatchNorm1d(out_channels)
        self.conv3 = nn.Conv1d(out_channels, out_channels, 3, padding=1)
        self.bn3 = nn.BatchNorm1d(out_channels)

        self.shortcut = nn.Sequential()
        if in_channels != out_channels:
            self.shortcut = nn.Sequential(
                nn.Conv1d(in_channels, out_channels, 1),
                nn.BatchNorm1d(out_channels)
            )

        self.act = Swish()

    def forward(self, x):
        identity = x
        out = self.act(self.bn1(self.conv1(x)))
        out = self.act(self.bn2(self.conv2(out)))
        out = self.bn3(self.conv3(out))
        out += self.shortcut(identity)
        return self.act(out)


class ECGResNet(nn.Module):
    def __init__(self, num_classes=5):
        super().__init__()
        self.block1 = ResBlock(1, 32)
        self.block2 = ResBlock(32, 64)
        self.block3 = ResBlock(64, 128)

        self.gmp = nn.AdaptiveMaxPool1d(1)
        self.gap = nn.AdaptiveAvgPool1d(1)
        self.fc = nn.Linear(256, num_classes)
        self.softmax = nn.Softmax(dim=1)

    def forward(self, x):
        x = self.block1(x)
        x = self.block2(x)
        x = self.block3(x)
        feat = torch.cat([
            self.gmp(x).squeeze(-1),
            self.gap(x).squeeze(-1)
        ], dim=1)
        return self.softmax(self.fc(feat))


# =========================================================
# ECG PREPROCESSING
# =========================================================

def preprocess_adc(ecg_adc):
    ecg = np.asarray(ecg_adc, dtype=np.float32)
    ecg -= np.mean(ecg)
    ecg /= 512.0
    return ecg


def bandpass_filter(ecg, fs, low=0.5, high=40.0):
    nyq = 0.5 * fs
    b, a = butter(4, [low / nyq, high / nyq], btype="band")
    return filtfilt(b, a, ecg)


def ecg_to_beats(ecg_adc, fs=250, global_size=450, new_fs=120):
    ecg = preprocess_adc(ecg_adc)
    ecg = bandpass_filter(ecg, fs)

    peaks, _ = find_peaks(ecg, distance=int(0.25 * fs))
    if len(peaks) < 2:
        return np.array([])

    rr = np.diff(peaks)
    hb_size = int(np.mean(rr))

    beats = []
    for p in peaks:
        s = p - hb_size // 2
        e = p + hb_size // 2
        if s < 0 or e > len(ecg):
            continue

        hb = ecg[s:e]
        hb = np.pad(hb, (0, max(0, global_size - len(hb))), "constant")[:global_size]
        hb = resample(hb, int(global_size * new_fs / fs))
        hb = (hb - hb.mean()) / (hb.std() + 1e-8)
        beats.append(hb[:150])

    return np.array(beats)


# =========================================================
# LOAD MODEL
# =========================================================

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = ECGResNet(num_classes=5).to(device)

model_loaded = False
try:
    model.load_state_dict(torch.load("resetECG_new.pth", map_location=device))
    model.eval()
    model_loaded = True
    print(f"✓ Model loaded on {device}")
except Exception as e:
    print(f"⚠ Model load failed: {e}")
    model.eval()


# =========================================================
# FLASK API
# =========================================================

app = Flask(__name__)
CORS(app)


@app.route("/predict", methods=["POST"])
def predict():
    try:
        file = request.files.get("file")
        if file is None:
            return jsonify({"error": "No ECG file uploaded"}), 400

        ecg_adc = np.loadtxt(file)
        if len(ecg_adc) == 0:
            return jsonify({"error": "Empty ECG file"}), 400

        beats = ecg_to_beats(ecg_adc)
        if len(beats) == 0:
            return jsonify({
                "beats": 0,
                "per_beat_predictions": [],
                "beat_confidence": [],
                "final_prediction": -1
            })

        X = torch.tensor(beats, dtype=torch.float32).unsqueeze(1).to(device)

        if not model_loaded:
            return jsonify({
                "beats": len(beats),
                "per_beat_predictions": [0] * len(beats),
                "beat_confidence": [0.0] * len(beats),
                "final_prediction": 0
            })

        with torch.no_grad():
            outputs = model(X)
            probs = outputs.cpu().numpy()
            preds = probs.argmax(axis=1)

        final_pred = int(np.bincount(preds).argmax())
        beat_confidence = probs.max(axis=1).tolist()
        mean_prob = probs.mean(axis=0)

        return jsonify({
            "beats": len(preds),
            "per_beat_predictions": preds.tolist(),
            "beat_confidence": beat_confidence,
            "final_prediction": final_pred,
            "class_confidence": mean_prob.tolist(),
            "confidence": float(mean_prob[final_pred])
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "device": str(device)
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
