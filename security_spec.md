# Security Specifications: Spotify Clone

This document sets up the Phase 0 Security Specifications for our Spotify Clone, specifying Data Invariants, the "Dirty Dozen" attacks, and the rules structure.

## 1. Data Invariants

1. **User Identity Invariant**: Users can only create, update, and delete their own playlists, tracks, and liked song records. The `ownerId` or parent collection `userId` must exactly match the authenticated `request.auth.uid`.
2. **Strict Document ID Formats**: Playlist and track document IDs must be clean alphanumeric coordinates, preventing ID Poisoning attacks.
3. **Temporal Integrity**: All creations must timestamp `createdAt` or `likedAt` using `request.time`.
4. **Field Constraints**: Strings like `title`, `artist`, and `description` are bounded in size to prevent memory-exhaustion or "Denial of Wallet" resource floods.

---

## 2. The "Dirty Dozen" Malicious Payloads

The following scenarios are designed to challenge our Zero-Trust ruleset:

### Case 1: Identity Spoofing (Write other's playlist)
*   **Actor**: Authenticated user `alice_uid`
*   **Attempt**: Creates a playlist document with spoofed `ownerId = "bob_uid"` to hijack resource quotas or deface Bob's profile.
*   **Expected Result**: `PERMISSION_DENIED`

### Case 2: Untrusted Creation (Anonymous write)
*   **Actor**: Unauthenticated Client
*   **Attempt**: Tries to create a playlist with valid parameters.
*   **Expected Result**: `PERMISSION_DENIED`

### Case 3: Update Defacement (State hijacking)
*   **Actor**: Authenticated user `alice_uid`
*   **Attempt**: Tries to update the title of a playlist owned by Bob (`bob_uid`).
*   **Expected Result**: `PERMISSION_DENIED`

### Case 4: Temporal Spoofing (Client timestamp manipulation)
*   **Actor**: Authenticated user `alice_uid`
*   **Attempt**: Tries to set custom `createdAt = "1970-01-01T00:00:00Z"` in a playlist.
*   **Expected Result**: `PERMISSION_DENIED` (must be `request.time`).

### Case 5: Resource Poisoning (Giant fields)
*   **Actor**: Authenticated user `alice_uid`
*   **Attempt**: Tries to create a playlist with a 1MB string title to inflate Firestore costs.
*   **Expected Result**: `PERMISSION_DENIED` (string size checked to be <= 128).

### Case 6: ID Poisoning (Path hacking)
*   **Actor**: Authenticated user `alice_uid`
*   **Attempt**: Tries to create a playlist where `playlistId` is `/../hacky/paths/or/extremely_long_junk_strings`.
*   **Expected Result**: `PERMISSION_DENIED` (ID matches `^[a-zA-Z0-9_\\-]+$`).

### Case 7: Liking other's tracks (Shared-state corruption)
*   **Actor**: Authenticated user `alice_uid`
*   **Attempt**: Creates a `likedSongs` document in Bob's list (`/users/bob_uid/likedSongs/song123`).
*   **Expected Result**: `PERMISSION_DENIED`.

### Case 8: Modifying immutable tracks (Track tampering)
*   **Actor**: Authenticated user `alice_uid`
*   **Attempt**: Updates a track inside Alice's playlist, modifying the `audioUrl` or `trackId` after it was already created.
*   **Expected Result**: `PERMISSION_DENIED` (Fields are immutable or restricted).

### Case 9: Read Scraping (Piecewise information leak)
*   **Actor**: Authenticated user `alice_uid`
*   **Attempt**: Reads Bob's liked songs or lists all files inside users privately owned collections without user-key constraints.
*   **Expected Result**: `PERMISSION_DENIED`.

### Case 10: State Shortcut (Bypassing fields lock)
*   **Actor**: Authenticated user `alice_uid`
*   **Attempt**: Updates a playlist to add un-whitelisted ghost parameters not matching the schema.
*   **Expected Result**: `PERMISSION_DENIED`.

### Case 11: Ghost Write (Track insertion into Bobby's records)
*   **Actor**: Authenticated user `alice_uid`
*   **Attempt**: Creates a track under Bob's playlist `/playlists/bob_playlist/tracks/track1`.
*   **Expected Result**: `PERMISSION_DENIED` (Master Gate pattern checks parent playlist owner).

### Case 12: Invariant Type Breaking (Float inside integer)
*   **Actor**: Authenticated user `alice_uid`
*   **Attempt**: Updates a playlist with `tracksCount = -5.4` or non-integer string types.
*   **Expected Result**: `PERMISSION_DENIED`.

---

## 3. Test Runner Mock Definition

The security tests will assert that any of these "Dirty Dozen" attempts fail. The rules file `firestore.rules` will implement the ultimate attribute defenses.
