# Installation Guide for WhisperTranscription App

## For Your Wife (Non-Technical Users) 👋

### The Easy Way - Just Download and Run!

1. **Get the App**
   - Ask the person who built this app to give you the `WhisperTranscription.exe` file
   - Save it anywhere on your computer (Desktop is a good choice)
   - That's it! No installation needed!

2. **First Time Setup (Only once)**
   - You'll need an OpenAI account (it's free to create)
   - Go to: https://platform.openai.com/signup
   - Sign up with your email
   - Add a payment method (they charge only for what you use - about $0.006 per minute of audio)
   - Go to: https://platform.openai.com/api-keys
   - Click "Create new secret key"
   - Copy the key (it looks like: sk-abc123...)

3. **Using the App**
   - Double-click `WhisperTranscription.exe`
   - Paste your API key in the box and click "Save API Key"
   - Click "Browse" to find your audio file (recordings, podcasts, etc.)
   - Choose the language:
     - Select "Korean" if it's in Korean
     - Select "English" if it's in English
     - Select "Auto Detect" if you're not sure
   - Click "Start Transcription"
   - Wait a bit (longer files take more time)
   - When done, you'll see the text!
   - Click "Copy to Clipboard" to paste it somewhere else
   - Or click "Save to File" to save it as a text document

### Cost

- Very cheap! About $0.006 per minute
- A 10-minute audio file costs about 6 cents
- A 1-hour podcast costs about 36 cents

### Tips

- ✅ Works with: MP3, WAV, M4A files (most audio formats)
- ✅ Internet required (it uses OpenAI's servers)
- ✅ Your API key is saved - you only need to enter it once
- ⚠️ Keep your API key private (don't share it)

### Problems?

**"No API Key" message**
- Make sure you pasted the key and clicked "Save API Key"
- Try closing and reopening the app

**"Transcription Error"**
- Check your internet connection
- Make sure the audio file isn't damaged
- Try a different audio file to test

**Questions about billing**
- Check: https://platform.openai.com/usage

---

## For Developers - Building from Source

### Prerequisites

1. **Install Python**
   - Download Python 3.8+ from https://www.python.org/downloads/
   - During installation, check "Add Python to PATH"

2. **Install Git** (optional, for cloning)
   - Download from https://git-scm.com/downloads/

### Setup Steps

1. **Get the code**
   ```bash
   # Option 1: Clone the repository
   git clone <repository-url>
   cd WhisperTranscriptionApp

   # Option 2: Download and extract the ZIP file
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   pip install pyinstaller
   ```

3. **Test the app**
   ```bash
   python transcription_app.py
   ```

### Building the Executable

**On Windows:**

```bash
# Easy way - just run:
build.bat

# Or manually:
pip install pyinstaller
python build_exe.py
```

The executable will be in the `dist` folder: `dist/WhisperTranscription.exe`

**File Size Note:**
- The .exe will be 10-20 MB (includes Python runtime)
- This is normal for PyInstaller executables
- Users don't need Python installed!

### Distribution

To share with non-technical users:

1. Find `WhisperTranscription.exe` in the `dist` folder
2. Send them this file via:
   - Email (if under 25MB)
   - Google Drive / Dropbox / OneDrive
   - USB drive
3. Send them the simple instructions from the top of this guide

### Advanced: Creating an Installer (Optional)

For a more professional installation experience, you can use Inno Setup:

1. **Install Inno Setup**
   - Download from: https://jrsoftware.org/isdl.php

2. **Create installer script** (save as `installer.iss`):
   ```ini
   [Setup]
   AppName=WhisperTranscription
   AppVersion=1.0
   DefaultDirName={pf}\WhisperTranscription
   DefaultGroupName=WhisperTranscription
   OutputDir=installer
   OutputBaseFilename=WhisperTranscription_Setup

   [Files]
   Source: "dist\WhisperTranscription.exe"; DestDir: "{app}"

   [Icons]
   Name: "{group}\WhisperTranscription"; Filename: "{app}\WhisperTranscription.exe"
   Name: "{commondesktop}\WhisperTranscription"; Filename: "{app}\WhisperTranscription.exe"
   ```

3. **Compile the installer**
   - Open the .iss file in Inno Setup
   - Click "Compile"
   - Share the generated setup.exe file

## Troubleshooting Build Issues

### "PyInstaller not found"
```bash
pip install --upgrade pyinstaller
```

### "Module not found" errors
```bash
pip install --upgrade -r requirements.txt
```

### Large executable size
- This is normal (10-20 MB)
- PyInstaller includes Python runtime
- For smaller size, consider using UPX compression (advanced)

### Antivirus flags the .exe
- This is a false positive (common with PyInstaller)
- You can submit the file to your antivirus for whitelisting
- Or distribute as Python script instead

## Support

For issues:
1. Check this guide first
2. Verify all prerequisites are installed
3. Try rebuilding with latest dependencies
4. Check Python version (3.8+ required)
