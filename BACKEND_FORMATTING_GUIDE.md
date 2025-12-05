# Backend Response Formatting Guide

## Overview

This guide explains how the Python backend should format responses to work seamlessly with the enhanced frontend formatting system.

## Response Object Structure

All responses from the backend should follow this format:

```python
{
    "response": "Formatted text content...",
    "queryType": "symptoms|general|hybrid",
    "confidence": 0.87,  # Only for ML predictions
    "predictedCondition": "Migraine",  # Only for ML predictions
    "sources": ["Source 1", "Source 2"],  # Only for RAG
    "processingTime": 1234,  # in milliseconds
    "systemUsed": "Disease Prediction|RAG|Hybrid",
    "medicalDisclaimer": "Important: This information...",
    "timestamp": "2024-12-06T10:30:00Z",
    "session_id": "session-uuid",
    "conversation_turn": 1
}
```

## Response Content Formatting

The `response` field should use Markdown formatting with special markers:

### Section Headers
```python
response = """
## Treatment Options

**Medications:**
• Acetaminophen: 500-1000mg every 4-6 hours
• Ibuprofen: 200-400mg every 6-8 hours
"""
```

### Lists
Use bullet points (`•`, `-`, or `*`):
```python
response = """
**When to Seek Medical Care:**
• Fever exceeds 103°F (39.4°C)
• Difficulty breathing
• Severe chest pain
"""
```

### Bold Text
```python
**Important notice:** This is critical information
```

### Italic Text
```python
*This text will be italicized*
```

### Inline Code
```python
Take `acetaminophen` as directed by your doctor
```

### Links
```python
[Read more about diabetes](https://example.com/diabetes)
```

### Warnings
Include warning emoji and keywords:
```python
⚠️ **Important Medical Disclaimer:**
This information is for educational purposes only...

⚠️ **Seek Emergency Care If:**
• Chest pain
• Difficulty breathing
"""
```

## Backend Implementation Examples

### Example 1: Symptom Prediction Response

```python
def format_symptom_response(
    condition: str,
    confidence: float,
    symptoms_analyzed: List[str],
    recommendations: Dict[str, List[str]],
    processing_time_ms: float
) -> Dict[str, Any]:
    """Format symptom prediction response"""
    
    response_text = f"""## Analysis Results

Based on your reported symptoms, here's the analysis:

**Primary Finding:** {condition}
**Analysis Confidence:** {(confidence * 100):.1f}%

## Your Symptoms
"""
    
    # Add symptoms list
    for symptom in symptoms_analyzed:
        response_text += f"• {symptom}\n"
    
    # Add recommendations
    response_text += "\n## Recommended Actions\n\n"
    
    if 'immediate' in recommendations:
        response_text += "**Immediate Steps:**\n"
        for action in recommendations['immediate']:
            response_text += f"• {action}\n"
    
    if 'when_to_seek_care' in recommendations:
        response_text += "\n⚠️ **Seek Medical Attention If:**\n"
        for indicator in recommendations['when_to_seek_care']:
            response_text += f"• {indicator}\n"
    
    return {
        "response": response_text,
        "queryType": "symptoms",
        "confidence": confidence,
        "predictedCondition": condition,
        "processingTime": int(processing_time_ms),
        "systemUsed": "Disease Prediction",
        "timestamp": datetime.now().isoformat(),
        "session_id": get_current_session_id(),
        "conversation_turn": get_conversation_turn()
    }
```

### Example 2: RAG Response

```python
def format_rag_response(
    answer: str,
    sources: List[Dict[str, Any]],
    processing_time_ms: float
) -> Dict[str, Any]:
    """Format RAG system response"""
    
    response_text = answer  # RAG already returns formatted text
    
    # Extract source references
    source_list = []
    for source in sources:
        if 'page' in source:
            source_list.append(f"Page {source['page']} - {source.get('title', 'Medical Reference')}")
        else:
            source_list.append(source.get('title', 'Medical Reference'))
    
    return {
        "response": response_text,
        "queryType": "general",
        "sources": source_list,
        "processingTime": int(processing_time_ms),
        "systemUsed": "RAG - Medical Knowledge Base",
        "timestamp": datetime.now().isoformat(),
        "session_id": get_current_session_id(),
        "conversation_turn": get_conversation_turn()
    }
```

### Example 3: Hybrid Response

```python
def format_hybrid_response(
    ml_prediction: Dict[str, Any],
    rag_info: Dict[str, Any],
    processing_time_ms: float
) -> Dict[str, Any]:
    """Format combined ML + RAG response"""
    
    response_text = f"""## Symptom Analysis: {ml_prediction['condition']}
**Confidence Level:** {(ml_prediction['confidence'] * 100):.1f}%

---

{rag_info['response']}

---

## Summary

Based on the analysis:
• **Predicted Condition:** {ml_prediction['condition']}
• **Confidence:** {(ml_prediction['confidence'] * 100):.1f}%
• **Recommendation:** {ml_prediction.get('recommendation', 'Consult with a healthcare provider')}
"""
    
    # Combine sources
    sources = ml_prediction.get('sources', []) + rag_info.get('sources', [])
    
    return {
        "response": response_text,
        "queryType": "hybrid",
        "confidence": ml_prediction['confidence'],
        "predictedCondition": ml_prediction['condition'],
        "sources": sources,
        "processingTime": int(processing_time_ms),
        "systemUsed": "Hybrid (ML + RAG)",
        "timestamp": datetime.now().isoformat(),
        "session_id": get_current_session_id(),
        "conversation_turn": get_conversation_turn()
    }
```

