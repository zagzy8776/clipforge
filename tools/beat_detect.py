#!/usr/bin/env python3
"""
Beat detection sidecar for ClipForge.
Analyzes audio for BPM, beat timestamps, and energy curve.

Usage:
  python beat_detect.py <audio_path> [--fps 30]

Outputs JSON:
  {
    "bpm": 120.5,
    "beats": [0.0, 0.498, 0.996, ...],
    "downbeats": [0.0, 1.992, 3.984, ...],
    "energy": [{"time": 0.0, "value": 0.45}, ...],
    "duration": 180.0
  }
"""
import sys
import json
import os
import argparse
import math

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("audio_path")
    parser.add_argument("--fps", type=int, default=30, help="Video FPS for energy alignment")
    args = parser.parse_args()

    try:
        import numpy as np
        import librosa
    except ImportError:
        # Fallback: use basic energy analysis without librosa
        fallback_detect(args.audio_path, args.fps)
        return

    y, sr = librosa.load(args.audio_path, sr=22050, mono=True)
    duration = librosa.get_duration(y=y, sr=sr)

    # BPM and beat tracking
    tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
    bpm = float(tempo) if np.isscalar(tempo) else float(tempo[0])
    beat_times = librosa.frames_to_time(beat_frames, sr=sr).tolist()

    # Downbeats (every 4 beats)
    downbeats = beat_times[::4]

    # Energy curve (RMS)
    hop_length = 512
    rms = librosa.feature.rms(y=y, hop_length=hop_length)[0]
    times = librosa.frames_to_time(range(len(rms)), sr=sr, hop_length=hop_length)

    # Downsample energy to ~10 Hz for compact representation
    target_fps = 10
    hop = max(1, int(sr / hop_length / target_fps))
    energy = []
    for i in range(0, len(rms), hop):
        energy.append({"time": round(float(times[i]), 3), "value": round(float(rms[i]), 4)})

    result = {
        "bpm": round(bpm, 1),
        "beats": [round(b, 3) for b in beat_times],
        "downbeats": [round(b, 3) for b in downbeats],
        "energy": energy,
        "duration": round(duration, 3),
        "onset_strength": compute_onset_envelope(y, sr),
    }
    print(json.dumps(result))


def compute_onset_envelope(y, sr):
    """Compute onset strength envelope for beat-synced effects."""
    try:
        import librosa
        import numpy as np
        onset_env = librosa.onset.onset_strength(y=y, sr=sr)
        times = librosa.frames_to_time(range(len(onset_env)), sr=sr)
        # Downsample to ~10 Hz
        hop = max(1, len(onset_env) // (len(onset_env) // 10))
        result = []
        for i in range(0, len(onset_env), hop):
            result.append({"time": round(float(times[i]), 3), "value": round(float(onset_env[i]), 4)})
        return result
    except Exception:
        return []


def fallback_detect(audio_path, fps):
    """Basic energy-based detection without librosa."""
    import struct
    import wave

    try:
        with wave.open(audio_path, 'rb') as wf:
            frames = wf.readframes(wf.getnframes())
            sr = wf.getframerate()
            n_channels = wf.getnchannels()
            sampwidth = wf.getsampwidth()
    except Exception:
        # Not a WAV — just return empty
        print(json.dumps({"bpm": 0, "beats": [], "downbeats": [], "energy": [], "duration": 0}))
        return

    # Convert to mono samples
    if sampwidth == 2:
        samples = struct.unpack(f'<{len(frames)//2}h', frames)
    else:
        print(json.dumps({"bpm": 0, "beats": [], "downbeats": [], "energy": [], "duration": 0}))
        return

    if n_channels > 1:
        samples = samples[::n_channels]

    duration = len(samples) / sr

    # Compute energy in 0.1s windows
    window_size = sr // 10
    energy = []
    for i in range(0, len(samples), window_size):
        chunk = samples[i:i+window_size]
        if chunk:
            rms = math.sqrt(sum(s*s for s in chunk) / len(chunk)) / 32768
            energy.append({"time": round(i / sr, 3), "value": round(min(1.0, rms * 3), 4)})

    # Simple tempo estimation from energy peaks
    bpm = estimate_bpm(energy)

    result = {
        "bpm": round(bpm, 1),
        "beats": [],
        "downbeats": [],
        "energy": energy,
        "duration": round(duration, 3),
    }
    print(json.dumps(result))


def estimate_bpm(energy):
    """Estimate BPM from energy peaks using autocorrelation."""
    if len(energy) < 10:
        return 0
    vals = [e["value"] for e in energy]
    n = len(vals)
    # Normalize
    mean_val = sum(vals) / n
    vals = [v - mean_val for v in vals]
    # Autocorrelation
    best_corr = 0
    best_lag = 0
    for lag in range(3, min(n // 2, 60)):  # 3-60 frames at 10fps = 0.3s-6s period
        corr = sum(vals[i] * vals[i + lag] for i in range(n - lag)) / (n - lag)
        if corr > best_corr:
            best_corr = corr
            best_lag = lag
    if best_lag > 0:
        period_sec = best_lag / 10  # 10 Hz energy rate
        return 60.0 / period_sec
    return 0


if __name__ == "__main__":
    main()
