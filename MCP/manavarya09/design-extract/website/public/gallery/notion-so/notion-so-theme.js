// React Theme — extracted from https://notion.so
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
    neutral500: string;
    neutral600: string;
    neutral700: string;
    neutral800: string;
 *   };
 *   fonts: {
    body: string;
 *   };
 *   fontSizes: {
    '15': string;
    '16': string;
    '20': string;
    '22': string;
    '24': string;
    '26': string;
    '32': string;
    '40': string;
    '42': string;
    '48': string;
    '54': string;
    '64': string;
 *   };
 *   space: {
    '2': string;
    '20': string;
    '24': string;
    '28': string;
    '32': string;
    '40': string;
    '44': string;
    '48': string;
    '56': string;
    '60': string;
    '64': string;
    '78': string;
    '93': string;
    '125': string;
    '167': string;
    '177': string;
 *   };
 *   radii: {
    sm: string;
    md: string;
    lg: string;
    full: string;
 *   };
 *   shadows: {
    xs: string;
    sm: string;
    lg: string;
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
    "primary": "#455dd3",
    "secondary": "#0075de",
    "accent": "#213183",
    "background": "#ffffff",
    "foreground": "#000000",
    "neutral50": "#000000",
    "neutral100": "#f6f5f4",
    "neutral200": "#a39e98",
    "neutral300": "#ffffff",
    "neutral400": "#615d59",
    "neutral500": "#78736f",
    "neutral600": "#191918",
    "neutral700": "#c0c0c0",
    "neutral800": "#dddddd"
  },
  "fonts": {
    "body": "'Lyon Text', sans-serif"
  },
  "fontSizes": {
    "15": "15px",
    "16": "16px",
    "20": "20px",
    "22": "22px",
    "24": "24px",
    "26": "26px",
    "32": "32px",
    "40": "40px",
    "42": "42px",
    "48": "48px",
    "54": "54px",
    "64": "64px"
  },
  "space": {
    "2": "2px",
    "20": "20px",
    "24": "24px",
    "28": "28px",
    "32": "32px",
    "40": "40px",
    "44": "44px",
    "48": "48px",
    "56": "56px",
    "60": "60px",
    "64": "64px",
    "78": "78px",
    "93": "93px",
    "125": "125px",
    "167": "167px",
    "177": "177px"
  },
  "radii": {
    "sm": "4px",
    "md": "8px",
    "lg": "16px",
    "full": "9999px"
  },
  "shadows": {
    "xs": "rgba(0, 0, 0, 0.016) 0px 0.7px 1.462px 0px, rgba(0, 0, 0, 0.03) 0px 3px 9px 0px",
    "sm": "rgba(0, 0, 0, 0.01) 0px 0.667px 3.502px 0px, rgba(0, 0, 0, 0.016) 0px 2.933px 7.252px 0px, rgba(0, 0, 0, 0.02) 0px 7.2px 14.462px 0px, rgba(0, 0, 0, 0.024) 0px 13.867px 28.348px 0px, rgba(0, 0, 0, 0.03) 0px 23.333px 52.123px 0px, rgba(0, 0, 0, 0.04) 0px 36px 89px 0px",
    "lg": "rgba(0, 0, 0, 0.04) 0px 4px 18px 0px, rgba(0, 0, 0, 0.027) 0px 2.025px 7.84688px 0px, rgba(0, 0, 0, 0.02) 0px 0.8px 2.925px 0px, rgba(0, 0, 0, 0.01) 0px 0.175px 1.04062px 0px"
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
      "main": "#455dd3",
      "light": "hsl(230, 62%, 70%)",
      "dark": "hsl(230, 62%, 40%)"
    },
    "secondary": {
      "main": "#0075de",
      "light": "hsl(208, 100%, 59%)",
      "dark": "hsl(208, 100%, 29%)"
    },
    "background": {
      "default": "#ffffff",
      "paper": "#191918"
    },
    "text": {
      "primary": "#000000",
      "secondary": "#f6f5f4"
    }
  },
  "typography": {
    "fontFamily": "'Times', sans-serif",
    "h1": {
      "fontSize": "32px",
      "fontWeight": "400",
      "lineHeight": "40px"
    }
  },
  "shape": {
    "borderRadius": 8
  },
  "shadows": [
    "rgba(0, 0, 0, 0) 0px 1px 0px 0px",
    "rgba(0, 0, 0, 0.01) 0px 0.175px 1.041px 0px, rgba(0, 0, 0, 0.02) 0px 0.8px 2.925px 0px, rgba(0, 0, 0, 0.027) 0px 2.025px 7.847px 0px, rgba(0, 0, 0, 0.04) 0px 4px 18px 0px",
    "rgba(0, 0, 0, 0.016) 0px 0.7px 1.462px 0px, rgba(0, 0, 0, 0.03) 0px 3px 9px 0px",
    "rgba(0, 0, 0, 0.01) 0px 1px 3px 0px, rgba(0, 0, 0, 0.02) 0px 3px 7px 0px, rgba(0, 0, 0, 0.02) 0px 7px 15px 0px, rgba(0, 0, 0, 0.04) 0px 14px 28px 0px, rgba(0, 0, 0, 0.05) 0px 23px 52px 0px",
    "rgba(0, 0, 0, 0.01) 0px 0.667px 3.502px 0px, rgba(0, 0, 0, 0.016) 0px 2.933px 7.252px 0px, rgba(0, 0, 0, 0.02) 0px 7.2px 14.462px 0px, rgba(0, 0, 0, 0.024) 0px 13.867px 28.348px 0px, rgba(0, 0, 0, 0.03) 0px 23.333px 52.123px 0px, rgba(0, 0, 0, 0.04) 0px 36px 89px 0px"
  ]
};

export default theme;
