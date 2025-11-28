"""
Enhanced Conversation Manager
=============================

Manages conversation state, patient context, and intelligent
conversation flow for the medical chatbot.
"""

from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
import json


class ConversationStage(Enum):
    """Stages of a medical consultation conversation"""
    GREETING = "greeting"
    GATHERING_SYMPTOMS = "gathering_symptoms"
    CLARIFYING = "clarifying"
    PROVIDING_ASSESSMENT = "providing_assessment"
    ANSWERING_QUESTIONS = "answering_questions"
    FOLLOW_UP = "follow_up"
    CLOSING = "closing"


@dataclass
class PatientProfile:
    """Accumulated patient information across conversation"""
    age: Optional[int] = None
    gender: Optional[str] = None
    known_conditions: List[str] = field(default_factory=list)
    current_medications: List[str] = field(default_factory=list)
    allergies: List[str] = field(default_factory=list)
    
    # Gathered during conversation
    reported_symptoms: List[Dict[str, Any]] = field(default_factory=list)
    symptom_timeline: Dict[str, str] = field(default_factory=dict)  # symptom -> duration
    symptom_severity: Dict[str, str] = field(default_factory=dict)  # symptom -> severity
    
    # Predictions made
    predicted_conditions: List[Dict[str, Any]] = field(default_factory=list)
    questions_asked: List[str] = field(default_factory=list)
    topics_discussed: List[str] = field(default_factory=list)


@dataclass
class ConversationTurn:
    """Single turn in the conversation"""
    timestamp: datetime
    user_message: str
    bot_response: str
    intent: str  # symptom_report, question, clarification, etc.
    extracted_info: Dict[str, Any] = field(default_factory=dict)
    stage: ConversationStage = ConversationStage.GREETING


@dataclass
class ConversationSession:
    """Full conversation session with a patient"""
    session_id: str
    created_at: datetime
    last_activity: datetime
    patient_profile: PatientProfile
    conversation_history: List[ConversationTurn]
    current_stage: ConversationStage
    pending_questions: List[str]  # Questions we want to ask
    answered_questions: List[str]  # Questions patient has answered
    
    # Session metadata
    is_active: bool = True
    total_messages: int = 0
    symptom_reports: int = 0
    medical_questions: int = 0


