/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    extend: {
    colors: {
        primary: {
            '50': 'hsl(76, 100%, 97%)',
            '100': 'hsl(76, 100%, 94%)',
            '200': 'hsl(76, 100%, 86%)',
            '300': 'hsl(76, 100%, 76%)',
            '400': 'hsl(76, 100%, 64%)',
            '500': 'hsl(76, 100%, 50%)',
            '600': 'hsl(76, 100%, 40%)',
            '700': 'hsl(76, 100%, 32%)',
            '800': 'hsl(76, 100%, 24%)',
            '900': 'hsl(76, 100%, 16%)',
            '950': 'hsl(76, 100%, 10%)',
            DEFAULT: '#e4ff97'
        },
        secondary: {
            '50': 'hsl(197, 100%, 97%)',
            '100': 'hsl(197, 100%, 94%)',
            '200': 'hsl(197, 100%, 86%)',
            '300': 'hsl(197, 100%, 76%)',
            '400': 'hsl(197, 100%, 64%)',
            '500': 'hsl(197, 100%, 50%)',
            '600': 'hsl(197, 100%, 40%)',
            '700': 'hsl(197, 100%, 32%)',
            '800': 'hsl(197, 100%, 24%)',
            '900': 'hsl(197, 100%, 16%)',
            '950': 'hsl(197, 100%, 10%)',
            DEFAULT: '#00b6ff'
        },
        accent: {
            '50': 'hsl(249, 100%, 97%)',
            '100': 'hsl(249, 100%, 94%)',
            '200': 'hsl(249, 100%, 86%)',
            '300': 'hsl(249, 100%, 76%)',
            '400': 'hsl(249, 100%, 64%)',
            '500': 'hsl(249, 100%, 50%)',
            '600': 'hsl(249, 100%, 40%)',
            '700': 'hsl(249, 100%, 32%)',
            '800': 'hsl(249, 100%, 24%)',
            '900': 'hsl(249, 100%, 16%)',
            '950': 'hsl(249, 100%, 10%)',
            DEFAULT: '#c4baff'
        },
        'neutral-50': '#000000',
        'neutral-100': '#ffffff',
        'neutral-200': '#697485',
        'neutral-300': '#e6e6e6',
        'neutral-400': '#f3ffe3',
        background: '#ffffff',
        foreground: '#000000'
    },
    fontFamily: {
        sans: [
            'figmaSans',
            'sans-serif'
        ],
        mono: [
            'figmaMono',
            'sans-serif'
        ]
    },
    fontSize: {
        '0': [
            '0px',
            {
                lineHeight: '0px'
            }
        ],
        '12': [
            '12px',
            {
                lineHeight: '12px',
                letterSpacing: '0.6px'
            }
        ],
        '16': [
            '16px',
            {
                lineHeight: '23.2px'
            }
        ],
        '18': [
            '18px',
            {
                lineHeight: '25.2px'
            }
        ],
        '24': [
            '24px',
            {
                lineHeight: '32.4px',
                letterSpacing: '-0.12px'
            }
        ],
        '44': [
            '44px',
            {
                lineHeight: '48.4px',
                letterSpacing: '-0.44px'
            }
        ],
        '64': [
            '64px',
            {
                lineHeight: '70.4px',
                letterSpacing: '-0.64px'
            }
        ]
    },
    spacing: {
        '4': '16px',
        '6': '24px',
        '10': '40px',
        '11': '44px',
        '15': '60px',
        '16': '64px',
        '20': '80px',
        '30': '120px',
        '40': '160px',
        '1px': '1px',
        '27px': '27px',
        '53px': '53px',
        '107px': '107px',
        '409px': '409px'
    },
    borderRadius: {
        xs: '2px',
        md: '8px',
        lg: '16px',
        full: '50px'
    },
    boxShadow: {
        sm: 'rgb(255, 255, 255) 0px 0px 0px 1px inset',
        xs: 'rgba(0, 0, 0, 0.08) 0px 1px 0px 0px',
        lg: 'rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.05) 0px 4px 6px -2px',
        xl: 'rgba(0, 0, 0, 0.1) 0px 24px 70px 0px'
    },
    screens: {
        '560px': '560px',
        md: '768px',
        lg: '960px',
        xl: '1280px',
        '1400px': '1400px',
        '1440px': '1440px',
        '1920px': '1920px'
    },
    transitionDuration: {
        '100': '0.1s',
        '150': '0.15s',
        '160': '0.16s',
        '200': '0.2s',
        '250': '0.25s',
        '300': '0.3s',
        '350': '0.35s',
        '400': '0.4s',
        '500': '0.5s',
        '800': '0.8s',
        '2000': '2s'
    },
    transitionTimingFunction: {
        default: 'ease',
        custom: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
    },
    container: {
        center: true,
        padding: '0px'
    },
    maxWidth: {
        container: '2200px'
    }
},
  },
};
