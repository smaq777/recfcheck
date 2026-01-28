/**
 * Test specific papers against OpenAlex and Crossref APIs
 */

const titles = [
  'The compliance budget: managing security behaviour in organisations',
  'Lost in translation: Large language models in non-English content analysis',
  'Detecting Arabic SMS Scam Messages Using a Hybrid Ensemble Machine Learning Algorithms'
];

async function testOpenAlex(title) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Testing: ${title}`);
  console.log('='.repeat(80));
  
  // Test 1: Exact title
  let url = `https://api.openalex.org/works?search=${encodeURIComponent(title)}`;
  console.log('\n[OpenAlex] Exact title search:');
  let res = await fetch(url);
  let data = await res.json();
  console.log(`  Results found: ${data.meta.count}`);
  
  if (data.results && data.results.length > 0) {
    const match = data.results[0];
    console.log(`  ✓ Top match: "${match.display_name}"`);
    console.log(`  Year: ${match.publication_year}`);
    console.log(`  DOI: ${match.doi || 'N/A'}`);
    console.log(`  Type: ${match.type}`);
    console.log(`  Is retracted: ${match.is_retracted}`);
    console.log(`  Open Access: ${match.open_access?.is_oa ? 'Yes' : 'No'}`);
    
    // Calculate similarity
    const similarity = calculateSimilarity(title, match.display_name);
    console.log(`  Title similarity: ${similarity}%`);
  } else {
    console.log('  ❌ No results');
  }
  
  // Test 2: Normalized (remove colons, special chars)
  const normalized = title
    .replace(/[:()\[\]{}`"'``]/g, ' ')
    .replace(/\b(a|an|the|of|for|in|on|at|to|with|by|from|and|or|using|based)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
    
  if (normalized !== title) {
    url = `https://api.openalex.org/works?search=${encodeURIComponent(normalized)}`;
    console.log(`\n[OpenAlex] Normalized search: "${normalized}"`);
    res = await fetch(url);
    data = await res.json();
    console.log(`  Results found: ${data.meta.count}`);
    
    if (data.results && data.results.length > 0) {
      console.log(`  ✓ Top match: "${data.results[0].display_name}"`);
      console.log(`  Year: ${data.results[0].publication_year}`);
    }
  }
}

async function testCrossref(title) {
  const url = `https://api.crossref.org/works?query.title=${encodeURIComponent(title)}&rows=3`;
  console.log('\n[Crossref] Title search:');
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    const items = data.message.items;
    
    console.log(`  Results found: ${items.length}`);
    
    if (items && items.length > 0) {
      const match = items[0];
      console.log(`  ✓ Top match: "${match.title[0]}"`);
      console.log(`  Year: ${match.published?.['date-parts']?.[0]?.[0] || 'N/A'}`);
      console.log(`  DOI: ${match.DOI}`);
      console.log(`  Type: ${match.type}`);
      
      const similarity = calculateSimilarity(title, match.title[0]);
      console.log(`  Title similarity: ${similarity}%`);
    } else {
      console.log('  ❌ No results');
    }
  } catch (e) {
    console.log(`  ❌ Error: ${e.message}`);
  }
}

async function testSemanticScholar(title) {
  const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(title)}&fields=title,year,doi,publicationTypes,isOpenAccess`;
  console.log('\n[Semantic Scholar] Title search:');
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    
    console.log(`  Results found: ${data.total || 0}`);
    
    if (data.data && data.data.length > 0) {
      const match = data.data[0];
      console.log(`  ✓ Top match: "${match.title}"`);
      console.log(`  Year: ${match.year || 'N/A'}`);
      console.log(`  DOI: ${match.doi || 'N/A'}`);
      console.log(`  Paper ID: ${match.paperId}`);
      
      const similarity = calculateSimilarity(title, match.title);
      console.log(`  Title similarity: ${similarity}%`);
    } else {
      console.log('  ❌ No results');
    }
  } catch (e) {
    console.log(`  ❌ Error: ${e.message}`);
  }
}

function calculateSimilarity(str1, str2) {
  const s1 = str1.toLowerCase().replace(/[^a-z0-9]/g, '');
  const s2 = str2.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  let matches = 0;
  const words1 = str1.toLowerCase().split(/\s+/);
  const words2 = str2.toLowerCase().split(/\s+/);
  
  for (const word of words1) {
    if (word.length > 3 && words2.some(w => w.includes(word) || word.includes(w))) {
      matches++;
    }
  }
  
  return Math.round((matches / words1.length) * 100);
}

async function runTests() {
  console.log('\n🔍 TESTING PAPERS AGAINST ACADEMIC APIs\n');
  
  for (const title of titles) {
    try {
      await testOpenAlex(title);
      await testCrossref(title);
      await testSemanticScholar(title);
      console.log('\n');
    } catch (e) {
      console.error('❌ Error testing paper:', e.message);
    }
  }
  
  console.log('\n✅ Testing complete!\n');
}

runTests().catch(console.error);
