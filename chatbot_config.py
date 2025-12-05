"""
Chatbot Configuration Module
============================

Centralized configuration for all chatbot behaviors, thresholds, and content.
Edit this file to customize the chatbot without modifying core logic.
"""

import json
import os
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field
from enum import Enum

logger = logging.getLogger(__name__)


# =============================================================================
# CONFIGURATION FILE PATH
# =============================================================================

CONFIG_DIR = Path(__file__).parent / "config"
CONFIG_FILE = CONFIG_DIR / "chatbot_settings.json"


# =============================================================================
# DEFAULT CONFIGURATION VALUES
# =============================================================================

DEFAULT_CONFIG = {
    # -------------------------------------------------------------------------
    # Query Detection Settings
    # -------------------------------------------------------------------------
    "query_detection": {
        "greetings": [
            "hello", "hi", "hey", "good morning", "good afternoon", 
            "good evening", "howdy", "greetings", "hi there", "hello there"
        ],
        "off_topic_keywords": [
            "weather", "time", "date", "news", "sports", "movie", 
            "music", "game", "recipe", "travel", "shopping"
        ],
        "prevention_patterns": [
            "how can i prevent", "how to prevent", "prevention of", 
            "avoid getting", "reduce risk", "how to avoid", "prevent getting",
            "stay healthy", "how to protect", "what should i eat", 
            "diet for", "exercise for", "lifestyle", "tips for"
        ],
        "symptom_keywords": [
            "pain", "hurt", "ache", "fever", "cough", "headache", "nausea",
            "vomit", "dizzy", "tired", "fatigue", "rash", "itch", "swollen",
            "bleeding", "difficulty breathing", "chest pain", "abdominal pain",
            "back pain", "joint pain", "muscle pain", "sore throat", 
            "runny nose", "congestion", "diarrhea", "constipation", 
            "weight loss", "weight gain", "trouble sleeping", "patches",
            "scaly", "thirst", "urination", "blurred vision", "numbness",
            "tingling", "burning", "stiffness", "cramps", "weakness"
        ],
        "symptom_patterns": [
            "i have", "i am having", "i feel", "i am feeling", 
            "i'm experiencing", "experiencing", "suffering from",
            "i've been", "i have been", "started having", "been having",
            "noticed", "developed"
        ],
        "general_question_patterns": [
            "what is", "what are", "how does", "what causes", 
            "treatment for", "how is .* treated", "prevention",
            "risk factors", "complications", "prognosis", "medication",
            "therapy", "side effects", "symptoms of", "difference between",
            "how to treat", "what are the symptoms", "can you explain"
        ]
    },
    
    # -------------------------------------------------------------------------
    # Confidence Thresholds
    # -------------------------------------------------------------------------
    "thresholds": {
        "high_confidence": 0.85,
        "moderate_confidence": 0.65,
        "low_confidence": 0.45,
        "clarification_threshold": 0.2,
        "min_words_for_prediction": 5,
        "min_symptoms_for_prediction": 2,
        "consensus_high": 0.9,
        "consensus_moderate": 0.7
    },
    
    # -------------------------------------------------------------------------
    # Red Flag / Emergency Symptoms
    # -------------------------------------------------------------------------
    "red_flags": {
        "chest pain": {
            "patterns": ["chest pain", "tightness in chest", "pressure in chest", "pain in my chest"],
            "urgency": "emergency",
            "message": "⚠️ Chest pain can be serious. If severe or accompanied by shortness of breath, sweating, or pain radiating to your arm or jaw, please seek emergency care immediately."
        },
        "breathing_difficulty": {
            "patterns": ["difficulty breathing", "can't breathe", "struggling to breathe", "shortness of breath"],
            "urgency": "emergency",
            "message": "⚠️ Breathing difficulties require prompt attention. If you're struggling to breathe, please call emergency services."
        },
        "stroke_signs": {
            "patterns": ["weakness on one side", "numbness on one side", "facial droop", "slurred speech", "sudden confusion"],
            "urgency": "emergency",
            "message": "⚠️ These could be signs of a stroke. Remember F.A.S.T: Face drooping, Arm weakness, Speech difficulty, Time to call emergency services!"
        },
        "severe_headache": {
            "patterns": ["worst headache", "sudden severe headache", "thunderclap headache"],
            "urgency": "urgent",
            "message": "⚠️ A sudden, severe headache could indicate a serious condition. Please seek medical attention promptly."
        },
        "high_fever": {
            "patterns": ["high fever", "fever over 103", "fever 104", "very high fever"],
            "urgency": "urgent",
            "message": "⚠️ High fever may require medical attention, especially if accompanied by other symptoms."
        },
        "bleeding": {
            "patterns": ["vomiting blood", "coughing blood", "blood in stool", "severe bleeding"],
            "urgency": "emergency",
            "message": "⚠️ Bleeding symptoms require immediate medical evaluation. Please seek emergency care."
        },
        "vision_loss": {
            "patterns": ["sudden vision loss", "can't see", "sudden blindness", "vision suddenly"],
            "urgency": "emergency",
            "message": "⚠️ Sudden vision changes require immediate medical attention."
        },
        "suicidal": {
            "patterns": ["want to die", "suicidal", "end my life", "hurt myself", "self harm"],
            "urgency": "crisis",
            "message": "⚠️ If you're having thoughts of self-harm, please reach out for help immediately. National Suicide Prevention Lifeline: 988 (US). You're not alone."
        }
    },
    
    # -------------------------------------------------------------------------
    # Follow-up Questions by Symptom Category
    # -------------------------------------------------------------------------
    "follow_up_questions": {
        "pain": [
            "How long have you been experiencing this pain?",
            "Does anything make it better or worse (like rest, movement, or certain positions)?"
        ],
        "skin": [
            "When did you first notice these skin changes?",
            "Has the affected area been spreading or changing in appearance?"
        ],
        "digestive": [
            "How long have these symptoms been present?",
            "Have you noticed any connection to specific foods or times of day?"
        ],
        "respiratory": [
            "How long have you had these breathing symptoms?",
            "Do you have any known allergies, asthma, or recent respiratory infections?"
        ],
        "general": [
            "How long have you been experiencing these symptoms?",
            "Have you noticed any patterns or triggers?"
        ],
        "neurological": [
            "When did these symptoms start?",
            "Have you had any recent head injuries or changes in medication?"
        ],
        "cardiovascular": [
            "How long have you been experiencing these symptoms?",
            "Do you have any history of heart conditions or high blood pressure?"
        ]
    },
    
    # -------------------------------------------------------------------------
    # Disease Information Database
    # -------------------------------------------------------------------------
    "disease_info": {
        "Psoriasis": {
            "brief": "a chronic autoimmune condition that affects the skin",
            "what_to_expect": "It typically causes red, scaly patches that may itch or feel sore.",
            "specialist": "dermatologist",
            "lifestyle_tips": [
                "Keeping skin moisturized can help manage symptoms",
                "Stress management may help reduce flare-ups",
                "Avoiding skin injuries can prevent new patches from forming"
            ]
        },
        "Diabetes": {
            "brief": "a metabolic condition affecting how your body processes blood sugar",
            "what_to_expect": "Symptoms may include increased thirst, frequent urination, and fatigue.",
            "specialist": "endocrinologist or primary care physician",
            "lifestyle_tips": [
                "Regular blood sugar monitoring is important",
                "A balanced diet can help manage blood sugar levels",
                "Regular physical activity is beneficial"
            ]
        },
        "Hypertension": {
            "brief": "high blood pressure, which often has no obvious symptoms",
            "what_to_expect": "It's often called a 'silent' condition because you may not feel symptoms.",
            "specialist": "cardiologist or primary care physician",
            "lifestyle_tips": [
                "Reducing sodium intake may help lower blood pressure",
                "Regular exercise is beneficial for heart health",
                "Stress management techniques can be helpful"
            ]
        },
        "Migraine": {
            "brief": "a neurological condition causing severe, recurring headaches",
            "what_to_expect": "Episodes often include throbbing pain, sensitivity to light and sound, and sometimes nausea.",
            "specialist": "neurologist",
            "lifestyle_tips": [
                "Identifying and avoiding triggers can help prevent attacks",
                "Maintaining regular sleep patterns is beneficial",
                "Staying hydrated and managing stress may help"
            ]
        },
        "Common Cold": {
            "brief": "a viral infection of the upper respiratory tract",
            "what_to_expect": "Symptoms usually include runny nose, sore throat, cough, and mild fever.",
            "specialist": "primary care physician (usually self-limiting)",
            "lifestyle_tips": [
                "Rest and hydration are key to recovery",
                "Over-the-counter medications can help manage symptoms",
                "Most colds resolve within 7-10 days"
            ]
        },
        "Arthritis": {
            "brief": "inflammation of one or more joints causing pain and stiffness",
            "what_to_expect": "Symptoms typically include joint pain, swelling, and reduced range of motion.",
            "specialist": "rheumatologist",
            "lifestyle_tips": [
                "Regular gentle exercise can help maintain joint flexibility",
                "Hot or cold therapy may provide relief",
                "Maintaining a healthy weight reduces stress on joints"
            ]
        }
    },
    
    # -------------------------------------------------------------------------
    # Response Templates
    # -------------------------------------------------------------------------
    "response_templates": {
        "greeting": """Hello! 👋 Welcome to the Medical AI Assistant!

I'm here to help you with:
• 🩺 **Symptom Analysis** - Describe your symptoms and I'll help identify possible conditions
• 📚 **Medical Information** - Ask about diseases, treatments, medications, and prevention
• 🖼️ **Image Analysis** - Share images of skin conditions for visual analysis

**How can I help you today?**

*Remember: I provide educational information only. For medical emergencies, please call emergency services.*""",
        
        "off_topic": """I'm a medical AI assistant, so I'm best suited to help with health-related questions! 🏥

**I can help you with:**
• Symptom analysis and possible conditions
• Information about diseases and treatments
• Medication information and side effects
• Prevention and lifestyle advice
• Analyzing images of skin conditions

**What health topic can I help you with today?**""",
        
        "clarification_intro": "I'd like to help you better understand what you're experiencing. To provide more useful guidance, could you share a few more details?",
        
        "clarification_outro": "The more details you can share, the better I can help point you in the right direction.",
        
        "emergency_intro": "⚠️ **IMPORTANT SAFETY ALERT**",
        
        "emergency_outro": "**Please seek immediate medical attention.** If you're experiencing a medical emergency, call emergency services (911) or go to the nearest emergency room immediately.\n\n*Your safety is the top priority. Don't delay seeking help.*",
        
        "diagnosis_refusal": """I understand you'd like a diagnosis, but I'm not able to provide medical diagnoses. Here's why:

• Accurate diagnosis requires physical examination
• Lab tests and imaging may be needed
• Your complete medical history matters
• Only licensed healthcare providers can diagnose

**What I CAN do:**
• Analyze your symptoms and suggest possible conditions
• Provide educational information about health topics
• Help you prepare questions for your doctor

Would you like to describe your symptoms so I can provide some helpful information?""",

        "medical_disclaimer": """
⚠️ IMPORTANT MEDICAL DISCLAIMER:
This AI system provides educational information only and is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of qualified healthcare providers with questions about medical conditions. In case of emergency, contact emergency services immediately.
"""
    },
    
    # -------------------------------------------------------------------------
    # Empathetic Response Phrases
    # -------------------------------------------------------------------------
    "empathetic_phrases": {
        "openings": [
            "I understand you're concerned about your health, and I'm here to help.",
            "Thank you for sharing your symptoms with me. Let me help you understand what might be happening.",
            "I can see you're experiencing some discomfort. Let's work through this together.",
            "I appreciate you reaching out about your health concerns.",
            "It's important that you're paying attention to how you feel. Let me provide some guidance."
        ],
        "acknowledgments": [
            "I understand that must be concerning.",
            "That sounds uncomfortable, and I'm glad you're seeking information.",
            "I can imagine that's worrying you.",
            "Thank you for providing those details."
        ],
        "encouragements": [
            "You're doing the right thing by paying attention to your health.",
            "It's great that you're being proactive about this.",
            "Taking note of your symptoms is an important first step."
        ]
    },
    
    # -------------------------------------------------------------------------
    # Image Analysis Settings
    # -------------------------------------------------------------------------
    "image_analysis": {
        "enabled": True,
        "max_file_size_mb": 10,
        "supported_formats": ["image/jpeg", "image/png", "image/gif", "image/webp"],
        "vision_prompt_template": """You are a medical education assistant analyzing an image shared by a user.

User's question: {question}

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
    },
    
    # -------------------------------------------------------------------------
    # Session Settings
    # -------------------------------------------------------------------------
    "session": {
        "timeout_minutes": 60,
        "max_history_turns": 20,
        "context_turns_for_response": 5
    }
}


# =============================================================================
# CONFIGURATION CLASS
# =============================================================================

class ChatbotConfig:
    """
    Configuration manager for the chatbot.
    Loads settings from file or uses defaults.
    """
    
    _instance = None
    _config: Dict[str, Any] = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._load_config()
        return cls._instance
    
    def _load_config(self):
        """Load configuration from file or use defaults"""
        if CONFIG_FILE.exists():
            try:
                with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                    file_config = json.load(f)
                # Merge with defaults (file overrides defaults)
                self._config = self._deep_merge(DEFAULT_CONFIG.copy(), file_config)
                print(f"✅ Loaded configuration from {CONFIG_FILE}")
            except Exception as e:
                print(f"⚠️ Error loading config file: {e}. Using defaults.")
                self._config = DEFAULT_CONFIG.copy()
        else:
            self._config = DEFAULT_CONFIG.copy()
            # Optionally save defaults to file for easy editing
            self._save_defaults()
    
    def _deep_merge(self, base: dict, override: dict) -> dict:
        """Deep merge two dictionaries"""
        result = base.copy()
        for key, value in override.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = self._deep_merge(result[key], value)
            else:
                result[key] = value
        return result
    
    def _save_defaults(self):
        """Save default configuration to file for easy editing"""
        try:
            CONFIG_DIR.mkdir(parents=True, exist_ok=True)
            with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
                json.dump(DEFAULT_CONFIG, f, indent=2, ensure_ascii=False)
            print(f"📝 Default configuration saved to {CONFIG_FILE}")
        except Exception as e:
            print(f"⚠️ Could not save default config: {e}")
    
    def reload(self):
        """Reload configuration from file"""
        self._load_config()
    
    def get(self, *keys, default=None):
        """
        Get a configuration value using dot notation.
        Example: config.get('thresholds', 'high_confidence')
        """
        value = self._config
        for key in keys:
            if isinstance(value, dict) and key in value:
                value = value[key]
            else:
                return default
        return value
    
    def set(self, *keys, value):
        """
        Set a configuration value.
        Example: config.set('thresholds', 'high_confidence', value=0.9)
        """
        if len(keys) < 1:
            return
        
        target = self._config
        for key in keys[:-1]:
            if key not in target:
                target[key] = {}
            target = target[key]
        target[keys[-1]] = value
    
    def save(self):
        """Save current configuration to file"""
        try:
            CONFIG_DIR.mkdir(parents=True, exist_ok=True)
            with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
                json.dump(self._config, f, indent=2, ensure_ascii=False)
            print(f"✅ Configuration saved to {CONFIG_FILE}")
        except Exception as e:
            print(f"❌ Error saving configuration: {e}")
    
    # Convenience properties
    @property
    def greetings(self) -> List[str]:
        return self.get('query_detection', 'greetings', default=[])
    
    @property
    def symptom_keywords(self) -> List[str]:
        return self.get('query_detection', 'symptom_keywords', default=[])
    
    @property
    def symptom_patterns(self) -> List[str]:
        return self.get('query_detection', 'symptom_patterns', default=[])
    
    @property
    def red_flags(self) -> Dict[str, Any]:
        return self.get('red_flags', default={})
    
    @property
    def thresholds(self) -> Dict[str, float]:
        return self.get('thresholds', default={})
    
    @property
    def follow_up_questions(self) -> Dict[str, List[str]]:
        return self.get('follow_up_questions', default={})
    
    @property
    def disease_info(self) -> Dict[str, Any]:
        return self.get('disease_info', default={})
    
    @property
    def response_templates(self) -> Dict[str, str]:
        return self.get('response_templates', default={})
    
    @property
    def empathetic_phrases(self) -> Dict[str, List[str]]:
        return self.get('empathetic_phrases', default={})
    
    # Nested configuration accessors
    @property
    def query_detection(self) -> 'QueryDetectionAccessor':
        """Access query detection configuration"""
        return QueryDetectionAccessor(self)
    
    @property
    def clarification(self) -> 'ClarificationAccessor':
        """Access clarification configuration"""
        return ClarificationAccessor(self)
    
    @property
    def response(self) -> 'ResponseAccessor':
        """Access response configuration"""
        return ResponseAccessor(self)
    
    @property
    def safety(self) -> 'SafetyAccessor':
        """Access safety configuration"""
        return SafetyAccessor(self)


# =============================================================================
# CONFIGURATION ACCESSORS (for clean attribute access)
# =============================================================================

class QueryDetectionAccessor:
    """Provides attribute access to query detection config"""
    def __init__(self, config: ChatbotConfig):
        self._config = config
    
    @property
    def greetings(self) -> List[str]:
        return self._config.get('query_detection', 'greetings', default=[])
    
    @greetings.setter
    def greetings(self, value: List[str]):
        self._config.set('query_detection', 'greetings', value=value)
    
    @property
    def symptom_keywords(self) -> List[str]:
        return self._config.get('query_detection', 'symptom_keywords', default=[])
    
    @symptom_keywords.setter
    def symptom_keywords(self, value: List[str]):
        self._config.set('query_detection', 'symptom_keywords', value=value)
    
    @property
    def symptom_patterns(self) -> List[str]:
        return self._config.get('query_detection', 'symptom_patterns', default=[])
    
    @symptom_patterns.setter
    def symptom_patterns(self, value: List[str]):
        self._config.set('query_detection', 'symptom_patterns', value=value)
    
    @property
    def prevention_patterns(self) -> List[str]:
        return self._config.get('query_detection', 'prevention_patterns', default=[])
    
    @prevention_patterns.setter
    def prevention_patterns(self, value: List[str]):
        self._config.set('query_detection', 'prevention_patterns', value=value)
    
    @property
    def off_topic_keywords(self) -> List[str]:
        return self._config.get('query_detection', 'off_topic_keywords', default=[])
    
    @off_topic_keywords.setter
    def off_topic_keywords(self, value: List[str]):
        self._config.set('query_detection', 'off_topic_keywords', value=value)
    
    @property
    def medical_overrides(self) -> List[str]:
        return self._config.get('query_detection', 'medical_overrides', 
                                default=['symptom', 'pain', 'disease', 'health', 'medical'])
    
    @property
    def general_keywords(self) -> List[str]:
        return self._config.get('query_detection', 'general_question_patterns', default=[])
    
    @general_keywords.setter
    def general_keywords(self, value: List[str]):
        self._config.set('query_detection', 'general_question_patterns', value=value)


class ClarificationAccessor:
    """Provides attribute access to clarification config"""
    def __init__(self, config: ChatbotConfig):
        self._config = config
    
    @property
    def low_confidence_threshold(self) -> float:
        return self._config.get('thresholds', 'low_confidence', default=0.45)
    
    @low_confidence_threshold.setter
    def low_confidence_threshold(self, value: float):
        self._config.set('thresholds', 'low_confidence', value=value)
    
    @property
    def high_confidence_threshold(self) -> float:
        return self._config.get('thresholds', 'high_confidence', default=0.85)
    
    @high_confidence_threshold.setter
    def high_confidence_threshold(self, value: float):
        self._config.set('thresholds', 'high_confidence', value=value)
    
    @property
    def min_word_count_for_detailed(self) -> int:
        return self._config.get('thresholds', 'min_words_for_prediction', default=5)
    
    @min_word_count_for_detailed.setter
    def min_word_count_for_detailed(self, value: int):
        self._config.set('thresholds', 'min_words_for_prediction', value=value)
    
    @property
    def max_clarification_questions(self) -> int:
        return self._config.get('thresholds', 'max_clarification_questions', default=3)
    
    @max_clarification_questions.setter
    def max_clarification_questions(self, value: int):
        self._config.set('thresholds', 'max_clarification_questions', value=value)


class ResponseAccessor:
    """Provides attribute access to response config"""
    def __init__(self, config: ChatbotConfig):
        self._config = config
    
    @property
    def empathetic_openings(self) -> List[str]:
        return self._config.get('empathetic_phrases', 'openings', 
                                default=["Thank you for sharing that with me.",
                                         "I understand you're concerned.",
                                         "I appreciate you describing your symptoms."])
    
    @empathetic_openings.setter
    def empathetic_openings(self, value: List[str]):
        self._config.set('empathetic_phrases', 'openings', value=value)
    
    @property
    def follow_up_questions(self) -> Dict[str, List[str]]:
        return self._config.get('follow_up_questions', default={})
    
    @follow_up_questions.setter
    def follow_up_questions(self, value: Dict[str, List[str]]):
        self._config.set('follow_up_questions', value=value)


class SafetyAccessor:
    """Provides attribute access to safety config"""
    def __init__(self, config: ChatbotConfig):
        self._config = config
    
    @property
    def emergency_keywords(self) -> List[str]:
        return self._config.get('emergency_keywords', 
                                default=['emergency', 'dying', 'heart attack', 'stroke', 
                                         'can\'t breathe', 'severe pain', 'unconscious'])
    
    @emergency_keywords.setter
    def emergency_keywords(self, value: List[str]):
        self._config.set('emergency_keywords', value=value)
    
    @property
    def red_flag_patterns(self) -> Dict[str, List[str]]:
        """Get red flag patterns as a simple dict for detection"""
        red_flags = self._config.get('red_flags', default={})
        result = {}
        for key, value in red_flags.items():
            if isinstance(value, dict) and 'patterns' in value:
                result[key] = value['patterns']
            elif isinstance(value, list):
                result[key] = value
        return result
    
    @red_flag_patterns.setter
    def red_flag_patterns(self, value: Dict[str, List[str]]):
        self._config.set('red_flags', value=value)


# =============================================================================
# SINGLETON INSTANCE
# =============================================================================

def get_config() -> ChatbotConfig:
    """Get the singleton configuration instance"""
    return ChatbotConfig()


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def add_disease_info(disease_name: str, info: Dict[str, Any]):
    """Add or update disease information"""
    config = get_config()
    config.set('disease_info', disease_name, value=info)
    config.save()


def add_symptom_keyword(keyword: str):
    """Add a new symptom keyword"""
    config = get_config()
    keywords = config.symptom_keywords
    if keyword.lower() not in keywords:
        keywords.append(keyword.lower())
        config.set('query_detection', 'symptom_keywords', value=keywords)
        config.save()


def add_red_flag(name: str, patterns: List[str], urgency: str, message: str):
    """Add a new red flag symptom"""
    config = get_config()
    config.set('red_flags', name, value={
        'patterns': patterns,
        'urgency': urgency,
        'message': message
    })
    config.save()


def update_threshold(threshold_name: str, value: float):
    """Update a confidence threshold"""
    config = get_config()
    config.set('thresholds', threshold_name, value=value)
    config.save()


def load_config_from_file(file_path: str) -> bool:
    """Load configuration from a JSON file and update the global config"""
    global _config_instance
    try:
        if Path(file_path).exists():
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            config = get_config()
            for key, value in data.items():
                config._config[key] = value
            
            logger.info(f"Configuration loaded from {file_path}")
            return True
        else:
            logger.warning(f"Config file not found: {file_path}")
            return False
    except Exception as e:
        logger.error(f"Error loading config from {file_path}: {e}")
        return False


# =============================================================================
# MAIN (for testing)
# =============================================================================

if __name__ == "__main__":
    # Test configuration
    config = get_config()
    
    print("\n📋 Configuration Test")
    print("=" * 50)
    print(f"Greetings: {config.greetings[:3]}...")
    print(f"Symptom keywords: {len(config.symptom_keywords)} keywords")
    print(f"Red flags: {list(config.red_flags.keys())}")
    print(f"Thresholds: {config.thresholds}")
    print(f"Disease info available: {list(config.disease_info.keys())}")
