#!/usr/bin/env python3
"""
Whisper transcription sidecar for ClipForge.

Usage:
  python whisper_transcribe.py <audio_path> [--model base] [--language en]

Outputs a JSON object to stdout with segments array.
"""
import sys
import json
import os
import argparse

# Ensure ffmpeg is on PATH for whisper's internal load_audio()
# Check common locations
_ffmpeg_dirs = [
    os.path.join(os.path.dirname(__file__), "..", "node_modules", "@ffmpeg-installer", "win32-x64"),
    os.path.join(os.path.dirname(__file__), "..", "node_modules", "@ffmpeg-installer", "ffmpeg"),
]
for d in _ffmpeg_dirs:
    full = os.path.abspath(d)
    if os.path.isdir(full) and full not in os.environ.get("PATH", ""):
        os.environ["PATH"] = full + os.pathsep + os.environ.get("PATH", "")
        break

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("audio_path")
    parser.add_argument("--model", default="base")
    parser.add_argument("--language", default=None)
    parser.add_argument("--device", default="cpu")
    parser.add_argument("--word-timestamps", action="store_true", default=True)
    args = parser.parse_args()

    try:
        import whisper
    except ImportError:
        print(json.dumps({"error": "openai-whisper not installed. Run: pip install openai-whisper"}))
        sys.exit(1)

    model = whisper.load_model(args.model, device=args.device)

    options = {"word_timestamps": args.word_timestamps, "verbose": False}
    if args.language:
        options["language"] = args.language

    import io, contextlib
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        result = model.transcribe(args.audio_path, **options)

    segments = []
    for seg in result.get("segments", []):
        words = []
        if "words" in seg:
            for w in seg["words"]:
                words.append({
                    "start": round(w["start"], 3),
                    "end": round(w["end"], 3),
                    "text": w["word"].strip(),
                })
        segments.append({
            "start": round(seg["start"], 3),
            "end": round(seg["end"], 3),
            "text": seg["text"].strip(),
            "words": words,
            "speaker": None,
        })

    output = {
        "language": result.get("language", args.language or "unknown"),
        "model": args.model,
        "device": args.device,
        "segments": segments,
    }
    print(json.dumps(output))

if __name__ == "__main__":
    main()
