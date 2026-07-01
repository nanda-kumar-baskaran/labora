/**
 * Electron main process — Labora Desktop
 *
 * Architecture:
 *   Electron shell → license check → spawns Next.js standalone server
 *   → waits for "✓ Ready" in server output → opens BrowserWindow
 *
 * Key design decisions:
 *   - Detect server readiness by watching stdout/stderr for "✓ Ready"
 *     instead of HTTP polling. HTTP polling can fail on Windows when
 *     Electron intercepts loopback connections; output watching is
 *     100% reliable cross-platform.
 *   - Use 127.0.0.1 everywhere (not 'localhost') — on Windows/Node 17+,
 *     'localhost' resolves to ::1 (IPv6) first, causing ECONNREFUSED
 *   - Log everything to userData/labora-startup.log for client diagnostics
 *   - License check (Ed25519) before Next.js starts
 */

const { app, BrowserWindow, ipcMain, shell, dialog } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const { checkStoredLicense, activateLicense, getMachineId } = require("./license");

const PORT = 3456;
const HOST = "127.0.0.1";
const DEV_MODE = !app.isPackaged;

let mainWindow = null;
let activationWindow = null;
let nextServer = null;
let logStream = null;

// ── Paths ─────────────────────────────────────────────────────────────
function getAppDataDir() {
  return app.getPath("userData");
}

