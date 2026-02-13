import { app as e, BrowserWindow as i } from "electron";
import t from "path";
process.platform === "win32" && (e.commandLine.appendSwitch("disable-gpu-sandbox"), e.commandLine.appendSwitch("no-sandbox"));
const a = process.env.VITE_DEV_SERVER_URL !== void 0;
let n = null;
function o() {
  n = new i({
    width: 1280,
    height: 720,
    useContentSize: !0,
    webPreferences: {
      nodeIntegration: !0,
      contextIsolation: !1,
      // For simple games, this is often easier. strictly, should be true with preload.
      webSecurity: !1
      // Be careful with this in production apps, but fine for self-contained games
    },
    autoHideMenuBar: !0
    // Hide menu bar on Windows/Linux
  }), a ? n.loadURL(process.env.VITE_DEV_SERVER_URL) : n.loadFile(t.join(__dirname, "../dist/index.html")), n.on("closed", () => {
    n = null;
  });
}
e.whenReady().then(() => {
  o(), e.on("activate", () => {
    i.getAllWindows().length === 0 && o();
  });
});
e.on("window-all-closed", () => {
  process.platform !== "darwin" && e.quit();
});
