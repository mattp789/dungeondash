export interface ConnectionEvents {
  onConnectionStateChange: (connected: boolean) => void;
  onDataReceived: (data: any) => void;
  onError: (error: Error) => void;
}

export interface SignalData {
  type: string;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidate;
  from: string;
  to?: string;
  roomCode: string;
  timestamp: number;
}

export class WebRTCConnectionManager {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private deviceId: string;
  private roomCode: string;
  private isHost: boolean;
  private events: ConnectionEvents;
  private signalInterval: number | null = null;
  private processedAnswers = new Set<string>();
  private processedOffers = new Set<string>();

  constructor(deviceId: string, roomCode: string, isHost: boolean, events: ConnectionEvents) {
    this.deviceId = deviceId;
    this.roomCode = roomCode;
    this.isHost = isHost;
    this.events = events;
  }

  async connect(): Promise<void> {
    try {
      this.cleanup();
      
      // Create RTCPeerConnection
      this.peerConnection = new RTCPeerConnection();
      this.setupPeerConnection();

      if (this.isHost) {
        await this.initializeAsHost();
      } else {
        this.initializeAsClient();
      }
    } catch (error) {
      this.events.onError(new Error(`Failed to connect: ${error}`));
    }
  }

  disconnect(): void {
    this.cleanup();
    this.events.onConnectionStateChange(false);
  }

