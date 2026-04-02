"""
Controls macOS system audio via osascript.
Muting system output silences the meeting audio from Chrome
while Granola continues transcribing via the microphone input.
"""
import subprocess


def mute():
    """Mute macOS system output volume."""
    subprocess.run(
        ["osascript", "-e", "set volume output muted true"],
        check=True,
    )


def unmute():
    """Restore macOS system output volume (unmute)."""
    subprocess.run(
        ["osascript", "-e", "set volume output muted false"],
        check=True,
    )


def is_muted() -> bool:
    """Return True if system output is currently muted."""
    result = subprocess.run(
        ["osascript", "-e", "output muted of (get volume settings)"],
        capture_output=True,
        text=True,
        check=True,
    )
    return result.stdout.strip().lower() == "true"


if __name__ == "__main__":
    print(f"Currently muted: {is_muted()}")
    print("Muting...")
    mute()
    print(f"Now muted: {is_muted()}")
