import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import { logger } from '../utils/logger';

dotenv.config();

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;

const OAuth2 = google.auth.OAuth2;

/**
 * Initializes and returns a Nodemailer transport using Gmail OAuth2
 */
export async function createGmailTransport() {
  const USER = process.env.GMAIL_USER_EMAIL;
  const PASS = process.env.GMAIL_APP_PASSWORD;

  if (!USER || !PASS) {
    throw new Error('Gmail Email or App Password missing from .env');
  }

  try {
    const transport = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: USER,
        pass: PASS.replace(/\s+/g, ''), // Remove spaces from the app password just in case
      },
    });

    // Verify connection
    await transport.verify();
    logger.info('SMTP connection verified successfully.');

    return transport;
  } catch (error: any) {
    logger.error('Failed to create Gmail transport: ' + error.message);
    throw error;
  }
}
