import { v4 as uuidv4 } from "uuid";

export function genUuid(): string {
  return uuidv4();
}

export function genUniSeq(prefix: string = ""): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);

  return `${prefix}${randomPart}${timestamp}`;
}

export function getIsoTimestr(): string {
  return new Date().toISOString();
}

export function removeYamlMarkers(text: string): string {
  const cleanedText = text.replace(/^```yaml\s*|\s*```$/g, "");
  return cleanedText;
}

export function parseEventData(data: string) {
  const lines = data.split("\n");
  const dataLine = lines.find((line) => line.startsWith("data:"));

  if (!dataLine) {
    throw new Error("invalid event data: " + data);
  }

  const jsonData = dataLine.replace("data: ", "");
  try {
    const dataObj = JSON.parse(jsonData);

    return dataObj;
  } catch (e) {
    throw e;
  }
}

export const isSmScreen = () => {
  const isNarrowScreen = window.innerWidth < 768;

  return isNarrowScreen;
};

export function genNonceStr(length: number): string {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const charactersLength = characters.length;

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charactersLength);
    result += characters[randomIndex];
  }

  return result;
}

export function bytesToKB(bytes: number): string {
  const kb = bytes / 1024;
  return kb.toFixed(1);
}

export function bytesToMB(bytes: number): string {
  const MB = bytes / 1024 / 1024;
  return MB.toFixed(1);
}

export function upperFirstChar(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function removeUrlSearchParams(originalUrl: string): string {
  if (!originalUrl) {
    return "";
  }

  const url = new URL(originalUrl);

  url.search = "";

  return url.toString();
}
