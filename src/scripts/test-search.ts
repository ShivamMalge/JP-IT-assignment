import { LinkedInService } from '../services/linkedin';
import { logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

async function testSearch() {
  const service = new LinkedInService();
  try {
    await service.initialize();
    
    // Get search keyword from command line arguments, default to 'Web Developer'
    const searchKeyword = process.argv[2] || 'Web Developer';
    logger.info(`Starting scraper for role: ${searchKeyword}`);
    
    // Search for the role and scroll 3 times
    const results: any = await service.searchPosts(searchKeyword, 3);
    
    // Save network data
    const netPath = path.resolve(__dirname, '../../data.json');
    fs.writeFileSync(netPath, JSON.stringify(results.networkData, null, 2));
    logger.info(`Saved ${results.networkData.length} network responses to data.json`);
    
    // Process posts and save to SQLite DB directly
    const sqlite3 = require('sqlite3').verbose();
    const db = new sqlite3.Database(path.resolve(__dirname, '../../dev.db'));
    
    logger.info('Extracting emails and saving to database...');
    let savedCount = 0;
    
    for (const post of results.domPosts) {
      // Simple regex to extract emails
      const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
      const emails = post.text?.match(emailRegex) || [];
      const uniqueEmails = [...new Set(emails)];
      
      const urn = post.urn || `manual_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      try {
        const id = require('crypto').randomUUID();
        const postUrl = post.postUrl || `https://linkedin.com/feed/update/${urn}`;
        const postedAt = new Date(post.timestamp).toISOString();
        const createdAt = new Date().toISOString();
        
        await new Promise((resolve, reject) => {
          db.run(`INSERT INTO Post (id, urn, rawText, authorName, postUrl, postedAt, createdAt) 
                  VALUES (?, ?, ?, ?, ?, ?, ?)`, 
            [id, urn, post.text, post.authorName, postUrl, postedAt, createdAt],
            function(err: any) {
              if (err) return reject(err);
              resolve(this.lastID);
            }
          );
        });

        // If we found emails, create JobApplication records immediately
        for (const email of uniqueEmails) {
          const appId = require('crypto').randomUUID();
          await new Promise((resolve, reject) => {
            db.run(`INSERT INTO JobApplication (id, postId, recruiterEmail, status, createdAt) 
                    VALUES (?, ?, ?, ?, ?)`,
              [appId, id, (email as string).toLowerCase(), 'PENDING', createdAt],
              function(err: any) {
                if (err) return reject(err);
                resolve(this.lastID);
              }
            );
          });
          logger.info(`Found email ${email} in post by ${post.authorName}`);
        }
        
        savedCount++;
      } catch (err: any) {
        if (err.message && err.message.includes('UNIQUE constraint failed')) {
          // Unique constraint failed, post already exists
        } else {
          logger.error(`Failed to save post to DB: ${err.message}`);
        }
      }
    }
    
    logger.info(`Successfully saved ${savedCount} new posts to the database.`);
    
    db.close();
    
  } catch (error) {
    logger.error('Search test failed:', error);
  } finally {
    await service.close();
  }
}

testSearch();
