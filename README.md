# JEE AI Agent

> AI-powered JEE Chemistry study assistant with RAG-powered note retrieval, chat history sync, and an intelligent mentoring persona.

---

## 🚀 What It Does

**JEE AI Agent** is a Node.js + Express backend that powers an AI chatbot for JEE (Joint Entrance Examination) Chemistry students. It uses **Retrieval-Augmented Generation (RAG)** to load your JEE Chemistry notes and answer questions grounded in that material — not just generic AI responses.

It also features:
- **Multi-model AI routing** — uses Google Gemini Flash for intelligent note retrieval, OpenAI GPT-4o for main responses
- **Supabase integration** — chat history sync, note pinning across sessions
- **"Bhaiya" mentor persona** — a friendly, approachable tutor personality for engaging study sessions
- **Markdown + Math rendering** — beautifully formatted chemical equations and explanations
- **Built-in frontend** — a ready-to-use chat UI in the `frontend/` folder

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Runtime** | Node.js |
| **Backend Framework** | Express.js |
| **AI Models** | Google Gemini (Flash + Pro), OpenAI GPT-4o |
| **Database** | Supabase (PostgreSQL) |
| **Environment** | dotenv |
| **CORS** | cors middleware |
| **Frontend** | Custom UI in `frontend/` |

---

## 📁 Project Structure

```
JEE-AI-Agent/
├── index.js                  # Main Express server entry point
├── package.json              # Dependencies and scripts
├── .env.example              # Environment variable template
├── .gitignore                # Git ignore rules
├── frontend/                 # Chat UI frontend
├── prompt_engineering/       # Prompt templates & persona configs
├── syllabus_docs/            # JEE Chemistry syllabus references
├── notes_staging/            # Notes processing pipeline
├── data/                     # Supporting data files
├── how_to_build_this.md      # Complete engineering guide (40KB+)
├── future_roadmap.md         # Feature roadmap
├── report.md                 # Project status report
└── ... (test files, output logs, etc.)
```

---

## ⚡ Quick Start

### 1. Clone the repo

```bash
git clone https://github.com/Vedant1922/JEE-AI-Agent.git
cd JEE-AI-Agent
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example env file and fill in your keys:

```bash
cp .env.example .env
```

Edit `.env` and add:
- **Gemini API key** — get one at [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
- **OpenAI API key** — get one at [platform.openai.com](https://platform.openai.com)
- **Supabase credentials** — from your Supabase project dashboard
- **PORT** — default is `3000`

### 4. Start the server

```bash
npm start
```

The server will run at `http://localhost:3000`.

### 5. Open the frontend

Open `frontend/` in your browser or connect your own frontend to the backend API.

---

## 🧠 How It Works

### AI Router
The system uses a **two-model strategy**:
- **Gemini Flash** — fast, efficient retrieval of relevant notes from your JEE Chemistry material
- **GPT-4o** — the main response engine, generating detailed explanations with the "Bhaiya" mentor persona

### RAG Pipeline
1. Student asks a question
2. Gemini Flash retrieves the most relevant notes from the loaded JEE Chemistry material
3. Relevant context is injected into the GPT-4o prompt
4. GPT-4o generates a grounded, accurate response with the mentor persona

### Supabase Sync
- Chat history is saved to Supabase for persistence across sessions
- Notes can be "pinned" for quick access
- Mobile-friendly UI with full chat management

---

## 🔧 Environment Variables

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Google Gemini API key |
| `OPENAI_API_KEY` | OpenAI API key |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_KEY` | Supabase anonymous/anon key |
| `PORT` | Server port (default: 3000) |

See `.env.example` for the exact format.

---

## 📚 JEE Chemistry Coverage

The system is trained/loaded with **20+ units of JEE Chemistry** notes covering:

- **Physical Chemistry** — Mole concept, thermodynamics, equilibrium, kinetics, electrochemistry, solutions, etc.
- **Organic Chemistry** — GOC, hydrocarbons, halogen compounds, alcohols, carbonyls, amines, biomolecules, etc.
- **Inorganic Chemistry** — Periodic table, chemical bonding, coordination compounds, p-block, d-block, etc.

---

## 🗺️ Roadmap

See [`future_roadmap.md`](future_roadmap.md) for planned features and improvements.

---

## 📖 Deep Dive

For a complete engineering breakdown of every file, framework choice, and logic flow, read:

**[`how_to_build_this.md`](how_to_build_this.md)** — A 40KB+ guide that explains the entire project from scratch: Node.js, Express, the Event Loop, AI integration, RAG architecture, Supabase, prompt engineering, and more. Written as a tutorial so you can build this (or something like it) yourself.

---

## 🤝 Contributing

Feel free to fork, open issues, or submit pull requests.

---

## 📄 License

This project is open source. Feel free to use it for learning and building your own AI study tools.

---

**Built with ❤️ for JEE aspirants.**
