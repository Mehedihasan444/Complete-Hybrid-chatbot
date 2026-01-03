# 📎 File Upload Functionality Setup Guide

## ✅ What's Been Implemented

### Backend (Kaggle Notebook)
1. **New Endpoint**: `/chat-with-attachments`
   - Accepts multiple file uploads (PDF, images, text files)
   - Extracts text from PDFs and documents
   - Processes images (basic handling, can be enhanced with vision models)
   - Integrates with HybridMed-AI pipeline

2. **Dependencies Added**:
   - `PyPDF2` - PDF text extraction
   - `python-multipart` - File upload handling in FastAPI

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
- ✅ **All Image Formats** (`image/*`)
- 📷 **Current**: Basic image receipt (noted in response)
- 🔮 **Future Enhancement**: Vision model integration for:
  - Skin condition analysis
  - Medical imaging interpretation
  - Visual symptom detection

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
🖼️ Received 1 image(s)

---

[AI Analysis of extracted content + user message]

---
### 🔬 HybridMed-AI Analysis
**Primary Diagnosis:** ...
**Confidence:** ...%

---
*Model: LLAMA 3.1 RAG | Processing: 2341ms*

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

### Test 2: Upload Image (X-ray, skin condition photo)
```
1. Upload medical image via 🖼️ button
2. Add description: "Rash on arm for 3 days, itchy"
3. Expect: System notes image received + analyzes text description
```

### Test 3: Multiple Files
```
1. Upload 2 PDFs + 1 image
2. Add message describing symptoms
3. Expect: All files processed, text extracted from PDFs, comprehensive analysis
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

### Vision Model Integration
```python
# Add to backend
from transformers import pipeline
vision_classifier = pipeline("image-classification", model="microsoft/biovil-t")

# In endpoint
if file_type.startswith("image/"):
    image_analysis = vision_classifier(file_content)
    image_descriptions.append(f"Detected: {image_analysis}")
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
