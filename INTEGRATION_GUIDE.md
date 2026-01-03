# 🏥 HybridMed-AI - Integration Guide

## Project Overview

**HybridMed-AI** is an intelligent medical chatbot system that combines traditional machine learning, deep learning transformers, and retrieval-augmented generation (RAG) for accurate disease prediction and evidence-based medical explanations.

### Key Features

✨ **Intelligent Query Routing**
- LLAMA 3.1 sanitizes and classifies all queries
- Symptom queries → ML/DL pipeline
- General medical questions → Direct LLM/RAG
- Emergency detection with red-flag alerts

🧠 **Cascading Architecture**
- **Fast ML Ensemble** for initial predictions
- **BioBERT DL Model** cascade when ML confidence < 75%
- **LLAMA 3.1 8B** (fine-tuned on Gale Encyclopedia) for explanations

📚 **Medical Knowledge Base**
- The Gale Encyclopedia of Medicine (3rd Edition)
- 44,387 chunks indexed in FAISS
- Semantic search with sentence-transformers

🛡️ **Safety Mechanisms**
- Emergency red-flag detection (chest pain, stroke signs, etc.)
- Medical disclaimers on all responses
- Confidence thresholding for cascade
- LIME explainability (planned)

---

## System Architecture

```
User Query
    ↓
┌─────────────────────────────────────────┐
│  LLAMA 3.1 (Query Sanitization)        │
│  • Classify: symptom/general/emergency │
│  • Extract symptoms                     │
│  • Detect red flags                     │
└─────────────────────────────────────────┘
    ↓
    ├─── Symptom Query ─────────────────────┐
    │                                        │
    │  ┌──────────────────────────────┐     │
    │  │  ML Ensemble (Fast)          │     │
    │  │  Confidence ≥ 75%?           │     │
    │  └──────────────────────────────┘     │
    │         │                              │
    │    ┌────┴────┐                         │
    │   Yes       No                         │
    │    │         │                         │
    │    │    ┌────────────────────┐         │
    │    │    │ BioBERT DL Cascade │         │
    │    │    └────────────────────┘         │
    │    │         │                         │
    │    └─────────┴───────┐                 │
    │                      ↓                 │
    │            ┌──────────────────┐        │
    │            │ RAG Retrieval    │        │
    │            │ (FAISS Search)   │        │
    │            └──────────────────┘        │
    │                      ↓                 │
    │            ┌──────────────────┐        │
    │            │ LLAMA 3.1        │        │
    │            │ (Explanation)    │        │
    │            └──────────────────┘        │
    │                                        │
    └────────────────────────────────────────┘
    │
    ├─── General Medical Query ──────────────┐
    │                                        │
    │         ┌──────────────────┐           │
    │         │ RAG Retrieval    │           │
    │         │ (FAISS Search)   │           │
    │         └──────────────────┘           │
    │                 ↓                      │
    │         ┌──────────────────┐           │
    │         │ LLAMA 3.1        │           │
    │         │ (Answer Gen)     │           │
    │         └──────────────────┘           │
    │                                        │
    └────────────────────────────────────────┘
    │
    └─── Emergency Query ─────────────────────┐
                                              │
              ⚠️ IMMEDIATE ALERT              │
              + Medical Context               │
                                              │
              └────────────────────────────────┘
```

---

## 🚀 Quick Start

### Step 1: Start Kaggle Backend (HybridMed-AI)

1. **Open Kaggle Notebook:** `chatbot.ipynb`

2. **Ensure all datasets are attached:**
   - `symtom2disease-prediction-ml-model` (ML Ensemble)
   - `pubbert-tarined-model-on-symtom2disease` (BioBERT)
   - `medical-llama3-1-8b-finetuned-merged-4bit` (LLAMA 3.1)
   - `gale-encyclopidic-knowledge-base` (RAG FAISS index)

3. **Run all cells** in sequence (each cell builds the service files)

4. **Start the server** (last cell) and copy the ngrok URL:
   ```
   📡 PUBLIC URL: https://xxxxx.ngrok-free.app
   ```

5. **Keep the notebook running!** The server must stay active.

### Step 2: Configure Frontend

