# 📟 Downside up Communicator

An interactive, retro-styled CRT communication terminal inspired by _Stranger Things_. This application allows users to send and decode Morse code transmissions, with various encryption modes and a "possession" mechanic.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/react-19.2.0-blue.svg)
![Vite](https://img.shields.io/badge/vite-7.2.4-purple.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.9.3-blue.svg)

## 🌟 Features

- **Retro CRT Interface**: Authentically styled with scanlines, screen curvature, phosphor glow, and "barrel" distortion effects.
- **Morse Code Engine**: Real-time Morse code transmission with synchronized audio tones (dit/dah) and visual flashes.
- **Dimensional Channels**:
  - **Normal**: Standard communication mode.
  - **Upside Down**: Permanent glitch effects and creepy overlays.
  - **Emergency**: High-priority SOS broadcast mode.
  - **Decoder**: Manual Morse-to-Text decoding interface.
- **Encryption Suite**:
  - **Caesar Cipher**: Alphabetical shift encryption.
  - **Binary**: Character-to-binary conversion.
  - **XOR**: Hexadecimal XOR encoding with custom keys.
- **Possession Mechanic**: A "Sanity Meter" that decreases over time. If it reaches zero, the terminal becomes "possessed" by the Mind Flayer, triggering glitches and creepy messages.
- **Konami Code Recovery**: Restore system integrity using the classic `↑ ↑ A B` sequence.
- **Persistent Logs**: All transmissions are saved to an in-browser SQLite database (`sql.js`), persisting across sessions via `localStorage`.
- **Text-to-Glyph**: Automatically generates unique symmetric patterns (glyphs) for every transmitted message.

## 🛠️ Technical Stack

- **Frontend**: [React 19](https://react.dev/)
- **Build Tool**: [Vite 7](https://vite.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: [sql.js](https://sql.js.org/) (SQLite compiled to WebAssembly)
- **Styling**: Custom CSS for CRT/Glitch effects.
- **Audio**: Web Audio API for synthetic Morse tones and ambient hums.

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (Latest LTS recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/upside-down-communicator.git
   cd upside-down-communicator
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:5173](http://localhost:5173) in your browser.

## 📂 Project Structure

```text
├── src/
│   ├── db/                 # SQLite database logic and types
│   ├── assets/             # Static assets
│   ├── App.tsx             # Main application logic and UI
│   ├── index.css           # Global styles
│   ├── crt-effects.css     # specialized CRT/Glitch CSS animations
│   └── main.tsx            # Entry point
├── public/                 # Static public files
├── package.json            # Dependencies and scripts
└── tsconfig.json           # TypeScript configuration
```

## 🎮 Controls

- **Transmit**: Type a message and hit "INITIATE TRANSMISSION".
- **Presets**: Quick-send common words like `HELP` or `DANGER`.
- **SOS**: Instant emergency broadcast button.
- **Konami Code**: `ArrowUp` `ArrowUp` `a` `b` to clear possession effects.
- **Channels**: Use the dial buttons to switch between dimensional frequencies.

---

_Made with 🕯️ in Hawkins, Indiana._

