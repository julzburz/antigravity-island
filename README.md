# 🪐 Antigravity Island

<div align="center">

![Platform](https://img.shields.io/badge/Platform-Windows%2010%20%2F%2011-0078D6?style=for-the-badge&logo=windows&logoColor=white)
![Electron](https://img.shields.io/badge/Electron-34-47848F?style=for-the-badge&logo=electron&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**A sleek, native Dynamic Apple Notch companion for Windows, purpose-built for Google Antigravity 2.0.**

*Monitor your autonomous AI agents, inspect live code diffs, track multi-session chats, and approve actions in real time without leaving your flow.*

[Download Portable .exe](https://github.com/julzburz/antigravity-island/releases) • [Features](#-key-features) • [Quick Start](#-quick-start) • [Architecture](#-architecture) • [Keyboard Shortcuts](#-keyboard-shortcuts)

</div>

---

## 📖 Overview

**Antigravity Island** transforms your Google Antigravity 2.0 pair-programming experience into an intuitive, ambient HUD. Inspired by the Apple Dynamic Island and macOS notch companions, it anchors unobtrusively at the top-center of your primary display.

While collapsed, it occupies just 34px of screen height and is **completely transparent to mouse clicks** (*click-through*), meaning you can click right through it to tabs, editor menus, or browser toolbars with zero friction. When your Antigravity agent starts reasoning, writing code, executing bash commands, or waiting for permissions, the island springs to life with real-time indicators, live diff previews, and an interactive mascot powered by the official **Bloub engine**.

---

## ✨ Key Features

### 🏝️ Dynamic Apple Notch HUD
- **Always on Top:** Snapped cleanly to the top-center border of your primary display.
- **Native Click-Through:** Passes all mouse events through to the background when collapsed. Zero disruption to your daily workflow.
- **Elastic Spring Physics:** Powered by **Framer Motion**, expanding effortlessly into a glassmorphic dashboard on hover or click.
- **Auto-Dismiss & Collapse:** Automatically folds away on mouse leave, on `Esc` keypress, or when clicking outside. Clears completed turn indicators on collapse.

### 👁️ Living Mascot (Official Bloub Bot Engine)
- **Smooth 60 FPS Canvas:** Authentic vector geometry, procedural eye blinking, and organic breathing animations.
- **Cursor Gaze Tracking:** Pupils follow your cursor across the entire screen in real time with cinematic smoothing.
- **State-Reactive Animations:**
  - 🌀 **Orbit / Concentrating:** Active during model reasoning and planning.
  - ⚡ **Alert / Energetic:** Active during tool execution, file editing, and terminal commands.
  - 😉 **Wink / Celebration:** Fires when a turn completes successfully.
  - ❗ **Exclamation Alert:** Triggers immediately when a user prompt or approval modal requires attention (`ask_question`).
  - 😵 **Swirl / Dizziness Easter Egg:** Rapidly clicking the avatar triggers a dizzy animation before returning to work.
- **Zero Idle CPU Overhead:** Gaze tracking suspends automatically when the mouse is at rest (<4px movement threshold).

### ⚡ Concurrent Multi-Session Live Radar
- **Multi-Chat Awareness:** Unlike single-session companions, Antigravity Island continuously tracks all concurrent conversations in `~/.gemini/antigravity/brain`.
- **Multitasking Pill:** When 2 or more chats are active simultaneously, the compact notch morphs dynamically (e.g. `⚡ 2 chats active`).
- **Individual Radar Beacons:**
  - 🟣 **Purple Ping Radar:** Agent is thinking, analyzing prompts, or drafting plans.
  - 🟢 **Cyan Pulse Radar:** Agent is editing files, viewing code, or running terminal tools.
  - 🟡 **Amber Bounce Radar:** Urgent permission or user decision required.
  - 🟢 **Solid Emerald Dot:** Turn completed.
  - ⚪ **Zinc Dot:** Session idle.
- **Non-Intrusive Inspection:** Click any session pill in the bottom dock to inspect its diffs and logs with a 25-second stream lock so background updates don't jerk the view away.

### 💻 Real-Time Code Preview & Interactive Approval
- **Syntax-Highlighted Diffs:** Displays live file modifications (`+` additions, `-` deletions, terminal commands).
- **Interactive Approval Card:** Review options and approve agent questions (`ask_question`) directly from the notch.
- **Instant "Undo to this Point" Sync:** Automatically catches trajectory rewinds and truncations in Antigravity, rolling back diffs and chat history in 0ms.
- **Procedural Audio Chimes:** Crisp, synthesized Web Audio chime tones on task completions and approvals (zero external audio asset bloat).

### 🔄 Symbiotic Process Lifecycle
- **Unified Launch:** Starts automatically with Antigravity using the bundled silent launcher.
- **Intelligent Watchdog:** Asynchronous background monitor polls `Antigravity.exe` every 4 seconds (<12ms, 0.0001% CPU). When Antigravity closes, Antigravity Island gracefully exits (`app.quit()`) automatically.

---

## 🏛️ Architecture

```mermaid
flowchart TD
    subgraph Antigravity ["Google Antigravity 2.0 Engine"]
        Brain["~/.gemini/antigravity/brain/"]
        Proc["Antigravity.exe Process"]
    end

    subgraph ElectronMain ["Electron 34 Main Process"]
        Watcher["Recursive fs.watch (0ms latency)"]
        TailReader["2KB Block Tail Reader (<6ms)"]
        Watchdog["Process Watchdog (Heartbeat)"]
        IPC["IPC Event Dispatcher"]
    end

    subgraph ReactUI ["React 19 Frontend (Vite + Tailwind)"]
        Notch["Dynamic Island Window (Frameless)"]
        Bloub["Bloub Mascot Engine (60 FPS Canvas)"]
        Diffs["Live Code Diff & Question Card"]
        Sessions["Multi-Session Dock with Live Dots"]
    end

    Brain -->|File Events| Watcher
    Watcher --> TailReader
    TailReader --> IPC
    Proc -->|Heartbeat Check| Watchdog
    Watchdog -->|Graceful Exit| ElectronMain
    IPC -->|agent-update| ReactUI
    ReactUI -->|setIgnoreMouseEvents| ElectronMain
```

---

## 🚀 Quick Start

### Option 1: Standalone Portable `.exe` (Recommended)
1. Go to the **[Releases](https://github.com/julzburz/antigravity-island/releases)** page.
2. Download `Antigravity-Island-Portable.exe`.
3. Double-click to run! No Node.js, Python, or installation required.

### Option 2: Setup Installer
Download `Antigravity-Island-Setup.exe` from Releases if you prefer a standard Windows installer with Start Menu and Desktop shortcuts.

---

## 🛠️ Development & Building from Source

### Prerequisites
- **Windows 10 / 11**
- **Node.js 18+** & **npm**
- **Google Antigravity 2.0**

### 1. Clone & Install
```powershell
git clone https://github.com/julzburz/antigravity-island.git
cd antigravity-island
npm install
```

### 2. Development Mode
Run the React Vite dev server with Electron:
```powershell
npm start
```

### 3. Silent Background Mode
Launch silently without a command prompt window:
```powershell
cscript //nologo run_silent.vbs
```

### 4. Build Windows Executable
Package into standalone binaries using `electron-builder`:
```powershell
# Build standalone Portable .exe
npm run dist:portable

# Build NSIS Setup Installer
npm run dist

# Build unpacked binary folder for instant local testing
npm run dist:dir
```
Packaged binaries will be located in the `release/` directory.

---

## ⌨️ Keyboard Shortcuts & Controls

| Shortcut / Action | Function |
|---|---|
| **Hover Notch** | Previews current agent status and action |
| **Click Notch** | Expands full dashboard and pins window |
| **`Esc`** | Minimizes or collapses dashboard |
| **Click Outside** | Collapses notch and clears "Listo ✓" status |
| **`Ctrl + Q`** | Cleanly exits Antigravity Island |
| **System Tray Icon** | Right-click to Center Window, Toggle Visibility, or Exit |

---

## 📂 Project Structure

```
antigravity-island/
├── .github/
│   └── workflows/
│       └── release.yml        # Automated GitHub Release CI/CD
├── build/
│   ├── icon.ico               # Windows multi-resolution icon (256x256)
│   └── icon.png               # High-res icon asset
├── electron/
│   ├── main.cjs               # Main process, fs.watch, watchdog, IPC
│   ├── preload.cjs            # Context bridge APIs
│   ├── icon.png               # Window and tray icon
│   └── tray-icon.png          # System tray icon
├── scripts/
│   └── generate_icon.js       # Procedural PNG/ICO generator
├── src/
│   ├── bot/                   # Official Bloub bot engine & kinematics
│   ├── components/
│   │   ├── ActionChecklist.tsx  # Checklist step tracker
│   │   ├── ApprovalCard.tsx     # Interactive question & decision modal
│   │   ├── CircularPet.tsx      # Mascot Canvas component
│   │   ├── CodePreviewCard.tsx  # Syntax diff and file previewer
│   │   ├── NotchHeader.tsx      # Navigation and sound toggles
│   │   └── SubagentPills.tsx    # Multi-session dock with radar beacons
│   ├── App.tsx                # Dynamic Island HUD container & state
│   ├── main.tsx               # React DOM entrypoint
│   └── index.css              # Obsidian glassmorphic styling
├── launch_antigravity.vbs     # Symbiotic unified silent launcher
├── package.json               # Scripts and electron-builder spec
├── tailwind.config.js         # Tailwind configuration
└── vite.config.ts             # Vite configuration
```

---

## 🤝 Contributing

Contributions, feature requests, and suggestions are welcome!
1. Fork the project (`https://github.com/julzburz/antigravity-island/fork`).
2. Create your feature branch (`git checkout -b feat/amazing-feature`).
3. Commit your changes (`git commit -m 'feat: add amazing feature'`).
4. Push to the branch (`git push origin feat/amazing-feature`).
5. Open a Pull Request.

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for more information.

---

<div align="center">

Crafted with care by [julzburz](https://github.com/julzburz) for the **Google Antigravity** community.

</div>
