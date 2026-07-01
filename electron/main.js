/**
 * Electron main process — Labora Desktop
 *
 * Architecture:
 *   Electron shell → spawns Next.js standalone server as a child process
 *   → opens BrowserWindow pointing at http://127.0.0.1:3456
 *
 * The Next.js server handles all API routes and server components.
 * SQLite file lives in app.getPath('userData') — writable on all OSes.
 * PDFs stored in userData/storage/.
 *
 * Key design decisions:
 *   - Use 127.0.0.1 everywhere (not 'localhost') — on Windows/Node 17+,
 *     'localhost' resolves to ::1 (IPv6) first, causing ECONNREFUSED
 *     when the server binds to 127.0.0.1 (IPv4 only).
 *   - Log server stdout/stderr to userData/labora-startup.log so startup
 *     failures are diagnosable on client machines.
 *   - Health check hits / (not /login) to avoid false 500 retries.
 *   - 60s timeout for slow client machines.
 */

const { app, BrowserWindow, shell, dialog } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const http = require("http");

const PORT = 3456;
const HOST = "127.0.0.1"; // Always IPv4 — avoids localhost → ::1 on Windows/Node 17+
const DEV_MODE = !app.isPackaged;

let mainWindow = null;
let nextServer = null;
let logStream = null;

// ── Paths ─────────────────────────────────────────────────────────────
function getAppDataDir() {
  // userData = %APPDATA%\labms on Windows, ~/Library/Application Support/labms on Mac
  return app.getPath("userData");
}

function getNextServerPath() {
  if (DEV_MODE) {
    return path.join(__dirname, "..");
  }
  // In packaged app, Next.js standalone is bundled at resources/app/
  return path.join(process.resourcesPath, "app");
}

// ── Logging ───────────────────────────────────────────────────────────
function openLogStream() {
  if (DEV_MODE) return null;
  try {
    const logPath = path.join(getAppDataDir(), "labora-startup.log");
    const stream = fs.createWriteStream(logPath, { flags: "a" });
    stream.write(`\n\n=== Labora started at ${new Date().toISOString()} ===\n`);
    return stream;
  } catch (_) {
    return null;
  }
}

function log(...args) {
  const msg = args.join(" ");
  console.log(msg);
  logStream?.write(msg + "\n");
}

function logErr(...args) {
  const msg = args.join(" ");
  console.error(msg);
  logStream?.write("[ERR] " + msg + "\n");
}

// ── Wait for Next.js server to be ready ──────────────────────────────
function waitForServer(timeout = 60000) {
  // Health check on / — simpler than /login which may return 500
  const url = `http://${HOST}:${PORT}/`;
  return new Promise((resolve, reject) => {
    const start = Date.now();
    function check() {
      const req = http.get(url, (res) => {
        // Drain response to free socket
        res.resume();
        // Any response (including 302 redirect to /login) means server is up
        resolve();
      });
      req.on("error", retry);
      req.setTimeout(3000, () => { req.destroy(); retry(); });
    }
    function retry() {
      const elapsed = Date.now() - start;
      if (elapsed > timeout) {
        reject(new Error(`Next.js server did not start within ${timeout / 1000} seconds`));
        return;
      }
      setTimeout(check, 500);
    }
    check();
  });
}

