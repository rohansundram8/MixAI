import React, { useState } from "react";
import axios from "axios";

function App() {
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [mixedPlaylist, setMixedPlaylist] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleMix = async () => {
    setLoading(true);
    try {
      const response = await axios.post("http://localhost:8000/mix-playlist/", {
        playlist_url: playlistUrl
      });
      setMixedPlaylist(response.data.mixed_playlist);
    } catch (error) {
      console.error("Error mixing playlist:", error);
    }
    setLoading(false);
  };

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h1>AI DJ Mixer</h1>
      <input
        type="text"
        placeholder="Enter Spotify Playlist URL"
        value={playlistUrl}
        onChange={(e) => setPlaylistUrl(e.target.value)}
        style={{ padding: "10px", width: "300px" }}
      />
      <button onClick={handleMix} style={{ marginLeft: "10px", padding: "10px" }}>
        Mix Playlist
      </button>

      {loading && <p>Mixing in progress...</p>}

      {mixedPlaylist && (
        <div>
          <h2>Mixed Playlist</h2>
          <ul>
            {mixedPlaylist.map((track, index) => (
              <li key={index}>
                {track.name} - {track.artist}
                {track.preview && (
                  <audio controls>
                    <source src={track.preview} type="audio/mpeg" />
                    Your browser does not support the audio element.
                  </audio>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;
