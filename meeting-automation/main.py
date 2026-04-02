"""
Meeting Notes Automation — Main Scheduler

Runs as a background daemon. Every Wednesday:
  - 9:00 AM: Join Teams meeting in Chrome (audio muted), then after 1 hour
              export Granola notes → Claude summary → Google Doc in 9AM folder
  - 2:00 PM: Join Zoom meeting in Chrome (audio muted), then after 1 hour
              export Granola notes → Claude summary → Google Doc in 2PM folder

Usage:
    # Run the scheduler (keeps running, processes Wednesday meetings automatically)
    python main.py

    # Dry run — full pipeline with sample data, skips 1-hour sleep and browser/audio
    python main.py --dry-run

    # Trigger just the post-meeting pipeline right now (e.g. for testing after a meeting)
    python main.py --run-now 9am
    python main.py --run-now 2pm
"""
import sys
import time
import signal
import logging
from datetime import datetime

import schedule

from config import load_config
from audio_control import mute, unmute
from browser_launcher import open_in_chrome
from granola_export import export_transcript, export_ai_notes
from claude_summarizer import summarize, SAMPLE_TRANSCRIPT, SAMPLE_NOTES
from gdocs_creator import create_doc

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger(__name__)

MEETING_DURATION_SECONDS = 3600  # 1 hour


def run_meeting_pipeline(
    meeting_url: str,
    folder_id: str,
    label: str,
    cfg: dict,
    dry_run: bool = False,
):
    """Full pipeline for one meeting: join → wait → export → summarize → create doc."""
    log.info(f"=== Starting {label} meeting pipeline ===")

    if not dry_run:
        log.info("Muting system audio...")
        mute()
        log.info(f"Opening meeting URL in Chrome: {meeting_url}")
        open_in_chrome(meeting_url)
        log.info(f"Meeting joined. Waiting {MEETING_DURATION_SECONDS // 60} minutes...")
        time.sleep(MEETING_DURATION_SECONDS)

    # Export from Granola
    if dry_run:
        log.info("[DRY RUN] Using sample transcript and AI notes.")
        transcript = SAMPLE_TRANSCRIPT
        ai_notes = SAMPLE_NOTES
    else:
        log.info("Exporting transcript from Granola...")
        transcript = export_transcript()
        log.info(f"Transcript captured ({len(transcript)} chars).")

        log.info("Exporting AI notes from Granola...")
        ai_notes = export_ai_notes()
        log.info(f"AI notes captured ({len(ai_notes)} chars).")

    # Generate summary via Claude
    log.info("Sending to Claude for bilingual summary...")
    summary = summarize(transcript, ai_notes)
    log.info(f"Summary generated ({len(summary)} chars).")

    # Build doc title
    now = datetime.now()
    title = now.strftime(cfg["doc_name_format"]).replace("{time}", label)

    # Create Google Doc
    log.info(f"Creating Google Doc: '{title}'...")
    doc_id = create_doc(
        title=title,
        content=summary,
        folder_id=folder_id,
        token_file=cfg["token_file"],
    )
    doc_url = f"https://docs.google.com/document/d/{doc_id}"
    log.info(f"Google Doc created: {doc_url}")

    if not dry_run:
        log.info("Unmuting system audio.")
        unmute()

    log.info(f"=== {label} pipeline complete ===\n")
    return doc_url


def run_9am(cfg: dict, dry_run: bool = False):
    run_meeting_pipeline(
        meeting_url=cfg["teams_url"],
        folder_id=cfg["folder_9am"],
        label="9AM",
        cfg=cfg,
        dry_run=dry_run,
    )


def run_2pm(cfg: dict, dry_run: bool = False):
    run_meeting_pipeline(
        meeting_url=cfg["zoom_url"],
        folder_id=cfg["folder_2pm"],
        label="2PM",
        cfg=cfg,
        dry_run=dry_run,
    )


def main():
    args = sys.argv[1:]
    dry_run = "--dry-run" in args
    run_now = None
    if "--run-now" in args:
        idx = args.index("--run-now")
        run_now = args[idx + 1].lower() if idx + 1 < len(args) else None

    cfg = load_config()

    # One-shot modes
    if dry_run:
        log.info("DRY RUN mode — testing full pipeline with sample data.")
        run_9am(cfg, dry_run=True)
        return

    if run_now:
        if run_now == "9am":
            run_9am(cfg)
        elif run_now == "2pm":
            run_2pm(cfg)
        else:
            print(f"Unknown meeting: {run_now}. Use '9am' or '2pm'.")
            sys.exit(1)
        return

    # Scheduled daemon mode
    log.info("Starting meeting automation scheduler.")
    log.info("Scheduled: every Wednesday at 09:00 (Teams) and 14:00 (Zoom).")
    log.info("Press Ctrl+C to stop.\n")

    schedule.every().wednesday.at("09:00").do(run_9am, cfg=cfg)
    schedule.every().wednesday.at("14:00").do(run_2pm, cfg=cfg)

    def handle_signal(sig, frame):
        log.info("Shutting down scheduler.")
        sys.exit(0)

    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)

    while True:
        schedule.run_pending()
        time.sleep(30)


if __name__ == "__main__":
    main()
