# 💊 HCP CRM — AI-First Log Interaction Screen

> An AI-first Customer Relationship Management system for Life Science field representatives.  
> Built with **React + Redux**, **FastAPI**, **LangGraph**, and **Groq LLMs**.

---

## 📌 Overview

This application implements the **Log Interaction Screen** of an HCP (Healthcare Professional) CRM module. Field representatives can log, review, and analyse their HCP visits through:

- **📋 Structured Form** — traditional field-by-field data entry with AI enrichment
- **🤖 Conversational Chat** — natural language interface powered by a LangGraph agent

AI enrichment is performed by **Groq's `gemma2-9b-it`** model (primary) and **`llama-3.3-70b-versatile`** (for HCP insights analysis).

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        React Frontend                        │
│  ┌──────────────┐        ┌──────────────────────────────┐   │
│  │  Structured  │        │    Conversational Chat UI    │   │
│  │  Form (CRUD) │        │  (LangGraph Agent Interface) │   │
│  └──────┬───────┘        └──────────────┬───────────────┘   │
│         │    Redux + Axios              │                    │
└─────────┼──────────────────────────────┼────────────────────┘
          │                              │
          ▼                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     FastAPI Backend                          │
│  ┌──────────────────┐    ┌──────────────────────────────┐   │
│  │  /api/interactions│    │       /api/chat              │   │
│  │  (REST CRUD)      │    │  (LangGraph Agent endpoint)  │   │
│  └────────┬─────────┘    └──────────────┬───────────────┘   │
│           │                             │                    │
│           │              ┌──────────────▼───────────────┐   │
│           │              │       LangGraph Agent         │   │
│           │              │  ┌─────────────────────────┐ │   │
│           │              │  │  Tool 1: log_interaction │ │   │
│           │              │  │  Tool 2: edit_interaction│ │   │
│           │              │  │  Tool 3: get_interaction │ │   │
│           │              │  │  Tool 4: list_interactions│ │   │
│           │              │  │  Tool 5: analyze_insights│ │   │
│           │              │  └────────────┬────────────┘ │   │
│           │              │               │ Groq API      │   │
│           │              │   gemma2-9b-it / llama-3.3-70b│  │
│           │              └──────────────┬───────────────┘   │
└───────────┼─────────────────────────────┼───────────────────┘
            │                             │
            ▼                             ▼
┌─────────────────────────────────────────────────────────────┐
│                   PostgreSQL Database                        │
│                    interactions table                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🤖 LangGraph Agent & Tools

The LangGraph agent acts as a **stateful AI orchestrator** for all HCP interaction management. On each user message, the agent reasons over the conversation, decides which tool to call, executes it, and returns an enriched response.

### Tool 1 — `log_interaction`
Captures a new HCP interaction. Raw field-rep notes are passed to **Groq gemma2-9b-it** for:
- **Summarisation** — a concise 2–3 sentence professional summary
- **Next steps extraction** — actionable follow-up items
- **Sentiment inference** — positive / neutral / negative

The enriched data is then persisted to PostgreSQL.

**Example prompt:**  
_"Log a visit with Dr. Priya Sharma at Fortis. She showed strong interest in Oncogen but requested more RCT data. Very engaged."_

---

### Tool 2 — `edit_interaction`
Modifies a specific field of an existing interaction by its ID.  
Supports: `hcp_name`, `hcp_specialty`, `hcp_institution`, `interaction_type`, `summary`, `next_steps`, `sentiment`, `raw_notes`, `products_discussed`.

**Example prompt:**  
_"Edit interaction 3 – change sentiment to positive."_

---

### Tool 3 — `get_interaction`
Retrieves the complete details of a single interaction by ID.

**Example prompt:**  
_"Show me the full details of interaction 5."_

---

### Tool 4 — `list_interactions`
Lists and searches recent interactions, optionally filtered by HCP name substring.

**Example prompt:**  
_"Show me all interactions with Dr. Kumar."_

---

### Tool 5 — `analyze_hcp_insights`
Uses **Groq `llama-3.3-70b-versatile`** to analyse an HCP's full interaction history and return:
- Key engagement patterns
- Preferred products / topics
- Relationship health score (1–10)
- Top 3 recommended next actions

**Example prompt:**  
_"Analyse HCP insights for Dr. Priya Sharma."_

---

## 🗄️ Database Schema

