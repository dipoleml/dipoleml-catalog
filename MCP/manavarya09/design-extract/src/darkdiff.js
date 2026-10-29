export function diffDarkMode(lightDesign, darkDesign) {
  const changes = [];

  // Color changes
  const lightColors = new Set(lightDesign.colors.all.map(c => c.hex));
  const darkColors = new Set(darkDesign.colors.all.map(c => c.hex));

  const addedInDark = darkDesign.colors.all.filter(c => !lightColors.has(c.hex));
  const removedInDark = lightDesign.colors.all.filter(c => !darkColors.has(c.hex));

  if (addedInDark.length > 0 || removedInDark.length > 0) {
    changes.push({
      category: 'colors',
      light: lightDesign.colors.all.length,
      dark: darkDesign.colors.all.length,
      added: addedInDark.map(c => c.hex),
      removed: removedInDark.map(c => c.hex),
    });
  }

  // CSS variable changes
  const lightVars = flattenVars(lightDesign.variables);
  const darkVars = flattenVars(darkDesign.variables);
  const varChanges = [];

  for (const [key, lightVal] of Object.entries(lightVars)) {
    const darkVal = darkVars[key];
    if (darkVal && darkVal !== lightVal) {
      varChanges.push({ name: key, light: lightVal, dark: darkVal });
    }
  }
  const newDarkVars = Object.entries(darkVars)
    .filter(([key]) => !lightVars[key])
    .map(([name, dark]) => ({ name, light: null, dark }));

  if (varChanges.length > 0 || newDarkVars.length > 0) {
    changes.push({
      category: 'cssVariables',
      changed: varChanges,
      newInDark: newDarkVars,
    });
  }

  return {
    hasChanges: changes.length > 0,
    changes,
    summary: {
      colorsChanged: (addedInDark.length + removedInDark.length) || 0,
      variablesChanged: varChanges.length,
      newDarkVariables: newDarkVars.length,
    },
  };
}

function flattenVars(variables) {
  const flat = {};
  for (const [, group] of Object.entries(variables)) {
    if (typeof group === 'object') {
      for (const [key, val] of Object.entries(group)) {
        flat[key] = val;
      }
    }
  }
  return flat;
}
