#!/usr/bin/env python3
"""
Face detection sidecar for ClipForge.
Detects faces in video frames and outputs a crop timeline.

Usage:
  python face_detect.py <video_path> [--sample-rate 1] [--output json]

Outputs JSON:
  {
    "frames": [
      {"time": 0.0, "faces": [{"x": 100, "y": 50, "w": 200, "h": 250, "confidence": 0.95}]},
      ...
    ],
    "primarySpeaker": {"x": 180, "y": 80, "w": 180, "h": 220},
    "totalFrames": 150,
    "framesWithFaces": 140
  }
"""
import sys
import json
import os
import argparse

# Add ffmpeg to PATH
_ffmpeg_dirs = [
    os.path.join(os.path.dirname(__file__), "..", "node_modules", "@ffmpeg-installer", "win32-x64"),
]
for d in _ffmpeg_dirs:
    full = os.path.abspath(d)
    if os.path.isdir(full) and full not in os.environ.get("PATH", ""):
        os.environ["PATH"] = full + os.pathsep + os.environ.get("PATH", "")
        break

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("video_path")
    parser.add_argument("--sample-rate", type=float, default=1.0, help="Sample rate in seconds (1 = one frame per second)")
    parser.add_argument("--output", default="json", choices=["json", "crop-json"])
    args = parser.parse_args()

    try:
        import cv2
    except ImportError:
        print(json.dumps({"error": "opencv-python not installed. Run: pip install opencv-python"}))
        sys.exit(1)

    cap = cv2.VideoCapture(args.video_path)
    if not cap.isOpened():
        print(json.dumps({"error": f"Cannot open video: {args.video_path}"}))
        sys.exit(1)

    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    sample_interval = int(fps * args.sample_rate)

    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")

    frames = []
    face_positions = []

    frame_idx = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        if frame_idx % sample_interval == 0:
            time_sec = frame_idx / fps
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))

            face_list = []
            for (x, y, w, h) in faces:
                face_list.append({
                    "x": int(x), "y": int(y), "w": int(w), "h": int(h),
                    "confidence": 0.9,
                    "center_x": int(x + w / 2),
                    "center_y": int(y + h / 2),
                })
                face_positions.append({"x": int(x + w / 2), "y": int(y + h / 2)})

            frames.append({"time": round(time_sec, 2), "faces": face_list})

        frame_idx += 1

    cap.release()

    # Compute primary speaker position (average face center)
    primary = None
    if face_positions:
        avg_x = sum(p["x"] for p in face_positions) // len(face_positions)
        avg_y = sum(p["y"] for p in face_positions) // len(face_positions)
        # Find typical face size
        avg_w = 180  # default
        avg_h = 220
        primary = {"x": avg_x, "y": avg_y, "w": avg_w, "h": avg_h}

    # If output is crop-json, generate ffmpeg crop timeline
    if args.output == "crop-json":
        crop_timeline = generate_crop_timeline(frames, width, height, fps)
        result = {"crop_timeline": crop_timeline, "video_width": width, "video_height": height}
    else:
        result = {
            "frames": frames,
            "primarySpeaker": primary,
            "totalFrames": len(frames),
            "framesWithFaces": sum(1 for f in frames if f["faces"]),
            "video_width": width,
            "video_height": height,
        }

    print(json.dumps(result))


def generate_crop_timeline(frames, video_width, video_height, fps):
    """Generate a piecewise-linear crop expression for ffmpeg."""
    # For each sampled frame, compute the optimal crop center
    keyframes = []
    for frame in frames:
        t = frame["time"]
        if frame["faces"]:
            # Use the largest face's center
            largest = max(frame["faces"], key=lambda f: f["w"] * f["h"])
            cx = largest["center_x"]
            cy = largest["center_y"]
        else:
            # No face detected — use center
            cx = video_width // 2
            cy = video_height // 2
        keyframes.append({"t": round(t, 2), "cx": cx, "cy": cy})

    return keyframes


if __name__ == "__main__":
    main()
