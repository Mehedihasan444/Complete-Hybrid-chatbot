"""
Hybrid Medical Chatbot Server
============================

FastAPI server that combines disease prediction models and RAG system
for intelligent medical query routing and response generation.
"""

import os
import sys
import re
import logging
import uuid
import base64
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any
from contextlib import asynccontextmanager
from collections import defaultdict
import io

# Disable ChromaDB telemetry to prevent PostHog errors
os.environ['ANONYMIZED_TELEMETRY'] = 'False'
os.environ['CHROMA_TELEMETRY'] = 'False'

import uvicorn
from fastapi import FastAPI, HTTPException, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Import Google Generative AI for vision capabilities
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    genai = None

# Add project paths to system path
current_dir = Path(__file__).parent
disease_prediction_dir = current_dir.parent / "disease prediction implementation 1"
rag_dir = current_dir.parent / "llm rag implementation 1" / "medical_chatbot"

sys.path.append(str(disease_prediction_dir))
sys.path.append(str(rag_dir))

# Import our systems
from src.medical_chatbot_predictor import MedicalChatbotPredictor
from src.rag_pipeline import RAGPipeline

# Import enhanced modules for human-friendly responses
from response_formatter import MedicalResponseFormatter, PatientContext
from symptom_extractor import SymptomExtractor, analyze_symptoms
from conversation_manager import ConversationManager, get_conversation_manager

# Configure logging to suppress ChromaDB telemetry errors
logging.basicConfig(level=logging.INFO)
logging.getLogger('chromadb.telemetry.product.posthog').setLevel(logging.CRITICAL)
logging.getLogger('chromadb').setLevel(logging.WARNING)
logger = logging.getLogger(__name__)

# Global variables for our models
disease_predictor: Optional[MedicalChatbotPredictor] = None
rag_pipeline: Optional[RAGPipeline] = None
vision_model = None  # Gemini vision model for image analysis

# Initialize enhanced modules
response_formatter = MedicalResponseFormatter()
symptom_extractor = SymptomExtractor()
conversation_mgr = get_conversation_manager()

server_stats = {
    "startup_time": None,
    "total_requests": 0,
    "symptom_requests": 0,
    "rag_requests": 0,
    "hybrid_requests": 0,
    "errors": 0,
    "last_error": None
}

# Chat session management
chat_sessions: Dict[str, Dict[str, Any]] = {}
SESSION_TIMEOUT_MINUTES = 60  # Sessions expire after 60 minutes of inactivity

# Helper functions for session management
def get_or_create_session(session_id: Optional[str] = None) -> tuple[str, Dict[str, Any]]:
    """Get existing session or create new one"""
    global chat_sessions
    
    # Clean up expired sessions
    current_time = datetime.now()
    expired_sessions = [
        sid for sid, session in chat_sessions.items()
        if current_time - session['last_activity'] > timedelta(minutes=SESSION_TIMEOUT_MINUTES)
    ]
    for sid in expired_sessions:
        del chat_sessions[sid]
    
    # Get or create session
    if session_id and session_id in chat_sessions:
        session = chat_sessions[session_id]
        session['last_activity'] = current_time
        return session_id, session
    else:
        # Create new session
        new_session_id = str(uuid.uuid4())
        chat_sessions[new_session_id] = {
            'created_at': current_time,
            'last_activity': current_time,
            'conversation_history': [],
            'user_context': {}
        }
        return new_session_id, chat_sessions[new_session_id]

def add_to_conversation_history(session_id: str, user_message: str, bot_response: str, metadata: Dict[str, Any]):
    """Add a conversation turn to session history"""
    if session_id in chat_sessions:
        chat_sessions[session_id]['conversation_history'].append({
            'timestamp': datetime.now().isoformat(),
            'user': user_message,
            'bot': bot_response,
            'metadata': metadata
        })
        # Keep only last 20 turns to manage memory
        if len(chat_sessions[session_id]['conversation_history']) > 20:
            chat_sessions[session_id]['conversation_history'] = chat_sessions[session_id]['conversation_history'][-20:]

def get_conversation_context(session_id: str, max_turns: int = 5) -> str:
    """Get recent conversation history as context string"""
    if session_id not in chat_sessions:
        return ""
    
    history = chat_sessions[session_id]['conversation_history'][-max_turns:]
    if not history:
        return ""
    
    context_parts = ["Previous conversation:"]
    for turn in history:
        context_parts.append(f"User: {turn['user']}")
        # Add abbreviated bot response (first 200 chars)
        bot_preview = turn['bot'][:200] + "..." if len(turn['bot']) > 200 else turn['bot']
        context_parts.append(f"Assistant: {bot_preview}")
    
    return "\n".join(context_parts)

# Request/Response Models
class SymptomRequest(BaseModel):
    symptoms: str = Field(..., description="Patient's symptom description")
    patient_age: Optional[int] = Field(None, description="Patient's age")
    patient_gender: Optional[str] = Field(None, description="Patient's gender")
    strategy: str = Field("smart_selection", description="Model selection strategy")

class RAGRequest(BaseModel):
    question: str = Field(..., description="Medical question")
    context_type: Optional[str] = Field(None, description="Type of medical context")

class HybridRequest(BaseModel):
    message: str = Field(..., description="User's message")
    query_type: Optional[str] = Field(None, description="Force query type: 'symptoms', 'general', or 'hybrid'")
    session_id: Optional[str] = Field(None, description="Session ID for conversation continuity")

