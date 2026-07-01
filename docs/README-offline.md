# Labora — Offline Mode (Desktop App)

Labora Desktop is a standalone Electron application that runs entirely on your local machine. No internet connection required. All data is stored in a SQLite database on your device.

---

## What You Get

- Full lab management: patients, orders, test results, PDF reports, billing, doctors
- Works without internet — ideal for clinics with unreliable connectivity
- Data never leaves your device
- Single-click installer for Mac, Windows, and Linux

---

## Download & Install

Download the latest installer from the [Releases page](https://github.com/nanda-kumar-baskaran/labora/releases):

| Platform | File | Notes |
|---|---|---|
| **Mac (Apple Silicon M1/M2/M3)** | `LabMS-mac-arm64.zip` | Unzip → double-click LabMS.app |
| **Mac (Intel)** | `LabMS-mac-x64.zip` | Unzip → double-click LabMS.app |
| **Windows** | `LabMS-Setup-x.x.x.exe` | Run installer → shortcut on Desktop |
| **Linux** | `LabMS-x.x.x.AppImage` | `chmod +x` → double-click |

### Mac: First Launch

macOS will block the app since it's not code-signed. To open it:

1. Right-click `LabMS.app` → **Open**
2. Click **Open** in the dialog

You only need to do this once.

### Linux: First Launch

```bash
chmod +x LabMS-*.AppImage
./LabMS-*.AppImage
```

> **Linux dependency:** If the app doesn't launch, install FUSE:
> ```bash
> sudo apt install fuse libfuse2   # Ubuntu/Debian
> sudo dnf install fuse            # Fedora
> ```

---

## First-Time Setup

1. Launch the app — a browser window opens automatically at `http://127.0.0.1:3456`
2. You'll see the **"Set Up Your Lab"** screen
3. Enter:
   - **Lab Name** (e.g., "Shree Pathology Lab")
   - **Admin Name** (your full name)
   - **Email** (used to log in)
   - **Password** (min 8 characters)
4. Click **Create Lab & Login**
5. A test catalog with 94 standard tests is loaded automatically

---

## Daily Use

### Login
- Open the app → enter your email and password → **Sign In**

### Workflow
1. **Register Patient** → Patients → New Patient
2. **Create Order** → Orders → New Order → select patient + tests
3. **Enter Results** → Orders → [order] → Enter Results
4. **Generate Report** → Orders → [order] → Report → Generate PDF
5. **Verify & Print** → Verify Report → Print Report
6. **Billing** → Billing → record payment

---

## Data Storage

Your data is stored here:

| Platform | Location |
|---|---|
| **Mac** | `~/Library/Application Support/labms/` |
| **Windows** | `%APPDATA%\labms\` |
| **Linux** | `~/.config/labms/` |

Inside that folder:
- `labora.db` — SQLite database (all your data)
- `storage/` — generated PDF reports
- `labora-startup.log` — startup logs (useful for troubleshooting)

### Backup

**Regularly back up `labora.db`.** This file contains all your patient, order, billing, and report data. Copy it to an external drive or cloud storage.

---

## Forgot Password

1. Open the app → click **"Forgot your password? Recover access →"** on the login screen
2. Click **"Reset Setup Only"** (this clears your user account but keeps all lab data)
3. Run setup again to create a new admin account

---

## Add More Staff Users

1. Log in as admin
2. Go to **Settings → Users → Add User**
3. Set name, email, password, and role:
   - **Admin** — full access
   - **Staff** — registration, orders, billing
   - **Technician** — enter test results only
   - **Pathologist** — verify and sign off reports

---

## Troubleshooting

| Problem | Solution |
|---|---|
| App won't open (Mac) | Right-click → Open → click Open |
| "Server did not start" error | Check `labora-startup.log` in the data folder |
| Blank white screen | Wait 30 seconds for first load; restart if it persists |
| Lost admin password | Use Forgot Password on the login screen |
| Data missing after reinstall | Reinstall doesn't delete data; it stays in the data folder |

---

## Building from Source

Requirements: Node.js 22, npm

```bash
git clone https://github.com/nanda-kumar-baskaran/labora.git
cd labora
npm install --legacy-peer-deps
npm run electron:dev        # Run in development mode
```

To build installers:
```bash
bash electron/build.sh mac      # macOS .dmg
bash electron/build.sh win      # Windows .exe (run on Windows)
bash electron/build.sh linux    # Linux .AppImage (run on Linux)
```

Or push a `v*` tag to trigger GitHub Actions to build all platforms automatically:
```bash
git tag v1.0.0 && git push --tags
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Shell | Electron 42 |
| UI | Next.js 16, React 19, Tailwind CSS 4 |
| Database | SQLite via @libsql/client |
| Auth | HMAC-signed cookies (bcrypt passwords) |
| PDF | @react-pdf/renderer |
| Build | electron-builder |
