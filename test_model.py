import joblib
import os
import numpy as np
from scipy.sparse import hstack

model_path = 'production_symptom_classifier .pkl'  # Note: space before .pkl
print('=' * 60)
print('🔍 TESTING ML MODEL')
print('=' * 60)

# Check if file exists
if os.path.exists(model_path):
    print(f'✓ File found: {model_path}')
    print(f'  File size: {os.path.getsize(model_path) / 1024 / 1024:.2f} MB')
else:
    print(f'✗ File not found: {model_path}')
    exit(1)

# Load model
print('\n📦 Loading model...')
try:
    artifacts = joblib.load(model_path)
    print('✓ Model loaded successfully')
except Exception as e:
    print(f'✗ Error loading model: {e}')
    exit(1)

# Check structure
print('\n🔍 Inspecting model structure...')
print(f'Keys in artifact: {list(artifacts.keys())}')

# Check vectorizers
if 'feature_vectorizers' in artifacts:
    vectorizers = artifacts['feature_vectorizers']
    print(f'\nVectorizer keys: {list(vectorizers.keys())}')
    
    word_vec = vectorizers.get('word')
    char_vec = vectorizers.get('char')
    
    print('\n📊 Word Vectorizer:')
    print(f'  Type: {type(word_vec).__name__}')
    has_vocab = hasattr(word_vec, 'vocabulary_')
    print(f'  Has vocabulary: {has_vocab}')
    if has_vocab:
        print(f'  Vocab size: {len(word_vec.vocabulary_)}')
        print(f'  Sample words: {list(word_vec.vocabulary_.keys())[:10]}')
    
    print('\n📊 Char Vectorizer:')
    print(f'  Type: {type(char_vec).__name__}')
    has_vocab_char = hasattr(char_vec, 'vocabulary_')
    print(f'  Has vocabulary: {has_vocab_char}')
    if has_vocab_char:
        print(f'  Vocab size: {len(char_vec.vocabulary_)}')

# Check label encoder
if 'label_encoder' in artifacts:
    le = artifacts['label_encoder']
    print(f'\n🏷️  Label Encoder:')
    print(f'  Type: {type(le).__name__}')
    print(f'  Number of diseases: {len(le.classes_)}')
    print(f'  Diseases: {list(le.classes_)}')

# Check model
if 'model' in artifacts:
    model = artifacts['model']
    print(f'\n🤖 Model:')
    print(f'  Type: {type(model).__name__}')
    print(f'  Has predict_proba: {hasattr(model, "predict_proba")}')

# Check metadata
if 'metadata' in artifacts:
    meta = artifacts['metadata']
    print(f'\n📋 Metadata:')
    for key, value in meta.items():
        print(f'  {key}: {value}')

if 'performance_metrics' in artifacts:
    perf = artifacts['performance_metrics']
    print(f'\n📈 Performance:')
    for key, value in perf.items():
        print(f'  {key}: {value}')

# Test prediction
print('\n🧪 Testing Prediction...')
try:
    test_symptoms = ['headache', 'fever']
    text = ' '.join(test_symptoms).lower()
    
    # The model expects raw text strings, not transformed features
    # The pipeline handles the transformation internally
    probs = model.predict_proba([text])[0]
    top_idx = np.argsort(probs)[-3:][::-1]
    
    print(f'\nInput symptoms: {test_symptoms}')
    print('\nTop 3 predictions:')
    for i, idx in enumerate(top_idx, 1):
        disease = le.classes_[idx]
        confidence = probs[idx]
        print(f'  {i}. {disease}: {confidence:.2%}')
    
    print('\n✅ Prediction test PASSED!')
    
except Exception as e:
    print(f'\n❌ Prediction test FAILED: {e}')
    import traceback
    traceback.print_exc()

print('\n' + '=' * 60)