class SymptomResponse(BaseModel):
    predicted_condition: str
    confidence: float
    top_predictions: List[Dict[str, Any]]
    recommendations: List[str]
    processing_time_ms: float
    model_used: str
    medical_disclaimer: str
    consensus_ratio: Optional[float] = None
    agreeing_models: Optional[int] = None
    total_models: Optional[int] = None
    individual_predictions: Optional[List[Dict[str, Any]]] = None

class RAGResponse(BaseModel):
    answer: str
    sources: List[str]
    confidence: float
    processing_time_ms: float
    context_chunks_used: int
    medical_disclaimer: str

class HybridResponse(BaseModel):
    response: str
    query_type: str
    confidence: Optional[float] = None
    predicted_condition: Optional[str] = None
    sources: Optional[List[str]] = None
    processing_time_ms: float
    system_used: str
    medical_disclaimer: str
    session_id: str
    conversation_turn: int

class ServerHealth(BaseModel):
    status: str
    timestamp: str
    models_loaded: Dict[str, bool]
    system_info: Dict[str, Any]

# Medical disclaimer
MEDICAL_DISCLAIMER = """
⚠️ IMPORTANT MEDICAL DISCLAIMER:
This AI system provides educational information only and is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of qualified healthcare providers with questions about medical conditions. In case of emergency, contact emergency services immediately.
"""

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize models on startup"""
    global disease_predictor, rag_pipeline, server_stats, vision_model
    
    logger.info("🚀 Starting Hybrid Medical Chatbot Server...")
    server_stats["startup_time"] = datetime.now().isoformat()
    
    # Initialize Disease Prediction System
    try:
        logger.info("📊 Loading disease prediction models...")
        disease_predictor = MedicalChatbotPredictor(
            model_dir=str(disease_prediction_dir / "models")
        )
        logger.info("✅ Disease prediction models loaded successfully")
    except Exception as e:
        logger.error(f"❌ Failed to load disease prediction models: {e}")
        disease_predictor = None
    
    # Initialize RAG System
    try:
        logger.info("🧠 Loading RAG system...")
        # Try to get Gemini API key from environment
        api_key = os.getenv("GEMINI_API_KEY")
        
        rag_pipeline = RAGPipeline(
            api_key=api_key,
            vector_store_path=str(rag_dir / "data" / "vectordb"),
            demo_mode=(api_key is None)
        )
        
        # Initialize the pipeline - check if it's async
        if hasattr(rag_pipeline, 'initialize'):
            try:
                await rag_pipeline.initialize()
            except TypeError:
                # If not async, call normally
                rag_pipeline.initialize()
        
        # Verify the pipeline is properly initialized
        if not rag_pipeline.vector_store or not rag_pipeline.embedding_generator:
            raise RuntimeError("RAG pipeline components failed to initialize")
        
        logger.info("✅ RAG system loaded successfully")
    except Exception as e:
        logger.error(f"❌ Failed to load RAG system: {e}")
        rag_pipeline = None
    
    # Initialize Gemini Vision Model for image analysis
    try:
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key and GEMINI_AVAILABLE:
            logger.info("👁️ Loading Gemini Vision model...")
            genai.configure(api_key=api_key)
            vision_model = genai.GenerativeModel('gemini-2.0-flash')
            logger.info("✅ Gemini Vision model loaded successfully")
        else:
            logger.warning("⚠️ Gemini Vision not available (no API key or library)")
            vision_model = None
    except Exception as e:
        logger.error(f"❌ Failed to load Gemini Vision model: {e}")
        vision_model = None
    
    logger.info("🎉 Hybrid Medical Chatbot Server ready!")
    
    yield
    
    # Cleanup on shutdown
    logger.info("🛑 Shutting down Hybrid Medical Chatbot Server...")

# Create FastAPI app with lifespan
app = FastAPI(
    title="Hybrid Medical Chatbot API",
    description="Combined disease prediction and RAG system for medical queries",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def detect_query_type(message: str) -> str:
    """Detect whether a query is symptom-related, general, greeting, or hybrid"""
    message_lower = message.lower().strip()
    
    # Check for simple greetings first
    greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 
                 'howdy', 'greetings', 'hi there', 'hello there', 'hey there']
    if message_lower in greetings or message_lower.rstrip('!.') in greetings:
        return 'greeting'
    
    # Check for non-medical queries
    non_medical = ['weather', 'time', 'date', 'news', 'sports', 'movie', 'music', 'game']
    if any(word in message_lower for word in non_medical) and not any(med in message_lower for med in ['symptom', 'pain', 'disease', 'health']):
        return 'off_topic'
    
    # Prevention/lifestyle questions should be treated as general, not symptoms
    prevention_patterns = [
        'how can i prevent', 'how to prevent', 'prevention of', 'avoid getting',
        'reduce risk', 'how to avoid', 'prevent getting', 'stay healthy',
        'how to protect', 'what should i eat', 'diet for', 'exercise for',
        'lifestyle', 'tips for', 'how to improve'
    ]
    if any(pattern in message_lower for pattern in prevention_patterns):
        return 'general'
    
    # Symptom indicators - current symptoms the user is experiencing
    symptom_keywords = [
        'pain', 'hurt', 'ache', 'fever', 'cough', 'headache', 'nausea', 'vomit',
        'dizzy', 'tired', 'fatigue', 'rash', 'itch', 'swollen', 'bleeding',
        'difficulty breathing', 'chest pain', 'abdominal pain', 'back pain',
        'joint pain', 'muscle pain', 'sore throat', 'runny nose', 'congestion',
        'diarrhea', 'constipation', 'weight loss', 'weight gain', 'trouble sleeping',
        'patches', 'scaly', 'thirst', 'urination', 'blurred vision'
    ]
    
    symptom_patterns = [
        'i have', 'i am having', 'i feel', 'i am feeling', 'i\'m experiencing',
        'experiencing', 'suffering from', 'my .* is', 'my .* are',
        'i\'ve been', 'i have been', 'started having'
    ]
    
    # General medical question indicators
    general_keywords = [
        'what is', 'what are', 'how does', 'what causes', 'treatment for', 
        'how is .* treated', 'prevention', 'risk factors', 'complications', 
        'prognosis', 'medication', 'therapy', 'side effects', 'symptoms of',
        'difference between', 'how to treat', 'what are the symptoms'
    ]
    
    # Check for symptom indicators
    has_symptoms = (
        any(keyword in message_lower for keyword in symptom_keywords) and
        any(re.search(pattern, message_lower) for pattern in symptom_patterns)
    )
    
    # Also check if describing current state without explicit "I have"
    if not has_symptoms:
        # Short messages with just symptom keywords likely need clarification
        has_symptoms = (
            len(message_lower.split()) <= 5 and
            any(keyword in message_lower for keyword in symptom_keywords)
        )
    
    # Check for general medical questions
    has_general = any(re.search(pattern, message_lower) for pattern in general_keywords)
    
    if has_symptoms and has_general:
        return 'hybrid'
    elif has_symptoms:
        return 'symptoms'
    elif has_general:
        return 'general'
    else:
        return 'general'


def extract_red_flag_symptoms(message: str) -> list[str]:
    """Identify potential emergency or high-risk symptoms mentioned by the user."""
    message_lower = message.lower()
    red_flag_map = {
        'chest pain': ['chest pain', 'tightness in chest', 'pressure in chest', 'pain in my chest'],
        'shortness of breath': ['shortness of breath', 'difficulty breathing', 'trouble breathing', 'can’t breathe', 'cant breathe'],
        'high fever': ['high fever', 'fever over', 'fever of 103', 'very high fever'],
        'confusion': ['confused', 'confusion', 'disoriented'],
        'persistent vomiting': ['persistent vomiting', 'vomiting blood', 'can’t keep', 'cant keep anything down'],
        'severe abdominal pain': ['severe abdominal pain', 'extreme stomach pain', 'sharp abdominal pain'],
        'neurological changes': ['slurred speech', 'weakness on one side', 'numbness on one side', 'sudden weakness'],
        'fainting': ['fainting', 'passed out', 'loss of consciousness']
    }

    detected = []
    for label, patterns in red_flag_map.items():
        if any(pattern in message_lower for pattern in patterns):
            detected.append(label)
    return detected


def should_request_additional_context(symptom_response: SymptomResponse, red_flags: list[str]) -> bool:
    """Determine if the system should gather additional educational context via RAG."""
    if not symptom_response:
        return True

    primary_confidence = symptom_response.confidence or 0.0
    consensus_ratio = symptom_response.consensus_ratio or 0.0

    top_predictions = symptom_response.top_predictions or []
    sorted_predictions = sorted(
        top_predictions,
        key=lambda p: p.get('probability_percentage', 0.0),
        reverse=True
    )

    probability_gap = 100.0
    if len(sorted_predictions) >= 2:
        probability_gap = (
            sorted_predictions[0].get('probability_percentage', 0.0)
            - sorted_predictions[1].get('probability_percentage', 0.0)
        )

    uncertain_prediction = primary_confidence < 0.55 or consensus_ratio < 0.6 or probability_gap < 12.0

    return bool(red_flags) or uncertain_prediction

@app.get("/health", response_model=ServerHealth)
async def health_check():
    """Check server health and model status"""
    global server_stats
    
    startup_time = server_stats.get("startup_time")
    uptime_seconds = 0.0
    if startup_time:
        try:
            startup_dt = datetime.fromisoformat(startup_time)
            uptime_seconds = max((datetime.now() - startup_dt).total_seconds(), 0.0)
        except ValueError:
            uptime_seconds = 0.0

    total_requests = max(server_stats.get("total_requests", 0), 0)
    errors = max(server_stats.get("errors", 0), 0)
    error_rate = (errors / total_requests * 100.0) if total_requests else 0.0

    models_loaded = {
        "disease_predictor": disease_predictor is not None,
        "rag_pipeline": rag_pipeline is not None,
        "symptom_models": disease_predictor is not None and bool(disease_predictor.models),
        "rag_initialized": rag_pipeline is not None and rag_pipeline.vector_store is not None
    }
    
    all_loaded = all(models_loaded.values())
    
    system_info = dict(server_stats)
    system_info.update({
        "uptime_seconds": uptime_seconds,
        "error_rate": round(error_rate, 2)
    })

    return ServerHealth(
        status="healthy" if all_loaded else "partially_loaded",
        timestamp=datetime.now().isoformat(),
        models_loaded=models_loaded,
        system_info=system_info
    )

@app.post("/predict-symptoms", response_model=SymptomResponse)
async def predict_symptoms(request: SymptomRequest):
    """Predict disease from symptoms using ML models"""
    global server_stats
    
    server_stats["total_requests"] += 1
    server_stats["symptom_requests"] += 1
    
    if not disease_predictor:
        server_stats["errors"] += 1
        raise HTTPException(status_code=503, detail="Disease prediction models not available")
    
    try:
        start_time = datetime.now()
        
        # Get prediction using ensemble
        result = disease_predictor.predict_ensemble(
            symptoms_text=request.symptoms,
            strategy=request.strategy
        )
        
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        
        if 'error' in result:
            server_stats["errors"] += 1
            raise HTTPException(status_code=500, detail=result['error'])
        
        # Format response - handle the actual field names returned by predict_ensemble
        predicted_disease = result.get('primary_diagnosis', 'Unknown')
        confidence = result.get('confidence_score', 0.0)
        consensus_ratio = result.get('consensus_ratio', 0.0)
        agreement = result.get('model_agreement', {})

        # Format top predictions from top_alternatives
        top_predictions = []
        alternatives = result.get('top_alternatives', [])
        if alternatives:
            for alt in alternatives:
                top_predictions.append({
                    'condition': alt.get('disease', 'Unknown'),
                    'confidence': alt.get('probability', 0.0),
                    'probability_percentage': alt.get('probability', 0.0) * 100
                })

        # Ensure primary diagnosis is highlighted first
        if predicted_disease and top_predictions:
            top_predictions.sort(key=lambda x: x.get('probability_percentage', 0.0), reverse=True)
            if predicted_disease not in [tp['condition'] for tp in top_predictions]:
                top_predictions.insert(0, {
                    'condition': predicted_disease,
                    'confidence': confidence,
                    'probability_percentage': confidence * 100
                })

        # Generate recommendations based on the result
        recommendations = []
        if 'recommendation_message' in result:
            recommendations.append(result['recommendation_message'])

        if agreement:
            recommendations.append(
                f"Model agreement: {agreement.get('agreeing_models', 0)}/{agreement.get('total_models', 0)} models agree"
            )

        server_stats["last_error"] = None

        return SymptomResponse(
            predicted_condition=predicted_disease,
            confidence=confidence,
            top_predictions=top_predictions,
            recommendations=recommendations,
            processing_time_ms=processing_time,
            model_used=result.get('strategy_used', request.strategy),
            medical_disclaimer=MEDICAL_DISCLAIMER,
            consensus_ratio=consensus_ratio,
            agreeing_models=agreement.get('agreeing_models'),
            total_models=agreement.get('total_models'),
            individual_predictions=agreement.get('individual_predictions')
        )
        
    except Exception as e:
        server_stats["errors"] += 1
        server_stats["last_error"] = str(e)
        logger.error(f"Error in symptom prediction: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ask-medical", response_model=RAGResponse)
async def ask_medical_question(request: RAGRequest):
    """Answer general medical questions using RAG system"""
    global server_stats
    
    server_stats["total_requests"] += 1
    server_stats["rag_requests"] += 1
    
    if not rag_pipeline:
        server_stats["errors"] += 1
        raise HTTPException(status_code=503, detail="RAG system not available")
    
    try:
        start_time = datetime.now()
        
        # Generate response using RAG pipeline query method
        result = rag_pipeline.query(
            user_query=request.question,
            top_k=5,
            min_similarity=0.15  # Lowered threshold to match working RAG implementation
        )
        
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        
        # Extract sources from the result
        sources = []
        if 'sources' in result:
            for source in result['sources'][:3]:  # Limit to top 3 sources
                if isinstance(source, dict):
                    page = source.get('page', 'Unknown')
                    section = source.get('section', '')
                    source_text = f"Page {page}"
                    if section:
                        source_text += f" - {section}"
                    sources.append(source_text)
                else:
                    sources.append(str(source))
        
        server_stats["last_error"] = None

        return RAGResponse(
            answer=result.get('response', 'No response generated'),
            sources=sources,
            confidence=result.get('processed_query', {}).get('confidence', 0.0),
            processing_time_ms=processing_time,
            context_chunks_used=result.get('num_sources', 0),
            medical_disclaimer=MEDICAL_DISCLAIMER
        )
        
    except Exception as e:
        server_stats["errors"] += 1
        server_stats["last_error"] = str(e)
        logger.error(f"Error in medical Q&A: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat", response_model=HybridResponse)
async def hybrid_chat(request: HybridRequest):
    """Main chat endpoint that intelligently routes queries with conversation history"""
    global server_stats
    
    server_stats["total_requests"] += 1
    server_stats["hybrid_requests"] += 1
    
    try:
        start_time = datetime.now()
        
        # Get or create session using enhanced conversation manager
        session_id, session = get_or_create_session(request.session_id)
        conversation_turn = len(session['conversation_history']) + 1
        
        # Also update enhanced conversation manager
        conv_session = conversation_mgr.get_or_create_session(session_id)
        is_first_interaction = conv_session.total_messages == 0
        
        # Get conversation context
        conversation_context = get_conversation_context(session_id, max_turns=5)
        
        # Perform advanced symptom extraction
        symptom_analysis = symptom_extractor.extract_symptoms(request.message)
        
        # Determine query type (use extracted symptoms to help)
        query_type = request.query_type or detect_query_type(request.message)
        logger.info(f"📝 Query: '{request.message[:50]}...' → Type: {query_type}")
        
        # Handle greetings
        if query_type == 'greeting':
            greeting_response = """Hello! 👋 Welcome to the Medical AI Assistant!

