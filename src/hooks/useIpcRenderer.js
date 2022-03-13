import { useEffect } from "react";

const { ipcRenderer } = window.require("electron");

// 传入对象结构
// event: eventCB
const useIpcRenderer = (keyCallbackMap) => {
  useEffect(() => {
    Object.keys(keyCallbackMap).forEach((key) => {
      ipcRenderer.on(key, keyCallbackMap[key]);
    });
    return () => {
      Object.keys(keyCallbackMap).forEach((key) => {
        ipcRenderer.removeListener(key, keyCallbackMap[key]);
      });
    };
  });
};

export default useIpcRenderer;
