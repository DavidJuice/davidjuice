import os
from dotenv import load_dotenv

load_dotenv()


def load_config() -> dict:
    required = [
        "ANTHROPIC_API_KEY",
        "TEAMS_MEETING_URL",
        "ZOOM_MEETING_URL",
        "GOOGLE_DRIVE_FOLDER_ID_9AM",
        "GOOGLE_DRIVE_FOLDER_ID_2PM",
    ]
    missing = [k for k in required if not os.getenv(k)]
    if missing:
        raise EnvironmentError(
            f"Missing required environment variables: {', '.join(missing)}\n"
            "Copy .env.example to .env and fill in the values."
        )

    return {
        "anthropic_api_key": os.environ["ANTHROPIC_API_KEY"],
        "teams_url": os.environ["TEAMS_MEETING_URL"],
        "zoom_url": os.environ["ZOOM_MEETING_URL"],
        "folder_9am": os.environ["GOOGLE_DRIVE_FOLDER_ID_9AM"],
        "folder_2pm": os.environ["GOOGLE_DRIVE_FOLDER_ID_2PM"],
        "doc_name_format": os.getenv("GOOGLE_DOC_NAME_FORMAT", "%Y-%m-%d {time} Meeting Notes"),
        "credentials_file": os.getenv("GOOGLE_CREDENTIALS_FILE", "credentials.json"),
        "token_file": os.getenv("GOOGLE_TOKEN_FILE", "token.json"),
    }
