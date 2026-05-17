# 💻 Calyx Meet - Premium Video Conferencing System

```
 ██████╗  █████╗  ██╗     ██╗   ██╗██╗  ██╗    ███╗   ███╗███████╗███████╗████████╗
██╔════╝ ██╔══██╗ ██║     ╚██╗ ██╔╝╚██╗██╔╝    ████╗ ████║██╔════╝██╔════╝╚══██╔══╝
██║      ███████║ ██║      ╚████╔╝  ╚███╔╝     ██╔████╔██║█████╗  █████╗     ██║   
██║      ██╔══██║ ██║       ╚██╔╝   ██╔██╗     ██║╚██╔╝██║██╔══╝  ██╔══╝     ██║   
╚██████╗ ██║  ██║ ███████╗   ██║   ██╔╝ ██╗    ██║ ╚═╝ ██║███████╗███████╗   ██║   
 ╚═════╝ ╚═╝  ╚═╝ ╚══════╝   ╚═╝   ╚═╝  ╚═╝    ╚═╝     ╚═╝╚══════╝╚══════╝   ╚═╝   
```

Welcome to **Calyx Meet**, an ultra-premium, modern, and high-fidelity video conferencing web application designed with elegant glassmorphism, responsive micro-interactions, and robust room orchestration. 

---

## 🗺️ Architectural Flow Diagram

Here is how a user moves through the Calyx Meet experience, showing our recently overhauled features:

```
+--------------------------------------------------------------+
|                        LANDING PAGE                          |
|                     (RoomConnection.jsx)                     |
+--------------------------------------------------------------+
                               |
                               |  [Start / Join Meeting]
                               v
+--------------------------------------------------------------+
|                        WAITING LOBBY                         |
|                     (VideoCallApp.jsx)                       |
|   - Toggle Mic/Camera      - Choose Name    - Join Room      |
+--------------------------------------------------------------+
                               |
                               |  [Admitted by Host]
                               v
+--------------------------------------------------------------+
|                         MEETING ROOM                         |
|                                                              |
|   +------------------------------------------------------+   |
|   |                  4-MEMBER ACTIVE GRID                |   |
|   |                                                      |   |
|   |  [Host Tile]                       [Speaking Tile 1] |   |
|   |  - Always visible                  - Spoken recently |   |
|   |                                                      |   |
|   |  [Speaking Tile 2]                 [Speaking Tile 3] |   |
|   |  - Spoken recently                 - Spoken recently |   |
|   +------------------------------------------------------+   |
|   |  Rest of participants in collapsible "More" sidebar  |   |
|   +------------------------------------------------------+   |
|                                                              |
|                     [FOOTER CONTROL PANEL]                   |
|   [Mic]  [Camera]  [Hand Raised]  [Smile Emoji]  [...] [End] |
+--------------------------------------------------------------+
                               |
                               |  [Leave Meeting]
                               v
+--------------------------------------------------------------+
|                         MEETING OVER                         |
|                      (MeetingOver.jsx)                       |
|   - Rejoin                 - Return Home    - CC Feedback    |
+--------------------------------------------------------------+
```

---

## 🌟 Premium Overhauled Features

### 1. 🎙️ High-Fidelity Room Controls & Interaction
* **Interactive Active/Mute States**: Microphone and Camera buttons light up vibrant red (`--accent-red`) when muted to prevent accidental speaking.
* **Raise Hand Gold Accent**: Toggling Hand Raise applies a premium glowing gold theme (`.hand-active-pill`) with a white hand icon and triggers a custom bouncing gold hand badge in your stage tile.
* **Closed Captions Overlay**: Centered stage subtitles overlay with custom blurred glass background.
* **Interactive More Options**: Click the three-dot button to toggle full screen, captions, or open the participants roster.
* **Floating Reaction Emojis**: Send emoji reactions that float gracefully from the bottom up to the top of the meeting room!

### 2. 👥 Smart Participant Prioritization Grid
* **Maximum 4 Stage Members**: Grid shows up to 4 priority speakers.
* **Priority 1 (Host)**: The meeting host is pinned and visible at all times.
* **Priorities 2-4 (Recent Speakers)**: Dynamic list of the 3 most recent active speakers.
* **Collapsible Overflow**: Rest of the participants are nested in the sidebar or under a `+X More` interactive grid card.

### 3. 🚪 Premium Meeting Over Screen
* **No More Emojis**: Basic `👍` and `👎` feedback emojis are replaced with premium, glowing `ThumbsUp` and `ThumbsDown` Lucide SVG icons.
* **Dynamic Rating Action**: Active selected ratings light up in gorgeous Emerald Green or Rose Red with dynamic box shadows and transitions.

---

## 🛠️ Project Structure

```
calyx/
├── backend/                  # Node.js / Express signaling server
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── VideoCallApp.jsx    # Core waiting lobby & meeting room
    │   │   ├── VideoCallApp.css    # Premium meeting room styles
    │   │   ├── MeetingOver.jsx     # Post-meeting screen
    │   │   ├── MeetingOver.css     # Premium post-meeting styles
    │   │   └── RoomConnection.jsx  # Welcome / landing page
    │   └── main.jsx
    └── package.json
```

---

## 🚀 Setup & Execution

### 1. Backend Server Setup
Navigate to the backend directory, install the dependencies, and start the signaling server:
```bash
cd backend
npm install
npm start
```

### 2. Frontend Development Setup
Navigate to the frontend directory, install the dependencies, and start the Vite dev server:
```bash
cd frontend
npm install
npm run dev
```

The frontend will run at `http://localhost:5174/` (or your configured local port).

---

## 🎨 Theme Colors & Aesthetics

We use a premium, dark-mode-first aesthetic with a carefully chosen palette:

```
[Background Dark]     ████████████  #0b0f19
[Panel Background]    ████████████  rgba(15, 23, 42, 0.45)
[Primary Indigo]      ████████████  #6366f1
[Accent Emerald]      ████████████  #10b981
[Accent Gold]         ████████████  #f59e0b
[Accent Red]          ████████████  #f43f5e
```

---

*Calyx Meet is developed ❤️ by Arnabh aka Zensensi.*