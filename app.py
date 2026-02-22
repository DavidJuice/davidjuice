import os
import json
from flask import Flask, request, jsonify, render_template_string
import anthropic

app = Flask(__name__)
client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

SYSTEM_PROMPT = """당신은 감정 처리 워크시트를 안내하는 공감적인 상담 도우미입니다.
사용자가 선택한 감정(예: 분노, 혐오, 수치, 슬픔, 절망, 두려움)을 바탕으로,
"4+이야기 기록지" 형식에 따라 단계별로 질문을 합니다.

워크시트 진행 순서:
1. [준비] 준비리스트를 확인합니다. 아래 항목들을 사용자가 확인하도록 안내하세요:
   - 이 이야기는 너무 강렬하지 않은 수준이어야 합니다.
   - 이 이야기를 전에 말한 적이 있습니다.
   - 이 이야기를 하면서 나 자신을 보호할 필요가 없습니다.
   - 이 이야기는 나에 대한 이야기입니다.
   - 이 이야기는 특정 느낌들을 예시합니다.
   준비가 되면 다음 단계로 넘어갑니다.

2. [상황과 생각] 두 가지를 물어봅니다:
   - "간단히 상황을 설명해 주세요."
   - "그 상황에서 떠오른 당신의 생각은 무엇이었나요?"

3. [감정 단어] 물어봅니다:
   - "이야기 중에 느꼈던 감정을 묘사하는 단어들을 나열해 주세요."

4. [몸의 느낌] 물어봅니다:
   - "이 이야기 속에서 당신의 몸이 느낀 것은 무엇이었나요? (예: 가슴이 답답함, 손이 떨림 등)"

5. [나답게 행동하기] 물어봅니다:
   - "이 이야기 속에서 나답게(혹은 최선의 나로서) 행동했던 것은 무엇인가요?"
   - 만약 그렇지 못했다면: "지금 돌이켜봤을 때, 어떻게 행동했기를 원하나요?"

6. [체크리스트] 마지막으로 체크리스트를 함께 확인합니다:
   - 진실한 감정을 표현했나요?
   - 감정을 설명하는 느낌 단어들을 사용했나요?
   - 몸의 감각에 대해 설명했나요?
   - 나의 이야기처럼 말했나요? (자서전적으로)
   - 이야기를 간결하게 유지했나요?

안내 원칙:
- 한국어로 대화합니다.
- 따뜻하고 공감적인 어조를 유지합니다.
- 각 단계를 천천히, 한 번에 하나씩 진행합니다.
- 사용자의 답변을 요약하고 반영해 주며 다음 질문으로 넘어갑니다.
- 판단하지 않고 있는 그대로 수용합니다.
"""

