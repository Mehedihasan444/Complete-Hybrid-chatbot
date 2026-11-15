# Hybrid Medical Chatbot — HybridMed-AI

A sophisticated AI-powered medical chatbot that intelligently combines **trained machine learning models** for symptom analysis with an advanced **RAG (Retrieval-Augmented Generation) system** for comprehensive medical knowledge. Built with Next.js 16 (App Router), TypeScript, and a Python FastAPI backend served from a GPU notebook (Kaggle).

> **Repository layout:** This repo contains the **Next.js frontend** and its API routes. The **AI/ML backend** (FastAPI + the trained models) lives in [`trainning-notebooks/`](./trainning-notebooks) and runs in a GPU notebook environment; the frontend talks to it over HTTP via `NEXT_PUBLIC_BACKEND_URL`.

## 🎯 Dual AI System Architecture

### 1. Disease Prediction Engine
- **Stacking ML Ensemble**: SVM, Random Forest, XGBoost, Naive Bayes & Logistic Regression (top-3 stacked, LogisticRegression meta-learner) with hybrid TF-IDF features and SMOTE
- **DL Cascade**: fine-tuned PubMedBERT takes over when ML confidence < 75%
- **24 Medical Conditions**: covers diabetes, hypertension, pneumonia, arthritis, etc.
- **Confidence Scoring**: provides prediction confidence with alternative (differential) diagnoses
- **Uncertainty Flag**: predictions below 70% confidence are flagged UNCERTAIN

### 2. Medical Knowledge RAG System
- **Groq LLM Routing**: Groq-hosted Qwen classifies queries and analyzes medical images
- **Fine-Tuned LLaMA 3.1 8B**: self-trained on the Gale Encyclopedia for medical reasoning/generation (4-bit NF4)
- **FAISS Vector Store**: `IndexFlatIP` cosine search, `all-MiniLM-L6-v2` (384-dim), ~44,387 indexed chunks
- **Knowledge Source**: "The Gale Encyclopedia of Medicine (3rd Edition)", chunked at 500 chars / 50 overlap
- **Source Citations**: automatic referencing of relevant medical sources
- **Context-Aware**: retrieved context grounds the generated explanation

### 3. Intelligent Query Routing
- **Hybrid Detection**: automatically detects symptom vs. general medical vs. emergency queries
- **Multi-Modal Responses**: can combine prediction + knowledge for comprehensive answers
- **Fallback Mechanisms**: graceful, clearly-marked local fallback when the backend is unavailable
- **Safety First**: built-in medical disclaimers and emergency red-flag alerts

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (required by Next.js 16)
- A GPU environment for the backend (Kaggle T4/V100, or any CUDA Jupyter)
- Trained model artifacts — produced by the notebooks in `trainning-notebooks/` and loaded as Kaggle datasets

### Installation

1. **Install frontend dependencies**:
   ```bash
   npm install
   ```

2. **Run the Python backend** (GPU notebook):
   Open `chatbot-server.ipynb` in Kaggle (or another GPU Jupyter environment), add `GROQ_API_KEY` to the environment/secrets, and run all cells. The startup cell loads the model artifacts and prints a public **Cloudflare Quick Tunnel** URL (`https://*.trycloudflare.com`).
   > The four artifacts it loads — the ML stacking ensemble, fine-tuned PubMedBERT, fine-tuned LLaMA 3.1, and the FAISS RAG index — are produced by the other notebooks in `trainning-notebooks/` and attached as Kaggle datasets.

3. **Point the frontend at the backend**:
   Copy the printed tunnel URL into `.env` (see `.env.example`):
   ```bash
   NEXT_PUBLIC_BACKEND_URL=https://your-tunnel-url.trycloudflare.com
   ```

4. **Start the frontend**:
   ```bash
   npm run dev
   ```
   Then open http://localhost:3000.

> The backend cannot be started with a plain `python` command — it lives in the notebook and needs a GPU plus the trained artifacts. There is no `npm run setup-*` or `start-all` script; the only npm scripts are `dev`, `build`, `start`, `lint`, and `health-check`.

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Frontend (this repo)              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   Chat UI       │  │  Health Tips    │  │ Model Info   │ │
│  │   Components    │  │   Carousel      │  │   Panel      │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/REST (NEXT_PUBLIC_BACKEND_URL)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│          Hybrid Python Backend (trainning-notebooks/)       │
│               FastAPI on Kaggle + Cloudflare tunnel          │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │            Intelligent Query Router (Groq / Qwen)       │ │
│  │  ┌─────────────────┐  ┌─────────────────┐              │ │
│  │  │   Symptom       │  │    General      │              │ │
│  │  │  Detection      │  │   Medical       │              │ │
│  │  └─────────────────┘  └─────────────────┘              │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────┐              ┌─────────────────────────┐ │
│  │    Disease      │              │      RAG System        │ │
│  │   Prediction    │              │  (LLaMA 3.1 + FAISS)   │ │
│  │    Models       │              │                       │ │
│  │ ┌─────────────┐ │              │ ┌─────────────────────┐ │ │
│  │ │ ML Ensemble │ │              │ │   FAISS Vector      │ │ │
│  │ │ + PubMedBERT│ │              │ │      Store         │ │ │
│  │ │   cascade   │ │              │ │                    │ │ │
│  │ └─────────────┘ │              │ │ Gale Encyclopedia   │ │ │
│  └─────────────────┘              └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 Backend API Endpoints

