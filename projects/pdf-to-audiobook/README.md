# PDF to Audiobook

Small Tkinter desktop app to convert PDFs into audio files.

Features

- Offline conversion using pyttsx3 (writes WAV files).
- Online conversion using gTTS (writes MP3 files). For longer PDFs, pydub + ffmpeg will be used to merge chunks.

Requirements

- Python 3.8+
- Install dependencies: `pip install -r requirements.txt`
- If you want MP3 merging with pydub, install ffmpeg and ensure it's on your PATH.

Quick start (PowerShell on Windows)

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
python .\pdf2audio.py
```

Usage

- Click Browse and select a PDF.
- Enter an output filename (without extension). The app will append `.wav` for offline mode or `.mp3` for gTTS mode.
- Click Convert and wait for completion. Status updates appear at the bottom.

Notes

- pyttsx3 is offline but may sound robotic depending on your OS voices.
- gTTS requires internet.
- For very large PDFs, conversion may take time; the GUI runs conversion on a background thread.
