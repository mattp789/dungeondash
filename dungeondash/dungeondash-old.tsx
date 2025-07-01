import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Smartphone, Monitor, Download, Upload, Plus, Minus, Shield, Heart, Zap, Dice6, Moon, Edit3, Check, X } from 'lucide-react';

// Character interface
interface Character {
  id: string;
  name: string;
  class: string;
  level: number;
  hp: { current: number; max: number };
  ac: number;
  spellSlots: { [key: string]: { current: number; max: number } };
  stats: {
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
  };
  conditions: string[];
  notes: string;
}

interface RoomData {
  characters: Character[];
  lastUpdated: number;
  dmDeviceId: string;
}

interface SignalData {
  type: string;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidate;
  from: string;
  to?: string;
  roomCode: string;
  timestamp: number;
}

const initialCharacter: Character = {
  id: '',
  name: '',
  class: '',
  level: 1,
  hp: { current: 0, max: 0 },
  ac: 10,
  spellSlots: {
    '1st': { current: 0, max: 0 },
    '2nd': { current: 0, max: 0 },
    '3rd': { current: 0, max: 0 },
    '4th': { current: 0, max: 0 },
    '5th': { current: 0, max: 0 },
    '6th': { current: 0, max: 0 },
    '7th': { current: 0, max: 0 },
    '8th': { current: 0, max: 0 },
    '9th': { current: 0, max: 0 },
  },
  stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  conditions: [],
  notes: ''
};

// StatBlock component
const StatBlock = React.memo(({ 
  character, 
  onUpdateCharacter, 
  onLongRest 
}: { 
  character: Character;
  onUpdateCharacter: (id: string, updates: Partial<Character>) => void;
  onLongRest: (id: string) => void;
}) => (
  <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-purple-200">
    <div className="flex items-center justify-between mb-4">
      <input
        type="text"
        value={character.name}
        onChange={(e) => onUpdateCharacter(character.id, { name: e.target.value })}
        className="text-xl font-bold text-purple-800 bg-transparent border-none outline-none focus:bg-purple-50 focus:px-2 focus:py-1 focus:rounded transition-all"
        placeholder="Character Name"
      />
      <div className="text-sm text-gray-600">
        Level {character.level} {character.class}
      </div>
    </div>
    
    <div className="grid grid-cols-1 gap-4 mb-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Heart className="w-5 h-5 text-red-500" />
            <span className="font-semibold">HP:</span>
            <span className="text-lg">{character.hp.current}/{character.hp.max}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-blue-500" />
            <span className="font-semibold">AC:</span>
            <span className="text-lg">{character.ac}</span>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className={`h-3 rounded-full transition-all duration-300 ${
              character.hp.max === 0 ? 'bg-gray-500' :
              character.hp.current / character.hp.max > 0.6 ? 'bg-green-500' :
              character.hp.current / character.hp.max > 0.3 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ 
              width: character.hp.max === 0 ? '0%' : 
              `${Math.max(0, Math.min(100, (character.hp.current / character.hp.max) * 100))}%` 
            }}
          ></div>
        </div>
        <div className="text-xs text-gray-600 mt-1 text-center">
          {character.hp.max === 0 ? '0' : Math.round(Math.min(100, (character.hp.current / character.hp.max) * 100))}% Health
        </div>
      </div>
    </div>

    <div className="mb-4">
      <h4 className="font-semibold text-gray-700 mb-3 flex items-center">
        <Zap className="w-4 h-4 mr-1" />
        Spell Slots
      </h4>
      <div className="grid grid-cols-3 gap-3">
        {Object.entries(character.spellSlots).map(([level, slots]) => (
          slots.max > 0 && (
            <div key={level} className="text-center">
              <div className="text-xs font-medium text-purple-600 mb-1">{level}</div>
              <div className="flex justify-center space-x-1">
                {Array.from({ length: slots.max }, (_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full border-2 transition-all duration-300 ${
                      i < slots.current
                        ? `bg-gradient-to-br from-purple-400 to-blue-600 border-purple-300 shadow-sm shadow-purple-400/50`
                        : 'bg-gray-100 border-gray-300'
                    }`}
                    style={{
                      transform: i < slots.current ? 'scale(1.1)' : 'scale(1)',
                      boxShadow: i < slots.current ? '0 0 8px rgba(147, 58, 230, 0.4)' : 'none'
                    }}
                  />
                ))}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {slots.current}/{slots.max}
              </div>
            </div>
          )
        ))}
      </div>
    </div>

    <div className="grid grid-cols-3 gap-2 text-sm">
      {Object.entries(character.stats).map(([stat, value]) => (
        <div key={stat} className="text-center">
          <div className="font-semibold text-gray-600 uppercase">{stat}</div>
          <div className="text-lg">{value}</div>
          <div className="text-xs text-gray-500">
            {Math.floor((value - 10) / 2) >= 0 ? '+' : ''}{Math.floor((value - 10) / 2)}
          </div>
        </div>
      ))}
    </div>

    {character.conditions.length > 0 && (
      <div className="mt-4">
        <h4 className="font-semibold text-gray-700 mb-2">Conditions</h4>
        <div className="flex flex-wrap gap-1">
          {character.conditions.map((condition, idx) => (
            <span key={idx} className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
              {condition}
            </span>
          ))}
        </div>
      </div>
    )}
    
    <div className="mt-4 pt-4 border-t border-gray-200">
      <button
        onClick={() => onLongRest(character.id)}
        className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
      >
        <Moon className="w-4 h-4" />
        <span>Long Rest</span>
      </button>
    </div>
  </div>
));

