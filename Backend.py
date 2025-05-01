from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from spotipy import Spotify
from spotipy.oauth2 import SpotifyOAuth
import uvicorn

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SPOTIPY_CLIENT_ID = ""
SPOTIPY_CLIENT_SECRET = ""
SPOTIPY_REDIRECT_URI = "http://localhost:8888/callback"
SCOPE = "streaming user-read-email user-read-private user-read-playback-state user-modify-playback-state playlist-read-private"

sp_oauth = SpotifyOAuth(
    client_id=SPOTIPY_CLIENT_ID,
    client_secret=SPOTIPY_CLIENT_SECRET,
    redirect_uri=SPOTIPY_REDIRECT_URI,
    scope=SCOPE
)

token_store = {}

class PlaylistRequest(BaseModel):
    playlist_url: str

@app.get("/login")
def login():
    url = sp_oauth.get_authorize_url()
    return {"auth_url": url}

@app.get("/callback")
def callback(request: Request):
    code = request.query_params.get("code")
    token_info = sp_oauth.get_access_token(code)
    token_store["access_token"] = token_info["access_token"]
    return RedirectResponse("http://localhost:3000")

@app.get("/token")
def get_token():
    return {"access_token": token_store.get("access_token")}

@app.post("/playlist")
def get_playlist_tracks(request: PlaylistRequest):
    access_token = token_store.get("access_token")
    if not access_token:
        return {"error": "User not authenticated"}

    sp = Spotify(auth=access_token)
    playlist_id = request.playlist_url.split("/")[-1].split("?")[0]
    results = sp.playlist_items(playlist_id)

    uris = []
    for item in results["items"]:
        track = item["track"]
        if track and track.get("uri"):
            uris.append(track["uri"])

    return {"uris": uris}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("Backend:app", host="0.0.0.0", port=8888, reload=True)