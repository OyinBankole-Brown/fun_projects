"""Small desktop app to convert a PDF to audio.

This provides a minimal Tkinter GUI where you can pick a PDF, choose
offline (pyttsx3 -> WAV) or online (gTTS -> MP3) output, and convert.

Notes:
- pyttsx3 reliably writes WAV files offline.
- gTTS writes MP3 but requires internet and (for long PDFs) pydub+ffmpeg
  to merge chunks. The app will attempt to use pydub if installed.
"""

import os
import sys
import threading
import tempfile
import tkinter as tk
from tkinter import filedialog, messagebox

try:
    import PyPDF2
except Exception:
    # Show a friendly GUI error explaining how to install dependencies
    try:
        root = tk.Tk()
        root.withdraw()
        messagebox.showerror(
            "Missing dependency",
            "PyPDF2 is not installed.\n\nPlease run the following in PowerShell in this project folder:\n\npython -m venv .venv; .\\.venv\\Scripts\\Activate.ps1; python -m pip install --upgrade pip; pip install -r requirements.txt\n\nThen re-run this program.")
    except Exception:
        # fallback to printing
        print("ERROR: PyPDF2 is not installed. Run: pip install -r requirements.txt")
    sys.exit(1)

try:
    import pyttsx3
except Exception:
    pyttsx3 = None

try:
    from gtts import gTTS
except Exception:
    gTTS = None

try:
    from pydub import AudioSegment
except Exception:
    AudioSegment = None


def extract_text_from_pdf(path):
    parts = []
    with open(path, "rb") as f:
        reader = PyPDF2.PdfReader(f)
        for i, page in enumerate(reader.pages, start=1):
            t = page.extract_text()
            if t:
                parts.append(t)
            else:
                # skip pages with no extractable text
                print(f"warning: page {i} has no extractable text, skipping")
    return "\n\n".join(parts)


def save_with_pyttsx3(text, out_path, rate=None, volume=None, voice_id=None, on_progress=None):
    if pyttsx3 is None:
        raise RuntimeError("pyttsx3 is not installed")
    # Ensure wav extension
    if not out_path.lower().endswith(".wav"):
        out_path = os.path.splitext(out_path)[0] + ".wav"
    engine = pyttsx3.init()
    # Apply voice/rate/volume if provided to improve smoothness/speed
    try:
        if rate is not None:
            engine.setProperty('rate', int(rate))
        if volume is not None:
            # volume expected 0.0-1.0
            engine.setProperty('volume', float(volume))
        if voice_id is not None:
            engine.setProperty('voice', voice_id)
    except Exception:
        # ignore if the backend doesn't accept the property
        pass

    # Save full text to a single WAV file (backend handles streaming)
    engine.save_to_file(text, out_path)
    engine.runAndWait()
    if on_progress:
        on_progress("Saved: %s" % out_path)
    return out_path


def save_with_gtts(text, out_path, on_progress=None):
    if gTTS is None:
        raise RuntimeError("gTTS is not installed")
    # gTTS can choke on very large strings; split into chunks if needed
    max_chars = 4500
    chunks = [text[i:i+max_chars] for i in range(0, len(text), max_chars)]
    tmp_files = []
    try:
        for idx, chunk in enumerate(chunks, start=1):
            t = gTTS(chunk)
            if len(chunks) == 1:
                t.save(out_path)
                if on_progress:
                    on_progress(f"Saved: {out_path}")
            else:
                tmp = tempfile.NamedTemporaryFile(delete=False, suffix=f"-{idx}.mp3")
                tmp.close()
                t.save(tmp.name)
                tmp_files.append(tmp.name)
                if on_progress:
                    on_progress(f"Saved chunk {idx}/{len(chunks)} -> {tmp.name}")

        if len(tmp_files) > 1:
            if AudioSegment is None:
                raise RuntimeError("pydub is required to merge MP3 chunks (and ffmpeg must be installed)")
            # merge into out_path
            out_full = AudioSegment.from_mp3(tmp_files[0])
            for extra in tmp_files[1:]:
                out_full += AudioSegment.from_mp3(extra)
            out_full.export(out_path, format="mp3")
            if on_progress:
                on_progress(f"Merged chunks into {out_path}")

        return out_path
    finally:
        for t in tmp_files:
            try:
                os.remove(t)
            except Exception:
                pass