1. **Update `.env.local`:**
   ```env
   NEXT_PUBLIC_BACKEND_URL=https://xxxxx.ngrok-free.app
   ```

2. **Install dependencies** (if not done):
   ```bash
   npm install
   ```

3. **Start Next.js:**
   ```bash
   npm run dev
   ```

4. **Open browser:** `http://localhost:3000`

---

## 📊 How It Works

### Query Processing Flow

**Example 1: Symptom Query**
```
User: "I have a headache and fever"

1. LLAMA 3.1 Sanitization
   → Category: "symptom"
   → Symptoms: ["headache", "fever"]
   → Route: "ml_dl"

2. ML Ensemble Prediction
   → Migraine: 82% confidence
   → ✓ Above threshold (75%)

3. RAG Retrieval
   → Get Gale Encyclopedia context about Migraine

4. LLAMA 3.1 Explanation
   → Generate patient-friendly explanation with citations

5. Response to User
   → Explanation + Predictions + Confidence
```

**Example 2: General Medical Query**
```
User: "What causes diabetes?"

1. LLAMA 3.1 Sanitization
   → Category: "general_medical"
   → Route: "llm_rag"

2. RAG Retrieval (Direct)
   → Search 44,387 chunks for diabetes information

3. LLAMA 3.1 Answer Generation
   → Generate comprehensive answer with citations

4. Response to User
   → Answer with sources
```

**Example 3: Emergency Query**
```
User: "Severe chest pain can't breathe"

1. LLAMA 3.1 Sanitization
   → Category: "emergency"
   → Red Flags: ["chest pain", "breathing difficulty"]

2. Immediate Alert
   → ⚠️ EMERGENCY: Call 911 immediately!

3. Medical Context (Optional)
   → Provide possible condition info

4. Response to User
   → Emergency instructions + medical context
```

---

## 📡 API Endpoints

### 1. **Main Chat Endpoint** (Primary)
```http
POST /chat
```
**Request:**
```json
{
  "query": "I have a headache and fever",
  "use_cascade": true
}
```

**Response (Symptom Query):**
```json
{
  "success": true,
  "query_processed": "headache fever",
  "model_used": "ml_ensemble",
  "predictions": [
    {
      "disease": "Migraine",
      "confidence": 0.82,
      "probability": 0.82
    },
    {
      "disease": "Common Cold",
      "confidence": 0.65,
      "probability": 0.65
    }
  ],
  "explanation": "Based on your symptoms of headache and fever...",
  "inference_time_ms": 1234.5,
  "cascade_triggered": false
}
```

**Response (General Query):**
```json
{
  "success": true,
  "query_processed": "what causes diabetes",
  "model_used": "local_llama",
  "predictions": [],
  "explanation": "Diabetes is caused by...",
  "inference_time_ms": 2100.0,
  "cascade_triggered": false
}
```

**Response (Emergency):**
```json
{
  "success": true,
  "query_processed": "chest pain can't breathe",
  "model_used": "ml_ensemble",
  "predictions": [],
  "explanation": "⚠️ EMERGENCY ALERT: Call 911 immediately...",
  "inference_time_ms": 500.0,
  "cascade_triggered": false
}
```

### 2. **Health Check**
```http
GET /health
```
**Response:**
```json
{
  "status": "healthy",
  "models": {
    "grok": true,
    "ml_ensemble": true,
    "biobert": true,
    "llama": true,
    "rag": true
  },
  "configuration": {
    "ml_threshold": 0.75,
    "dl_cascade_enabled": true,
    "rag_chunks": 44387
  }
}
```

### 3. **Model Information**
```http
GET /model-info
```
**Response:**
```json
{
  "project": "HybridMed-AI",
  "version": "3.0.0",
  "symptomsModel": {
    "modelType": "ensemble",
    "numClasses": 24,
    "accuracy": 0.97,
    "conditions": ["Diabetes", "Hypertension", "Migraine", ...]
  },
  "dlModel": {
    "modelType": "BioBERT",
    "purpose": "Cascade when ML confidence < threshold"
  },
  "ragModel": {
    "source": "The Gale Encyclopedia of Medicine (3rd Edition)",
    "chunks": 44387,
    "embeddingModel": "sentence-transformers/all-MiniLM-L6-v2",
    "vectorStore": "FAISS"
  },
  "llmModel": {
    "name": "LLAMA 3.1 8B",
    "quantization": "4-bit",
    "fineTunedOn": "Gale Encyclopedia of Medicine",
    "purpose": "Explanation generation & query classification"
  },
  "configuration": {
    "ml_threshold": 0.75,
    "dl_cascade_enabled": true
  }
}
```

