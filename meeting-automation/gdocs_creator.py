"""
Creates a styled Google Doc with Noto Sans KR font and moves it to a
designated Google Drive folder.

Document structure produced:
  Title (heading)
  EXECUTIVE SUMMARY (bold header, 13pt)
  [executive summary text]
  DETAILED SUMMARY — 한국어 (bold header, 13pt)
  [Korean summary text]
  DETAILED SUMMARY — ENGLISH (bold header, 13pt)
  [English summary text]

Font: Noto Sans KR throughout (native Google Font — no install needed).
"""
import os
import sys
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build


FONT = "Noto Sans KR"
BODY_SIZE = 11       # pt
HEADER_SIZE = 13     # pt
TITLE_SIZE = 16      # pt

SECTION_HEADERS = [
    "EXECUTIVE SUMMARY",
    "DETAILED SUMMARY — 한국어",
    "DETAILED SUMMARY — ENGLISH",
]


def _get_services(token_file: str):
    creds = Credentials.from_authorized_user_file(token_file)
    docs = build("docs", "v1", credentials=creds)
    drive = build("drive", "v3", credentials=creds)
    return docs, drive


def _build_requests(content: str) -> list:
    """
    Build the Google Docs API batchUpdate requests to:
      1. Insert all text
      2. Apply Noto Sans KR body style to everything
      3. Bold and enlarge the section header lines
    """
    requests = []

    # Insert text at the start of the document body (index 1)
    requests.append({
        "insertText": {
            "location": {"index": 1},
            "text": content,
        }
    })

    # Apply Noto Sans KR + 11pt to the whole document
    requests.append({
        "updateTextStyle": {
            "range": {"startIndex": 1, "endIndex": 1 + len(content)},
            "textStyle": {
                "weightedFontFamily": {"fontFamily": FONT},
                "fontSize": {"magnitude": BODY_SIZE, "unit": "PT"},
            },
            "fields": "weightedFontFamily,fontSize",
        }
    })

    # Bold + 13pt for each section header line
    for header in SECTION_HEADERS:
        idx = content.find(header)
        if idx == -1:
            continue
        start = 1 + idx
        end = start + len(header)
        requests.append({
            "updateTextStyle": {
                "range": {"startIndex": start, "endIndex": end},
                "textStyle": {
                    "bold": True,
                    "fontSize": {"magnitude": HEADER_SIZE, "unit": "PT"},
                },
                "fields": "bold,fontSize",
            }
        })

    return requests


def create_doc(
    title: str,
    content: str,
    folder_id: str,
    token_file: str = "token.json",
) -> str:
    """
    Create a Google Doc with the given title and content, styled with
    Noto Sans KR, and move it into the specified Drive folder.
    Returns the document ID.
    """
    docs, drive = _get_services(token_file)

    # Create the document
    doc = docs.documents().create(body={"title": title}).execute()
    doc_id = doc["documentId"]

    # Apply content and styling
    requests = _build_requests(content)
    docs.documents().batchUpdate(
        documentId=doc_id,
        body={"requests": requests},
    ).execute()

    # Move from root ("My Drive") to the designated folder
    # First get current parents so we can remove them
    file_meta = drive.files().get(fileId=doc_id, fields="parents").execute()
    current_parents = ",".join(file_meta.get("parents", []))

    drive.files().update(
        fileId=doc_id,
        addParents=folder_id,
        removeParents=current_parents,
        fields="id,parents",
    ).execute()

    return doc_id


# ---------------------------------------------------------------------------
# CLI test
# ---------------------------------------------------------------------------

SAMPLE_CONTENT = """\
EXECUTIVE SUMMARY
This meeting reviewed Q1 financial results, which exceeded revenue targets by 12%. The team aligned on Q2 priorities including the mobile app launch and Korea partnership, with specific owners and deadlines assigned.

DETAILED SUMMARY — 한국어
이번 회의에서는 1분기 재무 실적을 검토하였으며, 매출 목표를 12% 초과 달성한 것으로 확인되었습니다. 1분기 매출은 240만 달러를 기록하였고, 이는 목표치를 크게 상회하는 결과입니다. 다만 3월에 엔지니어 5명을 신규 채용함에 따라 비용이 다소 초과되었습니다.

2분기 핵심 과제로는 모바일 앱 출시와 한국 파트너십 구축이 선정되었습니다. David은 4월 15일까지 한국 파트너십 제안서를 제출하기로 하였으며, Sarah는 이번 주 말까지 2분기 예산안 초안을 완성할 예정입니다. 다음 회의는 동일 시간대에 다음 주 수요일에 진행됩니다.

DETAILED SUMMARY — ENGLISH
This meeting covered Q1 financial results and Q2 planning. Q1 revenue reached $2.4M, 12% above target. Costs were slightly over budget due to five new engineering hires in March.

For Q2, the team identified two strategic priorities: the mobile app launch and the Korea partnership. David took ownership of the Korea partnership proposal, with a deadline of April 15. Sarah committed to delivering a Q2 budget draft by end of the current week. The next meeting is scheduled for the following Wednesday at the same time.
"""

if __name__ == "__main__":
    if "--test" not in sys.argv:
        print("Usage: python gdocs_creator.py --test")
        print("Requires GOOGLE_DRIVE_FOLDER_ID env var and a valid token.json")
        sys.exit(1)

    folder_id = os.environ.get("GOOGLE_DRIVE_FOLDER_ID_9AM") or os.environ.get("TEST_FOLDER_ID")
    if not folder_id:
        print("Set GOOGLE_DRIVE_FOLDER_ID_9AM (or TEST_FOLDER_ID) in your environment.")
        sys.exit(1)

    token_file = os.environ.get("GOOGLE_TOKEN_FILE", "token.json")
    print(f"Creating test doc in folder {folder_id}...")
    doc_id = create_doc(
        title="TEST — 2026-04-02 9AM Meeting Notes",
        content=SAMPLE_CONTENT,
        folder_id=folder_id,
        token_file=token_file,
    )
    print(f"Created: https://docs.google.com/document/d/{doc_id}")
