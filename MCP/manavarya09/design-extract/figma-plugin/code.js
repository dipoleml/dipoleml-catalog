// designlang Figma plugin — imports a `*-figma-variables.json` payload
// (produced by `designlang <url>`) into Figma Variables.
//
// Payload shape (compatible with src/formatters/figma.js):
//   { collections: [{ name, modes: [{ name, variables: [{ name, type, value }] }] }] }
// — or any superset. Unknown keys are ignored.

figma.showUI(__html__, { width: 420, height: 440, themeColors: true });

figma.ui.onmessage = async (msg) => {
  if (msg.type === "cancel") {
    figma.closePlugin();
    return;
  }
  if (msg.type !== "import") return;

  try {
    const data = msg.data;
    const collections = Array.isArray(data?.collections) ? data.collections : [];
    if (collections.length === 0) throw new Error("No `collections` array found in payload.");

    let varCount = 0;
    let colCount = 0;

    for (const c of collections) {
      const collection = figma.variables.createVariableCollection(c.name || "designlang");
      colCount++;
      const modes = Array.isArray(c.modes) && c.modes.length > 0 ? c.modes : [{ name: "Default", variables: c.variables || [] }];

      // First mode: rename the default one Figma auto-creates.
      const primaryMode = modes[0];
      collection.renameMode(collection.modes[0].modeId, primaryMode.name || "Default");

      const modeIds = [collection.modes[0].modeId];
      for (let i = 1; i < modes.length; i++) {
        modeIds.push(collection.addMode(modes[i].name || `Mode ${i + 1}`));
      }

      // Create variables from the first mode, then layer in subsequent modes.
      const byName = new Map();
      for (let m = 0; m < modes.length; m++) {
        const mode = modes[m];
        const vars = Array.isArray(mode.variables) ? mode.variables : [];
        for (const v of vars) {
          if (!v || !v.name) continue;
          let variable = byName.get(v.name);
          if (!variable) {
            const type = figmaVarType(v.type);
            variable = figma.variables.createVariable(v.name, collection, type);
            byName.set(v.name, variable);
            varCount++;
          }
          const value = coerceValue(v.type, v.value);
          if (value !== undefined) variable.setValueForMode(modeIds[m], value);
        }
      }
    }

    figma.ui.postMessage({ type: "done", variableCount: varCount, collectionCount: colCount });
    figma.notify(`designlang: imported ${varCount} variables across ${colCount} collections.`);
  } catch (err) {
    figma.ui.postMessage({ type: "error", message: err.message });
  }
};

function figmaVarType(t) {
  switch ((t || "").toLowerCase()) {
    case "color":    return "COLOR";
    case "number":
    case "float":
    case "size":
    case "spacing":
    case "radius":   return "FLOAT";
    case "string":
    case "fontfamily": return "STRING";
    case "boolean": return "BOOLEAN";
    default: return "STRING";
  }
}

function coerceValue(type, v) {
  if (v === undefined || v === null) return undefined;
  const t = (type || "").toLowerCase();
  if (t === "color") {
    if (typeof v === "string") return hexToFigmaColor(v);
    if (typeof v === "object" && "r" in v) {
      return {
        r: normChan(v.r),
        g: normChan(v.g),
        b: normChan(v.b),
        a: typeof v.a === "number" ? (v.a > 1 ? v.a / 255 : v.a) : 1,
      };
    }
  }
  if (t === "number" || t === "float" || t === "size" || t === "spacing" || t === "radius") {
    const n = typeof v === "string" ? parseFloat(v) : v;
    return typeof n === "number" && !Number.isNaN(n) ? n : undefined;
  }
  if (t === "boolean") return Boolean(v);
  return String(v);
}

function normChan(c) {
  if (typeof c !== "number") return 0;
  return c > 1 ? c / 255 : c;
}

function hexToFigmaColor(hex) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((x) => x + x).join("") : h;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const a = full.length === 8 ? parseInt(full.slice(6, 8), 16) / 255 : 1;
  return { r, g, b, a };
}
