/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Iron Man HUD Palette ──
        jarvis: {
          bg: '#0a0a0a',
          'bg-elevated': '#111111',
          'bg-card': '#1a1a1a',
          cyan: '#00d4ff',
          'cyan-dim': '#0088aa',
          'cyan-glow': '#00d4ff40',
          gold: '#ffd700',
          'gold-dim': '#b8960f',
          'gold-glow': '#ffd70040',
          arc: '#ff4444',
          'arc-glow': '#ff444440',
          text: '#e0e0e0',
          'text-dim': '#888888',
          border: '#2a2a2a',
          'border-glow': '#00d4ff30',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Consolas', 'monospace'],
        hud: ['"Orbitron"', '"Rajdhani"', 'sans-serif'],
      },
      boxShadow: {
        'cyan-glow': '0 0 15px #00d4ff40, 0 0 30px #00d4ff20',
        'cyan-glow-lg': '0 0 20px #00d4ff60, 0 0 40px #00d4ff30, 0 0 80px #00d4ff15',
        'gold-glow': '0 0 15px #ffd70040, 0 0 30px #ffd70020',
        'gold-glow-lg': '0 0 20px #ffd70060, 0 0 40px #ffd70030, 0 0 80px #ffd70015',
        'arc-glow': '0 0 15px #ff444440, 0 0 30px #ff444420',
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.5)',
        'inner-glow': 'inset 0 0 20px rgba(0, 212, 255, 0.05)',
      },
      animation: {
        'pulse-cyan': 'pulse-cyan 2s ease-in-out infinite',
        'pulse-gold': 'pulse-gold 2s ease-in-out infinite',
        'scan-line': 'scan-line 8s linear infinite',
        'glow-breathe': 'glow-breathe 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'hud-flicker': 'hud-flicker 4s ease-in-out infinite',
        'typing': 'typing 1s steps(3) infinite',
        'radar-sweep': 'radar-sweep 3s linear infinite',
        'waveform': 'waveform 0.5s ease-in-out infinite alternate',
      },
      keyframes: {
        'pulse-cyan': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 15px #00d4ff40' },
          '50%': { opacity: '0.7', boxShadow: '0 0 30px #00d4ff80' },
        },
        'pulse-gold': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 15px #ffd70040' },
          '50%': { opacity: '0.7', boxShadow: '0 0 30px #ffd70080' },
        },
        'scan-line': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        'glow-breathe': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '1' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'hud-flicker': {
          '0%, 100%': { opacity: '1' },
          '92%': { opacity: '1' },
          '93%': { opacity: '0.6' },
          '94%': { opacity: '1' },
          '96%': { opacity: '0.8' },
          '97%': { opacity: '1' },
        },
        'typing': {
          '0%': { borderRightColor: '#00d4ff' },
          '50%': { borderRightColor: 'transparent' },
          '100%': { borderRightColor: '#00d4ff' },
        },
        'radar-sweep': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'waveform': {
          '0%': { height: '4px' },
          '100%': { height: '24px' },
        },
      },
      backgroundImage: {
        'grid-pattern': 'linear-gradient(rgba(0, 212, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 212, 255, 0.03) 1px, transparent 1px)',
        'hud-radial': 'radial-gradient(ellipse at center, rgba(0, 212, 255, 0.08) 0%, transparent 70%)',
      },
      backgroundSize: {
        'grid-40': '40px 40px',
      },
    },
  },
  plugins: [],
};
