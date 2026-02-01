
export const COLORS = {
  primary: '#E4941C',
  secondary: '#101B53',
  accent: '#638C5F',
  background: '#F1F1F1',
  white: '#FFFFFF',
  text: {
    primary: '#101B53',
    secondary: '#666',
    light: '#999',
    bright: '#A1C3E3',
  },
  success: '#638C5F',
  error: '#E53E3E',
  warning: '#E4941C',
  info: '#A1C3E3',
  border: '#F1F1F1',
  card: '#FFFFFF',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const BORDER_RADIUS = {
  xs: 6,
  sm: 9,
  md: 12,
  lg: 15,
  xl: 21,
  xxl: 27,
  full: 9999,
};

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  primary: {
    shadowColor: '#E4941C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
};

export const TYPOGRAPHY = {
  h1: {
    fontSize: 36,
    fontWeight: '700' as const,
    letterSpacing: 1,
  },
  h2: {
    fontSize: 28,
    fontWeight: '700' as const,
  },
  h3: {
    fontSize: 24,
    fontWeight: '700' as const,
  },
  h4: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  h5: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  h6: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  body1: {
    fontSize: 16,
    fontWeight: '400' as const,
  },
  body2: {
    fontSize: 14,
    fontWeight: '400' as const,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
  },
  overline: {
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
};