// CharacterEditor component
const CharacterEditor = React.memo(({ 
  character, 
  editingHP, 
  tempHP, 
  onUpdateCharacter, 
  onStartEditingHP, 
  onSaveHP, 
  onCancelEditingHP, 
  onSetTempHP, 
  onLongRest 
}: { 
  character: Character;
  editingHP: string | null;
  tempHP: { current: string; max: string };
  onUpdateCharacter: (id: string, updates: Partial<Character>) => void;
  onStartEditingHP: (id: string, character: Character) => void;
  onSaveHP: (id: string) => void;
  onCancelEditingHP: () => void;
  onSetTempHP: (tempHP: { current: string; max: string }) => void;
  onLongRest: (id: string) => void;
}) => (
  <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-200">
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">Character Name</label>
      <input
        type="text"
        value={character.name}
        onChange={(e) => onUpdateCharacter(character.id, { name: e.target.value })}
        className="w-full px-3 py-2 border rounded text-xl font-bold text-green-800"
        placeholder="Character Name"
      />
    </div>

    <div className="mb-4 grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
        <input
          type="text"
          value={character.class}
          onChange={(e) => onUpdateCharacter(character.id, { class: e.target.value })}
          className="w-full px-3 py-2 border rounded"
          placeholder="e.g., Fighter, Wizard, Rogue"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
        <input
          type="number"
          value={character.level}
          onChange={(e) => onUpdateCharacter(character.id, { level: Math.max(1, parseInt(e.target.value) || 1) })}
          className="w-full px-3 py-2 border rounded"
          min="1"
          max="20"
        />
      </div>
    </div>
    
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700">Health Points</label>
        {editingHP !== character.id ? (
          <button
            onClick={() => onStartEditingHP(character.id, character)}
            className="flex items-center space-x-1 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
          >
            <Edit3 className="w-3 h-3" />
            <span>Edit HP</span>
          </button>
        ) : (
          <div className="flex space-x-2">
            <button
              onClick={() => onSaveHP(character.id)}
              className="flex items-center space-x-1 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
            >
              <Check className="w-3 h-3" />
              <span>Save</span>
            </button>
            <button
              onClick={onCancelEditingHP}
              className="flex items-center space-x-1 px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
            >
              <X className="w-3 h-3" />
              <span>Cancel</span>
            </button>
          </div>
        )}
      </div>
      
      {editingHP === character.id ? (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Current HP</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={tempHP.current}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, '');
                onSetTempHP({ ...tempHP, current: value });
              }}
              className="w-full px-3 py-2 border rounded"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Max HP</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={tempHP.max}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, '');
                onSetTempHP({ ...tempHP, max: value });
              }}
              className="w-full px-3 py-2 border rounded"
              placeholder="0"
            />
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Heart className="w-5 h-5 text-red-500" />
              <span className="font-semibold">HP:</span>
              <span className="text-lg">{character.hp.current}/{character.hp.max}</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onUpdateCharacter(character.id, { 
                  hp: { ...character.hp, current: Math.max(0, character.hp.current - 1) }
                })}
                className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
              >
                <Minus className="w-3 h-3" />
              </button>
              <button
                onClick={() => onUpdateCharacter(character.id, { 
                  hp: { ...character.hp, current: Math.min(character.hp.max, character.hp.current + 1) }
                })}
                className="p-1 bg-green-500 text-white rounded hover:bg-green-600"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all duration-300 ${
                character.hp.max === 0 ? 'bg-gray-500' :
                character.hp.current / character.hp.max > 0.6 ? 'bg-green-500' :
                character.hp.current / character.hp.max > 0.3 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ 
                width: character.hp.max === 0 ? '0%' : 
                `${Math.max(0, Math.min(100, (character.hp.current / character.hp.max) * 100))}%` 
              }}
            ></div>
          </div>
          <div className="text-xs text-gray-600 mt-1 text-center">
            {character.hp.max === 0 ? '0' : Math.round(Math.min(100, (character.hp.current / character.hp.max) * 100))}% Health
          </div>
        </div>
      )}
    </div>

    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">Armor Class</label>
      <input
        type="number"
        value={character.ac}
        onChange={(e) => onUpdateCharacter(character.id, { ac: parseInt(e.target.value) || 10 })}
        className="w-full px-3 py-2 border rounded"
      />
    </div>

    <div className="mb-4">
      <h4 className="font-semibold text-gray-700 mb-3">Ability Scores</h4>
      <div className="grid grid-cols-3 gap-3">
        {Object.entries(character.stats).map(([stat, value]) => (
          <div key={stat} className="text-center">
            <label className="block text-xs font-medium text-gray-600 mb-1 uppercase">{stat}</label>
            <input
              type="number"
              value={value}
              onChange={(e) => onUpdateCharacter(character.id, {
                stats: {
                  ...character.stats,
                  [stat]: Math.max(1, Math.min(30, parseInt(e.target.value) || 10))
                }
              })}
              className="w-full px-2 py-2 border rounded text-center font-semibold"
              min="1"
              max="30"
            />
            <div className="text-xs text-gray-500 mt-1">
              {Math.floor((value - 10) / 2) >= 0 ? '+' : ''}{Math.floor((value - 10) / 2)}
            </div>
          </div>
        ))}
      </div>
    </div>

    <div className="mb-4">
      <h4 className="font-semibold text-gray-700 mb-2">Spell Slots</h4>
      <div className="grid grid-cols-3 gap-2">
        {Object.entries(character.spellSlots).map(([level, slots]) => (
          <div key={level} className="space-y-1">
            <label className="block text-xs font-medium text-gray-600">{level} Level</label>
            <div className="flex space-x-1">
              <input
                type="number"
                value={slots.current}
                onChange={(e) => onUpdateCharacter(character.id, {
                  spellSlots: {
                    ...character.spellSlots,
                    [level]: { ...slots, current: Math.max(0, parseInt(e.target.value) || 0) }
                  }
                })}
                className="w-12 px-1 py-1 border rounded text-xs text-center"
                min="0"
                max={slots.max}
              />
              <span className="text-xs self-center">/</span>
              <input
                type="number"
                value={slots.max}
                onChange={(e) => onUpdateCharacter(character.id, {
                  spellSlots: {
                    ...character.spellSlots,
                    [level]: { ...slots, max: Math.max(0, parseInt(e.target.value) || 0) }
                  }
                })}
                className="w-12 px-1 py-1 border rounded text-xs text-center"
                min="0"
              />
            </div>
          </div>
        ))}
      </div>
    </div>

    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
      <textarea
        value={character.notes}
        onChange={(e) => onUpdateCharacter(character.id, { notes: e.target.value })}
        className="w-full px-3 py-2 border rounded h-20"
        placeholder="Character notes, conditions, etc."
      />
    </div>

    <div className="pt-4 border-t border-gray-200">
      <button
        onClick={() => onLongRest(character.id)}
        className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
      >
        <Moon className="w-5 h-5" />
        <span>Take Long Rest</span>
      </button>
    </div>
  </div>
));

