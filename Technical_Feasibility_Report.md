# Technical Feasibility and Architecture Report
**Project:** LinkedIn Automated Job Application System

## PART 1 — REQUIREMENT ANALYSIS

**What exactly is expected:**
The system must act as an automated job application assistant. It needs to periodically log into LinkedIn, search for specific job keywords in recent posts (not the structured Jobs section), extract unstructured job details and recruiter contact information, compose a personalized email with a resume attached, send it via Gmail, and log the entire workflow into a database.

**Which parts are straightforward:**
- **Gmail Integration:** Sending emails with attachments is highly standardized using the Gmail API and OAuth 2.0.
- **Database Storage:** Storing logs, applications, and recruiter data using an ORM (like Prisma) is a standard backend task.
- **Email Composition:** Generating emails from predefined templates.

**Which parts are technically difficult:**
- **LinkedIn Authentication:** Automated login is heavily guarded by CAPTCHAs, MFA, and Cloudflare.
- **Data Extraction from Posts:** Unlike structured job postings, LinkedIn posts are free-text. Extracting "Job Title" or "Skills" from a conversational post requires advanced parsing (often using LLMs/Regex).
- **DOM Instability:** If relying on web scraping, LinkedIn frequently obfuscates CSS classes and changes its DOM structure.

**Which requirements are ambiguous:**
- *“determine the best authentication approach if direct Gmail login is not feasible”*: LinkedIn does not allow script-based SSO via Google without triggering bot defenses. The definition of "login" needs to shift from credential-based execution to session-based injection.
- *“Any other relevant details”*: Unstructured posts contain wildly varying data. A strategy (like AI parsing) is needed to standardize this.

**Potential blockers:**
- **LinkedIn Anti-Bot Defenses:** IP bans, forced logouts, and shadowbans.
- **Absence of Emails:** Recruiters frequently do not include their email addresses in posts, expecting DMs instead.

---

## PART 2 — LINKEDIN RESEARCH

**Is there an official API for searching posts?**
No. LinkedIn’s official API is strictly limited. Post search is not available to the public or standard developers.

**Can LinkedIn APIs retrieve public posts?**
No. Access to public posts is restricted to enterprise partners under the "Marketing Developer Platform" or similar highly gated programs.

**Can LinkedIn APIs retrieve recruiter emails?**
No. User privacy policies strictly prohibit querying email addresses of other users via the API.

**Can LinkedIn APIs perform login?**
The official API supports "Sign In with LinkedIn" (OAuth 2.0). However, this is designed for building applications where *users* log in via a browser UI. It cannot be used to programmatically log a script into a user's account to perform actions on their behalf.

**What permissions are required?**
Even if one had enterprise API access, scraping post content and extracting emails violates LinkedIn’s Terms of Service.

**Is LinkedIn API sufficient for this assignment?**
**Absolutely Not.** The official API is designed for managing company pages, posting content, and basic SSO—not for data scraping or automated interactions on behalf of a standard user.

---

## PART 3 — API FEASIBILITY

| Feature | Classification | Explanation |
| :--- | :--- | :--- |
| **Login to LinkedIn** | ✅ Browser Automation Required | Official API is for SSO only. Must use browser automation with session cookies to bypass CAPTCHAs. |
| **Search Posts** | ✅ Browser Automation Required | No official API. Must simulate browser navigation to the search URL. |
| **Extract Post Data** | ✅ Internal API / Browser Automation | Can be achieved by intercepting LinkedIn's internal XHR/GraphQL network requests during a Playwright session. |
| **Extract Recruiter Email** | ✅ Impossible (via API) | LinkedIn does not expose this. Emails must be parsed from the post text using Regex. If omitted by the recruiter, it is impossible to get from LinkedIn directly. |
| **Login to Gmail** | ✅ Official API | Standard OAuth 2.0 authentication via Google Cloud Console. |
| **Send Email w/ Resume**| ✅ Official API | Gmail API seamlessly handles multipart messages and attachments. |
| **Database/Logging** | ✅ Official API | Direct communication with PostgreSQL. |

