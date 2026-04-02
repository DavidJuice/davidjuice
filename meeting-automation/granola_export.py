"""
Exports transcript and AI notes from the Granola app using macOS
AppleScript UI automation and clipboard capture.

Granola export strategy:
  - Transcript: Click the "Copy Transcript" button in Granola's UI
  - AI Notes:   Focus the notes panel, then Cmd+A / Cmd+C to select-all and copy

IMPORTANT: Granola must be open and the meeting you want to export must be
visible/selected before calling these functions. The automation will operate
on whatever meeting is currently displayed.

macOS Accessibility permission required:
  System Settings → Privacy & Security → Accessibility → allow Terminal (or your
  Python runtime) to control your computer.
"""
import subprocess
import time


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _run_applescript(script: str) -> str:
    """Run an AppleScript snippet and return stdout."""
    result = subprocess.run(
        ["osascript", "-e", script],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(
            f"AppleScript error:\n{result.stderr.strip()}\nScript was:\n{script}"
        )
    return result.stdout.strip()


def _read_clipboard() -> str:
    """Return the current macOS clipboard contents as a string."""
    result = subprocess.run(["pbpaste"], capture_output=True, text=True, check=True)
    return result.stdout


def _clear_clipboard():
    """Clear the clipboard so we can detect when new content lands."""
    subprocess.run(
        ["osascript", "-e", 'set the clipboard to ""'],
        check=True,
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def export_transcript() -> str:
    """
    Click Granola's 'Copy Transcript' button and return the clipboard text.

    If the button cannot be found by name (Granola UI may change), falls back
    to asking the user to click it manually and polls the clipboard.
    """
    _clear_clipboard()

    # Activate Granola and click the Copy Transcript button
    script = """
tell application "Granola" to activate
delay 1.5
tell application "System Events"
    tell process "Granola"
        -- Try to find and click "Copy Transcript" button anywhere in the window
        set foundButton to false
        repeat with btn in (every button of window 1)
            if name of btn contains "Copy Transcript" or name of btn contains "transcript" then
                click btn
                set foundButton to true
                exit repeat
            end if
        end repeat
        if not foundButton then
            -- Try menu bar approach as fallback
            error "Copy Transcript button not found in window"
        end if
    end tell
end tell
"""
    try:
        _run_applescript(script)
        time.sleep(0.8)
        text = _read_clipboard()
        if text.strip():
            return text
        raise RuntimeError("Clipboard was empty after clicking Copy Transcript")
    except RuntimeError as e:
        print(f"[granola_export] UI automation failed: {e}")
        print("[granola_export] Fallback: Please click 'Copy Transcript' in Granola manually.")
        return _poll_clipboard_for_content(timeout=30)


def export_ai_notes() -> str:
    """
    Focus the AI notes text area in Granola, select all, and copy.
    Returns the clipboard text containing Granola's AI-generated notes.
    """
    _clear_clipboard()

    # Bring Granola to foreground and Cmd+A / Cmd+C in the notes area.
    # Granola's notes panel is typically a scroll area / text area on the right side.
    script = """
tell application "Granola" to activate
delay 1.0
tell application "System Events"
    tell process "Granola"
        -- Click somewhere in the notes/summary panel to focus it.
        -- The notes panel is usually a text area or scroll area in the main window.
        set targetArea to missing value
        repeat with elem in (every scroll area of window 1)
            set targetArea to elem
            exit repeat
        end repeat
        if targetArea is not missing value then
            click targetArea
        end if
        delay 0.3
        -- Select all text in the focused element and copy
        keystroke "a" using command down
        delay 0.2
        keystroke "c" using command down
    end tell
end tell
"""
    try:
        _run_applescript(script)
        time.sleep(0.8)
        text = _read_clipboard()
        if text.strip():
            return text
        raise RuntimeError("Clipboard was empty after Cmd+A / Cmd+C on notes panel")
    except RuntimeError as e:
        print(f"[granola_export] AI notes automation failed: {e}")
        print(
            "[granola_export] Fallback: Please click inside the AI Notes panel in Granola,\n"
            "then press Cmd+A followed by Cmd+C to copy all notes."
        )
        return _poll_clipboard_for_content(timeout=60)


def _poll_clipboard_for_content(timeout: int = 60) -> str:
    """
    Wait up to `timeout` seconds for the clipboard to contain non-empty text.
    Used as a manual fallback when UI scripting fails.
    """
    deadline = time.time() + timeout
    while time.time() < deadline:
        text = _read_clipboard()
        if text.strip():
            return text
        time.sleep(1)
    raise TimeoutError(
        f"No clipboard content detected within {timeout} seconds. "
        "Please copy the content from Granola manually."
    )


# ---------------------------------------------------------------------------
# CLI test
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("=== Testing Granola export ===")
    print("Make sure Granola is open and a meeting is selected.\n")

    print("Exporting transcript...")
    transcript = export_transcript()
    print(f"Transcript ({len(transcript)} chars):\n{transcript[:300]}...\n")

    print("Exporting AI notes...")
    notes = export_ai_notes()
    print(f"AI Notes ({len(notes)} chars):\n{notes[:300]}...")
