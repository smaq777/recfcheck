/**
 * Test the actual crossValidateReference function with the problematic papers
 */

import { crossValidateReference } from "./verification-apis.js";

const testReferences = [
  {
    bibtex_key: 'test1',
    title: 'The compliance budget: managing security behaviour in organisations',
    authors: 'Robert Beautement and M. Angela Sasse',
    year: 2008,
    source: '',
    doi: ''
  },
  {
    bibtex_key: 'test2',
    title: 'Lost in translation: Large language models in non-English content analysis',
    authors: 'Yihong Chen and Hanchen Guo',
    year: 2023,
    source: '',
    doi: ''
  },
  {
    bibtex_key: 'test3',
    title: 'Detecting Arabic SMS Scam Messages Using a Hybrid Ensemble Machine Learning Algorithms',
    authors: 'Ahmed Al-Hashedi',
    year: 2025,
    source: '',
    doi: ''
  }
];

async function testVerification() {
  console.log('\n🔬 TESTING REAL crossValidateReference FUNCTION\n');
  console.log('='.repeat(80));
  
  for (const ref of testReferences) {
    console.log(`\n📄 Testing: "${ref.title}"`);
    console.log(`   Year: ${ref.year}`);
    console.log('-'.repeat(80));
    
    try {
      const result = await crossValidateReference(ref);
      
      console.log(`\n✅ RESULT:`);
      console.log(`   Status: ${result.status}`);
      console.log(`   Confidence: ${result.confidence}%`);
      console.log(`   Verified by: ${result.verified_by?.join(', ') || 'None'}`);
      console.log(`   Issues: ${result.issues?.join(', ') || 'None'}`);
      
      if (result.canonical_title) {
        console.log(`   Canonical Title: "${result.canonical_title}"`);
        console.log(`   Canonical Year: ${result.canonical_year}`);
        console.log(`   DOI: ${result.doi || 'N/A'}`);
        console.log(`   Venue: ${result.venue || 'N/A'}`);
      }
      
      if (result.all_results) {
        console.log(`\n   📊 Individual API Results:`);
        result.all_results.forEach(apiResult => {
          console.log(`      ${apiResult.source}: ${apiResult.found ? '✅ Found' : '❌ Not Found'} (${apiResult.confidence}%)`);
        });
      }
      
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      console.error(error.stack);
    }
    
    console.log('\n' + '='.repeat(80));
  }
  
  console.log('\n✅ Testing complete!\n');
}

testVerification().catch(console.error);