The Python backend (`trainning-notebooks/final-chatbot-server.ipynb`) exposes:

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/chat` | Classify → route → ML/DL cascade or RAG → LLaMA explanation |
| POST | `/chat-with-attachments` | Medical image analysis (multipart `files` + optional `message`) |
| GET | `/health` | Server + per-model health |
| GET | `/model-info` | Model metadata (ML ensemble, PubMedBERT, LLaMA, RAG) |

`/chat` request (Pydantic-validated):
```json
{
  "query": "I have a headache and fever",
  "use_cascade": true,
  "patient_age": 35,
  "patient_gender": "male"
}
```
`/chat` response includes `query_type`, `model_used`, `predictions[]` (disease + confidence), `explanation`, `cascade_triggered`, `cascade_reason`, `confidence_flag`, `emergency_info`, and `inference_time_ms`.

The **frontend** additionally exposes Next.js routes under `/api/*`: `/api/chat`, `/api/attachments` (a server-side proxy that validates files before forwarding to the backend), `/api/auth/login`, `/api/auth/register`, `/api/conversations`, `/api/conversations/[id]`, `/api/health`, and `/api/model-info`.

## 🩺 Intelligent Features

### Query Type Detection
The backend (Groq/Qwen) classifies each query:

**Symptom queries** → ML/DL pipeline (with cascade)
- "I have a headache and fever"
- "Experiencing chest pain and difficulty breathing"

**General medical** → RAG + LLaMA
- "What causes diabetes?"
- "What are the risk factors for arthritis?"

**Emergency** → immediate alert + emergency protocol
- "I have crushing chest pain and can't breathe"

### Response Features
- **Confidence Levels**: all predictions include confidence percentages
- **Differential Diagnoses**: shows top alternative conditions
- **Medical Recommendations**: actionable advice based on predictions
- **Source Citations**: RAG responses reference medical sources
- **Processing Metrics**: response times and model used
- **Safety Disclaimers**: automatic medical safety warnings; UNCERTAIN flag below 70% confidence

## 📊 Model Performance

### Disease Prediction
- **ML Stacking Ensemble**: hybrid TF-IDF (word 1-2gram + char 3-5gram) + SMOTE, 5-fold stratified cross-validation, top-3 base learners + LogisticRegression meta-learner
- **DL Cascade**: fine-tuned PubMedBERT, triggered when ML confidence < 75%
- **Uncertainty threshold**: 70% — predictions below this are flagged UNCERTAIN
- **24 medical conditions** from the Symptom2Disease dataset

Individual base-learner validation results (from the training notebook):

| Model | Accuracy | Role |
|-------|----------|------|
| Naive Bayes | ~100% | Base learner |
| SVM Linear | ~99.6% | Base learner |
| SVM RBF | ~99.6% | Base learner |
| Random Forest | ~99.2% | Base learner |
| XGBoost | ~96.7% | Base learner |

### RAG System Performance
- **Retrieval**: FAISS `IndexFlatIP` (cosine), top-3 (symptom) / top-5 (general)
- **Embeddings**: `all-MiniLM-L6-v2` (384-dim)
- **Knowledge Base**: ~44,387 chunks from the Gale Encyclopedia of Medicine (3rd Edition)
- **Response Generation**: fine-tuned LLaMA 3.1 8B (4-bit NF4), grounded in retrieved context

## ⚠️ Medical Safety

### Built-in Safety Features
- **Emergency Red-Flag Detection**: chest pain, stroke signs (F.A.S.T.), breathing difficulty, severe bleeding, sudden vision loss, suicidal ideation — surfaced before any other content
- **Automatic Disclaimers**: all responses include medical safety warnings
- **Confidence Thresholds**: low-confidence predictions trigger caution messages
- **Professional Referral**: consistently recommends healthcare consultation
- **No Diagnosis Claims**: the system provides "educational information only"

### Ethical AI Principles
- **Transparency**: model confidence, model used, and source citations provided
- **Fallback Mechanisms**: graceful degradation when systems unavailable
- **Privacy Focus**: no personal medical data storage
- **Professional Boundaries**: clear limitations and professional referrals

## 🎨 User Interface

- **Dark/Light Theme**: manual toggle
- **Responsive Design**: desktop, tablet, mobile
- **Real-time Chat**: typing indicators, markdown rendering with XSS-safe formatting
- **Conversation History**: sidebar with search, pin, delete (owner-scoped)
- **Auth**: email/password registration & login (bcrypt, rate-limited)
- **Image Attachments**: medical image analysis with server-side file validation
- **Health Tips**: rotating educational carousel
- **Server Status**: live backend health indicator

## 🔧 Development

### Project Structure (this repo)
```
Complete-Hybrid-chatbot/
├── app/                              # Next.js 16 App Router
│   ├── api/
│   │   ├── chat/route.ts             # → backend /chat
│   │   ├── attachments/route.ts      # file proxy → backend /chat-with-attachments
│   │   ├── auth/{login,register}/    # bcrypt auth + rate limiting
│   │   ├── conversations/[id]/        # conversation CRUD (owner-scoped)
│   │   ├── health/, model-info/
│   ├── globals.css, layout.tsx, page.tsx
├── components/
│   ├── chat/                         # ChatInput, ChatMessage, ResponseDisplay, TypingIndicator
│   ├── auth/LoginModal.tsx
│   ├── ui/                           # shadcn/ui (Radix)
│   ├── ChatSidebar.tsx               # conversation history
│   ├── MedicalInfoPanel.tsx          # AI system info (settings panel)
│   ├── MedicalAlert.tsx              # emergency/disclaimer alerts
│   ├── HealthTip.tsx, ServerStatus.tsx
├── lib/
│   ├── chatService.ts               # query detection, red-flags, fallbacks, formatting
│   ├── pythonServerClient.ts         # HTTP client → Python backend
│   ├── responseFormatter.ts         # XSS-safe markdown renderer
│   ├── auth.ts                       # Zustand auth store
│   ├── mongodb.ts, rateLimiter.ts, utils.ts
├── config/chatbot_settings.json      # red-flags, thresholds, response templates
├── hooks/, types/
└── trainning-notebooks/              # Python backend + model training (Kaggle)
    ├── final-chatbot-server.ipynb        # the running FastAPI backend
    ├── machine_learning_Symtom_Classification.ipynb
    ├── Deep_Learning_Symptom_Classification.ipynb
    ├── knowledge-base-creation.ipynb
    └── llm-finetuning.ipynb
```

### Environment Variables
```bash
# Frontend → backend URL (printed by the notebook's startup cell)
NEXT_PUBLIC_BACKEND_URL=https://your-tunnel-url.trycloudflare.com

# MongoDB (users + conversations)
MONGODB_URI=your_mongodb_connection_string

# Session secret
SESSION_SECRET=your_random_secret_key
```
The backend additionally needs `GROQ_API_KEY` (set in the Kaggle environment/secrets, not in this repo).

## 🚀 Deployment

1. **Build frontend**: `npm run build`
2. **Set production environment variables** (`NEXT_PUBLIC_BACKEND_URL`, `MONGODB_URI`, `SESSION_SECRET`)
3. **Backend**: run `trainning-notebooks/final-chatbot-server.ipynb` in a GPU environment and expose it (Cloudflare tunnel / ngrok / hosted)
4. **Frontend**: deploy the Next.js app (Vercel, Netlify, or self-hosted `npm run start`)
5. **Configure CORS** and security headers

## 📈 Monitoring & Analytics
- **Request Metrics**: response times, success rates
- **Model Performance**: prediction confidence distributions, cascade trigger rate
- **System Health**: server status, per-model availability (`/health`)
- **Error Tracking**: automatic error logging

## 🤝 Contributing
This is a thesis project. The system is ready for medical-research, educational, and extension use (adding models or knowledge sources). For suggestions, refer to the project documentation or contact the development team.

## 🛠️ Technologies Used
- **Frontend**: Next.js 16 (App Router), React 18, TypeScript
- **UI**: Tailwind CSS, Radix UI, shadcn/ui, Zustand, sonner
- **Backend**: FastAPI, Pydantic, Groq (Qwen), PyTorch (PubMedBERT + fine-tuned LLaMA 3.1 8B 4-bit), scikit-learn (stacking ensemble), FAISS, sentence-transformers
- **Database**: MongoDB (users + conversations), bcrypt auth
- **Icons**: Lucide React
- **Development**: ESLint, PostCSS

## 📄 License & Disclaimer

**Educational and Research Use Only**

This system is designed for educational and research purposes. It should not be used as a substitute for professional medical advice, diagnosis, or treatment. Always consult qualified healthcare professionals for medical concerns. In case of emergency, contact emergency services immediately.