// ── Start Next.js server ──────────────────────────────────────────────
function startNextServer() {
  const appDir = getNextServerPath();
  const appDataDir = getAppDataDir();

  // Ensure storage directory exists
  fs.mkdirSync(path.join(appDataDir, "storage"), { recursive: true });

  const env = {
    ...process.env,
    STORAGE_MODE: "local",
    PORT: String(PORT),
    HOSTNAME: HOST, // IPv4 bind address — must match HOST constant above
    NEXT_PUBLIC_APP_URL: `http://${HOST}:${PORT}`,
    LABMS_APP_DATA_DIR: appDataDir,
    // Disable Supabase in local mode
    NEXT_PUBLIC_SUPABASE_URL: "http://localhost",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "local",
    SUPABASE_SERVICE_ROLE_KEY: "local",
    // Auth secret — derived from machine-specific path for stability
    LOCAL_AUTH_SECRET: require("crypto")
      .createHash("sha256")
      .update(appDataDir + "labms-secret-v1")
      .digest("hex"),
  };

  const serverScript = DEV_MODE
    ? path.join(appDir, "node_modules", ".bin", "next")
    : path.join(appDir, ".next", "standalone", "server.js");

  const args = DEV_MODE ? ["start", "--port", String(PORT), "--hostname", HOST] : [];

  // In prod, spawn Electron's own Node runtime (ELECTRON_RUN_AS_NODE=1)
  // to run the Next.js standalone server.js — no system Node required.
  if (!DEV_MODE) {
    env.ELECTRON_RUN_AS_NODE = "1";
  }

  log("Starting Next.js server:", serverScript, args.join(" "));
  log("App dir:", appDir);
  log("App data dir:", appDataDir);

  nextServer = spawn(
    DEV_MODE ? serverScript : process.execPath,
    DEV_MODE ? args : [serverScript],
    {
      cwd: appDir,
      env,
      stdio: DEV_MODE ? "inherit" : ["ignore", "pipe", "pipe"],
      windowsHide: true,
    }
  );

  if (!DEV_MODE) {
    nextServer.stdout?.on("data", (d) => log("[next]", d.toString().trimEnd()));
    nextServer.stderr?.on("data", (d) => logErr("[next]", d.toString().trimEnd()));
  }

  nextServer.on("error", (err) => {
    logErr("Failed to spawn Next.js server:", err.message);
    dialog.showErrorBox(
      "Labora Error",
      `Failed to start server: ${err.message}\n\nLog: ${path.join(getAppDataDir(), "labora-startup.log")}`
    );
    app.quit();
  });

  nextServer.on("exit", (code, signal) => {
    if (code !== 0 && code !== null) {
      logErr(`Next.js server exited with code ${code}, signal ${signal}`);
    }
  });
}

// ── Create browser window ─────────────────────────────────────────────
async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: "Labora — Lab Intelligence Platform",
    icon: path.join(__dirname, "icon.png"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    show: false,
    backgroundColor: "#070d1a",
  });

  // Show loading screen immediately
  mainWindow.loadURL(
    "data:text/html,<html><body style='background:#070d1a;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#94a3b8'>" +
    "<div style='text-align:center'><div style='font-size:48px;margin-bottom:16px'>🧪</div>" +
    "<h2 style='margin:0;font-size:20px'>Labora is starting...</h2>" +
    "<p style='margin-top:8px;font-size:14px'>Please wait a moment</p></div></body></html>"
  );
  mainWindow.show();

  // Wait for Next.js to be ready, then load the app
  try {
    await waitForServer();
    log("Server ready — loading app");
    mainWindow.loadURL(`http://${HOST}:${PORT}`);
  } catch (err) {
    const logPath = path.join(getAppDataDir(), "labora-startup.log");
    logErr("Server failed to start:", err.message);
    dialog.showErrorBox(
      "Labora Startup Error",
      "The application server failed to start. Please restart Labora.\n\n" +
      err.message +
      (DEV_MODE ? "" : `\n\nDiagnostics log: ${logPath}`)
    );
    app.quit();
    return;
  }

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http")) shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => { mainWindow = null; });
}

// ── App lifecycle ──────────────────────────────────────────────────────
app.whenReady().then(async () => {
  logStream = openLogStream();
  startNextServer();
  await createWindow();

  app.on("activate", () => {
    if (!mainWindow) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (nextServer) {
    nextServer.kill("SIGTERM");
    nextServer = null;
  }
  logStream?.end();
  logStream = null;
});

// Security: prevent navigation outside the app
app.on("web-contents-created", (_, contents) => {
  contents.on("will-navigate", (event, url) => {
    if (!url.startsWith(`http://${HOST}:${PORT}`)) {
      event.preventDefault();
    }
  });
});
