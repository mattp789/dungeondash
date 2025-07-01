import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Smartphone, Monitor, Download, Upload, Shield, Heart, Zap, Dice6, Moon } from 'lucide-react';
import { WebRTCConnectionManager, ConnectionEvents } from './src/webrtc/ConnectionManager';

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

// StatBlock component (keeping existing implementation)
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
  onUpdateCharacter, 
  onLongRest 
}: { 
  character: Character;
  onUpdateCharacter: (id: string, updates: Partial<Character>) => void;
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
    <div className="grid grid-cols-2 gap-4 mb-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
        <input
          type="text"
          value={character.class}
          onChange={(e) => onUpdateCharacter(character.id, { class: e.target.value })}
          className="w-full px-3 py-2 border rounded"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
        <input
          type="number"
          value={character.level}
          onChange={(e) => onUpdateCharacter(character.id, { level: parseInt(e.target.value) || 1 })}
          className="w-full px-3 py-2 border rounded"
        />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-4 mb-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Current HP</label>
        <input
          type="number"
          value={character.hp.current}
          onChange={(e) => onUpdateCharacter(character.id, { hp: { ...character.hp, current: parseInt(e.target.value) || 0 } })}
          className="w-full px-3 py-2 border rounded"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Max HP</label>
        <input
          type="number"
          value={character.hp.max}
          onChange={(e) => onUpdateCharacter(character.id, { hp: { ...character.hp, max: parseInt(e.target.value) || 0 } })}
          className="w-full px-3 py-2 border rounded"
        />
      </div>
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

export default function DNDDashboard() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isDM, setIsDM] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<string>('');
  const [roomCode, setRoomCode] = useState('');
  const [showAddCharacter, setShowAddCharacter] = useState(false);
  const [newCharacter, setNewCharacter] = useState<Character>({ ...initialCharacter, id: Date.now().toString() });
  const [isConnected, setIsConnected] = useState(false);
  const [deviceId] = useState(() => `device_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`);
  
  const syncInterval = useRef<number | null>(null);
  const connectionManager = useRef<WebRTCConnectionManager | null>(null);

  // Business logic functions
  const updateCharacter = useCallback((characterId: string, updates: Partial<Character>) => {
    setCharacters(prev => {
      const updated = prev.map(char => 
        char.id === characterId ? { ...char, ...updates } : char
      );
      
      // Save to localStorage and broadcast for both DM and players
      if (roomCode.trim() !== '') {
        if (isDM) {
          saveRoomData(updated, true); // DM character updates should broadcast
        } else {
          // For players, broadcast the update via WebRTC
          if (connectionManager.current && connectionManager.current.isConnected()) {
            const success = connectionManager.current.sendData({
              type: 'characters-update',
              characters: updated
            });
            console.log('Player sent character update via WebRTC:', success ? 'success' : 'failed');
          } else {
            console.log('Player WebRTC not connected, cannot send update');
          }
        }
      }
      
      return updated;
    });
  }, [isDM, roomCode, deviceId]);

  const addCharacter = () => {
    if (newCharacter.name && newCharacter.class) {
      const character = { ...newCharacter, id: Date.now().toString() };
      setCharacters(prev => {
        const updated = [...prev, character];
        
        // Save to localStorage and broadcast for both DM and players
        if (roomCode.trim() !== '') {
          if (isDM) {
            saveRoomData(updated, true); // DM adding character should broadcast
          } else {
            // For players, broadcast the update via WebRTC
            console.log('📤 Player preparing to send characters:', updated.length, updated.map((c: Character) => c.name));
            if (connectionManager.current && connectionManager.current.isConnected()) {
              const success = connectionManager.current.sendData({
                type: 'characters-update',
                characters: updated
              });
              console.log('📤 Player sent new character via WebRTC:', success ? 'success' : 'failed');
            } else {
              console.log('❌ Player WebRTC not connected, cannot send new character');
            }
          }
        }
        
        return updated;
      });
      
      // For players, auto-select the newly created character
      if (!isDM) {
        setSelectedCharacter(character.id);
        console.log('Auto-selected newly created character:', character.name);
      }
      
      setNewCharacter({ ...initialCharacter, id: Date.now().toString() });
      setShowAddCharacter(false);
    }
  };

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
      
      // Save to localStorage and broadcast for both DM and players
      if (roomCode.trim() !== '') {
        if (isDM) {
          saveRoomData(updated, true); // DM long rest should broadcast
        } else {
          // For players, broadcast the update via WebRTC
          if (connectionManager.current && connectionManager.current.isConnected()) {
            const success = connectionManager.current.sendData({
              type: 'characters-update',
              characters: updated
            });
            console.log('Player sent long rest update via WebRTC:', success ? 'success' : 'failed');
          } else {
            console.log('Player WebRTC not connected, cannot send long rest update');
          }
        }
      }
      
      return updated;
    });
  };

  // Connection management
  const saveRoomData = (updatedCharacters: Character[], shouldBroadcast: boolean = false) => {
    if (isDM && roomCode.trim() !== '') {
      const roomData: RoomData = {
        characters: updatedCharacters,
        lastUpdated: Date.now(),
        dmDeviceId: deviceId
      };
      localStorage.setItem(`dnd_room_${roomCode}`, JSON.stringify(roomData));
      console.log('💾 DM saved characters to localStorage:', updatedCharacters.length);
      
      // Only broadcast via WebRTC when explicitly requested (not for useEffect saves)
      if (shouldBroadcast && connectionManager.current && connectionManager.current.isConnected()) {
        const success = connectionManager.current.sendData({
          type: 'characters-update',
          characters: updatedCharacters
        });
        console.log('📤 DM broadcast via WebRTC:', success ? 'success' : 'failed');
      }
    }
  };

  const startDMSync = () => {
    setIsConnected(true);
    
    // Initial save - no broadcast needed, just localStorage
    saveRoomData(characters, false);
    
    // Clear any existing interval
    if (syncInterval.current) clearInterval(syncInterval.current);
    
    // Periodic sync to keep room alive - no broadcast needed, just localStorage
    syncInterval.current = window.setInterval(() => {
      saveRoomData(characters, false);
    }, 2000);
  };

  const startPlayerSync = () => {
    const checkForUpdates = () => {
      // Skip localStorage sync if WebRTC is connected and working
      if (connectionManager.current && connectionManager.current.isConnected()) {
        console.log('WebRTC is connected, skipping localStorage sync');
        return;
      }
      
      const roomDataStr = localStorage.getItem(`dnd_room_${roomCode}`);
      if (roomDataStr) {
        try {
          const roomData: RoomData = JSON.parse(roomDataStr);
          if (roomData.dmDeviceId !== deviceId && Array.isArray(roomData.characters)) {
            // Only update if we have valid character data and WebRTC is not working
            setCharacters(prev => {
              // Don't override if we already have characters and WebRTC might be working
              if (prev.length > 0 && roomData.characters.length === 0) {
                console.log('Preventing localStorage from clearing characters');
                return prev;
              }
              console.log('Player synced characters from localStorage:', roomData.characters.length);
              return roomData.characters;
            });
            setIsConnected(true);
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

  const initSync = () => {
    if (roomCode.trim() === '') return;
    
    console.log(`Initializing sync for room: ${roomCode}`);
    
    // Clean up any existing connections
    cleanupConnection();
    
    // Start localStorage sync
    if (isDM) {
      startDMSync();
    } else {
      startPlayerSync();
    }
    
    // Create WebRTC connection
    createConnection();
  };

  const createConnection = () => {
    console.log(`Creating WebRTC connection as ${isDM ? 'host' : 'client'}`);
    
    try {
      // Create WebRTC connection events
      const events: ConnectionEvents = {
        onConnectionStateChange: (connected: boolean) => {
          console.log('WebRTC connection state changed:', connected, isDM ? '(DM)' : '(Player)');
          setIsConnected(connected);
        },
        onDataReceived: (data: any) => {
          console.log('📨 Received data via WebRTC:', data.type, isDM ? '(DM)' : '(Player)');
          console.log('📋 Data details:', {
            type: data.type,
            charactersCount: data.characters?.length || 0,
            fromDM: data.fromDM || false,
            characterNames: data.characters?.map((c: Character) => c.name) || []
          });
          
          if (data.type === 'characters-update') {
            // Validate that we're receiving valid character data
            if (Array.isArray(data.characters) && data.characters.length >= 0) {
              setCharacters(currentCharacters => {
                console.log('🔄 Before update - Current characters:', currentCharacters.length, currentCharacters.map((c: Character) => c.name));
                console.log('🔄 Incoming characters:', data.characters.length, data.characters.map((c: Character) => c.name));
                
                // For players: don't let empty arrays from DM clear local characters
                if (!isDM && data.fromDM && data.characters.length === 0 && currentCharacters.length > 0) {
                  console.log('🛡️ Player: Preventing DM empty array from clearing local characters');
                  return currentCharacters; // Keep existing characters
                }
                
                // If we're the DM, save to localStorage and broadcast back to all players
                if (isDM && roomCode.trim() !== '') {
                  const roomData: RoomData = {
                    characters: data.characters,
                    lastUpdated: Date.now(),
                    dmDeviceId: deviceId
                  };
                  localStorage.setItem(`dnd_room_${roomCode}`, JSON.stringify(roomData));
                  console.log('💾 DM saved received characters to localStorage');
                  
                  // Broadcast the updated characters back to all players via WebRTC
                  // Only if this is coming from a player (not from DM broadcasting back)
                  if (connectionManager.current && connectionManager.current.isConnected() && !data.fromDM) {
                    const success = connectionManager.current.sendData({
                      type: 'characters-update',
                      characters: data.characters,
                      fromDM: true  // Mark this as coming from DM to prevent loops
                    });
                    console.log('📤 DM broadcasted characters back to players:', success ? 'success' : 'failed');
                  }
                }
                
                // For players: if selectedCharacter is empty and we have characters, auto-select the first one
                if (!isDM && !selectedCharacter && data.characters.length > 0) {
                  console.log('🎯 Auto-selecting first character for player:', data.characters[0].name);
                  setSelectedCharacter(data.characters[0].id);
                }
                
                console.log('✅ Updated characters from WebRTC:', data.characters.length, 'characters');
                return data.characters;
              });
            } else {
              console.warn('⚠️ Received invalid character data via WebRTC:', data);
            }
          }
        },
        onError: (error: Error) => {
          console.error('WebRTC error:', error);
          // Don't alert - just log the error and continue with localStorage sync
        }
      };
      
      // Create connection manager
      connectionManager.current = new WebRTCConnectionManager(
        deviceId,
        roomCode,
        isDM,
        events
      );
      
      // Start connection
      connectionManager.current.connect();
      
      console.log('WebRTC connection initiated');
    } catch (error) {
      console.error('Error creating WebRTC connection:', error);
      // Continue with localStorage-only sync
    }
  };

  const cleanupConnection = () => {
    console.log('Cleaning up connections');
    
    if (connectionManager.current) {
      connectionManager.current.disconnect();
      connectionManager.current = null;
    }
    
    // Clear sync interval
    if (syncInterval.current) {
      clearInterval(syncInterval.current);
      syncInterval.current = null;
    }
  };

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
    cleanupConnection();
    
    // Only clear room-specific localStorage if explicitly leaving (not on connection errors)
    // Don't cleanup room data automatically to prevent data loss
    setIsConnected(false);
  };


  // File operations
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupConnection();
    };
  }, []);

  // Sync when connected as player
  useEffect(() => {
    if (isConnected && !isDM && roomCode.trim() !== '') {
      requestSync();
    }
  }, [isConnected, isDM, roomCode]);

  // Separate effect for character changes to avoid infinite loops
  // Save to localStorage only, no WebRTC broadcast to prevent loops
  useEffect(() => {
    if (isDM && roomCode.trim() !== '' && characters.length > 0) {
      saveRoomData(characters, false); // No broadcast, just localStorage save
    }
  }, [characters, isDM, roomCode, deviceId]);

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
                  onUpdateCharacter={updateCharacter}
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