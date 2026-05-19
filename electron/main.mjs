import { app, BrowserWindow, shell } from "electron";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { startDebateServer } from "../dist-server/server/app.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

let mainWindow;
let startedServer;

async function createWindow() {
  const staticDir = join(__dirname, "..", "dist");
  startedServer = await startDebateServer({ port: 0, staticDir });

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 700,
    title: "Adversarial Pixel Debate",
    backgroundColor: "#edf0e8",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.removeMenu();
  await mainWindow.loadURL(startedServer.url);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });
}

app.whenReady().then(async () => {
  await createWindow();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on("before-quit", async (event) => {
  if (!startedServer) {
    return;
  }
  event.preventDefault();
  const serverToClose = startedServer;
  startedServer = undefined;
  await serverToClose.close().catch(() => undefined);
  app.quit();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
