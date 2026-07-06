const fs = require('fs');

const html = fs.readFileSync('full-page.html', 'utf8');

// Find all <code>...</code> blocks
const codeRegex = /<code[^>]*>(.*?)<\/code>/gs;
let match;
let posts = [];
let count = 0;

while ((match = codeRegex.exec(html)) !== null) {
  try {
    const text = match[1].trim();
    // LinkedIn escapes the JSON inside the code blocks, e.g. &quot;
    // But mostly it's raw JSON or URI encoded. Let's try to parse if it looks like JSON
    if (text.startsWith('{') || text.startsWith('[')) {
      // Decode HTML entities just in case (cheap version)
      const decoded = text.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'");
      const data = JSON.parse(decoded);
      
      // Look for included array
      if (data.included && Array.isArray(data.included)) {
        data.included.forEach(inc => {
          // Look for author names
          if (inc.title?.text || inc.primarySubtitle?.text) {
             const name = inc.title?.text || '';
             if (name === 'Sapna D' || name.includes('Sai Challagulla') || name.includes('Sagar Agrawal')) {
                console.log(`Found recruiter: ${name} in data block!`);
             }
          }
          // Look for post text
          if (inc.commentary?.text?.text || inc.$type?.includes('Update')) {
             if (inc.commentary?.text?.text) {
               posts.push({
                 urn: inc.entityUrn || inc.urn || inc.$type,
                 text: inc.commentary.text.text.substring(0, 200),
                 author: inc.actor?.name?.text || 'Unknown'
               });
             }
          }
        });
      }
    }
  } catch (e) {
    // ignore parse errors
  }
}

console.log(`Parsed ${posts.length} posts from embedded JSON blocks`);
if (posts.length > 0) {
  console.log(JSON.stringify(posts.slice(0, 3), null, 2));
}
