# Tile Media Card

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://hacs.xyz/docs/faq/custom_repositories/)
[![Open your Home Assistant instance and add this repository to HACS.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=nickclark7&repository=tile-media-card&category=plugin)

A Lovelace media player card for Home Assistant that looks and behaves like HA's
own native tile card — same control row, same volume slider style — just built
around a big cover art tile, with an in-dashboard media browser that plays whole
albums, artists, and playlists without leaving the page.

Built for a Music Assistant-backed `media_player` entity, but works with any
`media_player` that supports `browse_media`.

<table>
<tr>
<td><img src="https://github.com/user-attachments/assets/ae90b611-ac29-4c18-9a99-a3c07ef9d37a" height="300"/></td>
<td><img src="https://github.com/user-attachments/assets/47805ad6-08b7-4a3f-89f0-536e4541efe6" height="300"/></td>
<td><img src="https://github.com/user-attachments/assets/28d7dacd-cb93-4e7e-a4fc-df822e1d23fb" height="300"/></td>
<td><img src="https://github.com/user-attachments/assets/ee8eac52-fe60-47df-89fb-8a91380d5096" height="300"/></td>
</tr>
</table>


## Why

Home Assistant's built-in tile card doesn't have a media-player-focused layout
with real browsing baked in ([feature request thread](https://community.home-assistant.io/t/tile-card-feature-for-media-players/496734)).
Most existing custom media cards go a different direction — minimalist compact
rows ([mini-media-player](https://github.com/kalkih/mini-media-player)) or a
fully custom skin (Sonos/Spotify-style clones). This card instead matches HA's
native tile card design language, scaled up, with a real album-art hero and a
browse-and-play overlay built in.

## Features

- Big cover art with title/artist overlay
- Tile-card-style playback controls: previous / play-pause / stop / next
- Volume slider matching HA's native tile card
- In-dashboard "Browse" button — opens an overlay (no navigation away from the
  dashboard) to browse your media library
- Selecting an artist/album/playlist plays the whole thing, not just one track
- `hide_art_when_idle` — collapse to just controls + volume when nothing is playing
- Grid-native sizing (`grid_options.rows: "auto"`) — the card grows/shrinks with
  its actual content instead of needing a fixed height
- Uses HA's proxied `entity_picture_local` when available, so album art loads
  correctly under HTTPS dashboards / the HA mobile app / kiosk browsers, even
  when the underlying media source (e.g. Music Assistant) only serves plain
  HTTP image URLs

## Installation

### HACS (custom repository)

Click the "Open your Home Assistant instance" badge above for a one-click add, or do it manually:

1. HACS → the ⋮ menu → **Custom repositories**
2. Add this repo URL, category **Dashboard**
3. Install **Tile Media Card**, then add the resource if HACS doesn't do it
   automatically

Not familiar with custom repositories? See HACS's [Custom repositories guide](https://hacs.xyz/docs/faq/custom_repositories/).

### Manual

1. Copy `tile-media-card.js` into `<config>/www/tile-media-card/`
2. Add it as a Lovelace resource:
   ```yaml
   url: /local/tile-media-card/tile-media-card.js
   type: module
   ```

## Usage

Add a card with type `custom:tile-media-card`:

```yaml
type: custom:tile-media-card
entity: media_player.living_room
hide_art_when_idle: false
grid_options:
  columns: 12
  rows: auto
```

| Option | Description | Default |
|---|---|---|
| `entity` | `media_player` entity (required) | — |
| `hide_art_when_idle` | Hide the cover art block when nothing is playing | `false` |
| `hide_titles` | Array of substrings — browse items whose title contains one are hidden | `[]` |
| `hide_media_classes` | Array of `media_class` values to hide from the browser | `[]` |

Or configure it visually through the card editor (add card → search "Tile Media Card").

## License

MIT
