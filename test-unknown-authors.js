/**
 * Test verification with "Unknown" authors to verify relaxed validation
 */

import { crossValidateReference } from "./verification-apis.js";

const testReferences = [
  {
    bibtex_key: 'unknown1',
    title: 'Lost in translation: Large language models in non-English content analysis',
    authors: 'Unknown',  // Testing Unknown author handling
    year: 2023,
    source: '',
    doi: ''
  },
  {
    bibtex_key: 'unknown2',
    title: 'Detecting Arabic SMS Scam Messages Using a Hybrid Ensemble Machine Learning Algorithms',
    authors: 'Unknown',  // Testing Unknown author handling
    year: 2025,
    source: '',
    doi: ''
  }
];

async function testUnknownAuthors() {
  console.log('\n🔬 TESTING VERIFICATION WITH "UNKNOWN" AUTHORS\n');
  console.log('='.repeat(80));
  
  for (const ref of testReferences) {
    console.log(`\n📄 Testing: "${ref.title.substring(0, 60)}..."`);
    console.log(`   Authors: "${ref.authors}" (should now be allowed)`);
    console.log('-'.repeat(80));
    
    try {
      const result = await crossValidateReference(ref);
      
      console.log(`\n✅ RESULT:`);
      console.log(`   Status: ${result.status}`);
      console.log(`   Confidence: ${result.confidence}%`);
      console.log(`   Verified by: ${result.verified_by?.join(', ') || 'None'}`);
      
      if (result.issues && result.issues.length > 0) {
        console.log(`   Issues:`);
        result.issues.forEach(issue => console.log(`      - ${issue}`));
      }
      
      if (result.canonical_title) {
        console.log(`   ✓ Found: "${result.canonical_title}"`);
        console.log(`   ✓ DOI: ${result.doi || 'N/A'}`);
      }
      
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
    }
    
    console.log('\n' + '='.repeat(80));
  }
  
  console.log('\n✅ Testing complete!\n');
}

testUnknownAuthors().catch(console.error);
