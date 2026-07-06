import { chromium } from 'playwright-extra';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

async function extractText() {
  console.log('Connecting to Chrome...');
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const context = contexts[0];
  const page = await context.newPage();

  const searchUrl = `https://www.linkedin.com/search/results/content/?datePosted=%22past-24h%22&keywords=Java%20Developer&origin=FACETED_SEARCH&sid=ddd`;
  
  await page.goto(searchUrl, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(5000);

  console.log('Dumping full text...');
  const text = await page.innerText('body');
  const outPath = path.resolve(__dirname, '../../full-page-text.txt');
  fs.writeFileSync(outPath, text);
  console.log(`Saved full text to full-page-text.txt (${text.length} bytes)`);

  await page.close();
  await browser.close();
}

extractText();
