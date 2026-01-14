import React, { useState, useEffect } from 'react';
import { audioEngine } from '../utils/audioEngine';
import { getSetting, setSetting } from '../stores/db';

const BANDS = [
  { label: '60', freq: 60 },
  { label: '250', freq: 250 },
  { label: '1K', freq: 1000 },
  { label: '4K', freq: 4000 },
  { label: '12K', freq: 12000 },
];

const PRESETS = {
  flat: [0, 0, 0, 0, 0],
  bass: [6, 4, 0, 0, 0],
  treble: [0, 0, 0, 4, 6],
  rock: [4, 2, -1, 3, 4],
  pop: [-1, 2, 4, 2, -1],
  jazz: [3, 0, 2, 3, 4],
  classical: [0, 0, 0, 2, 3],
};

export function Equalizer({ isVisible, onClose }) {
  const [bands, setBands] = useState([0, 0, 0, 0, 0]);
  const [normalization, setNormalization] = useState(true);
  const [preset, setPreset] = useState('flat');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const savedBands = await getSetting('eq_bands', [0, 0, 0, 0, 0]);
    const savedNorm = await getSetting('normalization', true);
    setBands(savedBands);
    setNormalization(savedNorm);
    
    // Apply to audio engine
    savedBands.forEach((value, index) => {
      audioEngine.setEQ(index, value);
    });
    audioEngine.setNormalization(savedNorm);
  };

  const handleBandChange = (index, value) => {
    const newBands = [...bands];
    newBands[index] = value;
    setBands(newBands);
    setPreset('custom');
    audioEngine.setEQ(index, value);
    setSetting('eq_bands', newBands);
  };

  const handlePresetChange = (presetName) => {
    const presetValues = PRESETS[presetName];
    if (presetValues) {
      setBands([...presetValues]);
      setPreset(presetName);
      presetValues.forEach((value, index) => {
        audioEngine.setEQ(index, value);
      });
      setSetting('eq_bands', presetValues);
    }
  };

  const handleNormalizationChange = (enabled) => {
    setNormalization(enabled);
    audioEngine.setNormalization(enabled);
    setSetting('normalization', enabled);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50" onClick={onClose}>
      <div className="glass-panel rounded-2xl shadow-xl p-6 w-96 max-w-full mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold gradient-text-purple">Equalizer</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Presets */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-400 mb-2">Preset</label>
          <div className="flex flex-wrap gap-2">
            {Object.keys(PRESETS).map(name => (
              <button
                key={name}
                onClick={() => handlePresetChange(name)}
                className={`px-3 py-1 text-sm rounded-full transition ${
                  preset === name
                    ? 'gradient-button text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                {name.charAt(0).toUpperCase() + name.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Band Sliders */}
        <div className="flex justify-between gap-2 mb-6">
          {BANDS.map((band, index) => (
            <div key={band.freq} className="flex flex-col items-center">
              <div className="h-32 flex items-center">
                <input
                  type="range"
                  min="-12"
                  max="12"
                  value={bands[index]}
                  onChange={(e) => handleBandChange(index, Number(e.target.value))}
                  className="h-24"
                  style={{
                    writingMode: 'vertical-lr',
                    direction: 'rtl',
                  }}
                />
              </div>
              <span className="text-xs text-gray-400 mt-1">{band.label}</span>
              <span className="text-xs text-gray-500">{bands[index] > 0 ? '+' : ''}{bands[index]}dB</span>
            </div>
          ))}
        </div>

        {/* Normalization */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <div>
            <div className="font-medium text-gray-200">Volume Normalization</div>
            <div className="text-sm text-gray-500">Keeps volume consistent across tracks</div>
          </div>
          <button
            onClick={() => handleNormalizationChange(!normalization)}
            className={`relative w-12 h-6 rounded-full transition ${
              normalization ? 'bg-gradient-to-r from-teal-500 to-teal-400' : 'bg-white/20'
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                normalization ? 'left-6' : 'left-0.5'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
