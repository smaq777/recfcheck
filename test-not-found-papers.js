/**
 * Test specific papers reported as "not found"
 */

import { crossValidateReference } from "./verification-apis.js";

const testReferences = [
  {
    bibtex_key: 'ref1',
    title: 'Detecting SMS phishing based on Arabic text-content using deep learning',
    authors: 'Al-Hashedi and others',
    year: 2025, // CORRECTED from 2022
    source: '',
    doi: '10.14569/ijacsa.2025.0160138' // ADDED
  },
  {
    bibtex_key: 'ref2',
    title: 'Character-level convolutional networks for text classification',
    authors: 'Zhang, Xiang and LeCun, Yann',
    year: 2015,
    source: '',
    doi: '10.48550/arxiv.1509.01626' // ADDED
  },
  {
    bibtex_key: 'ref3',
    title: 'Moses: Open source toolkit for statistical machine translation',
    authors: 'Koehn, Philipp and others',
    year: 2007,
    source: '',
    doi: '' // No DOI for this older paper
  },
  {
    bibtex_key: 'ref4',
    title: 'BERT: Pre-training of deep bidirectional transformers for language understanding',
    authors: 'Devlin, Jacob and others',
    year: 2019,
    source: '',
    doi: '10.18653/v1/N19-1423' // ADDED
  },
  {
    bibtex_key: 'ref5',
    title: 'Language models are few-shot learners',
    authors: 'Brown, Tom and others',
    year: 2020,
    source: '',
    doi: '10.48550/arxiv.2005.14165' // ADDED
  },
  {
    bibtex_key: 'ref6',
    title: 'Training language models to follow instructions with human feedback',
    authors: 'Ouyang, Long and others',
    year: 2022,
    source: '',
    doi: '10.48550/arxiv.2203.02155' // ADDED
  },
  {
    bibtex_key: 'ref7',
    title: 'The compliance budget: Managing security behaviour in organisations',
    authors: 'Beautement, Adam and Sasse, M Angela',
    year: 2008, // CORRECTED from 2009
    source: '',
    doi: '10.1145/1595676.1595684' // ADDED
  }
];

async function testPapers() {
  console.log('\n🔬 TESTING REPORTED "NOT FOUND" PAPERS\n');
  console.log('='.repeat(80));
  
  const results = [];
  
  for (const ref of testReferences) {
    console.log(`\n📄 ${ref.bibtex_key}: "${ref.title}"`);
    console.log(`   Year: ${ref.year}`);
    console.log('-'.repeat(80));
    
    try {
      const result = await crossValidateReference(ref);
      
      const summary = {
        title: ref.title.substring(0, 50) + '...',
        status: result.status,
        confidence: result.confidence,
        verified_by: result.verified_by?.join(', ') || 'None',
        found: result.status !== 'not_found',
        doi: result.doi || 'N/A',
        canonical: result.canonical_title || 'N/A'
      };
      
      results.push(summary);
      
      if (result.status === 'not_found') {
        console.log(`\n   ❌ NOT FOUND in any API`);
      } else {
        console.log(`\n   ✅ FOUND!`);
        console.log(`   Status: ${result.status}`);
        console.log(`   Confidence: ${result.confidence}%`);
        console.log(`   Verified by: ${result.verified_by?.join(', ')}`);
        console.log(`   Canonical: "${result.canonical_title}"`);
        console.log(`   DOI: ${result.doi || 'N/A'}`);
        
        if (result.issues && result.issues.length > 0) {
          console.log(`   Issues:`);
          result.issues.slice(0, 3).forEach(issue => {
            console.log(`      - ${issue.substring(0, 100)}`);
          });
        }
      }
      
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      results.push({
        title: ref.title.substring(0, 50) + '...',
        status: 'error',
        found: false,
        error: error.message
      });
    }
    
    console.log('\n' + '='.repeat(80));
  }
  
  // Summary
  console.log('\n📊 SUMMARY:');
  console.log('='.repeat(80));
  
  const foundCount = results.filter(r => r.found).length;
  const notFoundCount = results.filter(r => !r.found).length;
  
  console.log(`\n✅ Found: ${foundCount}/${results.length}`);
  console.log(`❌ Not Found: ${notFoundCount}/${results.length}\n`);
  
  results.forEach((r, i) => {
    const icon = r.found ? '✅' : '❌';
    console.log(`${icon} ${testReferences[i].bibtex_key}: ${r.title}`);
    if (r.found) {
      console.log(`      Found in: ${r.verified_by} (${r.confidence}% confidence)`);
    }
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('\n✅ Testing complete!\n');
}

testPapers().catch(console.error);
