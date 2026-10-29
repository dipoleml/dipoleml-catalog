/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    extend: {
    colors: {
        primary: {
            '50': 'hsl(230, 62%, 97%)',
            '100': 'hsl(230, 62%, 94%)',
            '200': 'hsl(230, 62%, 86%)',
            '300': 'hsl(230, 62%, 76%)',
            '400': 'hsl(230, 62%, 64%)',
            '500': 'hsl(230, 62%, 50%)',
            '600': 'hsl(230, 62%, 40%)',
            '700': 'hsl(230, 62%, 32%)',
            '800': 'hsl(230, 62%, 24%)',
            '900': 'hsl(230, 62%, 16%)',
            '950': 'hsl(230, 62%, 10%)',
            DEFAULT: '#455dd3'
        },
        secondary: {
            '50': 'hsl(208, 100%, 97%)',
            '100': 'hsl(208, 100%, 94%)',
            '200': 'hsl(208, 100%, 86%)',
            '300': 'hsl(208, 100%, 76%)',
            '400': 'hsl(208, 100%, 64%)',
            '500': 'hsl(208, 100%, 50%)',
            '600': 'hsl(208, 100%, 40%)',
            '700': 'hsl(208, 100%, 32%)',
            '800': 'hsl(208, 100%, 24%)',
            '900': 'hsl(208, 100%, 16%)',
            '950': 'hsl(208, 100%, 10%)',
            DEFAULT: '#0075de'
        },
        accent: {
            '50': 'hsl(230, 60%, 97%)',
            '100': 'hsl(230, 60%, 94%)',
            '200': 'hsl(230, 60%, 86%)',
            '300': 'hsl(230, 60%, 76%)',
            '400': 'hsl(230, 60%, 64%)',
            '500': 'hsl(230, 60%, 50%)',
            '600': 'hsl(230, 60%, 40%)',
            '700': 'hsl(230, 60%, 32%)',
            '800': 'hsl(230, 60%, 24%)',
            '900': 'hsl(230, 60%, 16%)',
            '950': 'hsl(230, 60%, 10%)',
            DEFAULT: '#213183'
        },
        'neutral-50': '#000000',
        'neutral-100': '#f6f5f4',
        'neutral-200': '#a39e98',
        'neutral-300': '#ffffff',
        'neutral-400': '#615d59',
        'neutral-500': '#78736f',
        'neutral-600': '#191918',
        'neutral-700': '#c0c0c0',
        'neutral-800': '#dddddd',
        background: '#ffffff',
        foreground: '#000000'
    },
    fontFamily: {
        sans: [
            'NotionInter',
            'sans-serif'
        ],
        body: [
            'Lyon Text',
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
                lineHeight: '16px',
                letterSpacing: '0.125px'
            }
        ],
        '14': [
            '14px',
            {
                lineHeight: '20px'
            }
        ],
        '15': [
            '15px',
            {
                lineHeight: '20px'
            }
        ],
        '16': [
            '16px',
            {
                lineHeight: '24px'
            }
        ],
        '20': [
            '20px',
            {
                lineHeight: '20px'
            }
        ],
        '22': [
            '22px',
            {
                lineHeight: '28px',
                letterSpacing: '-0.25px'
            }
        ],
        '24': [
            '24px',
            {
                lineHeight: '20px'
            }
        ],
        '26': [
            '26px',
            {
                lineHeight: '32px',
                letterSpacing: '-0.625px'
            }
        ],
        '32': [
            '32px',
            {
                lineHeight: '40px'
            }
        ],
        '40': [
            '40px',
            {
                lineHeight: '60px'
            }
        ],
        '42': [
            '42px',
            {
                lineHeight: '48px',
                letterSpacing: '-1.5px'
            }
        ],
        '48': [
            '48px',
            {
                lineHeight: '72px'
            }
        ],
        '54': [
            '54px',
            {
                lineHeight: '56px',
                letterSpacing: '-1.875px'
            }
        ],
        '64': [
            '64px',
            {
                lineHeight: '64px',
                letterSpacing: '-2.125px'
            }
        ]
    },
    spacing: {
        '1': '2px',
        '10': '20px',
        '12': '24px',
        '14': '28px',
        '16': '32px',
        '20': '40px',
        '22': '44px',
        '24': '48px',
        '28': '56px',
        '30': '60px',
        '32': '64px',
        '39': '78px',
        '93': '186px',
        '158': '316px',
        '93px': '93px',
        '125px': '125px',
        '167px': '167px',
        '177px': '177px',
        '225px': '225px'
    },
    borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '16px',
        full: '9999px'
    },
    boxShadow: {
        xs: 'rgba(0, 0, 0, 0.016) 0px 0.7px 1.462px 0px, rgba(0, 0, 0, 0.03) 0px 3px 9px 0px',
        sm: 'rgba(0, 0, 0, 0.01) 0px 0.667px 3.502px 0px, rgba(0, 0, 0, 0.016) 0px 2.933px 7.252px 0px, rgba(0, 0, 0, 0.02) 0px 7.2px 14.462px 0px, rgba(0, 0, 0, 0.024) 0px 13.867px 28.348px 0px, rgba(0, 0, 0, 0.03) 0px 23.333px 52.123px 0px, rgba(0, 0, 0, 0.04) 0px 36px 89px 0px',
        lg: 'rgba(0, 0, 0, 0.04) 0px 4px 18px 0px, rgba(0, 0, 0, 0.027) 0px 2.025px 7.84688px 0px, rgba(0, 0, 0, 0.02) 0px 0.8px 2.925px 0px, rgba(0, 0, 0, 0.01) 0px 0.175px 1.04062px 0px'
    },
    screens: {
        xs: '375px',
        '400px': '400px',
        sm: '440px',
        md: '768px',
        '840px': '840px',
        '908px': '908px',
        '942px': '942px',
        lg: '1080px',
        '1120px': '1120px',
        '1156px': '1156px',
        '1200px': '1200px',
        xl: '1300px',
        '1440px': '1440px',
        '1800px': '1800px',
        '1900px': '1900px'
    },
    transitionDuration: {
        '75': '0.075s',
        '100': '0.1s',
        '150': '0.15s',
        '200': '0.2s'
    },
    transitionTimingFunction: {
        default: 'ease',
        linear: 'linear',
        custom: 'cubic-bezier(0.645, 0.045, 0.355, 1)'
    },
    container: {
        center: true,
        padding: '16px'
    },
    maxWidth: {
        container: '826px'
    }
},
  },
};