---

## PART 4 — AUTHENTICATION

**Best Authentication Strategy:**
Browser automation is **strictly required** for LinkedIn, but credential-based login (typing username/password via script) will inevitably trigger CAPTCHAs and MFA.

**The Hybrid Approach:**
1. **LinkedIn:** Use **Session Cookies (`li_at` and `JSESSIONID`)**. A human logs into LinkedIn once on a regular browser, extracts these cookies, and stores them in the environment variables. Playwright injects these cookies into the browser context, completely bypassing the login screen, Cloudflare, and MFA.
2. **Gmail:** Use **OAuth 2.0**. Create a Google Cloud Project, enable the Gmail API, and generate a Refresh Token. The Node.js application will use this token to securely request short-lived Access Tokens. No browser automation is required or recommended for Gmail.

---

## PART 5 — LINKEDIN SEARCH

**Best Approach:**
Use Playwright to launch a headless browser, inject session cookies, and navigate to the blended search URL:
`https://www.linkedin.com/search/results/content/?keywords=Java%20Developer&datePosted=%22past-24h%22`

**Under the Hood (Internal APIs / XHR):**
Instead of scraping the DOM (which is fragile due to obfuscated CSS), Playwright should be used to intercept network traffic.
- When LinkedIn loads search results, it makes XHR requests to its internal `/voyager/api/graphql` or `/voyager/api/search/blended` endpoints.
- By listening to `page.on('response')` in Playwright, we can capture the raw JSON returned by LinkedIn's backend.
- This JSON contains structured data (Author Name, URN, Post Text, Timestamp) which is infinitely more reliable to parse than HTML.

---

## PART 6 — DATA EXTRACTION

**Extracting Recruiter Information:**
Recruiter emails are **hidden** by default on LinkedIn profiles and are completely unavailable via APIs.

**Strategy:**
1. **Regex Parsing:** Run a regular expression over the unstructured post text to find email patterns (e.g., `[\w.-]+@[\w.-]+\.\w+`). If the recruiter wrote "Send CVs to hr@company.com", we capture it.
2. **AI Parsing (Recommended):** Pass the raw post text to a fast LLM (like OpenAI `gpt-4o-mini` or Gemini 1.5 Flash). Prompt the AI to extract: Recruiter Name, Company, Job Title, Required Skills, and Email. This solves the "unstructured data" problem gracefully.
3. **Alternative if Email is Missing:** If the post contains no email, we cannot send a Gmail message. The system should log the post as "Skipped - No Email Provided". (Alternative: Integrate a 3rd party tool like Apollo.io API to guess the email based on the Recruiter Name and Company, but this incurs extra costs).

---

## PART 7 — GMAIL

**Integration Strategy:**
- **API:** Google Node.js `googleapis` library.
- **Authentication:** OAuth2 Client using a `client_id`, `client_secret`, and a persistent `refresh_token`.
- **Sending Email:** Use `nodemailer` with the `nodemailer-google-oauth2` transport. This abstracts away the complexity of raw MIME construction.
- **Attachments:** Read the resume PDF from the file system and pass it to nodemailer's `attachments` array.
- **Rate Limits:** Google allows up to 500 emails per day for standard accounts (2,000 for Google Workspace). We must implement a delay/throttle to avoid hitting burst limits.

---

## PART 8 — SYSTEM ARCHITECTURE

A highly decoupled, service-oriented architecture:

1. **Cron/Scheduler:** Triggers the workflow at defined intervals.
2. **LinkedIn Service (Playwright):** Injects cookies, navigates to search URLs, and intercepts network JSON.
3. **Post Parser (AI/Regex):** Analyzes raw post text to extract structured entities (Job Title, Email).
4. **Email Composer:** Merges parsed data with HTML templates.
5. **Gmail Service:** Authenticates via OAuth and dispatches the email.
6. **Database Repository:** Interfaces with Postgres via Prisma to save state.
7. **Logger:** Winston/Pino for tracking execution and errors.

---

## PART 9 — PROJECT STRUCTURE