I'm here to help you with:
• 🩺 **Symptom Analysis** - Describe your symptoms and I'll help identify possible conditions
• 📚 **Medical Information** - Ask about diseases, treatments, medications, and prevention
• 🖼️ **Image Analysis** - Share images of skin conditions for visual analysis

**How can I help you today?**

*Remember: I provide educational information only. For medical emergencies, please call emergency services.*"""
            
            return HybridResponse(
                response=greeting_response,
                query_type="greeting",
                processing_time_ms=(datetime.now() - start_time).total_seconds() * 1000,
                system_used="Greeting Handler",
                medical_disclaimer=MEDICAL_DISCLAIMER,
                session_id=session_id,
                conversation_turn=conversation_turn
            )
        
        # Handle off-topic queries
        if query_type == 'off_topic':
            off_topic_response = """I'm a medical AI assistant, so I'm best suited to help with health-related questions! 🏥

**I can help you with:**
• Symptom analysis and possible conditions
• Information about diseases and treatments
• Medication information and side effects
• Prevention and lifestyle advice
• Analyzing images of skin conditions

**What health topic can I help you with today?**"""
            
            return HybridResponse(
                response=off_topic_response,
                query_type="off_topic",
                processing_time_ms=(datetime.now() - start_time).total_seconds() * 1000,
                system_used="Off-Topic Handler",
                medical_disclaimer=MEDICAL_DISCLAIMER,
                session_id=session_id,
                conversation_turn=conversation_turn
            )
        
        # Check for urgent red flags first
        if symptom_analysis.red_flags_detected:
            urgency = symptom_analysis.urgency_level
            if urgency == "emergency":
                emergency_response = response_formatter.check_red_flags(request.message)
                if emergency_response:
                    urgent_text = "⚠️ **IMPORTANT SAFETY ALERT**\n\n"
                    urgent_text += "\n\n".join(emergency_response)
                    urgent_text += "\n\n**Please seek immediate medical attention.** If you're experiencing a medical emergency, call emergency services (911) or go to the nearest emergency room immediately.\n\n"
                    urgent_text += "*Your safety is the top priority. Don't delay seeking help.*"
                    
                    return HybridResponse(
                        response=urgent_text,
                        query_type="symptoms",
                        confidence=1.0,
                        predicted_condition="Requires Immediate Medical Attention",
                        processing_time_ms=(datetime.now() - start_time).total_seconds() * 1000,
                        system_used="Emergency Detection System",
                        medical_disclaimer=MEDICAL_DISCLAIMER,
                        session_id=session_id,
                        conversation_turn=conversation_turn
                    )
        
        if query_type == 'symptoms' and disease_predictor:
            # Route to symptom prediction
            symptom_request = SymptomRequest(symptoms=request.message)
            symptom_response = await predict_symptoms(symptom_request)

            confidence_value = symptom_response.confidence or 0.0
            consensus_ratio = symptom_response.consensus_ratio or 1.0
            
            # Determine if we should show prediction or ask for clarification
            # Key insight: If we have MULTIPLE symptoms described OR detailed description, give prediction
            num_symptoms = len(symptom_analysis.symptoms)
            word_count = len(request.message.split())
            has_detailed_description = word_count >= 6  # 6+ words is fairly descriptive
            
            # Count symptom keywords in message for better detection
            symptom_keyword_count = sum(1 for kw in ['pain', 'ache', 'itch', 'rash', 'patches', 'scaly', 
                'thirst', 'urination', 'tired', 'fatigue', 'fever', 'cough', 'swollen', 'nausea',
                'dizzy', 'headache', 'burning', 'tingling', 'numbness', 'weight'] 
                if kw in request.message.lower())
            
            # Only ask for clarification if:
            # 1. Very short message (< 5 words) with vague symptoms
            # 2. No real symptoms detected at all
            # 3. Very low model confidence AND no detailed description
            should_clarify = (
                (word_count < 5 and symptom_keyword_count <= 1) or  # Very short and vague
                (num_symptoms == 0 and symptom_keyword_count == 0) or  # No symptoms found
                (confidence_value < 0.2 and not has_detailed_description)  # Very uncertain and short
            )
            
            # Override: If message has 2+ symptom keywords OR 8+ words, don't clarify
            if symptom_keyword_count >= 2 or word_count >= 8:
                should_clarify = False
            
            if should_clarify:
                # Ask for more details instead of giving uncertain prediction
                clarification_response = "I'd like to help you better understand what you're experiencing. To provide more useful guidance, could you share a few more details?\n\n"
                clarification_response += "**Please tell me:**\n"
                
                # Use only ONE source of questions to avoid any duplication
                # Prefer formatter questions as they're more context-aware
                formatter_questions = response_formatter.get_follow_up_questions(request.message, PatientContext())
                
                # Add max 2 questions (keep it simple)
                for q in formatter_questions[:2]:
                    clarification_response += f"• {q}\n"
                
                clarification_response += "\nThe more details you can share, the better I can help point you in the right direction."
                
                # Update conversation manager
                conversation_mgr.update_session(
                    session_id, request.message, clarification_response,
                    {"intent": "needs_clarification", "symptoms": [s.name for s in symptom_analysis.symptoms]}
                )
                
                return HybridResponse(
                    response=clarification_response,
                    query_type="symptoms",
                    confidence=confidence_value,
                    processing_time_ms=(datetime.now() - start_time).total_seconds() * 1000,
                    system_used="Symptom Clarification System",
                    medical_disclaimer=MEDICAL_DISCLAIMER,
                    session_id=session_id,
                    conversation_turn=conversation_turn
                )

            red_flags = extract_red_flag_symptoms(request.message)
            needs_additional_context = (
                rag_pipeline is not None and
                should_request_additional_context(symptom_response, red_flags)
            )

            rag_reference: Optional[RAGResponse] = None
            rag_context_text: Optional[str] = None
            if needs_additional_context:
                try:
                    predicted_condition = symptom_response.predicted_condition or ""
                    rag_followup_question = (
                        f"What is {predicted_condition}? Provide information about symptoms, causes, "
                        "and when to see a doctor."
                    )
                    rag_reference = await ask_medical_question(
                        RAGRequest(question=rag_followup_question)
                    )
                    if rag_reference and rag_reference.answer:
                        # Clean up RAG context for integration
                        rag_context_text = rag_reference.answer.strip()
                        # Remove duplicate disclaimers that will be added later
                        if "Important Notice" in rag_context_text:
                            rag_context_text = rag_context_text.split("**Important Notice")[0].strip()
                except Exception as rag_error:
                    logger.warning(f"Unable to fetch supplemental RAG information: {rag_error}")
                    rag_reference = None

            # Prepare top predictions for formatter
            sorted_predictions = sorted(
                symptom_response.top_predictions,
                key=lambda p: p.get('probability_percentage', 0.0),
                reverse=True
            ) if symptom_response.top_predictions else []

            unique_predictions: List[Dict[str, Any]] = []
            seen_conditions = set()
            for pred in sorted_predictions:
                condition_name = (pred.get('condition') or 'Unknown').strip()
                normalized = condition_name.lower()
                if normalized in seen_conditions:
                    continue
                seen_conditions.add(normalized)
                unique_predictions.append(pred)

            # Use the new human-friendly response formatter
            primary_condition = symptom_response.predicted_condition or "Not clearly identified"
            
            # Create patient context for personalized response
            patient_ctx = PatientContext(
                mentioned_symptoms=[s.name for s in symptom_analysis.symptoms],
                conversation_stage="providing_results" if conversation_turn > 1 else "initial"
            )
            
            # Format the response using our enhanced formatter
            combined_text = response_formatter.format_symptom_response(
                symptoms_text=request.message,
                predicted_condition=primary_condition,
                confidence=confidence_value,
                consensus_ratio=consensus_ratio,
                top_predictions=unique_predictions,
                recommendations=symptom_response.recommendations or [],
                rag_context=rag_context_text,
                patient_context=patient_ctx,
                is_first_interaction=is_first_interaction
            )

            supplemental_sources = rag_reference.sources if rag_reference else None
            system_used = "AI Disease Prediction System"
            if rag_reference:
                system_used = "AI Disease Prediction System + Medical Knowledge Base"

            # Save to conversation history (both old and new systems)
            add_to_conversation_history(
                session_id,
                request.message,
                combined_text,
                {
                    'query_type': 'symptoms',
                    'confidence': symptom_response.confidence,
                    'predicted_condition': primary_condition,
                    'red_flags': red_flags,
                    'rag_context_added': bool(rag_reference)
                }
            )
            
            # Update enhanced conversation manager
            conversation_mgr.update_session(
                session_id, request.message, combined_text,
                {
                    "predicted_condition": primary_condition,
                    "confidence": confidence_value,
                    "symptoms": [s.name for s in symptom_analysis.symptoms]
                }
            )

            server_stats["last_error"] = None

            return HybridResponse(
                response=combined_text,
                query_type="symptoms",
                confidence=symptom_response.confidence,
                predicted_condition=primary_condition,
                sources=supplemental_sources,
                processing_time_ms=symptom_response.processing_time_ms,
                system_used=system_used,
                medical_disclaimer=MEDICAL_DISCLAIMER,
                session_id=session_id,
                conversation_turn=conversation_turn
            )
            
        elif query_type in ['general', 'hybrid'] and rag_pipeline:
            # Route to RAG system with conversation context
            # Enhance the question with conversation context if available
            enhanced_question = request.message
            
            # Smart context enhancement for follow-up questions
            if conversation_context and len(request.message.split()) < 10:
                # Short question likely needs context - extract key medical terms
                # Look for condition mentions in conversation history
                session = chat_sessions.get(session_id, {})
                hist = session.get('conversation_history', [])
                
                # Extract medical conditions from recent history
                conditions_mentioned = []
                for turn in hist[-3:]:  # Last 3 turns
                    if 'metadata' in turn and 'predicted_condition' in turn.get('metadata', {}):
                        conditions_mentioned.append(turn['metadata']['predicted_condition'])
                
                # Enhance short questions with medical context
                if conditions_mentioned:
                    # Make the question more specific
                    condition = conditions_mentioned[-1]  # Most recent condition
                    enhanced_question = f"Regarding {condition}: {request.message}"
                    logger.info(f"Enhanced short query: '{request.message}' -> '{enhanced_question}'")
                else:
                    # Use full conversation context for general questions
                    enhanced_question = f"{conversation_context}\n\nCurrent question: {request.message}"
            elif conversation_context:
                # Longer questions might be self-contained but add minimal context
                enhanced_question = f"Context: User previously asked about symptoms.\n\nCurrent question: {request.message}"
            
            rag_request = RAGRequest(question=enhanced_question)
            rag_response = await ask_medical_question(rag_request)
            
            # Use the new human-friendly formatter for general medical responses
            response_text = response_formatter.format_general_medical_response(
                question=request.message,
                answer=rag_response.answer or "I couldn't find specific information about that topic.",
                sources=rag_response.sources,
                confidence=rag_response.confidence or 0.0
            )
            
            # Save to conversation history
            add_to_conversation_history(
                session_id,
                request.message,
                response_text,
                {'query_type': 'general', 'confidence': rag_response.confidence}
            )
            
            # Update enhanced conversation manager
            conversation_mgr.update_session(
                session_id, request.message, response_text,
                {"intent": "question", "topic": request.message[:50]}
            )
            
            server_stats["last_error"] = None

            return HybridResponse(
                response=response_text,
                query_type="general",
                sources=rag_response.sources,
                confidence=rag_response.confidence,
                processing_time_ms=rag_response.processing_time_ms,
                system_used="Medical Knowledge Base (RAG)",
                medical_disclaimer=MEDICAL_DISCLAIMER,
                session_id=session_id,
                conversation_turn=conversation_turn
            )
            
        else:
            # Fallback response
            processing_time = (datetime.now() - start_time).total_seconds() * 1000
            
            fallback_response = """
