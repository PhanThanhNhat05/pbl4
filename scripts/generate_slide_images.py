#!/usr/bin/env python3
"""
Generate waveform images, class distribution chart and assemble simple slide PNGs.
Creates output in ./slides_images/ and packs them into slides_images.zip
"""
import os
import re
import zipfile
from pathlib import Path

import numpy as np
import matplotlib.pyplot as plt


OUT_DIR = Path("slides_images")
OUT_DIR.mkdir(exist_ok=True)


def extract_floats_from_file(path):
    text = Path(path).read_text()
    # find floats in scientific or decimal notation
    tokens = re.findall(r"[-+]?\d*\.\d+(?:[eE][-+]?\d+)?|[-+]?\d+", text)
    arr = np.array([float(x) for x in tokens], dtype=float)
    return arr


def load_ecg(path="ecg_12s.txt"):
    if Path(path).exists():
        try:
            arr = extract_floats_from_file(path)
            if arr.size == 0:
                raise ValueError("no floats parsed")
            return arr
        except Exception as e:
            print(f"warning: failed to parse '{path}': {e}")
    # fallback: synthetic 12s ECG-like signal (sinusoids + pulses)
    fs = 250
    t = np.linspace(0, 12, 12 * fs)
    base = 0.2 * np.sin(2 * np.pi * 1.0 * t) + 0.05 * np.random.randn(len(t))
    # add simple QRS-like pulses
    for beat in np.arange(0.3, 12, 0.8):
        idx = int(beat * fs)
        if 0 <= idx < len(base):
            base[idx:idx+3] += np.array([0.6, 1.0, 0.5])
    return base


def normalize(x):
    x = np.array(x, dtype=float)
    x = (x - np.mean(x)) / (np.std(x) + 1e-9)
    return x


def save_waveform(signal, fs, out_path, title=None, figsize=(8,2)):
    t = np.arange(len(signal)) / fs
    plt.figure(figsize=figsize)
    plt.plot(t, signal, linewidth=0.8, color="#1f77b4")
    plt.xlim(t[0], t[-1])
    plt.xlabel("Time (s)")
    plt.ylabel("Amplitude")
    if title:
        plt.title(title)
    plt.tight_layout()
    plt.savefig(out_path, dpi=150)
    plt.close()


def make_variants(base, fs=250):
    base = normalize(base)
    variants = {}
    # Normal
    variants["Normal"] = base
    # AFib-ish: irregular timing by resampling with jitter
    t = np.arange(len(base)) / fs
    jitter = 1.0 + 0.08 * np.random.randn(len(t))
    twarp = np.cumsum(jitter)
    twarp = (twarp - twarp.min()) / (twarp.max() - twarp.min()) * t[-1]
    afib = np.interp(t, twarp, base)
    variants["AFib"] = normalize(afib)
    # PVC-like: add sporadic large spikes
    pvc = base.copy()
    rng = np.random.default_rng(42)
    for pos in rng.integers(100, len(base)-100, size=6):
        pvc[pos:pos+3] += np.array([0.8, 1.2, 0.7]) * (0.8 + 0.4*rng.random())
    variants["PVC"] = normalize(pvc)
    # ST change: baseline shift and slope
    st = base + 0.3 * np.sin(np.linspace(0, 2*np.pi, len(base))) * 0.2
    st += 0.2  # baseline offset
    variants["ST_change"] = normalize(st)
    # Noise / Artifact
    noise = base + 0.6 * np.random.randn(len(base))
    variants["Noise"] = normalize(noise)
    return variants


def make_class_distribution_chart(counts, labels, out_path):
    plt.figure(figsize=(6,4))
    bars = plt.bar(labels, counts, color=["#4c72b0","#55a868","#c44e52","#8172b2","#ccb974"])
    plt.ylabel("Number of samples")
    plt.title("Class distribution (example)")
    for bar, c in zip(bars, counts):
        h = bar.get_height()
        plt.text(bar.get_x() + bar.get_width()/2, h + max(counts)*0.01, f"{c}", ha="center")
    plt.tight_layout()
    plt.savefig(out_path, dpi=150)
    plt.close()


def assemble_slides(variant_files, dist_file):
    # Title slide
    plt.figure(figsize=(11,6))
    plt.axis("off")
    plt.text(0.5, 0.6, "Phân tích dữ liệu huấn luyện & Giao diện hệ thống", ha="center", va="center", fontsize=20)
    plt.text(0.5, 0.45, "Dự án PBL — (tên nhóm) — (dd/mm/yyyy)", ha="center", va="center", fontsize=14, color="gray")
    plt.tight_layout()
    plt.savefig(OUT_DIR / "slide_1_title.png", dpi=150)
    plt.close()

    # Examples slide (show waveforms)
    n = len(variant_files)
    fig, axes = plt.subplots(1, n, figsize=(16, 2.6), sharey=True)
    if n == 1:
        axes = [axes]
    for ax, (label, path) in zip(axes, variant_files.items()):
        img = plt.imread(path)
        ax.imshow(img)
        ax.axis("off")
        ax.set_title(label)
    plt.tight_layout()
    plt.savefig(OUT_DIR / "slide_3_examples.png", dpi=150)
    plt.close()

    # Distribution slide
    plt.figure(figsize=(11,6))
    img = plt.imread(dist_file)
    plt.imshow(img)
    plt.axis("off")
    plt.title("Phân bố 5 nhãn (imbalanced)")
    plt.tight_layout()
    plt.savefig(OUT_DIR / "slide_4_distribution.png", dpi=150)
    plt.close()


def make_zip(out_dir=OUT_DIR, zip_name="slides_images.zip"):
    zip_path = out_dir / zip_name
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for p in sorted(out_dir.glob("*.png")):
            zf.write(p, arcname=p.name)
    return zip_path


def main():
    print("Loading base ECG signal...")
    base = load_ecg("ecg_12s.txt")
    fs = 250
    print("Making variants...")
    variants = make_variants(base, fs=fs)

    variant_files = {}
    for label, sig in variants.items():
        fname = OUT_DIR / f"waveform_{label}.png"
        save_waveform(sig, fs, fname, title=f"{label} (example)")
        variant_files[label] = str(fname)
        print(f"Saved {fname}")

    print("Creating class distribution chart...")
    counts = [500, 200, 150, 100, 50]
    labels = ["Normal", "AFib", "PVC", "ST_change", "Noise"]
    dist_path = OUT_DIR / "class_distribution.png"
    make_class_distribution_chart(counts, labels, dist_path)
    print(f"Saved {dist_path}")

    print("Assembling slide images...")
    assemble_slides(variant_files, str(dist_path))
    print("Slides assembled.")

    print("Creating zip archive...")
    zip_path = make_zip()
    print(f"Created {zip_path}")


if __name__ == "__main__":
    main()





