// netlify/functions/submit-song.js
// This runs on Netlify's servers — API keys are never exposed to the browser.

const RULES = `You are a content moderator for a Teen Night program at a youth organization.
Evaluate if a song is appropriate for a teen playlist (ages 13-17).

APPROVE if:
- Clean/radio-edit versions, family-friendly lyrics
- Positive, fun, or emotional themes appropriate for teens
- Any genre: pop, hip-hop, k-pop, country, Latin, R&B, etc.

REJECT if:
- Explicit sexual content or heavy innuendo
- Glorification of drugs, alcohol, or violence
- Hate speech or discriminatory themes
- Heavy profanity (even unmarked explicit tracks)

Respond ONLY with valid JSON — no markdown, no explanation outside the object:
{"approved": true, "reason": "One sentence for the teen explaining why it was approved"}
or
{"approved": false, "reason": "One friendly sentence explaining why it was declined and encouraging them to try another song"}`;

async function getSpotifyToken() {
  const creds = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${creds}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await res.json();
  return data.access_token;
}

async function searchSpotify(token, song, artist) {
  const q = encodeURIComponent(`track:${song} artist:${artist}`);
  const res = await fetch(
    `https://api.spotify.com/v1/search?q=${q}&type=track&limit=1`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  return data.tracks?.items?.[0] || null;
}

async function addToPlaylist(track) {
  // We need a user OAuth token with playlist-modify-public scope to add tracks.
  // The SPOTIFY_USER_TOKEN env var must be a long-lived token you refresh periodically,
  // or you can implement a full OAuth refresh flow (see SETUP.md for instructions).
  const res = await fetch(
    `https://api.spotify.com/v1/playlists/${process.env.SPOTIFY_PLAYLIST_ID}/tracks`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SPOTIFY_USER_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ uris: [track.uri] }),
    }
  );
  return res.ok;
}

async function reviewWithClaude(song, artist) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 200,
      system: RULES,
      messages: [
        {
          role: "user",
          content: `Song: "${song}" by ${artist}. Appropriate for a teen night playlist?`,
        },
      ],
    }),
  });

  const data = await res.json();
  const raw = data.content?.map((b) => b.text || "").join("") || "{}";
  const clean = raw.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const { song, artist, submitter } = body;

  if (!song?.trim() || !artist?.trim()) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Song title and artist are required." }),
    };
  }

  try {
    // 1. Claude review
    const review = await reviewWithClaude(song.trim(), artist.trim());

    if (!review.approved) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ status: "rejected", reason: review.reason }),
      };
    }

    // 2. Spotify search
    const token = await getSpotifyToken();
    const track = await searchSpotify(token, song.trim(), artist.trim());

    if (!track) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: "not_found",
          reason: `We couldn't find "${song}" by ${artist} on Spotify. Double-check the spelling and try again!`,
        }),
      };
    }

    // 3. Add to playlist
    const added = await addToPlaylist(track);

    if (!added) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: "error",
          reason: "Spotify rejected the add request. The user token may need refreshing — let a staff member know.",
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: "approved",
        reason: review.reason,
        track: {
          name: track.name,
          artist: track.artists.map((a) => a.name).join(", "),
          album: track.album.name,
          image: track.album.images?.[1]?.url || track.album.images?.[0]?.url,
          url: track.external_urls.spotify,
          submitter: submitter?.trim() || null,
          addedAt: new Date().toISOString(),
        },
      }),
    };
  } catch (err) {
    console.error("submit-song error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Server error. Please try again." }),
    };
  }
};
