<p align="center">
  <img src="https://gonopbx.de/logo.png" alt="VoiceLinkPBX Logo" width="120">
</p>

<h1 align="center">VoiceLinkPBX</h1>

<p align="center">
  <strong>Modern Open-Source Web GUI for Asterisk PBX</strong><br>
  Manage your phone system through an intuitive web interface – extensions, SIP trunks, call routing, voicemail, and real-time monitoring.
</p>

<p align="center">
  <a href="https://github.com/ankaios76/gonopbx/blob/main/LICENSE"><img src="https://img.shields.io/github/license/ankaios76/gonopbx?color=blue" alt="License"></a>
  <a href="https://github.com/ankaios76/gonopbx/releases"><img src="https://img.shields.io/github/v/release/ankaios76/gonopbx?color=green" alt="Release"></a>
  <a href="https://github.com/ankaios76/gonopbx/stargazers"><img src="https://img.shields.io/github/stars/ankaios76/gonopbx?style=social" alt="Stars"></a>
  <a href="https://demo.gonopbx.de"><img src="https://img.shields.io/badge/Live-Demo-brightgreen" alt="Live Demo"></a>
  <a href="https://buymeacoffee.com/ankaios"><img src="https://img.shields.io/badge/Buy%20me%20a-Coffee-orange?logo=buymeacoffee&logoColor=white" alt="Buy me a Coffee"></a>
</p>

<p align="center">
  <a href="https://gonopbx.de">Website</a> •
  <a href="https://demo.gonopbx.de">Live Demo</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-screenshots">Screenshots</a> •
  <a href="#-features">Features</a> •
  <a href="#-changelog">Changelog</a> •
  <a href="https://buymeacoffee.com/ankaios">Support the Project</a>
</p>

---

<p align="center">
  <img src="https://gonopbx.de/dashboard1.png" alt="VoiceLinkPBX Dashboard" width="800">
</p>

## ✨ Features

- **📞 Extension Management** – Create, edit, and manage SIP extensions with caller ID, context, and activation status
- **📖 Phonebook** – Global and per-extension address books with CSV import/export
- **🔌 SIP Trunk Configuration** – Connect to any SIP provider via registration or IP authentication, with built-in templates for Plusnet IPfonie, Telekom DeutschlandLAN, CompanyFlex, Telekom All-IP (Privatkundenanschluss) and Iliad (Italy)
- **📠 DID Routing** – Flexibly assign incoming phone numbers to extensions with number block management per trunk
- **📤 Outbound CID Selection** – Choose which assigned DID to use as outbound caller-ID per extension via dropdown
- **🆔 P-Asserted-Identity (PAI)** – Optional PAI header per extension (e.g. main number of a number block)
- **🔄 Call Forwarding** – Unconditional, busy, and no-answer forwarding per extension, toggled with one click
- **🔔 BLF & Pickup Groups** – Busy lamp field hints and call pickup groups per extension
- **📞 Ring Groups (Sammelruf)** – Create ring groups with strategies and assign inbound numbers
- **🎛️ IVR** – Multi-level IVR menus with prompt upload/conversion, retries, and inbound DID assignment
- **📩 Voicemail** – Per-extension voicemail boxes with PIN, email notifications (HTML), configurable ring timeout, and built-in audio player
- **📧 SMTP Email Configuration** – Configure your mail server for voicemail-to-email delivery, with built-in test email function (Port 465/587 auto-detection)
- **🏠 Home Assistant Integration** – API-key authentication, MQTT publisher for call events, and click-to-call via originate endpoint
- **🎵 Music on Hold** – Pre-installed hold music in high-quality g722 format
- **🎙️ German Voice Prompts** – Built-in German Asterisk sound pack for IVR and voicemail announcements
- **🔒 IP Whitelist** – Restrict SIP registration to trusted IP addresses and CIDR networks
- **🔑 SIP Password Strength** – Real-time password strength indicator, secure password generator, and weak password overview
- **📝 Audit Log** – Full audit trail of all administrative actions with color-coded log viewer
- **🛡️ Fail2Ban Integration** – Live Fail2Ban status with active bans, jail overview, and recent ban history
- **🎛️ Codec Management** – Global and per-extension codec configuration with drag-and-drop priority ordering
- **📊 Call Detail Records** – Full CDR with filters by source, destination, and status, plus call statistics at a glance
- **🔐 Multi-User & Roles** – Admin and user roles with JWT-based authentication
- **📡 Real-Time Dashboard** – Live overview via WebSocket: Asterisk status, registered endpoints, active lines, and recent calls
- **🌙 Dark Mode** – System-wide dark theme with OS preference detection, manual toggle, and localStorage persistence
- **🔍 SIP Debug** – Live SIP message viewer (INVITE, BYE, 200 OK) with per-call grouping, expandable raw SIP text, and toggle capture (admin-only)
- **🌐 Multilingual UI (DE/EN)** – Choose German or English during installation; UI is fully translated
- **🔄 One-Click Updates** – Update VoiceLinkPBX directly from the web GUI or via command line
- **🐳 Docker Deployment** – Full system up and running in minutes with `docker compose up`

