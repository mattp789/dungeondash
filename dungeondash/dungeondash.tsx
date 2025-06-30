import React, { useState, useCallback } from 'react';
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

// Message types for WebRTC communication (unused but kept for future implementation)
// interface Message {
//   type: 'character-update' | 'sync-request' | 'sync-response';
//   characterId?: string;
//   character?: Character;
//   characters?: Character[];
// }

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
  
  // WebRTC refs (unused but kept for future implementation)
  // const peerConnection = useRef<RTCPeerConnection | null>(null);
  // const dataChannel = useRef<RTCDataChannel | null>(null);

  // Initialize WebRTC (unused but kept for future implementation)
  // const initWebRTC = async () => {
  //   const configuration = {
  //     iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  //   };
  //   
  //   peerConnection.current = new RTCPeerConnection(configuration);
  //   
  //   peerConnection.current.onicecandidate = (event) => {
  //     if (event.candidate) {
  //       console.log('ICE candidate:', event.candidate);
  //     }
  //   };
  //   
  //   peerConnection.current.ondatachannel = (event) => {
  //     const channel = event.channel;
  //     channel.onopen = () => console.log('Connected');
  //     channel.onmessage = handleMessage;
  //     dataChannel.current = channel;
  //   };
  // };

  // WebRTC message handler (unused but kept for future implementation)
  // const handleMessage = (event: MessageEvent) => {
  //   const message: Message = JSON.parse(event.data);
  //   
  //   switch (message.type) {
  //     case 'character-update':
  //       if (message.character) {
  //         setCharacters(prev => 
  //           prev.map(char => 
  //             char.id === message.character!.id ? message.character! : char
  //           )
  //         );
  //       }
  //       break;
  //     case 'sync-request':
  //       if (isDM && dataChannel.current) {
  //         dataChannel.current.send(JSON.stringify({
  //           type: 'sync-response',
  //           characters
  //         }));
  //       }
  //       break;
  //     case 'sync-response':
  //       if (message.characters) {
  //         setCharacters(message.characters);
  //       }
  //       break;
  //   }
  // };

  const broadcastCharacterUpdate = (_character: Character) => {
    // WebRTC broadcasting disabled for now
    // if (dataChannel.current && dataChannel.current.readyState === 'open') {
    //   dataChannel.current.send(JSON.stringify({
    //     type: 'character-update',
    //     character
    //   }));
    // }
  };

  const updateCharacter = useCallback((characterId: string, updates: Partial<Character>) => {
    setCharacters(prev => {
      const updated = prev.map(char => 
        char.id === characterId ? { ...char, ...updates } : char
      );
      
      const updatedChar = updated.find(char => char.id === characterId);
      if (updatedChar) {
        broadcastCharacterUpdate(updatedChar);
      }
      
      return updated;
    });
  }, []);

  const addCharacter = () => {
    if (newCharacter.name && newCharacter.class) {
      const character = { ...newCharacter, id: Date.now().toString() };
      setCharacters(prev => [...prev, character]);
      setNewCharacter({ ...initialCharacter, id: Date.now().toString() });
      setShowAddCharacter(false);
      broadcastCharacterUpdate(character);
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

          const restoredChar = {
            ...char,
            hp: { ...char.hp, current: char.hp.max },
            spellSlots: restoredSpellSlots
          };
          
          broadcastCharacterUpdate(restoredChar);
          return restoredChar;
        }
        return char;
      });
      
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