```sql
CREATE TABLE interactions (
  id                 SERIAL PRIMARY KEY,
  hcp_name           VARCHAR(255) NOT NULL,
  hcp_specialty      VARCHAR(255),
  hcp_institution    VARCHAR(255),
  interaction_type   VARCHAR(100),   -- visit | call | email | conference
  interaction_date   TIMESTAMP,
  products_discussed JSON,           -- array of product name strings
  summary            TEXT,           -- AI-generated
  next_steps         TEXT,           -- AI-generated
  sentiment          VARCHAR(50),    -- positive | neutral | negative
  raw_notes          TEXT,
  created_at         TIMESTAMP DEFAULT NOW(),
  updated_at         TIMESTAMP DEFAULT NOW()
);
```

---

## 🛠️ Tech Stack

| Layer       | Technology                                      |
|-------------|-------------------------------------------------|
| Frontend    | React 18, Redux Toolkit, Axios                  |
| Styling     | CSS-in-JS with Google Inter font                |
| Backend     | Python 3.11, FastAPI, Uvicorn                   |
| AI Agent    | LangGraph 0.2, LangChain, LangChain-Groq        |
| LLM Primary | Groq `gemma2-9b-it`                             |
| LLM Context | Groq `llama-3.3-70b-versatile`                  |
| Database    | PostgreSQL 16 via SQLAlchemy ORM                |
| Containers  | Docker + Docker Compose                         |

---

## 🚀 Getting Started

### Prerequisites
- Docker & Docker Compose installed
- A [Groq API key](https://console.groq.com/) (free tier available)

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/hcp-crm.git
cd hcp-crm
```

### 2. Set your Groq API key

```bash
export GROQ_API_KEY=your_groq_api_key_here
```

Or create a `.env` file in the root:

```
GROQ_API_KEY=your_groq_api_key_here
```

### 3. Start all services

```bash
docker-compose up --build
```

| Service  | URL                        |
|----------|----------------------------|
| Frontend | http://localhost:3000      |
| Backend  | http://localhost:8000      |
| API Docs | http://localhost:8000/docs |

---

## 💻 Local Development (without Docker)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Set environment variables
export DATABASE_URL=postgresql://postgres:password@localhost:5432/hcp_crm
export GROQ_API_KEY=your_key_here

# Start PostgreSQL separately, then:
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install

# Create .env
echo "REACT_APP_API_URL=http://localhost:8000/api" > .env

npm start
```

---

## 📁 Project Structure

```
hcp-crm/
├── backend/
│   ├── app/
│   │   ├── main.py               # FastAPI entry point
│   │   ├── api/
│   │   │   ├── interactions.py   # REST CRUD endpoints
│   │   │   └── chat.py           # LangGraph agent endpoint
│   │   ├── agents/
│   │   │   └── crm_agent.py      # LangGraph graph + 5 tools
│   │   ├── db/
│   │   │   └── database.py       # SQLAlchemy models + session
│   │   └── models/
│   │       └── schemas.py        # Pydantic request/response models
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.js                # Full CRM UI (Form + Chat modes)
│   │   ├── index.js
│   │   └── store/
│   │       ├── index.js          # Redux store
│   │       └── interactionsSlice.js  # All async thunks + state
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example
├── docker-compose.yml
└── README.md
```

---

## 🔌 API Reference

### Interactions (REST)

| Method | Endpoint                      | Description                  |
|--------|-------------------------------|------------------------------|
| POST   | `/api/interactions/`          | Create a new interaction     |
| GET    | `/api/interactions/`          | List interactions (+ search) |
| GET    | `/api/interactions/{id}`      | Get single interaction       |
| PUT    | `/api/interactions/{id}`      | Update interaction           |
| DELETE | `/api/interactions/{id}`      | Delete interaction           |

### Chat (LangGraph Agent)

| Method | Endpoint    | Description                                     |
|--------|-------------|-------------------------------------------------|
| POST   | `/api/chat/`| Send a message; agent picks and runs tools      |

**Chat request body:**
```json
{
  "message": "Log a visit with Dr. Arjun Mehta at AIIMS – discussed Cardovix, positive outcome.",
  "conversation_history": []
}
```

**Chat response:**
```json
{
  "response": "Interaction logged successfully for Dr. Arjun Mehta...",
  "interaction_data": { "id": 7, "hcp_name": "Dr. Arjun Mehta", "sentiment": "positive", ... },
  "action_taken": "log_interaction"
}
```

## 📝 Notes

- All AI calls go through **Groq's API** — no OpenAI dependency.
- The LangGraph agent uses a **ReAct-style loop**: `agent → tools → agent → … → END`.
- Redux manages all client state; no local component state for server data.
- The app is fully containerised and database migrations run automatically on startup via SQLAlchemy `create_all`.
