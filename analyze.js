const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));

// Find the search-related response
const searchResponses = data.filter(item => 
  item.url.includes('query') || item.url.includes('search') || item.url.includes('content')
);

console.log('=== Search-related responses ===');
searchResponses.forEach((item, i) => {
  console.log(`\nURL: ${item.url.substring(0, 200)}`);
  
  // Dump included items count
  const included = item.data?.included;
  if (included) {
    console.log(`  Included items: ${included.length}`);
    // Show first few types
    const types = [...new Set(included.map(inc => inc['$type']).filter(Boolean))];
    console.log(`  Types: ${types.join(', ')}`);
  }
  
  // Check data.data for elements
  const elements = item.data?.data?.elements || item.data?.data?.['*elements'];
  if (elements) {
    console.log(`  Elements: ${elements.length}`);
    if (elements.length > 0) {
      console.log(`  First element: ${JSON.stringify(elements[0]).substring(0, 300)}`);
    }
  }
});

// Also search for any text that looks like a post
console.log('\n\n=== Deep search for post-like text ===');
const allText = JSON.stringify(data);
const patterns = ['hiring', 'developer', 'looking for', 'contract', 'position', 'role'];
patterns.forEach(p => {
  const idx = allText.toLowerCase().indexOf(p);
  if (idx >= 0) {
    console.log(`Found "${p}" at char ${idx}: ...${allText.substring(idx, idx + 100)}...`);
  } else {
    console.log(`"${p}" NOT found in data`);
  }
});
