# D&D Dashboard - Docker Setup

This D&D Dashboard runs both the WebSocket server and web application in a single Docker container for easy deployment.

## 🚀 Quick Start with Docker

### Option 1: Docker Compose (Recommended)

```bash
# Build and start the container
docker-compose up --build

# Or run in background
docker-compose up -d --build
```

### Option 2: Docker Run

```bash
# Build the image
docker build -t dungeondash .

# Run the container
docker run -p 5173:5173 -p 3001:3001 dungeondash
```

## 🌐 Accessing the Application

Once running, the application will be available at:

- **Web App**: `http://localhost:5173`
- **On Local Network**: `http://YOUR_IP:5173` (for mobile devices)

The WebSocket server runs automatically on port 3001.

## 📱 Mobile Access

1. **Find your local IP address**:
   ```bash
   # On macOS/Linux
   ifconfig | grep "inet " | grep -v 127.0.0.1
   
   # On Windows
   ipconfig | findstr "IPv4"
   ```

2. **Share the IP with players**: `http://192.168.1.100:5173` (example)

3. **Mobile devices connect** to the same URL

## 🛠️ Container Details

The Docker container runs:
- **WebSocket Server** (port 3001) - Handles real-time communication
- **Static Web Server** (port 5173) - Serves the React application
- **Automatic startup** - Both services start together

## 🔧 Development

For development with hot reload, you can still use:

```bash
npm run dev-with-server
```

Or use the development Docker setup if you prefer containers:

```bash
# Add development volumes to docker-compose.yml and run
docker-compose run --rm dungeondash npm run dev-with-server
```

## ✅ Benefits of Docker Setup

- **Single container** - Both services bundled together
- **Easy deployment** - No need to manage multiple processes
- **Consistent environment** - Works the same on any Docker host
- **Mobile-optimized** - WebSocket connections work reliably
- **Network isolation** - Clean container networking

## 🔍 Troubleshooting

### Container won't start:
```bash
# Check container logs
docker-compose logs dungeondash

# Or for docker run:
docker logs <container-id>
```

### Can't connect from mobile:
1. Make sure both ports (5173, 3001) are exposed
2. Check firewall settings on host machine
3. Verify mobile device is on same network
4. Use actual IP address, not localhost

### Build issues:
```bash
# Clean build
docker-compose down
docker system prune
docker-compose up --build --force-recreate
```

## 🚀 Production Deployment

For production, consider:
- Using a reverse proxy (nginx/traefik)
- Setting up SSL/TLS certificates
- Configuring proper logging
- Adding container health monitoring

This setup is optimized for local network D&D sessions but can be adapted for broader deployment needs. 