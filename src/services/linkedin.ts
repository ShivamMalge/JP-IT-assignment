import { Browser, BrowserContext, Page, Request, Response } from 'playwright';
import { chromium } from 'playwright-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as dotenv from 'dotenv';
import { logger } from '../utils/logger';

dotenv.config();

export class LinkedInService {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  async initialize() {
    logger.info('Connecting to your live Chrome browser...');
    try {
      this.browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
      const contexts = this.browser.contexts();
      this.context = contexts[0];
      this.page = await this.context.newPage();
    } catch (e: any) {
      throw new Error('Could not connect to Chrome. Please make sure Chrome is running with --remote-debugging-port=9222.\nError: ' + e.message);
    }
  }

  async verifyLogin() {
    if (!this.page) throw new Error('Browser not initialized');
    
    logger.info('Verifying LinkedIn authentication...');
    await this.page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded' });
    
    const title = await this.page.title();
    if (title.toLowerCase().includes('log in') || title.toLowerCase().includes('sign in')) {
      throw new Error('Failed to login. The cookies might be expired or invalid.');
    }
    
    logger.info('Authentication successful! Reached LinkedIn feed.');
  }

  async searchPosts(keyword: string, maxScrolls: number = 3): Promise<any[]> {
    if (!this.page) throw new Error('Browser not initialized');

    const interceptedData: any[] = [];
    
    // Attach network listener - capture ALL responses to find search data
    this.page.on('response', async (response: Response) => {
      const url = response.url();
      if (url.includes('voyager/api/')) {
        try {
          const contentType = response.headers()['content-type'] || '';
          if (contentType.includes('json')) {
            const json = await response.json();
            interceptedData.push({ url, data: json });
          }
        } catch (e) {
          // Ignore requests that aren't JSON or fail to parse
        }
      }
    });

    logger.info(`Searching for: "${keyword}" (Past 24 hours)...`);
    
    // Navigate directly to the search results page
    const searchUrl = `https://www.linkedin.com/search/results/content/?datePosted=%22past-24h%22&keywords=${encodeURIComponent(keyword)}&origin=FACETED_SEARCH&sid=aaa`;
    
    await this.page.goto(searchUrl, { waitUntil: 'load', timeout: 30000 });
    
    // Wait for search results to appear on the page
    logger.info('Waiting for search results to load...');
    try {
      await this.page.waitForSelector('.search-results-container, .reusable-search__entity-result-list', { timeout: 10000 });
    } catch (e) {
      logger.info('Selector not found, waiting extra time...');
    }
    await this.page.waitForTimeout(3000);

    // Scroll to trigger pagination
    for (let i = 0; i < maxScrolls; i++) {
      logger.info(`Scrolling page ${i + 1}/${maxScrolls}...`);
      await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      // Wait a random amount of time between 2 and 4 seconds to avoid bot detection
      const waitTime = Math.floor(Math.random() * 2000) + 2000;
      await this.page.waitForTimeout(waitTime);
    }

    logger.info(`Captured ${interceptedData.length} background network responses during search.`);
    
    // Extract post data via raw text from the DOM
    logger.info('Extracting post data from raw text...');
    const rawText = await this.page.innerText('body');
    const posts = rawText.split('Feed post').slice(1); // Skip the first part before the first post
    
    const domPosts = posts.map((postText, index) => {
      const lines = postText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      
      // Author is typically the first or second line
      let authorName = lines[0];
      if (authorName.includes('Feed post') || authorName.includes('Suggested')) {
         authorName = lines[1] || 'Unknown';
      }
      
      // The rest is the text
      const text = lines.slice(1).join('\n');
      
      return {
        id: `post_${index}`,
        authorName,
        text,
        timestamp: new Date().toISOString()
      };
    }).filter(p => p.text.toLowerCase().includes('java') || p.text.toLowerCase().includes('hiring'));
    
    logger.info(`Extracted ${domPosts.length} posts from raw text.`);
    
    return { networkData: interceptedData, domPosts } as any;
  }

  async close() {
    logger.info('Closing Playwright browser...');
    if (this.browser) {
      await this.browser.close();
    }
  }
}
