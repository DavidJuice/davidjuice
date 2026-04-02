"""
Sends Granola transcript + AI notes to Claude (claude-sonnet-4-6) and returns
a structured bilingual summary document ready to be inserted into Google Docs.
"""
import anthropic
import os
import sys


PROMPT_TEMPLATE = """\
You are a professional business communications assistant fluent in both Korean and English.

Given the meeting transcript and AI-generated notes below, produce a document with exactly these three sections in this order. Use the section headers exactly as shown.

---

EXECUTIVE SUMMARY
[Write 2–3 concise sentences in English summarizing the key outcomes, decisions, and next steps from the meeting.]

DETAILED SUMMARY — 한국어
[Write a comprehensive, professional summary in Korean (한국어). Cover all major discussion points, decisions made, action items, and any important context. Use formal business Korean (격식체).]

DETAILED SUMMARY — ENGLISH
[Write the same comprehensive summary in English. This should mirror the Korean section in depth and coverage.]

---

TRANSCRIPT:
{transcript}

AI NOTES:
{ai_notes}
"""


def summarize(transcript: str, ai_notes: str) -> str:
    """
    Call Claude to generate a bilingual executive + detailed summary.
    Returns the full formatted text ready for insertion into a Google Doc.
    """
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        messages=[
            {
                "role": "user",
                "content": PROMPT_TEMPLATE.format(
                    transcript=transcript,
                    ai_notes=ai_notes,
                ),
            }
        ],
    )
    return message.content[0].text


# ---------------------------------------------------------------------------
# CLI test
# ---------------------------------------------------------------------------

SAMPLE_TRANSCRIPT = """\
[09:02] John: Let's get started. Today we're reviewing Q1 results and planning Q2.
[09:04] Sarah: Q1 revenue came in at $2.4M, which is 12% above target. Costs were slightly over.
[09:06] John: Great. What's driving the overrun on costs?
[09:07] Sarah: Mainly hiring — we brought on 5 engineers in March.
[09:10] John: For Q2, we need to prioritize the mobile app launch and the Korea partnership.
[09:14] David: I can own the Korea partnership outreach. I'll have a proposal by April 15.
[09:16] John: Perfect. Sarah, can you put together a Q2 budget draft by end of week?
[09:17] Sarah: Will do.
[09:18] John: Alright, let's wrap up. Next meeting same time next Wednesday.
"""

SAMPLE_NOTES = """\
Key Points:
- Q1 revenue $2.4M, 12% above target
- Cost overrun due to 5 new engineering hires in March
- Q2 priorities: mobile app launch, Korea partnership

Action Items:
- David: Korea partnership proposal by April 15
- Sarah: Q2 budget draft by end of this week
- Next meeting: Wednesday same time
"""

if __name__ == "__main__":
    if "--test" in sys.argv or len(sys.argv) == 1:
        print("Running with sample transcript and notes...\n")
        result = summarize(SAMPLE_TRANSCRIPT, SAMPLE_NOTES)
        print(result)
