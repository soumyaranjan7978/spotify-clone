export interface Track {
  trackId: string;
  title: string;
  artist: string;
  audioUrl: string;
  coverUrl?: string;
  duration?: number; // duration in seconds
  genre?: string;
  vibeFactor?: string;
}

export interface Playlist {
  id: string;
  title: string;
  description?: string;
  ownerId: string;
  ownerName?: string;
  tracksCount: number;
  createdAt: any; // Firebase Timestamp or ISO string
}
