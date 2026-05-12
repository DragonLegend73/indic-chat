#!/bin/bash
# ==============================================================
# Indic-Chat — AI4Bharat & Model Setup Script
# Run this once to download all required models.
# ==============================================================

set -e
echo "🚀 Indic-Chat Model Setup"
echo "========================="

MODELS_DIR="./models"
mkdir -p "$MODELS_DIR"

# --- 0. Python Dependencies ---
echo ""
echo "📦 [0/5] Installing core dependencies..."
pip install -r requirements.txt || {
    echo "  ⚠️  Some dependencies failed to install."
    echo "  This is often because 'fasttext' requires a C++ compiler (gcc/g++)."
    echo "  If fasttext failed, the system will fallback to 'langdetect'."
}

# --- 1. Ollama + Gemma 4 E2B ---
echo ""
echo "📦 [1/5] Setting up Ollama + Gemma 4 E2B..."
if command -v ollama &> /dev/null; then
    echo "  ✅ Ollama is installed"
    echo "  Pulling gemma4:e2b (~2.5 GB)..."
    ollama pull gemma4:e2b || echo "  ⚠️  Failed to pull gemma4:e2b. Run 'ollama pull gemma4:e2b' manually."
else
    echo "  ❌ Ollama not found. Install from: https://ollama.com/download"
    echo "     Then run: ollama pull gemma4:e2b"
fi

# --- 2. IndicLID ---
echo ""
echo "📦 [2/5] Setting up IndicLID models..."
INDICLID_DIR="$MODELS_DIR/indiclid"
mkdir -p "$INDICLID_DIR"
if [ ! -f "$INDICLID_DIR/indiclid-ftn/model_baseline_roman.bin" ]; then
    echo "  Downloading IndicLID FastText models..."
    # Clone IndicLID repo for model download scripts
    if [ ! -d "$INDICLID_DIR/IndicLID" ]; then
        git clone --depth 1 https://github.com/AI4Bharat/IndicLID.git "$INDICLID_DIR/IndicLID" 2>/dev/null || true
    fi
    echo "  ⚠️  IndicLID models need manual download from AI4Bharat."
    echo "     See: https://github.com/AI4Bharat/IndicLID#download-indiclid-models"
    echo "     Place models in: $INDICLID_DIR/"
else
    echo "  ✅ IndicLID models found"
fi

# --- 3. IndicTrans2 (200M Distilled) ---
echo ""
echo "📦 [3/5] Pre-downloading IndicTrans2 models..."
python3 -c "
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
print('  Downloading indictrans2-indic-en-dist-200M...')
AutoTokenizer.from_pretrained('ai4bharat/indictrans2-indic-en-dist-200M', trust_remote_code=True)
AutoModelForSeq2SeqLM.from_pretrained('ai4bharat/indictrans2-indic-en-dist-200M', trust_remote_code=True)
print('  ✅ indic→en model cached')

print('  Downloading indictrans2-en-indic-dist-200M...')
AutoTokenizer.from_pretrained('ai4bharat/indictrans2-en-indic-dist-200M', trust_remote_code=True)
AutoModelForSeq2SeqLM.from_pretrained('ai4bharat/indictrans2-en-indic-dist-200M', trust_remote_code=True)
print('  ✅ en→indic model cached')
" 2>/dev/null || echo "  ⚠️  IndicTrans2 download failed. Models will download on first use."

# --- 4. Embedding Models ---
echo ""
echo "📦 [4/5] Pre-downloading embedding models..."
python3 -c "
from sentence_transformers import SentenceTransformer
print('  Downloading BAAI/bge-small-en-v1.5...')
SentenceTransformer('BAAI/bge-small-en-v1.5')
print('  ✅ bge-small-en cached')
" 2>/dev/null || echo "  ⚠️  Embedding model download failed. Will download on first use."

# --- 5. Tesseract OCR (for PDF fallback) ---
echo ""
echo "📦 [5/5] Checking Tesseract OCR..."
if command -v tesseract &> /dev/null; then
    echo "  ✅ Tesseract installed"
    # Check for Hindi language pack
    if tesseract --list-langs 2>/dev/null | grep -q "hin"; then
        echo "  ✅ Hindi language pack available"
    else
        echo "  ⚠️  Hindi pack not found. Install with: sudo apt install tesseract-ocr-hin"
    fi
else
    echo "  ⚠️  Tesseract not installed. Install with:"
    echo "     sudo apt install tesseract-ocr tesseract-ocr-hin tesseract-ocr-eng"
fi

echo ""
echo "========================="
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Ensure Ollama is running: ollama serve"
echo "  2. Place NCERT PDFs in: backend/data/pdfs/"
echo "  3. Run ingestion: python ingest.py"
echo "  4. Seed demo data: python seed_demo.py"
echo "  5. Start server: uvicorn app.main:app --reload"