I'm here to help! 🤖 Unfortunately, I'm having some technical difficulties right now.

🔧 **What's happening**: The AI medical systems are temporarily unavailable

🔄 **What to do**: Please try again in a few moments

──────────────────────────────────────────────────

**In the meantime, here are some helpful resources:**

• 🏥 Contact your healthcare provider for medical concerns
• 🚨 Seek immediate care for urgent or severe symptoms  
• 📝 Keep a symptom diary to discuss with your doctor
• 🌐 Visit reputable medical websites like Mayo Clinic or WebMD

──────────────────────────────────────────────────

**Need immediate help?** Don't hesitate to contact emergency services or visit an urgent care facility.

Thank you for your patience! 💙
            """
            
            return HybridResponse(
                response=fallback_response.strip(),
                query_type=query_type,
                processing_time_ms=processing_time,
                system_used="Fallback Response",
                medical_disclaimer=MEDICAL_DISCLAIMER,
                session_id=session_id,
                conversation_turn=conversation_turn
            )
            
    except Exception as e:
        server_stats["errors"] += 1
        server_stats["last_error"] = str(e)
        logger.error(f"Error in hybrid chat: {e}")
        logger.exception("Full exception traceback:")  # Add full traceback for debugging
        
        # Get session ID for error response
        error_session_id = request.session_id or str(uuid.uuid4())
        
        # Provide a more user-friendly error response
        error_response = f"I apologize, but I encountered a technical issue while processing your request. Please try again in a moment. If the problem persists, you may want to contact support. Error details: {str(e)}"
        
        return HybridResponse(
            response=error_response,
            query_type=request.query_type or "unknown",
            processing_time_ms=0,
            system_used="Error Handler",
            medical_disclaimer=MEDICAL_DISCLAIMER,
            session_id=error_session_id,
            conversation_turn=1
        )


@app.post("/chat-with-attachments", response_model=HybridResponse)
async def chat_with_attachments(
    message: str = Form(default=""),
    session_id: Optional[str] = Form(default=None),
    files: List[UploadFile] = File(default=[])
):
    """
    Chat endpoint that handles image and file attachments.
    Images are analyzed using Gemini Vision for visual symptom analysis.
    Documents can provide additional context for medical questions.
    """
    global server_stats, vision_model
    
    server_stats["total_requests"] += 1
    server_stats["hybrid_requests"] += 1
    
    try:
        start_time = datetime.now()
        
        # Get or create session
        sess_id, session = get_or_create_session(session_id)
        conversation_turn = len(session['conversation_history']) + 1
        
        # Process attachments
        image_data_list = []  # Store actual image data for vision analysis
        image_descriptions = []
        document_contents = []
        attachment_info = []
        
        for file in files:
            file_content = await file.read()
            file_size = len(file_content)
            content_type = file.content_type or ""
            
            attachment_info.append({
                "name": file.filename,
                "type": content_type,
                "size": file_size
            })
            
            if content_type.startswith("image/"):
                # Store image data for vision analysis
                image_data_list.append({
                    "data": file_content,
                    "mime_type": content_type,
                    "filename": file.filename
                })
                image_descriptions.append(file.filename)
                
            elif content_type in ["application/pdf", "text/plain", "application/msword", 
                                   "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]:
                # For text-based documents, try to extract text
                if content_type == "text/plain":
                    try:
                        document_contents.append(file_content.decode('utf-8')[:2000])
                    except:
                        document_contents.append(f"[Document: {file.filename}]")
                else:
                    document_contents.append(f"[Document: {file.filename}]")
        
        # If we have images, use Gemini Vision to analyze them
        if image_data_list and vision_model:
            try:
                # Prepare the prompt for medical image analysis
                user_question = message if message else "What is this? Can you identify this condition?"
                
                vision_prompt = f"""You are a medical education assistant analyzing an image shared by a user.

