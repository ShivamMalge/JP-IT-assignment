import axios from 'axios';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

async function testFetch() {
  const liAt = process.env.LINKEDIN_LI_AT;
  let jsessionId = process.env.LINKEDIN_JSESSIONID || '';
  
  // ensure JSESSIONID has quotes
  if (!jsessionId.startsWith('"')) {
      jsessionId = `"${jsessionId}"`;
  }

  // csrf token is JSESSIONID without quotes
  const csrfToken = jsessionId.replace(/"/g, '');

  console.log('Fetching LinkedIn Search Page via Axios...');
  try {
    const url = 'https://www.linkedin.com/search/results/content/?datePosted=%22past-24h%22&keywords=Java%20Developer&origin=FACETED_SEARCH';
    
    const response = await axios.get(url, {
      headers: {
        'Cookie': `li_at=${liAt}; JSESSIONID=${jsessionId}`,
        'csrf-token': csrfToken,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    const html = response.data;
    const outPath = path.resolve(__dirname, '../../data.html');
    fs.writeFileSync(outPath, html);
    
    console.log(`Success! Saved ${html.length} bytes of HTML to data.html.`);
    
    // Check if it contains posts
    if (html.includes('Java')) {
        console.log('HTML contains the keyword!');
    }
    if (html.includes('voyager/api')) {
        console.log('HTML contains embedded JSON data!');
    }

  } catch (error: any) {
    console.error('Fetch failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
    }
  }
}

testFetch();
