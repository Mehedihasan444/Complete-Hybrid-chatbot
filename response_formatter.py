"""
Human-Friendly Medical Response Formatter
==========================================

This module transforms raw AI predictions and RAG responses into
empathetic, conversational, and medically appropriate responses.
"""

from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum
import random


class ConfidenceLevel(Enum):
    HIGH = "high"
    MODERATE = "moderate"
    LOW = "low"
    UNCERTAIN = "uncertain"


@dataclass
class PatientContext:
    """Track patient context across conversation"""
    age: Optional[int] = None
    gender: Optional[str] = None
    mentioned_symptoms: List[str] = None
    mentioned_conditions: List[str] = None
    conversation_stage: str = "initial"  # initial, gathering_info, providing_results, follow_up
    
    def __post_init__(self):
        if self.mentioned_symptoms is None:
            self.mentioned_symptoms = []
        if self.mentioned_conditions is None:
            self.mentioned_conditions = []


class MedicalResponseFormatter:
    """
    Formats AI responses to be more human-friendly, empathetic, and medically appropriate.
    """
    
    def __init__(self):
        # Empathetic opening phrases
        self.empathetic_openings = [
            "I understand you're concerned about your health, and I'm here to help.",
            "Thank you for sharing your symptoms with me. Let me help you understand what might be happening.",
            "I can see you're experiencing some discomfort. Let's work through this together.",
            "I appreciate you reaching out about your health concerns.",
            "It's important that you're paying attention to how you feel. Let me provide some guidance.",
        ]
        
        # Follow-up question templates by symptom type (distinct, non-overlapping)
        self.follow_up_questions = {
            "pain": [
                "How long have you been experiencing this pain?",
                "Does anything make it better or worse (like rest, movement, or certain positions)?",
            ],
            "skin": [
                "When did you first notice these skin changes?",
                "Has the affected area been spreading or changing in appearance?",
            ],
            "digestive": [
                "How long have these symptoms been present?",
                "Have you noticed any connection to specific foods or times of day?",
            ],
            "respiratory": [
                "How long have you had these breathing symptoms?",
                "Do you have any known allergies, asthma, or recent respiratory infections?",
            ],
            "general": [
                "How long have you been experiencing these symptoms?",
                "Have you noticed any patterns or triggers?",
            ],
        }
        
        # Confidence-based response templates
        self.confidence_templates = {
            ConfidenceLevel.HIGH: {
                "intro": "Based on your description, the symptoms you're experiencing strongly suggest",
                "action": "I recommend scheduling an appointment with your healthcare provider to confirm this assessment and discuss treatment options.",
            },
            ConfidenceLevel.MODERATE: {
                "intro": "Your symptoms are consistent with several possibilities. The most likely explanation is",
                "action": "A healthcare professional can help determine the exact cause through proper examination and possibly some tests.",
            },
            ConfidenceLevel.LOW: {
                "intro": "Based on what you've shared, there are several conditions that could explain your symptoms. One possibility is",
                "action": "Given the range of possibilities, I strongly recommend seeing a healthcare provider for a thorough evaluation.",
            },
            ConfidenceLevel.UNCERTAIN: {
                "intro": "Your symptoms don't clearly point to a single condition. This could indicate",
                "action": "Please consult with a healthcare professional as soon as possible for proper evaluation.",
            },
        }
        
        # Disease-specific helpful information
        self.disease_info = {
            "Psoriasis": {
                "brief": "a chronic autoimmune condition that affects the skin",
                "what_to_expect": "It typically causes red, scaly patches that may itch or feel sore.",
                "specialist": "dermatologist",
                "lifestyle_tips": [
                    "Keeping skin moisturized can help manage symptoms",
                    "Stress management may help reduce flare-ups",
                    "Avoiding skin injuries can prevent new patches from forming",
                ],
            },
            "Varicose Veins": {
                "brief": "enlarged, twisted veins that usually appear in the legs",
                "what_to_expect": "You may experience aching, heaviness, or cramping in your legs.",
                "specialist": "vascular specialist or phlebologist",
                "lifestyle_tips": [
                    "Regular exercise can improve blood circulation",
                    "Elevating your legs when resting may provide relief",
                    "Compression stockings can help manage symptoms",
                ],
            },
            "Diabetes": {
                "brief": "a metabolic condition affecting how your body processes blood sugar",
                "what_to_expect": "Symptoms may include increased thirst, frequent urination, and fatigue.",
                "specialist": "endocrinologist or primary care physician",
                "lifestyle_tips": [
                    "Regular blood sugar monitoring is important",
                    "A balanced diet can help manage blood sugar levels",
                    "Regular physical activity is beneficial",
                ],
            },
            "Hypertension": {
                "brief": "high blood pressure, which often has no obvious symptoms",
                "what_to_expect": "It's often called a 'silent' condition because you may not feel symptoms.",
                "specialist": "cardiologist or primary care physician",
                "lifestyle_tips": [
                    "Reducing sodium intake may help lower blood pressure",
                    "Regular exercise is beneficial for heart health",
                    "Stress management techniques can be helpful",
                ],
            },
            "Migraine": {
                "brief": "a neurological condition causing severe, recurring headaches",
                "what_to_expect": "Episodes often include throbbing pain, sensitivity to light and sound, and sometimes nausea.",
                "specialist": "neurologist",
                "lifestyle_tips": [
                    "Identifying and avoiding triggers can help prevent episodes",
                    "Maintaining regular sleep patterns may reduce frequency",
                    "Staying hydrated is important",
                ],
            },
            "Arthritis": {
                "brief": "inflammation of the joints causing pain and stiffness",
                "what_to_expect": "You may experience joint pain, swelling, and reduced range of motion.",
                "specialist": "rheumatologist",
                "lifestyle_tips": [
                    "Gentle exercise can help maintain joint flexibility",
                    "Applying heat or cold may provide relief",
                    "Maintaining a healthy weight reduces stress on joints",
                ],
            },
            # Add more diseases as needed
        }
        
        # Red flag symptoms requiring urgent attention
        self.red_flags = {
            "chest pain": "Chest pain can be serious. If severe or accompanied by shortness of breath, sweating, or pain radiating to your arm or jaw, please seek emergency care immediately.",
            "difficulty breathing": "Breathing difficulties require prompt attention. If you're struggling to breathe, please call emergency services.",
            "sudden severe headache": "A sudden, severe headache (especially if it's the worst you've ever had) needs immediate medical evaluation.",
            "confusion": "Sudden confusion or difficulty speaking can be signs of a serious condition requiring emergency care.",
            "vision changes": "Sudden vision changes, especially in one eye, need immediate medical attention.",
            "weakness on one side": "Sudden weakness on one side of your body could indicate a stroke. Call emergency services immediately.",
        }
    
    def get_confidence_level(self, confidence: float, consensus_ratio: float = 1.0) -> ConfidenceLevel:
        """Determine confidence level from numerical scores"""
        if confidence >= 0.85 and consensus_ratio >= 0.9:
            return ConfidenceLevel.HIGH
        elif confidence >= 0.65 and consensus_ratio >= 0.7:
            return ConfidenceLevel.MODERATE
        elif confidence >= 0.45:
            return ConfidenceLevel.LOW
        else:
            return ConfidenceLevel.UNCERTAIN
    
    def detect_symptom_category(self, symptoms_text: str) -> str:
        """Detect the primary symptom category for follow-up questions"""
        symptoms_lower = symptoms_text.lower()
        
        if any(word in symptoms_lower for word in ['pain', 'ache', 'hurt', 'sore']):
            return "pain"
        elif any(word in symptoms_lower for word in ['rash', 'skin', 'itch', 'patch', 'peel', 'scaly']):
            return "skin"
        elif any(word in symptoms_lower for word in ['stomach', 'nausea', 'vomit', 'diarrhea', 'digest']):
            return "digestive"
        elif any(word in symptoms_lower for word in ['breath', 'cough', 'wheeze', 'lung', 'chest']):
            return "respiratory"
        else:
            return "general"
    
    def check_red_flags(self, symptoms_text: str) -> List[str]:
        """Check for red flag symptoms that need urgent attention"""
        symptoms_lower = symptoms_text.lower()
        warnings = []
        
        for flag, warning in self.red_flags.items():
            if flag in symptoms_lower:
                warnings.append(warning)
        
        return warnings
    
    def get_follow_up_questions(self, symptoms_text: str, patient_context: PatientContext) -> List[str]:
        """Generate relevant follow-up questions based on symptoms"""
        category = self.detect_symptom_category(symptoms_text)
        questions = self.follow_up_questions.get(category, self.follow_up_questions["general"])
        
        # Filter out questions we might already have answers to
        relevant_questions = []
        for q in questions:
            # Don't ask about duration if patient already mentioned it
            if "how long" in q.lower() and any(word in symptoms_text.lower() for word in 
                ['days', 'weeks', 'months', 'years', 'since', 'started']):
                continue
            relevant_questions.append(q)
        
        return relevant_questions[:2]  # Return max 2 questions
    
    def format_symptom_response(
        self,
        symptoms_text: str,
        predicted_condition: str,
        confidence: float,
        consensus_ratio: float,
        top_predictions: List[Dict[str, Any]],
        recommendations: List[str],
        rag_context: Optional[str] = None,
        patient_context: Optional[PatientContext] = None,
        is_first_interaction: bool = True
    ) -> str:
        """
        Format a symptom prediction response in a human-friendly way.
        
        Args:
            symptoms_text: Original symptom description
            predicted_condition: Primary predicted condition
            confidence: Confidence score (0-1)
            consensus_ratio: Model agreement ratio (0-1)
            top_predictions: List of top predicted conditions
            recommendations: List of recommendations
            rag_context: Optional additional context from RAG
            patient_context: Optional patient context
            is_first_interaction: Whether this is the first message
            
        Returns:
            Formatted, human-friendly response
        """
        response_parts = []
        
        # Check for red flags first
        red_flags = self.check_red_flags(symptoms_text)
        if red_flags:
            response_parts.append("⚠️ **Important Safety Notice**")
            for warning in red_flags:
                response_parts.append(warning)
            response_parts.append("")  # Empty line for spacing
        
        # Empathetic opening
        if is_first_interaction:
            opening = random.choice(self.empathetic_openings)
            response_parts.append(opening)
            response_parts.append("")
        
        # Get confidence level and template
        conf_level = self.get_confidence_level(confidence, consensus_ratio)
        template = self.confidence_templates[conf_level]
        
        # Main assessment
        response_parts.append("**What Your Symptoms Suggest**")
        response_parts.append("")
        
        condition_intro = template["intro"]
        disease_info = self.disease_info.get(predicted_condition, {})
        
        if disease_info:
            brief = disease_info.get("brief", "a medical condition")
            response_parts.append(f"{condition_intro} **{predicted_condition}** — {brief}.")
            
            what_to_expect = disease_info.get("what_to_expect", "")
            if what_to_expect:
                response_parts.append(f"{what_to_expect}")
        else:
            response_parts.append(f"{condition_intro} **{predicted_condition}**.")
        
        response_parts.append("")
        
        # Confidence explanation (without technical jargon)
        if conf_level == ConfidenceLevel.HIGH:
            response_parts.append("This assessment is based on strong pattern matching with your described symptoms.")
        elif conf_level == ConfidenceLevel.MODERATE:
            response_parts.append("This is a likely possibility based on your symptoms, though other conditions could also explain what you're experiencing.")
        elif conf_level == ConfidenceLevel.LOW:
            # Show alternatives for low confidence
            if len(top_predictions) > 1:
                alternatives = [p.get('condition', '') for p in top_predictions[1:3] if p.get('condition') != predicted_condition]
                if alternatives:
                    response_parts.append(f"Other possibilities include: {', '.join(alternatives)}. A healthcare provider can help narrow this down.")
        
        response_parts.append("")
        
        # Helpful information about the condition
        if disease_info:
            specialist = disease_info.get("specialist", "healthcare provider")
            response_parts.append("**Recommended Next Steps**")
            response_parts.append("")
            response_parts.append(f"• Consider scheduling an appointment with a **{specialist}** for proper evaluation")
            
            lifestyle_tips = disease_info.get("lifestyle_tips", [])
            if lifestyle_tips:
                response_parts.append(f"• In the meantime: {lifestyle_tips[0]}")
        else:
            response_parts.append("**Recommended Next Steps**")
            response_parts.append("")
            response_parts.append(template["action"])
        
        response_parts.append("")
        
        # Add RAG context if available (disease information)
        if rag_context and len(rag_context) > 50:
            response_parts.append("**Additional Information**")
            response_parts.append("")
            # Truncate if too long and clean up
            context_preview = rag_context[:500] if len(rag_context) > 500 else rag_context
            response_parts.append(context_preview)
            response_parts.append("")
        
        # Follow-up questions to gather more info (if appropriate)
        if conf_level in [ConfidenceLevel.LOW, ConfidenceLevel.UNCERTAIN]:
            follow_ups = self.get_follow_up_questions(symptoms_text, patient_context or PatientContext())
            if follow_ups:
                response_parts.append("**To Better Understand Your Situation**")
                response_parts.append("")
                response_parts.append("It would help me provide better guidance if you could share:")
                for q in follow_ups:
                    response_parts.append(f"• {q}")
                response_parts.append("")
        
        # Medical disclaimer (more natural phrasing)
        response_parts.append("---")
        response_parts.append("")
        response_parts.append("*Please remember that this is an educational tool and cannot replace professional medical advice. If you're concerned about your symptoms or they worsen, please consult with a healthcare provider.*")
        
        return "\n".join(response_parts)
    
    def format_general_medical_response(
        self,
        question: str,
        answer: str,
        sources: List[str] = None,
        confidence: float = 0.0
    ) -> str:
        """
        Format a general medical information response.
        
        Args:
            question: Original question
            answer: RAG-generated answer
            sources: List of source citations
            confidence: Confidence score
            
        Returns:
            Formatted, human-friendly response
        """
        response_parts = []
        
        # Opening
        response_parts.append("Thank you for your question! Here's what I found:")
        response_parts.append("")
        
        # Main answer - clean up and remove duplicate content
        clean_answer = self._clean_rag_response(answer)
        
        if clean_answer:
            response_parts.append(clean_answer)
        else:
            response_parts.append("I couldn't find specific information about that topic in my knowledge base.")
        
        response_parts.append("")
        
        # Sources (if available and not already in the answer)
        if sources and len(sources) > 0 and "Sources" not in clean_answer:
            response_parts.append(f"📚 *Sources: {', '.join(sources[:3])}*")
            response_parts.append("")
        
        # Follow-up prompt
        response_parts.append("---")
        response_parts.append("*Feel free to ask follow-up questions! Remember: This is educational information only - always consult a healthcare professional for medical advice.*")
        
        return "\n".join(response_parts)
    
    def _clean_rag_response(self, answer: str) -> str:
        """
        Clean up RAG response by removing duplicates and excessive disclaimers.
        """
        if not answer:
            return ""
        
        clean = answer.strip()
        
        # Remove duplicate "Important Notice" sections (keep only first)
        if clean.count("**Important Notice**") > 1:
            parts = clean.split("**Important Notice**")
            clean = parts[0] + "**Important Notice**" + parts[1].split("**")[0] if len(parts) > 1 else parts[0]
        
        # Remove duplicate Sources sections
        if clean.count("**Sources") > 1:
            # Keep only the first Sources section
            first_sources = clean.find("**Sources")
            second_sources = clean.find("**Sources", first_sources + 1)
            if second_sources != -1:
                # Find the end of the duplicate sources section
                end_of_dup = clean.find("\n\n", second_sources)
                if end_of_dup != -1:
                    clean = clean[:second_sources] + clean[end_of_dup:]
                else:
                    clean = clean[:second_sources]
        
        # Remove trailing duplicate disclaimers
        disclaimer_phrases = [
            "This information is for educational purposes only",
            "Always consult with a qualified healthcare professional",
            "should not replace professional medical advice"
        ]
        
        lines = clean.split("\n")
        seen_disclaimer = False
        cleaned_lines = []
        
        for line in lines:
            is_disclaimer = any(phrase.lower() in line.lower() for phrase in disclaimer_phrases)
            if is_disclaimer:
                if not seen_disclaimer:
                    cleaned_lines.append(line)
                    seen_disclaimer = True
                # Skip duplicate disclaimers
            else:
                cleaned_lines.append(line)
        
        return "\n".join(cleaned_lines).strip()
    
    def format_clarification_request(self, symptoms_text: str) -> str:
        """
        Generate a request for more information when symptoms are vague.
        
        Args:
            symptoms_text: Original vague symptom description
            
        Returns:
            Friendly request for more details
        """
        response_parts = []
        
        response_parts.append("I'd like to help you better understand what you're experiencing. To provide more useful guidance, could you share a few more details?")
        response_parts.append("")
        
        follow_ups = self.get_follow_up_questions(symptoms_text, PatientContext())
        
        # Only add questions here - don't duplicate
        response_parts.append("**Please tell me:**")
        for q in follow_ups:
            response_parts.append(f"• {q}")
        
        response_parts.append("")
        response_parts.append("The more details you can share, the better I can help point you in the right direction.")
        
        return "\n".join(response_parts)


# Utility function for quick formatting
def format_medical_response(
    response_type: str,
    **kwargs
) -> str:
    """
    Quick utility function for formatting medical responses.
    
    Args:
        response_type: "symptom", "general", or "clarification"
        **kwargs: Arguments specific to response type
        
    Returns:
        Formatted response string
    """
    formatter = MedicalResponseFormatter()
    
    if response_type == "symptom":
        return formatter.format_symptom_response(**kwargs)
    elif response_type == "general":
        return formatter.format_general_medical_response(**kwargs)
    elif response_type == "clarification":
        return formatter.format_clarification_request(**kwargs)
    else:
        return "I'm sorry, I couldn't process that request properly."
