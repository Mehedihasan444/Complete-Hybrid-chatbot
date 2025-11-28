@echo off
REM Hybrid Medical Chatbot - Windows Setup and Launch Script
REM =========================================================

echo 🚀 Starting Hybrid Medical Chatbot Setup...

REM Set working directory
cd /d "%~dp0"

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed or not in PATH
    echo Please install Python 3.8+ and try again
    pause
    exit /b 1
)

echo ✅ Python found
python --version

REM Create virtual environment if it doesn't exist
if not exist "hybrid_env" (
    echo 📦 Creating virtual environment...
    python -m venv hybrid_env
)

REM Activate virtual environment
echo 🔧 Activating virtual environment...
call hybrid_env\Scripts\activate.bat

REM Upgrade pip
python -m pip install --upgrade pip

REM Install backend requirements
echo 📚 Installing Python dependencies...
if exist "backend_requirements.txt" (
    pip install -r backend_requirements.txt
) else (
    echo ⚠️ backend_requirements.txt not found, installing minimal dependencies...
    pip install fastapi uvicorn pandas numpy scikit-learn joblib nltk sentence-transformers
)

REM Download NLTK data
echo 📥 Downloading NLTK data...
python -c "import nltk; nltk.download('stopwords', quiet=True); nltk.download('punkt', quiet=True); nltk.download('wordnet', quiet=True); print('✅ NLTK data downloaded')"

REM Check if models exist
echo 🔍 Checking for trained models...
set DISEASE_MODELS_DIR=..\disease prediction implementation 1\models
set RAG_VECTOR_STORE=..\llm rag implementation 1\medical_chatbot\data\vector_store

if not exist "%DISEASE_MODELS_DIR%" (
    echo ⚠️ Disease prediction models not found at: %DISEASE_MODELS_DIR%
    echo Please ensure the models are trained and available
)

if not exist "%RAG_VECTOR_STORE%" (
    echo ⚠️ RAG vector store not found at: %RAG_VECTOR_STORE%
    echo Please build the RAG database first
)

REM Set environment variables
echo ⚙️ Setting up environment...
set PYTHONPATH=%PYTHONPATH%;..\disease prediction implementation 1;..\llm rag implementation 1\medical_chatbot

REM Check for Gemini API key
if "%GEMINI_API_KEY%"=="" (
    echo ⚠️ GEMINI_API_KEY not set - RAG system will run in demo mode
    echo To enable full RAG functionality, set your Gemini API key:
    echo set GEMINI_API_KEY=your_api_key_here
)

echo.
echo 🎉 Setup complete! Starting hybrid server...
echo 🌐 Server will be available at: http://127.0.0.1:8000
echo 📚 API documentation: http://127.0.0.1:8000/docs
echo.
echo Press Ctrl+C to stop the server
echo ==========================================
echo.

REM Start the hybrid server
python hybrid_server.py

pause