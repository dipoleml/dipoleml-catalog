// React Theme — extracted from https://figma.com
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
    neutral400: string;
 *   };
 *   fonts: {
    body: string;
    mono: string;
 *   };
 *   fontSizes: {
    '0': string;
    '12': string;
    '16': string;
    '18': string;
    '24': string;
    '44': string;
    '64': string;
 *   };
 *   space: {
    '1': string;
    '16': string;
    '24': string;
    '27': string;
    '40': string;
    '44': string;
    '53': string;
    '60': string;
    '64': string;
    '80': string;
    '107': string;
    '120': string;
    '160': string;
    '409': string;
 *   };
 *   radii: {
    xs: string;
    md: string;
    lg: string;
    full: string;
 *   };
 *   shadows: {
    sm: string;
    xs: string;
    lg: string;
    xl: string;
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
    "primary": "#e4ff97",
    "secondary": "#00b6ff",
    "accent": "#c4baff",
    "background": "#ffffff",
    "foreground": "#000000",
    "neutral50": "#000000",
    "neutral100": "#ffffff",
    "neutral200": "#697485",
    "neutral300": "#e6e6e6",
    "neutral400": "#f3ffe3"
  },
  "fonts": {
    "body": "'figmaSans', sans-serif",
    "mono": "'figmaMono', monospace"
  },
  "fontSizes": {
    "0": "0px",
    "12": "12px",
    "16": "16px",
    "18": "18px",
    "24": "24px",
    "44": "44px",
    "64": "64px"
  },
  "space": {
    "1": "1px",
    "16": "16px",
    "24": "24px",
    "27": "27px",
    "40": "40px",
    "44": "44px",
    "53": "53px",
    "60": "60px",
    "64": "64px",
    "80": "80px",
    "107": "107px",
    "120": "120px",
    "160": "160px",
    "409": "409px"
  },
  "radii": {
    "xs": "2px",
    "md": "8px",
    "lg": "16px",
    "full": "50px"
  },
  "shadows": {
    "sm": "rgb(255, 255, 255) 0px 0px 0px 1px inset",
    "xs": "rgba(0, 0, 0, 0.08) 0px 1px 0px 0px",
    "lg": "rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.05) 0px 4px 6px -2px",
    "xl": "rgba(0, 0, 0, 0.1) 0px 24px 70px 0px"
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
      "main": "#e4ff97",
      "light": "hsl(76, 100%, 95%)",
      "dark": "hsl(76, 100%, 65%)"
    },
    "secondary": {
      "main": "#00b6ff",
      "light": "hsl(197, 100%, 65%)",
      "dark": "hsl(197, 100%, 35%)"
    },
    "background": {
      "default": "#ffffff",
      "paper": "#24cb71"
    },
    "text": {
      "primary": "#000000",
      "secondary": "#ffffff"
    }
  },
  "typography": {
    "h1": {
      "fontSize": "44px",
      "fontWeight": "400",
      "lineHeight": "48.4px"
    },
    "h2": {
      "fontSize": "24px",
      "fontWeight": "320",
      "lineHeight": "32.4px"
    },
    "body1": {
      "fontSize": "16px",
      "fontWeight": "400",
      "lineHeight": "23.2px"
    },
    "body2": {
      "fontSize": "12px",
      "fontWeight": "400",
      "lineHeight": "12px"
    }
  },
  "shape": {
    "borderRadius": 8
  },
  "shadows": [
    "rgb(0, 0, 0) 0px 0px 0px 1px inset",
    "rgb(255, 255, 255) 0px 0px 0px 1px inset",
    "rgba(0, 0, 0, 0.08) 0px 1px 0px 0px",
    "rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.05) 0px 4px 6px -2px",
    "rgba(0, 0, 0, 0.1) 0px 24px 70px 0px"
  ]
};

export default theme;
