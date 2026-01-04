"""
Build script to create Windows executable using PyInstaller
Run this script to create a standalone .exe file
"""

import PyInstaller.__main__
import os
import sys

# Determine the path to the script
script_path = os.path.join(os.path.dirname(__file__), 'transcription_app.py')
icon_path = os.path.join(os.path.dirname(__file__), 'icon.ico')

# PyInstaller arguments
pyinstaller_args = [
    script_path,
    '--name=WhisperTranscription',
    '--onefile',  # Create a single executable
    '--windowed',  # Don't show console window
    '--clean',
]

# Add icon if it exists
if os.path.exists(icon_path):
    pyinstaller_args.append(f'--icon={icon_path}')

# Run PyInstaller
PyInstaller.__main__.run(pyinstaller_args)

print("\n" + "="*50)
print("Build complete!")
print("="*50)
print(f"Executable location: {os.path.join('dist', 'WhisperTranscription.exe')}")
print("\nYou can distribute the .exe file to users.")
print("They can run it without installing Python!")
