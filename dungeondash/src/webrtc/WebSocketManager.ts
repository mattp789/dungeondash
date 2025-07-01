export interface ConnectionEvents {
  onConnectionStateChange: (connected: boolean) => void;
  onDataReceived: (data: any) => void;
  onError: (error: Error) => void;
}

export class WebSocketConnectionManager {
  private ws: WebSocket | null = null;
  private deviceId: string;
  private roomCode: string;
  private isDM: boolean;
  private events: ConnectionEvents;
  private reconnectInterval: number | null = null;
  private isConnected: boolean = false;
  private serverUrl: string;

  constructor(deviceId: string, roomCode: string, isDM: boolean, events: ConnectionEvents) {
    this.deviceId = deviceId;
    this.roomCode = roomCode;
    this.isDM = isDM;
    this.events = events;
    
    // Auto-detect server URL - try local IP first, fallback to localhost
    const hostname = window.location.hostname;
    this.serverUrl = `ws://${hostname}:3001`;
    
    console.log(`WebSocket Manager initialized for ${isDM ? 'DM' : 'Player'}`);
    console.log(`Server URL: ${this.serverUrl}`);
  }

  async connect(): Promise<void> {
    try {
      this.cleanup();
      
      console.log(`Connecting to WebSocket server: ${this.serverUrl}`);
      this.ws = new WebSocket(this.serverUrl);
      
      this.ws.onopen = () => {
        console.log('✅ WebSocket connected successfully!');
        this.isConnected = true;
        this.events.onConnectionStateChange(true);
        
        // Join the room
        this.sendMessage({
          type: 'join-room',
          roomCode: this.roomCode,
          isDM: this.isDM,
          deviceId: this.deviceId
        });
        
        // Clear any reconnection attempts
        if (this.reconnectInterval) {
          clearInterval(this.reconnectInterval);
          this.reconnectInterval = null;
        }
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 Received:', data.type);
          
          if (data.type === 'room-joined') {
            console.log(`✅ Successfully joined room: ${data.roomCode}`);
          } else if (data.type === 'characters-update') {
            console.log(`📋 Character update: ${data.characters?.length || 0} characters`);
            this.events.onDataReceived(data);
          } else if (data.type === 'pong') {
            console.log('🏓 Pong received');
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      this.ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        this.isConnected = false;
        this.events.onConnectionStateChange(false);
        
        // Auto-reconnect if not manually disconnected
        if (event.code !== 1000) { // 1000 = normal closure
          this.startReconnection();
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.events.onError(new Error('Connection failed. Make sure the server is running on the DM\'s computer.'));
      };
      
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.events.onError(new Error(`Connection failed: ${error}`));
    }
  }

  disconnect(): void {
    console.log('Disconnecting WebSocket');
    this.cleanup();
    this.events.onConnectionStateChange(false);
  }

  sendData(data: any): boolean {
    if (this.isConnected && this.ws) {
      try {
        this.sendMessage({
          type: 'characters-update',
          roomCode: this.roomCode,
          characters: data.characters,
          fromDM: this.isDM
        });
        console.log('📤 Data sent successfully via WebSocket');
        return true;
      } catch (error) {
        console.error('Error sending data:', error);
        return false;
      }
    }
    console.warn('Cannot send data - WebSocket not connected');
    return false;
  }

  isConnectedToServer(): boolean {
    return this.isConnected;
  }

  private sendMessage(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('Cannot send message - WebSocket not ready');
    }
  }

  private startReconnection(): void {
    if (this.reconnectInterval) return; // Already trying to reconnect
    
    console.log('🔄 Starting reconnection attempts...');
    let attemptCount = 0;
    
    this.reconnectInterval = window.setInterval(() => {
      attemptCount++;
      console.log(`🔄 Reconnection attempt ${attemptCount}`);
      
      if (attemptCount > 10) {
        console.error('❌ Max reconnection attempts reached');
        if (this.reconnectInterval) {
          clearInterval(this.reconnectInterval);
          this.reconnectInterval = null;
        }
        this.events.onError(new Error('Connection lost. Please refresh the page.'));
        return;
      }
      
      this.connect().catch(error => {
        console.log(`Reconnection attempt ${attemptCount} failed:`, error.message);
      });
    }, 3000); // Try every 3 seconds
  }

  private cleanup(): void {
    console.log('Cleaning up WebSocket connection');
    
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }
    
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
    
    this.isConnected = false;
  }

  // For compatibility with existing code
  cleanupRoom(): void {
    console.log('WebSocket cleanup room called');
    // WebSocket server handles room cleanup automatically
  }
} 