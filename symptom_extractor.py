"""
Symptom Extraction and Analysis Module
======================================

Advanced symptom extraction from natural language with medical entity recognition
and context understanding for more accurate disease prediction.
"""

import re
from typing import Dict, List, Tuple, Optional, Set
from dataclasses import dataclass, field
from enum import Enum


class SymptomSeverity(Enum):
    MILD = "mild"
    MODERATE = "moderate"
    SEVERE = "severe"
    UNKNOWN = "unknown"


class SymptomDuration(Enum):
    ACUTE = "acute"        # Less than a week
    SUBACUTE = "subacute"  # 1-4 weeks
    CHRONIC = "chronic"    # More than 4 weeks
    UNKNOWN = "unknown"


@dataclass
class ExtractedSymptom:
    """Represents a single extracted symptom with metadata"""
    name: str
    body_part: Optional[str] = None
    severity: SymptomSeverity = SymptomSeverity.UNKNOWN
    duration: SymptomDuration = SymptomDuration.UNKNOWN
    frequency: Optional[str] = None  # e.g., "constant", "intermittent", "at night"
    modifiers: List[str] = field(default_factory=list)  # e.g., "burning", "sharp", "dull"
    raw_text: str = ""


@dataclass
class SymptomAnalysis:
    """Complete analysis of extracted symptoms"""
    symptoms: List[ExtractedSymptom]
    body_systems_affected: Set[str]
    urgency_level: str  # "emergency", "urgent", "soon", "routine"
    needs_clarification: bool
    clarification_questions: List[str]
    confidence_score: float
    red_flags_detected: List[str]
    original_text: str
    enhanced_text: str  # Text enhanced for ML model


