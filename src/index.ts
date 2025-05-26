import { app, BrowserWindow, ipcMain,IpcMainEvent, WebContentsView, desktopCapturer } from "electron";
import * as path from "node:path";

const indexHTML = path.join(__dirname, "index.html");

async function setupAudioCapture(window: BrowserWindow, captureTab: WebContentsView, youtubeTab: WebContentsView){
  try {
    const sourceId = youtubeTab.webContents.getMediaSourceId(captureTab.webContents);

    captureTab.webContents.send("setup-audio-capture", {
      chromeMediaSource: 'tab',
      chromeMediaSourceId: sourceId,
    } as MediaTrackConstraints)
  } catch (e) {
    console.error('Audio capture failed:', e);
  }
}

app.on("ready", async () => {
  const win = new BrowserWindow({
    width: 1640,
    height: 720,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      devTools: true,
      contextIsolation: true,
    }
  });

  const captureTab = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
    }
  });

  const youtubeTab = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
    }
  })
  youtubeTab.webContents.setAudioMuted(true);

  win.contentView.addChildView(youtubeTab);
  youtubeTab.webContents.openDevTools();
  await youtubeTab.webContents.loadURL("https://youtube.com/");
  youtubeTab.setBounds({ x: 820, y: 0, width: 820, height: 720 });

  win.contentView.addChildView(captureTab);
  captureTab.webContents.openDevTools();
  await captureTab.webContents.loadURL(indexHTML);
  captureTab.setBounds({ x: 0, y: 0, width: 820, height: 720 })

  await setupAudioCapture(win, captureTab, youtubeTab);
})