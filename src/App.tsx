import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Shuffle, Repeat, 
  Search, Home, Music, Heart, Sparkles, LogIn, LogOut, Plus, Trash2, 
  Share2, ListMusic, Headphones, Compass, RefreshCw, BarChart2, Check, ExternalLink 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  db, auth, googleProvider, OperationType, handleFirestoreError 
} from './firebase';
import { 
  collection, doc, setDoc, deleteDoc, getDocs, onSnapshot, query, where, addDoc, serverTimestamp, writeBatch 
} from 'firebase/firestore';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { Track, Playlist } from './types';
import AudioVisualizer from './components/AudioVisualizer';

// Preset high-fidelity royalty-free tracks for our default library
const DEFAULT_TRACK_RELIQUID: Track[] = [
  {
    trackId: 'track-default-1',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/95/6a/e4/956ae476-cda1-d112-9c98-4cbd63bd0ef2/m4a.aud.up.epub.ac.m4a',
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/83/c5/43/83c54326-bf31-2ff8-89c0-99939aae661b/10UMGIM10695.rgb.jpg/400x400bb.jpg',
    duration: 200,
    genre: 'Synth-Pop',
    vibeFactor: 'Original Clip'
  },
  {
    trackId: 'track-default-2',
    title: 'Shape of You',
    artist: 'Ed Sheeran',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/b0/78/3c/b0783c55-fb07-4e3d-0e36-79cfdb8fa707/m4a.aud.up.epub.ac.m4a',
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/64/46/76/64467666-4c48-18e3-0d5b-bf74718db0dc/190295851275.jpg/400x400bb.jpg',
    duration: 233,
    genre: 'Pop / Dance',
    vibeFactor: 'Original Clip'
  },
  {
    trackId: 'track-default-3',
    title: 'Stay',
    artist: 'The Kid LAROI & Justin Bieber',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/ef/cb/20/efcb2020-fc6d-ef72-9fa4-1dd052d9a941/m4a.aud.up.epub.ac.m4a',
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/bf/f4/f8/bff4f8fa-ec71-42cb-0d86-b485a08996b7/21UMGIM56687.rgb.jpg/400x400bb.jpg',
    duration: 141,
    genre: 'Pop-Rock',
    vibeFactor: 'Original Clip'
  },
  {
    trackId: 'track-default-4',
    title: 'As It Was',
    artist: 'Harry Styles',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview122/v4/37/10/7b/37107bad-3aa8-0eec-eac9-2ab1ef60e6f3/m4a.aud.up.epub.ac.m4a',
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/4a/04/ea/4a04ea30-8041-356c-fe6a-2ea5c20daacc/886449982422.jpg/400x400bb.jpg',
    duration: 167,
    genre: 'Indie Pop',
    vibeFactor: 'Original Clip'
  },
  {
    trackId: 'track-default-5',
    title: 'Starboy',
    artist: 'The Weeknd',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/5a/d3/4f/5ad34f26-bfa4-7e50-9856-82aeeb39a838/m4a.aud.up.epub.ac.m4a',
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/3d/8c/2a/3d8c2afd-36de-03db-edeb-032cb0396c21/16UMGIM61664.rgb.jpg/400x400bb.jpg',
    duration: 230,
    genre: 'R&B / Electronic',
    vibeFactor: 'Original Clip'
  },
  {
    trackId: 'track-default-6',
    title: 'Bad Habits',
    artist: 'Ed Sheeran',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/05/cf/81/05cf818c-3ca5-fc48-523c-ee8cd9a77a98/m4a.aud.up.epub.ac.m4a',
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/7b/82/cf/7b82cf21-889a-f435-01e4-b77da20f269d/190296656718.jpg/400x400bb.jpg',
    duration: 231,
    genre: 'Dance-Pop',
    vibeFactor: 'Original Clip'
  }
];

