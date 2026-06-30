/**
 * Electron main process — Labora Desktop
 *
 * Architecture:
 *   Electron shell → spawns Next.js standalone server as a child process
 *   → opens BrowserWindow pointing at http://localhost:3456
 *
 * The Next.js server handles all API routes and server components.
 * SQLite file lives in app.getPath('userData') — writable on all OSes.
 * PDFs stored in userData/storage/.
 */

const { app, BrowserWindow, shell, dialog } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const http = require("http");

const PORT = 3456;
const DEV_MODE = !app.isPackaged;

let mainWindow = null;
let nextServer = null;

// ── Paths ─────────────────────────────────────────────────────────────
function getAppDataDir() {
  // userData = %APPDATA%\labms on Windows, ~/Library/Application Support/labms on Mac
  return app.getPath("userData");
}

function getNextServerPath() {
  if (DEV_MODE) {
    // In dev, use the project root
    return path.join(__dirname, "..");
  }
  // In packaged app, Next.js standalone is bundled at resources/app/
  return path.join(process.resourcesPath, "app");
}

// ── Wait for Next.js server to be ready ──────────────────────────────
function waitForServer(url, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    function check() {
      http.get(url, (res) => {
        if (res.statusCode < 500) resolve();
        else retry();
      }).on("error", retry);
    }
    function retry() {
      if (Date.now() - start > timeout) {
        reject(new Error("Next.js server did not start within 30 seconds"));
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
    HOSTNAME: "127.0.0.1",
    NEXT_PUBLIC_APP_URL: `http://localhost:${PORT}`,
    // Tell the app where to write DB and PDFs
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

  const args = DEV_MODE ? ["start", "--port", String(PORT)] : [];

  // In prod, we spawn Electron's own Node runtime to run the Next.js standalone
  // server.js. ELECTRON_RUN_AS_NODE=1 tells Electron to behave as plain Node.
  if (!DEV_MODE) {
    env.ELECTRON_RUN_AS_NODE = "1";
  }

  console.log("Starting Next.js server:", serverScript, args);

  nextServer = spawn(
    DEV_MODE ? serverScript : process.execPath, // use bundled node in prod
    DEV_MODE ? args : [serverScript],
    {
      cwd: appDir,
      env,
      stdio: DEV_MODE ? "inherit" : ["ignore", "pipe", "pipe"],
      windowsHide: true,
    }
  );

  if (!DEV_MODE) {
    nextServer.stdout?.on("data", (d) => console.log("[next]", d.toString().trim()));
    nextServer.stderr?.on("data", (d) => console.error("[next]", d.toString().trim()));
  }

  nextServer.on("error", (err) => {
    console.error("Failed to start Next.js server:", err);
    dialog.showErrorBox("Labora Error", `Failed to start server: ${err.message}`);
    app.quit();
  });

  nextServer.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      console.error("Next.js server exited with code:", code);
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
    show: false, // show after load
    backgroundColor: "#070d1a",
  });

  // Show loading screen
  mainWindow.loadURL("data:text/html,<html><body style='background:#070d1a;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#94a3b8'><div style='text-align:center'><div style='font-size:48px;margin-bottom:16px'>🧪</div><h2 style='margin:0;font-size:20px'>Labora is starting...</h2><p style='margin-top:8px;font-size:14px'>Please wait a moment</p></div></body></html>");
  mainWindow.show();

  // Wait for Next.js to be ready
  try {
    await waitForServer(`http://localhost:${PORT}/login`);
    mainWindow.loadURL(`http://localhost:${PORT}`);
  } catch (err) {
    dialog.showErrorBox(
      "Labora Startup Error",
      "The application server failed to start. Please restart Labora.\n\n" + err.message
    );
    app.quit();
    return;
  }

  // Open external links in default browser, not Electron
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http")) shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => { mainWindow = null; });
}

// ── App lifecycle ──────────────────────────────────────────────────────
app.whenReady().then(async () => {
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
});

// Security: prevent navigation to external URLs
app.on("web-contents-created", (_, contents) => {
  contents.on("will-navigate", (event, url) => {
    if (!url.startsWith(`http://localhost:${PORT}`)) {
      event.preventDefault();
    }
  });
});