class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("PDF → Audiobook")
        self.geometry("640x260")

        self.pdf_path = tk.StringVar()
        self.output_path = tk.StringVar(value="audiobook")
        self.mode = tk.StringVar(value="pyttsx3")
        self.voice_id = tk.StringVar(value="")
        self.rate = tk.IntVar(value=180)
        self.volume = tk.DoubleVar(value=1.0)

        tk.Label(self, text="PDF file:").pack(anchor="w", padx=8, pady=(8, 0))
        frm = tk.Frame(self)
        frm.pack(fill="x", padx=8)
        tk.Entry(frm, textvariable=self.pdf_path).pack(side="left", fill="x", expand=True)
        tk.Button(frm, text="Browse...", command=self.browse_pdf).pack(side="left", padx=4)

        tk.Label(self, text="Output filename (no extension):").pack(anchor="w", padx=8, pady=(8, 0))
        tk.Entry(self, textvariable=self.output_path).pack(fill="x", padx=8)

        # Voice / rate / volume controls
        vfrm = tk.Frame(self)
        vfrm.pack(fill="x", padx=8, pady=(6, 0))
        tk.Label(vfrm, text="Voice:").grid(row=0, column=0, sticky="w")
        self.voice_menu = tk.OptionMenu(vfrm, self.voice_id, "")
        self.voice_menu.grid(row=0, column=1, sticky="we", padx=6)
        tk.Label(vfrm, text="Rate:").grid(row=0, column=2, sticky="w", padx=(8, 0))
        tk.Spinbox(vfrm, from_=80, to=300, textvariable=self.rate, width=6).grid(row=0, column=3, sticky="w")
        tk.Label(vfrm, text="Volume:").grid(row=0, column=4, sticky="w", padx=(8, 0))
        tk.Spinbox(vfrm, from_=0.1, to=1.0, increment=0.1, textvariable=self.volume, width=6).grid(row=0, column=5, sticky="w")

        # populate voices if available
        self.populate_voices()

        modes = tk.Frame(self)
        modes.pack(fill="x", padx=8, pady=8)
        tk.Radiobutton(modes, text="Offline (pyttsx3 → WAV)", variable=self.mode, value="pyttsx3").pack(anchor="w")
        tk.Radiobutton(modes, text="Online (gTTS → MP3)", variable=self.mode, value="gtts").pack(anchor="w")

        btn = tk.Button(self, text="Convert", command=self.convert)
        btn.pack(pady=6)

        self.status = tk.StringVar(value="Ready")
        tk.Label(self, textvariable=self.status, anchor="w").pack(fill="x", padx=8)

    def populate_voices(self):
        # Populate pyttsx3 voices into the OptionMenu (if pyttsx3 present)
        menu = self.voice_menu['menu']
        menu.delete(0, 'end')
        if pyttsx3 is None:
            menu.add_command(label="(pyttsx3 not installed)", command=lambda: self.voice_id.set(''))
            return
        try:
            eng = pyttsx3.init()
            voices = eng.getProperty('voices')
            if not voices:
                menu.add_command(label="(no voices found)", command=lambda: self.voice_id.set(''))
                return
            for v in voices:
                # label show name and id
                label = f"{getattr(v, 'name', '')} ({getattr(v, 'id', '')})"
                menu.add_command(label=label, command=lambda vid=getattr(v, 'id', ''): self.voice_id.set(vid))
            # set a default
            self.voice_id.set(getattr(voices[0], 'id', ''))
        except Exception:
            menu.add_command(label="(could not read voices)", command=lambda: self.voice_id.set(''))

    def browse_pdf(self):
        p = filedialog.askopenfilename(filetypes=[("PDF files", "*.pdf")])
        if p:
            self.pdf_path.set(p)
            # auto-fill output filename from pdf basename
            base = os.path.splitext(os.path.basename(p))[0]
            self.output_path.set(base)

    def set_status(self, msg):
        self.status.set(msg)

    def convert(self):
        pdf = self.pdf_path.get()
        if not pdf or not os.path.isfile(pdf):
            messagebox.showerror("Error", "Please pick a valid PDF file")
            return
        out_base = self.output_path.get().strip()
        if not out_base:
            messagebox.showerror("Error", "Please choose an output filename")
            return

        mode = self.mode.get()

        voice_choice = self.voice_id.get() or None
        rate_choice = self.rate.get()
        volume_choice = self.volume.get()

        def work():
            try:
                self.set_status("Extracting text...")
                text = extract_text_from_pdf(pdf)
                if not text.strip():
                    messagebox.showerror("Error", "No text could be extracted from the PDF")
                    self.set_status("No text extracted")
                    return

                if mode == "pyttsx3":
                    out = out_base if out_base.lower().endswith('.wav') else out_base + '.wav'
                    self.set_status("Converting with pyttsx3 (offline)...")
                    save_with_pyttsx3(text, out, rate=rate_choice, volume=volume_choice, voice_id=voice_choice, on_progress=self.set_status)
                    messagebox.showinfo("Done", f"Saved audio: {out}")
                    self.set_status("Done")
                else:
                    out = out_base if out_base.lower().endswith('.mp3') else out_base + '.mp3'
                    self.set_status("Converting with gTTS (online)...")
                    save_with_gtts(text, out, on_progress=self.set_status)
                    messagebox.showinfo("Done", f"Saved audio: {out}")
                    self.set_status("Done")
            except Exception as e:
                messagebox.showerror("Error", str(e))
                self.set_status(f"Error: {e}")

        threading.Thread(target=work, daemon=True).start()


def main():
    app = App()
    app.mainloop()


if __name__ == "__main__":
    main()