### 4. **Direct Symptom Prediction**
```http
POST /predict-symptoms
```
**Request:**
```json
{
  "symptoms": "headache, fever, nausea",
  "patient_age": 35,
  "patient_gender": "male"
}
```

### 5. **Direct Medical Q&A**
```http
POST /ask-medical
```
**Request:**
```json
{
  "question": "What causes diabetes?",
  "context_type": "general"
}
```

---

## �️ Key Features & Configuration

### Intelligent Query Routing

**LLAMA 3.1 Classification Engine:**
- Analyzes every query before processing
- Categories: `symptom`, `general_medical`, `emergency`, `irrelevant`
- Confidence scoring for routing decisions

**Routing Rules:**
```python
# Backend Configuration (main.py)
ML_CONFIDENCE_THRESHOLD = 0.75  # If ML < 75%, cascade to DL
USE_DL_CASCADE = True           # Enable BioBERT cascade

# Routing Logic:
if query_type == "symptom":
    → ML Ensemble
    → If confidence < 0.75: Cascade to BioBERT
    → RAG for context
    → LLAMA for explanation
    
elif query_type == "general_medical":
    → Direct to RAG retrieval
    → LLAMA for answer generation
    
elif query_type == "emergency":
    → Immediate alert
    → Optional ML prediction
    → Emergency protocols
```

### Emergency Red-Flag Detection

**Detected Patterns:**
- **Chest Pain:** "chest pain", "tightness in chest", "crushing chest"
- **Breathing:** "difficulty breathing", "can't breathe", "gasping"
- **Stroke Signs:** "face drooping", "arm weakness", "slurred speech"
- **Severe Bleeding:** "vomiting blood", "coughing blood"
- **Consciousness:** "losing consciousness", "passed out"
- **Mental Health:** "want to die", "suicidal thoughts"

**Emergency Response:**
1. Immediate alert displayed
2. Instructions to call 911
3. Safety protocols
4. Optional medical context provided

### ML/DL Cascading System

**Performance Thresholds:**
```
ML Ensemble Confidence ≥ 75% → Use ML prediction
ML Ensemble Confidence < 75% → Cascade to BioBERT DL
```

**Benefits:**
- ⚡ Fast predictions (ML: ~100ms)
- 🎯 Accurate predictions (DL: ~2000ms when needed)
- 💰 Cost-effective (DL only when necessary)
- 📊 Best of both worlds

### RAG Knowledge Base

**The Gale Encyclopedia of Medicine:**
- **Total Chunks:** 44,387
- **Chunk Size:** 1000 tokens
- **Overlap:** 200 tokens
- **Vector Store:** FAISS
- **Embedding Model:** sentence-transformers/all-MiniLM-L6-v2
- **Retrieval:** Top-K semantic search (K=3-5)

**Coverage:**
- General health conditions
- Chronic diseases
- Medications and treatments
- Emergency care procedures
- Preventive medicine
- Symptoms and diagnosis

---

## 🔄 Data Flow Examples

### Symptom Analysis with ML
```
User: "I have persistent cough and fever for 3 days"

1. Sanitization (LLAMA 3.1)
   Input: "I have persistent cough and fever for 3 days"
   Output: {
     category: "symptom",
     symptoms: ["cough", "fever"],
     confidence: 0.95
   }

2. ML Ensemble Prediction
   Input: ["cough", "fever"]
   Output: {
     predictions: [
       { disease: "Pneumonia", confidence: 0.88 },
       { disease: "Bronchitis", confidence: 0.72 },
       { disease: "Common Cold", confidence: 0.65 }
     ],
     should_cascade: false (0.88 > 0.75)
   }

3. RAG Context Retrieval
   Query: "Pneumonia"
   Retrieved: 3 relevant chunks from Gale Encyclopedia

4. LLAMA Explanation
   Input: disease="Pneumonia" + context + symptoms
   Output: "Based on your symptoms of persistent cough and fever, 
            you may have Pneumonia. Pneumonia is an infection..."

5. Frontend Display
   - Explanation text
   - Primary diagnosis: Pneumonia (88%)
   - Differential diagnosis list
   - Model: ML Ensemble
   - Processing time: 1200ms
```

