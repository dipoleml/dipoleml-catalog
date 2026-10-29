// What `reply` sends for each file it is given: photo, video, sticker, audio,
// voice note or document. server.ts connects to WhatsApp on import, so the
// extension -> message-content rules live here, where they are testable on
// their own; the reply handler only reads the file and sends the result.

import { basename, extname } from "node:path";
import type { AnyMessageContent } from "@whiskeysockets/baileys";
import type { ChannelProvider } from "./provider";

export const PHOTO_EXTS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);

// Declared mimetype for outbound documents. Android WhatsApp labels and opens an attachment by this
// value, so "application/octet-stream" shows up as an unopenable "BIN" file.
export function mimeForExt(ext: string): string {
  const m: Record<string, string> = {
    ".pdf": "application/pdf",
    ".md": "text/markdown",
    ".txt": "text/plain",
    ".csv": "text/csv",
    ".json": "application/json",
    ".html": "text/html",
    ".zip": "application/zip",
    ".docx":
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xlsx":
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".pptx":
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".mp3": "audio/mpeg",
    ".m4a": "audio/mp4",
    ".ogg": "audio/ogg",
    ".wav": "audio/wav",
  };
  return m[ext.toLowerCase()] ?? "application/octet-stream";
}

// A WhatsApp voice note is Opus in an Ogg container; nothing else plays as
// one. ".ogg" is also used for Vorbis, which would arrive as a voice note
// that never plays, so look at the stream instead of trusting the name: the
// first Ogg page (27-byte header, then a segment table whose length is byte
// 26) carries the codec's identification packet, "OpusHead" for Opus.
export function isOggOpus(media: Buffer): boolean {
  if (media.length < 28 || media.toString("latin1", 0, 4) !== "OggS")
    return false;
  const packet = 27 + media[26];
  return media.toString("latin1", packet, packet + 8) === "OpusHead";
}

export function fileMessage(
  path: string,
  media: Buffer,
  provider: ChannelProvider,
): AnyMessageContent {
  const ext = extname(path).toLowerCase();
  const cloud = provider === "cloud-api";
  if (cloud && ext === ".webp") return { sticker: media };
  if (PHOTO_EXTS.has(ext)) return { image: media };
  if ([".mp4", ".mov", ".avi"].includes(ext))
    return { video: media, ...(cloud ? { mimetype: "video/mp4" } : {}) };
  if (cloud && [".mp3", ".ogg", ".m4a"].includes(ext))
    return { audio: media, mimetype: mimeForExt(ext) };
  // Linked device. `ptt` is what makes it a voice note (push-to-talk, the
  // green play button) rather than an audio file; Baileys fills in the
  // duration itself. MP3/AAC can't be a voice note, so they go as audio.
  if (!cloud && [".ogg", ".opus"].includes(ext) && isOggOpus(media))
    return { audio: media, mimetype: "audio/ogg; codecs=opus", ptt: true };
  if (!cloud && [".mp3", ".m4a"].includes(ext))
    return { audio: media, mimetype: mimeForExt(ext) };
  return {
    document: media,
    fileName: basename(path),
    mimetype:
      cloud && [".md", ".txt", ".csv", ".json", ".html"].includes(ext)
        ? "text/plain"
        : mimeForExt(ext),
  };
}
