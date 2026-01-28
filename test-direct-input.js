/**
 * Test exact papers from user's direct input upload
 */

import { crossValidateReference } from "./verification-apis.js";

const testReferences = [
  {
    bibtex_key: 'ref1',
    title: 'Detecting SMS phishing based on Arabic text-content using deep learning',
    authors: 'Author Name', // User didn't provide, using placeholder
    year: 2022, // Guessing year
    source: '',
    doi: ''
  },
  {
    bibtex_key: 'ref2',
    title: 'Utilizing large language models to optimize the detection and explainability of phishing websites',
    authors: 'Author Name',
    year: 2024,
    source: '',
    doi: ''
  },
  {
    bibtex_key: 'ref3',
    title: 'Character-level convolutional networks for text classification',
    authors: 'Zhang and LeCun',
    year: 2015,
    source: '',
    doi: ''
  },
  {
    bibtex_key: 'ref4',
    title: 'MADA+ TOKAN: A toolkit for Arabic tokenization, diacritization, morphological disambiguation, POS tagging, stemming and lemmatization',
    authors: 'Nizar Habash',
    year: 2010,
    source: '',
    doi: ''
  },
  {
    bibtex_key: 'ref5',
    title: 'Moses: Open source toolkit for statistical machine translation',
    authors: 'Koehn',
    year: 2007,
    source: '',
    doi: ''
  },
  {
    bibtex_key: 'ref6',
    title: 'Language models are few-shot learners',
    authors: 'Brown',
    year: 2020,
    source: '',
    doi: ''
  },
  {
    bibtex_key: 'ref7',
    title: 'Training language models to follow instructions with human feedback',
    authors: 'Ouyang',
    year: 2022,
    source: '',
    doi: ''
  }
];

async function testDirectInput() {
  console.log('\n🔬 TESTING DIRECT INPUT PAPERS\n');
  console.log('='.repeat(80));
  
  const results = [];
  
  for (const ref of testReferences) {
    console.log(`\n📄 ${ref.bibtex_key}: "${ref.title.substring(0, 60)}..."`);
    console.log(`   Year: ${ref.year} | Authors: ${ref.authors}`);
    console.log('-'.repeat(80));
    
    try {
      const result = await crossValidateReference(ref);
      
      const summary = {
        title: ref.title.substring(0, 60) + '...',
        status: result.status,
        confidence: result.confidence,
        verified_by: result.verified_by || [],
        found: result.status !== 'not_found'
      };
      
      results.push(summary);
      
      if (result.status === 'not_found') {
        console.log(`\n   ❌ NOT FOUND`);
        if (result.issues) {
          console.log(`   Reasons: ${result.issues.join(', ')}`);
        }
      } else {
        console.log(`\n   ✅ FOUND!`);
        console.log(`   Status: ${result.status}`);
        console.log(`   Confidence: ${result.confidence}%`);
        console.log(`   APIs: ${result.verified_by.join(', ')}`);
        console.log(`   Match: "${result.canonical_title?.substring(0, 60)}..."`);
        
        if (result.issues && result.issues.length > 0) {
          console.log(`\n   ⚠️ Issues detected:`);
          result.issues.forEach((issue, i) => {
            if (i < 5) console.log(`      ${i + 1}. ${issue.substring(0, 100)}`);
          });
        }
      }
      
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      results.push({
        title: ref.title.substring(0, 60) + '...',
        status: 'error',
        found: false
      });
    }
    
    console.log('\n' + '='.repeat(80));
  }
  
  // Summary
  console.log('\n📊 FINAL SUMMARY:');
  console.log('='.repeat(80));
  
  const foundCount = results.filter(r => r.found).length;
  
  console.log(`\n✅ Found: ${foundCount}/7`);
  console.log(`❌ Not Found: ${7 - foundCount}/7\n`);
  
  results.forEach((r, i) => {
    const icon = r.found ? '✅' : '❌';
    const ref = testReferences[i];
    console.log(`${icon} ${ref.bibtex_key}: ${ref.title.substring(0, 70)}`);
    if (r.found) {
      console.log(`   → Found in: ${r.verified_by.join(', ')} (${r.confidence}%)`);
    }
  });
  
  console.log('\n' + '='.repeat(80));
}

testDirectInput().catch(console.error);
