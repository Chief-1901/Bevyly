/**
 * Color palette configuration for Bevyly/SalesOS
 * Used by chart components and other dynamic color needs
 * These values match the CSS tokens in tokens.css
 */

export const colors = {
  // Primary palette (neutral/charcoal)
  primary: {
    50: '#f7f7f7',
    200: '#e6e6e6',
    500: '#595959',
    700: '#373635',
    900: '#111111',
  },

  // Secondary palette (muted teal)
  secondary: {
    50: '#f4f9f7',
    200: '#ddecdf',
    500: '#b5d7ce',
    700: '#8fbfb3',
    900: '#2f6f61',
  },

  // Gray scale
  gray: {
    100: '#f2f1f0',
    300: '#bbbec1',
    400: '#a4a4a5',
    500: '#777b83',
    600: '#595959',
    700: '#373635',
    800: '#2e2e2d',
    900: '#111111',
  },

  // Accent colors
  accent: {
    success: '#16a34a',
    warning: '#f59e0b',
    info: '#0ea5e9',
    danger: '#ef4444',
    mutedBeige: '#eadecf',
  },

  // Chart-specific colors
  chart: {
    gradientStart: '#b5d7ce',
    gradientEnd: '#f2f1f0',
  },
};

// Dark mode overrides for charts
export const darkColors = {
  primary: {
    50: '#1a1a1a',
    200: '#2e2e2d',
    500: '#bbbbbb',
    700: '#e6e6e6',
    900: '#f7f7f7',
  },

  secondary: {
    50: '#0f1f1a',
    200: '#1a3d32',
    500: '#8fbfb3',
    700: '#b5d7ce',
    900: '#ddecdf',
  },

  gray: {
    100: '#1a1a1a',
    300: '#2e2e2d',
    400: '#444444',
    500: '#777777',
    600: '#999999',
    700: '#bbbbbb',
    800: '#dddddd',
    900: '#f0f0f0',
  },

  accent: {
    success: '#22c55e',
    warning: '#fbbf24',
    info: '#38bdf8',
    danger: '#f87171',
    mutedBeige: '#3d3530',
  },

  chart: {
    gradientStart: '#8fbfb3',
    gradientEnd: '#1a1a1a',
  },
};

/**
 * Get the appropriate color palette based on theme
 * @param {boolean} isDark - Whether dark mode is active
 * @returns The color palette for the current theme
 */
export function getThemeColors(isDark) {
  return isDark ? darkColors : colors;
}

/**
 * Status badge colors with semantic meaning
 */
export const statusColors = {
  success: {
    bg: 'rgba(22, 163, 74, 0.12)',
    text: '#16a34a',
    darkBg: 'rgba(34, 197, 94, 0.15)',
    darkText: '#22c55e',
  },
  pending: {
    bg: 'rgba(245, 158, 11, 0.12)',
    text: '#f59e0b',
    darkBg: 'rgba(251, 191, 36, 0.15)',
    darkText: '#fbbf24',
  },
  refunded: {
    bg: 'rgba(55, 54, 53, 0.06)',
    text: '#595959',
    darkBg: 'rgba(255, 255, 255, 0.06)',
    darkText: '#999999',
  },
};

/**
 * Heatmap intensity colors for the sales trend chart
 */
export const heatmapColors = {
  light: [
    '#f2f1f0', // 0 - empty
    '#ddecdf', // 1 - low
    '#b5d7ce', // 2 - medium-low
    '#8fbfb3', // 3 - medium
    '#6ba89a', // 4 - medium-high
    '#2f6f61', // 5 - high
  ],
  dark: [
    '#1a1a1a', // 0 - empty
    '#1a3d32', // 1 - low
    '#2f6f61', // 2 - medium-low
    '#6ba89a', // 3 - medium
    '#8fbfb3', // 4 - medium-high
    '#b5d7ce', // 5 - high
  ],
};

export default colors;

