"""
Ingest CLI — Process NCERT PDFs into ChromaDB.
Usage: python ingest.py --dir ./data/pdfs --subject math --language eng
"""

import argparse
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))


def main():
    parser = argparse.ArgumentParser(description="Ingest NCERT PDFs into ChromaDB")
    parser.add_argument("--dir", required=True, help="Directory containing PDF files")
    parser.add_argument("--subject", required=True, choices=["math", "science", "english"], help="Subject")
    parser.add_argument("--language", default="eng", help="Language (eng, hin, etc.)")
    args = parser.parse_args()

    from app.services.ingestion import get_ingestion_service

    ingestion = get_ingestion_service()
    total = ingestion.ingest_directory(args.dir, args.subject, args.language)
    print(f"\n✅ Ingested {total} chunks from {args.dir} (subject={args.subject})")


if __name__ == "__main__":
    main()
