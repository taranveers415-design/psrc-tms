# 🚀 Deploy PSRC TMS to Render.com (FREE Preview)

## Why Render.com?
- **FREE tier** - No credit card required [^14^]
- **750 hours/month** - Enough to run one app continuously [^12^]
- **FREE PostgreSQL** - 1GB storage (expires after 90 days, perfect for preview) [^11^]
- **Auto-deploy from GitHub** - Push code, it deploys automatically
- **Custom domains + SSL** - Even on free tier

## ⚠️ Free Tier Limitations
- App "sleeps" after 15 min of inactivity (wakes up in ~1 min on next request) [^14^]
- Database expires after 90 days (you'll get 14-day warning to upgrade) [^11^]
- NOT for production - perfect for testing/preview

---

## Step-by-Step Deployment

### Step 1: Push Code to GitHub

```bash
# Create a new GitHub repo (e.g., "psrc-tms")
# Then run these commands in your project folder:

git init
git add .
git commit -m "Initial PSRC TMS commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/psrc-tms.git
git push -u origin main
```

### Step 2: Deploy Backend + Database

1. Go to https://dashboard.render.com
2. Sign up with GitHub
3. Click **"New +"** → **"Web Service"**
4. Connect your GitHub repo
5. Configure:
   - **Name**: `psrc-tms-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node src/server.js`
   - **Instance Type**: `Free`
6. Add Environment Variables:
   ```
   NODE_ENV=production
   JWT_SECRET=your-super-secret-key-here
   ```
7. Click **"Create Web Service"**

8. Now add PostgreSQL:
   - Click **"New +"** → **"PostgreSQL"**
   - **Name**: `psrc-db`
   - **Database**: `psrc_tms`
   - **User**: `psrc_user`
   - **Plan**: `Free`
   - Click **"Create Database"**

9. Copy the **Internal Database URL** from the database dashboard
10. Add it as `DATABASE_URL` env var to your backend service

### Step 3: Deploy Frontend

1. Click **"New +"** → **"Static Site"**
2. Select your same repo
3. Configure:
   - **Name**: `psrc-tms-frontend`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `build`
   - **Instance Type**: `Free`
4. Add Environment Variable:
   ```
   REACT_APP_API_URL=https://psrc-tms-backend.onrender.com
   ```
5. Click **"Create Static Site"**

### Step 4: Update CORS

In your backend service settings, update the `FRONTEND_URL` env var to match your frontend URL (e.g., `https://psrc-tms-frontend.onrender.com`)

---

## Alternative: Use render.yaml (One-Click Blueprint)

I've included a `render.yaml` file in your project. On Render:
1. Click **"New +"** → **"Blueprint"**
2. Connect your repo
3. Render will auto-detect the `render.yaml` and deploy everything

---

## 🎉 Your Preview is Live!

- **Frontend**: https://psrc-tms-frontend.onrender.com
- **API**: https://psrc-tms-backend.onrender.com/api/health
- **Default Login**: admin@psrc.in / password

---

## 📊 What You Can Test in the Preview

✅ Login/Logout with JWT  
✅ Dashboard with KPIs & charts  
✅ Vehicle fleet management  
✅ Driver profiles & assignments  
✅ Order creation & tracking  
✅ Trip management with status workflow  
✅ Invoice generation with GST  
✅ Accounting (Chart of Accounts, P&L)  
✅ Banking & vouchers  
✅ All 6 reports with charts  

---

## ⏭️ Next Steps After Preview

1. **Test everything** - Create orders, assign trips, generate invoices
2. **Customize** - Add your real vehicle numbers, clients, rates
3. **Production Deploy** - Upgrade to paid tier ($7-25/month) or deploy on your own VPS
4. **Bank API** - Add real ICICI/HDFC credentials
5. **GPS** - Integrate vehicle tracking

---

## 💰 Cost Comparison (When Ready for Production)

| Platform | Monthly Cost | Best For |
|----------|-------------|----------|
| **Render Starter** | ~$7-25 | Easy managed hosting |
| **Railway Hobby** | $5 + usage | Usage-based, great DX |
| **DigitalOcean** | ~$12-24 | Full control, cheapest |
| **AWS Lightsail** | ~$10-20 | AWS ecosystem |
| **Your Own Server** | ~₹2,000-5,000 | Maximum control |

For PSRC's scale, I recommend **DigitalOcean** ($12/month droplet) or **Render Starter** ($7/month) for production.
