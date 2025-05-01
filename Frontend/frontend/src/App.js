import React, { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";

function App() {
  const [accessToken, setAccessToken] = useState(null);
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [playlistUris, setPlaylistUris] = useState([]);
  const [trackDurations, setTrackDurations] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playerReady, setPlayerReady] = useState(false);
  const [loadingToken, setLoadingToken] = useState(true);
  const [showStartButton, setShowStartButton] = useState(false);
  const playerRef = useRef(null);
  const deviceIdRef = useRef(null);
  const fadeTimer = useRef(null);
  const trackTimer = useRef(null);

  const fetchToken = useCallback(async () => {
    try {
      const res = await axios.get("http://localhost:8888/token");
      if (res.data.access_token) setAccessToken(res.data.access_token);
    } catch (err) {
      console.error("Token fetch error:", err);
    } finally {
      setLoadingToken(false);
    }
  }, []);

  const playTrack = useCallback(
    async (uri, index) => {
      if (!uri || !accessToken || !deviceIdRef.current) return;

      try {
        await axios.put(
          `https://api.spotify.com/v1/me/player/play?device_id=${deviceIdRef.current}`,
          { uris: [uri] },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        const duration = trackDurations[index] || 30000; // fallback 30s
        const timeToFade = duration - 6000;

        clearTimeout(trackTimer.current);
        clearInterval(fadeTimer.current);

        trackTimer.current = setTimeout(() => {
          let volume = 1.0;
          fadeTimer.current = setInterval(() => {
            volume -= 0.05;
            if (volume <= 0) {
              clearInterval(fadeTimer.current);
              if (index + 1 < playlistUris.length) {
                setCurrentIndex((prev) => prev + 1);
              }
            } else {
              try {
                playerRef.current.setVolume(Math.max(0, volume));
              } catch (err) {
                console.warn("Fade error:", err);
              }
            }
          }, 250); // 5s fade
        }, timeToFade);
      } catch (err) {
        console.error("Playback error:", err);
      }
    },
    [accessToken, playlistUris, trackDurations]
  );

  const handlePlaylistSubmit = async () => {
    try {
      const res = await axios.post("http://localhost:8888/playlist", {
        playlist_url: playlistUrl,
      });

      const uris = res.data.uris.map((t) => t.uri || t); // supports both formats
      const durations = res.data.uris.map((t) => t.duration_ms || 30000);

      setPlaylistUris(uris);
      setTrackDurations(durations);
      setCurrentIndex(0);
    } catch (err) {
      console.error("Playlist fetch error:", err);
    }
  };

  const handleStartDJ = async () => {
    setShowStartButton(false);
    if (playlistUris.length > 0) {
      await playTrack(playlistUris[0], 0);
    }
  };

  useEffect(() => {
    fetchToken();
    const interval = setInterval(fetchToken, 2000);
    return () => clearInterval(interval);
  }, [fetchToken]);

  useEffect(() => {
    if (
      playlistUris.length > 0 &&
      currentIndex < playlistUris.length &&
      !showStartButton
    ) {
      playTrack(playlistUris[currentIndex], currentIndex);
    }
  }, [currentIndex, playlistUris, playTrack, showStartButton]);

  useEffect(() => {
    if (accessToken && typeof window.Spotify !== "undefined") {
      const player = new window.Spotify.Player({
        name: "AI DJ Player",
        getOAuthToken: (cb) => cb(accessToken),
        volume: 1.0,
      });

      player.addListener("ready", ({ device_id }) => {
        deviceIdRef.current = device_id;
        setPlayerReady(true);
        setShowStartButton(true);

        axios.put(
          "https://api.spotify.com/v1/me/player",
          { device_ids: [device_id], play: false },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );
      });

      player.connect();
      playerRef.current = player;
    }
  }, [accessToken]);

  return (
    <div style={{ textAlign: "center", padding: "40px" }}>
      <h1>🎧 AI DJ Player</h1>

      {loadingToken ? (
        <p>Loading authentication...</p>
      ) : !accessToken ? (
        <button
          onClick={async () => {
            const res = await axios.get("http://localhost:8888/login");
            window.location.href = res.data.auth_url;
          }}
          style={{ padding: "10px 20px" }}
        >
          Login with Spotify
        </button>
      ) : !playerReady ? (
        <p>Initializing player...</p>
      ) : showStartButton ? (
        <>
          <p>Enter a Spotify playlist URL:</p>
          <input
            type="text"
            value={playlistUrl}
            onChange={(e) => setPlaylistUrl(e.target.value)}
            style={{ width: "400px", padding: "10px" }}
            placeholder="https://open.spotify.com/playlist/..."
          />
          <button
            onClick={handlePlaylistSubmit}
            style={{ marginLeft: "10px", padding: "10px" }}
          >
            Load Playlist
          </button>
          {playlistUris.length > 0 && (
            <div style={{ marginTop: "30px" }}>
              <button
                onClick={handleStartDJ}
                style={{ padding: "12px 24px", fontSize: "16px", marginTop: "10px" }}
              >
                Start DJ Set
              </button>
            </div>
          )}
        </>
      ) : (
        <p>Playing DJ set...</p>
      )}
    </div>
  );
}

export default App;