export default function App() {
  // Authentication states
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Playback control states
  const [currentTrack, setCurrentTrack] = useState<Track>(DEFAULT_TRACK_RELIQUID[0]);
  const [currentPlaylistName, setCurrentPlaylistName] = useState<string>("Spotify Gold Hits");
  const [tracksQueue, setTracksQueue] = useState<Track[]>(DEFAULT_TRACK_RELIQUID);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);

  // Database persistent states
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [likedSongIDs, setLikedSongIDs] = useState<string[]>([]);
  const [likedSongsFull, setLikedSongsFull] = useState<Track[]>([]);
  const [customPlaylistTracks, setCustomPlaylistTracks] = useState<{ [playlistId: string]: Track[] }>({});

  // Navigation states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedVibe, setSelectedVibe] = useState("");
  const [activeTab, setActiveTab] = useState<'home' | 'search' | 'library' | 'ai-dj'>('home');

  // AI DJ smart state
  const [aiDjConsoleInput, setAiDjConsoleInput] = useState("");
  const [aiDjCurating, setAiDjCurating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<{
    playlistTitle: string;
    playlistDescription: string;
    tracks: Track[];
  } | null>(null);
  const [aiSavingStatus, setAiSavingStatus] = useState<string | null>(null);

  // Sidebar toggle state & UI feedback
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [nowPlayingExpanded, setNowPlayingExpanded] = useState(true);
  const [customError, setCustomError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Audio References
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);

  // Dynamic greeting based on time of day
  const [greeting, setGreeting] = useState("Greetings");

  useEffect(() => {
    const hrs = new Date().getHours();
    if (hrs < 12) setGreeting("Good morning");
    else if (hrs < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  // Synchronize dynamic live search requests against the iTunes API
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchQuery)}&media=music&limit=25`);
        if (response.ok) {
          const data = await response.json();
          if (data.results) {
            const mapped: Track[] = data.results.map((item: any) => {
              let cover = item.artworkUrl100 || "";
              if (cover.includes("100x100bb")) {
                cover = cover.replace("100x100bb", "400x400bb");
              }
              return {
                trackId: `itunes-${item.trackId || Math.floor(Math.random() * 10000)}`,
                title: item.trackName || "Unknown Title",
                artist: item.artistName || "Unknown Artist",
                audioUrl: item.previewUrl || "",
                coverUrl: cover || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=60',
                duration: item.trackTimeMillis ? Math.round(item.trackTimeMillis / 1000) : 30,
                genre: item.primaryGenreName || "Pop Vibe",
                vibeFactor: "Original Clip"
              };
            }).filter((t: Track) => t.audioUrl && t.audioUrl.trim().length > 0);
            setSearchResults(mapped);
          }
        }
      } catch (err) {
        console.error("iTunes dynamic client fetch failed:", err);
      } finally {
        setSearchLoading(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Set up standard Audio element handlers
  useEffect(() => {
    const audio = new Audio(currentTrack.audioUrl);
    audio.volume = isMuted ? 0 : volume;
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || currentTrack.duration || 0);
    };

    const handleEnded = () => {
      handleNextTrack();
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    // If change current track and were playing, autoplay
    if (isPlaying) {
      audio.play().catch(err => console.log("Audio play deferred for user interaction", err));
    }

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentTrack]);

  // Handle playing state changes
  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.play().catch(err => {
        console.warn("Autoplay was blocked by browser. user interaction pending.", err);
        setIsPlaying(false);
      });
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  // Handle volume modifications
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  // Auth synchronization & Firestore bindings
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setAuthLoading(false);

      if (user) {
        console.log(`Successfully authenticated user: ${user.email} (${user.uid})`);
        
        // Bind private Liked Songs
        const likedQueryPath = `users/${user.uid}/likedSongs`;
        const qLiked = query(collection(db, likedQueryPath));
        const unsubLiked = onSnapshot(qLiked, (snapshot) => {
          const songsList: Track[] = [];
          const ids: string[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            songsList.push({
              trackId: data.songId,
              title: data.title,
              artist: data.artist,
              audioUrl: data.audioUrl,
              coverUrl: data.coverUrl,
              duration: data.duration,
              genre: data.genre || 'Vibe Tune',
              vibeFactor: data.vibeFactor || 'Smooth Beat'
            });
            ids.push(data.songId);
          });
          setLikedSongIDs(ids);
          setLikedSongsFull(songsList);
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, likedQueryPath);
        });

        // Bind user Playlists
        const playQueryPath = 'playlists';
        const qPlay = query(collection(db, playQueryPath), where('ownerId', '==', user.uid));
        const unsubPlay = onSnapshot(qPlay, (snapshot) => {
          const playlistCol: Playlist[] = [];
          snapshot.forEach((doc) => {
            const d = doc.data();
            playlistCol.push({
              id: doc.id,
              title: d.title,
              description: d.description || '',
              ownerId: d.ownerId,
              ownerName: d.ownerName || 'Spotify User',
              tracksCount: d.tracksCount || 0,
              createdAt: d.createdAt
            });

            // Bind single track subcollection dynamically
            const subTrackPath = `playlists/${doc.id}/tracks`;
            getDocs(collection(db, subTrackPath)).then((subSnap) => {
              const subTracks: Track[] = [];
              subSnap.forEach((tDoc) => {
                const td = tDoc.data();
                subTracks.push({
                  trackId: tDoc.id,
                  title: td.title,
                  artist: td.artist,
                  audioUrl: td.audioUrl,
                  coverUrl: td.coverUrl,
                  duration: td.duration,
                  genre: td.genre || 'Soundscape',
                  vibeFactor: td.vibeFactor || 'Flow'
                });
              });
              setCustomPlaylistTracks(prev => ({
                ...prev,
                [doc.id]: subTracks
              }));
            }).catch(subErr => console.error("Could not fetch playlist track elements", subErr));

          });
          setPlaylists(playlistCol);
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, playQueryPath);
        });

        return () => {
          unsubLiked();
          unsubPlay();
        };
      } else {
        // Fallback to local storage presets for guest users
        console.log("No authenticated credentials found. Pulling guest values from LocalStorage.");
        const localLiked = localStorage.getItem('spotify_guest_liked');
        if (localLiked) {
          try {
            const parsed = JSON.parse(localLiked) as Track[];
            setLikedSongsFull(parsed);
            setLikedSongIDs(parsed.map(p => p.trackId));
          } catch(e) {
            console.error("Local storage decoding failure", e);
          }
        }
        
        const localPlay = localStorage.getItem('spotify_guest_playlists');
        if (localPlay) {
          try {
            const parsed = JSON.parse(localPlay) as { playlist: Playlist, tracks: Track[] }[];
            setPlaylists(parsed.map(p => p.playlist));
            const trackMap: { [id: string]: Track[] } = {};
            parsed.forEach(p => {
              trackMap[p.playlist.id] = p.tracks;
            });
            setCustomPlaylistTracks(trackMap);
          } catch (e) {
            console.error(e);
          }
        }
      }
    }, (err) => {
      console.error("Authentication listener error:", err);
    });

    return () => unsubscribeAuth();
  }, [currentUser]);

  // Sign In / Sign Out actions
  const handleGoogleLogin = async () => {
    setAuthLoading(true);
    setCustomError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      triggerToast("Logged in with Google successfully!");
    } catch (err: any) {
      console.error("Sign-in popped error:", err);
      if (err && (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request')) {
         triggerToast("Sign-in was cancelled (popup closed).");
      } else {
         setCustomError(err.message || "Sign-in was cancelled or blocked.");
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleUserLogout = async () => {
    setAuthLoading(true);
    try {
      await signOut(auth);
      setLikedSongIDs([]);
      setLikedSongsFull([]);
      setPlaylists([]);
      setCustomPlaylistTracks({});
      triggerToast("Signed out of your Spotify profile.");
    } catch (err: any) {
      console.error(err);
    } finally {
      setAuthLoading(false);
    }
  };

  // Helper toaster triggers
  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => {
      setSuccessToast(null);
    }, 4000);
  };

  // Skip tracks forward
  const handleNextTrack = () => {
    if (isRepeat && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.log(e));
      return;
    }

    const currentIndex = tracksQueue.findIndex(t => t.trackId === currentTrack.trackId);
    let nextIndex = 0;

    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * tracksQueue.length);
    } else if (currentIndex !== -1 && currentIndex < tracksQueue.length - 1) {
      nextIndex = currentIndex + 1;
    }

    setCurrentTrack(tracksQueue[nextIndex]);
    setIsPlaying(true);
  };

  // Skip tracks backward
  const handlePrevTrack = () => {
    const currentIndex = tracksQueue.findIndex(t => t.trackId === currentTrack.trackId);
    let prevIndex = tracksQueue.length - 1;

    if (currentIndex > 0) {
      prevIndex = currentIndex - 1;
    }

    setCurrentTrack(tracksQueue[prevIndex]);
    setIsPlaying(true);
  };

  // Handle Liking / Disliking a song
  const handleToggleLikeSong = async (track: Track) => {
    const isLikedAlready = likedSongIDs.includes(track.trackId);

    if (currentUser) {
      const parentPath = `users/${currentUser.uid}/likedSongs`;
      const songDocRef = doc(db, parentPath, track.trackId);

      try {
        if (isLikedAlready) {
          await deleteDoc(songDocRef);
          triggerToast(`Removed "${track.title}" from your Liked Songs`);
        } else {
          await setDoc(songDocRef, {
            userId: currentUser.uid,
            songId: track.trackId,
            title: track.title,
            artist: track.artist,
            audioUrl: track.audioUrl,
            coverUrl: track.coverUrl || '',
            duration: track.duration || 180,
            likedAt: serverTimestamp(),
            genre: track.genre || 'Vibe Tune',
            vibeFactor: track.vibeFactor || 'Smooth Beat'
          });
          triggerToast(`Saved "${track.title}" to Liked Songs`);
        }
      } catch (error) {
        handleFirestoreError(error, isLikedAlready ? OperationType.DELETE : OperationType.CREATE, `${parentPath}/${track.trackId}`);
      }
    } else {
      // Guest LocalStorage fallback
      let updatedList = [...likedSongsFull];
      if (isLikedAlready) {
        updatedList = updatedList.filter(s => s.trackId !== track.trackId);
        triggerToast(`Removed "${track.title}" from guest local catalog.`);
      } else {
        updatedList.push(track);
        triggerToast(`Saved "${track.title}" in guest local profile! Sign-in to backup cloud.`);
      }

      setLikedSongsFull(updatedList);
      setLikedSongIDs(updatedList.map(s => s.trackId));
      localStorage.setItem('spotify_guest_liked', JSON.stringify(updatedList));
    }
  };

  // Add active custom playlist
  const handleCreateEmptyPlaylist = async (titleInput: string) => {
    if (!titleInput.trim()) return;
    const playlistId = `playlist-${Date.now()}`;

    if (currentUser) {
      const destPath = `playlists/${playlistId}`;
      try {
        await setDoc(doc(db, 'playlists', playlistId), {
          title: titleInput,
          description: "Curated user session playlist",
          ownerId: currentUser.uid,
          ownerName: currentUser.displayName || currentUser.email || 'Premium User',
          tracksCount: 0,
          createdAt: serverTimestamp()
        });
        triggerToast(`Created playlist "${titleInput}" in system vault.`);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, destPath);
      }
    } else {
      // Guest playlist creation
      const guestPlaylist: Playlist = {
        id: playlistId,
        title: titleInput,
        description: "Curated local playlist (Guest Profile)",
        ownerId: 'guest-uid',
        ownerName: 'Guest Music Curator',
        tracksCount: 0,
        createdAt: new Date().toISOString()
      };

      const updatedCol = [guestPlaylist, ...playlists];
      setPlaylists(updatedCol);
      setCustomPlaylistTracks(prev => ({
        ...prev,
        [playlistId]: []
      }));

      // Flush to localStorage
      const nestedMap = updatedCol.map(p => ({
        playlist: p,
        tracks: customPlaylistTracks[p.id] || []
      }));
      localStorage.setItem('spotify_guest_playlists', JSON.stringify(nestedMap));
      triggerToast(`Playlist "${titleInput}" generated locally.`);
    }
  };

  // Delete user playlist
  const handleDeletePlaylist = async (playlistId: string) => {
    const targetPlaylistName = playlists.find(p => p.id === playlistId)?.title || "Playlist";
    
    if (currentUser) {
      const refPath = `playlists/${playlistId}`;
      try {
        await deleteDoc(doc(db, 'playlists', playlistId));
        triggerToast(`Deleted playlist "${targetPlaylistName}".`);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, refPath);
      }
    } else {
      const updatedCol = playlists.filter(p => p.id !== playlistId);
      setPlaylists(updatedCol);
      const copyTracks = { ...customPlaylistTracks };
      delete copyTracks[playlistId];
      setCustomPlaylistTracks(copyTracks);

      const nestedMap = updatedCol.map(p => ({
        playlist: p,
        tracks: copyTracks[p.id] || []
      }));
      localStorage.setItem('spotify_guest_playlists', JSON.stringify(nestedMap));
      triggerToast(`Deleted playlist "${targetPlaylistName}".`);
    }
  };

  // Smart AI DJ playlist recommendations endpoint query
  const handleQueryAiDj = async () => {
    if (!aiDjConsoleInput.trim()) return;
    setAiDjCurating(true);
    setCustomError(null);
    setGeneratedResult(null);

    try {
      const response = await fetch('/api/ai-dj', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood: aiDjConsoleInput })
      });

      if (!response.ok) {
        throw new Error("DJ pipeline returned a network error. Attempting safe recovery.");
      }

      const rawData = await response.json();
      if (rawData && rawData.tracks) {
        setGeneratedResult({
          playlistTitle: rawData.playlistTitle || "AI Mood Curated Playlist",
          playlistDescription: rawData.playlistDescription || "Tuned beautifully to your description.",
          tracks: rawData.tracks
        });
        triggerToast("AI compilation completed successfully.");
      } else {
        throw new Error("Invalid playlist schema parsed from server response.");
      }
    } catch (e: any) {
      console.error(e);
      setCustomError("General suggestion error. Recovering automatically.");
    } finally {
      setAiDjCurating(false);
    }
  };

  // Save parsed AI generated playlist into user library
  const handleSaveAiPlaylistToLibrary = async () => {
    if (!generatedResult) return;
    setAiSavingStatus("saving");

    const playlistId = `ai-playlist-${Date.now()}`;

    if (currentUser) {
      try {
        // Step 1: Create Main Playlist Document
        const playlistDocRef = doc(db, 'playlists', playlistId);
        await setDoc(playlistDocRef, {
          title: generatedResult.playlistTitle,
          description: generatedResult.playlistDescription,
          ownerId: currentUser.uid,
          ownerName: currentUser.displayName || currentUser.email || 'Premium User',
          tracksCount: generatedResult.tracks.length,
          createdAt: serverTimestamp()
        });

        // Step 2: Create Subcollection Tracks sequentially to satisfy Relational Sync (Master Gate)
        for (let i = 0; i < generatedResult.tracks.length; i++) {
          const track = generatedResult.tracks[i];
          const subTrackDocRef = doc(db, `playlists/${playlistId}/tracks`, track.trackId);
          await setDoc(subTrackDocRef, {
            trackId: track.trackId,
            title: track.title,
            artist: track.artist,
            audioUrl: track.audioUrl,
            coverUrl: track.coverUrl || '',
            duration: track.duration || 180,
            genre: track.genre || 'AI Curation',
            vibeFactor: track.vibeFactor || 'Smart Vibe',
            addedAt: new Date().toISOString()
          });
        }

        setAiSavingStatus("success");
        triggerToast(`Successfully saved playlist "${generatedResult.playlistTitle}" to Cloud!`);
        setGeneratedResult(null);
      } catch (err) {
        console.error(err);
        setAiSavingStatus("error");
        setCustomError("Failed to synchronize playlist tracks batch on Firestore rules.");
      }
    } else {
      // Guest flow
      const guestPlaylist: Playlist = {
        id: playlistId,
        title: generatedResult.playlistTitle,
        description: generatedResult.playlistDescription + " (LocalStorage Mirror)",
        ownerId: 'guest-uid',
        ownerName: 'AI DJ Agent',
        tracksCount: generatedResult.tracks.length,
        createdAt: new Date().toISOString()
      };

      const updatedCol = [guestPlaylist, ...playlists];
      setPlaylists(updatedCol);

      const copyTracks = {
        ...customPlaylistTracks,
        [playlistId]: generatedResult.tracks
      };
      setCustomPlaylistTracks(copyTracks);

      const nestedMap = updatedCol.map(p => ({
        playlist: p,
        tracks: copyTracks[p.id] || []
      }));
      localStorage.setItem('spotify_guest_playlists', JSON.stringify(nestedMap));

      setAiSavingStatus("success");
      triggerToast(`Saved as "${generatedResult.playlistTitle}" under your guest profile!`);
      setGeneratedResult(null);
    }
  };

  // Fast track trigger selectors
  const handlePlaySelectedTrackList = (trackList: Track[], activeItem: Track, playlistTitle: string) => {
    setTracksQueue(trackList);
    setCurrentTrack(activeItem);
    setCurrentPlaylistName(playlistTitle);
    setIsPlaying(true);
  };

  // Scrubbing playback timestamp
  const handleProgressScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !audioRef.current || duration === 0) return;
    const rect = progressRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const fraction = clickX / width;
    const targetVal = fraction * duration;
    
    audioRef.current.currentTime = targetVal;
    setCurrentTime(targetVal);
  };

  // Seconds parser helper
  const formatTimeMinutes = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds) || !isFinite(timeInSeconds)) return "0:00";
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // Quick prompt presets for user convenience
  const PROMPT_PRESETS = [
    "Rainy Sunday Study Cafe", 
    "Fast Retro Synthwave Cyberpunk Run", 
    "High Intensity Dark Metal Workout",
    "Deep Ambient Chill Spa Meditation",
    "Summer Beach Party Acoustics"
  ];

  // Combined search filtering
  const filteredPresetTracks = DEFAULT_TRACK_RELIQUID.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.genre?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div id="spotify-root" className="min-h-screen bg-zinc-950 text-white flex flex-col font-sans select-none antialiased">
      
      {/* Top Warning Banner if any */}
      {customError && (
        <div className="bg-red-900/80 border-b border-red-800 text-red-100 px-4 py-2 text-xs font-mono flex justify-between items-center z-50">
          <span>⚠️ Server/Database Warning: {customError}</span>
          <button onClick={() => setCustomError(null)} className="text-white hover:text-red-300 font-bold ml-4">✕</button>
        </div>
      )}

      {/* Toast Notification Popups */}
      <AnimatePresence>
        {successToast && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed bottom-24 right-6 bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold text-xs uppercase px-4 py-3 rounded-md shadow-2xl flex items-center gap-2 z-50 transition-all border border-emerald-300/30"
          >
            <Check className="w-4 h-4 text-zinc-950 stroke-3" />
            <span>{successToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Structural Grid Container */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT NAV PANEL - Spotify Classic Sidebar */}
        <div id="sidebar-panel" className={`bg-black flex flex-col transition-all duration-300 overflow-hidden shrink-0 border-r border-zinc-900/60 ${sidebarOpen ? 'w-64 p-4' : 'w-0 p-0 pointer-events-none'}`}>
          
          {/* Main Title Badge */}
          <div className="flex items-center gap-2 px-2 py-3 mb-4">
            <div className="bg-[#1ed760] text-black w-8 h-8 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Headphones className="w-5 h-5" />
            </div>
            <span className="text-lg font-bold font-sans tracking-tight">Spotify<span className="text-[#1ed760] font-light">.AI</span></span>
            <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono px-1.5 py-0.5 rounded ml-auto">PRO</span>
          </div>

          {/* Nav Links Stack */}
          <div className="space-y-1 mb-6">
            <button 
              onClick={() => setActiveTab('home')} 
              className={`w-full flex items-center gap-3.5 px-3 py-2 rounded-md text-xs font-semibold tracking-wide transition-all ${activeTab === 'home' ? 'bg-zinc-800 text-[#1ed760]' : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'}`}
            >
              <Home className="w-4.5 h-4.5" />
              <span>Home Hub</span>
            </button>
            <button 
              onClick={() => setActiveTab('search')} 
              className={`w-full flex items-center gap-3.5 px-3 py-2 rounded-md text-xs font-semibold tracking-wide transition-all ${activeTab === 'search' ? 'bg-zinc-800 text-[#1ed760]' : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'}`}
            >
              <Search className="w-4.5 h-4.5" />
              <span>Search Library</span>
            </button>
            <button 
              onClick={() => setActiveTab('ai-dj')} 
              className={`w-full flex items-center gap-3.5 px-3 py-2 rounded-md text-xs font-semibold tracking-wide transition-all ${activeTab === 'ai-dj' ? 'bg-zinc-800 text-[#1ed760] ring-1 ring-emerald-500/20' : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'}`}
            >
              <Sparkles className="w-4.5 h-4.5 text-yellow-400" />
              <span className="flex items-center gap-2">
                <span>AI Smart DJ</span>
                <span className="text-[8px] bg-yellow-400/10 text-yellow-500 px-1 py-0.2 rounded font-mono font-bold animate-pulse">HOT</span>
              </span>
            </button>
          </div>

          <div className="h-px bg-zinc-900 my-2" />

          {/* User Playlist segment */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-2 py-2 mb-2 text-zinc-500">
              <span className="text-[10px] font-bold tracking-widest uppercase">My Custom Playlists</span>
              <button 
                onClick={() => {
                  const title = prompt("Specify title for your customized playlist:");
                  if (title) handleCreateEmptyPlaylist(title);
                }} 
                className="text-zinc-400 hover:text-white p-1 hover:bg-zinc-900 rounded transition-all"
                title="Create playlist"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* List scroll section */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
              
              {/* Liked Songs Segment Row */}
              <button 
                onClick={() => {
                  if (likedSongsFull.length === 0) {
                    triggerToast("Liked list is empty. Heart some gold tracks first!");
                    return;
                  }
                  setTracksQueue(likedSongsFull);
                  setCurrentTrack(likedSongsFull[0]);
                  setCurrentPlaylistName("My Liked Songs");
                  setIsPlaying(true);
                  triggerToast("Active queue updated to your Liked Songs");
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded hover:bg-zinc-900 transition-all text-xs text-left group"
              >
                <div className="w-6 h-6 rounded bg-gradient-to-br from-violet-700 to-indigo-900 flex items-center justify-center shadow">
                  <Heart className="w-3.5 h-3.5 text-white fill-white" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="font-medium text-zinc-200 truncate group-hover:text-white">Liked Songs</p>
                  <p className="text-[9px] text-[#1ed760] font-mono">{likedSongIDs.length} Gold Tracks</p>
                </div>
              </button>

              {playlists.length === 0 ? (
                <div className="text-center py-6 px-4">
                  <p className="text-[11px] text-zinc-500 font-medium">No customized playlists saved yet.</p>
                  <button 
                    onClick={() => handleCreateEmptyPlaylist(`Curator Set #${playlists.length + 1}`)}
                    className="mt-2 text-[10px] text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700 px-2.5 py-1 rounded transition-all"
                  >
                    Quick Add New
                  </button>
                </div>
              ) : (
                playlists.map((playlist) => {
                  const pTracks = customPlaylistTracks[playlist.id] || [];
                  return (
                    <div key={playlist.id} className="group relative rounded hover:bg-zinc-900 flex items-center justify-between pr-2 transition-all">
                      <button 
                        onClick={() => {
                          if (pTracks.length === 0) {
                            triggerToast(`"${playlist.title}" is empty currently. Run AI DJ to save compiled tracks here!`);
                            return;
                          }
                          setTracksQueue(pTracks);
                          setCurrentTrack(pTracks[0]);
                          setCurrentPlaylistName(playlist.title);
                          setIsPlaying(true);
                          triggerToast(`Loading play queue from "${playlist.title}"`);
                        }}
                        className="flex-1 flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-left overflow-hidden"
                      >
                        <div className="w-6 h-6 rounded bg-gradient-to-tr from-emerald-800 to-zinc-900 flex items-center justify-center font-bold font-mono text-[10px] text-emerald-400">
                          {playlist.title.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <p className="font-medium text-zinc-200 truncate group-hover:text-emerald-400">{playlist.title}</p>
                          <p className="text-[9px] text-zinc-500 truncate font-mono">
                            {pTracks.length} tracks • {playlist.ownerId === 'guest-uid' ? 'Guest Saved' : 'Cloud Saved'}
                          </p>
                        </div>
                      </button>

                      <button 
                        onClick={() => {
                          if (confirm(`Confirm deletion of playlist "${playlist.title}"?`)) {
                            handleDeletePlaylist(playlist.id);
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-red-400 transition-all rounded hover:bg-zinc-950"
                        title="Delete playlist"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Mini Info Panel for cloud status updates */}
          <div className="bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-900/60 text-left">
            <div className="flex items-center gap-1.5 text-[9px] font-mono tracking-widest text-[#1ed760] font-bold uppercase mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1ed760] inline-block animate-ping" />
              <span>DATABASE ACTIVE</span>
            </div>
            <p className="text-[10px] text-zinc-400 leading-relaxed font-sans">
              {currentUser ? 'Full dynamic backup live on Google runtime.' : 'Running local cache mode. Sign in with Google to enable Cloud sync!'}
            </p>
          </div>

        </div>

        {/* MIDDLE ACTIVE VIEWPORT */}
        <div className="flex-1 bg-gradient-to-b from-zinc-900 to-zinc-950 flex flex-col justify-between overflow-y-auto min-w-0 custom-scrollbar relative">
          
          {/* Header Action Bar */}
          <div className="sticky top-0 bg-transparent py-4 px-6 flex justify-between items-center z-10 backdrop-blur-md border-b border-zinc-900/30">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="bg-black/40 hover:bg-black/60 text-zinc-300 hover:text-white p-2 rounded-full transition-all border border-zinc-800/50"
                title="Toggle Sidebar"
              >
                <ListMusic className="w-4 h-4" />
              </button>
              
              <div className="flex items-center gap-2 bg-zinc-950/60 py-1.5 px-3 rounded-full border border-zinc-800/40 text-[11px] text-zinc-400 font-mono">
                <span className="text-[#1ed760]">● Connected:</span>
                <span>Active Cloud Run Ingress</span>
              </div>
            </div>

            {/* Profile Sign In status */}
            <div className="flex items-center gap-3">
              {authLoading ? (
                <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              ) : currentUser ? (
                <div className="flex items-center gap-3 bg-zinc-950/60 p-1.5 pr-3 rounded-full border border-zinc-800/50 hover:bg-zinc-900 transition-all">
                  {currentUser.photoURL ? (
                    <img referrerPolicy="no-referrer" src={currentUser.photoURL} alt={currentUser.displayName || ''} className="w-6 h-6 rounded-full" />
                  ) : (
                    <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center font-bold text-xs text-zinc-950 uppercase">
                      {currentUser.email?.charAt(0)}
                    </div>
                  )}
                  <div className="text-left hidden sm:block">
                    <p className="text-xs font-semibold text-zinc-200 truncate max-w-24">{currentUser.displayName || 'curator'}</p>
                    <p className="text-[8px] text-[#1ed760] font-mono truncate">Cloud Connected</p>
                  </div>
                  <button 
                    onClick={handleUserLogout}
                    className="text-zinc-400 hover:text-white p-1 hover:bg-zinc-800 rounded-full transition-all"
                    title="Sign Out Profile"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleGoogleLogin}
                  className="bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs px-4 py-2 rounded-full flex items-center gap-1.5 shadow-md shadow-zinc-100/10 transition-all uppercase tracking-wide cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5 stroke-3" />
                  <span>Connect Google</span>
                </button>
              )}
            </div>
          </div>

          {/* ACTIVE CONTAINER WRAPPERS */}
          <div className="flex-1 p-6 space-y-8">
            
            {/* TAB 1: HOME PANEL */}
            {activeTab === 'home' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                {/* Greeting Banner */}
                <div>
                  <h1 className="text-3xl font-extrabold tracking-tight mb-2 font-sans">{greeting}, Soumya</h1>
                  <p className="text-zinc-400 text-xs tracking-wide">
                    Explore high-performance dynamic streaming and smart procedural neural AI creations.
                  </p>
                </div>

                {/* AI DJ Promotion Bento Box */}
                <div className="p-6 rounded-xl bg-gradient-to-r from-emerald-950/60 via-zinc-900 to-violet-950/30 border border-emerald-500/10 flex flex-col md:flex-row gap-6 items-center justify-between shadow-2xl relative overflow-hidden">
                  <div className="absolute inset-0 bg-radial-gradient from-emerald-500/5 to-transparent pointer-events-none" />
                  <div className="space-y-3 z-10 max-w-xl text-center md:text-left">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono uppercase font-bold tracking-wider">
                      <Sparkles className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      <span>Smart Neurons DJ Curation</span>
                    </div>
                    <h2 className="text-xl font-bold tracking-tight">Need a custom vibe compiled in seconds?</h2>
                    <p className="text-zinc-400 text-xs leading-relaxed">
                      Type exactly how you feel (e.g., <span className="text-emerald-300 italic">"late night rain in Tokyo cafe with espresso beats"</span>) and let our backend Gemini agent curate metadata, tempo frequencies, and cover designs before saving to your cloud repository!
                    </p>
                    <div className="pt-2">
                      <button 
                        onClick={() => setActiveTab('ai-dj')}
                        className="bg-[#1ed760] hover:bg-[#1db954] text-black font-extrabold text-xs px-5 py-2.5 rounded-full shadow-lg shadow-emerald-500/20 active:scale-95 transition-all uppercase tracking-wider"
                      >
                        Launch AI Smart Creator
                      </button>
                    </div>
                  </div>
                  <div className="relative group max-w-[200px] shrink-0">
                    <img src="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=250&auto=format&fit=crop&q=80" alt="Cover" className="rounded-lg shadow-2xl rotate-3 group-hover:rotate-0 transition-transform duration-300 border border-zinc-800" />
                  </div>
                </div>

                {/* Grid Lists for default Tracks library */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold tracking-tight">Curated Spotify Gold Hits</h2>
                    <span className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">Verified Playable Audio Streams</span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {DEFAULT_TRACK_RELIQUID.map((track) => {
                      const isActiveSong = currentTrack.trackId === track.trackId;
                      return (
                        <div 
                          key={track.trackId}
                          onClick={() => handlePlaySelectedTrackList(DEFAULT_TRACK_RELIQUID, track, "Spotify Gold Hits")}
                          className={`bg-zinc-900/40 p-3 rounded-lg border hover:bg-zinc-850 transition-all cursor-pointer group text-left relative ${isActiveSong ? 'border-emerald-500 bg-zinc-850/60 ring-1 ring-emerald-500/20' : 'border-zinc-800/40'}`}
                        >
                          <div className="aspect-square w-full rounded overflow-hidden relative shadow mb-3">
                            <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                              <div className="bg-[#1ed760] p-2.5 rounded-full text-black shadow-lg shadow-emerald-500/20">
                                {isActiveSong && isPlaying ? <Pause className="w-4 h-4 text-black fill-black" /> : <Play className="w-4 h-4 text-black fill-black" />}
                              </div>
                            </div>
                            
                            {/* Animated Visualizer indicator when playing */}
                            {isActiveSong && isPlaying && (
                              <div className="absolute bottom-1 right-2 flex gap-0.5 bg-black/60 px-1 rounded">
                                <span className="w-1 h-3 bg-emerald-500 rounded animate-bounce" style={{ animationDelay: '0.1s' }} />
                                <span className="w-1 h-3 bg-emerald-500 rounded animate-bounce" style={{ animationDelay: '0.3s' }} />
                                <span className="w-1 h-3 bg-emerald-500 rounded animate-bounce" style={{ animationDelay: '0.5s' }} />
                              </div>
                            )}
                          </div>

                          <p className={`text-xs font-bold truncate ${isActiveSong ? 'text-[#1ed760]' : 'text-zinc-200'}`}>{track.title}</p>
                          <p className="text-[10px] text-zinc-500 truncate mt-0.5">{track.artist}</p>
                          
                          <div className="mt-2.5 flex justify-between items-center">
                            <span className="text-[8px] bg-zinc-800/60 text-zinc-400 font-mono px-1.5 py-0.5 rounded uppercase">{track.genre}</span>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleLikeSong(track);
                              }}
                              className="text-zinc-500 hover:text-[#1ed760] transition-all"
                            >
                              <Heart className={`w-3.5 h-3.5 ${likedSongIDs.includes(track.trackId) ? 'text-[#1ed760] fill-[#1ed760]' : ''}`} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Track Rows - Big Playable Catalog List */}
                <div className="space-y-4">
                  <h3 className="text-base font-bold tracking-tight text-left">Detailed Library Metadata</h3>
                  <div className="bg-black/25 rounded-lg border border-zinc-900/60 overflow-hidden">
                    
                    {/* Catalog Header Row */}
                    <div className="grid grid-cols-12 gap-4 px-4 py-2 border-b border-zinc-900/60 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-left font-mono">
                      <div className="col-span-1">#</div>
                      <div className="col-span-5">Title</div>
                      <div className="col-span-3">Genre</div>
                      <div className="col-span-2">Vibe Tag</div>
                      <div className="col-span-1 text-right">Dur</div>
                    </div>

                    {/* Catalog Item Stack */}
                    <div className="divide-y divide-zinc-900/40">
                      {DEFAULT_TRACK_RELIQUID.map((track, idx) => {
                        const isCurrent = currentTrack.trackId === track.trackId;
                        return (
                          <div 
                            key={track.trackId}
                            onClick={() => handlePlaySelectedTrackList(DEFAULT_TRACK_RELIQUID, track, "Spotify Gold Hits")}
                            className={`grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-zinc-900/40 cursor-pointer transition-all ${isCurrent ? 'bg-zinc-900/60' : ''}`}
                          >
                            {/* Play index indicator */}
                            <div className="col-span-1 text-zinc-500 text-xs font-mono text-left">
                              {isCurrent && isPlaying ? (
                                <span className="text-[#1ed760] animate-pulse">▶</span>
                              ) : (
                                <span>{idx + 1}</span>
                              )}
                            </div>

                            {/* Info */}
                            <div className="col-span-5 flex items-center gap-3 text-left">
                              <img src={track.coverUrl} className="w-8 h-8 rounded shadow shrink-0 object-cover" alt="Track Mini Cover" />
                              <div className="overflow-hidden">
                                <p className={`text-xs font-bold truncate ${isCurrent ? 'text-[#1ed760]' : 'text-zinc-200'}`}>{track.title}</p>
                                <p className="text-[10px] text-zinc-500 truncate">{track.artist}</p>
                              </div>
                            </div>

                            {/* Genre */}
                            <div className="col-span-3 text-left">
                              <span className="text-[10.5px] text-zinc-400 font-medium">{track.genre}</span>
                            </div>

                            {/* Vibe Tag */}
                            <div className="col-span-2 text-left">
                              <span className="text-[10.5px] text-emerald-500 font-mono font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">{track.vibeFactor}</span>
                            </div>

                            {/* Duration */}
                            <div className="col-span-1 text-right font-mono text-xs text-zinc-400">
                              {formatTimeMinutes(track.duration || 0)}
                            </div>

                          </div>
                        );
                      })}
                    </div>

                  </div>
                </div>

              </motion.div>
            )}

            {/* TAB 2: SEARCH CATALOG */}
            {activeTab === 'search' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div>
                  <h1 className="text-2xl font-bold tracking-tight mb-2 text-left">Search Live iTunes Catalog</h1>
                  <p className="text-zinc-400 text-xs text-left">Query millions of original tracks from Apple Music and play high-quality 30-second previews instantly.</p>
                </div>

                {/* Input block */}
                <div className="relative max-w-lg">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1ed760]" />
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search artists, songs, bands (e.g., Coldplay, Taylor Swift, Billie Eilish)..."
                    className="w-full bg-zinc-900 focus:bg-zinc-850 focus:ring-1 focus:ring-[#1ed760] font-sans text-xs px-10 py-3 rounded-full border border-zinc-800 focus:outline-none transition-all placeholder:text-zinc-500 text-white"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery("")}
                      className="absolute right-4.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs font-mono"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Loading state indicator */}
                {searchLoading ? (
                  <div className="py-20 text-center space-y-3">
                    <div className="w-10 h-10 border-4 border-[#1ed760] border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs font-mono uppercase text-[#1ed760] animate-pulse">Scanning iTunes Live Databases...</p>
                    <p className="text-[10px] text-zinc-500">Retrieving official preview clips, artwork, and meta channels...</p>
                  </div>
                ) : !searchQuery.trim() ? (
                  // Welcome state / Preset top hits
                  <div className="space-y-6 text-left">
                    <div>
                      <h3 className="text-xs font-mono font-bold text-zinc-500 uppercase tracking-widest mb-3">Suggested Quick Search Vibe</h3>
                      <div className="flex flex-wrap gap-2">
                        {["Imagine Dragons", "The Weeknd", "Lofi Beats", "Post Malone", "Daft Punk", "Acoustic Hits", "Retro 80s"].map((vibe) => (
                          <button 
                            key={vibe}
                            onClick={() => setSearchQuery(vibe)}
                            className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs px-3 py-1.5 rounded-full border border-zinc-800 transition-all active:scale-95"
                          >
                            🔍 {vibe}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="h-px bg-zinc-900/40" />

                    <div className="space-y-3">
                      <h3 className="text-xs font-mono font-bold text-zinc-500 uppercase tracking-widest">Trending Hits List</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {DEFAULT_TRACK_RELIQUID.map((track) => {
                          const isCurrent = currentTrack.trackId === track.trackId;
                          return (
                            <div 
                              key={track.trackId}
                              onClick={() => handlePlaySelectedTrackList(DEFAULT_TRACK_RELIQUID, track, "Trending Hits")}
                              className={`p-3 rounded-lg bg-zinc-900/50 border hover:bg-zinc-850 flex items-center justify-between cursor-pointer transition-all ${isCurrent ? 'border-emerald-500 bg-zinc-850' : 'border-zinc-800/40'}`}
                            >
                              <div className="flex items-center gap-3 overflow-hidden">
                                <img src={track.coverUrl} className="w-10 h-10 rounded object-cover shadow" alt="cover" />
                                <div className="text-left overflow-hidden">
                                  <p className={`text-xs font-bold truncate ${isCurrent ? 'text-[#1ed760]' : 'text-zinc-200'}`}>{track.title}</p>
                                  <p className="text-[10.5px] text-zinc-400 truncate">{track.artist}</p>
                                  <span className="text-[8px] bg-zinc-800 text-zinc-400 px-1 py-0.2 rounded uppercase font-mono mt-1 inline-block">{track.genre}</span>
                                </div>
                              </div>
                              <Play className="w-4 h-4 text-zinc-500 hover:text-[#1ed760] transition-colors" />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="py-12 text-center text-zinc-500">
                    <p className="text-xs">No tracks found matching "{searchQuery}"</p>
                    <p className="text-[10px] mt-1 text-zinc-650">Try checking spelling or trying general keywords (e.g., "Pop", "Rock").</p>
                  </div>
                ) : (
                  <div className="space-y-4 text-left">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold font-mono text-zinc-500 uppercase tracking-widest">iTunes Matches ({searchResults.length})</h3>
                      <span className="text-[9px] bg-[#1ed760]/10 text-[#1ed760] border border-[#1ed760]/20 px-2 py-0.5 rounded font-mono uppercase font-bold">100% Genuine Stream Clips</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {searchResults.map((track) => {
                        const isCurrent = currentTrack.trackId === track.trackId;
                        return (
                          <div 
                            key={track.trackId}
                            onClick={() => handlePlaySelectedTrackList(searchResults, track, "Search Results")}
                            className={`p-3 rounded-lg bg-zinc-900 hover:bg-zinc-850 flex items-center justify-between cursor-pointer transition-all border ${isCurrent ? 'border-emerald-500 bg-zinc-850/65 ring-1 ring-emerald-500/10' : 'border-zinc-800/40'}`}
                          >
                            <div className="flex items-center gap-3 overflow-hidden">
                              <img src={track.coverUrl} className="w-10 h-10 rounded object-cover shadow" alt="cover" />
                              <div className="overflow-hidden text-left">
                                <p className={`text-xs font-bold truncate ${isCurrent ? 'text-[#1ed760]' : 'text-zinc-200'}`}>{track.title}</p>
                                <p className="text-[10.5px] text-zinc-400 truncate">{track.artist}</p>
                                <div className="flex gap-1.5 mt-1">
                                  <span className="text-[8px] bg-zinc-800 text-zinc-400 px-1 py-0.2 rounded uppercase font-mono">{track.genre}</span>
                                  <span className="text-[8px] bg-[#1ed760]/10 text-[#1ed760] px-1 py-0.2 rounded font-mono font-bold">30 SEC REAL CLIP</span>
                                </div>
                              </div>
                            </div>

                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleLikeSong(track);
                              }}
                              className="text-zinc-500 hover:text-[#1ed760] p-1.5 rounded bg-zinc-950/40 hover:bg-zinc-900 transition-colors ml-2"
                            >
                              <Heart className={`w-4 h-4 ${likedSongIDs.includes(track.trackId) ? 'text-[#1ed760] fill-[#1ed760]' : ''}`} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </motion.div>
            )}

            {/* TAB 3: AI DJ SMART MAKER */}
            {activeTab === 'ai-dj' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6 max-w-4xl mx-auto"
              >
                
                {/* Header Block and Title */}
                <div className="text-center space-y-2">
                  <div className="inline-flex p-3 rounded-full bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 mb-2">
                    <Sparkles className="w-8 h-8 filter drop-shadow-[0_0_10px_rgba(250,204,21,0.4)]" />
                  </div>
                  <h1 className="text-3xl font-extrabold tracking-tight font-sans">Neural AI DJ Curation</h1>
                  <p className="text-zinc-400 text-xs max-w-xl mx-auto">
                    Type a situation, location, movie scenery, or exact physical emotional frequency, and see the Gemini neural brain generate a Spotify-ready title, track collection, and custom durations.
                  </p>
                </div>

                {/* Main Action Form Panel */}
                <div className="bg-zinc-900/60 rounded-xl p-6 border border-zinc-800/60 space-y-4">
                  <div className="text-left space-y-1.5">
                    <label className="text-[10px] font-mono font-bold tracking-widest text-[#1ed760] uppercase">What vibe are we aiming for today?</label>
                    
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={aiDjConsoleInput}
                        onChange={(e) => setAiDjConsoleInput(e.target.value)}
                        placeholder="e.g., Chill lofi beats for raining evening study cafe with soft piano"
                        className="flex-1 bg-black/60 focus:bg-black focus:ring-1 focus:ring-[#1ed760] text-xs px-4 py-3 rounded-lg border border-zinc-800 focus:outline-none transition-all placeholder:text-zinc-600"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleQueryAiDj();
                        }}
                      />
                      <button 
                        onClick={handleQueryAiDj}
                        disabled={aiDjCurating || !aiDjConsoleInput.trim()}
                        className="bg-[#1ed760] hover:bg-[#1db954] text-black font-extrabold text-xs px-6 py-3 rounded-lg shadow-lg shadow-emerald-500/10 active:scale-95 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:shadow-none transition-all cursor-pointer select-none shrink-0"
                      >
                        {aiDjCurating ? "Curation Active..." : "CURATE NOW"}
                      </button>
                    </div>
                  </div>

                  {/* Preset Buttons Stack */}
                  <div className="space-y-2 text-left">
                    <p className="text-[9px] font-mono text-zinc-500 tracking-widest uppercase">Quick Preset Suggestions:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {PROMPT_PRESETS.map((p) => (
                        <button 
                          key={p} 
                          onClick={() => setAiDjConsoleInput(p)}
                          className="text-[10px] bg-zinc-950/60 hover:bg-zinc-800 text-zinc-400 hover:text-white px-3 py-1.5 rounded-full border border-zinc-800/60 transition-all"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Loading Status with reassure list */}
                {aiDjCurating && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-12 text-center space-y-4"
                  >
                    <div className="w-10 h-10 border-4 border-[#1ed760] border-t-transparent rounded-full animate-spin mx-auto" />
                    <div className="space-y-1">
                      <p className="text-xs font-bold font-mono uppercase text-[#1ed760] animate-pulse">Running smart backend compilation agent...</p>
                      <p className="text-[10px] text-zinc-500">Mapping durations, parsing tempo targets, and rendering covers...</p>
                    </div>
                  </motion.div>
                )}

                {/* Results Screen */}
                {generatedResult && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl text-left space-y-6"
                  >
                    
                    {/* Header info */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-zinc-800">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[#1ed760] text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 uppercase tracking-widest">AI COMPILED</span>
                          <span className="text-zinc-500 font-mono text-[9px]">{Date.now().toString().slice(-4)} VERSION</span>
                        </div>
                        <h2 className="text-xl font-bold tracking-tight text-white">{generatedResult.playlistTitle}</h2>
                        <p className="text-zinc-400 text-xs italic">{generatedResult.playlistDescription}</p>
                      </div>

                      <button 
                        onClick={handleSaveAiPlaylistToLibrary}
                        disabled={aiSavingStatus === 'saving'}
                        className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-extrabold text-xs px-5 py-3 rounded-full flex items-center gap-2 transition-all active:scale-95 border border-emerald-400/25 shrink-0"
                      >
                        <Plus className="w-4 h-4 text-zinc-950 stroke-3" />
                        <span>{aiSavingStatus === 'saving' ? 'SAVING SYNC...' : 'SAVE TO MY LIBRARY'}</span>
                      </button>
                    </div>

                    {/* Tracks Generated Display */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-mono tracking-widest uppercase text-zinc-500">Track List metadata</h4>
                      
                      <div className="space-y-2">
                        {generatedResult.tracks.map((track, trackIdx) => {
                          return (
                            <div 
                              key={track.trackId}
                              onClick={() => {
                                handlePlaySelectedTrackList(generatedResult.tracks, track, generatedResult.playlistTitle);
                                triggerToast(`Playing: "${track.title}" from AI set`);
                              }}
                              className="p-2.5 rounded-md hover:bg-zinc-850 bg-zinc-950/40 border border-zinc-800/10 flex items-center justify-between cursor-pointer transition-all group"
                            >
                              <div className="flex items-center gap-3 overflow-hidden">
                                <span className="font-mono text-zinc-650 text-xs w-4 group-hover:text-[#1ed760]">0{trackIdx + 1}</span>
                                <img src={track.coverUrl} className="w-8 h-8 rounded shrink-0 object-cover" alt="Cover" />
                                <div className="text-left overflow-hidden">
                                  <p className="text-xs font-bold text-zinc-200 group-hover:text-[#1ed760] truncate">{track.title}</p>
                                  <p className="text-[10.5px] text-zinc-500 truncate">{track.artist}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="text-[9px] bg-zinc-800 font-mono text-zinc-400 px-1.5 py-0.5 rounded">{track.genre}</span>
                                <span className="text-xs font-mono text-zinc-400">{formatTimeMinutes(track.duration || 0)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </motion.div>
                )}

              </motion.div>
            )}

          </div>

          {/* PERSISTENT FOOTER MUSIC PLAYER CONTROLS */}
          <div id="footer-playback-bar" className="bg-zinc-900 border-t border-zinc-850 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 z-40 relative">
            
            {/* Left Column: Cover art and title */}
            <div className="flex items-center gap-3 shrink-0 w-full sm:w-1/4 text-left">
              <img src={currentTrack.coverUrl} alt={currentTrack.title} className="w-11 h-11 rounded object-cover shadow border border-zinc-800/40 shrink-0" />
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-zinc-100 truncate hover:underline cursor-pointer">{currentTrack.title}</p>
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="text-[10px] text-zinc-400 truncate hover:underline hover:text-white cursor-pointer">{currentTrack.artist}</span>
                  <span className="text-[8px] bg-zinc-800 text-[#1ed760] px-1 py-0.1 font-mono rounded inline-block scroll-ml-0.5">{currentPlaylistName}</span>
                </div>
              </div>

              <button 
                onClick={() => handleToggleLikeSong(currentTrack)} 
                className="text-zinc-500 hover:text-white p-1 ml-2 transition-all shrink-0"
              >
                <Heart className={`w-4.5 h-4.5 ${likedSongIDs.includes(currentTrack.trackId) ? 'text-[#1ed760] fill-[#1ed760]' : ''}`} />
              </button>
            </div>

            {/* Middle Column: Player Controls */}
            <div className="flex-1 max-w-xl w-full flex flex-col items-center gap-2">
              
              {/* Media Button stack */}
              <div className="flex items-center gap-5">
                <button 
                  onClick={() => setIsShuffle(!isShuffle)}
                  className={`text-zinc-400 hover:text-white transition-all ${isShuffle ? 'text-[#1ed760]' : ''}`}
                  title="Shuffle"
                >
                  <Shuffle className="w-4 h-4" />
                </button>
                <button 
                  onClick={handlePrevTrack}
                  className="text-zinc-400 hover:text-white transition-all"
                  title="Previous Track"
                >
                  <SkipBack className="w-4.5 h-4.5" />
                </button>
                
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="bg-white hover:scale-105 hover:bg-zinc-100 text-black p-2.5 rounded-full shadow transition-all duration-150 relative active:scale-90"
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause className="w-5 h-5 text-zinc-950 fill-zinc-950 stroke-2" /> : <Play className="w-5 h-5 text-zinc-950 fill-zinc-950 stroke-2 ml-0.5" />}
                </button>

                <button 
                  onClick={handleNextTrack}
                  className="text-zinc-400 hover:text-white transition-all"
                  title="Next Track"
                >
                  <SkipForward className="w-4.5 h-4.5" />
                </button>
                <button 
                  onClick={() => setIsRepeat(!isRepeat)}
                  className={`text-zinc-400 hover:text-white transition-all ${isRepeat ? 'text-[#1ed760]' : ''}`}
                  title="Repeat Track"
                >
                  <Repeat className="w-4 h-4" />
                </button>
              </div>

              {/* Progress track bar slider */}
              <div className="w-full flex items-center gap-2">
                <span className="text-[10px] font-mono text-zinc-500">{formatTimeMinutes(currentTime)}</span>
                
                {/* Custom scrub layout */}
                <div 
                  ref={progressRef}
                  onClick={handleProgressScrub}
                  className="flex-1 h-1 bg-zinc-800 rounded-full cursor-pointer relative group transition-all hover:h-1.5"
                >
                  <div 
                    className="absolute left-0 top-0 h-full bg-[#1ed760] rounded-full group-hover:bg-[#1db954]"
                    style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                  />
                  <div 
                    className="absolute w-2.5 h-2.5 rounded-full bg-white opacity-0 group-hover:opacity-100 -top-0.5 -translate-x-1/2 cursor-grab"
                    style={{ left: `${(currentTime / (duration || 1)) * 100}%` }}
                  />
                </div>

                <span className="text-[10px] font-mono text-zinc-500">{formatTimeMinutes(duration)}</span>
              </div>

            </div>

            {/* Right Column: Dynamic Visualizer, Volume and toggle */}
            <div className="shrink-0 w-full sm:w-1/4 flex items-center justify-end gap-3.5">
              
              {/* Dynamic glowing wave container inside the player */}
              <div className="hidden lg:block w-36 overflow-hidden">
                <AudioVisualizer isPlaying={isPlaying} audioRef={audioRef} />
              </div>

              {/* Volume icon trigger */}
              <div className="flex items-center gap-2 group/vol">
                <button 
                  onClick={() => setIsMuted(!isMuted)}
                  className="text-zinc-400 hover:text-white transition-all"
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4" />}
                </button>
                
                <input 
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    const nextVal = parseFloat(e.target.value);
                    setVolume(nextVal);
                    if (nextVal > 0) setIsMuted(false);
                  }}
                  className="w-16 accent-[#1ed760] h-1 bg-zinc-800 rounded-full cursor-pointer opacity-80 group-hover/vol:opacity-100"
                />
              </div>

            </div>

          </div>

        </div>

        {/* RIGHT SIDEBAR - NOW PLAYING / LYRIC ANALYSIS DETAIL */}
        <div id="lyrics-drawer" className={`bg-black flex flex-col border-l border-zinc-900/60 overflow-hidden transition-all duration-300 ${nowPlayingExpanded ? 'w-72 p-4' : 'w-0 p-0 pointer-events-none'}`}>
          <div className="flex items-center justify-between text-zinc-400 text-xs pb-3 border-b border-zinc-900">
            <span className="font-mono uppercase font-bold text-[9px] tracking-widest">Active Neural lyrics</span>
            <button 
              onClick={() => setNowPlayingExpanded(false)} 
              className="text-zinc-500 hover:text-white hover:bg-zinc-900/60 p-1 rounded transition-all"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-5 py-4 text-left custom-scrollbar">
            
            <div className="space-y-1">
              <h3 className="font-bold text-sm tracking-tight text-white">{currentTrack.title}</h3>
              <p className="text-zinc-500 text-xs">{currentTrack.artist}</p>
            </div>

            {/* Generated lyrics dynamic mapping */}
            <div className="p-3 bg-zinc-950/40 rounded border border-zinc-900/60 space-y-4">
              <div className="flex items-center gap-1 text-[9px] font-mono text-zinc-500 tracking-widest uppercase">
                <Compass className="w-3.5 h-3.5 text-emerald-500" />
                <span>AI interpretation details</span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed italic select-text">
                "As the acoustic keys sweep, the frequency is calculated to resemble a dynamic journey. This instrumental soundscape builds a cozy envelope, perfect for high productivity or evening relaxation."
              </p>
              
              <div className="text-[10px] text-zinc-500 space-y-1">
                <div className="flex justify-between">
                  <span>Playback Sample:</span>
                  <span className="text-[#1ed760] font-mono">44.1 kHz</span>
                </div>
                <div className="flex justify-between">
                  <span>Vibe Energy Score:</span>
                  <span className="text-[#1ed760] font-mono">{currentTrack.vibeFactor || '98% Flow'}</span>
                </div>
              </div>
            </div>

            {/* Custom AI recommendations context */}
            <div className="bg-zinc-950/20 p-3 rounded border border-zinc-805 text-[11.5px] leading-relaxed text-zinc-400">
              <span className="text-white font-semibold">Curation tip:</span> You can curatively update your tracks at any time. When you saves custom layouts in library, all additions sync directly under your unique authentication coordinates, respecting strict Zero-Trust attributes!
            </div>

          </div>

          <button 
            onClick={() => {
              const dummyShareLink = `${window.location.origin}/share/track/${currentTrack.trackId}`;
              navigator.clipboard.writeText(dummyShareLink);
              triggerToast("Copied track share coordinates to clipboard!");
            }}
            className="w-full mt-4 bg-zinc-900 hover:bg-zinc-850 text-zinc-200 text-xs font-bold py-2.5 rounded-lg border border-zinc-800 transition-all flex items-center justify-center gap-1.5"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Copy Track URL</span>
          </button>
        </div>

      </div>

    </div>
  );
}
