"""
Hybrid Medical Chatbot Server
============================

FastAPI server that combines disease prediction models and RAG system
for intelligent medical query routing and response generation.
"""

import os
import sys
import logging
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any
from contextlib import asynccontextmanager
from collections import defaultdict

# Disable ChromaDB telemetry to prevent PostHog errors
os.environ['ANONYMIZED_TELEMETRY'] = 'False'
os.environ['CHROMA_TELEMETRY'] = 'False'

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Add project paths to system path
current_dir = Path(__file__).parent
disease_prediction_dir = current_dir.parent / "disease prediction implementation 1"
rag_dir = current_dir.parent / "llm rag implementation 1" / "medical_chatbot"

sys.path.append(str(disease_prediction_dir))
sys.path.append(str(rag_dir))

# Import our systems
from src.medical_chatbot_predictor import MedicalChatbotPredictor
from src.rag_pipeline import RAGPipeline

# Configure logging to suppress ChromaDB telemetry errors
logging.basicConfig(level=logging.INFO)
logging.getLogger('chromadb.telemetry.product.posthog').setLevel(logging.CRITICAL)
logging.getLogger('chromadb').setLevel(logging.WARNING)
logger = logging.getLogger(__name__)

# Global variables for our models
disease_predictor: Optional[MedicalChatbotPredictor] = None
rag_pipeline: Optional[RAGPipeline] = None
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
    global disease_predictor, rag_pipeline, server_stats
    
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
    """Detect whether a query is symptom-related, general, or hybrid"""
    message_lower = message.lower()
    
    # Symptom indicators
    symptom_keywords = [
        'pain', 'hurt', 'ache', 'fever', 'cough', 'headache', 'nausea', 'vomit',
        'dizzy', 'tired', 'fatigue', 'rash', 'itch', 'swollen', 'bleeding',
        'difficulty breathing', 'chest pain', 'abdominal pain', 'back pain',
        'joint pain', 'muscle pain', 'sore throat', 'runny nose', 'congestion',
        'diarrhea', 'constipation', 'weight loss', 'weight gain', 'trouble sleeping'
    ]
    
    symptom_patterns = [
        'i have', 'i am having', 'i feel', 'i am feeling', 'experiencing',
        'symptoms of', 'suffering from', 'what could this be', 'diagnosis'
    ]
    
    # General medical question indicators
    general_keywords = [
        'what is', 'how does', 'what causes', 'treatment for', 'prevention',
        'risk factors', 'complications', 'prognosis', 'medication', 'therapy'
    ]
    
    # Check for symptom indicators
    has_symptoms = (
        any(keyword in message_lower for keyword in symptom_keywords) or
        any(pattern in message_lower for pattern in symptom_patterns)
    )
    
    # Check for general medical questions
    has_general = any(keyword in message_lower for keyword in general_keywords)
    
    if has_symptoms and has_general:
        return 'hybrid'
    elif has_symptoms:
        return 'symptoms'
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
        
        # Get or create session
        session_id, session = get_or_create_session(request.session_id)
        conversation_turn = len(session['conversation_history']) + 1
        
        # Get conversation context
        conversation_context = get_conversation_context(session_id, max_turns=5)
        
        # Determine query type
        query_type = request.query_type or detect_query_type(request.message)
        
        if query_type == 'symptoms' and disease_predictor:
            # Route to symptom prediction
            symptom_request = SymptomRequest(symptoms=request.message)
            symptom_response = await predict_symptoms(symptom_request)

            confidence_value = symptom_response.confidence or 0.0
            if confidence_value >= 0.7:
                confidence_label = "high confidence"
            elif confidence_value >= 0.4:
                confidence_label = "moderate confidence"
            else:
                confidence_label = "low confidence"

            red_flags = extract_red_flag_symptoms(request.message)
            needs_additional_context = (
                rag_pipeline is not None and
                should_request_additional_context(symptom_response, red_flags)
            )

            rag_reference: Optional[RAGResponse] = None
            if needs_additional_context:
                try:
                    rag_followup_question = (
                        "Patient symptoms: "
                        f"{request.message}. Provide possible medical causes and typical evaluation/treatment approaches "
                        "based on The Gale Encyclopedia of Medicine."
                    )
                    rag_reference = await ask_medical_question(
                        RAGRequest(question=rag_followup_question)
                    )
                except Exception as rag_error:
                    logger.warning(f"Unable to fetch supplemental RAG information: {rag_error}")
                    rag_reference = None

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

            response_sections: List[str] = []
            response_sections.append("Thanks for sharing how you're feeling. Here's what the symptom checker found:\n")

            primary_condition = symptom_response.predicted_condition or "Not clearly identified"
            response_sections.append(
                f"🩺 **Primary pattern detected**: {primary_condition}"
            )
            response_sections.append(
                f"📊 **Model confidence**: {confidence_value:.1%} ({confidence_label})"
            )

            if symptom_response.consensus_ratio is not None and symptom_response.total_models:
                response_sections.append(
                    f"🤝 **Model agreement**: {symptom_response.agreeing_models or 0}/"
                    f"{symptom_response.total_models} models aligned "
                    f"({(symptom_response.consensus_ratio or 0.0) * 100:.0f}% consensus)"
                )

            if unique_predictions:
                alt_lines = []
                for pred in unique_predictions[:3]:
                    label = pred.get('condition', 'Unknown')
                    probability = pred.get('probability_percentage', 0.0)
                    alt_lines.append(f"• {label} ({probability:.1f}% estimated likelihood)")
                response_sections.append("\n🤔 **Other possibilities the models considered:**\n" + "\n".join(alt_lines))

            if symptom_response.recommendations:
                recommendation_lines = "\n".join(f"• {rec}" for rec in symptom_response.recommendations)
                response_sections.append("\n💡 **What this means for you:**\n" + recommendation_lines)

            if confidence_value < 0.4:
                response_sections.append(
                    "\n⚠️ **Model uncertainty:** The AI could not find a clear match for your symptoms. Please prioritize an in-person medical evaluation."
                )

            if red_flags:
                flagged = ", ".join(red_flags)
                response_sections.append(
                    "\n🚨 **Urgent attention recommended:** Because you mentioned "
                    f"{flagged}, please seek in-person medical care or emergency services immediately."
                )

            response_sections.append("\n🏥 **Next steps:**")
            if red_flags:
                response_sections.append("• Contact emergency services or go to the nearest emergency department right away")
                response_sections.append("• Do not ignore chest pain, trouble breathing, or sudden neurological changes")
            elif confidence_value >= 0.6:
                response_sections.append("• Schedule a prompt appointment with your healthcare provider")
                response_sections.append("• Track any changes in your symptoms while you wait for care")
            else:
                response_sections.append("• Arrange an evaluation with a healthcare professional as soon as possible")
                response_sections.append("• Keep a log of symptom timing, triggers, and severity to share with your clinician")

            if rag_reference and rag_reference.answer:
                response_sections.append("\n📚 **What medical references suggest:**\n" + rag_reference.answer.strip())

            disclaimer_text = (
                "⚠️ **Important medical disclaimer:** This AI support tool is for educational guidance only "
                "and must not replace professional medical evaluation. Always consult qualified healthcare "
                "providers, and seek urgent care for emergency symptoms."
            )

            # Avoid duplicating disclaimer if already present in supplemental content
            combined_text = "\n\n".join(response_sections)
            lower_combined = combined_text.lower()
            if "important medical disclaimer" not in lower_combined and "important notice" not in lower_combined:
                combined_text += "\n\n" + disclaimer_text

            supplemental_sources = rag_reference.sources if rag_reference else None
            system_used = "AI Disease Prediction System"
            if rag_reference:
                system_used = "AI Disease Prediction System + Medical Knowledge Base"

            # Save to conversation history
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
            
            # Make RAG responses more conversational and structured
            response_text = "I'd be happy to help with your medical question! 🩺\n\n"
            
            # Clean up the RAG response if it has redundant information
            clean_response = rag_response.answer.strip()
            
            # Add structure to responses while preserving full medical content
            lower_response = clean_response.lower() if clean_response else ""

            if clean_response:
                paragraphs = [p.strip() for p in clean_response.split('\n\n') if p.strip()]
                if paragraphs:
                    response_text += "📖 **Detailed Information:**\n"
                    for para in paragraphs:
                        response_text += f"{para}\n\n"
                else:
                    response_text += f"📖 **Detailed Information:** {clean_response}\n\n"
            else:
                response_text += (
                    "📖 **Information**: I couldn't retrieve specific encyclopedia details for this question, "
                    "but I'm here to help with follow-up questions.\n\n"
                )

            # Add helpful footer without duplicating safety language already present in the model output
            response_text += "💡 **Need more specific information?** Feel free to ask follow-up questions!\n\n"

            if "important notice" not in lower_response and "medical disclaimer" not in lower_response:
                response_text += (
                    "⚠️ **Medical Disclaimer**: This information is for educational purposes only. "
                    "Always consult with qualified healthcare professionals for medical advice, diagnosis, or treatment."
                )
            
            # Save to conversation history
            add_to_conversation_history(
                session_id,
                request.message,
                response_text,
                {'query_type': 'general', 'confidence': rag_response.confidence}
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

if __name__ == "__main__":
    uvicorn.run(
        "hybrid_server:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        log_level="info"
    )