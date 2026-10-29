/**
 * Minimal preload for target browser tabs.
 * Forwards hook/interaction messages from page context to main process via IPC.
 * Does NOT expose any electronAPI to the page — keeps the target tab sandboxed.
 */
import { ipcRenderer } from "electron";

window.addEventListener("message", (event) => {
  if (event.data?.type === "ar-hook") {
    ipcRenderer.send("capture:hook-data", event.data);
  }
  if (event.data?.type === "ar-interaction") {
    ipcRenderer.send("capture:hook-data", event.data);
  }
});
