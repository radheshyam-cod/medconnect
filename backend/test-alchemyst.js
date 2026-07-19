/**
 * Live integration test for Alchemyst AI API (JavaScript version).
 *
 * Usage:
 *   ALCHEMYST_API_KEY="sk-..." node backend/test-alchemyst.js
 *
 * This script makes two real API calls:
 *   1. POST /api/v1/context/search — to verify the search/retrieval endpoint works
 *   2. POST /api/v1/context/add — to verify the write endpoint works
 *   3. Re-search to verify round-trip
 */

const ALCHEMYST_BASE_URL = 'https://platform-backend.getalchemystai.com';
const SEARCH_PATH = '/api/v1/context/search';
const ADD_PATH = '/api/v1/context/add';

async function main() {
  const apiKey = process.env.ALCHEMYST_API_KEY;
  if (!apiKey) {
    console.error('❌ ALCHEMYST_API_KEY environment variable is required.');
    console.error('   Usage: ALCHEMYST_API_KEY="sk-..." node backend/test-alchemyst.js');
    process.exit(1);
  }

  const maskedKey = apiKey.length > 8
    ? apiKey.slice(0, 4) + '...' + apiKey.slice(-4)
    : '***';
  console.log(`\n🔑 Using Alchemyst API key: ${maskedKey}`);
  console.log(`🌐 Base URL: ${ALCHEMYST_BASE_URL}\n`);

  // ── Test 1: Search ─────────────────────────────────────────────
  console.log('═'.repeat(60));
  console.log('📡 TEST 1: POST /api/v1/context/search');
  console.log('═'.repeat(60));

  const queryText = 'patient medical history health conditions medications';

  try {
    const searchStart = Date.now();
    const searchResponse = await fetch(
      `${ALCHEMYST_BASE_URL}${SEARCH_PATH}?metadata=true&mode=standard`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: queryText,
          similarity_threshold: 0.8,
          minimum_similarity_threshold: 0.5,
          scope: 'internal',
        }),
      },
    );
    const searchLatency = Date.now() - searchStart;

    console.log(`⏱️  Latency: ${searchLatency}ms`);
    console.log(`📋 Status: ${searchResponse.status} ${searchResponse.statusText}`);

    const searchBody = await searchResponse.text();

    if (!searchResponse.ok) {
      console.log(`❌ Search failed: ${searchBody.slice(0, 500)}`);
    } else {
      const parsed = JSON.parse(searchBody);
      const contexts = parsed.contexts || [];
      console.log(`✅ Search succeeded! Found ${contexts.length} context items.`);

      if (contexts.length > 0) {
        console.log('\n📄 First 3 results:');
        for (let i = 0; i < Math.min(3, contexts.length); i++) {
          const c = contexts[i];
          console.log(`\n  --- Result ${i + 1} ---`);
          console.log(`  Score:     ${c.score}`);
          console.log(`  Created:   ${c.createdAt}`);
          console.log(`  Content:   ${(c.content || '').slice(0, 200)}${c.content && c.content.length > 200 ? '...' : ''}`);
          if (c.metadata && Object.keys(c.metadata).length > 0) {
            console.log(`  Metadata:  ${JSON.stringify(c.metadata).slice(0, 200)}`);
          }
        }
      } else {
        console.log('\nℹ️  No context items found. This is normal if no data has been added yet.');
        console.log('   The add test (Test 2) will verify write capability, then');
        console.log('   rerunning Test 1 should find the new data.');
      }
    }

    // ── Test 2: Add context ──────────────────────────────────────
    console.log('\n' + '═'.repeat(60));
    console.log('📡 TEST 2: POST /api/v1/context/add');
    console.log('═'.repeat(60));

    const testContent = {
      _type: 'medication',
      name: 'Test Medication - Alchemyst Verification',
      dosage: '10mg',
      frequency: 'Once daily',
      isActive: true,
      testTimestamp: new Date().toISOString(),
    };

    const addStart = Date.now();
    const addResponse = await fetch(`${ALCHEMYST_BASE_URL}${ADD_PATH}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        documents: [{ content: JSON.stringify(testContent) }],
        source: 'medconnect-alchemyst-test',
        context_type: 'resource',
        scope: 'internal',
        metadata: {
          fileName: 'alchemyst-test.json',
          fileType: 'application/json',
          groupName: ['medconnect', 'test'],
          lastModified: new Date().toISOString(),
          fileSize: 256,
        },
      }),
    });
    const addLatency = Date.now() - addStart;

    console.log(`⏱️  Latency: ${addLatency}ms`);
    console.log(`📋 Status: ${addResponse.status} ${addResponse.statusText}`);

    const addBody = await addResponse.text();
    if (!addResponse.ok) {
      console.log(`❌ Add failed: ${addBody.slice(0, 500)}`);
      console.log('\n❌ PHASE 3 VERIFICATION: FAILED — Alchemyst add API did not accept data.');
    } else {
      console.log(`✅ Add succeeded! Response: ${addBody.slice(0, 300)}`);

      // ── Test 3: Re-search to verify the added data is findable ──
      console.log('\n' + '═'.repeat(60));
      console.log('📡 TEST 3: Re-search (verify written data is retrievable)');
      console.log('═'.repeat(60));

      const reSearchStart = Date.now();
      const reSearchResponse = await fetch(
        `${ALCHEMYST_BASE_URL}${SEARCH_PATH}?metadata=true&mode=standard`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: 'Test Medication Alchemyst Verification',
            similarity_threshold: 0.8,
            minimum_similarity_threshold: 0.5,
            scope: 'internal',
          }),
        },
      );
      const reSearchLatency = Date.now() - reSearchStart;

      console.log(`⏱️  Latency: ${reSearchLatency}ms`);
      const reSearchBody = await reSearchResponse.json();
      const reContexts = reSearchBody.contexts || [];

      const foundTestData = reContexts.some(
        (c) => c.content && c.content.includes('Test Medication - Alchemyst Verification'),
      );

      if (foundTestData) {
        console.log('✅ Alchemyst WRITE → READ round-trip verified!');
        console.log(`   Found ${reContexts.length} results, including our test data.`);
        console.log('\n✅✅✅ PHASE 3 VERIFICATION: PASSED — Alchemyst API is functioning correctly.');
      } else {
        console.log(`⚠️  Re-search returned ${reContexts.length} results but test data not found.`);
        console.log('   (This can happen if ingestion is async. The add returned success.)');
        console.log('\n⚠️  PHASE 3 VERIFICATION: PARTIAL — Add succeeded but data not immediately retrievable.');
        if (reContexts.length > 0) {
          console.log('\n📄 Results found from re-search (might be pre-existing context):');
          for (let i = 0; i < Math.min(2, reContexts.length); i++) {
            console.log(`  [${i + 1}] Score=${reContexts[i].score} Content=${(reContexts[i].content || '').slice(0, 150)}`);
          }
        }
      }
    }
  } catch (error) {
    console.error(`\n❌ PHASE 3 VERIFICATION: FAILED — Exception: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.log('   (This may be a network connectivity issue — check your internet connection.)');
    }
    process.exit(1);
  }
}

main().catch(console.error);

// Also delete the .ts version to avoid confusion