export default function DNDDashboard() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isDM, setIsDM] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<string>('');
  const [roomCode, setRoomCode] = useState('');
  const [showAddCharacter, setShowAddCharacter] = useState(false);
  const [newCharacter, setNewCharacter] = useState<Character>({ ...initialCharacter, id: Date.now().toString() });
  const [editingHP, setEditingHP] = useState<string | null>(null);
  const [tempHP, setTempHP] = useState({ current: '', max: '' });
  const [isConnected, setIsConnected] = useState(false);
  const [deviceId] = useState(() => `device_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`);
  
  const syncInterval = useRef<number | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const dataChannel = useRef<RTCDataChannel | null>(null);
  const signalInterval = useRef<number | null>(null);
  const [connectionCode, setConnectionCode] = useState('');

  const initSync = () => {
    if (roomCode.trim() === '') return;
    
    console.log(`Initializing sync for room: ${roomCode}`);
    
    // Clean up any existing peer connections
    cleanupPeer();
    
    // Check WebRTC support first
    const webRTCAvailable = checkWebRTCSupport();
    
    if (!webRTCAvailable) {
      console.error('WebRTC not available - cross-device sync will not work');
      alert('WebRTC not supported in this browser. Cross-device sync requires a modern browser with WebRTC support.');
      return;
    }
    
    // Add a small delay to ensure cleanup is complete
    setTimeout(() => {
      try {
        if (isDM) {
          startDMSync();
          createDMPeer();
        } else {
          startPlayerSync();
          startSignalListener();
        }
      } catch (error) {
        console.error('Error initializing WebRTC sync:', error);
        alert('Failed to initialize WebRTC connection. Please try refreshing the page.');
        setIsConnected(false);
      }
    }, 100);
  };
  
  const setupPeerConnection = () => {
    if (!peerConnection.current) return;
    
    // Handle ICE candidates
    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('ICE candidate generated');
        // Store ICE candidate in localStorage for signaling
        const signalData = {
          type: 'ice-candidate',
          candidate: event.candidate,
          from: deviceId,
          roomCode,
          timestamp: Date.now()
        };
        const signals = JSON.parse(localStorage.getItem(`signals_${roomCode}`) || '[]');
        signals.push(signalData);
        localStorage.setItem(`signals_${roomCode}`, JSON.stringify(signals));
      }
    };
    
    // Handle connection state changes
    peerConnection.current.onconnectionstatechange = () => {
      const state = peerConnection.current?.connectionState;
      console.log('Connection state:', state);
      setIsConnected(state === 'connected');
    };
    
    // Handle incoming data channels (for players)
    peerConnection.current.ondatachannel = (event) => {
      console.log('Received data channel');
      setupDataChannel(event.channel);
    };
  };
  
  const setupDataChannel = (channel: RTCDataChannel) => {
    dataChannel.current = channel;
    
    channel.onopen = () => {
      console.log('Data channel opened');
      setIsConnected(true);
    };
    
    channel.onclose = () => {
      console.log('Data channel closed');
      setIsConnected(false);
    };
    
    channel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'characters-update') {
          setCharacters(data.characters);
          console.log('Received characters update via WebRTC');
        }
      } catch (error) {
        console.error('Error parsing data channel message:', error);
      }
    };
  };
  
  const cleanupPeer = () => {
    console.log('Cleaning up peer connections');
    
    // Clear intervals
    if (signalInterval.current) {
      clearInterval(signalInterval.current);
      signalInterval.current = null;
    }
    
    // Close data channel
    if (dataChannel.current) {
      dataChannel.current.close();
      dataChannel.current = null;
    }
    
    // Close peer connection
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    
    // Reset connection state
    setIsConnected(false);
    setConnectionCode('');
  };
  
  const checkWebRTCSupport = () => {
    try {
      if (typeof window === 'undefined') {
        console.error('WebRTC not available: no window object');
        return false;
      }
      
      if (!window.RTCPeerConnection) {
        console.error('WebRTC not supported: RTCPeerConnection not available');
        return false;
      }
      
      // Try to create a test RTCPeerConnection
      const testPeer = new RTCPeerConnection();
      testPeer.close();
      
      console.log('WebRTC support confirmed');
      return true;
    } catch (error) {
      console.error('WebRTC support test failed:', error);
      return false;
    }
  };
  
  const createDMPeer = () => {
    console.log('Creating DM peer (host) with native WebRTC');
    
    // Ensure clean state
    cleanupPeer();
    
    try {
      // Create RTCPeerConnection
      peerConnection.current = new RTCPeerConnection();
      
      // Create data channel for DM (initiator)
      dataChannel.current = peerConnection.current.createDataChannel('gameData');
      
      setupDataChannel(dataChannel.current);
      setupPeerConnection();
      
      console.log('DM peer created successfully');
    } catch (error) {
      console.error('Error creating DM peer:', error, error instanceof Error ? error.stack : 'No stack trace');
      throw error;
    }
    
    // Create and send offer
    peerConnection.current.createOffer().then(offer => {
      peerConnection.current!.setLocalDescription(offer);
      console.log('DM created offer:', offer);
      
      // Store offer in localStorage for players
      const signalData = {
        type: 'offer',
        offer,
        from: deviceId,
        roomCode,
        timestamp: Date.now()
      };
      localStorage.setItem(`dm_signal_${roomCode}`, JSON.stringify(signalData));
      setConnectionCode(JSON.stringify(offer));
    }).catch(error => {
      console.error('Error creating offer:', error);
    });
    
    
    // Listen for player signals
    startDMSignalListener();
  };
  
  const startDMSignalListener = () => {
    if (signalInterval.current) clearInterval(signalInterval.current);
    
    signalInterval.current = window.setInterval(() => {
      const playerSignalStr = localStorage.getItem(`player_signal_${roomCode}_${deviceId}`);
      if (playerSignalStr) {
        try {
          const playerSignal: SignalData = JSON.parse(playerSignalStr);
          if (playerSignal.to === deviceId && peerConnection.current) {
            console.log('DM processing player answer:', playerSignal.answer);
            try {
              if (playerSignal.answer) {
          peerConnection.current.setRemoteDescription(playerSignal.answer);
        }
              // Clear the processed signal
              localStorage.removeItem(`player_signal_${roomCode}_${deviceId}`);
            } catch (error) {
              console.error('Error processing player answer in DM:', error);
            }
          }
        } catch (error) {
          console.error('Error processing player signal:', error);
        }
      }
    }, 500);
  };
  
  const createPlayerPeer = (dmSignal: any) => {
    console.log('Creating player peer with native WebRTC');
    
    // Ensure clean state
    cleanupPeer();
    
    try {
      // Create RTCPeerConnection for player
      peerConnection.current = new RTCPeerConnection();
      
      setupPeerConnection();
      
      console.log('Player peer created successfully');
    } catch (error) {
      console.error('Error creating player peer:', error, error instanceof Error ? error.stack : 'No stack trace');
      throw error;
    }
    
    
    
    // Process the DM's offer
    try {
      peerConnection.current.setRemoteDescription(dmSignal.offer).then(() => {
        return peerConnection.current!.createAnswer();
      }).then(answer => {
        peerConnection.current!.setLocalDescription(answer);
        
        // Send answer back to DM
        const signalData = {
          type: 'answer',
          answer,
          from: deviceId,
          to: dmSignal.from,
          roomCode,
          timestamp: Date.now()
        };
        localStorage.setItem(`player_signal_${roomCode}_${dmSignal.from}`, JSON.stringify(signalData));
      }).catch(error => {
        console.error('Error processing offer:', error);
      });
    } catch (error) {
      console.error('Error processing DM signal:', error);
      cleanupPeer();
    }
  };
  
  const startSignalListener = () => {
    if (signalInterval.current) clearInterval(signalInterval.current);
    
    signalInterval.current = window.setInterval(() => {
      const dmSignalStr = localStorage.getItem(`dm_signal_${roomCode}`);
      if (dmSignalStr) {
        try {
          const dmSignal: SignalData = JSON.parse(dmSignalStr);
          if (dmSignal.from !== deviceId && !peerConnection.current) {
            console.log('Player found DM signal, connecting...');
            createPlayerPeer(dmSignal);
          }
        } catch (error) {
          console.error('Error processing DM signal:', error);
        }
      }
    }, 1000);
  };
  
  const startDMSync = () => {
    setIsConnected(true);
    
    // Initial save
    saveRoomData(characters);
    
    // Clear any existing interval
    if (syncInterval.current) clearInterval(syncInterval.current);
    
    // Periodic sync to keep room alive
    syncInterval.current = window.setInterval(() => {
      saveRoomData(characters);
    }, 2000);
  };
  
  const startPlayerSync = () => {
    const checkForUpdates = () => {
      const roomDataStr = localStorage.getItem(`dnd_room_${roomCode}`);
      if (roomDataStr) {
        try {
          const roomData: RoomData = JSON.parse(roomDataStr);
          if (roomData.dmDeviceId !== deviceId) {
            setCharacters(roomData.characters);
            setIsConnected(true);
            console.log('Player synced characters:', roomData.characters.length);
          }
        } catch (error) {
          console.error('Error parsing room data:', error);
          setIsConnected(false);
        }
      } else {
        setIsConnected(false);
      }
    };
    
    checkForUpdates();
    
    if (syncInterval.current) clearInterval(syncInterval.current);
    syncInterval.current = window.setInterval(checkForUpdates, 300);
  };


  const saveRoomData = (updatedCharacters: Character[]) => {
    if (isDM && roomCode.trim() !== '') {
      const roomData: RoomData = {
        characters: updatedCharacters,
        lastUpdated: Date.now(),
        dmDeviceId: deviceId
      };
      localStorage.setItem(`dnd_room_${roomCode}`, JSON.stringify(roomData));
      
      // Also broadcast via WebRTC if connected
      if (dataChannel.current && dataChannel.current.readyState === 'open') {
        try {
          const message = JSON.stringify({
            type: 'characters-update',
            characters: updatedCharacters
          });
          dataChannel.current.send(message);
          console.log('Characters broadcasted via WebRTC');
        } catch (error) {
          console.warn('Error sending via data channel:', error);
        }
      }
    }
  };
  
  const requestSync = () => {
    if (!isDM && roomCode.trim() !== '') {
      const roomDataStr = localStorage.getItem(`dnd_room_${roomCode}`);
      if (roomDataStr) {
        try {
          const roomData: RoomData = JSON.parse(roomDataStr);
          setCharacters(roomData.characters);
        } catch (error) {
          console.error('Error syncing:', error);
        }
      }
    }
  };

  const updateCharacter = useCallback((characterId: string, updates: Partial<Character>) => {
    setCharacters(prev => {
      const updated = prev.map(char => 
        char.id === characterId ? { ...char, ...updates } : char
      );
      
      // Save to localStorage immediately for DM
      if (isDM && roomCode.trim() !== '') {
        saveRoomData(updated);
      }
      
      return updated;
    });
  }, [isDM, roomCode, deviceId]);

  const addCharacter = () => {
    if (newCharacter.name && newCharacter.class) {
      const character = { ...newCharacter, id: Date.now().toString() };
      setCharacters(prev => {
        const updated = [...prev, character];
        
        // Save to localStorage immediately for DM
        if (isDM && roomCode.trim() !== '') {
          saveRoomData(updated);
        }
        
        return updated;
      });
      setNewCharacter({ ...initialCharacter, id: Date.now().toString() });
      setShowAddCharacter(false);
    }
  };

  const startEditingHP = useCallback((characterId: string, character: Character) => {
    setEditingHP(characterId);
    setTempHP({ current: character.hp.current.toString(), max: character.hp.max.toString() });
  }, []);

  const saveHP = useCallback((characterId: string) => {
    const currentHP = parseInt(tempHP.current) || 0;
    const maxHP = parseInt(tempHP.max) || 0;
    updateCharacter(characterId, { hp: { current: currentHP, max: maxHP } });
    setEditingHP(null);
  }, [tempHP.current, tempHP.max, updateCharacter]);

  const cancelEditingHP = useCallback(() => {
    setEditingHP(null);
  }, []);

  const handleSetTempHP = useCallback((newTempHP: { current: string; max: string }) => {
    setTempHP(newTempHP);
  }, []);

  const longRest = (characterId: string) => {
    setCharacters(prev => {
      const updated = prev.map(char => {
        if (char.id === characterId) {
          const restoredSpellSlots = Object.keys(char.spellSlots).reduce((acc, level) => {
            acc[level] = {
              ...char.spellSlots[level],
              current: char.spellSlots[level].max
            };
            return acc;
          }, {} as { [key: string]: { current: number; max: number } });

          return {
            ...char,
            hp: { ...char.hp, current: char.hp.max },
            spellSlots: restoredSpellSlots
          };
        }
        return char;
      });
      
      // Save to localStorage immediately for DM
      if (isDM && roomCode.trim() !== '') {
        saveRoomData(updated);
      }
      
      return updated;
    });
  };

  const savePartyData = () => {
    const data = JSON.stringify({ characters, roomCode, isDM });
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dnd-party-data.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadPartyData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          setCharacters(data.characters || []);
          setRoomCode(data.roomCode || '');
          setIsDM(data.isDM || false);
        } catch (error) {
          console.error('Error loading party data:', error);
        }
      };
      reader.readAsText(file);
    }
  };
  
  useEffect(() => {
    return () => {
      cleanupPeer();
      if (syncInterval.current) {
        clearInterval(syncInterval.current);
        syncInterval.current = null;
      }
    };
  }, []);
  
  // Separate effect for character changes to avoid infinite loops
  useEffect(() => {
    if (isDM && roomCode.trim() !== '' && characters.length > 0) {
      saveRoomData(characters);
    }
  }, [characters, isDM, roomCode, deviceId]);
  
  useEffect(() => {
    if (isConnected && !isDM && roomCode.trim() !== '') {
      requestSync();
    }
  }, [isConnected, isDM, roomCode]);
  
  const joinRoom = () => {
    if (roomCode.trim() !== '') {
      console.log('Joining room:', roomCode);
      initSync();
    } else {
      console.log('Please enter a room code');
    }
  };
  
  const leaveRoom = () => {
    console.log('Leaving room');
    cleanupPeer();
    if (syncInterval.current) {
      clearInterval(syncInterval.current);
      syncInterval.current = null;
    }
    setIsConnected(false);
    // Clear room-specific localStorage
    if (roomCode.trim() !== '') {
      localStorage.removeItem(`dnd_room_${roomCode}`);
      localStorage.removeItem(`dm_signal_${roomCode}`);
      localStorage.removeItem(`player_signal_${roomCode}_${deviceId}`);
    }
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-4">
              <Dice6 className="w-8 h-8 text-yellow-400" />
              <h1 className="text-3xl font-bold text-white">Dungeon Dash</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    placeholder="ROOM CODE"
                    className="px-3 py-1 rounded bg-white/20 text-white placeholder-white/60 border border-white/30 text-sm w-24"
                    maxLength={6}
                  />
                  {!isConnected ? (
                    <button
                      onClick={joinRoom}
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                      disabled={roomCode.trim() === ''}
                    >
                      Join
                    </button>
                  ) : (
                    <button
                      onClick={leaveRoom}
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                    >
                      Leave
                    </button>
                  )}
                </div>
                
                {isDM && connectionCode && (
                  <div className="text-xs text-white/80 max-w-xs">
                    <div>Connection ready for players</div>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                  <span className="text-white text-sm">
                    {isConnected ? 'Connected' : 'Offline'}
                  </span>
                </div>
              </div>
              
              <button
                onClick={() => setIsDM(!isDM)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  isDM 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                {isDM ? <Monitor className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
                <span>{isDM ? 'DM View' : 'Player View'}</span>
              </button>
              
              <button
                onClick={savePartyData}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Save</span>
              </button>
              
              <label className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>Load</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={loadPartyData}
                  className="hidden"
                />
              </label>
            </div>
          </div>
          
          {roomCode.trim() !== '' && (
            <div className="mt-4 text-center">
              <p className="text-white/80 text-sm">
                Room: <span className="font-mono font-bold">{roomCode}</span>
                {isDM ? ' (DM - Host)' : ' (Player)'}
              </p>
            </div>
          )}
          
          {characters.length === 0 && (
            <div className="mt-4 text-center">
              <p className="text-white/80 mb-4">No characters in your party yet!</p>
              <button
                onClick={() => setShowAddCharacter(true)}
                className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-semibold"
              >
                Add First Character
              </button>
            </div>
          )}
        </div>

        {/* Character Management */}
        {showAddCharacter && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border-2 border-yellow-300">
            <h3 className="text-xl font-bold text-yellow-800 mb-4">Add New Character</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <input
                type="text"
                placeholder="Character Name"
                value={newCharacter.name}
                onChange={(e) => setNewCharacter({ ...newCharacter, name: e.target.value })}
                className="px-3 py-2 border rounded"
              />
              <input
                type="text"
                placeholder="Class"
                value={newCharacter.class}
                onChange={(e) => setNewCharacter({ ...newCharacter, class: e.target.value })}
                className="px-3 py-2 border rounded"
              />
              <input
                type="number"
                placeholder="Level"
                value={newCharacter.level}
                onChange={(e) => setNewCharacter({ ...newCharacter, level: parseInt(e.target.value) || 1 })}
                className="px-3 py-2 border rounded"
              />
            </div>
            <div className="flex space-x-4">
              <button
                onClick={addCharacter}
                className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Add Character
              </button>
              <button
                onClick={() => setShowAddCharacter(false)}
                className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Character Selection for Players */}
        {!isDM && characters.length > 0 && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20">
            <label className="block text-white font-semibold mb-2">Select Your Character:</label>
            <select
              value={selectedCharacter}
              onChange={(e) => setSelectedCharacter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/20 text-white border border-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Choose a character...</option>
              {characters.map(char => (
                <option key={char.id} value={char.id} className="text-black">
                  {char.name} ({char.class})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Characters Display */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {isDM ? (
            // DM View - Show all characters as stat blocks
            characters.map(character => (
              <StatBlock 
                key={character.id} 
                character={character} 
                onUpdateCharacter={updateCharacter}
                onLongRest={longRest}
              />
            ))
          ) : (
            // Player View - Show selected character editor
            selectedCharacter && characters.find(c => c.id === selectedCharacter) ? (
              <div className="lg:col-span-2 xl:col-span-3">
                <CharacterEditor 
                  character={characters.find(c => c.id === selectedCharacter)!}
                  editingHP={editingHP}
                  tempHP={tempHP}
                  onUpdateCharacter={updateCharacter}
                  onStartEditingHP={startEditingHP}
                  onSaveHP={saveHP}
                  onCancelEditingHP={cancelEditingHP}
                  onSetTempHP={handleSetTempHP}
                  onLongRest={longRest}
                />
              </div>
            ) : null
          )}
        </div>

        {characters.length > 0 && (
          <div className="mt-6 text-center">
            <button
              onClick={() => setShowAddCharacter(true)}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
            >
              Add Another Character
            </button>
          </div>
        )}
      </div>
    </div>
  );
}