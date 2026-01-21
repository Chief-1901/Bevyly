/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Semantic background/surface tokens
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        border: 'var(--color-border)',
        'muted-beige': 'var(--color-muted-beige)',

        // Text tokens
        'text-primary': 'var(--color-text-primary)',
        'text-muted': 'var(--color-text-muted)',

        // Primary palette
        primary: {
          50: 'var(--color-primary-50)',
          200: 'var(--color-primary-200)',
          500: 'var(--color-primary-500)',
          700: 'var(--color-primary-700)',
          900: 'var(--color-primary-900)',
        },

        // Secondary palette
        secondary: {
          50: 'var(--color-secondary-50)',
          200: 'var(--color-secondary-200)',
          500: 'var(--color-secondary-500)',
          700: 'var(--color-secondary-700)',
          900: 'var(--color-secondary-900)',
        },

        // Gray palette
        gray: {
          100: 'var(--color-gray-100)',
          300: 'var(--color-gray-300)',
          400: 'var(--color-gray-400)',
          500: 'var(--color-gray-500)',
          600: 'var(--color-gray-600)',
          700: 'var(--color-gray-700)',
          800: 'var(--color-gray-800)',
          900: 'var(--color-gray-900)',
        },

        // Accent colors
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        danger: 'var(--color-danger)',
        info: 'var(--color-info)',

        // Derived semantic colors for components
        'focus-ring': 'var(--focus-ring)',
        'table-header-bg': 'var(--table-header-bg)',
        gridline: 'var(--gridline)',
        'surface-primary-a06': 'var(--surface-primary-a06)',
        'success-a12': 'var(--success-a12)',
        'success-a10': 'var(--success-a10)',
        'warning-a12': 'var(--warning-a12)',
        'warning-a10': 'var(--warning-a10)',
        'danger-a10': 'var(--danger-a10)',

        // Heatmap colors
        'heatmap-0': 'var(--heatmap-0)',
        'heatmap-1': 'var(--heatmap-1)',
        'heatmap-2': 'var(--heatmap-2)',
        'heatmap-3': 'var(--heatmap-3)',
        'heatmap-4': 'var(--heatmap-4)',
        'heatmap-5': 'var(--heatmap-5)',
      },

      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },

      spacing: {
        18: '4.5rem', // 72px header height
        header: 'var(--header-height)', // For pt-header, mt-header etc.
        sidebar: 'var(--sidebar-width)',
        'sidebar-collapsed': 'var(--sidebar-collapsed-width)',
        kpi: 'var(--space-kpi)',
      },

      width: {
        sidebar: 'var(--sidebar-width)',
        'sidebar-collapsed': 'var(--sidebar-collapsed-width)',
        'heatmap-cell': 'var(--heatmap-cell)',
      },

      height: {
        header: 'var(--header-height)',
        'heatmap-cell': 'var(--heatmap-cell)',
      },

      padding: {
        kpi: 'var(--space-kpi)',
      },

      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        input: 'var(--radius-input)',
      },

      boxShadow: {
        card: 'var(--elevation-card)',
        floating: 'var(--elevation-floating)',
      },

      ringColor: {
        focus: 'var(--focus-ring)',
      },

      outlineColor: {
        focus: 'var(--color-focus)',
      },

      transitionDuration: {
        120: '120ms',
        160: '160ms',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