HTML_PAGE = """<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>4+이야기 기록지</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif;
      background: #f0f4f8;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    header {
      width: 100%;
      background: #2c3e50;
      color: white;
      padding: 18px 24px;
      text-align: center;
    }

    header h1 {
      font-size: 1.3rem;
      font-weight: 700;
      letter-spacing: 0.04em;
    }

    header p {
      font-size: 0.85rem;
      margin-top: 4px;
      opacity: 0.75;
    }

    .emotion-section {
      width: 100%;
      max-width: 680px;
      padding: 20px 16px 0;
    }

    .emotion-label {
      font-size: 0.8rem;
      font-weight: 600;
      color: #555;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 10px;
    }

    .emotion-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .emotion-btn {
      padding: 10px 18px;
      border: 2px solid #ccc;
      background: white;
      border-radius: 24px;
      font-size: 0.95rem;
      cursor: pointer;
      transition: all 0.2s;
      color: #333;
      font-weight: 500;
    }

    .emotion-btn:hover { border-color: #2c3e50; color: #2c3e50; }

    .emotion-btn.active {
      border-color: transparent;
      color: white;
      font-weight: 600;
    }

    .emotion-btn[data-emotion="분노"].active  { background: #e74c3c; }
    .emotion-btn[data-emotion="혐오"].active  { background: #8e44ad; }
    .emotion-btn[data-emotion="수치"].active  { background: #d35400; }
    .emotion-btn[data-emotion="슬픔"].active  { background: #2980b9; }
    .emotion-btn[data-emotion="절망"].active  { background: #2c3e50; }
    .emotion-btn[data-emotion="두려움"].active { background: #27ae60; }

    .subtitle {
      max-width: 680px;
      width: 100%;
      padding: 12px 16px 0;
      font-size: 1.05rem;
      font-weight: 700;
      color: #2c3e50;
      min-height: 36px;
      transition: opacity 0.3s;
    }

    .chat-container {
      width: 100%;
      max-width: 680px;
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 12px 16px 16px;
      gap: 8px;
    }

    .messages {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 12px;
      background: white;
      border-radius: 16px;
      border: 1px solid #dde1e7;
      min-height: 380px;
      max-height: 480px;
    }

    .message {
      max-width: 85%;
      padding: 12px 16px;
      border-radius: 16px;
      font-size: 0.93rem;
      line-height: 1.55;
      white-space: pre-wrap;
    }

    .message.ai {
      background: #f0f4f8;
      color: #2c3e50;
      align-self: flex-start;
      border-bottom-left-radius: 4px;
    }

    .message.user {
      background: #2c3e50;
      color: white;
      align-self: flex-end;
      border-bottom-right-radius: 4px;
    }

    .input-row {
      display: flex;
      gap: 8px;
      align-items: flex-end;
    }

    textarea {
      flex: 1;
      border: 2px solid #dde1e7;
      border-radius: 12px;
      padding: 12px 14px;
      font-size: 0.93rem;
      font-family: inherit;
      resize: none;
      outline: none;
      min-height: 48px;
      max-height: 140px;
      line-height: 1.5;
      transition: border-color 0.2s;
    }

    textarea:focus { border-color: #2c3e50; }
    textarea:disabled { background: #f8f9fa; color: #999; }

    #send-btn {
      background: #2c3e50;
      color: white;
      border: none;
      border-radius: 12px;
      padding: 13px 20px;
      font-size: 0.9rem;
      cursor: pointer;
      font-weight: 600;
      transition: background 0.2s;
      white-space: nowrap;
    }

    #send-btn:hover:not(:disabled) { background: #1a252f; }
    #send-btn:disabled { background: #bdc3c7; cursor: not-allowed; }

    .placeholder-msg {
      color: #aaa;
      font-size: 0.9rem;
      text-align: center;
      margin: auto;
    }

    .typing-indicator {
      display: flex;
      gap: 4px;
      padding: 12px 16px;
      background: #f0f4f8;
      border-radius: 16px;
      border-bottom-left-radius: 4px;
      align-self: flex-start;
      width: fit-content;
    }

    .typing-dot {
      width: 8px; height: 8px;
      background: #7f8c8d;
      border-radius: 50%;
      animation: bounce 1.2s infinite;
    }

    .typing-dot:nth-child(2) { animation-delay: 0.2s; }
    .typing-dot:nth-child(3) { animation-delay: 0.4s; }

    @keyframes bounce {
      0%, 60%, 100% { transform: translateY(0); }
      30% { transform: translateY(-6px); }
    }

    #reset-btn {
      align-self: flex-end;
      background: none;
      border: 1px solid #ccc;
      border-radius: 8px;
      padding: 5px 12px;
      font-size: 0.78rem;
      cursor: pointer;
      color: #666;
      margin-top: -4px;
    }

    #reset-btn:hover { background: #f8f9fa; }
  </style>
</head>
<body>

<header>
  <h1>4+ 이야기 기록지</h1>
  <p>감정을 선택하고 AI 안내에 따라 이야기를 나누세요</p>
</header>

<div class="emotion-section">
  <div class="emotion-label">감정 선택</div>
  <div class="emotion-buttons">
    <button class="emotion-btn" data-emotion="분노">분노</button>
    <button class="emotion-btn" data-emotion="혐오">혐오</button>
    <button class="emotion-btn" data-emotion="수치">수치</button>
    <button class="emotion-btn" data-emotion="슬픔">슬픔</button>
    <button class="emotion-btn" data-emotion="절망">절망</button>
    <button class="emotion-btn" data-emotion="두려움">두려움</button>
  </div>
</div>

<div class="subtitle" id="subtitle"></div>

<div class="chat-container">
  <button id="reset-btn" style="display:none">대화 초기화</button>
  <div class="messages" id="messages">
    <div class="placeholder-msg" id="placeholder">감정을 선택하면 대화가 시작됩니다.</div>
  </div>
  <div class="input-row">
    <textarea id="user-input" placeholder="메시지를 입력하세요..." rows="1" disabled></textarea>
    <button id="send-btn" disabled>전송</button>
  </div>
</div>

<script>
  let selectedEmotion = null;
  let conversationHistory = [];
  let isLoading = false;

  const messagesEl = document.getElementById('messages');
  const placeholderEl = document.getElementById('placeholder');
  const subtitleEl = document.getElementById('subtitle');
  const inputEl = document.getElementById('user-input');
  const sendBtn = document.getElementById('send-btn');
  const resetBtn = document.getElementById('reset-btn');

  document.querySelectorAll('.emotion-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (isLoading) return;
      document.querySelectorAll('.emotion-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedEmotion = btn.dataset.emotion;
      subtitleEl.textContent = `${selectedEmotion}에서 나답게 행동하기`;
      startConversation();
    });
  });

  function startConversation() {
    conversationHistory = [];
    messagesEl.innerHTML = '';
    placeholderEl && placeholderEl.remove();
    inputEl.disabled = false;
    sendBtn.disabled = false;
    resetBtn.style.display = 'block';
    sendToAI(`사용자가 "${selectedEmotion}" 감정을 선택했습니다. 워크시트를 시작해 주세요. 먼저 따뜻하게 인사하고, 준비리스트를 안내해 주세요.`, true);
  }

  function addMessage(role, text) {
    const div = document.createElement('div');
    div.className = `message ${role}`;
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  function showTyping() {
    const div = document.createElement('div');
    div.className = 'typing-indicator';
    div.id = 'typing';
    div.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function removeTyping() {
    const t = document.getElementById('typing');
    if (t) t.remove();
  }

  async function sendToAI(userMessage, isSystem = false) {
    if (isLoading) return;
    isLoading = true;
    inputEl.disabled = true;
    sendBtn.disabled = true;

    if (!isSystem) {
      addMessage('user', userMessage);
      conversationHistory.push({ role: 'user', content: userMessage });
    } else {
      conversationHistory.push({ role: 'user', content: userMessage });
    }

    showTyping();

    try {
      const res = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emotion: selectedEmotion,
          messages: conversationHistory
        })
      });

      const data = await res.json();
      removeTyping();

      if (data.error) {
        addMessage('ai', '오류가 발생했습니다. 다시 시도해 주세요.');
      } else {
        const aiText = data.reply;
        conversationHistory.push({ role: 'assistant', content: aiText });
        addMessage('ai', aiText);
      }
    } catch (e) {
      removeTyping();
      addMessage('ai', '연결에 문제가 생겼습니다. 다시 시도해 주세요.');
    }

    isLoading = false;
    inputEl.disabled = false;
    sendBtn.disabled = false;
    inputEl.focus();
  }

  function handleSend() {
    const text = inputEl.value.trim();
    if (!text || !selectedEmotion || isLoading) return;
    inputEl.value = '';
    inputEl.style.height = 'auto';
    sendToAI(text);
  }

  sendBtn.addEventListener('click', handleSend);

  inputEl.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  inputEl.addEventListener('input', () => {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 140) + 'px';
  });

  resetBtn.addEventListener('click', () => {
    if (!selectedEmotion || isLoading) return;
    startConversation();
  });
</script>
</body>
</html>
"""

@app.route("/")
def index():
    return render_template_string(HTML_PAGE)

@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    emotion = data.get("emotion", "")
    messages = data.get("messages", [])

    if not messages:
        return jsonify({"error": "No messages provided"}), 400

    system = SYSTEM_PROMPT + f"\n\n현재 사용자가 선택한 감정: {emotion}"

    try:
        with client.messages.stream(
            model="claude-opus-4-6",
            max_tokens=1024,
            thinking={"type": "adaptive"},
            system=system,
            messages=messages,
        ) as stream:
            reply = stream.get_final_message()

        text = next(
            (block.text for block in reply.content if block.type == "text"), ""
        )
        return jsonify({"reply": text})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)
