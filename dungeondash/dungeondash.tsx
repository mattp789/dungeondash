import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Smartphone, Monitor, Download, Upload, Shield, Heart, Zap, Dice6, Moon, ChevronDown } from 'lucide-react';
import { WebSocketConnectionManager, ConnectionEvents } from './src/webrtc/WebSocketManager';

// Character interface
interface Character {
  id: string;
  name: string;
  class: string;
  level: number;
  hp: { current: number; max: number };
  ac: number;
  initiative?: number;
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
  createdBy?: string; // Device ID of who created this character
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
  initiative: 0,
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
  notes: '',
  createdBy: undefined
};

// StatBlock component - DM View with Arcane Magical Visualization
const StatBlock = React.memo(({ 
  character, 
  onUpdateCharacter, 
  onLongRest 
}: { 
  character: Character;
  onUpdateCharacter: (id: string, updates: Partial<Character>) => void;
  onLongRest: (id: string) => void;
}) => (
  <div className="bg-gradient-to-br from-indigo-950/90 to-purple-950/90 rounded-2xl shadow-2xl p-4 border-2 border-purple-600/50 backdrop-blur-lg relative overflow-hidden"
       style={{
         backgroundImage: `
           radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.1) 0%, transparent 50%),
           radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.1) 0%, transparent 50%),
           radial-gradient(circle at 40% 60%, rgba(168, 85, 247, 0.05) 0%, transparent 50%)
         `
       }}>
    
    {/* Magical Background Effects */}
    <div className="absolute inset-0 opacity-20">
      <div className="absolute top-2 right-2 w-8 h-8 bg-purple-400/30 rounded-full blur-sm animate-pulse"></div>
      <div className="absolute bottom-4 left-4 w-6 h-6 bg-blue-400/30 rounded-full blur-sm animate-pulse" style={{animationDelay: '1s'}}></div>
      <div className="absolute top-1/2 left-1/3 w-4 h-4 bg-indigo-400/30 rounded-full blur-sm animate-pulse" style={{animationDelay: '2s'}}></div>
    </div>

    {/* Character Header */}
    <div className="relative z-10 mb-4">
      <div className="flex items-center justify-between mb-2">
        <input
          type="text"
          value={character.name}
          onChange={(e) => onUpdateCharacter(character.id, { name: e.target.value })}
          className="text-xl font-bold text-purple-100 bg-transparent border-none outline-none focus:bg-purple-900/50 focus:px-2 focus:py-1 focus:rounded transition-all placeholder-purple-300"
          placeholder="Character Name"
          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
        />
        <div className="flex items-center space-x-2">
          <div className="text-sm text-purple-100 font-medium">Level {character.level} {character.class}</div>
          {character.createdBy && (
            <div className="text-xs text-purple-200">👤</div>
          )}
        </div>
      </div>
      
      {/* Initiative Tracker */}
      <div className="flex items-center justify-center mb-3">
        <div className="bg-gradient-to-r from-amber-900/80 to-orange-900/80 rounded-full px-4 py-2 border border-amber-600/50 backdrop-blur-sm">
          <div className="flex items-center space-x-2">
            <span className="text-amber-100 text-sm font-bold">⚡ Initiative:</span>
            <input
              type="number"
              value={character.initiative || 0}
              onChange={(e) => onUpdateCharacter(character.id, { initiative: parseInt(e.target.value) || 0 })}
              className="w-16 px-2 py-1 bg-amber-950/70 text-amber-100 border border-amber-600/50 rounded text-center text-sm font-bold focus:outline-none focus:border-amber-400"
              style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
            />
          </div>
        </div>
      </div>
    </div>

    {/* HP and AC Section */}
    <div className="relative z-10 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Heart className="w-5 h-5 text-red-400" />
          <span className="font-semibold text-purple-100">HP:</span>
          <span className="text-lg text-white font-bold">{character.hp.current}/{character.hp.max}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Shield className="w-5 h-5 text-blue-400" />
          <span className="font-semibold text-purple-100">AC:</span>
          <span className="text-lg text-white font-bold">{character.ac}</span>
        </div>
      </div>
      
      {/* Enhanced HP Bar */}
      <div className="w-full bg-gray-800/50 rounded-full h-4 border border-purple-600/30 overflow-hidden">
        <div 
          className={`h-4 rounded-full transition-all duration-500 relative ${
            character.hp.max === 0 ? 'bg-gray-600' :
            character.hp.current / character.hp.max > 0.6 ? 'bg-gradient-to-r from-emerald-500 to-green-400' :
            character.hp.current / character.hp.max > 0.3 ? 'bg-gradient-to-r from-yellow-500 to-orange-400' : 
            'bg-gradient-to-r from-red-500 to-red-400'
          }`}
          style={{ 
            width: character.hp.max === 0 ? '0%' : 
            `${Math.max(0, Math.min(100, (character.hp.current / character.hp.max) * 100))}%`,
            boxShadow: character.hp.current > 0 ? '0 0 10px rgba(255,255,255,0.3)' : 'none'
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
        </div>
      </div>
      <div className="text-xs text-purple-100 mt-1 text-center font-medium">
        {character.hp.max === 0 ? '0' : Math.round(Math.min(100, (character.hp.current / character.hp.max) * 100))}% Vitality
      </div>
    </div>

    {/* Arcane Spell Slots Visualization */}
    <div className="relative z-10 mb-4">
      <h4 className="font-semibold text-white mb-3 flex items-center">
        <Zap className="w-5 h-5 mr-2 text-purple-200" />
        🔮 Arcane Energies
      </h4>
      <div className="bg-purple-950/30 rounded-xl p-4 border border-purple-600/30 backdrop-blur-sm">
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(character.spellSlots).map(([level, slots]) => (
            slots.max > 0 && (
              <div key={level} className="text-center">
                <div className="text-xs font-bold text-white mb-2">{level} Level</div>
                <div className="flex justify-center space-x-1 mb-2">
                  {Array.from({ length: slots.max }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        const newCurrent = i < slots.current ? i : i + 1;
                        onUpdateCharacter(character.id, {
                          spellSlots: {
                            ...character.spellSlots,
                            [level]: { ...slots, current: Math.min(newCurrent, slots.max) }
                          }
                        });
                      }}
                      className={`w-6 h-6 rounded-full border-2 transition-all duration-500 cursor-pointer relative overflow-hidden ${
                        i < slots.current
                          ? `bg-gradient-to-br from-purple-400 via-blue-500 to-indigo-600 border-purple-300 shadow-lg transform scale-110`
                          : 'bg-gray-700/50 border-purple-500/30 hover:border-purple-400/50 hover:bg-purple-800/30'
                      }`}
                      style={{
                        boxShadow: i < slots.current ? 
                          `0 0 15px rgba(147, 58, 230, 0.6), inset 0 0 10px rgba(255, 255, 255, 0.2)` : 
                          'none',
                        animation: i < slots.current ? 'pulse 2s infinite' : 'none'
                      }}
                    >
                      {i < slots.current && (
                        <>
                          <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent"></div>
                          <div className="absolute inset-1 rounded-full bg-gradient-to-br from-purple-300/50 to-transparent animate-spin"></div>
                          <span className="relative z-10 text-xs text-white font-bold">✨</span>
                        </>
                      )}
                    </button>
                  ))}
                </div>
                <div className="text-xs text-white font-bold">
                  {slots.current}/{slots.max}
                </div>
              </div>
            )
          ))}
        </div>
      </div>
    </div>

    {/* Ability Scores */}
    <div className="relative z-10 mb-4">
      <h4 className="font-semibold text-white mb-3">⚡ Abilities</h4>
      <div className="grid grid-cols-3 gap-3 text-sm">
        {Object.entries(character.stats).map(([stat, value]) => {
          const modifier = Math.floor((value - 10) / 2);
          return (
            <div key={stat} className="text-center bg-purple-900/30 rounded-lg p-2 border border-purple-600/30">
              <div className="font-semibold text-white uppercase text-xs">{stat}</div>
              <div className="text-lg text-white font-bold">{value}</div>
              <div className="text-xs text-purple-100">
                {modifier >= 0 ? '+' : ''}{modifier}
              </div>
            </div>
          );
        })}
      </div>
    </div>

    {/* Conditions */}
    {character.conditions.length > 0 && (
      <div className="relative z-10 mb-4">
        <h4 className="font-semibold text-white mb-2">🪄 Magical Effects</h4>
        <div className="flex flex-wrap gap-2">
          {character.conditions.map((condition, idx) => (
            <span key={idx} className="px-3 py-1 bg-red-900/60 text-red-100 rounded-full text-xs border border-red-600/30 backdrop-blur-sm font-medium">
              {condition}
            </span>
          ))}
        </div>
      </div>
    )}
    
    {/* Long Rest Button */}
    <div className="relative z-10 pt-4 border-t border-purple-600/30">
      <button
        onClick={() => onLongRest(character.id)}
        className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-indigo-700 to-purple-700 text-purple-100 rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all duration-200 border border-purple-500/50 shadow-lg"
      >
        <Moon className="w-5 h-5" />
        <span className="font-semibold">🌙 Mystical Rest</span>
      </button>
    </div>
  </div>
));