## 📸 Screenshots

| Dashboard | Settings | Security |
|:---:|:---:|:---:|
| ![Dashboard](https://gonopbx.de/dashboard1.png) | ![Settings](https://gonopbx.de/settings.png) | ![Security](https://gonopbx.de/settings_security.png) |

| Email Settings | Audio Codecs | Server Management |
|:---:|:---:|:---:|
| ![Email](https://gonopbx.de/settings_email.png) | ![Audio](https://gonopbx.de/settings_audio.png) | ![Server](https://gonopbx.de/settings_server.png) |

## 🚀 Quick Start

### Prerequisites

- Linux server (Ubuntu 22.04+ / Debian 12+ recommended)
- Docker & Docker Compose installed
- Ports 3000 (Web UI), 5060 (SIP), 10000-20000 (RTP) available

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/ankaios76/gonopbx.git
cd gonopbx

# 2. Run the interactive installer
chmod +x install.sh
./install.sh

# 3. Access the web interface
# Open https://your-server-ip:3000 in your browser
```

The installer will automatically:
- Detect your server IP
- Generate secure passwords
- Create the Docker configuration
- Ask for the UI language (German or English)
- Start all services

## 🏗️ Tech Stack

| Component | Technology |
|-----------|------------|
| **PBX Engine** | Asterisk 20 (PJSIP) |
| **Backend** | FastAPI (Python) |
| **Frontend** | React + TypeScript (Vite, Tailwind CSS) |
| **Database** | PostgreSQL |
| **Auth** | JWT + bcrypt |
| **Real-Time** | WebSocket |
| **Email** | msmtp (in Asterisk container) |
| **Deployment** | Docker Compose |

## 📁 Project Structure

```
gonopbx/
├── asterisk/           # Asterisk Dockerfile + configuration templates
├── backend/            # FastAPI backend (API, WebSocket, Asterisk integration)
├── frontend/           # React frontend (Vite + Tailwind)
├── docker-compose.yml  # Container orchestration
├── install.sh          # Interactive installer
└── CHANGELOG.md        # Version history
```

## 🔄 Update

### Automatic (via Web GUI)

Go to **Settings → Server → Update** and click **"Update installieren"**. The system will pull the latest version, rebuild containers, and restart automatically.

### Manual

```bash
cd /root/asterisk-pbx-gui
git pull origin main
docker compose up -d --build
```

Database migrations run automatically on startup — no manual steps required.

## 📋 Changelog

### v2.1.2 (2026-02-18)

**New Features:**
- **Multilingual UI (DE/EN)** – UI translation framework with installer language selection

### v2.1.1 (2026-02-18)

**New Features:**
- **Iliad (Italy) SIP Trunk** – New provider profile with preset registrar/proxy `voip.iliad.it` and From-User (login number) support

### v2.1.0 (2026-02-18)

**New Features:**
- **Telekom All-IP (Privatkundenanschluss)** – New provider profile for Telekom residential connections (MagentaZuhause). Supports `P-Preferred-Identity` header, TCP transport, and `tel.t-online.de` registrar. Separate fields for Zugangsnummer (auth) and Anschlussnummer (From-User, E.164 format)

### v2.0.0 (2026-02-13)

**New Features:**
- **Phonebook** – Global and per-extension address books with CSV import/export
- **BLF & Pickup Groups** – BLF hints and pickup groups per extension
- **Ring Groups (Sammelruf)** – Ring groups with strategies and inbound DID assignment
- **IVR Enhancements** – Prompt upload with conversion/validation, retries, and inbound DID mapping
- **UI Improvements** – SIP Debug moved to Settings, Audio tab renamed to Audio-Codecs

### v1.7.0 (2026-02-13)

**New Features:**
- **SIP Debug** – Live SIP message viewer in the web GUI. Toggle capture on/off, messages grouped by Call-ID, expandable raw SIP text with direction arrows and color-coded methods/status codes. Based on Asterisk's `res_pjsip_history` module with 3-second polling. Messages kept for 2 hours (max 10,000). Admin-only

### v1.6.0 (2026-02-13)

**New Features:**
- **Outbound CID Selection** – Choose which assigned DID to use as outbound caller-ID per extension (dropdown in extension detail)
- **P-Asserted-Identity (PAI)** – Optional PAI header per extension, e.g. main number of a number block
- **Home Assistant Integration** – API-key auth, MQTT publisher for call events, click-to-call via originate endpoint
- **Home Assistant Settings** – Configure MQTT broker, API key, and test connection from the web GUI
- Website redesign with updated screenshots

### v1.5.2 (2026-02-12)

**New Features:**
- **Dark Mode** – Full dark mode with automatic OS preference detection and manual toggle (Sun/Moon icon in header). Persists via localStorage
- Provider logos in trunk cards now displayed as round avatars with white background
- "Made with ❤️ in Bremen" added to footer

### v1.5.1 (2026-02-12)

**Improvements:**
- Dashboard redesign: personalized greeting (Moin/Hallo/Guten Abend) with username, weekday and date
- Version display moved from footer to Dashboard status card
- dus.net SIP server corrected to proxy.dus.net
- System Health card removed from Dashboard

### v1.5.0 (2026-02-11)

**New Features:**
- User profiles with full name, avatar upload and extension assignment
- Multi-DID routing: multiple inbound numbers per extension
- Welcome email with credentials for new users
- Self-service password change for all users
- FAQ page built into the web interface
- Navigation restructured: Extensions and Trunks moved under Settings
- One-click system update from the web GUI

**Bugfixes:**
- Fixed user creation error (removed unique email constraint)

### v1.4.0 (2026-02-11)

**New Features:**
- SIP password strength checker with real-time indicator (red/yellow/green bar)
- Secure password generator (16 characters) with one-click button
- Weak password overview in Security settings tab
- Full audit log for all administrative actions (create, update, delete)
- Audit Log tab in Settings with color-coded entries and pagination
- Fail2Ban live status in Security tab (active bans, jails, recent bans)

### v1.3.0 (2026-02-11)

**New Features:**
- IP whitelist for SIP registration (restrict to trusted IPs/CIDRs)
- Music on Hold with pre-installed g722 audio files
- HTML voicemail email notifications
- Per-extension ring timeout (configurable seconds before voicemail picks up)
- German voice prompts (asterisk-prompt-de)

**Improvements:**
- Auto-detection of external IP address
- SMTP port 465 implicit TLS support
- Dialplan: device-state check before dial, early answer for inbound trunk calls
- DID extraction from SIP To-header as fallback
- Duplicate identify section protection for multi-trunk setups
- Installer: Docker permission check

### v1.2.0 (2026-02-10)

- Global and per-extension codec management with drag-and-drop priority

### v1.1.0 (2026-02-10)

- SMTP email configuration with test email function
- Per-extension voicemail mailbox management
- Custom SIP trunk provider support

### v1.0.0 (2026-02-09)

Initial release with full PBX management: extensions, trunks, routing, call forwarding, voicemail, CDR, authentication, and real-time dashboard.

See [CHANGELOG.md](CHANGELOG.md) for the full version history.

## 🤝 Contributing

Contributions are welcome! Whether it's bug reports, feature requests, or pull requests – all help is appreciated.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Have an idea but no time to code? [Open an issue](https://github.com/ankaios76/gonopbx/issues) – I'll implement it when I find the time.

## 🗺️ Roadmap

- [ ] Multi-database support (SQLite for home use, MySQL/MariaDB)
- [x] Ring groups & call queues
- [x] IVR / auto attendant builder
- [ ] Conference rooms
- [x] Phonebook with CallerID lookup
- [ ] Multi-language support (EN/DE)
- [ ] Backup & restore functionality

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## ☕ Support

VoiceLinkPBX is free and open source. If you find it useful, please consider:

- ⭐ **Starring this repository** – it helps with visibility
- 🐛 **Reporting bugs** or suggesting features via [Issues](https://github.com/ankaios76/gonopbx/issues)
- ☕ **[Buy me a Coffee](https://buymeacoffee.com/ankaios)** – helps cover hosting costs

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/ankaios76">Norbert Hengsteler</a><br>
  <a href="https://gonopbx.de">gonopbx.de</a>
</p>
