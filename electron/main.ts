import { app, BrowserWindow } from 'electron';
import path from 'path';

// Error handling for Windows overlays
if (process.platform === 'win32') {
    app.commandLine.appendSwitch('disable-gpu-sandbox');
    app.commandLine.appendSwitch('no-sandbox');
}

// Check if we are in development mode
const isDev = process.env.VITE_DEV_SERVER_URL !== undefined;

let mainWindow: BrowserWindow | null = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        useContentSize: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false, // For simple games, this is often easier. strictly, should be true with preload.
            webSecurity: false, // Be careful with this in production apps, but fine for self-contained games
        },
        autoHideMenuBar: true, // Hide menu bar on Windows/Linux
    });

    if (isDev) {
        // Load from Vite dev server
        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL as string);
        // mainWindow.webContents.openDevTools();
    } else {
        // Load from built assets
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
