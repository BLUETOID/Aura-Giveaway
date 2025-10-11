# HTMLCSSToImage API Setup

## 🎨 Get Your Free API Key

1. **Visit** https://htmlcsstoimage.com/
2. **Sign up** for a free account
3. **Go to Dashboard** after login
4. **Copy your credentials:**
   - User ID
   - API Key

## 🔐 Add to Environment Variables

### Local Development (.env file)
```bash
HCTI_USER_ID=your_user_id_here
HCTI_API_KEY=your_api_key_here
```

### Heroku Production
```bash
heroku config:set HCTI_USER_ID=your_user_id_here
heroku config:set HCTI_API_KEY=your_api_key_here
```

## 📊 Free Tier Limits
- **150 images/month** (free)
- Upgrade available if needed
- Perfect for Discord bots!

## ✅ Benefits Over Puppeteer
- ✨ **200MB smaller** slug size
- ⚡ **Faster** image generation
- 🚀 **No browser** installation needed
- 💰 **Free tier** available
- 🔧 **Less maintenance** required

## 🧪 Test Your Setup
Run your bot locally and try the `/profile` command. If you see errors about missing API keys, make sure you've set them correctly in your `.env` file!
