"""
One-time Google OAuth setup script.

Run this once before using the automation:
    python setup_google_auth.py

It will open a browser window asking you to sign in to Google and grant
access to Google Docs and Google Drive. The resulting token is cached to
token.json so subsequent runs are fully automated (no browser needed).

Prerequisites:
  1. Go to https://console.cloud.google.com
  2. Create a project (or select an existing one)
  3. Enable these two APIs:
       - Google Docs API
       - Google Drive API
  4. Go to APIs & Services → Credentials → Create Credentials → OAuth client ID
  5. Choose "Desktop app" as the application type
  6. Download the JSON file and save it as credentials.json in this directory
  7. Run this script
"""
import os
import sys
from google_auth_oauthlib.flow import InstalledAppFlow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request

SCOPES = [
    "https://www.googleapis.com/auth/documents",
    "https://www.googleapis.com/auth/drive",
]


def setup_auth(credentials_file: str = "credentials.json", token_file: str = "token.json"):
    creds = None

    # Load existing token if available
    if os.path.exists(token_file):
        creds = Credentials.from_authorized_user_file(token_file, SCOPES)

    # Refresh or re-authorize as needed
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            print("Refreshing expired token...")
            creds.refresh(Request())
        else:
            if not os.path.exists(credentials_file):
                print(f"ERROR: '{credentials_file}' not found.")
                print(__doc__)
                sys.exit(1)
            print("Opening browser for Google sign-in...")
            flow = InstalledAppFlow.from_client_secrets_file(credentials_file, SCOPES)
            creds = flow.run_local_server(port=0)

        # Save the token for future runs
        with open(token_file, "w") as f:
            f.write(creds.to_json())
        print(f"Token saved to {token_file}")

    print("Google authentication successful.")
    print(f"Scopes granted: {creds.scopes}")
    return creds


if __name__ == "__main__":
    credentials_file = os.environ.get("GOOGLE_CREDENTIALS_FILE", "credentials.json")
    token_file = os.environ.get("GOOGLE_TOKEN_FILE", "token.json")
    setup_auth(credentials_file, token_file)
