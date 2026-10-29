/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    extend: {
    colors: {
        primary: {
            '50': 'hsl(252, 98%, 97%)',
            '100': 'hsl(252, 98%, 94%)',
            '200': 'hsl(252, 98%, 86%)',
            '300': 'hsl(252, 98%, 76%)',
            '400': 'hsl(252, 98%, 64%)',
            '500': 'hsl(252, 98%, 50%)',
            '600': 'hsl(252, 98%, 40%)',
            '700': 'hsl(252, 98%, 32%)',
            '800': 'hsl(252, 98%, 24%)',
            '900': 'hsl(252, 98%, 16%)',
            '950': 'hsl(252, 98%, 10%)',
            DEFAULT: '#2702c2'
        },
        secondary: {
            '50': 'hsl(51, 100%, 97%)',
            '100': 'hsl(51, 100%, 94%)',
            '200': 'hsl(51, 100%, 86%)',
            '300': 'hsl(51, 100%, 76%)',
            '400': 'hsl(51, 100%, 64%)',
            '500': 'hsl(51, 100%, 50%)',
            '600': 'hsl(51, 100%, 40%)',
            '700': 'hsl(51, 100%, 32%)',
            '800': 'hsl(51, 100%, 24%)',
            '900': 'hsl(51, 100%, 16%)',
            '950': 'hsl(51, 100%, 10%)',
            DEFAULT: '#fffadd'
        },
        accent: {
            '50': 'hsl(238, 96%, 97%)',
            '100': 'hsl(238, 96%, 94%)',
            '200': 'hsl(238, 96%, 86%)',
            '300': 'hsl(238, 96%, 76%)',
            '400': 'hsl(238, 96%, 64%)',
            '500': 'hsl(238, 96%, 50%)',
            '600': 'hsl(238, 96%, 40%)',
            '700': 'hsl(238, 96%, 32%)',
            '800': 'hsl(238, 96%, 24%)',
            '900': 'hsl(238, 96%, 16%)',
            '950': 'hsl(238, 96%, 10%)',
            DEFAULT: '#3139fb'
        },
        'neutral-50': '#000000',
        'neutral-100': '#fffcec',
        'neutral-200': '#ffffff',
        'neutral-300': '#696969',
        background: '#fffcec',
        foreground: '#000000'
    },
    fontFamily: {
        sans: [
            'Marlin',
            'sans-serif'
        ],
        heading: [
            'Marlin Soft SQ',
            'sans-serif'
        ],
        body: [
            'Exposure VAR',
            'sans-serif'
        ]
    },
    fontSize: {
        '12': [
            '12px',
            {
                lineHeight: 'normal',
                letterSpacing: '1.8px'
            }
        ],
        '14': [
            '14px',
            {
                lineHeight: 'normal',
                letterSpacing: '-0.28px'
            }
        ],
        '16': [
            '16px',
            {
                lineHeight: 'normal'
            }
        ],
        '17': [
            '17px',
            {
                lineHeight: '25.5px'
            }
        ],
        '20': [
            '20px',
            {
                lineHeight: '24px'
            }
        ],
        '24': [
            '24px',
            {
                lineHeight: '28.8px'
            }
        ],
        '28': [
            '28px',
            {
                lineHeight: '30px',
                letterSpacing: '-1.4px'
            }
        ],
        '32': [
            '32px',
            {
                lineHeight: '31.2px',
                letterSpacing: '-1.6px'
            }
        ],
        '36': [
            '36px',
            {
                lineHeight: '36px',
                letterSpacing: '-0.72px'
            }
        ],
        '40': [
            '40px',
            {
                lineHeight: '39px',
                letterSpacing: '-1.6px'
            }
        ],
        '45.51': [
            '45.51px',
            {
                lineHeight: '42.25px',
                letterSpacing: '-1.8204px'
            }
        ],
        '13.3333': [
            '13.3333px',
            {
                lineHeight: 'normal'
            }
        ]
    },
    spacing: {
        '1': '2px',
        '16': '32px',
        '24': '48px',
        '32': '64px',
        '36': '72px',
        '40': '80px',
        '45': '90px',
        '64': '128px',
        '75': '150px',
        '80': '160px',
        '37px': '37px',
        '155px': '155px',
        '383px': '383px'
    },
    borderRadius: {
        sm: '4px',
        md: '8px',
        xl: '22px'
    },
    boxShadow: {
        md: 'rgba(0, 0, 0, 0.1) 0px 5px 5px 0px'
    },
    transitionDuration: {
        '100': '0.1s',
        '150': '0.15s',
        '200': '0.2s'
    },
    transitionTimingFunction: {
        default: 'ease'
    },
    container: {
        center: true,
        padding: '32px'
    },
    maxWidth: {
        container: '1344px'
    }
},
  },
};
