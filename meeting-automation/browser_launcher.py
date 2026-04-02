"""
Opens meeting URLs in Google Chrome via osascript.
Teams and Zoom links both open directly in Chrome (no desktop app).
"""
import subprocess


def open_in_chrome(url: str):
    """Open a URL in a new tab in Google Chrome."""
    script = f'tell application "Google Chrome" to open location "{url}"'
    subprocess.run(["osascript", "-e", script], check=True)


def focus_chrome():
    """Bring Chrome to the foreground."""
    subprocess.run(
        ["osascript", "-e", 'tell application "Google Chrome" to activate'],
        check=True,
    )


if __name__ == "__main__":
    import sys
    url = sys.argv[1] if len(sys.argv) > 1 else "https://www.google.com"
    print(f"Opening {url} in Chrome...")
    open_in_chrome(url)
