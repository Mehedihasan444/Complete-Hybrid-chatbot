# 📎 File Upload Functionality Setup Guide

## ✅ What's Been Implemented

### Backend (Kaggle Notebook)
1. **New Endpoint**: `/chat-with-attachments`
   - Accepts multiple file uploads (PDF, images, text files)
   - Extracts text from PDFs and documents
   - Analyzes medical images using **Groq LLAMA 3.2 Vision** (11B model)
   - Integrates with HybridMed-AI pipeline

2. **Dependencies Added**:
   - `PyPDF2` - PDF text extraction
   - `python-multipart` - File upload handling in FastAPI
   - Vision analysis via Groq API (no additional dependencies needed)

### Frontend (Next.js)
1. **ChatInput Component** - Already has:
   - ✅ File upload UI (document & image buttons)
   - ✅ Attachment previews
   - ✅ File validation (10MB limit)
   - ✅ Multiple file support

2. **Updated `chatService.ts`**:
   - ✅ `generateBotResponseWithAttachments()` sends files to backend
   - ✅ FormData creation for multipart upload
   - ✅ Proper ngrok header bypass
   - ✅ Response formatting with attachment info

---

## 🚀 How to Make It Work

### Step 1: Update Kaggle Notebook

1. **Run Cell 1** (Install Dependencies):
   ```python
   !pip install -q fastapi uvicorn pyngrok groq sentence-transformers faiss-cpu scikit-learn imbalanced-learn transformers accelerate bitsandbytes torch PyPDF2 python-multipart
   ```

2. **Upload the Corrected ML Model**:
   - Rename your local file: `production_symptom_classifier .pkl` → `production_symptom_classifier.pkl` (remove space)
   - Upload to Kaggle notebook working directory

3. **Run Updated Cells**:
   - Cell 4 (`ml_model.py`) - Updated to pass raw text to StackingClassifier
   - New cell (before last) - File upload endpoint `/chat-with-attachments`

4. **Restart the Server** (Last cell):
   - Stop the current FastAPI server
   - Re-run the last cell to start with updated code
   - Copy the new ngrok URL

### Step 2: Update Frontend Configuration

1. **Create `.env.local` file** (copy from `.env.local.example`):
   ```bash
   NEXT_PUBLIC_BACKEND_URL=https://your-new-ngrok-url.ngrok-free.dev
   ```

2. **Update with your actual ngrok URL** from Kaggle:
   - Replace `https://your-new-ngrok-url.ngrok-free.dev` with actual URL

3. **Restart Next.js dev server**:
   ```bash
   npm run dev
   ```

---

## 📋 Supported File Types

### Documents (Text Extraction)
- ✅ **PDF** (`.pdf`) - Extracts all text content
- ✅ **Text Files** (`.txt`, `.csv`, `.json`) - Reads full content
- ✅ **Word Documents** (`.doc`, `.docx`) - Supported via PDF conversion

### Images
- ✅ **All Image Formats** (`image/*`) - JPG, PNG, BMP, etc.
- 🔬 **AI Vision Analysis**: Powered by **Groq LLAMA 3.2 Vision (11B)**
  - Detailed visual assessment of medical images
  - Identifies skin conditions, rashes, lesions, wounds
  - Differential diagnosis suggestions based on visual features
  - Severity assessment (mild, moderate, severe)
  - Urgency recommendations
- 📋 **Analysis includes**:
  - Visual characteristics (colors, patterns, textures)
  - Possible medical conditions
  - Recommended next steps
  - Professional medical evaluation reminders

### File Size Limits
- **Frontend**: 10MB per file
- **Backend**: Can be configured (currently unlimited)

---

## 🎯 Usage Flow

### User Uploads Files:

1. **Click attachment button** in chat input (📎 documents, 🖼️ images)
2. **Select files** from computer
3. **Preview appears** showing attached files
4. **Type optional message** describing the files/symptoms
5. **Press Send** ✈️

### Backend Processing:

```
File Upload → Extract Text (PDF/Docs) → 
Combine with User Message → 
HybridMed-AI Analysis (LLAMA 3.1) → 
ML/DL Prediction (if symptoms) → 
RAG Context Retrieval → 
Response Generation
```

### User Receives:

