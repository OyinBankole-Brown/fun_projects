
## projects/pdf-to-audiobook

PDF  Audiobook  a small Tkinter desktop app that converts PDFs to audio (WAV via pyttsx3 or MP3 via gTTS). Located at `projects/pdf-to-audiobook`.

Quick start:
```powershell
cd projects\pdf-to-audiobook
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python .\pdf2audio.py
```

Notes:
- Use offline mode (pyttsx3) for WAV output, or gTTS for MP3 (requires internet).
- For MP3 merging, install ffmpeg and pydub.

