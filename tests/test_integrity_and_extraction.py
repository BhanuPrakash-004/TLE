"""
Unit and Integration Tests for Ingestion Pipeline & Corpus Integrity
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.abspath("services/api/src/ingestion"))

from integrity import verify_corpus_integrity
from extractor import extract_document
from chunker import chunk_document

class TestIngestionPipeline(unittest.TestCase):
    def setUp(self):
        self.pack_dir = "03_Ragnarok Trial of the Nine Realms/dev_pack_E5"

    def test_01_corpus_integrity_100_percent(self):
        """Verifies all 76 files match sha256 checksums."""
        res = verify_corpus_integrity(self.pack_dir)
        self.assertTrue(res["manifest_found"])
        self.assertTrue(res["hashes_found"])
        self.assertEqual(res["total_expected"], 76)
        self.assertEqual(res["verified_hashes"], 76)
        self.assertEqual(len(res["missing_files"]), 0)
        self.assertTrue(res["is_intact"])

    def test_02_pdf_extraction_with_paragraphs(self):
        """Tests extraction of PDF files preserving [P1], [P2] markers."""
        pdf_path = os.path.join(self.pack_dir, "docs", "ATL-0001.pdf")
        res = extract_document(pdf_path)
        self.assertFalse(res["is_damaged"])
        self.assertEqual(res["header_meta"].get("DOC_ID"), "ATL-0001")
        self.assertEqual(res["header_meta"].get("RELIABILITY"), 1)
        self.assertTrue(len(res["paragraphs"]) >= 2)
        self.assertTrue(res["paragraphs"][0]["marker"].startswith("P"))

    def test_03_docx_extraction(self):
        """Tests extraction of DOCX files preserving metadata."""
        docx_path = os.path.join(self.pack_dir, "docs", "ATL-0003.docx")
        res = extract_document(docx_path)
        self.assertFalse(res["is_damaged"])
        self.assertEqual(res["header_meta"].get("DOC_ID"), "ATL-0003")
        self.assertEqual(res["header_meta"].get("COUNTRY"), "Valhalla")

    def test_04_mixed_encoding_repair_orv0007(self):
        """Tests handling of ORV-0007 (UTF-8 header with UTF-16 LE BOM body)."""
        txt_path = os.path.join(self.pack_dir, "docs", "ORV-0007.txt")
        res = extract_document(txt_path)
        self.assertFalse(res["is_damaged"])
        self.assertEqual(res["header_meta"].get("DOC_ID"), "ORV-0007")
        self.assertTrue("Orvan wheat" in res["body"])

    def test_05_damaged_empty_file_handling_orv0023(self):
        """Tests graceful handling of empty 0-byte file without crashing."""
        txt_path = os.path.join(self.pack_dir, "docs", "ORV-0023.txt")
        res = extract_document(txt_path)
        self.assertTrue(res["is_damaged"])
        self.assertIn("Empty file", res["damage_reason"])

    def test_06_paragraph_aware_chunking_preserves_metadata(self):
        """Tests chunking within 512 target tokens and metadata retention."""
        paras = [
            {"marker": "P1", "text": "[P1] Paragraph 1 text about grain shipments."},
            {"marker": "P2", "text": "[P2] Paragraph 2 text about freight rates."}
        ]
        meta = {"DOC_ID": "TEST-001", "RELIABILITY": 1, "EVENT_ID": "E5"}
        chunks = chunk_document("TEST-001", paras, meta, target_tokens=100)
        self.assertEqual(len(chunks), 1)
        self.assertEqual(chunks[0]["paragraph_refs"], ["P1", "P2"])
        self.assertEqual(chunks[0]["metadata"]["DOC_ID"], "TEST-001")

if __name__ == "__main__":
    unittest.main()
