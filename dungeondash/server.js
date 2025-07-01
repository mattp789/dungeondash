const WebSocket = require('ws');
const http = require('http');

// Create HTTP server
const server = http.createServer();
const wss = new WebSocket.Server({ server });

// Store room data
const rooms = new Map();

// Get local IP address
function getLocalIP() {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  const results = [];

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === 'IPv4' && !net.internal) {
        results.push(net.address);
      }
    }
  }
  return results[0] || 'localhost';
}

wss.on('connection', (ws) => {
  console.log('New client connected');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received:', data.type, data.roomCode ? `(Room: ${data.roomCode})` : '');
      
      switch (data.type) {
        case 'join-room':
          handleJoinRoom(ws, data);
          break;
        case 'characters-update':
          handleCharactersUpdate(ws, data);
          break;
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });
  
  ws.on('close', () => {
    console.log('Client disconnected');
    // Clean up client from rooms
    for (const [roomCode, room] of rooms.entries()) {
      room.clients = room.clients.filter(client => client !== ws);
      if (room.clients.length === 0) {
        rooms.delete(roomCode);
        console.log(`Room ${roomCode} deleted (no clients)`);
      }
    }
  });
});

function handleJoinRoom(ws, data) {
  const { roomCode, isDM, deviceId } = data;
  
  if (!rooms.has(roomCode)) {
    rooms.set(roomCode, {
      characters: [],
      clients: [],
      dmDeviceId: isDM ? deviceId : null,
      lastUpdated: Date.now()
    });
    console.log(`Created room: ${roomCode}`);
  }
  
  const room = rooms.get(roomCode);
  room.clients.push(ws);
  ws.roomCode = roomCode;
  ws.isDM = isDM;
  ws.deviceId = deviceId;
  
  if (isDM) {
    room.dmDeviceId = deviceId;
  }
  
  console.log(`Client joined room ${roomCode} as ${isDM ? 'DM' : 'Player'}`);
  
  // Send current room state to the new client
  ws.send(JSON.stringify({
    type: 'room-joined',
    roomCode: roomCode,
    characters: room.characters,
    isDM: isDM
  }));
  
  // If there are existing characters, send them to the new client
  if (room.characters.length > 0) {
    ws.send(JSON.stringify({
      type: 'characters-update',
      characters: room.characters,
      fromDM: true
    }));
  }
}

function handleCharactersUpdate(ws, data) {
  const { roomCode, characters } = data;
  
  if (!rooms.has(roomCode)) {
    console.log(`Room ${roomCode} not found for character update`);
    return;
  }
  
  const room = rooms.get(roomCode);
  room.characters = characters;
  room.lastUpdated = Date.now();
  
  console.log(`Updated ${characters.length} characters in room ${roomCode}`);
  
  // Broadcast to all other clients in the room
  const updateMessage = JSON.stringify({
    type: 'characters-update',
    characters: characters,
    fromDM: ws.isDM || false
  });
  
  room.clients.forEach(client => {
    if (client !== ws && client.readyState === WebSocket.OPEN) {
      client.send(updateMessage);
    }
  });
}

const PORT = 3001;
server.listen(PORT, () => {
  const localIP = getLocalIP();
  console.log('\n🎲 D&D Dashboard Server Started!');
  console.log('================================');
  console.log(`🌐 Local Network: http://${localIP}:5173`);
  console.log(`🔌 Server: ws://${localIP}:${PORT}`);
  console.log('================================');
  console.log('📱 Mobile players can connect using the local IP address');
  console.log('💻 DM should run: npm run dev-with-server');
  console.log('✨ Much more reliable than WebRTC!\n');
}); 