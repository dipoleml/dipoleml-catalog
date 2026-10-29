/**
 * Preset device configurations for fingerprint generation.
 * Each preset is a logically consistent combination of platform, screen, GPU, etc.
 */

export interface DevicePreset {
  platform: string;
  oscpu: string;
  screens: [number, number][];
  dprs: number[];
  webglVendors: string[];
  webglRenderers: string[];
  hardwareConcurrencies: number[];
  deviceMemories: number[];
  colorDepth: number;
}

/** Chrome version whitelist — 5 most recent stable versions */
export const CHROME_VERSIONS = [
  '131.0.0.0',
  '130.0.0.0',
  '129.0.0.0',
  '128.0.0.0',
  '127.0.0.0',
] as const;

export const WINDOWS_PRESETS: DevicePreset[] = [
  {
    platform: 'Win32',
    oscpu: 'Windows NT 10.0; Win64; x64',
    screens: [[1920, 1080], [2560, 1440], [1366, 768], [1536, 864]],
    dprs: [1, 1.25, 1.5],
    webglVendors: ['Google Inc. (NVIDIA)'],
    webglRenderers: [
      'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)',
      'ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 SUPER Direct3D11 vs_5_0 ps_5_0, D3D11)',
      'ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    ],
    hardwareConcurrencies: [4, 8, 12, 16],
    deviceMemories: [8, 16, 32],
    colorDepth: 24,
  },
  {
    platform: 'Win32',
    oscpu: 'Windows NT 10.0; Win64; x64',
    screens: [[1920, 1080], [2560, 1440]],
    dprs: [1, 1.25],
    webglVendors: ['Google Inc. (Intel)'],
    webglRenderers: [
      'ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0, D3D11)',
      'ANGLE (Intel, Intel(R) UHD Graphics 770 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    ],
    hardwareConcurrencies: [4, 8, 12],
    deviceMemories: [8, 16],
    colorDepth: 24,
  },
  {
    platform: 'Win32',
    oscpu: 'Windows NT 10.0; Win64; x64',
    screens: [[1920, 1080], [2560, 1440], [3440, 1440]],
    dprs: [1, 1.25, 1.5],
    webglVendors: ['Google Inc. (AMD)'],
    webglRenderers: [
      'ANGLE (AMD, AMD Radeon RX 6700 XT Direct3D11 vs_5_0 ps_5_0, D3D11)',
      'ANGLE (AMD, AMD Radeon RX 580 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    ],
    hardwareConcurrencies: [8, 12, 16],
    deviceMemories: [16, 32],
    colorDepth: 24,
  },
];

export const MACOS_PRESETS: DevicePreset[] = [
  {
    platform: 'MacIntel',
    oscpu: 'Intel Mac OS X 10_15_7',
    screens: [[1440, 900], [1680, 1050], [2560, 1600]],
    dprs: [2],
    webglVendors: ['Google Inc. (Apple)'],
    webglRenderers: [
      'ANGLE (Apple, Apple M1, OpenGL 4.1)',
      'ANGLE (Apple, Apple M2, OpenGL 4.1)',
      'ANGLE (Apple, Apple M3, OpenGL 4.1)',
    ],
    hardwareConcurrencies: [8, 10, 12],
    deviceMemories: [8, 16],
    colorDepth: 30,
  },
  {
    platform: 'MacIntel',
    oscpu: 'Intel Mac OS X 10_15_7',
    screens: [[1440, 900], [1680, 1050]],
    dprs: [2],
    webglVendors: ['Google Inc. (Intel)'],
    webglRenderers: [
      'ANGLE (Intel, Intel(R) Iris Plus Graphics 645, OpenGL 4.1)',
      'ANGLE (Intel, Intel(R) Iris Plus Graphics, OpenGL 4.1)',
    ],
    hardwareConcurrencies: [4, 8],
    deviceMemories: [8, 16],
    colorDepth: 24,
  },
];

export const LINUX_PRESETS: DevicePreset[] = [
  {
    platform: 'Linux x86_64',
    oscpu: 'Linux x86_64',
    screens: [[1920, 1080], [2560, 1440]],
    dprs: [1],
    webglVendors: ['Google Inc. (NVIDIA)'],
    webglRenderers: [
      'ANGLE (NVIDIA, NVIDIA GeForce GTX 1080 Ti, OpenGL 4.5)',
      'ANGLE (NVIDIA, NVIDIA GeForce RTX 3070, OpenGL 4.5)',
    ],
    hardwareConcurrencies: [8, 12, 16],
    deviceMemories: [16, 32],
    colorDepth: 24,
  },
  {
    platform: 'Linux x86_64',
    oscpu: 'Linux x86_64',
    screens: [[1920, 1080]],
    dprs: [1],
    webglVendors: ['Google Inc. (Intel)'],
    webglRenderers: [
      'ANGLE (Intel, Mesa Intel(R) UHD Graphics 630 (CFL GT2), OpenGL 4.5)',
    ],
    hardwareConcurrencies: [4, 8],
    deviceMemories: [8, 16],
    colorDepth: 24,
  },
];

export const ALL_PRESETS: DevicePreset[] = [
  ...WINDOWS_PRESETS,
  ...MACOS_PRESETS,
  ...LINUX_PRESETS,
];

/** Timezone → language mapping for consistency validation */
export const TIMEZONE_LANGUAGES: Record<string, string[]> = {
  'Asia/Shanghai': ['zh-CN', 'zh', 'en'],
  'Asia/Tokyo': ['ja', 'en'],
  'Asia/Seoul': ['ko', 'en'],
  'America/New_York': ['en-US', 'en'],
  'America/Los_Angeles': ['en-US', 'en'],
  'America/Chicago': ['en-US', 'en'],
  'Europe/London': ['en-GB', 'en'],
  'Europe/Berlin': ['de-DE', 'de', 'en'],
  'Europe/Paris': ['fr-FR', 'fr', 'en'],
  'Europe/Moscow': ['ru-RU', 'ru', 'en'],
  'Asia/Singapore': ['en-SG', 'zh', 'en'],
  'Asia/Hong_Kong': ['zh-HK', 'zh', 'en'],
  'Asia/Taipei': ['zh-TW', 'zh', 'en'],
};

/** Timezone → UTC offset in minutes (negative = east of UTC) */
export const TIMEZONE_OFFSETS: Record<string, number> = {
  'Asia/Shanghai': -480,
  'Asia/Tokyo': -540,
  'Asia/Seoul': -540,
  'America/New_York': 300,
  'America/Los_Angeles': 480,
  'America/Chicago': 360,
  'Europe/London': 0,
  'Europe/Berlin': -60,
  'Europe/Paris': -60,
  'Europe/Moscow': -180,
  'Asia/Singapore': -480,
  'Asia/Hong_Kong': -480,
  'Asia/Taipei': -480,
};