### General Medical Question
```
User: "How to prevent diabetes?"

1. Sanitization (LLAMA 3.1)
   Output: {
     category: "general_medical",
     route_to: "llm_rag"
   }

2. RAG Retrieval (Direct)
   Query: "prevent diabetes"
   Retrieved: 5 chunks about diabetes prevention

3. LLAMA Answer Generation
   Input: context chunks about diabetes prevention
   Output: "Diabetes prevention involves several lifestyle 
            modifications: 1. Maintain healthy weight..."

4. Frontend Display
   - Answer text
   - Sources: Gale Encyclopedia
   - Model: LLAMA 3.1 RAG
   - Processing time: 2100ms
```

---

## 🛠️ Key Changes Made

### Backend (Kaggle Notebook)

1. **Added Missing Endpoints:**
   - `/predict-symptoms` - Direct symptom classification
   - `/ask-medical` - RAG-based medical Q&A
   - `/model-info` - Model metadata

2. **Enhanced `/chat` Endpoint:**
   - Improved error handling
   - Better response formatting
   - Irrelevant query detection

3. **Updated Schemas:**
   - Added request/response models for all endpoints
   - Full Pydantic validation

### Frontend (Next.js)

1. **Updated `lib/chatService.ts`:**
   - Better response formatting with sections
   - Improved confidence display
   - Enhanced medical disclaimer

2. **Updated `lib/pythonServerClient.ts`:**
   - Increased timeout to 60 seconds (for Kaggle)
   - All endpoints now properly typed

3. **Existing Features Maintained:**
   - MongoDB conversation storage
   - User authentication
   - File attachments
   - Dark mode
   - Health tips

---

## ⚡ Performance Optimization

### Kaggle Backend
- **First Request:** 2-5 seconds (model warm-up)
- **Subsequent Requests:** 1-3 seconds
- **Models:** All loaded in memory (no re-loading)

### Frontend
- **Timeout:** 60 seconds (accommodates Kaggle)
- **Fallback:** Graceful error messages if backend unavailable
- **Retry:** Automatic retry on connection errors

---

## 🐛 Troubleshooting

### Common Issues

**Issue: "Models not loaded" in health check**
```
Symptoms: /health shows models: false
Solution:
1. Check Kaggle notebook cell outputs for errors
2. Verify dataset paths in main.py match your Kaggle datasets
3. Ensure all 4 datasets are attached to notebook
4. Re-run model loading cells
5. Check Kaggle logs for memory issues
```

**Issue: "Request timeout" on first query**
```
Symptoms: 60-second timeout on first request
Cause: Models warming up (LLAMA 3.1 first inference)
Solution:
1. Wait 60 seconds for first request
2. Subsequent requests will be fast
3. This is normal behavior
4. Consider keeping notebook warm
```

**Issue: "Cannot connect to Python server"**
```
Symptoms: Frontend shows server unavailable
Solution:
1. Check Kaggle notebook is running
2. Verify ngrok URL in .env.local
3. Test: Visit {ngrok_url}/health in browser
4. Check ngrok tunnel hasn't expired
5. Restart notebook if needed
```

**Issue: "Low prediction confidence"**
```
Symptoms: All predictions < 75%, constant DL cascade
Cause: Vague or unclear symptom description
Solution:
1. Ask user for more specific symptoms
2. This is working as intended
3. DL cascade provides better accuracy
4. Consider lowering threshold if needed
```

**Issue: "RAG returns no context"**
```
Symptoms: Explanations are generic
Solution:
1. Check FAISS index loaded: /health
2. Verify documents.json exists
3. Check RAG path in main.py
4. Ensure Gale dataset attached
```

### Debugging Tools

**1. Backend Logs (Kaggle Notebook)**
```python
# Check what's being processed
Look for:
  📥 Query: ...
  🔍 Classification: ...
  📍 Route To: ...
  ✓ ML Result: ...
  ✅ Prediction Complete
```

