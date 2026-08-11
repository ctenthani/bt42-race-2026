# BT42.195 km Race 2026 — Official Event Website

Mobile-first event site for the **BT42.195 km Race** (full marathon, 10 km & 5 km)  
**Race day:** Saturday, 26 September 2026 · Blantyre, Malawi

Organised under the Malawi National Council of Sports.

---

## Live features

- Responsive design (phone → desktop)
- Live countdown to race day
- Race information (42.195 km / 10 km / 5 km)
- Online registration form (Netlify Forms)
- Guided mobile-money payment messaging (Airtel Money & TNM Mpamba)
- Course, sponsors and info sections
- Progressive Web App manifest (add to home screen)

---

## Deploy to Netlify via GitHub (recommended)

### 1. Create a new GitHub repository
1. Go to [github.com/new](https://github.com/new)
2. Name it e.g. `bt42-race-2026` (public or private)
3. **Do not** initialise with a README (this folder already has one)
4. Click **Create repository**

### 2. Push this folder to GitHub

```bash
# From inside this folder (github-ready)
git init
git add .
git commit -m "Initial launch: BT42.195 km Race 2026 website"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/bt42-race-2026.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

### 3. Connect to Netlify
1. Go to [app.netlify.com](https://app.netlify.com) and log in (or sign up free)
2. Click **Add new site** → **Import an existing project**
3. Choose **GitHub** and authorise Netlify if asked
4. Select the `bt42-race-2026` repository
5. Build settings (leave as defaults):
   - **Build command:** *(leave empty)*
   - **Publish directory:** `.`  (or leave blank — netlify.toml already sets it)
6. Click **Deploy site**

Netlify will give you a URL like `https://random-name-123.netlify.app`.  
You can change it later under **Site settings → Domain management**.

### 4. Enable Netlify Forms
After the first deploy:
1. Go to **Forms** in the Netlify dashboard
2. You should see the form `bt42-registration`
3. Submissions will appear there automatically
4. (Optional) Set up email notifications under **Forms → Form notifications**

### 5. Custom domain (optional)
In Netlify → **Domain management** you can add a custom domain (e.g. `bt42.mw` or `race.malawisport.mw`) and follow the DNS instructions.

---

## Local testing

```bash
# From this folder
python3 -m http.server 8080
# Open http://localhost:8080
```

---

## Project structure

```
├── index.html          # Main app (SPA with hash routing)
├── css/styles.css
├── js/app.js
├── manifest.json       # PWA
├── netlify.toml        # Netlify config + SPA redirects
├── _redirects
├── robots.txt
└── assets/             # (add logo / icons here later)
```

---

## Next improvements (after launch)

- Connect a real payment reference generator + admin sheet
- Add official course map image or embed
- Replace placeholder sponsor slots with real logos
- Add results page after race day
- Custom domain + SSL (automatic on Netlify)

---

**Organising Committee Chair:** Chifundo Tenthani  
**Event:** BT42.195 km Race · 26 September 2026