User's question: {user_question}

Please analyze this medical/health-related image and provide:

1. **Visual Observations**: Describe what you observe in the image (appearance, color, pattern, location if visible)

2. **Possible Conditions**: Based on the visual characteristics, list potential conditions this could represent. Be educational but careful not to diagnose.

3. **Key Characteristics**: Note any distinctive features that are medically relevant

4. **Recommended Actions**: Suggest appropriate next steps (e.g., see a dermatologist, primary care physician)

5. **Important Considerations**: Any factors that would help a healthcare provider make a proper assessment

IMPORTANT GUIDELINES:
- Be educational and informative, but emphasize this is NOT a diagnosis
- Encourage professional medical consultation
- If the image is unclear or not medical in nature, say so
- Focus on observable characteristics, not definitive diagnoses
- Use empathetic, reassuring language"""

                # Create the image parts for Gemini
                image_parts = []
                for img_data in image_data_list:
                    image_parts.append({
                        "mime_type": img_data["mime_type"],
                        "data": base64.b64encode(img_data["data"]).decode('utf-8')
                    })
                
                # Generate response with vision model
                response_parts = [vision_prompt]
                for img_part in image_parts:
                    response_parts.append({
                        "inline_data": img_part
                    })
                
                vision_response = vision_model.generate_content(response_parts)
                analysis_text = vision_response.text
                
                # Format the response nicely
                response_text = f"""🔍 **Image Analysis Results**

