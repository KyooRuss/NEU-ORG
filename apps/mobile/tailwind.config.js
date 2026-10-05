/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // NEU ORG colors, taken from the Figma login designs.
      colors: {
        brand: {
          navy: '#1A2E78',
          blue: '#3549D6',
          sky: '#4263EB',
          light: '#6C9BF8',
          teal: '#15506E',
          ink: '#1E2440',
        },
        surface: '#F5F7FB',
        field: '#E8E9EC',
      },
      // Custom fonts need one family per weight on Android.
      fontFamily: {
        poppins: ['Poppins_400Regular'],
        'poppins-light': ['Poppins_300Light'],
        'poppins-medium': ['Poppins_500Medium'],
        'poppins-semibold': ['Poppins_600SemiBold'],
        display: ['BarlowCondensed_500Medium'],
      },
    },
  },
  plugins: [],
};
