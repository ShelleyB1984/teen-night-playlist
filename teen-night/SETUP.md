# 🎉 Teen Night Playlist App — Setup Guide

A song-suggestion web app for your Teen Night 2nd Anniversary.
Teens suggest songs → Claude AI reviews them → approved songs are added to Spotify automatically.

---

## What You'll Need (all free)

| Service | Purpose | Cost |
|---|---|---|
| [Netlify](https://netlify.com) | Hosts the site + hides your API keys | Free |
| [GitHub](https://github.com) | Stores the code (Netlify deploys from here) | Free |
| [Spotify for Developers](https://developer.spotify.com) | Adds songs to your playlist | Free |
| [Anthropic Console](https://console.anthropic.com) | AI content review | ~$5 free credit to start |

---

## Step 1 — Spotify Setup (~15 min)

### 1a. Create a Spotify Developer App
1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account
3. Click **Create App**
4. Fill in:
   - App name: `Teen Night Playlist`
   - App description: `Anniversary playlist submissions`
   - Redirect URI: `https://YOUR-SITE-NAME.netlify.app/callback` (you'll update this later)
5. Click **Save** — you'll see your **Client ID** and **Client Secret** (keep these!)

### 1b. Get your Playlist ID
1. Open Spotify, find or create your Teen Night playlist
2. Click the three dots → **Share** → **Copy link to playlist**
3. The URL looks like: `https://open.spotify.com/playlist/37i9dQZF1DX...`
4. The part after `/playlist/` is your **Playlist ID** — save it!

### 1c. Get a User Access Token (for adding tracks)
Spotify requires a user token to modify playlists. Use the **OAuth PKCE flow**:

1. Go to [developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow](https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow)
2. Or use a tool like [spotify-token-generator](https://spotify-token-generator.netlify.app/) with your Client ID
3. Request the scope: `playlist-modify-public`
4. Copy the **Access Token** — save it!

> ⚠️ **Note:** User access tokens expire after 1 hour. For a one-night event this is fine —
> just generate a fresh token before the event. For long-term use, the SETUP_ADVANCED.md
> explains how to set up automatic token refresh.

---

## Step 2 — Anthropic API Key (~5 min)

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign up / log in
3. Click **API Keys** → **Create Key**
4. Copy and save the key (starts with `sk-ant-...`)
5. You start with **$5 free credit** — at ~$0.003/song that's 1,600+ reviews for free!

---

## Step 3 — GitHub Setup (~5 min)

1. Create a free account at [github.com](https://github.com) if you don't have one
2. Click **New repository** → name it `teen-night-playlist` → **Create**
3. Upload ALL the files from this folder:
   - Drag and drop the entire folder onto the GitHub page
   - Or use GitHub Desktop (free app) if you prefer

---

## Step 4 — Netlify Deploy (~10 min)

1. Go to [netlify.com](https://netlify.com) → **Sign up** (use your GitHub account)
2. Click **Add new site** → **Import an existing project** → **GitHub**
3. Select your `teen-night-playlist` repo
4. Build settings should auto-detect from `netlify.toml` — leave them as-is
5. Click **Deploy site** — Netlify gives you a free URL like `https://amazing-name-123.netlify.app`

### Add your secret environment variables:
1. In Netlify dashboard → **Site settings** → **Environment variables**
2. Click **Add a variable** for each of these:

| Variable Name | Value |
|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic key (`sk-ant-...`) |
| `SPOTIFY_CLIENT_ID` | From your Spotify app |
| `SPOTIFY_CLIENT_SECRET` | From your Spotify app |
| `SPOTIFY_PLAYLIST_ID` | Your playlist ID |
| `SPOTIFY_USER_TOKEN` | Your user access token |

3. After adding all variables, go to **Deploys** → **Trigger deploy** → **Deploy site**

---

## Step 5 — Final Touches (~2 min)

Open `public/index.html` and replace this line near the top of the `<script>` section:
```
const SPOTIFY_PLAYLIST_URL = "YOUR_SPOTIFY_PLAYLIST_URL_HERE";
```
With your actual Spotify playlist URL:
```
const SPOTIFY_PLAYLIST_URL = "https://open.spotify.com/playlist/YOUR_PLAYLIST_ID";
```

Commit and push — Netlify will redeploy automatically.

---

## Before the Event

1. **Generate a fresh Spotify user token** (they expire after 1 hour)
2. Update the `SPOTIFY_USER_TOKEN` environment variable in Netlify
3. Trigger a redeploy
4. Test it yourself — submit a clean song and make sure it shows up on Spotify!
5. Share the Netlify URL with your teens 🎉

---

## Customization (later, with your brand kit)

- Replace fonts, colors, and logo in `public/index.html` CSS variables at the top
- Update the playlist rules in both `public/index.html` and `netlify/functions/submit-song.js`
- Change the anniversary year/name in the hero section

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Songs not being added | Spotify user token expired — generate a new one and update in Netlify env vars |
| "Server error" on submit | Check Netlify function logs: Netlify dashboard → Functions → submit-song |
| Feed not loading | Check the playlist is set to **Public** in Spotify |
| Claude says song is inappropriate when it shouldn't be | Adjust the rules text in `netlify/functions/submit-song.js` |

---

*Built with Claude AI + Spotify API + Netlify — $0/month*