```text
/src
  /config          # Env variables, constants
  /db              # Prisma schema, migrations, seeders
  /services        # Business logic
     linkedin.ts   # Playwright automation & network interception
     parser.ts     # Regex/LLM logic for text extraction
     gmail.ts      # Nodemailer & OAuth logic
  /templates       # Email HTML/Text templates
  /types           # TypeScript interfaces
  /utils           # Helpers (logger, delay, retry)
  index.ts         # Main orchestration / Cron setup
```

---

## PART 10 — DATABASE (Prisma / PostgreSQL)

**Tables & Relationships:**

- **User / Configuration:** Stores Gmail OAuth tokens, LinkedIn cookies, Resume path.
- **Post:** `id`, `urn` (unique LinkedIn ID), `raw_text`, `author_name`, `timestamp`, `url`.
- **JobApplication:** `id`, `post_id` (FK), `job_title`, `company`, `recruiter_email`, `status` (PENDING, SENT, FAILED, NO_EMAIL), `sent_at`.
- **Logs:** `id`, `level`, `message`, `timestamp`.

*(A `Candidates` table is only necessary if this system serves multiple users. For a single user, configuration tables suffice).*

---

## PART 11 — TECHNOLOGY STACK

- **Runtime:** Node.js (Fast, excellent async handling for network requests).
- **Language:** TypeScript (Type safety for API responses and DOM extraction).
- **Browser Automation:** Playwright (Superior to Puppeteer for intercepting XHR requests and evading basic bot detection).
- **Database ORM:** Prisma (Type-safe, rapid schema iteration).
- **Database:** PostgreSQL (Robust, relational integrity).
- **Email:** Nodemailer + Googleapis.
- **AI Parser (Optional but recommended):** OpenAI API / Gemini API (For structuring post text).

---

## PART 12 — IMPLEMENTATION ROADMAP

- **Phase 1: Research & Setup (1 Day)** - Project initialization, DB setup, environment variables.
- **Phase 2: Authentication (1 Day)** - Generate Google OAuth tokens, extract LinkedIn cookies, configure Prisma.
- **Phase 3: LinkedIn Search & Interception (2 Days)** - Write Playwright scripts, intercept GraphQL/XHR responses for keywords.
- **Phase 4: Data Extraction (2 Days)** - Implement Regex/AI text parsing, filter out posts without emails.
- **Phase 5: Email Automation (1 Day)** - Setup Nodemailer, templating, and resume attachment.
- **Phase 6: Database & Logging (1 Day)** - Wire services to Prisma, ensure idempotency (don't apply to the same post twice).
- **Phase 7: Testing & Hardening (2 Days)** - Error handling, retry logic, delay throttling.
- **Estimated Total Effort:** ~10 Days.

---

## PART 13 — RISKS

- **LinkedIn Bot Detection:** Excessive searching will flag the account. *Mitigation: Add random delays (30-90s) between actions, limit searches to a few per day, never run headless in initial testing.*
- **Terms of Service:** Scraping violates LinkedIn ToS. The account risks permanent suspension. *Mitigation: Use a burner account to extract posts if possible.*
- **False Positives:** The system might extract a random email from a post (e.g., a candidate posting their own email) and send an application to the wrong person. *Mitigation: Strict regex/AI context checking.*
- **Gmail Spam Filters:** Sending exactly identical emails repeatedly may flag the Gmail account as a spammer. *Mitigation: Rotate templates, inject dynamic variables (Recruiter Name, Company) to make each email unique.*

---

## PART 14 — FINAL RECOMMENDATION

The project is highly feasible, but **cannot be built using official LinkedIn APIs.**

To succeed, you must embrace **Session Cookie Injection with Playwright** to bypass LinkedIn login barriers, and utilize **Network Request Interception** rather than DOM scraping to reliably harvest post data. Furthermore, because posts are unstructured text, extracting recruiter emails requires relying entirely on the recruiter having manually typed their email into the post body—any post lacking an email must be gracefully logged and skipped. For Gmail, **OAuth 2.0 via the official API** is the only secure and viable path forward.
