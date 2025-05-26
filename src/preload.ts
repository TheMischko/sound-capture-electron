import {contextBridge, ipcRenderer} from "electron";

const setupAudioCapture = (callback: (constrains: any) => void) => {
  ipcRenderer.on("setup-audio-capture", (_, constraints) => {
    callback(constraints);
  })
}

const api = {
  setupAudioCapture
};

declare global {
  interface Window {
    API: typeof api;
  }
}

contextBridge.exposeInMainWorld("API", api);