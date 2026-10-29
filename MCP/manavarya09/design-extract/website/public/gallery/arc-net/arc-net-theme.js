// React Theme — extracted from https://arc.net
// Compatible with: Chakra UI, Stitches, Vanilla Extract, or any CSS-in-JS

/**
 * TypeScript type definition for this theme:
 *
 * interface Theme {
 *   colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    neutral50: string;
    neutral100: string;
    neutral200: string;
    neutral300: string;
 *   };
 *   fonts: {
    body: string;
    mono: string;
 *   };
 *   fontSizes: {
    '12': string;
    '14': string;
    '16': string;
    '17': string;
    '20': string;
    '24': string;
    '28': string;
    '32': string;
    '36': string;
    '40': string;
    '45.51': string;
    '13.3333': string;
 *   };
 *   space: {
    '2': string;
    '32': string;
    '37': string;
    '48': string;
    '64': string;
    '72': string;
    '80': string;
    '90': string;
    '128': string;
    '150': string;
    '155': string;
    '160': string;
    '383': string;
 *   };
 *   radii: {
    sm: string;
    md: string;
    xl: string;
 *   };
 *   shadows: {
    md: string;
 *   };
 *   states: {
 *     hover: { opacity: number };
 *     focus: { opacity: number };
 *     active: { opacity: number };
 *     disabled: { opacity: number };
 *   };
 * }
 */

export const theme = {
  "colors": {
    "primary": "#2702c2",
    "secondary": "#fffadd",
    "accent": "#3139fb",
    "background": "#fffcec",
    "foreground": "#000000",
    "neutral50": "#000000",
    "neutral100": "#fffcec",
    "neutral200": "#ffffff",
    "neutral300": "#696969"
  },
  "fonts": {
    "body": "'Exposure VAR', sans-serif",
    "mono": "'ABC Favorit Mono', monospace"
  },
  "fontSizes": {
    "12": "12px",
    "14": "14px",
    "16": "16px",
    "17": "17px",
    "20": "20px",
    "24": "24px",
    "28": "28px",
    "32": "32px",
    "36": "36px",
    "40": "40px",
    "45.51": "45.51px",
    "13.3333": "13.3333px"
  },
  "space": {
    "2": "2px",
    "32": "32px",
    "37": "37px",
    "48": "48px",
    "64": "64px",
    "72": "72px",
    "80": "80px",
    "90": "90px",
    "128": "128px",
    "150": "150px",
    "155": "155px",
    "160": "160px",
    "383": "383px"
  },
  "radii": {
    "sm": "4px",
    "md": "8px",
    "xl": "22px"
  },
  "shadows": {
    "md": "rgba(0, 0, 0, 0.1) 0px 5px 5px 0px"
  },
  "states": {
    "hover": {
      "opacity": 0.08
    },
    "focus": {
      "opacity": 0.12
    },
    "active": {
      "opacity": 0.16
    },
    "disabled": {
      "opacity": 0.38
    }
  }
};

// MUI v5 theme
export const muiTheme = {
  "palette": {
    "primary": {
      "main": "#2702c2",
      "light": "hsl(252, 98%, 53%)",
      "dark": "hsl(252, 98%, 23%)"
    },
    "secondary": {
      "main": "#fffadd",
      "light": "hsl(51, 100%, 95%)",
      "dark": "hsl(51, 100%, 78%)"
    },
    "background": {
      "default": "#fffcec",
      "paper": "#3139fb"
    },
    "text": {
      "primary": "#000000",
      "secondary": "#ffffff"
    }
  },
  "typography": {
    "fontFamily": "'Times', sans-serif",
    "h1": {
      "fontSize": "32px",
      "fontWeight": "700",
      "lineHeight": "31.2px"
    },
    "h2": {
      "fontSize": "24px",
      "fontWeight": "400",
      "lineHeight": "28.8px"
    }
  },
  "shape": {
    "borderRadius": 8
  },
  "shadows": [
    "rgba(0, 0, 0, 0.25) 0px 2px 8px 0px",
    "rgba(0, 0, 0, 0.1) 0px 5px 5px 0px"
  ]
};

export default theme;