// CharacterEditor component - Mobile Optimized & Tavern Themed
const CharacterEditor = React.memo(({ 
  character, 
  onUpdateCharacter, 
  onLongRest 
}: { 
  character: Character;
  onUpdateCharacter: (id: string, updates: Partial<Character>) => void;
  onLongRest: (id: string) => void;
}) => (
  <div className="bg-gradient-to-br from-amber-950/90 to-orange-950/90 rounded-2xl shadow-2xl p-4 sm:p-6 border-2 border-amber-600/50 backdrop-blur-lg"
       style={{
         backgroundImage: `
           linear-gradient(45deg, rgba(120, 53, 15, 0.1) 25%, transparent 25%),
           linear-gradient(-45deg, rgba(120, 53, 15, 0.1) 25%, transparent 25%),
           linear-gradient(45deg, transparent 75%, rgba(120, 53, 15, 0.1) 75%),
           linear-gradient(-45deg, transparent 75%, rgba(120, 53, 15, 0.1) 75%)
         `,
         backgroundSize: '20px 20px',
         backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
       }}>
    
    {/* Character Header */}
    <div className="text-center mb-6 bg-amber-950/50 rounded-2xl p-4 border border-amber-600/30">
      <h2 className="text-2xl sm:text-3xl font-bold text-amber-100 mb-2" style={{ fontFamily: 'serif', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
        📜 Character Sheet
      </h2>
      <p className="text-amber-300 text-sm italic">Edit your hero's details</p>
    </div>

    {/* Character Name - Prominent */}
    <div className="mb-6">
      <label className="block text-amber-100 text-sm font-bold mb-3">🏷️ Hero's True Name</label>
      <input
        type="text"
        value={character.name}
        onChange={(e) => onUpdateCharacter(character.id, { name: e.target.value })}
        className="w-full px-4 py-4 bg-amber-950/70 text-amber-100 placeholder-amber-300/60 border-2 border-amber-600/50 rounded-xl text-xl font-bold focus:outline-none focus:border-amber-400 backdrop-blur-sm"
        placeholder="Enter your hero's name..."
        style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
      />
    </div>

    {/* Class and Level - Mobile friendly grid */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
      <div>
        <label className="block text-amber-100 text-sm font-bold mb-3">🎭 Heroic Class</label>
        <input
          type="text"
          value={character.class}
          onChange={(e) => onUpdateCharacter(character.id, { class: e.target.value })}
          className="w-full px-4 py-3 bg-amber-950/70 text-amber-100 placeholder-amber-300/60 border-2 border-amber-600/50 rounded-xl focus:outline-none focus:border-amber-400 backdrop-blur-sm text-lg"
          placeholder="Fighter, Wizard, etc..."
          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
        />
      </div>
      <div>
        <label className="block text-amber-200 text-sm font-medium mb-3">⭐ Experience Level</label>
        <input
          type="number"
          min="1"
          max="20"
          value={character.level}
          onChange={(e) => onUpdateCharacter(character.id, { level: parseInt(e.target.value) || 1 })}
          className="w-full px-4 py-3 bg-amber-950/70 text-amber-100 placeholder-amber-300/60 border-2 border-amber-600/50 rounded-xl focus:outline-none focus:border-amber-400 backdrop-blur-sm text-lg"
          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
        />
      </div>
    </div>

    {/* HP Section - Large and prominent for mobile */}
    <div className="mb-6 bg-gradient-to-r from-red-900/80 to-red-800/80 rounded-2xl p-4 sm:p-6 border-2 border-red-600/50 backdrop-blur-sm">
      <div className="text-center mb-4">
        <h3 className="text-red-200 font-bold text-lg mb-2">❤️ Life Force</h3>
        <div className="text-red-100 font-bold text-3xl sm:text-4xl mb-3" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
          {character.hp.current} / {character.hp.max}
        </div>
        {/* HP Bar */}
        <div className="w-full bg-red-950/50 rounded-full h-4 mb-4">
          <div 
            className="bg-gradient-to-r from-red-500 to-red-400 h-4 rounded-full transition-all duration-300" 
            style={{ width: `${Math.max(0, (character.hp.current / character.hp.max) * 100)}%` }}
          ></div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-red-200 text-sm font-medium mb-2">Current HP</label>
          <input
            type="number"
            min="0"
            value={character.hp.current}
            onChange={(e) => onUpdateCharacter(character.id, { hp: { ...character.hp, current: parseInt(e.target.value) || 0 } })}
            className="w-full px-4 py-3 bg-red-950/70 text-red-100 border-2 border-red-600/50 rounded-xl focus:outline-none focus:border-red-400 backdrop-blur-sm text-lg font-bold"
            style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
          />
        </div>
        <div>
          <label className="block text-red-200 text-sm font-medium mb-2">Maximum HP</label>
          <input
            type="number"
            min="1"
            value={character.hp.max}
            onChange={(e) => onUpdateCharacter(character.id, { hp: { ...character.hp, max: parseInt(e.target.value) || 0 } })}
            className="w-full px-4 py-3 bg-red-950/70 text-red-100 border-2 border-red-600/50 rounded-xl focus:outline-none focus:border-red-400 backdrop-blur-sm text-lg font-bold"
            style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
          />
        </div>
      </div>
    </div>

    {/* AC and Initiative Section */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
      {/* Armor Class */}
      <div className="bg-gradient-to-r from-blue-900/80 to-blue-800/80 rounded-2xl p-4 border-2 border-blue-600/50 backdrop-blur-sm">
        <div className="text-center">
          <h3 className="text-blue-200 font-bold text-lg mb-3">🛡️ Armor Class</h3>
          <div className="text-blue-100 font-bold text-3xl mb-4" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
            {character.ac}
          </div>
          <input
            type="number"
            min="1"
            max="30"
            value={character.ac}
            onChange={(e) => onUpdateCharacter(character.id, { ac: parseInt(e.target.value) || 10 })}
            className="w-full px-4 py-3 bg-blue-950/70 text-blue-100 border-2 border-blue-600/50 rounded-xl focus:outline-none focus:border-blue-400 backdrop-blur-sm text-lg font-bold text-center"
            style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
          />
        </div>
      </div>

      {/* Initiative */}
      <div className="bg-gradient-to-r from-amber-900/80 to-orange-900/80 rounded-2xl p-4 border-2 border-amber-600/50 backdrop-blur-sm">
        <div className="text-center">
          <h3 className="text-amber-200 font-bold text-lg mb-3">⚡ Initiative</h3>
          <div className="text-amber-100 font-bold text-3xl mb-4" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
            {character.initiative || 0}
          </div>
          <input
            type="number"
            min="-10"
            max="30"
            value={character.initiative || 0}
            onChange={(e) => onUpdateCharacter(character.id, { initiative: parseInt(e.target.value) || 0 })}
            className="w-full px-4 py-3 bg-amber-950/70 text-amber-100 border-2 border-amber-600/50 rounded-xl focus:outline-none focus:border-amber-400 backdrop-blur-sm text-lg font-bold text-center"
            style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
          />
        </div>
      </div>
    </div>

    {/* Ability Scores Section */}
    <div className="mb-6 bg-gradient-to-br from-emerald-900/80 to-teal-900/80 rounded-2xl p-4 sm:p-6 border-2 border-emerald-600/50 backdrop-blur-sm">
      <div className="text-center mb-6">
        <h3 className="text-emerald-200 font-bold text-xl mb-2" style={{ fontFamily: 'serif', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
          ⚡ Heroic Abilities
        </h3>
        <p className="text-emerald-300 text-sm italic">Your character's core attributes</p>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {Object.entries(character.stats).map(([stat, value]) => {
          const modifier = Math.floor((value - 10) / 2);
          const statNames = {
            str: 'Strength',
            dex: 'Dexterity', 
            con: 'Constitution',
            int: 'Intelligence',
            wis: 'Wisdom',
            cha: 'Charisma'
          };
          
          return (
            <div key={stat} className="bg-emerald-950/50 rounded-xl p-4 border border-emerald-600/30 text-center">
              <div className="text-emerald-300 font-bold text-xs uppercase mb-1">{stat}</div>
              <div className="text-xs text-emerald-400 mb-3">{statNames[stat as keyof typeof statNames]}</div>
              <div className="text-emerald-100 font-bold text-2xl mb-2" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                {value}
              </div>
              <div className="text-emerald-300 text-sm mb-3">
                {modifier >= 0 ? '+' : ''}{modifier}
              </div>
              <input
                type="number"
                min="1"
                max="30"
                value={value}
                onChange={(e) => onUpdateCharacter(character.id, { 
                  stats: { ...character.stats, [stat]: parseInt(e.target.value) || 10 } 
                })}
                className="w-full px-2 py-2 bg-emerald-950/70 text-emerald-100 border border-emerald-600/50 rounded-lg focus:outline-none focus:border-emerald-400 text-center text-sm font-bold"
                style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
              />
            </div>
          );
        })}
      </div>
    </div>

    {/* Spell Slots Section */}
    <div className="mb-6 bg-gradient-to-br from-purple-900/80 to-indigo-900/80 rounded-2xl p-4 sm:p-6 border-2 border-purple-600/50 backdrop-blur-sm">
      <div className="text-center mb-6">
        <h3 className="text-white font-bold text-xl mb-2" style={{ fontFamily: 'serif', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
          🔮 Magical Energies
        </h3>
        <p className="text-purple-100 text-sm italic font-medium">Manage your spell slots</p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(character.spellSlots).map(([level, slots]) => (
          <div key={level} className="bg-purple-950/50 rounded-xl p-4 border border-purple-600/30">
            <div className="text-center mb-4">
              <h4 className="text-white font-bold text-sm mb-2">{level} Level Spells</h4>
              <div className="text-purple-100 text-lg font-bold">
                {slots.current} / {slots.max}
              </div>
            </div>
            
            {/* Spell Slot Management */}
            <div className="space-y-3">
              <div>
                <label className="block text-purple-100 text-xs mb-2 font-medium">Maximum Slots</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={slots.max}
                  onChange={(e) => {
                    const newMax = parseInt(e.target.value) || 0;
                    onUpdateCharacter(character.id, {
                      spellSlots: {
                        ...character.spellSlots,
                        [level]: { current: Math.min(slots.current, newMax), max: newMax }
                      }
                    });
                  }}
                  className="w-full px-3 py-2 bg-purple-950/70 text-white border border-purple-600/50 rounded-lg focus:outline-none focus:border-purple-400 text-center font-bold"
                  style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
                />
              </div>
              
              {slots.max > 0 && (
                <>
                  <div>
                    <label className="block text-purple-100 text-xs mb-2 font-medium">Current Slots</label>
                    <input
                      type="number"
                      min="0"
                      max={slots.max}
                      value={slots.current}
                      onChange={(e) => onUpdateCharacter(character.id, {
                        spellSlots: {
                          ...character.spellSlots,
                          [level]: { ...slots, current: Math.min(parseInt(e.target.value) || 0, slots.max) }
                        }
                      })}
                      className="w-full px-3 py-2 bg-purple-950/70 text-white border border-purple-600/50 rounded-lg focus:outline-none focus:border-purple-400 text-center font-bold"
                      style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
                    />
                  </div>
                  
                  {/* Quick Action Buttons */}
                  <div className="flex space-x-2">
                    <button
                      onClick={() => onUpdateCharacter(character.id, {
                        spellSlots: {
                          ...character.spellSlots,
                          [level]: { ...slots, current: Math.max(0, slots.current - 1) }
                        }
                      })}
                      disabled={slots.current === 0}
                      className="flex-1 px-3 py-2 bg-red-700/80 text-red-100 rounded-lg hover:bg-red-600/80 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold transition-all duration-200"
                    >
                      Cast (-1)
                    </button>
                    <button
                      onClick={() => onUpdateCharacter(character.id, {
                        spellSlots: {
                          ...character.spellSlots,
                          [level]: { ...slots, current: slots.max }
                        }
                      })}
                      disabled={slots.current === slots.max}
                      className="flex-1 px-3 py-2 bg-emerald-700/80 text-emerald-100 rounded-lg hover:bg-emerald-600/80 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold transition-all duration-200"
                    >
                      Restore
                    </button>
                  </div>
                  
                  {/* Visual Spell Slot Indicators */}
                  <div className="flex justify-center space-x-1 flex-wrap gap-1">
                    {Array.from({ length: slots.max }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => onUpdateCharacter(character.id, {
                          spellSlots: {
                            ...character.spellSlots,
                            [level]: { ...slots, current: i < slots.current ? i : i + 1 }
                          }
                        })}
                        className={`w-6 h-6 rounded-full border-2 transition-all duration-300 ${
                          i < slots.current
                            ? 'bg-gradient-to-br from-purple-400 to-purple-600 border-purple-300 shadow-lg shadow-purple-400/50'
                            : 'bg-purple-950/50 border-purple-600/50 hover:border-purple-400'
                        }`}
                        style={{
                          boxShadow: i < slots.current ? '0 0 10px rgba(147, 58, 230, 0.5)' : 'none'
                        }}
                      >
                        {i < slots.current && (
                          <span className="text-white text-xs">✨</span>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Notes Section - Mobile friendly */}
    <div className="mb-6">
      <label className="block text-amber-200 text-sm font-medium mb-3">📝 Adventure Journal</label>
      <textarea
        value={character.notes || ''}
        onChange={(e) => onUpdateCharacter(character.id, { notes: e.target.value })}
        placeholder="Record your heroic deeds, spells prepared, important notes..."
        className="w-full px-4 py-3 bg-amber-950/70 text-amber-100 placeholder-amber-300/60 border-2 border-amber-600/50 rounded-xl resize-none h-32 sm:h-40 focus:outline-none focus:border-amber-400 backdrop-blur-sm"
        style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
      />
    </div>

    {/* Long Rest Button - Large and tavern themed */}
    <div className="bg-purple-900/50 rounded-2xl p-4 sm:p-6 border border-purple-600/30 backdrop-blur-sm">
      <div className="text-center mb-4">
        <h3 className="text-white font-bold text-lg mb-2">🌙 Rest at the Tavern</h3>
        <p className="text-purple-100 text-sm font-medium">Restore your health and abilities</p>
      </div>
      <button
        onClick={() => onLongRest(character.id)}
        className="w-full flex items-center justify-center space-x-3 px-6 py-4 bg-gradient-to-r from-purple-700 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-500 transition-all duration-200 font-bold text-lg border-2 border-purple-500 shadow-lg transform hover:scale-105"
      >
        <Moon className="w-6 h-6" />
        <span>🛏️ Take a Long Rest</span>
      </button>
    </div>
  </div>
));

// Initiative Tracker Component - Floating Combat Widget
const InitiativeTracker = React.memo(({ 
  characters, 
  onUpdateCharacter 
}: { 
  characters: Character[];
  onUpdateCharacter: (id: string, updates: Partial<Character>) => void;
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [combatActive, setCombatActive] = React.useState(false);
  
  // Sort characters by initiative (descending)
  const sortedCharacters = React.useMemo(() => {
    return [...characters].sort((a, b) => (b.initiative || 0) - (a.initiative || 0));
  }, [characters]);

  const rollInitiative = (character: Character) => {
    // Roll 1d20 + dex modifier
    const dexModifier = Math.floor((character.stats.dex - 10) / 2);
    const roll = Math.floor(Math.random() * 20) + 1;
    const total = roll + dexModifier;
    
    onUpdateCharacter(character.id, { initiative: total });
  };

  const rollAllInitiative = () => {
    characters.forEach(character => {
      if (!character.initiative || character.initiative === 0) {
        rollInitiative(character);
      }
    });
    setCombatActive(true);
  };

  const clearInitiative = () => {
    characters.forEach(character => {
      onUpdateCharacter(character.id, { initiative: 0 });
    });
    setCombatActive(false);
  };

  return (
    <div className="bg-gradient-to-br from-red-950/95 to-orange-950/95 backdrop-blur-lg rounded-2xl border-2 border-red-600/50 shadow-2xl transition-all duration-300 overflow-hidden"
         style={{
           width: isExpanded ? '320px' : '80px',
           height: isExpanded ? 'auto' : '80px'
         }}>
      
      {/* Header/Toggle Button */}
      <div 
        className="flex items-center justify-center p-4 cursor-pointer hover:bg-red-900/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">⚔️</span>
              <div>
                <h3 className="text-red-200 font-bold text-sm">Initiative Tracker</h3>
                <p className="text-red-400 text-xs">Combat Order</p>
              </div>
            </div>
            <ChevronDown className="w-5 h-5 text-red-300" />
          </div>
        ) : (
          <div className="text-center">
            <span className="text-3xl">⚔️</span>
            <div className="text-red-200 text-xs font-bold mt-1">Init</div>
          </div>
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4">
          {/* Action Buttons */}
          <div className="flex space-x-2 mb-4">
            <button
              onClick={rollAllInitiative}
              className="flex-1 px-3 py-2 bg-gradient-to-r from-emerald-700 to-emerald-600 text-emerald-100 rounded-lg hover:from-emerald-600 hover:to-emerald-500 text-xs font-bold transition-all duration-200"
            >
              🎲 Roll All
            </button>
            <button
              onClick={clearInitiative}
              className="flex-1 px-3 py-2 bg-gradient-to-r from-gray-700 to-gray-600 text-gray-100 rounded-lg hover:from-gray-600 hover:to-gray-500 text-xs font-bold transition-all duration-200"
            >
              🔄 Clear
            </button>
          </div>

          {/* Character Initiative List */}
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {sortedCharacters.map((character, index) => {
              const dexModifier = Math.floor((character.stats.dex - 10) / 2);
              const isFirst = index === 0 && combatActive;
              
              return (
                <div 
                  key={character.id}
                  className={`bg-red-950/50 rounded-lg p-3 border transition-all duration-200 ${
                    isFirst 
                      ? 'border-yellow-400/60 bg-yellow-900/20 shadow-lg shadow-yellow-400/20' 
                      : 'border-red-600/30 hover:border-red-500/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {isFirst && <span className="text-yellow-400 text-sm">👑</span>}
                      <div>
                        <div className="text-red-100 font-bold text-sm truncate" style={{ maxWidth: '120px' }}>
                          {character.name}
                        </div>
                        <div className="text-red-400 text-xs">
                          Dex: {character.stats.dex} ({dexModifier >= 0 ? '+' : ''}{dexModifier})
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-red-200 font-bold text-lg">
                        {character.initiative || 0}
                      </div>
                      <button
                        onClick={() => rollInitiative(character)}
                        className="text-red-400 hover:text-red-300 text-xs transition-colors"
                      >
                        🎲 Roll
                      </button>
                    </div>
                  </div>
                  
                  {/* Quick Initiative Input */}
                  <input
                    type="number"
                    value={character.initiative || 0}
                    onChange={(e) => onUpdateCharacter(character.id, { 
                      initiative: parseInt(e.target.value) || 0 
                    })}
                    className="w-full px-2 py-1 bg-red-950/70 text-red-100 border border-red-600/50 rounded text-center text-sm focus:outline-none focus:border-red-400"
                    placeholder="Initiative"
                  />
                </div>
              );
            })}
          </div>

          {characters.length === 0 && (
            <div className="text-center py-4">
              <div className="text-red-400 text-sm">No characters in party</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default function DNDDashboard() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isDM, setIsDM] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<string>('');
  const [roomCode, setRoomCode] = useState('');
  const [showAddCharacter, setShowAddCharacter] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [deviceId] = useState(() => `device_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`);
  const [newCharacter, setNewCharacter] = useState<Character>({ ...initialCharacter, id: Date.now().toString() });
  
  const syncInterval = useRef<number | null>(null);
  const connectionManager = useRef<WebSocketConnectionManager | null>(null);

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
          // For players, try WebRTC first, then fall back to localStorage
          if (connectionManager.current && connectionManager.current.isConnectedToServer()) {
            const success = connectionManager.current.sendData({
              type: 'characters-update',
              characters: updated
            });
            console.log('Player sent character update via WebRTC:', success ? 'success' : 'failed');
          } else {
            // Fallback: Write to localStorage if WebRTC is not available
            console.log('Player WebRTC not connected, writing update to localStorage');
            const roomData: RoomData = {
              characters: updated,
              lastUpdated: Date.now(),
              dmDeviceId: 'pending' // Mark as pending for DM to acknowledge
            };
            localStorage.setItem(`dnd_room_${roomCode}`, JSON.stringify(roomData));
            console.log('💾 Player saved character update to localStorage');
          }
        }
      }
      
      return updated;
    });
  }, [isDM, roomCode, deviceId]);

  const addCharacter = () => {
    if (newCharacter.name && newCharacter.class) {
      const character = { 
        ...newCharacter, 
        id: Date.now().toString(),
        createdBy: deviceId // Track who created this character
      };
      setCharacters(prev => {
        const updated = [...prev, character];
        
        // Save to localStorage and broadcast for both DM and players
        if (roomCode.trim() !== '') {
          if (isDM) {
            saveRoomData(updated, true); // DM adding character should broadcast
          } else {
            // For players, try WebRTC first, then fall back to localStorage
            console.log('📤 Player preparing to send characters:', updated.length, updated.map((c: Character) => c.name));
            if (connectionManager.current && connectionManager.current.isConnectedToServer()) {
              const success = connectionManager.current.sendData({
                type: 'characters-update',
                characters: updated
              });
              console.log('📤 Player sent new character via WebRTC:', success ? 'success' : 'failed');
            } else {
              // Fallback: Write to localStorage if WebRTC is not available
              console.log('📤 Player WebRTC not connected, writing to localStorage');
              const roomData: RoomData = {
                characters: updated,
                lastUpdated: Date.now(),
                dmDeviceId: 'pending' // Mark as pending for DM to acknowledge
              };
              localStorage.setItem(`dnd_room_${roomCode}`, JSON.stringify(roomData));
              console.log('💾 Player saved characters to localStorage');
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
      
      setNewCharacter({ ...initialCharacter, id: Date.now().toString(), createdBy: deviceId });
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
          // For players, try WebRTC first, then fall back to localStorage
          if (connectionManager.current && connectionManager.current.isConnectedToServer()) {
            const success = connectionManager.current.sendData({
              type: 'characters-update',
              characters: updated
            });
            console.log('Player sent long rest update via WebRTC:', success ? 'success' : 'failed');
          } else {
            // Fallback: Write to localStorage if WebRTC is not available
            console.log('Player WebRTC not connected, writing long rest update to localStorage');
            const roomData: RoomData = {
              characters: updated,
              lastUpdated: Date.now(),
              dmDeviceId: 'pending' // Mark as pending for DM to acknowledge
            };
            localStorage.setItem(`dnd_room_${roomCode}`, JSON.stringify(roomData));
            console.log('💾 Player saved long rest update to localStorage');
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
      if (shouldBroadcast && connectionManager.current && connectionManager.current.isConnectedToServer()) {
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
    
    // Check for player updates and save current state
    const checkForPlayerUpdates = () => {
      const roomDataStr = localStorage.getItem(`dnd_room_${roomCode}`);
      if (roomDataStr) {
        try {
          const roomData: RoomData = JSON.parse(roomDataStr);
          // If dmDeviceId is 'pending', it means a player without WebRTC made changes
          if (roomData.dmDeviceId === 'pending' && Array.isArray(roomData.characters)) {
            console.log('📥 DM found pending player updates in localStorage');
            setCharacters(roomData.characters);
            // Acknowledge by saving with proper DM device ID
            saveRoomData(roomData.characters, true); // Broadcast the update
            return;
          }
        } catch (error) {
          console.error('Error checking for player updates:', error);
        }
      }
      // Normal periodic save - use current characters state
      setCharacters(current => {
        saveRoomData(current, false);
        return current;
      });
    };
    
    // Periodic sync to keep room alive and check for player updates
    syncInterval.current = window.setInterval(checkForPlayerUpdates, 2000);
  };

  const startPlayerSync = () => {
    const checkForUpdates = () => {
      // Skip localStorage sync if WebRTC is connected and working
      if (connectionManager.current && connectionManager.current.isConnectedToServer()) {
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
    console.log(`Creating WebSocket connection as ${isDM ? 'host' : 'client'}`);
    
    try {
      // Create WebSocket connection events
      const events: ConnectionEvents = {
        onConnectionStateChange: (connected: boolean) => {
          console.log('WebSocket connection state changed:', connected, isDM ? '(DM)' : '(Player)');
          setIsConnected(connected);
        },
        onDataReceived: (data: any) => {
          console.log('📨 Received data via WebSocket:', data.type, isDM ? '(DM)' : '(Player)');
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
                  
                  // Broadcast the updated characters back to all players via WebSocket
                  // Only if this is coming from a player (not from DM broadcasting back)
                  if (connectionManager.current && connectionManager.current.isConnectedToServer() && !data.fromDM) {
                    const success = connectionManager.current.sendData({
                      type: 'characters-update',
                      characters: data.characters,
                      fromDM: true  // Mark this as coming from DM to prevent loops
                    });
                    console.log('📤 DM broadcasted characters back to players:', success ? 'success' : 'failed');
                  }
                }
                
                // For players: if selectedCharacter is empty, try to find their own character
                if (!isDM && !selectedCharacter && data.characters.length > 0) {
                  // Find a character created by this player
                  const myCharacter = data.characters.find((char: Character) => char.createdBy === deviceId);
                  if (myCharacter) {
                    console.log('🎯 Auto-selecting player\'s own character:', myCharacter.name);
                    setSelectedCharacter(myCharacter.id);
                  } else {
                    console.log('ℹ️ No character found for this player - they need to create one');
                  }
                }
                
                console.log('✅ Updated characters from WebSocket:', data.characters.length, 'characters');
                return data.characters;
              });
            } else {
              console.warn('⚠️ Received invalid character data via WebSocket:', data);
            }
          }
        },
        onError: (error: Error) => {
          console.error('WebSocket error:', error);
          // Don't alert - just log the error and continue with localStorage sync
        }
      };
      
      // Create connection manager
      connectionManager.current = new WebSocketConnectionManager(
        deviceId,
        roomCode,
        isDM,
        events
      );
      
      // Start connection
      connectionManager.current.connect();
      
      console.log('WebSocket connection initiated');
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
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

  // Initialize newCharacter with deviceId
  useEffect(() => {
    setNewCharacter(prev => ({ ...prev, createdBy: deviceId }));
  }, [deviceId]);

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
    <div className="min-h-screen bg-gradient-to-br from-amber-900 via-orange-900 to-red-900 p-2 sm:p-4" 
         style={{
           backgroundImage: `
             radial-gradient(circle at 20% 50%, rgba(120, 53, 15, 0.3) 0%, transparent 50%),
             radial-gradient(circle at 80% 20%, rgba(156, 39, 176, 0.2) 0%, transparent 50%),
             radial-gradient(circle at 40% 80%, rgba(255, 111, 0, 0.2) 0%, transparent 50%)
           `
         }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-950/90 to-orange-950/90 backdrop-blur-lg rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 border-2 border-amber-600/50 shadow-2xl" 
             style={{
               backgroundImage: `
                 linear-gradient(45deg, rgba(120, 53, 15, 0.1) 25%, transparent 25%),
                 linear-gradient(-45deg, rgba(120, 53, 15, 0.1) 25%, transparent 25%),
                 linear-gradient(45deg, transparent 75%, rgba(120, 53, 15, 0.1) 75%),
                 linear-gradient(-45deg, transparent 75%, rgba(120, 53, 15, 0.1) 75%)
               `,
               backgroundSize: '20px 20px',
               backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
             }}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="relative">
                <Dice6 className="w-8 h-8 sm:w-10 sm:h-10 text-amber-300 drop-shadow-lg" />
                <div className="absolute inset-0 w-8 h-8 sm:w-10 sm:h-10 bg-amber-300/20 rounded blur-sm"></div>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-amber-100 drop-shadow-lg" 
                    style={{ fontFamily: 'serif', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
                  🏰 Tavern Tales
                </h1>
                <p className="text-xs sm:text-sm text-amber-300/80 italic hidden sm:block">
                  A Digital Adventurer's Companion
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2">
                  <input
                    type="text"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    placeholder="TAVERN"
                    className="px-3 py-2 rounded-lg bg-amber-950/80 text-amber-100 placeholder-amber-300/60 border-2 border-amber-600/50 text-sm w-20 sm:w-24 focus:outline-none focus:border-amber-400 backdrop-blur-sm font-mono"
                    maxLength={6}
                    style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
                  />
                  {!isConnected ? (
                    <button
                      onClick={joinRoom}
                      className="px-4 py-2 bg-gradient-to-r from-emerald-700 to-emerald-600 text-amber-100 rounded-lg hover:from-emerald-600 hover:to-emerald-500 text-sm font-semibold border-2 border-emerald-500 shadow-lg transition-all duration-200 min-w-[60px]"
                      disabled={roomCode.trim() === ''}
                    >
                      🚪 Enter
                    </button>
                  ) : (
                    <button
                      onClick={leaveRoom}
                      className="px-4 py-2 bg-gradient-to-r from-red-700 to-red-600 text-amber-100 rounded-lg hover:from-red-600 hover:to-red-500 text-sm font-semibold border-2 border-red-500 shadow-lg transition-all duration-200 min-w-[60px]"
                    >
                      🚪 Leave
                    </button>
                  )}
                </div>
                
                <div className="flex items-center space-x-2 bg-amber-950/50 px-3 py-1 rounded-full border border-amber-600/30">
                  <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-400 shadow-emerald-400/50 shadow-md' : 'bg-red-400 shadow-red-400/50 shadow-md'} animate-pulse`}></div>
                  <span className="text-amber-200 text-xs sm:text-sm font-medium">
                    {isConnected ? '🟢 In Tavern' : '🔴 Wandering'}
                  </span>
                </div>
              </div>
              
              <button
                onClick={() => setIsDM(!isDM)}
                className={`flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 rounded-lg transition-all duration-200 border-2 font-semibold text-sm ${
                  isDM 
                    ? 'bg-gradient-to-r from-purple-800 to-purple-700 text-amber-100 border-purple-600 shadow-lg hover:from-purple-700 hover:to-purple-600' 
                    : 'bg-gradient-to-r from-amber-800/50 to-amber-700/50 text-amber-100 border-amber-600/50 hover:from-amber-700/60 hover:to-amber-600/60 shadow-md'
                }`}
              >
                {isDM ? <Monitor className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
                <span className="hidden sm:inline">{isDM ? '👑 Tavern Keeper' : '🗡️ Adventurer'}</span>
                <span className="sm:hidden">{isDM ? '👑' : '🗡️'}</span>
              </button>
              
              <div className="flex space-x-1 sm:space-x-2">
                <button
                  onClick={savePartyData}
                  className="flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-emerald-700 to-emerald-600 text-amber-100 rounded-lg hover:from-emerald-600 hover:to-emerald-500 transition-all duration-200 border-2 border-emerald-500 shadow-lg font-semibold text-sm"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">📜 Save</span>
                </button>
                
                <label className="flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-700 to-blue-600 text-amber-100 rounded-lg hover:from-blue-600 hover:to-blue-500 transition-all duration-200 cursor-pointer border-2 border-blue-500 shadow-lg font-semibold text-sm">
                  <Upload className="w-4 h-4" />
                  <span className="hidden sm:inline">📚 Load</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={loadPartyData}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
          
          {roomCode.trim() !== '' && (
            <div className="mt-4 text-center">
              <div className="inline-flex items-center space-x-2 bg-amber-950/60 px-4 py-2 rounded-full border border-amber-600/40">
                <span className="text-amber-200 text-sm">🏰</span>
                <p className="text-amber-200 text-sm font-medium">
                  Tavern: <span className="font-mono font-bold text-amber-100">{roomCode}</span>
                  <span className="text-amber-300/80"> {isDM ? '(👑 Keeper)' : '(🗡️ Guest)'}</span>
                </p>
              </div>
            </div>
          )}
          
          {characters.length === 0 && (
            <div className="mt-6 text-center">
              <div className="bg-amber-950/40 rounded-2xl p-6 border-2 border-amber-600/30 backdrop-blur-sm">
                <div className="text-6xl mb-4">🍺</div>
                <p className="text-amber-200 mb-6 text-lg font-medium">The tavern awaits your first adventurer!</p>
                <button
                  onClick={() => setShowAddCharacter(true)}
                  className="px-8 py-4 bg-gradient-to-r from-amber-600 to-amber-500 text-amber-950 rounded-xl hover:from-amber-500 hover:to-amber-400 transition-all duration-200 font-bold text-lg border-2 border-amber-400 shadow-xl transform hover:scale-105"
                >
                  ⚔️ Create Your First Hero
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Character Management */}
        {showAddCharacter && (
          <div className="bg-gradient-to-br from-amber-950/90 to-orange-950/90 rounded-2xl shadow-2xl p-4 sm:p-6 mb-4 sm:mb-6 border-2 border-amber-600/50 backdrop-blur-lg"
               style={{
                 backgroundImage: `
                   linear-gradient(45deg, rgba(120, 53, 15, 0.1) 25%, transparent 25%),
                   linear-gradient(-45deg, rgba(120, 53, 15, 0.1) 25%, transparent 25%),
                   linear-gradient(45deg, transparent 75%, rgba(120, 53, 15, 0.1) 75%),
                   linear-gradient(-45deg, transparent 75%, rgba(120, 53, 15, 0.1) 75%)
                 `,
                 backgroundSize: '20px 20px',
                 backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
               }}>
            <div className="text-center mb-6">
              <h3 className="text-xl sm:text-2xl font-bold text-amber-100 mb-2" style={{ fontFamily: 'serif', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
                ⚔️ Register a New Adventurer
              </h3>
              <p className="text-amber-300 text-sm italic">Fill out the tavern's guest book</p>
            </div>
            
            <div className="grid grid-cols-1 gap-4 mb-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-amber-200 text-sm font-medium mb-2">🏷️ Hero's Name</label>
                  <input
                    type="text"
                    placeholder="Enter your hero's name..."
                    value={newCharacter.name}
                    onChange={(e) => setNewCharacter({ ...newCharacter, name: e.target.value })}
                    className="w-full px-4 py-3 bg-amber-950/70 text-amber-100 placeholder-amber-300/60 border-2 border-amber-600/50 rounded-lg focus:outline-none focus:border-amber-400 backdrop-blur-sm text-lg"
                    style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-amber-200 text-sm font-medium mb-2">🎭 Class</label>
                    <input
                      type="text"
                      placeholder="Fighter, Wizard, etc..."
                      value={newCharacter.class}
                      onChange={(e) => setNewCharacter({ ...newCharacter, class: e.target.value })}
                      className="w-full px-4 py-3 bg-amber-950/70 text-amber-100 placeholder-amber-300/60 border-2 border-amber-600/50 rounded-lg focus:outline-none focus:border-amber-400 backdrop-blur-sm"
                      style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-amber-200 text-sm font-medium mb-2">⭐ Level</label>
                    <input
                      type="number"
                      placeholder="1"
                      min="1"
                      max="20"
                      value={newCharacter.level}
                      onChange={(e) => setNewCharacter({ ...newCharacter, level: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-3 bg-amber-950/70 text-amber-100 placeholder-amber-300/60 border-2 border-amber-600/50 rounded-lg focus:outline-none focus:border-amber-400 backdrop-blur-sm"
                      style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
              <button
                onClick={addCharacter}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-emerald-700 to-emerald-600 text-amber-100 rounded-lg hover:from-emerald-600 hover:to-emerald-500 font-bold text-lg border-2 border-emerald-500 shadow-lg transition-all duration-200 transform hover:scale-105"
              >
                ✅ Welcome to the Tavern!
              </button>
              <button
                onClick={() => setShowAddCharacter(false)}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-gray-700 to-gray-600 text-amber-100 rounded-lg hover:from-gray-600 hover:to-gray-500 font-bold text-lg border-2 border-gray-500 shadow-lg transition-all duration-200"
              >
                🚪 Maybe Later
              </button>
            </div>
          </div>
        )}

        {/* Character Selection for Players */}
        {!isDM && characters.length > 0 && (
          <div className="bg-gradient-to-br from-amber-950/90 to-orange-950/90 rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 border-2 border-amber-600/50 backdrop-blur-lg shadow-2xl"
               style={{
                 backgroundImage: `
                   linear-gradient(45deg, rgba(120, 53, 15, 0.1) 25%, transparent 25%),
                   linear-gradient(-45deg, rgba(120, 53, 15, 0.1) 25%, transparent 25%),
                   linear-gradient(45deg, transparent 75%, rgba(120, 53, 15, 0.1) 75%),
                   linear-gradient(-45deg, transparent 75%, rgba(120, 53, 15, 0.1) 75%)
                 `,
                 backgroundSize: '20px 20px',
                 backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
               }}>
            <div className="text-center mb-6">
              <h3 className="text-xl sm:text-2xl font-bold text-amber-100 mb-2" style={{ fontFamily: 'serif', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
                🗡️ Your Active Hero
              </h3>
              <p className="text-amber-300 text-sm italic">Choose your character for this session</p>
            </div>
            
            <div className="mb-4">
              <label className="block text-amber-200 text-sm font-medium mb-3">🎭 Select Your Character:</label>
              <select
                value={selectedCharacter}
                onChange={(e) => setSelectedCharacter(e.target.value)}
                className="w-full px-4 py-4 bg-amber-950/70 text-amber-100 border-2 border-amber-600/50 rounded-xl text-lg focus:outline-none focus:border-amber-400 backdrop-blur-sm font-medium"
                style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
              >
                <option value="">🍺 Choose your adventurer...</option>
                {characters.map((char: Character) => (
                  <option key={char.id} value={char.id} className="text-black bg-amber-100">
                    {char.createdBy === deviceId ? '⚔️' : '🛡️'} {char.name} (Lv.{char.level} {char.class}) {char.createdBy === deviceId ? '👤 (Yours)' : '👥 (Other)'}
                  </option>
                ))}
              </select>
            </div>
            
            {selectedCharacter && characters.find((c: Character) => c.id === selectedCharacter)?.createdBy !== deviceId && (
              <div className="mt-4 p-4 bg-red-900/60 border-l-4 border-red-500 rounded-r-xl backdrop-blur-sm">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-red-200 text-sm font-medium">
                      ⚠️ <strong>Tavern Warning:</strong> This hero belongs to another adventurer! 
                      Any changes you make will affect their character sheet.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Initiative Tracker - Floating Widget */}
        {characters.length > 0 && (
          <div className="fixed bottom-4 right-4 z-50">
            <InitiativeTracker 
              characters={characters}
              onUpdateCharacter={updateCharacter}
            />
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
            selectedCharacter && characters.find((c: Character) => c.id === selectedCharacter) ? (
              <div className="lg:col-span-2 xl:col-span-3">
                <CharacterEditor 
                  character={characters.find((c: Character) => c.id === selectedCharacter)!}
                  onUpdateCharacter={updateCharacter}
                  onLongRest={longRest}
                />
              </div>
            ) : null
          )}
        </div>

        {characters.length > 0 && (
          <div className="mt-6 text-center">
            <div className="bg-amber-950/50 rounded-2xl p-6 border border-amber-600/30 backdrop-blur-sm">
              <p className="text-amber-200 mb-4 font-medium">Need another hero for your party?</p>
              <button
                onClick={() => setShowAddCharacter(true)}
                className="px-8 py-4 bg-gradient-to-r from-amber-600 to-amber-500 text-amber-950 rounded-xl hover:from-amber-500 hover:to-amber-400 transition-all duration-200 font-bold text-lg border-2 border-amber-400 shadow-xl transform hover:scale-105"
              >
                ⚔️ Register New Adventurer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}