**2. FastAPI Interactive Docs**
```
Visit: {ngrok_url}/docs
- Test endpoints directly
- See request/response schemas
- Debug without frontend
```

**3. Frontend Console**
```javascript
// Browser DevTools Console
// Check for errors
// Look for API responses
```

**4. Health Check Details**
```bash
curl {ngrok_url}/health | jq
# Check all model statuses
# Verify configuration
```

---

## 🔒 Security & Safety

### Medical Safety Features

**✅ Implemented:**
- Medical disclaimers on all responses
- Emergency red-flag detection
- Professional consultation recommendations
- Clear limitations statements
- Confidence thresholds prevent overconfidence
- No diagnosis claims (informational only)

**⚠️ Important Disclaimers:**
```
This AI system:
- Provides educational information only
- Does NOT replace professional medical advice
- Cannot perform physical examinations
- Cannot access medical records
- Should not be used for emergencies (call 911)
- Requires verification by healthcare professionals
```

### Data Security

**Current Implementation:**
- ✅ HTTPS via ngrok (encrypted transit)
- ✅ No PHI/PII storage in backend
- ✅ Conversation history in MongoDB (frontend only)
- ✅ No query logging in production mode
- ⚠️ API keys in notebook (Kaggle private)

**Production Recommendations:**
- [ ] Add API authentication tokens
- [ ] Implement rate limiting
- [ ] Use secrets management for API keys
- [ ] Add request sanitization
- [ ] HIPAA compliance review (if needed)
- [ ] Audit logging system
- [ ] User consent mechanisms

---

## 📈 Performance Optimization

### Backend Optimizations

**Model Loading:**
```python
# Models loaded once at startup
# Cached in memory for fast inference
# No re-loading between requests
```

**Caching Strategies:**
```python
# Future: Add Redis for RAG results
# Cache common queries
# Pre-compute embeddings
```

**Async Processing:**
```python
# FastAPI async endpoints
# Concurrent RAG retrieval
# Parallel model inference (future)
```

### Frontend Optimizations

**Request Management:**
```typescript
// 60-second timeout (accommodates Kaggle)
// Automatic retry on failure
// Debounced input
// Loading states
```

**Response Formatting:**
```typescript
// Markdown rendering
// Lazy loading conversations
// Pagination for history
```

---

## 🚀 Deployment Guide

### Development (Current)
```
✓ Kaggle Notebook (Backend)
✓ ngrok Tunnel (HTTPS)
✓ Local Next.js (Frontend)
✓ MongoDB Atlas (Database)
```

### Production Deployment

**Option 1: Cloud VM**
```
Backend:
1. Deploy FastAPI to AWS EC2 / GCP Compute / Azure VM
2. Use Nginx reverse proxy
3. PM2 for process management
4. SSL certificate (Let's Encrypt)

Frontend:
1. Deploy to Vercel (recommended)
2. Or Netlify / AWS Amplify
3. Environment variables in platform
```

**Option 2: Containerized**
```
Backend:
1. Dockerize FastAPI app
2. Deploy to AWS ECS / GCP Cloud Run
3. Use Cloud Load Balancer

Frontend:
1. Build Next.js static export
2. Deploy to CDN
3. API calls to backend service
```

**Option 3: Serverless** (Not recommended for this project)
```
Reason: Models too large for serverless
- LLAMA 3.1: 5GB
- BioBERT: 2GB
- RAG Index: 1GB
Total: 8+ GB (exceeds serverless limits)
```

### Cost Estimation

**Kaggle (Free Tier):**
- ✓ GPU: Free 30 hours/week
- ✓ Models: No storage costs
- ⚠️ Limited runtime
- ⚠️ Not production-ready

**Production (AWS Example):**
```
EC2 g4dn.xlarge (GPU):
- $0.526/hour = ~$380/month
- 4 vCPUs, 16GB RAM, T4 GPU
- Suitable for this workload

Alternative (CPU-only with smaller models):
- $0.20/hour = ~$150/month
- m5.large instance
- Requires model optimization
```

---

## 🧪 Testing Guide

### Test Scenarios

