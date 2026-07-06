import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';

async function exportToCsv() {
  const sqlite3 = require('sqlite3').verbose();
  const db = new sqlite3.Database(path.resolve(__dirname, '../../dev.db'));

  try {
    logger.info('Fetching jobs and applications from database...');
    
    const applications: any[] = await new Promise((resolve, reject) => {
      db.all(`SELECT a.*, p.rawText, p.authorName, p.postUrl 
              FROM JobApplication a
              JOIN Post p ON a.postId = p.id`, 
        (err: any, rows: any) => {
          if (err) reject(err);
          resolve(rows);
        }
      );
    });

    if (applications.length === 0) {
      logger.info('No applications found to export.');
      return;
    }

    // CSV Header
    let csvContent = 'Date Found,Recruiter Email,Author Name,Status,Job URL,Post Text Snippet\n';

    applications.forEach(app => {
      // Escape quotes and newlines for CSV
      const safeText = (app.rawText || '')
        .replace(/"/g, '""')
        .replace(/\n/g, ' ')
        .substring(0, 150) + '...';
        
      const date = app.createdAt ? app.createdAt.split('T')[0] : '';
      
      csvContent += `"${date}","${app.recruiterEmail}","${app.authorName}","${app.status}","${app.postUrl}","${safeText}"\n`;
    });

    const outPath = path.resolve(__dirname, '../../extracted_leads.csv');
    fs.writeFileSync(outPath, csvContent);
    
    logger.info(`Successfully exported ${applications.length} records to extracted_leads.csv`);
  } catch (error) {
    logger.error('Failed to export CSV: ' + error);
  } finally {
    db.close();
  }
}

exportToCsv();