## Best Practices

### 1. Clear Section Organization
```python
# Good
response = """
## Treatment Options

**Medications:**
• Medicine 1
• Medicine 2

**Self-Care:**
• Care 1
• Care 2
"""

# Avoid
response = "Treatment: medicine 1, medicine 2. Self-care: care 1, care 2"
```

### 2. Use Meaningful Headers
```python
# Good headers
"## When to Seek Medical Care"
"## Medications and Dosages"
"## Prevention Strategies"

# Avoid generic headers
"## Info"
"## Data"
"## Options"
```

### 3. Include Medical Disclaimers
```python
# Always include at end
response += """

⚠️ **Medical Disclaimer:**
This information is for educational purposes only and should not replace 
professional medical advice. Consult with qualified healthcare professionals 
for diagnosis or treatment.
"""
```

### 4. Format Numeric Data
```python
# For confidence: multiply by 100, format to 1 decimal
confidence_display = f"{confidence * 100:.1f}%"

# For processing time: keep in ms, no decimals for readability
processing_time_display = f"{int(processing_time)}ms"

# For percentages in text: always include % symbol
```

### 5. Use Consistent Emoji
```python
# Medical markers
🩺 Medical Information
💊 Medications
🏥 When to Seek Care
💡 Tips
⚠️ Warnings
✓ Recommendations
📚 Sources/References
```

## Common Response Patterns

### Pattern 1: Symptom Check Response
```python
{
    "response": "## Analysis: [Condition]\n\n[Details]",
    "queryType": "symptoms",
    "confidence": 0.85,
    "predictedCondition": "Common Cold",
    "processingTime": 1240,
    "systemUsed": "Disease Prediction"
}
```

### Pattern 2: Information Query Response
```python
{
    "response": "## [Topic]\n\n[Detailed Information]",
    "queryType": "general",
    "sources": ["Source 1", "Source 2"],
    "processingTime": 2340,
    "systemUsed": "RAG - Medical Knowledge Base"
}
```

### Pattern 3: Hybrid Response
```python
{
    "response": "## Prediction: [Condition]\n\n[ML Analysis]\n\n## Detailed Information\n\n[RAG Info]",
    "queryType": "hybrid",
    "confidence": 0.78,
    "predictedCondition": "Seasonal Allergies",
    "sources": ["RAG Source 1"],
    "processingTime": 3100,
    "systemUsed": "Hybrid (ML + RAG)"
}
```

## Testing Responses

### Test Locally
```python
# In hybrid_server.py or test file
from lib.responseFormatter import parseResponse

response = {
    "response": "## Treatment\n\n**Medication:**\n• Option 1\n• Option 2",
    "queryType": "general",
    "sources": ["Source 1"]
}

# Parse on backend to verify structure
structured = parseResponse(
    response['response'],
    response['queryType'],
    sources=response.get('sources')
)

print(f"Sections parsed: {len(structured['sections'])}")
for section in structured['sections']:
    print(f"  - {section['type']}: {section.get('title', 'N/A')}")
```

### Frontend Display
The frontend `ResponseDisplay` component will:
1. Parse the response text
2. Identify sections by markers (##, •, ⚠️, etc.)
3. Apply appropriate styling
4. Render with proper formatting

## Troubleshooting

### Issue: Response appears as plain text
**Solution:** Ensure response uses Markdown markers (##, •, **)
```python
# Bad
response = "Treatment: take medicine daily"

# Good  
response = "## Treatment\n\n• Take medicine daily"
```

### Issue: Lists not formatting properly
**Solution:** Ensure list items start with • or -
```python
# Bad
items = ["item1", "item2"]
response = f"Items: {items}"

# Good
response = "**Items:**\n"
for item in items:
    response += f"• {item}\n"
```

### Issue: Medical disclaimer not showing
**Solution:** Ensure it's in the response text, not a separate field
```python
# Disclaimer should be in the response field
response += "\n\n⚠️ **Medical Disclaimer:** ..."

# Not as a separate field in JSON
# "medicalDisclaimer": "..." # This is just metadata
```

## Integration Checklist

- [ ] Backend returns proper response structure
- [ ] Response includes section markers (##, •, etc.)
- [ ] Confidence multiplied by 100 for display
- [ ] Processing time in milliseconds
- [ ] Sources included as list
- [ ] Medical disclaimer in response text
- [ ] QueryType correctly identified
- [ ] Session ID included
- [ ] Timestamp in ISO format
- [ ] Frontend receives full response object
- [ ] ResponseDisplay component renders correctly

## Migration from Old Format

If upgrading from plain text responses:

```python
# Old
response = "The patient has a common cold..."

# New
response = """## Analysis Results

Based on symptoms: **Common Cold**

**Treatment:**
• Rest for 24-48 hours
• Stay hydrated
• Use saline drops

⚠️ Medical Disclaimer: ..."""
```

## Performance Considerations

- String formatting: ~1-2ms
- Section parsing: <1ms (frontend)
- Markdown to HTML: <5ms (frontend)
- Total overhead: Negligible

## Future Enhancements

- [ ] Support for tables in responses
- [ ] Code block formatting for complex medical data
- [ ] Image inclusion for visual medical information
- [ ] Interactive elements (expanders, tabs)
- [ ] Summary generation
- [ ] Response quality scoring