function getNextServerPath() {
  if (DEV_MODE) return path.join(__dirname, "..");
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

// ── License gate ──────────────────────────────────────────────────────
function showActivationWindow() {
  activationWindow = new BrowserWindow({
    width: 560,
    height: 600,
    resizable: false,
    title: "Labora — Activation",
    icon: path.join(__dirname, "icon.png"),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    backgroundColor: "#070d1a",
  });

  activationWindow.loadFile(path.join(__dirname, "activate.html"));
  activationWindow.setMenuBarVisibility(false);

  activationWindow.on("closed", () => {
    activationWindow = null;
    if (!mainWindow) app.quit();
  });
}

ipcMain.handle("get-machine-id", () => getMachineId());

ipcMain.handle("activate-license", (_, licenseStr) => {
  const result = activateLicense(app, licenseStr);
  if (result.valid) return { success: true };
  return { success: false, reason: result.reason };
});

ipcMain.handle("restart-app", () => {
  app.relaunch();
  app.quit();
});

// ── Start Next.js server + wait for ready ────────────────────────────
// Returns a Promise that:
//   - resolves when "✓ Ready" appears in server output (stdout or stderr)
//   - rejects immediately if server exits with non-zero code
//   - rejects after timeout ms with no ready signal
//
// Why output-watching instead of HTTP polling:
//   On Windows, Electron's network stack can intercept/block http.get()
//   to loopback addresses from the main process even when the server is
//   fully listening. Watching stdout/stderr is OS-independent and faster.
function startNextServer(timeout = 90000) {
  const appDir = getNextServerPath();
  const appDataDir = getAppDataDir();

  fs.mkdirSync(path.join(appDataDir, "storage"), { recursive: true });

  const env = {
    ...process.env,
    STORAGE_MODE: "local",
    PORT: String(PORT),
    HOSTNAME: HOST,
    NEXT_PUBLIC_APP_URL: `http://${HOST}:${PORT}`,
    LABMS_APP_DATA_DIR: appDataDir,
    NEXT_PUBLIC_SUPABASE_URL: "http://localhost",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "local",
    SUPABASE_SERVICE_ROLE_KEY: "local",
    LOCAL_AUTH_SECRET: require("crypto")
      .createHash("sha256")
      .update(appDataDir + "labms-secret-v1")
      .digest("hex"),
  };

  const standaloneDir = DEV_MODE ? appDir : path.join(appDir, ".next", "standalone");
  const serverScript = DEV_MODE
    ? path.join(appDir, "node_modules", ".bin", "next")
    : path.join(standaloneDir, "server.js");

  const args = DEV_MODE ? ["start", "--port", String(PORT), "--hostname", HOST] : [];

  if (!DEV_MODE) env.ELECTRON_RUN_AS_NODE = "1";

  log("Starting Next.js server:", serverScript);
  log("Standalone dir:", standaloneDir);
  log("App data dir:", appDataDir);

  nextServer = spawn(
    DEV_MODE ? serverScript : process.execPath,
    DEV_MODE ? args : [serverScript],
    {
      cwd: standaloneDir,
      env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    }
  );

  // Return a promise that resolves when the server signals it's ready
  return new Promise((resolve, reject) => {
    let done = false;
    const recentOutput = [];

    const succeed = () => {
      if (done) return;
      done = true;
      log("Server ready signal received");
      resolve();
    };

    const fail = (reason) => {
      if (done) return;
      done = true;
      reject(new Error(reason));
    };

    // Watch both stdout and stderr for the "Ready" signal
    // Next.js 16 prints "✓ Ready" to stderr
    const onData = (chunk) => {
      const text = chunk.toString();
      const lines = text.split(/\r?\n/).filter(Boolean);
      for (const line of lines) {
        log("[next]", line);
        recentOutput.push(line);
        if (recentOutput.length > 30) recentOutput.shift();
        // Match Next.js ready signal — works across versions
        if (line.includes("Ready") || line.includes("ready") || line.includes("✓")) {
          succeed();
        }
      }
    };

    nextServer.stdout.on("data", onData);
    nextServer.stderr.on("data", onData);

    // Fail fast if server crashes
    nextServer.once("exit", (code, signal) => {
      if (code !== 0 && code !== null) {
        const lastOutput = recentOutput.slice(-10).join("\n");
        logErr(`Server exited with code ${code}`);
        logErr("Last output:\n" + lastOutput);
        fail(
          `Server crashed (exit code ${code}).\n\n` +
          `Last output:\n${lastOutput}\n\n` +
          `See log: ${path.join(appDataDir, "labora-startup.log")}`
        );
      }
    });

    nextServer.on("error", (err) => {
      logErr("Spawn error:", err.message);
      fail(`Failed to start server: ${err.message}`);
    });

    // Timeout fallback
    setTimeout(() => {
      fail(`Server did not signal ready within ${timeout / 1000} seconds.\nSee log: ${path.join(appDataDir, "labora-startup.log")}`);
    }, timeout);
  });
}

// ── Create main browser window ────────────────────────────────────────
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

  // Show loading screen while server starts
  mainWindow.loadURL(
    "data:text/html,<html><body style='background:#070d1a;display:flex;align-items:center;" +
    "justify-content:center;height:100vh;font-family:sans-serif;color:#94a3b8'>" +
    "<div style='text-align:center'><div style='font-size:48px;margin-bottom:16px'>🧪</div>" +
    "<h2 style='margin:0;font-size:20px'>Labora is starting...</h2>" +
    "<p style='margin-top:8px;font-size:14px'>Please wait a moment</p></div></body></html>"
  );
  mainWindow.show();

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http")) shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => { mainWindow = null; });
}

// ── App lifecycle ──────────────────────────────────────────────────────
app.whenReady().then(async () => {
  logStream = openLogStream();

  if (!DEV_MODE) {
    const licenseCheck = checkStoredLicense(app);
    log("License check:", licenseCheck.licensed ? "VALID" : "NOT LICENSED");

    if (!licenseCheck.licensed) {
      log("Showing activation window. Machine ID:", licenseCheck.machineId);
      showActivationWindow();
      return;
    }

    log("Licensed to:", licenseCheck.payload?.clientName ?? "unknown");
  }

  // Create window immediately (shows loading screen)
  await createWindow();

  // Start server and wait for ready signal
  try {
    await startNextServer();
    // Small delay to let the server fully initialize after Ready signal
    await new Promise(r => setTimeout(r, 500));
    log("Loading app at http://" + HOST + ":" + PORT);
    mainWindow?.loadURL(`http://${HOST}:${PORT}`);
  } catch (err) {
    logErr("Startup failed:", err.message);
    dialog.showErrorBox(
      "Labora Startup Error",
      "The application server failed to start. Please restart Labora.\n\n" + err.message
    );
    app.quit();
    return;
  }

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
