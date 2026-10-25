"""
Tests for Simulated Clock Filtering, Reranking & Credibility Scoring
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.abspath("services/api/src/retrieval"))
from reranker import rerank_search_results

class TestSearchFiltersAndReranker(unittest.TestCase):
    def setUp(self):
        self.sample_chunks = [
            {
                "chunk_id": "ORV-0001_c0",
                "doc_id": "ORV-0001",
                "score": 0.8,
                "metadata": {
                    "PUB_DATE": "2026-10-10",
                    "RELIABILITY": 1, # Official Tier 1
                    "COUNTRY": "Orvan"
                }
            },
            {
                "chunk_id": "ORV-0010_c0",
                "doc_id": "ORV-0010",
                "score": 0.9, # High raw lexical score from rumor
                "metadata": {
                    "PUB_DATE": "2026-09-15",
                    "RELIABILITY": 4, # Social Tabloid Tier 4
                    "COUNTRY": "Orvan"
                }
            },
            {
                "chunk_id": "FUTURE-0001_c0",
                "doc_id": "FUTURE-0001",
                "score": 0.95,
                "metadata": {
                    "PUB_DATE": "2027-02-01", # Published AFTER as-of date (clock violation)
                    "RELIABILITY": 1,
                    "COUNTRY": "Midgard"
                }
            }
        ]

    def test_clock_violation_filter(self):
        """Ensures documents published after 2027-01-25 are strictly excluded."""
        results = rerank_search_results(
            query="grain trade",
            chunks=self.sample_chunks,
            as_of_date="2027-01-25",
            top_k=10
        )
        doc_ids = [r["doc_id"] for r in results]
        self.assertNotIn("FUTURE-0001", doc_ids, "Document dated after 2027-01-25 must not be retrieved")

    def test_credibility_tier_weighting(self):
        """Ensures Tier 1 official sources receive credibility boost over Tier 4 rumors."""
        results = rerank_search_results(
            query="grain trade",
            chunks=self.sample_chunks,
            as_of_date="2027-01-25",
            top_k=10
        )
        # Tier 1 with base score 0.8 * 1.25 = 1.0
        # Tier 4 with base score 0.9 * 0.65 = 0.585
        # Therefore, Tier 1 official should be ranked #1
        self.assertEqual(results[0]["doc_id"], "ORV-0001")
        self.assertTrue(results[0]["is_official"])
        self.assertTrue(results[1]["is_unverified"])

if __name__ == "__main__":
    unittest.main()
