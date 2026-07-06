import { google } from 'googleapis';
import * as readline from 'readline';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env relative to the project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3000/oauth2callback';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("ERROR: Please add GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET to your .env file first.");
  process.exit(1);
}

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.compose'
];

const authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent' // Forces generation of a refresh token
});

console.log('====================================================');
console.log('AUTHORIZE THIS APP BY VISITING THIS URL:');
console.log(authUrl);
console.log('====================================================');
console.log('\nAfter authorizing, you will be redirected to a page that says "This site can’t be reached" (localhost).');
console.log('Look at the URL in your browser\'s address bar.');
console.log('It will look like: http://localhost:3000/oauth2callback?code=4/0A...&scope=...\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Paste the ENTIRE URL here, and I will extract the code for you: ', (url) => {
  rl.close();
  
  let code = '';
  try {
    const urlObj = new URL(url);
    code = urlObj.searchParams.get('code') || '';
  } catch (e) {
    console.error("Invalid URL format.");
    process.exit(1);
  }

  if (!code) {
    console.error("Could not find the 'code' parameter in the URL.");
    process.exit(1);
  }

  oAuth2Client.getToken(code, (err, token) => {
    if (err) {
      console.error('Error retrieving access token:', err.message);
      process.exit(1);
    }
    
    console.log('\n====================================================');
    console.log('SUCCESS! Your GMAIL_REFRESH_TOKEN is:');
    console.log(token?.refresh_token);
    console.log('====================================================\n');
    console.log('Copy this token and paste it into your .env file.\n');
  });
});