  sendData(data: any): boolean {
    console.log('Attempting to send data:', data.type, 'Data channel state:', this.dataChannel?.readyState);
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      try {
        this.dataChannel.send(JSON.stringify(data));
        console.log('Data sent successfully via WebRTC');
        return true;
      } catch (error) {
        console.warn('Error sending data:', error);
        return false;
      }
    }
    console.warn('Cannot send data - data channel not open. State:', this.dataChannel?.readyState || 'null');
    return false;
  }

  isConnected(): boolean {
    return this.dataChannel?.readyState === 'open' || false;
  }

  private setupPeerConnection(): void {
    if (!this.peerConnection) return;

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.storeSignal({
          type: 'ice-candidate',
          candidate: event.candidate,
          from: this.deviceId,
          roomCode: this.roomCode,
          timestamp: Date.now()
        });
      }
    };

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      console.log('WebRTC connection state:', state);
      this.events.onConnectionStateChange(state === 'connected');
    };

    // Handle incoming data channels (for clients)
    this.peerConnection.ondatachannel = (event) => {
      console.log('Received data channel');
      this.setupDataChannel(event.channel);
    };
  }

  private setupDataChannel(channel: RTCDataChannel): void {
    this.dataChannel = channel;

    channel.onopen = () => {
      console.log('Data channel opened successfully!', this.isHost ? '(Host)' : '(Client)');
      this.events.onConnectionStateChange(true);
    };

    channel.onclose = () => {
      console.log('Data channel closed');
      this.events.onConnectionStateChange(false);
    };

    channel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Received data via data channel:', data.type);
        this.events.onDataReceived(data);
      } catch (error) {
        console.error('Error parsing data channel message:', error);
      }
    };
  }

  private async initializeAsHost(): Promise<void> {
    if (!this.peerConnection) return;

    // Create data channel for host
    this.dataChannel = this.peerConnection.createDataChannel('gameData');
    this.setupDataChannel(this.dataChannel);

    // Create and send offer
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    this.storeSignal({
      type: 'offer',
      offer,
      from: this.deviceId,
      roomCode: this.roomCode,
      timestamp: Date.now()
    });

    // Start listening for answers
    this.startSignalListener();
  }

  private initializeAsClient(): void {
    // Start listening for offers
    this.startSignalListener();
  }

  private startSignalListener(): void {
    if (this.signalInterval) {
      clearInterval(this.signalInterval);
    }

    this.signalInterval = window.setInterval(async () => {
      if (this.isHost) {
        await this.checkForAnswers();
      } else {
        this.checkForOffers();
      }
      this.checkForICECandidates();
    }, 1000);
  }

  private checkForOffers(): void {
    const offerStr = localStorage.getItem(`dm_signal_${this.roomCode}`);
    if (offerStr && this.peerConnection) {
      try {
        const signalData: SignalData = JSON.parse(offerStr);
        const offerKey = `${signalData.from}_${signalData.timestamp}`;
        
        if (signalData.from !== this.deviceId && signalData.offer && !this.processedOffers.has(offerKey)) {
          console.log('Client found offer, responding...');
          this.processedOffers.add(offerKey);
          this.handleOffer(signalData);
        }
      } catch (error) {
        console.error('Error processing offer:', error);
      }
    }
  }

  private async checkForAnswers(): Promise<void> {
    const answerStr = localStorage.getItem(`player_signal_${this.roomCode}_${this.deviceId}`);
    if (answerStr && this.peerConnection) {
      try {
        const signalData: SignalData = JSON.parse(answerStr);
        const answerKey = `${signalData.from}_${signalData.timestamp}`;
        
        if (signalData.to === this.deviceId && signalData.answer && !this.processedAnswers.has(answerKey)) {
          console.log('Host processing answer...');
          
          // Check if we're in the correct state to set remote description
          if (this.peerConnection.signalingState === 'have-local-offer') {
            await this.peerConnection.setRemoteDescription(signalData.answer);
            this.processedAnswers.add(answerKey);
            localStorage.removeItem(`player_signal_${this.roomCode}_${this.deviceId}`);
            console.log('Answer processed successfully');
          } else {
            console.warn('Cannot set remote description, current signaling state:', this.peerConnection.signalingState);
            // Mark as processed and clean up to avoid repeated attempts
            this.processedAnswers.add(answerKey);
            localStorage.removeItem(`player_signal_${this.roomCode}_${this.deviceId}`);
          }
        }
      } catch (error) {
        console.error('Error processing answer:', error);
      }
    }
  }

  private async handleOffer(signalData: SignalData): Promise<void> {
    if (!this.peerConnection || !signalData.offer) return;

    try {
      // Check if we're in the correct state to set remote description
      if (this.peerConnection.signalingState === 'stable') {
        await this.peerConnection.setRemoteDescription(signalData.offer);
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);

        // Send answer back to host
        this.storeSignal({
          type: 'answer',
          answer,
          from: this.deviceId,
          to: signalData.from,
          roomCode: this.roomCode,
          timestamp: Date.now()
        });
      } else {
        console.warn('Cannot handle offer, current signaling state:', this.peerConnection.signalingState);
      }
    } catch (error) {
      this.events.onError(new Error(`Failed to handle offer: ${error}`));
    }
  }

  private checkForICECandidates(): void {
    const signalsStr = localStorage.getItem(`signals_${this.roomCode}`);
    if (signalsStr) {
      try {
        const signals: SignalData[] = JSON.parse(signalsStr);
        const recentCandidates = signals.filter(s => 
          s.type === 'ice-candidate' && 
          s.from !== this.deviceId &&
          Date.now() - s.timestamp < 30000
        );

        recentCandidates.forEach(signal => {
          if (signal.candidate && this.peerConnection) {
            this.peerConnection.addIceCandidate(signal.candidate).catch(console.warn);
          }
        });

        // Clean up old signals
        const recent = signals.filter(s => Date.now() - s.timestamp < 30000);
        localStorage.setItem(`signals_${this.roomCode}`, JSON.stringify(recent));
      } catch (error) {
        console.error('Error processing ICE candidates:', error);
      }
    }
  }

  private storeSignal(signal: Omit<SignalData, 'timestamp'> & { timestamp: number }): void {
    if (signal.type === 'offer') {
      localStorage.setItem(`dm_signal_${this.roomCode}`, JSON.stringify(signal));
    } else if (signal.type === 'answer') {
      localStorage.setItem(`player_signal_${this.roomCode}_${signal.to}`, JSON.stringify(signal));
    } else if (signal.type === 'ice-candidate') {
      const signalsStr = localStorage.getItem(`signals_${this.roomCode}`) || '[]';
      const signals = JSON.parse(signalsStr);
      signals.push(signal);
      localStorage.setItem(`signals_${this.roomCode}`, JSON.stringify(signals));
    }
  }

  private cleanup(): void {
    console.log('Cleaning up WebRTC connection');

    if (this.signalInterval) {
      clearInterval(this.signalInterval);
      this.signalInterval = null;
    }

    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Clear processed signals tracking
    this.processedAnswers.clear();
    this.processedOffers.clear();
  }

  // Clean up localStorage for this room
  cleanupRoom(): void {
    localStorage.removeItem(`dnd_room_${this.roomCode}`);
    localStorage.removeItem(`dm_signal_${this.roomCode}`);
    localStorage.removeItem(`player_signal_${this.roomCode}_${this.deviceId}`);
    localStorage.removeItem(`signals_${this.roomCode}`);
  }
}