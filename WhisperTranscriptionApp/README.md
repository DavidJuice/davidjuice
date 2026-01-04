# Audio Transcription App - Powered by OpenAI Whisper

A simple, user-friendly Windows desktop application for transcribing audio files in multiple languages including Korean, English, and more.

![License](https://img.shields.io/badge/license-MIT-blue.svg)

## Features

- 🎤 **Easy-to-use GUI** - No command line knowledge required
- 🌍 **Multi-language Support** - Korean, English, Spanish, French, German, Japanese, Chinese, and more
- ⚡ **Fast Transcription** - Uses OpenAI's Whisper API (recommended) or local model
- 💾 **Save & Export** - Copy to clipboard or save to text file
- 🔒 **Secure** - API key stored locally on your computer
- 📁 **Multiple Audio Formats** - Supports MP3, WAV, M4A, FLAC, OGG, MP4, and more

## Quick Start Guide

### For End Users (Non-Technical)

1. **Download the App**
   - Download `WhisperTranscription.exe` from the releases page
   - No installation needed - just double-click to run!

2. **Get an OpenAI API Key** (One-time setup)
   - Go to [OpenAI Platform](https://platform.openai.com/api-keys)
   - Sign up or log in
   - Create a new API key
   - Copy the key

3. **Use the App**
   - Open WhisperTranscription.exe
   - Paste your API key and click "Save API Key"
   - Click "Browse" to select your audio file
   - Choose the language (or use Auto Detect)
   - Click "Start Transcription"
   - Wait for the transcription to complete
   - Copy or save the result!

## For Developers

### Prerequisites

- Python 3.8 or higher
- pip (Python package installer)

### Installation

1. **Clone or download this repository**

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the application**
   ```bash
   python transcription_app.py
   ```

### Building the Executable

To create a standalone Windows executable:

#### On Windows:

1. **Option 1: Use the batch file**
   ```bash
   build.bat
   ```

2. **Option 2: Manual build**
   ```bash
   pip install pyinstaller
   python build_exe.py
   ```

The executable will be created in the `dist` folder.

#### On Linux/Mac (Cross-compile for Windows):

```bash
pip install pyinstaller
python build_exe.py
```

Note: For best results, build on the target platform (Windows).

## Using Local Whisper Model (Advanced)

If you prefer not to use the OpenAI API and want to run Whisper locally:

1. **Install additional dependencies**
   ```bash
   pip install openai-whisper torch torchaudio
   ```

2. **In the app:**
   - Select "Use Local Whisper Model"
   - The first run will download the model (~140MB for base model)
   - Transcription will be slower but runs completely offline

## Supported Audio Formats

- MP3
- WAV
- M4A
- FLAC
- OGG
- MP4
- MPEG
- MPGA
- WEBM

## Supported Languages

- Auto Detect
- English
- Korean (한국어)
- Spanish
- French
- German
- Japanese
- Chinese
- Russian
- Portuguese
- Italian
- And many more via auto-detect!

## Cost Information

Using OpenAI's Whisper API:
- $0.006 per minute of audio (as of 2024)
- Very affordable for occasional use
- Pay-as-you-go (no subscription needed)

## Troubleshooting

### "No API Key" error
- Make sure you've entered your OpenAI API key
- Click "Save API Key" button
- Restart the application

### "Transcription Error"
- Check your internet connection (for API mode)
- Verify your API key is valid
- Ensure the audio file is not corrupted
- Try a different audio format

### Slow transcription with local model
- Local model is slower but more private
- Consider using the API mode for faster results
- First run downloads the model (~140MB)

## Privacy & Security

- Your API key is stored locally in `~/.whisper_transcription_config.json`
- Audio files are sent to OpenAI only when using API mode
- For complete privacy, use the local model option
- No data is collected by this application

## License

MIT License - feel free to use, modify, and distribute!

## Credits

- Built with Python and tkinter
- Powered by [OpenAI Whisper](https://openai.com/research/whisper)
- Created with ❤️ for easy audio transcription

## Support

If you encounter any issues or have questions:
1. Check the Troubleshooting section above
2. Make sure you're using the latest version
3. For API issues, check [OpenAI Status](https://status.openai.com/)

## Changelog

### Version 1.0.0
- Initial release
- Support for OpenAI API and local Whisper model
- Multi-language support
- Save and copy functionality
- Windows executable support
