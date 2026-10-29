import { describe, expect, test } from "bun:test";
import { fileMessage, isOggOpus, mimeForExt } from "./outbound-media";

// The first Ogg page of a stream: "OggS", 22 bytes of header fields, the
// segment count, the segment table, then the codec's identification packet.
function oggFirstPage(packet: string): Buffer {
  const body = Buffer.from(packet, "latin1");
  return Buffer.concat([
    Buffer.from("OggS", "latin1"),
    Buffer.alloc(22),
    Buffer.from([1, body.length]),
    body,
  ]);
}

const opus = oggFirstPage("OpusHead\x01\x01\x38\x01\x80\xbb\0\0\0\0\0");
const vorbis = oggFirstPage("\x01vorbis\0\0\0\0\x01\x44\xac\0\0");
const bytes = Buffer.from("fixture");

describe("isOggOpus", () => {
  test("an Ogg stream whose first packet is OpusHead is Opus", () => {
    expect(isOggOpus(opus)).toBe(true);
  });

  test("Ogg Vorbis is not", () => {
    expect(isOggOpus(vorbis)).toBe(false);
  });

  test("not Ogg at all, or too short to tell, is not", () => {
    expect(isOggOpus(Buffer.from("ID3\x04\0\0\0\0\0\0OpusHead"))).toBe(false);
    expect(isOggOpus(Buffer.from("OggS"))).toBe(false);
    expect(isOggOpus(Buffer.alloc(0))).toBe(false);
  });
});

describe("fileMessage on linked device", () => {
  test("Ogg Opus goes out as a voice note, not a document", () => {
    expect(fileMessage("/tmp/note.ogg", opus, "baileys")).toEqual({
      audio: opus,
      mimetype: "audio/ogg; codecs=opus",
      ptt: true,
    });
  });

  test(".opus and an upper-case extension are voice notes too", () => {
    expect(fileMessage("/tmp/note.opus", opus, "baileys")).toMatchObject({
      ptt: true,
    });
    expect(fileMessage("/tmp/NOTE.OGG", opus, "baileys")).toMatchObject({
      ptt: true,
    });
  });

  // A voice note has to be Opus; Vorbis would arrive as one that never plays.
  test("an .ogg holding Vorbis stays a document", () => {
    expect(fileMessage("/tmp/song.ogg", vorbis, "baileys")).toEqual({
      document: vorbis,
      fileName: "song.ogg",
      mimetype: "audio/ogg",
    });
  });

  test(".mp3 and .m4a go out as playable audio, not as voice notes", () => {
    expect(fileMessage("/tmp/a.mp3", bytes, "baileys")).toEqual({
      audio: bytes,
      mimetype: "audio/mpeg",
    });
    expect(fileMessage("/tmp/a.m4a", bytes, "baileys")).toEqual({
      audio: bytes,
      mimetype: "audio/mp4",
    });
  });

  test(".wav is still a document", () => {
    expect(fileMessage("/tmp/a.wav", bytes, "baileys")).toEqual({
      document: bytes,
      fileName: "a.wav",
      mimetype: "audio/wav",
    });
  });

  test("photos, videos and documents are unchanged", () => {
    expect(fileMessage("/tmp/a.PNG", bytes, "baileys")).toEqual({
      image: bytes,
    });
    expect(fileMessage("/tmp/a.webp", bytes, "baileys")).toEqual({
      image: bytes,
    });
    expect(fileMessage("/tmp/a.mp4", bytes, "baileys")).toEqual({
      video: bytes,
    });
    expect(fileMessage("/tmp/report.pdf", bytes, "baileys")).toEqual({
      document: bytes,
      fileName: "report.pdf",
      mimetype: "application/pdf",
    });
    expect(fileMessage("/tmp/notes.md", bytes, "baileys")).toEqual({
      document: bytes,
      fileName: "notes.md",
      mimetype: "text/markdown",
    });
  });
});

describe("fileMessage on Cloud API (unchanged)", () => {
  test("audio is plain audio, never a voice note", () => {
    expect(fileMessage("/tmp/note.ogg", opus, "cloud-api")).toEqual({
      audio: opus,
      mimetype: "audio/ogg",
    });
    expect(fileMessage("/tmp/a.mp3", bytes, "cloud-api")).toEqual({
      audio: bytes,
      mimetype: "audio/mpeg",
    });
  });

  test(".opus is a document", () => {
    expect(fileMessage("/tmp/note.opus", opus, "cloud-api")).toEqual({
      document: opus,
      fileName: "note.opus",
      mimetype: "application/octet-stream",
    });
  });

  test("webp is a sticker, video declares mp4, text documents are text/plain", () => {
    expect(fileMessage("/tmp/a.webp", bytes, "cloud-api")).toEqual({
      sticker: bytes,
    });
    expect(fileMessage("/tmp/a.mov", bytes, "cloud-api")).toEqual({
      video: bytes,
      mimetype: "video/mp4",
    });
    expect(fileMessage("/tmp/notes.md", bytes, "cloud-api")).toEqual({
      document: bytes,
      fileName: "notes.md",
      mimetype: "text/plain",
    });
  });
});

describe("mimeForExt", () => {
  test("is case-insensitive and falls back to octet-stream", () => {
    expect(mimeForExt(".PDF")).toBe("application/pdf");
    expect(mimeForExt(".xyz")).toBe("application/octet-stream");
  });
});
