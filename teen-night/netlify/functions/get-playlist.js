// netlify/functions/get-playlist.js
// Safely fetches recent tracks from your Spotify playlist.
// Uses client credentials (no user token needed for reading public playlists).

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

export const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
    // Cache for 30 seconds so rapid refreshes don't hammer Spotify
    "Cache-Control": "public, max-age=30",
  };

  try {
    const token = await getSpotifyToken();

    // Fetch the playlist with track details
    const res = await fetch(
      `https://api.spotify.com/v1/playlists/${process.env.SPOTIFY_PLAYLIST_ID}?fields=name,external_urls,images,tracks.items(added_at,track(name,artists,album(name,images),external_urls))&limit=50`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) {
      throw new Error(`Spotify returned ${res.status}`);
    }

    const data = await res.json();

    // Return most recently added first, last 20
    const tracks = (data.tracks?.items || [])
      .filter((item) => item?.track)
      .map((item) => ({
        name: item.track.name,
        artist: item.track.artists.map((a) => a.name).join(", "),
        album: item.track.album.name,
        image: item.track.album.images?.[1]?.url || item.track.album.images?.[0]?.url,
        url: item.track.external_urls.spotify,
        addedAt: item.added_at,
      }))
      .reverse() // most recent first
      .slice(0, 20);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        playlistName: data.name,
        playlistUrl: data.external_urls?.spotify,
        playlistImage: data.images?.[0]?.url,
        totalTracks: data.tracks?.items?.length || 0,
        tracks,
      }),
    };
  } catch (err) {
    console.error("get-playlist error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Could not load playlist." }),
    };
  }
};
