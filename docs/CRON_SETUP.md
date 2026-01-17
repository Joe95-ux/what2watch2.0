# Free Cron Jobs Setup

Since you're on Vercel's free plan, Vercel Cron won't work. Use one of these free alternatives:

## Option 1: GitHub Actions (Best for Public Repos) ⭐

**Setup Steps:**

1. **Add GitHub Secrets:**
   - Go to: Your Repository → Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Add these two secrets:
     - **Name:** `APP_URL` → **Value:** `https://your-app.vercel.app` (your production URL)
     - **Name:** `CRON_SECRET` → **Value:** Generate with: `openssl rand -hex 32`

2. **That's it!** The workflow at `.github/workflows/youtube-jobs.yml` will automatically run:
   - Snapshot collection: Every 6 hours
   - Trend calculation: Daily at 1 AM UTC

**Note:** GitHub Actions is free for public repos. For private repos, you get 2,000 free minutes/month.

## Option 2: cron-job.org (Best for Private Repos)

1. Sign up at https://cron-job.org (free, unlimited jobs)

2. **Create Job 1: Snapshot Collection**
   - URL: `https://your-domain.com/api/youtube/snapshots/collect`
   - Method: POST
   - Schedule: Every 6 hours (`0 */6 * * *`)
   - Headers:
     ```
     Authorization: Bearer YOUR_CRON_SECRET
     Content-Type: application/json
     ```

3. **Create Job 2: Trend Calculation**
   - URL: `https://your-domain.com/api/youtube/trends/calculate`
   - Method: POST
   - Schedule: Daily at 1 AM (`0 1 * * *`)
   - Headers:
     ```
     Authorization: Bearer YOUR_CRON_SECRET
     Content-Type: application/json
     ```

4. **Add CRON_SECRET to Vercel:**
   - Go to Vercel → Your Project → Settings → Environment Variables
   - Add: `CRON_SECRET` = `YOUR_CRON_SECRET` (same value you use in cron-job.org)

## Where to Add CRON_SECRET?

- **If using GitHub Actions:** Add to GitHub Secrets (Repository → Settings → Secrets)
- **If using cron-job.org:** Add to Vercel Environment Variables (so your API accepts the requests)

## Testing

Test manually:
```bash
curl -X POST https://your-domain.com/api/youtube/snapshots/collect \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```
