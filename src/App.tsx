import { useState, useEffect, useRef, useCallback } from 'react';
import './crt-effects.css';
import { transmissionDB } from './db';

// Morse code dictionary
const MORSE_CODE: Record<string, string> = {
  'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
  'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
  'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
  'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
  'Y': '-.--', 'Z': '--..', '0': '-----', '1': '.----', '2': '..---',
  '3': '...--', '4': '....-', '5': '.....', '6': '-....', '7': '--...',
  '8': '---..', '9': '----.', ' ': '/'
};

const REVERSE_MORSE: Record<string, string> = Object.fromEntries(
  Object.entries(MORSE_CODE).map(([k, v]) => [v, k])
);

// Creepy messages for possession mode
const CREEPY_MESSAGES = [
  "HE'S HERE", "RUN", "BEHIND YOU", "CAN'T ESCAPE", "IT SEES YOU",
  "CLOSE YOUR EYES", "DON'T LOOK", "HELP ME", "TOO LATE", "COME CLOSER"
];

type PhosphorColor = 'green' | 'amber' | 'white';
type EncryptionMode = 'none' | 'caesar' | 'binary' | 'xor';

const UpsideDownCommunicator = () => {
  // Core state
  const [message, setMessage] = useState('');
  const [morseOutput, setMorseOutput] = useState<string[]>([]);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [currentSignalIndex, setCurrentSignalIndex] = useState(0);
  const [transmissionHistory, setTransmissionHistory] = useState<Array<{message: string, timestamp: string, encrypted?: string}>>([]);
  
  // Sanity Meter
  const [sanity, setSanity] = useState(100);
  const [isPossessed, setIsPossessed] = useState(false);
  const [possessionTimer, setPossessionTimer] = useState(0);
  
  // Konami Code
  const [konamiSequence, setKonamiSequence] = useState<string[]>([]);
  const KONAMI_CODE = ['ArrowUp', 'ArrowUp', 'a', 'b'];
  
  // CRT Effects
  const [glitchIntensity, setGlitchIntensity] = useState(0);
  const [isFlashing, setIsFlashing] = useState(false);
  const [currentSignalType, setCurrentSignalType] = useState<'dit' | 'dah' | null>(null);
  const [screenWarmedUp, setScreenWarmedUp] = useState(false);
  const [staticBurst, setStaticBurst] = useState(false);
  
  // Features
  const [phosphorColor, setPhosphorColor] = useState<PhosphorColor>('green');
  const [channel, setChannel] = useState(1);
  const [isChannelChanging, setIsChannelChanging] = useState(false);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [decodeMode, setDecodeMode] = useState(false);
  const [decodeInput, setDecodeInput] = useState('');
  const [decodedText, setDecodedText] = useState('');
  const [oscilloscopeData, setOscilloscopeData] = useState<number[]>(new Array(64).fill(50));
  
  // New Phase 2 features
  const [vuLevel, setVuLevel] = useState(0);
  const [encryptionMode, setEncryptionMode] = useState<EncryptionMode>('none');
  const [caesarShift, setCaesarShift] = useState(3);
  const [xorKey, setXorKey] = useState('11');
  const [creepyMessage, setCreepyMessage] = useState('');
  const [showCreepyMessage, setShowCreepyMessage] = useState(false);
  const [glyphCanvas, setGlyphCanvas] = useState<string>('');
  const [showGlyph, setShowGlyph] = useState(false);
  
  // Audio refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const ambientOscRef = useRef<OscillatorNode | null>(null);
  const ambientGainRef = useRef<GainNode | null>(null);

  // Preset messages
  const PRESETS = ['HELP', 'DANGER', 'ALIVE', 'RUN', 'SAFE', 'COME'];

  // Get phosphor colors
  const getPhosphorColors = () => {
    switch (phosphorColor) {
      case 'amber': return { main: '#ffaa00', dim: '#cc8800', dark: '#664400' };
      case 'white': return { main: '#ffffff', dim: '#cccccc', dark: '#666666' };
      default: return { main: '#00ff00', dim: '#00cc00', dark: '#006600' };
    }
  };

  const colors = getPhosphorColors();

  // Encryption functions
  const caesarEncrypt = (text: string, shift: number): string => {
    return text.split('').map(char => {
      if (char >= 'A' && char <= 'Z') {
        return String.fromCharCode(((char.charCodeAt(0) - 65 + shift) % 26) + 65);
      }
      return char;
    }).join('');
  };

  const toBinary = (text: string): string => {
    return text.split('').map(char => char.charCodeAt(0).toString(2).padStart(8, '0')).join(' ');
  };

  const xorEncrypt = (text: string, key: string): string => {
    const keyNum = parseInt(key, 10) || 11;
    return text.split('').map(char => {
      const xored = char.charCodeAt(0) ^ keyNum;
      return xored.toString(16).padStart(2, '0').toUpperCase();
    }).join(' ');
  };

  const encryptMessage = (text: string): { display: string, forMorse: string } => {
    switch (encryptionMode) {
      case 'caesar':
        const encrypted = caesarEncrypt(text, caesarShift);
        return { display: `[CAESAR+${caesarShift}] ${encrypted}`, forMorse: encrypted };
      case 'binary':
        return { display: `[BINARY] ${toBinary(text)}`, forMorse: text };
      case 'xor':
        return { display: `[XOR^${xorKey}] ${xorEncrypt(text, xorKey)}`, forMorse: text };
      default:
        return { display: text, forMorse: text };
    }
  };

  // Generate glyph pattern from text
  const generateGlyph = (text: string): string => {
    const size = 8;
    const grid: string[][] = Array(size).fill(null).map(() => Array(size).fill('░'));
    
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash = hash & hash;
    }
    
    // Generate symmetric pattern based on text hash
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size / 2; x++) {
        const val = (hash >> ((y * 4 + x) % 32)) & 1;
        if (val || (text.charCodeAt((y + x) % text.length) % 3 === 0)) {
          grid[y][x] = '█';
          grid[y][size - 1 - x] = '█';
        }
      }
    }
    
    return grid.map(row => row.join('')).join('\n');
  };

  // Initialize audio
  const initAudio = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.connect(audioContextRef.current.destination);
      gainNodeRef.current.gain.value = 0;
    }
  }, []);

  // Start ambient audio
  const startAmbient = useCallback(() => {
    if (!audioEnabled || !audioContextRef.current || ambientOscRef.current) return;
    
    ambientOscRef.current = audioContextRef.current.createOscillator();
    ambientGainRef.current = audioContextRef.current.createGain();
    
    ambientOscRef.current.type = 'sine';
    ambientOscRef.current.frequency.value = 60; // 60Hz hum
    ambientOscRef.current.connect(ambientGainRef.current);
    ambientGainRef.current.connect(audioContextRef.current.destination);
    ambientGainRef.current.gain.value = isPossessed ? 0.05 : 0.015;
    
    ambientOscRef.current.start();
  }, [audioEnabled, isPossessed]);

  // Stop ambient audio
  const stopAmbient = useCallback(() => {
    if (ambientOscRef.current) {
      ambientOscRef.current.stop();
      ambientOscRef.current = null;
    }
  }, []);

  // Play morse tone
  const playTone = useCallback((frequency: number, duration: number) => {
    if (!audioEnabled || !audioContextRef.current || !gainNodeRef.current) return;
    
    const osc = audioContextRef.current.createOscillator();
    osc.type = isPossessed ? 'sawtooth' : 'sine';
    osc.frequency.value = isPossessed ? frequency * (0.8 + Math.random() * 0.4) : frequency;
    osc.connect(gainNodeRef.current);
    
    gainNodeRef.current.gain.setValueAtTime(0.3, audioContextRef.current.currentTime);
    osc.start();
    
    // Update VU meter
    setVuLevel(currentSignalType === 'dah' ? 90 : 70);
    
    setTimeout(() => {
      if (gainNodeRef.current && audioContextRef.current) {
        gainNodeRef.current.gain.setValueAtTime(0, audioContextRef.current.currentTime);
      }
      osc.stop();
      setVuLevel(0);
    }, duration);
  }, [audioEnabled, isPossessed, currentSignalType]);

  // Play click
  const playClick = useCallback(() => {
    if (!audioEnabled || !audioContextRef.current) return;
    const osc = audioContextRef.current.createOscillator();
    const gain = audioContextRef.current.createGain();
    osc.type = 'square';
    osc.frequency.value = 150;
    osc.connect(gain);
    gain.connect(audioContextRef.current.destination);
    gain.gain.setValueAtTime(0.1, audioContextRef.current.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.05);
    osc.start();
    osc.stop(audioContextRef.current.currentTime + 0.05);
  }, [audioEnabled]);

  // Initialize database and load history
  useEffect(() => {
    const loadDatabase = async () => {
      await transmissionDB.init();
      const history = transmissionDB.getRecentTransmissions(20);
      if (history.length > 0) {
        setTransmissionHistory(history.map(h => ({
          message: h.message,
          timestamp: h.timestamp,
          encrypted: h.encrypted || undefined
        })).reverse());
      }
    };
    loadDatabase();
  }, []);

  // Screen warmup
  useEffect(() => {
    const timer = setTimeout(() => {
      setScreenWarmedUp(true);
      initAudio();
      startAmbient();
    }, 2000);
    return () => clearTimeout(timer);
  }, [initAudio, startAmbient]);

  // Random static bursts
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() < 0.05) {
        setStaticBurst(true);
        setTimeout(() => setStaticBurst(false), 100 + Math.random() * 200);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Creepy messages during possession
  useEffect(() => {
    if (isPossessed) {
      const interval = setInterval(() => {
        if (Math.random() < 0.3) {
          setCreepyMessage(CREEPY_MESSAGES[Math.floor(Math.random() * CREEPY_MESSAGES.length)]);
          setShowCreepyMessage(true);
          setTimeout(() => setShowCreepyMessage(false), 500 + Math.random() * 1000);
        }
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isPossessed]);

  // Oscilloscope animation
  useEffect(() => {
    const interval = setInterval(() => {
      setOscilloscopeData(prev => {
        const newData = [...prev];
        newData.shift();
        if (isTransmitting && isFlashing) {
          newData.push(currentSignalType === 'dah' ? 90 : 70);
        } else if (isPossessed) {
          newData.push(Math.random() * 100);
        } else {
          newData.push(50 + Math.sin(Date.now() / 200) * 10 + Math.random() * 5);
        }
        return newData;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [isTransmitting, isFlashing, currentSignalType, isPossessed]);

  // Sanity countdown
  useEffect(() => {
    if (!isPossessed && sanity > 0) {
      const interval = setInterval(() => {
        setSanity(prev => Math.max(0, prev - 0.5));
      }, 1000);
      return () => clearInterval(interval);
    }
    if (sanity <= 0 && !isPossessed) {
      setIsPossessed(true);
      setPossessionTimer(30);
      setStaticBurst(true);
      if (ambientGainRef.current) {
        ambientGainRef.current.gain.value = 0.05;
      }
    }
  }, [sanity, isPossessed]);

  // Possession timer
  useEffect(() => {
    if (isPossessed && possessionTimer > 0) {
      const interval = setInterval(() => {
        setPossessionTimer(prev => {
          if (prev <= 1) {
            setIsPossessed(false);
            setSanity(100);
            if (ambientGainRef.current) {
              ambientGainRef.current.gain.value = 0.015;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isPossessed, possessionTimer]);

  // Konami listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const newSequence = [...konamiSequence, e.key].slice(-10);
      setKonamiSequence(newSequence);
      
      if (JSON.stringify(newSequence.slice(-4)) === JSON.stringify(KONAMI_CODE)) {
        setIsPossessed(false);
        setSanity(100);
        setPossessionTimer(0);
        setKonamiSequence([]);
        setGlitchIntensity(0);
        playClick();
        if (ambientGainRef.current) {
          ambientGainRef.current.gain.value = 0.015;
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [konamiSequence, playClick]);

  // Glitch effect
  useEffect(() => {
    if (isPossessed) {
      const interval = setInterval(() => {
        setGlitchIntensity(Math.random() * 15);
      }, 80);
      return () => clearInterval(interval);
    } else {
      setGlitchIntensity(0);
    }
  }, [isPossessed]);

  // Morse transmission
  useEffect(() => {
    if (isTransmitting && currentSignalIndex < morseOutput.length) {
      const currentMorse = morseOutput[currentSignalIndex];
      const signals = currentMorse.split('');
      let signalIdx = 0;
      
      const playSignal = () => {
        if (signalIdx >= signals.length) {
          setIsFlashing(false);
          setCurrentSignalType(null);
          setTimeout(() => setCurrentSignalIndex(prev => prev + 1), 500);
          return;
        }
        
        const signal = signals[signalIdx];
        const isDit = signal === '.';
        const duration = isDit ? 200 : 600;
        
        setIsFlashing(true);
        setCurrentSignalType(isDit ? 'dit' : 'dah');
        playTone(emergencyMode ? 880 : 700, duration);
        
        setTimeout(() => {
          setIsFlashing(false);
          setCurrentSignalType(null);
          setTimeout(() => { signalIdx++; playSignal(); }, 200);
        }, duration);
      };
      
      playSignal();
    } else if (currentSignalIndex >= morseOutput.length && isTransmitting) {
      const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
      const encrypted = encryptMessage(message);
      setTransmissionHistory(prev => [...prev, { message, timestamp, encrypted: encrypted.display }]);
      
      // Save to SQLite database
      transmissionDB.addTransmission(message, encrypted.display, timestamp, encryptionMode);
      setIsTransmitting(false);
      setCurrentSignalIndex(0);
      setIsFlashing(false);
      setCurrentSignalType(null);
      setMessage('');
      // Glyph persists until next transmission
    }
  }, [isTransmitting, currentSignalIndex, morseOutput, message, playTone, emergencyMode, encryptionMode, caesarShift, xorKey]);

  const textToMorse = (text: string): string[] => {
    return text.toUpperCase().split('').map(char => MORSE_CODE[char] || '').filter(Boolean);
  };

  const handleTransmit = () => {
    if (message.trim()) {
      initAudio();
      playClick();
      const encrypted = encryptMessage(message);
      const morse = textToMorse(encrypted.forMorse);
      setMorseOutput(morse);
      setIsTransmitting(true);
      setCurrentSignalIndex(0);
      
      // Generate glyph
      setGlyphCanvas(generateGlyph(message));
      setShowGlyph(true);
    }
  };

  const handlePreset = (preset: string) => {
    initAudio();
    playClick();
    setMessage(preset);
    setEmergencyMode(preset === 'HELP' || preset === 'DANGER' || preset === 'RUN');
    
    // Auto-transmit the preset
    setTimeout(() => {
      const morse = textToMorse(preset);
      setMorseOutput(morse);
      setIsTransmitting(true);
      setCurrentSignalIndex(0);
      setGlyphCanvas(generateGlyph(preset));
      setShowGlyph(true);
    }, 100);
  };

  const handleChannelChange = (newChannel: number) => {
    if (newChannel < 1 || newChannel > 4) return;
    playClick();
    setIsChannelChanging(true);
    setStaticBurst(true);
    
    setTimeout(() => {
      setChannel(newChannel);
      setIsChannelChanging(false);
      setStaticBurst(false);
      
      // Apply channel-specific modes
      switch (newChannel) {
        case 1: // Normal mode
          setIsPossessed(false);
          setEmergencyMode(false);
          setDecodeMode(false);
          setSanity(100);
          if (ambientGainRef.current) ambientGainRef.current.gain.value = 0.015;
          break;
        case 2: // Upside Down mode (permanent possession effects)
          setIsPossessed(true);
          setPossessionTimer(999); // Won't expire
          setEmergencyMode(false);
          setDecodeMode(false);
          if (ambientGainRef.current) ambientGainRef.current.gain.value = 0.05;
          break;
        case 3: // Emergency broadcast mode
          setIsPossessed(false);
          setEmergencyMode(true);
          setDecodeMode(false);
          setSanity(100);
          if (ambientGainRef.current) ambientGainRef.current.gain.value = 0.015;
          break;
        case 4: // Secret decoder mode
          setIsPossessed(false);
          setEmergencyMode(false);
          setDecodeMode(true);
          setSanity(100);
          if (ambientGainRef.current) ambientGainRef.current.gain.value = 0.015;
          break;
      }
    }, 500);
  };

  // Get channel name for display
  const getChannelName = () => {
    switch (channel) {
      case 1: return 'NORMAL';
      case 2: return 'UPSIDE DOWN';
      case 3: return 'EMERGENCY';
      case 4: return 'DECODER';
      default: return 'UNKNOWN';
    }
  };

  const handleDecode = () => {
    const parts = decodeInput.trim().split(/\s+/);
    const decoded = parts.map(p => REVERSE_MORSE[p] || '?').join('');
    setDecodedText(decoded);
  };

  const handleEmergencySOS = () => {
    initAudio();
    playClick();
    setEmergencyMode(true);
    setMessage('SOS');
    setTimeout(() => {
      const morse = textToMorse('SOS');
      setMorseOutput(morse);
      setIsTransmitting(true);
      setCurrentSignalIndex(0);
    }, 100);
  };

  // Render VU Meter
  const renderVuMeter = () => (
    <div className="vu-meter">
      <div className="vu-label">VU</div>
      <div className="vu-scale">
        {[...Array(12)].map((_, i) => (
          <div 
            key={i} 
            className={`vu-segment ${i < vuLevel / 8 ? 'active' : ''} ${i > 8 ? 'hot' : ''}`}
          />
        ))}
      </div>
      <div className="vu-needle" style={{ transform: `rotate(${(vuLevel - 50) * 0.9}deg)` }} />
    </div>
  );

  // Render Oscilloscope
  const renderOscilloscope = () => (
    <div className="oscilloscope">
      <svg viewBox="0 0 64 40" preserveAspectRatio="none">
        <polyline
          fill="none"
          stroke={emergencyMode ? '#ff0000' : colors.main}
          strokeWidth="1"
          points={oscilloscopeData.map((v, i) => `${i},${40 - v * 0.4}`).join(' ')}
        />
      </svg>
      <div className="oscilloscope-label">SIGNAL WAVEFORM</div>
    </div>
  );

  // Render Glyph Display
  const renderGlyphDisplay = () => (
    showGlyph && glyphCanvas && (
      <div className="glyph-display" style={{ borderColor: colors.main }}>
        <div className="glyph-label" style={{ color: colors.dim }}>TEXT-TO-GLYPH ENCODING</div>
        <pre className="glyph-canvas" style={{ color: colors.main }}>{glyphCanvas}</pre>
      </div>
    )
  );

  return (
    <div className="crt-outer-housing">
      {/* Creepy message overlay */}
      {showCreepyMessage && (
        <div className="creepy-overlay">
          <div className="creepy-text">{creepyMessage}</div>
        </div>
      )}

      {/* CRT Bezel */}
      <div className="crt-bezel">
        <div className="bezel-brand">HAWKINS ELECTRONICS</div>
        <div className="bezel-model">MODEL UDC-1983</div>
        
        <div className={`power-led ${screenWarmedUp ? 'on' : 'warming'}`} />
        
        <div className="channel-dial">
          <div className="dial-label">CH</div>
          <div className="dial-display">{channel}</div>
          <div className="dial-buttons">
            <button onClick={() => handleChannelChange(channel - 1)}>▲</button>
            <button onClick={() => handleChannelChange(channel + 1)}>▼</button>
          </div>
        </div>
        
        <div className="phosphor-selector">
          <div className="dial-label">PHOSPHOR</div>
          <div className="phosphor-buttons">
            <button className={phosphorColor === 'green' ? 'active' : ''} onClick={() => { setPhosphorColor('green'); playClick(); }} style={{ background: '#00ff00' }} />
            <button className={phosphorColor === 'amber' ? 'active' : ''} onClick={() => { setPhosphorColor('amber'); playClick(); }} style={{ background: '#ffaa00' }} />
            <button className={phosphorColor === 'white' ? 'active' : ''} onClick={() => { setPhosphorColor('white'); playClick(); }} style={{ background: '#ffffff' }} />
          </div>
        </div>

        <div className="audio-toggle">
          <button onClick={() => { initAudio(); setAudioEnabled(!audioEnabled); playClick(); if (!audioEnabled) startAmbient(); else stopAmbient(); }} className={audioEnabled ? 'active' : ''}>
            {audioEnabled ? '🔊' : '🔇'}
          </button>
        </div>
      </div>

      {/* CRT Screen */}
      <div 
        className={`crt-screen ${!screenWarmedUp ? 'warming-up' : ''} ${isChannelChanging ? 'channel-changing' : ''} ${emergencyMode ? 'emergency' : ''}`}
        style={{ '--phosphor-main': colors.main, '--phosphor-dim': colors.dim, '--phosphor-dark': colors.dark } as React.CSSProperties}
      >
        <svg className="crt-filters"><defs><filter id="barrel"><feGaussianBlur in="SourceGraphic" stdDeviation="0.5" result="blur" /><feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" /></filter></defs></svg>

        {isFlashing && (
          <div className={`morse-flash ${currentSignalType} ${emergencyMode ? 'emergency' : ''}`} style={{ background: emergencyMode ? '#ff0000' : colors.main, animation: isPossessed ? 'glitch-flash 0.1s infinite' : 'none' }} />
        )}
        
        <div className="scanlines" />
        <div className="vbl-bar" />
        <div className={`static-noise ${staticBurst ? 'burst' : ''}`} />
        {isPossessed && <div className="rgb-split-overlay" />}

        <div className="screen-content" style={{ transform: isPossessed ? `translate(${glitchIntensity}px, ${glitchIntensity * 0.5}px)` : 'none', filter: isPossessed ? `hue-rotate(${possessionTimer * 12}deg)` : 'none' }}>
          <div className="terminal-header">
            <div className="terminal-title" style={{ color: colors.main }}>
              {isPossessed ? '▓▓▓ ƎƆIVƎD ᗡƎSSƎSSOS ▓▓▓' : '=== DIMENSIONAL COMM ARRAY ==='}
            </div>
            <div className="terminal-subtitle" style={{ color: colors.dim }}>
              {isPossessed ? 'ƎЯƎH ƧWϽ⅃ƎB ƎH⊥' : `CH ${channel} - ${getChannelName()}`}
            </div>
          </div>

          {/* Displays Row */}
          <div className="displays-row">
            {renderOscilloscope()}
            {renderVuMeter()}
          </div>

          {/* Sanity Meter */}
          <div className="sanity-container">
            <div className="meter-label">{isPossessed ? 'POSSESSION TIMER' : 'SYSTEM INTEGRITY'}</div>
            <div className="meter-bar-container">
              <div className={`meter-bar ${isPossessed ? 'possessed' : sanity < 30 ? 'critical' : ''}`} style={{ width: `${isPossessed ? (possessionTimer / 30) * 100 : sanity}%`, backgroundColor: isPossessed ? '#ff0066' : sanity < 30 ? '#ff6600' : colors.main }} />
              <div className="vu-ticks">{[...Array(10)].map((_, i) => <div key={i} className="tick" />)}</div>
            </div>
            <div className="meter-value" style={{ color: colors.main }}>{isPossessed ? `${possessionTimer}s` : `${Math.floor(sanity)}%`}</div>
          </div>

          {isPossessed && <div className="warning-flash">⚠ PRESS ↑↑AB TO RECOVER ⚠</div>}

          {/* Mode Tabs */}
          <div className="mode-tabs">
            <button className={!decodeMode ? 'active' : ''} onClick={() => { setDecodeMode(false); playClick(); }} style={{ borderColor: colors.main, color: !decodeMode ? '#000' : colors.main, background: !decodeMode ? colors.main : 'transparent' }}>TRANSMIT</button>
            <button className={decodeMode ? 'active' : ''} onClick={() => { setDecodeMode(true); playClick(); }} style={{ borderColor: colors.main, color: decodeMode ? '#000' : colors.main, background: decodeMode ? colors.main : 'transparent' }}>DECODE</button>
            <button className={`emergency-btn ${emergencyMode ? 'active' : ''}`} onClick={handleEmergencySOS}>🚨 SOS</button>
          </div>

          {!decodeMode ? (
            <>
              {/* Preset Buttons */}
              <div className="preset-buttons">
                {PRESETS.map(preset => (
                  <button key={preset} onClick={() => handlePreset(preset)} className="preset-btn" style={{ borderColor: colors.main, color: colors.main }}>{preset}</button>
                ))}
              </div>

              {/* Encryption Selector */}
              <div className="encryption-section">
                <div className="encryption-label" style={{ color: colors.dim }}>ENCRYPTION:</div>
                <div className="encryption-buttons">
                  {(['none', 'caesar', 'binary', 'xor'] as EncryptionMode[]).map(mode => (
                    <button key={mode} onClick={() => { setEncryptionMode(mode); playClick(); }} className={encryptionMode === mode ? 'active' : ''} style={{ borderColor: colors.main, color: encryptionMode === mode ? '#000' : colors.main, background: encryptionMode === mode ? colors.main : 'transparent' }}>
                      {mode.toUpperCase()}
                    </button>
                  ))}
                </div>
                {encryptionMode === 'caesar' && (
                  <div className="encryption-param">
                    <span style={{ color: colors.dim }}>SHIFT:</span>
                    <input type="number" min="1" max="25" value={caesarShift} onChange={(e) => setCaesarShift(parseInt(e.target.value) || 3)} style={{ borderColor: colors.main, color: colors.main }} />
                  </div>
                )}
                {encryptionMode === 'xor' && (
                  <div className="encryption-param">
                    <span style={{ color: colors.dim }}>KEY:</span>
                    <input type="text" value={xorKey} onChange={(e) => setXorKey(e.target.value)} maxLength={3} style={{ borderColor: colors.main, color: colors.main }} />
                  </div>
                )}
              </div>

              {/* Input Section */}
              <div className="input-section">
                <label className="input-label" style={{ color: colors.dim }}>{isPossessed ? 'ƎƧƧⱯМ⅃ⱯИƎMI⅃UD ЯƎ⊥ИƎ' : 'ENTER MESSAGE TO ENCODE:'}</label>
                <input type="text" value={message} onChange={(e) => { setEmergencyMode(false); setMessage(isPossessed ? e.target.value.split('').reverse().join('') : e.target.value.toUpperCase()); }} className="terminal-input" placeholder={isPossessed ? "...ƎЯƎH ƎM ԀƎHL" : "TYPE MESSAGE HERE..."} maxLength={50} disabled={isTransmitting} style={{ borderColor: colors.main, color: colors.main }} />
              </div>

              <button onClick={handleTransmit} disabled={isTransmitting || !message.trim()} className="transmit-button" style={{ borderColor: colors.main, color: colors.main, transform: isPossessed ? 'scaleX(-1)' : 'none' }}>
                {isPossessed ? '⊥IMƧИⱯЯ⊥ ▼' : isTransmitting ? '▼ TRANSMITTING...' : '▼ INITIATE TRANSMISSION ▼'}
              </button>

              {/* Glyph Display */}
              {renderGlyphDisplay()}

              {isTransmitting && currentSignalIndex < morseOutput.length && (
                <div className="transmission-display" style={{ borderColor: colors.main }}>
                  <div className="tx-char" style={{ color: colors.main }}>TRANSMITTING: <span className="highlight">{message.charAt(currentSignalIndex)}</span></div>
                  <div className="tx-pattern" style={{ color: colors.dim }}>PATTERN: {morseOutput[currentSignalIndex]}</div>
                  <div className="tx-progress" style={{ color: colors.dark }}>{currentSignalIndex + 1} / {morseOutput.length}</div>
                </div>
              )}
            </>
          ) : (
            <div className="decode-section">
              <label className="input-label" style={{ color: colors.dim }}>ENTER MORSE CODE (space-separated):</label>
              <input type="text" value={decodeInput} onChange={(e) => setDecodeInput(e.target.value.toUpperCase())} className="terminal-input" placeholder=".- -... -.-." style={{ borderColor: colors.main, color: colors.main }} />
              <button onClick={handleDecode} className="transmit-button" style={{ borderColor: colors.main, color: colors.main }}>▼ DECODE ▼</button>
              {decodedText && <div className="decoded-output" style={{ borderColor: colors.main, color: colors.main }}>DECODED: {decodedText}</div>}
            </div>
          )}

          <div className="signal-legend">
            <div className="legend-item"><div className="flash-indicator dit" style={{ background: colors.main }} /><span style={{ color: colors.dim }}>SHORT = DIT (·)</span></div>
            <div className="legend-item"><div className="flash-indicator dah" style={{ background: colors.main }} /><span style={{ color: colors.dim }}>LONG = DAH (-)</span></div>
          </div>

          {transmissionHistory.length > 0 && (
            <div className="history-section" style={{ borderColor: colors.main }}>
              <div className="history-title" style={{ color: colors.main }}>TRANSMISSION LOG</div>
              <div className="history-list">
                {transmissionHistory.slice(-5).reverse().map((entry, idx) => (
                  <div key={idx} className="history-entry" style={{ borderColor: colors.dim }}>
                    <span className="history-time" style={{ color: colors.dim }}>[{entry.timestamp}]</span>
                    <span className="history-message" style={{ color: colors.main }}>{entry.encrypted || entry.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="terminal-footer" style={{ borderColor: colors.main, color: colors.dim }}>
            {isPossessed ? '҉҉҉ ИWOD ƎDI⊥ƧԀU Ǝ⊥ƆƎИИOƆ ҉҉҉' : '=== UPSIDE DOWN CONNECTED ==='}
          </div>
        </div>

        <div className="crt-curvature" />
        <div className="phosphor-glow" style={{ boxShadow: `inset 0 0 100px ${colors.main}40` }} />
      </div>
    </div>
  );
};

export default UpsideDownCommunicator;