**1. Symptom Query (High Confidence - ML Only)**
```
Query: "I have a severe headache and sensitivity to light"
Expected:
  ✓ Classified as "symptom"
  ✓ ML prediction: Migraine (85%+)
  ✓ No DL cascade (confidence > 75%)
  ✓ RAG context retrieved
  ✓ LLAMA explanation generated
  ✓ Response time: 1-2 seconds
```

**2. Symptom Query (Low Confidence - DL Cascade)**
```
Query: "I feel generally unwell and tired"
Expected:
  ✓ Classified as "symptom"
  ✓ ML prediction: Various (60-70%)
  ✓ DL cascade triggered (confidence < 75%)
  ✓ BioBERT refinement
  ✓ Response time: 3-5 seconds
```

**3. General Medical Question**
```
Query: "What are the risk factors for heart disease?"
Expected:
  ✓ Classified as "general_medical"
  ✓ No ML/DL prediction
  ✓ Direct RAG retrieval
  ✓ LLAMA answer generation
  ✓ Response time: 2-3 seconds
```

**4. Emergency Detection**
```
Query: "Severe chest pain radiating to left arm"
Expected:
  ✓ Classified as "emergency"
  ✓ Red flags detected
  ✓ Emergency alert shown
  ✓ 911 call instructions
  ✓ Response time: <1 second
```

**5. Irrelevant Query**
```
Query: "What's the weather today?"
Expected:
  ✓ Classified as "irrelevant"
  ✓ Polite redirect message
  ✓ No medical processing
  ✓ Response time: <500ms
```

### Testing Checklist

**Backend (Kaggle Notebook):**
- [ ] All cells execute without errors
- [ ] Models load successfully
- [ ] ngrok tunnel established
- [ ] `/health` endpoint returns healthy status
- [ ] All model flags show `true`

**Frontend (Next.js):**
- [ ] Environment variable set correctly
- [ ] Server status indicator shows green
- [ ] Chat interface loads
- [ ] Messages send and receive
- [ ] Responses formatted correctly

**Integration:**
- [ ] Symptom queries get predictions
- [ ] General queries get answers
- [ ] Emergency queries trigger alerts
- [ ] Confidence levels display
- [ ] Cascade indicator shows when triggered
- [ ] Processing times reasonable
- [ ] Error handling works (try with backend off)

### Performance Benchmarks

**Expected Response Times:**
```
Symptom Query (ML only):     1-2 seconds
Symptom Query (with DL):     3-5 seconds
General Medical Query:       2-3 seconds
Emergency Detection:         <1 second
Model Loading (startup):     2-5 minutes
```

**Model Memory Usage:**
```
ML Ensemble:    ~500 MB
BioBERT:        ~2 GB
LLAMA 3.1 (4bit): ~5 GB
RAG FAISS:      ~1 GB
Total:          ~8.5 GB (fits in Kaggle GPU)
```

---

## 📝 Development Roadmap

### ✅ Completed Features

- [x] LLAMA 3.1 query classification
- [x] ML Ensemble disease prediction
- [x] BioBERT DL cascade
- [x] RAG with Gale Encyclopedia (44,387 chunks)
- [x] LLAMA 3.1 explanation generation
- [x] Emergency red-flag detection
- [x] Intelligent query routing
- [x] FastAPI backend
- [x] Next.js frontend
- [x] MongoDB conversation storage
- [x] User authentication
- [x] Dark mode UI
- [x] Health monitoring

### 🚧 In Progress

- [ ] LIME explainability integration
- [ ] Image analysis for skin conditions
- [ ] Voice input/output
- [ ] Multi-language support

### 🔮 Future Enhancements

**Model Improvements:**
- [ ] Fine-tune BioBERT on medical dataset
- [ ] Expand disease coverage (24 → 100+)
- [ ] Add medication interaction checker
- [ ] Implement multi-modal diagnosis (text + images)

**System Features:**
- [ ] Streaming responses (SSE)
- [ ] Real-time collaboration
- [ ] Appointment scheduling integration
- [ ] Telemedicine video calls
- [ ] Lab result interpretation
- [ ] Prescription management

**Technical:**
- [ ] Redis caching layer
- [ ] GraphQL API
- [ ] WebSocket support
- [ ] Mobile app (React Native)
- [ ] Progressive Web App (PWA)
- [ ] Offline mode
- [ ] Cloud deployment