{analysis_text}

---

⚠️ **Important Medical Disclaimer**

This analysis is for **educational purposes only** and should NOT be considered a medical diagnosis. The observations above are based on visual analysis and cannot replace:

• Physical examination by a healthcare professional
• Laboratory tests and diagnostic procedures  
• Complete medical history evaluation

**Please consult with a qualified healthcare provider** (such as a dermatologist or your primary care physician) for proper diagnosis and treatment recommendations.

If you're experiencing concerning symptoms or the condition is worsening, please seek medical attention promptly."""

                processing_time = (datetime.now() - start_time).total_seconds() * 1000
                
                # Store in conversation history
                add_to_conversation_history(
                    sess_id,
                    f"{message} [+ {len(image_data_list)} image(s)]",
                    response_text,
                    {"has_images": True, "image_count": len(image_data_list), "vision_analysis": True}
                )
                
                return HybridResponse(
                    response=response_text,
                    query_type="symptoms",
                    confidence=0.7,
                    processing_time_ms=processing_time,
                    system_used="Gemini Vision Analysis",
                    medical_disclaimer=MEDICAL_DISCLAIMER,
                    session_id=sess_id,
                    conversation_turn=conversation_turn
                )
                
            except Exception as vision_error:
                logger.error(f"Vision analysis failed: {vision_error}")
                # Fall back to asking for description
                response_text = f"""I received your image but encountered an issue analyzing it: {str(vision_error)}

**Please describe what you're seeing:**
• What part of the body is affected?
• What does it look like (color, size, texture)?
• How long have you had this?
• Any associated symptoms (pain, itching, etc.)?

With this information, I can provide more helpful guidance."""
                
                processing_time = (datetime.now() - start_time).total_seconds() * 1000
                
                return HybridResponse(
                    response=response_text,
                    query_type="symptoms",
                    confidence=0.3,
                    processing_time_ms=processing_time,
                    system_used="Fallback - Vision Error",
                    medical_disclaimer=MEDICAL_DISCLAIMER,
                    session_id=sess_id,
                    conversation_turn=conversation_turn
                )
        
        # If we have images but no vision model available
        elif image_data_list and not vision_model:
            response_text = """I received your image, but image analysis is currently not available (Gemini Vision model not configured).

**To help you, please describe:**
• What body part is shown in the image?
• What are you observing (color, size, shape, texture)?
• How long have you had this condition?
• Any symptoms like pain, itching, burning, or swelling?

With a detailed description, I can provide educational information about possible conditions.

*Note: For accurate visual diagnosis, please consult a healthcare professional who can examine you in person.*"""
            
            processing_time = (datetime.now() - start_time).total_seconds() * 1000
            
            return HybridResponse(
                response=response_text,
                query_type="symptoms",
                confidence=0.3,
                processing_time_ms=processing_time,
                system_used="Image Received - Vision Unavailable",
                medical_disclaimer=MEDICAL_DISCLAIMER,
                session_id=sess_id,
                conversation_turn=conversation_turn
            )
        
        # Handle documents
        if document_contents:
            enhanced_message = message if message else "Please help me understand this document."
            enhanced_message += f"\n\nDocument content:\n{document_contents[0][:1500]}"
            
            hybrid_request = HybridRequest(
                message=enhanced_message,
                session_id=sess_id
            )
            
            response = await hybrid_chat(hybrid_request)
            response.response += f"\n\n📄 *Analyzed {len(document_contents)} document(s)*"
            return response
        
        # If no valid attachments, just process the message normally
        if message:
            hybrid_request = HybridRequest(
                message=message,
                session_id=sess_id
            )
            return await hybrid_chat(hybrid_request)
        
        # No message and no valid attachments
        return HybridResponse(
            response="I didn't receive any message or valid attachments. Please send your question or attach an image/document.",
            query_type="general",
            processing_time_ms=(datetime.now() - start_time).total_seconds() * 1000,
            system_used="Input Validation",
            medical_disclaimer=MEDICAL_DISCLAIMER,
            session_id=sess_id,
            conversation_turn=conversation_turn
        )
        
    except Exception as e:
        server_stats["errors"] += 1
        server_stats["last_error"] = str(e)
        logger.error(f"Error in chat with attachments: {e}")
        logger.exception("Full exception traceback:")
        
        error_session_id = session_id or str(uuid.uuid4())
        
        return HybridResponse(
            response=f"I apologize, but I encountered an issue processing your request. Please try again or describe your concern in text. Error: {str(e)}",
            query_type="unknown",
            processing_time_ms=0,
            system_used="Error Handler",
            medical_disclaimer=MEDICAL_DISCLAIMER,
            session_id=error_session_id,
            conversation_turn=1
        )


if __name__ == "__main__":
    uvicorn.run(
        "hybrid_server:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        log_level="info"
    )