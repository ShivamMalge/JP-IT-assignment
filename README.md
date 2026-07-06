# LeadGenius - Automated LinkedIn Job Pipeline

LeadGenius is a fully automated end-to-end pipeline that scrapes job postings directly from a live LinkedIn feed, extracts recruiter contact information, saves them to a database, and provides a beautiful Next.js UI dashboard to review the leads and automatically dispatch tailored job applications via Gmail.

## Features

- **Stealth LinkedIn Scraper**: Uses Playwright and `puppeteer-extra-plugin-stealth` to connect to a live Chrome debugging session, bypassing aggressive bot protections by scrolling and extracting raw DOM content naturally.
- **Dynamic Search**: Pass any role (e.g., "Python Developer", "React Engineer") and the scraper adapts instantly.
- **Smart Data Extraction**: Uses Regex to extract hidden recruiter emails from the job descriptions.
- **SQLite Database**: A robust, zero-configuration local database (`dev.db`) used to deduplicate jobs and track application status.
- **CSV Export**: Automatically format and export all leads and their statuses into an Excel-compatible CSV file.
- **Automated Gmail Dispatcher**: Uses the Gmail API (via SMTP App Passwords) to send personalized application emails with your attached PDF resume.
- **Next.js Dashboard**: A beautiful, dark-mode, glassmorphism UI to view scraped jobs, recruiter details, and trigger the email dispatcher with a single click.

## Tech Stack
- **Backend & Scraping**: Node.js, TypeScript, Playwright, Node Mailer.
- **Database**: SQLite3.
- **Frontend**: Next.js 14, React, Tailwind CSS, TypeScript.

## How to Run Locally

### 1. Prerequisites
- **Google Chrome** running with the remote debugging port enabled:
  ```bash
  chrome.exe --remote-debugging-port=9222
  ```
- A `.env` file at the root containing your Gmail credentials:
  ```
  GMAIL_USER_EMAIL="your_email@gmail.com"
  GMAIL_APP_PASSWORD="your_16_letter_app_password"
  ```
- Your resume named `ShivamMalge.pdf` placed in the root directory.

### 2. Scraping Jobs
Run the scraper and pass any role you want to search for:
```bash
npx tsx src/scripts/test-search.ts "Python Developer"
```
*This will open your live browser, search for the role, extract the posts, and save them to the SQLite database.*

### 3. Export to CSV
```bash
npx tsx src/scripts/export-csv.ts
```
*This will generate an `extracted_leads.csv` file.*

### 4. Running the Dashboard (UI)
```bash
cd web
npm install
npm run dev
```
Open `http://localhost:3000` to view your dashboard. From here, you can review leads and click the "Send Application" buttons to dispatch your resume automatically!

## System Architecture

1. **Phase 1 (Setup)**: Initialized TypeScript, configured Playwright for live browser connection, and established Gmail SMTP transport.
2. **Phase 2 (Scraping)**: Engineered the DOM extraction logic to bypass LinkedIn's class obfuscation by parsing raw innerText.
3. **Phase 3 (Database & Export)**: Integrated SQLite for robust storage, deduplication, and built the CSV exporter.
4. **Phase 4 (UI Integration)**: Built the Next.js frontend and connected the Node.js scripts via API routes to create a seamless SaaS experience.
