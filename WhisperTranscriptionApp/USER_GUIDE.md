# WhisperTranscription App - Simple User Guide

## For Your Wife 💝

This is a simple guide to using the audio transcription app. No technical knowledge needed!

---

## What Does This App Do?

It converts audio recordings into text. Perfect for:
- 🎤 Recording meetings or lectures
- 📱 Voice memos
- 🎧 Podcast transcripts
- 🗣️ Interviews
- 📞 Phone conversations you recorded

---

## Step-by-Step: How to Use

### First Time Only - Get Your API Key

1. **Go to OpenAI's website**
   - Visit: https://platform.openai.com/signup
   - Sign up with your email (free account)

2. **Add payment info**
   - Go to Settings → Billing
   - Add a credit card
   - Don't worry - it's VERY cheap! (6 cents for 10 minutes of audio)

3. **Get your API key**
   - Go to: https://platform.openai.com/api-keys
   - Click "Create new secret key"
   - Give it a name like "Transcription App"
   - Copy the key (looks like: sk-abc123xyz...)
   - **SAVE THIS KEY SOMEWHERE SAFE!** (you won't see it again)

### Every Time You Use the App

1. **Open the app**
   - Double-click `WhisperTranscription.exe`
   - A window will open

2. **Enter API Key** (only first time)
   - Paste your API key in the "OpenAI API Key" box
   - Click "Save API Key"
   - You only need to do this once!

3. **Select your audio file**
   - Click the "Browse..." button
   - Find your audio file (MP3, WAV, M4A, etc.)
   - Click "Open"

4. **Choose the language**
   - Click on the language of your audio:
     - **Korean** - for Korean audio (한국어)
     - **English** - for English audio
     - **Auto Detect** - if you're not sure (this works great!)

5. **Start transcription**
   - Click "Start Transcription"
   - Wait while it processes (you'll see a progress bar)
   - Longer files take more time:
     - 1-minute file: ~5-10 seconds
     - 10-minute file: ~30-60 seconds
     - 1-hour file: ~3-5 minutes

6. **Get your text!**
   - When done, the text appears in the big box
   - Click "Copy to Clipboard" to paste it into Word, email, etc.
   - Or click "Save to File" to save it as a text document

---

## Visual Guide

```
┌─────────────────────────────────────────┐
│  🎤 Audio Transcription App             │
├─────────────────────────────────────────┤
│                                         │
│  Model Settings:                        │
│  ● Use OpenAI API (Recommended)         │
│  ○ Use Local Model                      │
│                                         │
│  OpenAI API Key: [sk-abc123...] [Save] │
│                                         │
├─────────────────────────────────────────┤
│  Audio File:                            │
│  [C:\Users\...\recording.mp3] [Browse] │
│                                         │
├─────────────────────────────────────────┤
│  Language:                              │
│  ○ Auto  ○ English  ● Korean           │
│  ○ Spanish  ○ Japanese  ○ Chinese      │
│                                         │
├─────────────────────────────────────────┤
│        [ Start Transcription ]          │
│                                         │
│  [====Progress Bar====]                 │
│  Status: Transcribing...                │
│                                         │
├─────────────────────────────────────────┤
│  Transcription Result:                  │
│  ┌───────────────────────────────────┐ │
│  │ Your transcribed text will        │ │
│  │ appear here...                    │ │
│  │                                   │ │
│  └───────────────────────────────────┘ │
│       [Copy to Clipboard] [Save File]  │
└─────────────────────────────────────────┘
```

---

## How Much Does It Cost?

**OpenAI Whisper API Pricing:**
- $0.006 per minute of audio
- That means:
  - 10 minutes = 6 cents
  - 1 hour = 36 cents
  - 10 hours = $3.60

**Example: If you transcribe:**
- 5 recordings per week, 10 minutes each = 30 cents/week = **$1.20/month**
- Very affordable! 💰

---

## Tips & Tricks

✅ **Best Practices:**
- Clear audio = better transcription
- Minimize background noise
- One speaker is easier than multiple speakers
- Files up to 25MB work best

✅ **Supported Audio Files:**
- MP3 (most common)
- WAV
- M4A (iPhone recordings)
- FLAC
- OGG
- And more!

✅ **Languages Supported:**
- Korean (한국어) ✓
- English ✓
- Spanish ✓
- French ✓
- German ✓
- Japanese ✓
- Chinese ✓
- And 50+ more languages!

---

## Common Questions

### ❓ "Why do I need an API key?"

The app uses OpenAI's powerful servers to transcribe your audio. The API key proves you have an account and lets them charge you for usage.

### ❓ "Is my audio private?"

When using the API, your audio is sent to OpenAI's servers for processing. OpenAI doesn't use your data to train their models. For complete privacy, you can use the "Local Model" option (slower).

### ❓ "What if I run out of money?"

OpenAI will email you when you're running low. You can set spending limits in your account settings. The app will stop working if you hit your limit.

### ❓ "Can I use this without internet?"

Not with the API option. But you can select "Use Local Whisper Model" which works offline (requires setup).

### ❓ "The transcription has mistakes"

Whisper is very accurate but not perfect. It works best with:
- Clear audio
- Minimal background noise
- One person speaking
- Common languages

### ❓ "Can I transcribe video files?"

Yes! MP4, MOV, and other video files work. The app extracts the audio.

---

## Problems? Here's How to Fix Them

### 🔴 "Please select an audio file first!"
- You forgot to click "Browse..." and select a file
- Click "Browse..." and choose your audio file

### 🔴 "Please enter your OpenAI API key!"
- You haven't entered your API key yet
- Go to https://platform.openai.com/api-keys and get one
- Paste it in the box and click "Save API Key"

### 🔴 "Transcription Error"
- Check your internet connection
- Make sure your API key is correct
- Try a different audio file
- Check if you have credit in your OpenAI account

### 🔴 App won't open
- Make sure you double-clicked the .exe file
- Try right-click → "Run as administrator"
- Your antivirus might be blocking it - add an exception

### 🔴 Transcription is taking forever
- Large files take longer (1 hour = 3-5 minutes to transcribe)
- Check your internet speed
- Make sure the app hasn't frozen

---

## Need More Help?

1. **Check your OpenAI account:**
   - Go to https://platform.openai.com/usage
   - Check your usage and billing

2. **OpenAI Status:**
   - Visit https://status.openai.com/
   - Make sure their service is working

3. **Ask for help:**
   - Show this guide to someone tech-savvy
   - Take a screenshot of any error messages

---

## Quick Reference Card

Print this out and keep it near your computer! 📋

```
╔═══════════════════════════════════════════╗
║  WHISPER TRANSCRIPTION - QUICK GUIDE      ║
╠═══════════════════════════════════════════╣
║  1. Open WhisperTranscription.exe         ║
║  2. Click "Browse" → select audio file    ║
║  3. Choose language (or Auto Detect)      ║
║  4. Click "Start Transcription"           ║
║  5. Wait for it to finish                 ║
║  6. Click "Copy" or "Save File"           ║
╠═══════════════════════════════════════════╣
║  Cost: $0.006 per minute (~6¢ for 10 min)║
║  API Key: platform.openai.com/api-keys    ║
╚═══════════════════════════════════════════╝
```

---

Enjoy your transcription app! 🎉