```markdown
### 📎 Attachments Processed
✅ **2 file(s)** uploaded successfully
📄 Extracted text from 1 document(s)
🖼️ Analyzed 1 image(s) with LLAMA 3.2 Vision

---

📸 **Visual Analysis** (LLAMA 3.2 Vision)

Based on the image provided, I observe:
- Reddish, raised skin lesions with irregular borders
- Possible inflammatory response
- Severity: Moderate

Possible conditions:
1. Contact dermatitis
2. Eczema (atopic dermatitis)
3. Urticaria (hives)

Recommendation: Consult a dermatologist within 24-48 hours, especially if symptoms worsen or spread.

⚠️ Image Analysis Disclaimer: This is an AI-based visual assessment and should not replace professional medical diagnosis.

---

[AI Analysis of extracted content + user message]

---
### 🔬 HybridMed-AI Analysis
**Primary Diagnosis:** ...
**Confidence:** ...%

---
*Model: LLAMA 3.1 RAG + Vision | Processing: 3127ms*

⚠️ **Medical Disclaimer:** ...
```

---

## 🧪 Testing the Feature

### Test 1: Upload PDF with Medical Report
```
1. Create a test PDF with symptoms: "Patient has fever, headache, body aches"
2. Upload via 📎 button
3. Add message: "What could this be?"
4. Expect: System extracts PDF text + analyzes symptoms → suggests Flu/Common Cold
```

### Test 2: Upload Medical Image
```
1. Take/upload a photo of a skin condition, rash, wound, or injury
2. Upload via 🖼️ button
3. Add context: "Appeared 3 days ago, itchy and spreading"
4. Expect: 
   - LLAMA 3.2 Vision analyzes visual characteristics
   - Provides differential diagnoses
   - Assesses severity
   - Recommends urgency of medical consultation
```

### Test 3: Multiple Files with Vision
```
1. Upload 1 PDF (medical report) + 1 image (skin condition)
2. Add message: "Please analyze both my lab results and this rash"
3. Expect: 
   - PDF text extracted and analyzed
   - Image visually analyzed with LLAMA 3.2 Vision
   - Comprehensive response correlating both sources
```

---

## 🔧 Troubleshooting

### Issue: "Failed to upload files"
**Solution**:
- Check backend URL in `.env.local`
- Verify Kaggle server is running
- Check browser console for CORS errors
- Ensure ngrok URL is correct and active

### Issue: "File too large"
**Solution**:
- Reduce file size (max 10MB)
- Compress PDFs
- Resize images

### Issue: "PDF text extraction failed"
**Solution**:
- Ensure PDF is text-based (not scanned image)
- Use OCR for scanned documents (future enhancement)
- Check PDF isn't password-protected

### Issue: Backend Error 500
**Solution**:
- Check Kaggle logs for errors
- Verify `PyPDF2` and `python-multipart` installed
- Ensure file endpoint cell was executed
- Restart FastAPI server

---

## 🚀 Future Enhancements

### Enhanced Vision Capabilities
```python
# Multi-modal analysis combining text + vision
def correlate_symptoms_with_image(text_symptoms, visual_analysis):
    # Cross-reference visual findings with reported symptoms
    # Identify discrepancies or confirmations
    pass
```

### OCR for Scanned Documents
```python
from PIL import Image
import pytesseract

# Extract text from scanned PDFs/images
text = pytesseract.image_to_string(Image.open(io.BytesIO(file_content)))
```

### Medical Report Parsing
```python
# Structure extraction from medical reports
def parse_medical_report(text):
    sections = {
        "symptoms": extract_symptoms(text),
        "vitals": extract_vitals(text),
        "diagnoses": extract_diagnoses(text)
    }
    return sections
```

---

## ✅ Checklist for Activation

- [ ] Update Kaggle cell 1 with new dependencies
- [ ] Upload corrected ML model (no space in filename)
- [ ] Run cell 4 (updated `ml_model.py`)
- [ ] Run new file upload endpoint cell
- [ ] Restart Kaggle FastAPI server
- [ ] Copy new ngrok URL
- [ ] Create `.env.local` with backend URL
- [ ] Restart Next.js dev server (`npm run dev`)
- [ ] Test with sample PDF/image upload
- [ ] Verify text extraction in response
- [ ] Check ML predictions for symptom files

---

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Check Kaggle notebook output for backend errors  
3. Verify file upload endpoint is running (`/chat-with-attachments`)
4. Test backend directly: `curl -F "files=@test.pdf" -F "message=test" https://your-ngrok-url/chat-with-attachments`

**Your file upload feature is ready! 🎉**
