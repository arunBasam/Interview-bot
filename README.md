# 🎙 PM Mock Interview Bot

An AI-powered voice interview bot for Product Management interview prep.
Talk to an AI interviewer by voice, get asked PM questions, and receive detailed feedback.

---

## How It Works

```
You (Browser) ──── voice ────► LiveKit Room
                                    │
                         LiveKit Agent (Python)
                                    │
                         OpenAI Realtime API (GPT-4o)
                                    │
                         AI Interviewer Voice ◄─────
```

1. You open the browser, upload your resume (optional), enter your name
2. Click "Start Interview" — a LiveKit room is created
3. The Python agent joins the room and connects to OpenAI Realtime API
4. You have a real voice conversation with "Alex", the AI PM interviewer
5. After you end the interview, GPT-4o analyzes the transcript and gives you scored feedback

---

## Prerequisites

- Python 3.11+
- Node.js 18+
- OpenAI API key (with Realtime API access)
- LiveKit Cloud account (free tier works): https://cloud.livekit.io

---

## Setup

### 1. Clone & configure

```bash
git clone <your-repo>
cd pm-interview-bot
```

### 2. Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your keys:
#   OPENAI_API_KEY=sk-...
#   LIVEKIT_URL=wss://your-project.livekit.cloud
#   LIVEKIT_API_KEY=your_key
#   LIVEKIT_API_SECRET=your_secret
```

### 3. Frontend setup

```bash
cd frontend
npm install

cp .env.example .env
# Default: VITE_API_URL=http://localhost:8000 (no changes needed for local dev)
```

---

## Running Locally

You need **3 terminals**:

### Terminal 1 — FastAPI server
```bash
cd backend
source venv/bin/activate
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

### Terminal 2 — LiveKit Agent
```bash
cd backend
source venv/bin/activate
python agent/interviewer_agent.py dev
```
The agent will connect to LiveKit and wait for interview rooms to be created.

### Terminal 3 — React frontend
```bash
cd frontend
npm run dev
```

Open http://localhost:5173 in your browser.

---

## Project Structure

```
pm-interview-bot/
├── backend/
│   ├── agent/
│   │   └── interviewer_agent.py    # LiveKit agent (the AI interviewer)
│   ├── api/
│   │   └── main.py                 # FastAPI REST API
│   ├── prompts/
│   │   └── interview_prompts.py    # AI interviewer system prompts
│   ├── services/
│   │   ├── database.py             # SQLite session/transcript storage
│   │   ├── feedback.py             # Post-interview scoring
│   │   └── resume_parser.py        # PDF text extraction
│   └── requirements.txt
│
├── frontend/
│   └── src/
│       ├── App.jsx                 # Root with routing
│       ├── hooks/useInterview.jsx  # Global state
│       ├── pages/
│       │   ├── SetupPage.jsx       # Home + resume upload
│       │   ├── InterviewPage.jsx   # Live voice interview
│       │   └── ResultsPage.jsx     # Feedback + transcript
│       ├── services/api.js         # Backend API calls
│       └── styles.css              # All styles
```

---

## PM Interview Coverage

The AI interviewer (Alex) covers all key PM interview areas:

| Area | Example Questions |
|---|---|
| **Product Sense** | "Design a product for elderly users to stay connected with family" |
| **Metrics** | "How would you measure success for Instagram Reels?" |
| **Execution** | "DAU dropped 15% overnight — walk me through your investigation" |
| **Strategy** | "Should Spotify expand into podcasting? What's your framework?" |
| **Estimation** | "Estimate the number of Uber rides in Bengaluru per day" |
| **Behavioral** | "Tell me about a time you had to influence without authority" |

---

## Customization

### Change the AI voice
In `agent/interviewer_agent.py`, change the `voice` parameter:
```python
voice="alloy"   # Options: alloy, echo, fable, onyx, nova, shimmer
```

### Modify interview focus
Edit `prompts/interview_prompts.py` → `BASE_INTERVIEWER_PROMPT` to:
- Change question categories
- Adjust difficulty level
- Change interview duration
- Modify Alex's personality

### Interview duration
Default is 30 minutes max. Change in `agent/interviewer_agent.py`:
```python
await asyncio.sleep(1800)  # 1800 seconds = 30 minutes
```

---

## Deployment

### Backend (Railway / Render)

1. Push to GitHub
2. Create two services on Railway:
   - **API**: `uvicorn api.main:app --host 0.0.0.0 --port $PORT`
   - **Agent**: `python agent/interviewer_agent.py start` (set `LIVEKIT_URL` etc.)
3. Set all env vars in Railway dashboard

### Frontend (Vercel)

```bash
cd frontend
npm run build
# Deploy dist/ to Vercel
# Set VITE_API_URL to your Railway API URL
```

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/upload-resume` | Upload PDF, returns extracted text |
| POST | `/api/prepare-session` | Create session with resume text |
| POST | `/api/start-interview` | Get LiveKit token + room |
| POST | `/api/end-interview` | End session, generate feedback |
| GET  | `/api/session/{id}` | Get transcript + feedback |
| GET  | `/api/sessions` | List recent sessions |

---

## Cost Estimates

| Usage | Cost (approx) |
|---|---|
| 30 min interview | ~$0.30–0.60 (OpenAI Realtime) |
| Feedback generation | ~$0.02 (GPT-4o) |
| LiveKit | Free up to 10k mins/month |

OpenAI Realtime API pricing: $0.06/min audio input + $0.24/min audio output
