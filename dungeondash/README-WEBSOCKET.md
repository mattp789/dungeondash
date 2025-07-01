# D&D Dashboard - WebSocket Setup

This D&D Dashboard now uses WebSockets instead of WebRTC for much more reliable mobile connections!

## 🚀 Quick Start

### For the DM (Host):

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start both the server and the app:**
   ```bash
   npm run dev-with-server
   ```

3. **Note the IP address** shown in the terminal (e.g., `192.168.1.100:5173`)

4. **Share this IP address with your players**

### For Players (Mobile/Laptop):

1. **Open your browser** and go to the IP address shared by the DM
   - Example: `http://192.168.1.100:5173`

2. **Enter the room code** provided by the DM

3. **Choose "Join as Player"** and start playing!

## ✅ Benefits Over WebRTC

- **Much more reliable** on mobile devices
- **Faster connection** establishment
- **Automatic reconnection** if connection drops
- **Better error messages** and debugging
- **Works consistently** across all browsers and devices
- **No complex NAT traversal** issues

## 🔧 Troubleshooting

### If players can't connect:

1. **Check same network**: Ensure all devices are on the same WiFi network
2. **Check firewall**: Make sure port 3001 isn't blocked on the DM's computer
3. **Try refreshing**: Both DM and players should refresh their browsers
4. **Check IP address**: Make sure you're using the correct IP address shown by the server

### If the server won't start:

1. **Port in use**: If port 3001 is busy, edit `server.js` and change the PORT number
2. **Install dependencies**: Run `npm install` to make sure all packages are installed

## 📱 Mobile Optimization

The WebSocket approach is specifically optimized for mobile devices:

- **No WebRTC permissions** needed for data-only connections
- **Battery efficient** - no continuous peer-to-peer negotiations
- **Stable on cellular/WiFi switching** - automatic reconnection
- **Works behind restrictive NATs** - server handles all routing

## 🏗️ Architecture

```
DM Computer (Server)
├── WebSocket Server (port 3001)
├── Web App (port 5173)
└── Broadcasts to all connected players

Players (Mobile/Laptop)
├── Connect to DM's IP address
├── WebSocket connection to server
└── Real-time character updates
```

## 🎯 Commands

- `npm run dev` - Start just the web app (development)
- `npm run server` - Start just the WebSocket server
- `npm run dev-with-server` - Start both (recommended for DM)
- `npm run build` - Build for production

## 🔒 Security Note

This setup is designed for **local network use only**. The WebSocket server doesn't include authentication and should not be exposed to the internet without additional security measures. 