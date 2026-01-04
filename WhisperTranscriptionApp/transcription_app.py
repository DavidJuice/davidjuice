"""
Windows Audio Transcription App
Uses OpenAI Whisper to transcribe audio files in multiple languages
"""

import tkinter as tk
from tkinter import ttk, filedialog, messagebox, scrolledtext
import threading
import os
from pathlib import Path
import json

try:
    import customtkinter as ctk
    USE_CUSTOM_TK = True
except ImportError:
    USE_CUSTOM_TK = False


class TranscriptionApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Audio Transcription - Powered by OpenAI Whisper")
        self.root.geometry("800x700")

        # Variables
        self.selected_file = tk.StringVar()
        self.selected_language = tk.StringVar(value="auto")
        self.model_type = tk.StringVar(value="api")  # 'api' or 'local'
        self.api_key = tk.StringVar()
        self.transcription_result = ""
        self.is_transcribing = False

        # Load saved API key if exists
        self.load_settings()

        # Setup UI
        self.setup_ui()

    def load_settings(self):
        """Load saved settings from config file"""
        config_file = Path.home() / ".whisper_transcription_config.json"
        if config_file.exists():
            try:
                with open(config_file, 'r') as f:
                    config = json.load(f)
                    self.api_key.set(config.get('api_key', ''))
                    self.model_type.set(config.get('model_type', 'api'))
            except:
                pass

    def save_settings(self):
        """Save settings to config file"""
        config_file = Path.home() / ".whisper_transcription_config.json"
        config = {
            'api_key': self.api_key.get(),
            'model_type': self.model_type.get()
        }
        try:
            with open(config_file, 'w') as f:
                json.dump(config, f)
        except:
            pass

    def setup_ui(self):
        """Setup the user interface"""
        # Main container with padding
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        main_frame.columnconfigure(0, weight=1)

        # Title
        title_label = ttk.Label(
            main_frame,
            text="🎤 Audio Transcription App",
            font=('Arial', 16, 'bold')
        )
        title_label.grid(row=0, column=0, pady=(0, 20))

        # Model Selection Frame
        model_frame = ttk.LabelFrame(main_frame, text="Model Settings", padding="10")
        model_frame.grid(row=1, column=0, sticky=(tk.W, tk.E), pady=(0, 10))
        model_frame.columnconfigure(1, weight=1)

        ttk.Radiobutton(
            model_frame,
            text="Use OpenAI API (Recommended - faster, no installation needed)",
            variable=self.model_type,
            value="api",
            command=self.on_model_type_change
        ).grid(row=0, column=0, columnspan=2, sticky=tk.W, pady=2)

        ttk.Radiobutton(
            model_frame,
            text="Use Local Whisper Model (Slower, runs on your computer)",
            variable=self.model_type,
            value="local",
            command=self.on_model_type_change
        ).grid(row=1, column=0, columnspan=2, sticky=tk.W, pady=2)

        # API Key input
        ttk.Label(model_frame, text="OpenAI API Key:").grid(row=2, column=0, sticky=tk.W, pady=(10, 0))
        self.api_key_entry = ttk.Entry(model_frame, textvariable=self.api_key, show="*", width=50)
        self.api_key_entry.grid(row=2, column=1, sticky=(tk.W, tk.E), pady=(10, 0), padx=(10, 0))

        ttk.Button(
            model_frame,
            text="Save API Key",
            command=self.save_settings
        ).grid(row=3, column=1, sticky=tk.E, pady=(5, 0))

        # File Selection Frame
        file_frame = ttk.LabelFrame(main_frame, text="Audio File", padding="10")
        file_frame.grid(row=2, column=0, sticky=(tk.W, tk.E), pady=(0, 10))
        file_frame.columnconfigure(0, weight=1)

        file_entry = ttk.Entry(file_frame, textvariable=self.selected_file, state='readonly')
        file_entry.grid(row=0, column=0, sticky=(tk.W, tk.E), padx=(0, 10))

        ttk.Button(
            file_frame,
            text="Browse...",
            command=self.browse_file
        ).grid(row=0, column=1)

        # Language Selection Frame
        lang_frame = ttk.LabelFrame(main_frame, text="Language", padding="10")
        lang_frame.grid(row=3, column=0, sticky=(tk.W, tk.E), pady=(0, 10))

        languages = [
            ("Auto Detect", "auto"),
            ("English", "en"),
            ("Korean (한국어)", "ko"),
            ("Spanish", "es"),
            ("French", "fr"),
            ("German", "de"),
            ("Japanese", "ja"),
            ("Chinese", "zh"),
            ("Russian", "ru"),
            ("Portuguese", "pt"),
            ("Italian", "it"),
        ]

        for i, (lang_name, lang_code) in enumerate(languages):
            row = i // 3
            col = i % 3
            ttk.Radiobutton(
                lang_frame,
                text=lang_name,
                variable=self.selected_language,
                value=lang_code
            ).grid(row=row, column=col, sticky=tk.W, padx=10, pady=2)

        # Transcribe Button
        self.transcribe_btn = ttk.Button(
            main_frame,
            text="Start Transcription",
            command=self.start_transcription
        )
        self.transcribe_btn.grid(row=4, column=0, pady=(0, 10))

        # Progress Bar
        self.progress = ttk.Progressbar(main_frame, mode='indeterminate')
        self.progress.grid(row=5, column=0, sticky=(tk.W, tk.E), pady=(0, 10))

        # Status Label
        self.status_label = ttk.Label(main_frame, text="Ready", foreground="green")
        self.status_label.grid(row=6, column=0, pady=(0, 10))

        # Result Frame
        result_frame = ttk.LabelFrame(main_frame, text="Transcription Result", padding="10")
        result_frame.grid(row=7, column=0, sticky=(tk.W, tk.E, tk.N, tk.S), pady=(0, 10))
        result_frame.columnconfigure(0, weight=1)
        result_frame.rowconfigure(0, weight=1)
        main_frame.rowconfigure(7, weight=1)

        # Text widget for results
        self.result_text = scrolledtext.ScrolledText(
            result_frame,
            wrap=tk.WORD,
            width=70,
            height=15,
            font=('Arial', 10)
        )
        self.result_text.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))

        # Buttons for result actions
        button_frame = ttk.Frame(result_frame)
        button_frame.grid(row=1, column=0, sticky=tk.E, pady=(10, 0))

        ttk.Button(
            button_frame,
            text="Copy to Clipboard",
            command=self.copy_to_clipboard
        ).grid(row=0, column=0, padx=(0, 5))

        ttk.Button(
            button_frame,
            text="Save to File",
            command=self.save_to_file
        ).grid(row=0, column=1)

        # Update UI based on initial model type
        self.on_model_type_change()

    def on_model_type_change(self):
        """Handle model type change"""
        if self.model_type.get() == "api":
            self.api_key_entry.config(state='normal')
        else:
            self.api_key_entry.config(state='disabled')

    def browse_file(self):
        """Open file browser to select audio file"""
        filetypes = (
            ('Audio files', '*.mp3 *.wav *.m4a *.flac *.ogg *.mp4 *.mpeg *.mpga *.webm'),
            ('All files', '*.*')
        )

        filename = filedialog.askopenfilename(
            title='Select an audio file',
            filetypes=filetypes
        )

        if filename:
            self.selected_file.set(filename)

    def update_status(self, message, color="black"):
        """Update status label"""
        self.status_label.config(text=message, foreground=color)

    def start_transcription(self):
        """Start the transcription process in a separate thread"""
        if self.is_transcribing:
            messagebox.showwarning("In Progress", "Transcription is already in progress!")
            return

        if not self.selected_file.get():
            messagebox.showerror("No File", "Please select an audio file first!")
            return

        if self.model_type.get() == "api" and not self.api_key.get():
            messagebox.showerror("No API Key", "Please enter your OpenAI API key!")
            return

        # Start transcription in separate thread
        self.is_transcribing = True
        self.transcribe_btn.config(state='disabled')
        self.progress.start()
        self.update_status("Transcribing...", "blue")
        self.result_text.delete(1.0, tk.END)

        thread = threading.Thread(target=self.transcribe_audio)
        thread.daemon = True
        thread.start()

    def transcribe_audio(self):
        """Perform the actual transcription"""
        try:
            if self.model_type.get() == "api":
                result = self.transcribe_with_api()
            else:
                result = self.transcribe_with_local()

            # Update UI with result
            self.root.after(0, self.transcription_complete, result)

        except Exception as e:
            self.root.after(0, self.transcription_error, str(e))

    def transcribe_with_api(self):
        """Transcribe using OpenAI API"""
        from openai import OpenAI

        client = OpenAI(api_key=self.api_key.get())

        audio_file_path = self.selected_file.get()

        with open(audio_file_path, "rb") as audio_file:
            kwargs = {
                "model": "whisper-1",
                "file": audio_file,
            }

            # Add language if not auto-detect
            if self.selected_language.get() != "auto":
                kwargs["language"] = self.selected_language.get()

            transcript = client.audio.transcriptions.create(**kwargs)

        return transcript.text

    def transcribe_with_local(self):
        """Transcribe using local Whisper model"""
        import whisper

        # Load model (base is a good balance of speed and accuracy)
        self.root.after(0, self.update_status, "Loading Whisper model...", "blue")
        model = whisper.load_model("base")

        # Transcribe
        self.root.after(0, self.update_status, "Transcribing audio...", "blue")
        audio_file_path = self.selected_file.get()

        kwargs = {"fp16": False}  # Better compatibility on various systems

        if self.selected_language.get() != "auto":
            kwargs["language"] = self.selected_language.get()

        result = model.transcribe(audio_file_path, **kwargs)

        return result["text"]

    def transcription_complete(self, result):
        """Handle successful transcription"""
        self.is_transcribing = False
        self.progress.stop()
        self.transcribe_btn.config(state='normal')
        self.update_status("Transcription complete!", "green")

        self.transcription_result = result
        self.result_text.delete(1.0, tk.END)
        self.result_text.insert(1.0, result)

    def transcription_error(self, error_msg):
        """Handle transcription error"""
        self.is_transcribing = False
        self.progress.stop()
        self.transcribe_btn.config(state='normal')
        self.update_status("Error occurred", "red")

        messagebox.showerror("Transcription Error", f"An error occurred:\n\n{error_msg}")

    def copy_to_clipboard(self):
        """Copy transcription result to clipboard"""
        if self.transcription_result:
            self.root.clipboard_clear()
            self.root.clipboard_append(self.transcription_result)
            messagebox.showinfo("Copied", "Transcription copied to clipboard!")
        else:
            messagebox.showwarning("No Result", "No transcription to copy!")

    def save_to_file(self):
        """Save transcription result to a text file"""
        if not self.transcription_result:
            messagebox.showwarning("No Result", "No transcription to save!")
            return

        filename = filedialog.asksaveasfilename(
            title="Save transcription",
            defaultextension=".txt",
            filetypes=(("Text files", "*.txt"), ("All files", "*.*"))
        )

        if filename:
            try:
                with open(filename, 'w', encoding='utf-8') as f:
                    f.write(self.transcription_result)
                messagebox.showinfo("Saved", f"Transcription saved to:\n{filename}")
            except Exception as e:
                messagebox.showerror("Save Error", f"Failed to save file:\n{str(e)}")


def main():
    root = tk.Tk()
    app = TranscriptionApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
