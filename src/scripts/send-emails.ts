import { createGmailTransport } from '../services/gmail';
import * as path from 'path';
import * as fs from 'fs';
import { logger } from '../utils/logger';

async function sendAutomatedEmails() {
  const sqlite3 = require('sqlite3').verbose();
  const db = new sqlite3.Database(path.resolve(__dirname, '../../dev.db'));
  
  try {
    logger.info('Initializing Gmail transport...');
    const transport = await createGmailTransport();

    const targetAppId = process.argv[3];
    
    let query = `SELECT a.*, p.authorName 
              FROM JobApplication a
              JOIN Post p ON a.postId = p.id
              WHERE a.status IN ('PENDING', 'FAILED')`;
              
    if (targetAppId) {
      query += ` AND a.id = '${targetAppId.replace(/'/g, "''")}'`;
    }

    logger.info('Fetching pending job applications...');
    const pendingApps: any[] = await new Promise((resolve, reject) => {
      db.all(query, 
        (err: any, rows: any) => {
          if (err) reject(err);
          resolve(rows);
        }
      );
    });

    if (pendingApps.length === 0) {
      logger.info('No pending applications to send.');
      return;
    }

    const resumePath = path.resolve(__dirname, '../../ShivamMalge.pdf');
    if (!fs.existsSync(resumePath)) {
      throw new Error(`Resume not found at ${resumePath}. Please make sure ShivamMalge.pdf is in the root directory.`);
    }

    const role = process.argv[2] || 'Web Developer';
    let sentCount = 0;

    for (const app of pendingApps) {
      logger.info(`Sending application to ${app.recruiterEmail}...`);
      
      const subject = `Application for ${role} - Shivam Malge`;
      
      const textBody = `
Dear Hiring Manager,

I am writing to express my interest in the ${role} position mentioned in the recent LinkedIn post by ${app.authorName || 'your team'}. 

With professional experience as a Software Developer specializing in frontend and full-stack web development, I have a strong track record of building responsive, user-friendly, and highly performant web applications. 

I have attached my resume for your review, which details my technical skills and project experience. I would welcome the opportunity to discuss how my background and skills can add value to your team.

Thank you for your time and consideration.

Best regards,

Shivam Malge
Email: shivammalge@gmail.com
LinkedIn: linkedin.com/in/shivam-malge/
      `.trim();

      try {
        await transport.sendMail({
          from: process.env.GMAIL_USER_EMAIL,
          to: app.recruiterEmail,
          subject: subject,
          text: textBody,
          attachments: [
            {
              filename: 'ShivamMalge_Resume.pdf',
              path: resumePath
            }
          ]
        });

        // Update status
        await new Promise<void>((resolve, reject) => {
          db.run(`UPDATE JobApplication SET status = 'SENT', sentAt = ? WHERE id = ?`,
            [new Date().toISOString(), app.id],
            (err: any) => {
              if (err) reject(err);
              resolve();
            }
          );
        });

        sentCount++;
        logger.info(`Successfully sent email to ${app.recruiterEmail}`);
      } catch (err: any) {
        logger.error(`Failed to send email to ${app.recruiterEmail}: ${err.message}`);
        await new Promise<void>((resolve, reject) => {
          db.run(`UPDATE JobApplication SET status = 'FAILED' WHERE id = ?`,
            [app.id],
            (err: any) => {
              if (err) reject(err);
              resolve();
            }
          );
        });
      }
    }

    logger.info(`Finished sending ${sentCount} applications.`);

  } catch (error) {
    logger.error('Email automation failed: ' + error);
  } finally {
    db.close();
  }
}

sendAutomatedEmails();
