import {contextBridge, ipcRenderer} from "electron";
import {AddressInfo} from "ws";

const setupAudioCapture = (callback: (constrains: any) => void) => {
  ipcRenderer.on("setup-audio-capture", (_, constraints) => {
    callback(constraints);
  })
}

const getWebSocketAddress = (): Promise<AddressInfo> => {
  return ipcRenderer.invoke('get-websocket')
}

const api = {
  setupAudioCapture,
  getWebSocketAddress
};

declare global {
  interface Window {
    API: typeof api;
  }
}

contextBridge.exposeInMainWorld("API", api);