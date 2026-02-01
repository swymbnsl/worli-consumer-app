/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: ["./app/**/*.{js,jsx,ts,tsx}","./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          navy: '#101B53',
          cream: '#FFF0D2',
          orange: '#EF6600',
        },
        secondary: {
          skyBlue: '#A1C3E3',
          sage: '#638C5F',
          mint: '#99C8BF',
          gold: '#E4941C',
        },
        neutral: {
          white: '#FFFFFF',
          lightCream: '#F5F5F0',
          lightGray: '#F1F1F1',
          gray: '#B3B3B3',
          darkGray: '#333333',
          nearBlack: '#121212',
        },
        functional: {
          success: '#638C5F',
          warning: '#E4941C',
          error: '#EF6600', // Note: Design system has this same as orange
          info: '#A1C3E3',
        },
      },
      fontFamily: {
        sofia: ['Sofia-Pro-Regular', 'sans-serif'],
        'sofia-bold': ['Sofia-Pro-Bold', 'sans-serif'],
        comfortaa: ['Comfortaa-Regular', 'sans-serif'],
        'comfortaa-bold': ['Comfortaa-Bold', 'sans-serif'],
      },
      boxShadow: {
        'sm': '0 2px 8px rgba(16, 27, 83, 0.08)',
        'md': '0 4px 16px rgba(16, 27, 83, 0.12)',
        'lg': '0 8px 24px rgba(16, 27, 83, 0.16)',
      },
    },
  },
  plugins: [],
}