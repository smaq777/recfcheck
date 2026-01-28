/**
 * Search for famous papers with exact titles to find correct metadata
 */

async function searchPaper(title, expectedYear) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Searching: "${title}"`);
  console.log(`Your year: ${expectedYear}`);
  console.log('-'.repeat(80));
  
  // OpenAlex
  const openAlexUrl = `https://api.openalex.org/works?search=${encodeURIComponent(title)}`;
  const oaRes = await fetch(openAlexUrl);
  const oaData = await oaRes.json();
  
  if (oaData.results && oaData.results.length > 0) {
    const match = oaData.results[0];
    console.log(`\n✅ OpenAlex:`);
    console.log(`   Title: "${match.display_name}"`);
    console.log(`   Year: ${match.publication_year} ${match.publication_year === expectedYear ? '✓' : `❌ (you have ${expectedYear})`}`);
    console.log(`   DOI: ${match.doi || 'N/A'}`);
    console.log(`   Type: ${match.type}`);
    console.log(`   Authors: ${match.authorships?.slice(0, 3).map(a => a.author.display_name).join(', ')}`);
  } else {
    console.log(`\n❌ OpenAlex: Not found`);
  }
  
  // Crossref
  const crossrefUrl = `https://api.crossref.org/works?query.title=${encodeURIComponent(title)}&rows=1`;
  const crRes = await fetch(crossrefUrl);
  const crData = await crRes.json();
  
  if (crData.message.items && crData.message.items.length > 0) {
    const match = crData.message.items[0];
    console.log(`\n✅ Crossref:`);
    console.log(`   Title: "${match.title[0]}"`);
    const year = match.published?.['date-parts']?.[0]?.[0];
    console.log(`   Year: ${year} ${year === expectedYear ? '✓' : `❌ (you have ${expectedYear})`}`);
    console.log(`   DOI: ${match.DOI}`);
  } else {
    console.log(`\n❌ Crossref: Not found`);
  }
}

const papers = [
  ['Character-level convolutional networks for text classification', 2015],
  ['Moses: Open source toolkit for statistical machine translation', 2007],
  ['BERT: Pre-training of deep bidirectional transformers for language understanding', 2019],
  ['Language models are few-shot learners', 2020],
  ['Training language models to follow instructions with human feedback', 2022],
  ['The compliance budget: Managing security behaviour in organisations', 2009],
  ['Detecting SMS phishing based on Arabic text-content using deep learning', 2022]
];

async function run() {
  console.log('\n🔍 SEARCHING FOR CORRECT METADATA OF FAMOUS PAPERS\n');
  
  for (const [title, year] of papers) {
    await searchPaper(title, year);
  }
  
  console.log(`\n${'='.repeat(80)}`);
  console.log('\n✅ Search complete!\n');
}

run().catch(console.error);