**Analytics:**
- [ ] Usage analytics dashboard
- [ ] Model performance tracking
- [ ] User feedback loop
- [ ] A/B testing framework

---

## 📚 Additional Resources

### Documentation
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [Next.js Docs](https://nextjs.org/docs)
- [LLAMA 3.1 Model Card](https://huggingface.co/meta-llama/Meta-Llama-3.1-8B)
- [FAISS Documentation](https://github.com/facebookresearch/faiss)

### Medical Resources
- The Gale Encyclopedia of Medicine (3rd Edition)
- [PubMed](https://pubmed.ncbi.nlm.nih.gov/)
- [MedlinePlus](https://medlineplus.gov/)

### Dataset Sources
- Kaggle: symtom2disease-prediction-ml-model
- Kaggle: pubbert-tarined-model-on-symtom2disease
- Kaggle: medical-llama3-1-8b-finetuned-merged-4bit
- Kaggle: gale-encyclopidic-knowledge-base

---

## 🤝 Contributing

### Code Structure
```
Backend (Kaggle Notebook):
├── grok_service.py      # LLAMA 3.1 classification
├── ml_model.py          # ML Ensemble
├── biobert_model.py     # BioBERT DL model
├── llama_service.py     # LLAMA 3.1 generation
├── rag_service.py       # RAG with FAISS
├── schemas.py           # Pydantic models
└── main.py              # FastAPI app

Frontend (Next.js):
├── app/
│   ├── page.tsx         # Main chat UI
│   └── api/             # API routes
├── components/          # React components
├── lib/
│   ├── chatService.ts   # Chat orchestration
│   └── pythonServerClient.ts  # Backend client
└── types/               # TypeScript types
```

### Making Changes

**Backend:**
1. Edit service files in Kaggle notebook
2. Run `%%writefile` cells to update files
3. Restart FastAPI server (last cell)
4. Test via `/docs` endpoint

**Frontend:**
1. Edit TypeScript/React files
2. Next.js hot-reloads automatically
3. Test in browser
4. Check console for errors

---

## 📄 License & Disclaimer

### Educational Use Only

This project is developed for educational and research purposes. It demonstrates the integration of multiple AI technologies for medical applications.

### Medical Disclaimer

**⚠️ IMPORTANT:**

This system:
- **IS NOT** a medical device
- **IS NOT** approved by FDA or any regulatory body
- **CANNOT** diagnose, treat, cure, or prevent any disease
- **SHOULD NOT** replace professional medical advice
- **MUST NOT** be used for medical emergencies

**For emergencies, always call 911 or go to the nearest emergency room.**

Users should:
- Consult healthcare professionals for medical advice
- Verify all information with qualified sources
- Seek immediate care for serious symptoms
- Never delay medical treatment based on AI advice

### Data Privacy

- No Protected Health Information (PHI) is stored
- Queries are processed in real-time
- Conversation history stored locally (MongoDB)
- No data shared with third parties
- User discretion advised

---

## 🆘 Support & Contact

### Getting Help

1. **Check Documentation:** Review this guide and README
2. **Test Health Endpoint:** Verify backend status
3. **Check Logs:** Review Kaggle notebook output
4. **Browser Console:** Check for frontend errors
5. **API Docs:** Test via `/docs` endpoint

### Reporting Issues

When reporting issues, include:
- Query that caused the issue
- Backend logs from Kaggle
- Frontend console errors
- Health check response
- Steps to reproduce

---

## 🎉 Conclusion

**You now have a complete HybridMed-AI system with:**

✅ Intelligent query routing (LLAMA 3.1)  
✅ Fast ML predictions with DL cascade  
✅ 44,387-chunk medical knowledge base  
✅ Emergency detection system  
✅ Patient-friendly explanations  
✅ Modern responsive UI  
✅ Real-time conversation  

**Next Steps:**

1. ✨ Start the Kaggle notebook
2. 🔗 Update frontend environment variable
3. 🚀 Launch Next.js application
4. 💬 Test with sample queries
5. 📊 Monitor performance
6. 🎯 Plan future enhancements

**Happy Building! 🏥💻**

---

*HybridMed-AI v3.0.0 - Last Updated: January 2, 2026*
