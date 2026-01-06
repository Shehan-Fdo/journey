# Journey - Deployment Guide for Vercel

## Prerequisites

1. **PostgreSQL Database**: You need a PostgreSQL database. Recommended options:
   - [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)
   - [Neon](https://neon.tech/)
   - [Supabase](https://supabase.com/)
   - [Railway](https://railway.app/)

2. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)

## Deployment Steps

### 1. Set Up Database

If you don't have a database yet, create one using any provider above. You'll get a connection string that looks like:
```
postgresql://username:password@host:port/database?sslmode=require
```

### 2. Update Local .env File

Edit `journey/.env` and replace the placeholder with your actual database URL:
```
PORT=3000
DATABASE_URL=postgresql://your_actual_connection_string
```

### 3. Test Locally

Navigate to the project directory and run:
```bash
cd journey
npm install
npm start
```

Visit `http://localhost:3000` to verify everything works.

### 4. Deploy to Vercel

#### Option A: Using Vercel CLI
```bash
# Install Vercel CLI globally
npm install -g vercel

# Navigate to the journey directory
cd journey

# Deploy
vercel

# Follow the prompts and set environment variables when asked
```

#### Option B: Using Vercel Dashboard
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your Git repository
3. Set **Root Directory** to `journey` (important!)
4. Add environment variable:
   - **Key**: `DATABASE_URL`
   - **Value**: Your PostgreSQL connection string
5. Click "Deploy"

### 5. Verify Deployment

Once deployed:
1. Visit your Vercel URL (e.g., `https://your-app.vercel.app`)
2. Test creating a new journal entry
3. Verify entries are saved and retrieved from the database

## Important Notes

- ✅ The `.env` file is **NOT** committed to Git (it's in `.gitignore`)
- ✅ Always set `DATABASE_URL` in Vercel's environment variables dashboard
- ✅ The database will automatically initialize tables on first connection
- ✅ Make sure to deploy from the `journey` subdirectory, not the parent folder

## Troubleshooting

### Build Fails
- Check that you're deploying from the `journey` directory
- Verify all dependencies are in `package.json`

### Database Connection Issues
- Ensure `DATABASE_URL` is set in Vercel environment variables
- Check that your database allows connections from Vercel's IP ranges
- Verify the connection string format is correct

### API Routes Not Working
- Check the Vercel deployment logs for errors
- Ensure `vercel.json` is properly configured
- Verify the serverless function is being built

## Environment Variables

Set these in Vercel Dashboard → Your Project → Settings → Environment Variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host/db` |

## File Structure

```
journey/
├── api/
│   └── serverless.js      # Vercel serverless function
├── public/
│   ├── index.html
│   ├── app.js
│   ├── style.css
│   └── robots.txt
├── src/
│   ├── server.js          # Local development server
│   └── db.js              # Database configuration
├── .env                   # Environment variables (NOT in Git)
├── .gitignore
├── package.json
└── vercel.json            # Vercel configuration
```