class ConversationManager:
    """
    Manages conversation state and context for medical consultations.
    Provides intelligent conversation flow and context awareness.
    """
    
    def __init__(self, session_timeout_minutes: int = 60):
        self.sessions: Dict[str, ConversationSession] = {}
        self.session_timeout = timedelta(minutes=session_timeout_minutes)
        
        # Intent detection patterns
        self.intent_patterns = {
            "symptom_report": [
                "i have", "i feel", "i am experiencing", "i've been having",
                "i'm having", "suffering from", "symptoms", "it hurts",
                "pain in", "started having"
            ],
            "question": [
                "what is", "what are", "how do", "how does", "why do",
                "can you explain", "tell me about", "what causes",
                "is it normal", "should i", "when should"
            ],
            "clarification": [
                "yes", "no", "about", "around", "since", "for",
                "started", "began", "maybe", "i think", "probably"
            ],
            "follow_up": [
                "what else", "anything else", "more information",
                "tell me more", "what about", "and also"
            ],
            "greeting": [
                "hello", "hi", "hey", "good morning", "good afternoon",
                "good evening", "help me"
            ],
            "closing": [
                "thank you", "thanks", "bye", "goodbye", "that's all",
                "nothing else"
            ],
        }
        
        # Questions to gather patient context
        self.context_gathering_questions = {
            "duration": [
                "How long have you been experiencing these symptoms?",
                "When did you first notice these symptoms?",
            ],
            "severity": [
                "On a scale of 1-10, how would you rate the severity?",
                "How much is this affecting your daily activities?",
            ],
            "progression": [
                "Have your symptoms been getting better, worse, or staying the same?",
                "Has anything changed since the symptoms started?",
            ],
            "triggers": [
                "Have you noticed anything that makes the symptoms better or worse?",
                "Did anything specific happen before the symptoms started?",
            ],
            "associated_symptoms": [
                "Are you experiencing any other symptoms along with this?",
                "Have you noticed any other changes in how you feel?",
            ],
            "medical_history": [
                "Do you have any known medical conditions?",
                "Are you currently taking any medications?",
            ],
        }
    
    def get_or_create_session(self, session_id: str) -> ConversationSession:
        """Get existing session or create new one"""
        self._cleanup_expired_sessions()
        
        if session_id in self.sessions:
            session = self.sessions[session_id]
            session.last_activity = datetime.now()
            return session
        
        # Create new session
        new_session = ConversationSession(
            session_id=session_id,
            created_at=datetime.now(),
            last_activity=datetime.now(),
            patient_profile=PatientProfile(),
            conversation_history=[],
            current_stage=ConversationStage.GREETING,
            pending_questions=[],
            answered_questions=[]
        )
        self.sessions[session_id] = new_session
        return new_session
    
    def _cleanup_expired_sessions(self):
        """Remove expired sessions"""
        current_time = datetime.now()
        expired = [
            sid for sid, session in self.sessions.items()
            if current_time - session.last_activity > self.session_timeout
        ]
        for sid in expired:
            del self.sessions[sid]
    
    def detect_intent(self, message: str) -> str:
        """Detect the intent of a user message"""
        message_lower = message.lower()
        
        # Check each intent pattern
        intent_scores = {}
        for intent, patterns in self.intent_patterns.items():
            score = sum(1 for pattern in patterns if pattern in message_lower)
            intent_scores[intent] = score
        
        # Return highest scoring intent
        if max(intent_scores.values()) > 0:
            return max(intent_scores, key=intent_scores.get)
        
        # Default based on message characteristics
        if "?" in message:
            return "question"
        elif len(message.split()) < 5:
            return "clarification"
        else:
            return "symptom_report"
    
    def update_session(
        self, 
        session_id: str, 
        user_message: str, 
        bot_response: str,
        extracted_info: Dict[str, Any] = None
    ) -> ConversationSession:
        """Update session with new conversation turn"""
        session = self.get_or_create_session(session_id)
        
        intent = self.detect_intent(user_message)
        
        # Create conversation turn
        turn = ConversationTurn(
            timestamp=datetime.now(),
            user_message=user_message,
            bot_response=bot_response,
            intent=intent,
            extracted_info=extracted_info or {},
            stage=session.current_stage
        )
        
        session.conversation_history.append(turn)
        session.total_messages += 1
        session.last_activity = datetime.now()
        
        # Update counters
        if intent == "symptom_report":
            session.symptom_reports += 1
        elif intent == "question":
            session.medical_questions += 1
        
        # Update patient profile with extracted info
        if extracted_info:
            self._update_patient_profile(session, extracted_info)
        
        # Update conversation stage
        self._update_conversation_stage(session, intent)
        
        # Trim history if too long
        if len(session.conversation_history) > 50:
            session.conversation_history = session.conversation_history[-50:]
        
        return session
    
    def _update_patient_profile(self, session: ConversationSession, info: Dict[str, Any]):
        """Update patient profile with new information"""
        profile = session.patient_profile
        
        if "predicted_condition" in info:
            profile.predicted_conditions.append({
                "condition": info["predicted_condition"],
                "confidence": info.get("confidence", 0),
                "timestamp": datetime.now().isoformat()
            })
        
        if "symptoms" in info:
            for symptom in info["symptoms"]:
                if symptom not in [s.get("name") for s in profile.reported_symptoms]:
                    profile.reported_symptoms.append({
                        "name": symptom,
                        "reported_at": datetime.now().isoformat()
                    })
        
        if "topic" in info:
            if info["topic"] not in profile.topics_discussed:
                profile.topics_discussed.append(info["topic"])
    
    def _update_conversation_stage(self, session: ConversationSession, intent: str):
        """Update conversation stage based on flow"""
        current = session.current_stage
        
        if current == ConversationStage.GREETING:
            if intent in ["symptom_report", "question"]:
                session.current_stage = ConversationStage.GATHERING_SYMPTOMS
        
        elif current == ConversationStage.GATHERING_SYMPTOMS:
            if session.symptom_reports >= 1:
                # Check if we have enough info
                if self._has_sufficient_info(session):
                    session.current_stage = ConversationStage.PROVIDING_ASSESSMENT
                else:
                    session.current_stage = ConversationStage.CLARIFYING
        
        elif current == ConversationStage.CLARIFYING:
            if intent == "clarification" and len(session.answered_questions) >= 2:
                session.current_stage = ConversationStage.PROVIDING_ASSESSMENT
        
        elif current == ConversationStage.PROVIDING_ASSESSMENT:
            if intent in ["question", "follow_up"]:
                session.current_stage = ConversationStage.ANSWERING_QUESTIONS
        
        elif current == ConversationStage.ANSWERING_QUESTIONS:
            if intent == "closing":
                session.current_stage = ConversationStage.CLOSING
    
    def _has_sufficient_info(self, session: ConversationSession) -> bool:
        """Check if we have enough information to provide assessment"""
        profile = session.patient_profile
        
        # Need at least one symptom
        if not profile.reported_symptoms:
            return False
        
        # Check if we have some context
        has_duration = any(profile.symptom_timeline.values())
        has_severity = any(profile.symptom_severity.values())
        
        # Can proceed if we have symptoms and at least some context
        return len(profile.reported_symptoms) >= 1
    
    def get_next_question(self, session: ConversationSession) -> Optional[str]:
        """Get the next clarifying question to ask"""
        profile = session.patient_profile
        
        # Prioritize questions based on what we're missing
        if not profile.symptom_timeline:
            questions = self.context_gathering_questions["duration"]
            for q in questions:
                if q not in session.answered_questions:
                    return q
        
        if not profile.symptom_severity:
            questions = self.context_gathering_questions["severity"]
            for q in questions:
                if q not in session.answered_questions:
                    return q
        
        # Check for other missing info
        for category, questions in self.context_gathering_questions.items():
            for q in questions:
                if q not in session.answered_questions:
                    return q
        
        return None
    
    def get_conversation_summary(self, session_id: str) -> Dict[str, Any]:
        """Get a summary of the conversation for context"""
        if session_id not in self.sessions:
            return {}
        
        session = self.sessions[session_id]
        profile = session.patient_profile
        
        return {
            "session_id": session_id,
            "stage": session.current_stage.value,
            "total_messages": session.total_messages,
            "symptoms_reported": [s["name"] for s in profile.reported_symptoms],
            "conditions_predicted": [
                c["condition"] for c in profile.predicted_conditions
            ],
            "topics_discussed": profile.topics_discussed,
            "pending_questions": session.pending_questions,
            "session_duration_minutes": (
                datetime.now() - session.created_at
            ).total_seconds() / 60
        }
    
    def get_context_string(self, session_id: str, max_turns: int = 5) -> str:
        """Get conversation context as a string for AI models"""
        if session_id not in self.sessions:
            return ""
        
        session = self.sessions[session_id]
        recent_turns = session.conversation_history[-max_turns:]
        
        if not recent_turns:
            return ""
        
        context_parts = ["Previous conversation:"]
        
        for turn in recent_turns:
            context_parts.append(f"Patient: {turn.user_message}")
            # Truncate long responses
            response_preview = turn.bot_response[:300]
            if len(turn.bot_response) > 300:
                response_preview += "..."
            context_parts.append(f"Assistant: {response_preview}")
        
        # Add patient profile summary
        profile = session.patient_profile
        if profile.reported_symptoms:
            symptoms_str = ", ".join(s["name"] for s in profile.reported_symptoms[:5])
            context_parts.append(f"\nReported symptoms: {symptoms_str}")
        
        if profile.predicted_conditions:
            conditions_str = ", ".join(c["condition"] for c in profile.predicted_conditions[:3])
            context_parts.append(f"Discussed conditions: {conditions_str}")
        
        return "\n".join(context_parts)
    
    def should_ask_clarifying_question(self, session_id: str) -> bool:
        """Determine if we should ask a clarifying question"""
        if session_id not in self.sessions:
            return False
        
        session = self.sessions[session_id]
        
        # Ask clarifying questions during these stages
        if session.current_stage in [
            ConversationStage.GATHERING_SYMPTOMS,
            ConversationStage.CLARIFYING
        ]:
            # Don't ask too many questions in a row
            if session.conversation_history:
                last_turn = session.conversation_history[-1]
                if "?" in last_turn.bot_response and last_turn.intent == "clarification":
                    return False  # Already asked a question
            
            return not self._has_sufficient_info(session)
        
        return False
    
    def get_session_stats(self) -> Dict[str, Any]:
        """Get statistics about all active sessions"""
        return {
            "active_sessions": len(self.sessions),
            "total_messages": sum(s.total_messages for s in self.sessions.values()),
            "avg_session_length": sum(
                len(s.conversation_history) for s in self.sessions.values()
            ) / max(len(self.sessions), 1),
        }


# Singleton instance for the application
_conversation_manager: Optional[ConversationManager] = None


def get_conversation_manager() -> ConversationManager:
    """Get the global conversation manager instance"""
    global _conversation_manager
    if _conversation_manager is None:
        _conversation_manager = ConversationManager()
    return _conversation_manager
