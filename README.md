# Jim Media Player

A local-first media player built with React that runs entirely in your browser. No server, no cloud — just your music and your device.

![License](https://img.shields.io/badge/license-MIT-blue.svg)

## Features

- **Library Browser**: Browse by artist → album → track hierarchy
- **Search**: Find songs, albums, or artists instantly
- **Now Playing Queue**: Add tracks, drag to reorder, remove songs
- **Drag & Drop**: Drag individual tracks or entire albums to the queue
- **Playlists**: Create, save, load, rename, and delete playlists
- **Resizable Panels**: Adjust library/queue layout to your preference
- **5-Band EQ**: Adjustable equalizer with presets (Flat, Bass Boost, Rock, etc.)
- **Volume Normalization**: Keeps volume consistent across tracks
- **Mobile-Friendly**: Works on Android phones with USB-OTG drives
- **PWA Support**: Install as an app on desktop or mobile

## Quick Start

### Prerequisites

- Node.js 18+ installed
- A modern browser (Chrome or Edge recommended for File System Access API)

### Installation

```bash
# Clone the repository
git clone https://github.com/jspellos/music-player.git
cd music-player

# Install dependencies
npm install

# Start development server
npm run dev
```

Open `http://localhost:5173` in Chrome or Edge.

### Building for Production

```bash
npm run build
```

This creates a `dist` folder. To preview the production build:

```bash
npm run preview
```

## Usage

1. **Select your music folder**: Click "Select Music Folder" and choose the root folder containing your artist folders
2. **Browse your library**: Expand artists and albums to see tracks
3. **Play music**: Click any track to play immediately
4. **Build a queue**: Drag tracks/albums to the queue or use + buttons
5. **Reorder queue**: Drag and drop tracks in the Now Playing list
6. **Save playlists**: Click the playlist icon to save your queue
7. **Adjust sound**: Click the EQ icon to open the equalizer

## Music Folder Structure

The player expects your music organized like:

```
Music Folder/
├── Artist Name/
│   ├── Album Name/
│   │   ├── 01 - Song.mp3
│   │   └── 02 - Another Song.mp3
│   └── Another Album/
│       └── Track.mp3
└── Another Artist/
    └── ...
```

## Supported Formats

- MP3
- M4A/AAC
- WAV
- OGG
- FLAC

## Browser Compatibility

| Browser | Support |
|---------|---------|
| Chrome/Edge | ✅ Full support (recommended) |
| Firefox | ⚠️ Limited (no folder persistence) |
| Safari | ⚠️ Limited (no File System Access API) |

## Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Web Audio API** - Audio processing & EQ
- **Dexie** - IndexedDB wrapper for persistence
- **@dnd-kit** - Drag and drop

## Roadmap

- [ ] Shuffle/repeat modes
- [ ] Keyboard shortcuts
- [ ] Track number sorting
- [ ] Album art display

## Deploying as a PWA

The app is configured as a Progressive Web App (PWA) and can be installed on your devices.

### Local Deployment (Your Computer)

1. Build the production version:
   ```bash
   npm run build
   ```

2. Serve the `dist` folder with any HTTP server:
   ```bash
   # Option 1: Using the built-in preview
   npm run preview
   
   # Option 2: Using Python
   cd dist && python3 -m http.server 8080
   
   # Option 3: Using Node serve (install once: npm i -g serve)
   serve dist
   ```

3. Open `http://localhost:8080` (or whatever port) in Chrome/Edge

4. Click the install icon in the address bar (or menu → "Install Jim Media Player")

### Mobile Deployment (Android)

**Option A: Access from your computer's server**
1. Build and serve on your computer (see above)
2. Find your computer's local IP (e.g., `192.168.1.100`)
3. On your phone, open Chrome and go to `http://192.168.1.100:8080`
4. Tap the menu → "Add to Home Screen" or "Install App"

**Option B: Deploy to a free hosting service**
1. Build the app: `npm run build`
2. Deploy the `dist` folder to Netlify, Vercel, or GitHub Pages
3. Access from any device and install

### Netlify Deployment (Recommended for Mobile)

1. Create a free account at [netlify.com](https://netlify.com)
2. Drag and drop your `dist` folder to Netlify's deploy area
3. Get your URL (e.g., `https://your-app.netlify.app`)
4. Access from any device and install as PWA

**Note:** The File System Access API (for selecting music folders) works best in Chrome/Edge. On mobile, you may need to use a browser that supports this API.

## License

MIT License - feel free to use and modify as you like.

## Author

Built with ❤️ and Claude AI
