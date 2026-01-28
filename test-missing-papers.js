/**
 * Test script to check if the 7 missing papers exist in academic APIs
 * These were uploaded via direct input and still show as "not found"
 */

import axios from 'axios';

const testPapers = [
  {
    title: "Detecting SMS phishing based on Arabic text-content using deep learning",
    expectedAuthors: "Unknown", // From direct input without author data
    expectedYear: 2022 // Estimated year
  },
  {
    title: "Utilizing large language models to optimize the detection and explainability of phishing websites",
    expectedAuthors: "Unknown",
    expectedYear: 2024
  },
  {
    title: "Character-level convolutional networks for text classification",
    expectedAuthors: "Xiang Zhang",
    expectedYear: 2015
  },
  {
    title: "MADA+ TOKAN: A toolkit for Arabic tokenization, diacritization, morphological disambiguation, POS tagging, stemming and lemmatization",
    expectedAuthors: "Unknown",
    expectedYear: 2014
  },
  {
    title: "Moses: Open source toolkit for statistical machine translation",
    expectedAuthors: "Philipp Koehn",
    expectedYear: 2007
  },
  {
    title: "Language models are few-shot learners",
    expectedAuthors: "Tom Brown",
    expectedYear: 2020
  },
  {
    title: "Training language models to follow instructions with human feedback",
    expectedAuthors: "Unknown",
    expectedYear: 2022
  }
];

// Calculate title similarity (Jaccard)
function calculateSimilarity(str1, str2) {
  const words1 = new Set(str1.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(str2.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  
  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);
  
  return union.size > 0 ? (intersection.size / union.size) * 100 : 0;
}

async function testOpenAlex(title) {
  try {
    const response = await axios.get('https://api.openalex.org/works', {
      params: {
        search: title,
        per_page: 3
      },
      headers: {
        'User-Agent': 'RefCheck/1.0 (mailto:test@example.com)'
      }
    });

    if (response.data.results && response.data.results.length > 0) {
      return response.data.results.map(work => ({
        title: work.title,
        year: work.publication_year,
        authors: work.authorships?.map(a => a.author?.display_name).join(', ') || 'Unknown',
        doi: work.doi,
        similarity: calculateSimilarity(title, work.title || '')
      }));
    }
    return null;
  } catch (error) {
    console.error(`   ❌ OpenAlex error: ${error.message}`);
    return null;
  }
}

async function testCrossref(title) {
  try {
    const response = await axios.get('https://api.crossref.org/works', {
      params: {
        query: title,
        rows: 3
      },
      headers: {
        'User-Agent': 'RefCheck/1.0 (mailto:test@example.com)'
      }
    });

    if (response.data.message?.items && response.data.message.items.length > 0) {
      return response.data.message.items.map(work => ({
        title: work.title?.[0] || 'Unknown',
        year: work.published?.['date-parts']?.[0]?.[0] || 'Unknown',
        authors: work.author?.map(a => `${a.given || ''} ${a.family || ''}`).join(', ') || 'Unknown',
        doi: work.DOI,
        similarity: calculateSimilarity(title, work.title?.[0] || '')
      }));
    }
    return null;
  } catch (error) {
    console.error(`   ❌ Crossref error: ${error.message}`);
    return null;
  }
}

async function testSemanticScholar(title) {
  try {
    const response = await axios.get('https://api.semanticscholar.org/graph/v1/paper/search', {
      params: {
        query: title,
        limit: 3,
        fields: 'title,year,authors,externalIds'
      }
    });

    if (response.data.data && response.data.data.length > 0) {
      return response.data.data.map(paper => ({
        title: paper.title,
        year: paper.year,
        authors: paper.authors?.map(a => a.name).join(', ') || 'Unknown',
        doi: paper.externalIds?.DOI,
        similarity: calculateSimilarity(title, paper.title || '')
      }));
    }
    return null;
  } catch (error) {
    console.error(`   ❌ Semantic Scholar error: ${error.message}`);
    return null;
  }
}

async function runTests() {
  console.log('\n🔍 Testing 7 "Missing" Papers from Direct Input\n');
  console.log('='.repeat(80));

  for (let i = 0; i < testPapers.length; i++) {
    const paper = testPapers[i];
    console.log(`\n[${i + 1}/7] "${paper.title.substring(0, 60)}..."`);
    console.log(`Expected: Year ${paper.expectedYear}, Authors: ${paper.expectedAuthors}`);
    console.log('-'.repeat(80));

    // Test OpenAlex
    console.log('   🔍 OpenAlex...');
    const openAlexResults = await testOpenAlex(paper.title);
    if (openAlexResults && openAlexResults.length > 0) {
      const bestMatch = openAlexResults[0];
      console.log(`   ✅ FOUND: "${bestMatch.title}"`);
      console.log(`      Year: ${bestMatch.year}, Similarity: ${bestMatch.similarity.toFixed(1)}%`);
      console.log(`      Authors: ${bestMatch.authors.substring(0, 60)}...`);
      console.log(`      DOI: ${bestMatch.doi || 'N/A'}`);
    } else {
      console.log('   ❌ NOT FOUND in OpenAlex');
    }

    // Test Crossref
    console.log('   🔍 Crossref...');
    const crossrefResults = await testCrossref(paper.title);
    if (crossrefResults && crossrefResults.length > 0) {
      const bestMatch = crossrefResults[0];
      console.log(`   ✅ FOUND: "${bestMatch.title.substring(0, 60)}..."`);
      console.log(`      Year: ${bestMatch.year}, Similarity: ${bestMatch.similarity.toFixed(1)}%`);
      console.log(`      Authors: ${bestMatch.authors.substring(0, 60)}...`);
      console.log(`      DOI: ${bestMatch.doi || 'N/A'}`);
    } else {
      console.log('   ❌ NOT FOUND in Crossref');
    }

    // Test Semantic Scholar
    console.log('   🔍 Semantic Scholar...');
    const semanticResults = await testSemanticScholar(paper.title);
    if (semanticResults && semanticResults.length > 0) {
      const bestMatch = semanticResults[0];
      console.log(`   ✅ FOUND: "${bestMatch.title.substring(0, 60)}..."`);
      console.log(`      Year: ${bestMatch.year}, Similarity: ${bestMatch.similarity.toFixed(1)}%`);
      console.log(`      Authors: ${bestMatch.authors.substring(0, 60)}...`);
      console.log(`      DOI: ${bestMatch.doi || 'N/A'}`);
    } else {
      console.log('   ❌ NOT FOUND in Semantic Scholar');
    }

    // Small delay between papers to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Test complete\n');
}

runTests().catch(console.error);
