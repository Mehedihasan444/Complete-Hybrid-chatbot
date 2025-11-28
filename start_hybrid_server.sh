#!/bin/bash

# Hybrid Medical Chatbot - Setup and Launch Script
# ================================================

echo "🚀 Starting Hybrid Medical Chatbot Setup..."

# Set working directory
cd "$(dirname "$0")"

# Check if Python is available
if ! command -v python &> /dev/null; then
    echo "❌ Python is not installed or not in PATH"
    echo "Please install Python 3.8+ and try again"
    exit 1
fi

echo "✅ Python found: $(python --version)"

# Create virtual environment if it doesn't exist
if [ ! -d "hybrid_env" ]; then
    echo "📦 Creating virtual environment..."
    python -m venv hybrid_env
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    # Windows
    source hybrid_env/Scripts/activate
else
    # Linux/Mac
    source hybrid_env/bin/activate
fi

# Upgrade pip
python -m pip install --upgrade pip

# Install backend requirements
echo "📚 Installing Python dependencies..."
if [ -f "backend_requirements.txt" ]; then
    pip install -r backend_requirements.txt
else
    echo "⚠️ backend_requirements.txt not found, installing minimal dependencies..."
    pip install fastapi uvicorn pandas numpy scikit-learn joblib nltk sentence-transformers
fi

# Download NLTK data
echo "📥 Downloading NLTK data..."
python -c "
import nltk
try:
    nltk.download('stopwords', quiet=True)
    nltk.download('punkt', quiet=True)
    nltk.download('wordnet', quiet=True)
    print('✅ NLTK data downloaded successfully')
except Exception as e:
    print(f'⚠️ NLTK download warning: {e}')
"

# Check if models exist
echo "🔍 Checking for trained models..."
DISEASE_MODELS_DIR="../disease prediction implementation 1/models"
RAG_VECTOR_STORE="../llm rag implementation 1/medical_chatbot/data/vector_store"

if [ ! -d "$DISEASE_MODELS_DIR" ]; then
    echo "⚠️ Disease prediction models not found at: $DISEASE_MODELS_DIR"
    echo "Please ensure the models are trained and available"
fi

if [ ! -d "$RAG_VECTOR_STORE" ]; then
    echo "⚠️ RAG vector store not found at: $RAG_VECTOR_STORE"
    echo "Please build the RAG database first using:"
    echo "cd '../llm rag implementation 1/medical_chatbot' && python build_database.py"
fi

# Set environment variables
echo "⚙️ Setting up environment..."
export PYTHONPATH="$PYTHONPATH:../disease prediction implementation 1:../llm rag implementation 1/medical_chatbot"

# Check for Gemini API key
if [ -z "$GEMINI_API_KEY" ]; then
    echo "⚠️ GEMINI_API_KEY not set - RAG system will run in demo mode"
    echo "To enable full RAG functionality, set your Gemini API key:"
    echo "export GEMINI_API_KEY=your_api_key_here"
fi

echo ""
echo "🎉 Setup complete! Starting hybrid server..."
echo "🌐 Server will be available at: http://127.0.0.1:8000"
echo "📚 API documentation: http://127.0.0.1:8000/docs"
echo ""
echo "Press Ctrl+C to stop the server"
echo "=========================================="

# Start the hybrid server
python hybrid_server.py