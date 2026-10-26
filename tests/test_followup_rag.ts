import { retrieveDynamicContext } from '../services/api/src/ai/dynamicRetriever';
import fs from 'fs';
import path from 'path';

async function testRetrievalDocTarget() {
  console.log('--- Testing Targeted Document Retrieval for "what is ORV-0012:P2" ---');
  const chunksPath = path.resolve('03_Ragnarok Trial of the Nine Realms/dev_pack_E5/ingested_output/chunks_with_embeddings.json');
  const chunks = JSON.parse(fs.readFileSync(chunksPath, 'utf-8'));

  const result = retrieveDynamicContext('what is ORV-0012:P2', chunks, '2027-01-25', 5);

  console.log('Result Top Chunks count:', result.topChunks.length);
  console.log('Top Doc ID:', result.topChunks[0]?.docId);
  console.log('Cited Doc IDs:', result.citedDocIds);

  if (result.topChunks[0]?.docId === 'ORV-0012') {
    console.log('✅ PASS: ORV-0012 is ranked #1 for query "what is ORV-0012:P2"!');
  } else {
    console.error('❌ FAIL: ORV-0012 was not ranked #1! Top was:', result.topChunks[0]?.docId);
    process.exit(1);
  }
}

testRetrievalDocTarget().catch(err => {
  console.error(err);
  process.exit(1);
});