class SymptomExtractor:
    """
    Advanced symptom extraction from natural language.
    Extracts symptoms, body parts, severity, duration, and other relevant information.
    """
    
    def __init__(self):
        # Symptom vocabulary with synonyms and variations
        self.symptom_vocabulary = {
            # Pain-related
            "headache": ["headache", "head pain", "head hurts", "head ache", "cephalalgia", "migraine"],
            "chest_pain": ["chest pain", "chest hurts", "pain in chest", "chest tightness", "angina"],
            "abdominal_pain": ["stomach pain", "belly pain", "abdominal pain", "stomach ache", "tummy ache", "stomach hurts"],
            "back_pain": ["back pain", "back hurts", "backache", "lower back pain", "upper back pain"],
            "joint_pain": ["joint pain", "arthralgia", "joints hurt", "painful joints", "joint ache"],
            "muscle_pain": ["muscle pain", "myalgia", "muscle ache", "muscles hurt", "sore muscles"],
            
            # Respiratory
            "cough": ["cough", "coughing", "dry cough", "wet cough", "productive cough"],
            "shortness_of_breath": ["shortness of breath", "difficulty breathing", "breathless", "dyspnea", "can't breathe", "hard to breathe"],
            "wheezing": ["wheezing", "wheeze", "whistling breath"],
            "sore_throat": ["sore throat", "throat pain", "throat hurts", "pharyngitis"],
            "runny_nose": ["runny nose", "nasal discharge", "rhinorrhea", "stuffy nose", "congestion"],
            
            # Gastrointestinal
            "nausea": ["nausea", "nauseous", "feel sick", "queasy", "sick to stomach"],
            "vomiting": ["vomiting", "throwing up", "vomit", "emesis", "been sick"],
            "diarrhea": ["diarrhea", "loose stools", "watery stool", "frequent bowel movements"],
            "constipation": ["constipation", "constipated", "hard stool", "difficulty passing stool"],
            "bloating": ["bloating", "bloated", "abdominal distension", "gassy", "gas"],
            
            # Neurological
            "dizziness": ["dizziness", "dizzy", "lightheaded", "vertigo", "room spinning"],
            "confusion": ["confusion", "confused", "disoriented", "mental fog", "brain fog"],
            "numbness": ["numbness", "numb", "tingling", "pins and needles", "paresthesia"],
            "weakness": ["weakness", "weak", "fatigue", "tired", "exhausted", "no energy"],
            
            # Skin
            "rash": ["rash", "skin rash", "eruption", "hives", "skin irritation"],
            "itching": ["itching", "itchy", "pruritus", "scratching"],
            "skin_peeling": ["peeling skin", "skin peeling", "flaking skin", "scaly skin"],
            "swelling": ["swelling", "swollen", "edema", "puffiness", "inflammation"],
            
            # General/Constitutional
            "fever": ["fever", "high temperature", "febrile", "chills", "feverish", "temperature"],
            "fatigue": ["fatigue", "tired", "exhausted", "lethargy", "malaise", "no energy", "worn out"],
            "weight_loss": ["weight loss", "losing weight", "lost weight", "unintentional weight loss"],
            "weight_gain": ["weight gain", "gaining weight", "gained weight"],
            "sleep_problems": ["insomnia", "can't sleep", "trouble sleeping", "sleep problems", "poor sleep"],
            "appetite_loss": ["loss of appetite", "not hungry", "no appetite", "anorexia"],
        }
        
        # Body parts vocabulary
        self.body_parts = {
            "head": ["head", "skull", "scalp", "forehead"],
            "face": ["face", "cheek", "jaw", "chin"],
            "eyes": ["eye", "eyes", "vision", "sight"],
            "ears": ["ear", "ears", "hearing"],
            "nose": ["nose", "nasal", "nostril"],
            "throat": ["throat", "neck", "larynx", "pharynx"],
            "chest": ["chest", "thorax", "breast", "ribcage"],
            "heart": ["heart", "cardiac"],
            "lungs": ["lung", "lungs", "respiratory"],
            "abdomen": ["abdomen", "stomach", "belly", "tummy", "gut"],
            "back": ["back", "spine", "lumbar", "thoracic"],
            "arms": ["arm", "arms", "elbow", "wrist", "hand", "hands", "finger", "fingers"],
            "legs": ["leg", "legs", "knee", "ankle", "foot", "feet", "toe", "toes", "calf", "calves", "thigh"],
            "skin": ["skin", "dermal", "cutaneous"],
            "joints": ["joint", "joints", "knuckle", "hip"],
        }
        
        # Body systems for categorization
        self.body_systems = {
            "respiratory": ["cough", "shortness_of_breath", "wheezing", "runny_nose"],
            "cardiovascular": ["chest_pain", "palpitations", "swelling"],
            "gastrointestinal": ["nausea", "vomiting", "diarrhea", "constipation", "abdominal_pain", "bloating"],
            "neurological": ["headache", "dizziness", "confusion", "numbness", "weakness"],
            "musculoskeletal": ["joint_pain", "muscle_pain", "back_pain"],
            "dermatological": ["rash", "itching", "skin_peeling", "swelling"],
            "constitutional": ["fever", "fatigue", "weight_loss", "weight_gain", "sleep_problems"],
        }
        
        # Severity indicators
        self.severity_indicators = {
            SymptomSeverity.MILD: [
                "slight", "mild", "minor", "a little", "bit of", "occasional", "sometimes"
            ],
            SymptomSeverity.MODERATE: [
                "moderate", "noticeable", "regular", "persistent", "constant", "frequent"
            ],
            SymptomSeverity.SEVERE: [
                "severe", "intense", "extreme", "unbearable", "worst", "terrible", 
                "excruciating", "sharp", "stabbing", "very bad", "really bad"
            ],
        }
        
        # Duration indicators
        self.duration_patterns = {
            SymptomDuration.ACUTE: [
                r"since (yesterday|this morning|last night)",
                r"(today|just started|started today|few hours)",
                r"(1|2|3|4|5|6) days?",
                r"couple of days",
            ],
            SymptomDuration.SUBACUTE: [
                r"(1|2|3) weeks?",
                r"couple of weeks",
                r"about a week",
                r"over a week",
                r"(10|14|15|20) days?",
            ],
            SymptomDuration.CHRONIC: [
                r"(1|2|3|4|5|6|\d+) months?",
                r"(1|2|3|several|many) years?",
                r"long time",
                r"chronic",
                r"always had",
                r"for years",
                r"ongoing",
            ],
        }
        
        # Red flag symptoms requiring urgent attention
        self.red_flag_patterns = [
            (r"chest pain|chest tightness|pressure in chest", "chest_pain"),
            (r"difficulty breathing|can'?t breathe|struggling to breathe", "breathing_difficulty"),
            (r"severe headache|worst headache|sudden headache", "severe_headache"),
            (r"confusion|disoriented|slurred speech", "neurological_change"),
            (r"weakness on one side|numbness on one side|facial droop", "stroke_signs"),
            (r"coughing blood|vomiting blood|blood in stool", "bleeding"),
            (r"sudden vision (loss|change)|blind", "vision_change"),
            (r"high fever|fever over 103|fever (\d{3})", "high_fever"),
            (r"suicidal|want to (die|hurt myself)|self.harm", "mental_health_crisis"),
        ]
    
    def extract_symptoms(self, text: str) -> SymptomAnalysis:
        """
        Main method to extract and analyze symptoms from text.
        
        Args:
            text: Raw user input describing symptoms
            
        Returns:
            SymptomAnalysis object with extracted information
        """
        text_lower = text.lower()
        
        # Extract symptoms
        extracted_symptoms = self._extract_symptom_mentions(text_lower, text)
        
        # Detect body systems affected
        body_systems = self._detect_body_systems(extracted_symptoms)
        
        # Check for red flags
        red_flags = self._check_red_flags(text_lower)
        
        # Determine urgency
        urgency = self._determine_urgency(red_flags, extracted_symptoms)
        
        # Generate clarification questions if needed
        needs_clarification, questions = self._generate_clarification_questions(
            extracted_symptoms, text_lower
        )
        
        # Calculate confidence score
        confidence = self._calculate_extraction_confidence(extracted_symptoms, text)
        
        # Generate enhanced text for ML model
        enhanced_text = self._generate_enhanced_text(extracted_symptoms, text)
        
        return SymptomAnalysis(
            symptoms=extracted_symptoms,
            body_systems_affected=body_systems,
            urgency_level=urgency,
            needs_clarification=needs_clarification,
            clarification_questions=questions,
            confidence_score=confidence,
            red_flags_detected=red_flags,
            original_text=text,
            enhanced_text=enhanced_text
        )
    
    def _extract_symptom_mentions(self, text_lower: str, original_text: str) -> List[ExtractedSymptom]:
        """Extract individual symptoms with their metadata"""
        extracted = []
        
        for symptom_key, variations in self.symptom_vocabulary.items():
            for variation in variations:
                if variation in text_lower:
                    # Find surrounding context
                    idx = text_lower.find(variation)
                    context_start = max(0, idx - 50)
                    context_end = min(len(text_lower), idx + len(variation) + 50)
                    context = text_lower[context_start:context_end]
                    
                    symptom = ExtractedSymptom(
                        name=symptom_key,
                        body_part=self._extract_body_part(context),
                        severity=self._extract_severity(context),
                        duration=self._extract_duration(context),
                        frequency=self._extract_frequency(context),
                        modifiers=self._extract_modifiers(context),
                        raw_text=original_text[context_start:context_end]
                    )
                    extracted.append(symptom)
                    break  # Only add each symptom once
        
        return extracted
    
    def _extract_body_part(self, context: str) -> Optional[str]:
        """Extract body part from context"""
        for body_part, variations in self.body_parts.items():
            for variation in variations:
                if variation in context:
                    return body_part
        return None
    
    def _extract_severity(self, context: str) -> SymptomSeverity:
        """Extract severity from context"""
        for severity, indicators in self.severity_indicators.items():
            for indicator in indicators:
                if indicator in context:
                    return severity
        return SymptomSeverity.UNKNOWN
    
    def _extract_duration(self, context: str) -> SymptomDuration:
        """Extract duration from context"""
        for duration, patterns in self.duration_patterns.items():
            for pattern in patterns:
                if re.search(pattern, context, re.IGNORECASE):
                    return duration
        return SymptomDuration.UNKNOWN
    
    def _extract_frequency(self, context: str) -> Optional[str]:
        """Extract frequency/timing information"""
        frequency_patterns = [
            (r"all the time|constantly|always", "constant"),
            (r"comes and goes|intermittent|on and off", "intermittent"),
            (r"at night|nighttime|when sleeping", "nocturnal"),
            (r"in the morning|when waking", "morning"),
            (r"after eating|after meals", "postprandial"),
            (r"during exercise|when active", "exertional"),
        ]
        
        for pattern, frequency in frequency_patterns:
            if re.search(pattern, context, re.IGNORECASE):
                return frequency
        return None
    
    def _extract_modifiers(self, context: str) -> List[str]:
        """Extract symptom modifiers (e.g., sharp, burning, dull)"""
        modifier_words = [
            "sharp", "dull", "burning", "throbbing", "stabbing", "aching",
            "cramping", "shooting", "radiating", "constant", "intermittent",
            "sudden", "gradual", "localized", "diffuse", "bilateral"
        ]
        
        found = []
        for modifier in modifier_words:
            if modifier in context:
                found.append(modifier)
        return found
    
    def _detect_body_systems(self, symptoms: List[ExtractedSymptom]) -> Set[str]:
        """Identify which body systems are affected"""
        affected_systems = set()
        
        symptom_names = [s.name for s in symptoms]
        
        for system, system_symptoms in self.body_systems.items():
            if any(symptom in symptom_names for symptom in system_symptoms):
                affected_systems.add(system)
        
        return affected_systems
    
    def _check_red_flags(self, text: str) -> List[str]:
        """Check for red flag symptoms requiring urgent attention"""
        red_flags = []
        
        for pattern, flag_name in self.red_flag_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                red_flags.append(flag_name)
        
        return red_flags
    
    def _determine_urgency(self, red_flags: List[str], symptoms: List[ExtractedSymptom]) -> str:
        """Determine urgency level based on symptoms"""
        # Emergency conditions
        emergency_flags = ["chest_pain", "breathing_difficulty", "stroke_signs", "mental_health_crisis"]
        if any(flag in red_flags for flag in emergency_flags):
            return "emergency"
        
        # Urgent conditions
        urgent_flags = ["severe_headache", "neurological_change", "bleeding", "high_fever"]
        if any(flag in red_flags for flag in urgent_flags):
            return "urgent"
        
        # Check for severe symptoms
        severe_count = sum(1 for s in symptoms if s.severity == SymptomSeverity.SEVERE)
        if severe_count >= 2:
            return "urgent"
        
        # Check for multiple body systems affected
        if len(self._detect_body_systems(symptoms)) >= 3:
            return "soon"
        
        return "routine"
    
    def _generate_clarification_questions(
        self, 
        symptoms: List[ExtractedSymptom], 
        text: str
    ) -> Tuple[bool, List[str]]:
        """Generate clarification questions if information is missing"""
        questions = []
        
        # Check if duration is missing
        if symptoms and all(s.duration == SymptomDuration.UNKNOWN for s in symptoms):
            questions.append("How long have you been experiencing these symptoms?")
        
        # Check if severity is missing
        if symptoms and all(s.severity == SymptomSeverity.UNKNOWN for s in symptoms):
            questions.append("How would you describe the intensity of your symptoms (mild, moderate, or severe)?")
        
        # Check for vague descriptions
        if len(symptoms) == 0:
            questions.append("Could you describe your symptoms in more detail? For example, what exactly are you feeling and where?")
        
        # Check if progression information is missing
        if not any(word in text for word in ["better", "worse", "same", "improving", "worsening"]):
            questions.append("Have your symptoms been getting better, worse, or staying the same?")
        
        return len(questions) > 0, questions[:3]  # Max 3 questions
    
    def _calculate_extraction_confidence(self, symptoms: List[ExtractedSymptom], text: str) -> float:
        """Calculate confidence in the extraction"""
        if not symptoms:
            return 0.3  # Low confidence if no symptoms found
        
        score = 0.5  # Base score
        
        # Add points for each symptom with metadata
        for symptom in symptoms:
            if symptom.severity != SymptomSeverity.UNKNOWN:
                score += 0.1
            if symptom.duration != SymptomDuration.UNKNOWN:
                score += 0.1
            if symptom.body_part:
                score += 0.05
            if symptom.modifiers:
                score += 0.05
        
        # Cap at 1.0
        return min(1.0, score)
    
    def _generate_enhanced_text(self, symptoms: List[ExtractedSymptom], original_text: str) -> str:
        """Generate enhanced text optimized for ML model"""
        if not symptoms:
            return original_text
        
        # Create a normalized symptom description
        parts = []
        
        for symptom in symptoms:
            symptom_text = symptom.name.replace("_", " ")
            
            if symptom.body_part:
                symptom_text = f"{symptom.body_part} {symptom_text}"
            
            if symptom.severity != SymptomSeverity.UNKNOWN:
                symptom_text = f"{symptom.severity.value} {symptom_text}"
            
            if symptom.modifiers:
                symptom_text = f"{', '.join(symptom.modifiers)} {symptom_text}"
            
            parts.append(symptom_text)
        
        enhanced = ". ".join(parts)
        
        # Also include original text for context
        return f"{enhanced}. Original description: {original_text}"


# Utility function
def analyze_symptoms(text: str) -> SymptomAnalysis:
    """
    Quick utility function for symptom analysis.
    
    Args:
        text: Raw symptom description
        
    Returns:
        SymptomAnalysis object
    """
    extractor = SymptomExtractor()
    return extractor.extract_symptoms(text)
