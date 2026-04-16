/**
 * SnapDish design tokens — Cal-inspired clarity + SnapDish green accent.
 */
export const colors = {
  canvas: '#E8EBE6',
  surface: '#FFFFFF',
  surfaceMuted: '#F2F2F7',
  surfaceElevated: '#FAFAFA',
  text: '#1C1C1E',
  textSecondary: '#636366',
  textTertiary: '#8E8E93',
  border: '#E5E5EA',
  borderLight: '#F2F2F7',
  brand: '#34C759',
  accentLime: '#D9F27B',
  tabBar: '#1C1C1E',
  tabInactive: '#8E8E93',
  overlay: 'rgba(28, 28, 30, 0.4)',
  overlayLight: 'rgba(255, 255, 255, 0.92)',
  statPrep: '#EEF2FF',
  statPrepIcon: '#6366F1',
  statCook: '#FFF7ED',
  statCookIcon: '#EA580C',
  statCal: '#F0FDF4',
  statCalIcon: '#16A34A',
  statRate: '#FEF3C7',
  statRateIcon: '#D97706',
  danger: '#FF3B30',
} as const;

export const radius = {
  xs: 8,
  sm: 12,
  md: 14,
  lg: 18,
  xl: 22,
  xxl: 28,
} as const;

export const shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  tabBar: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
} as const;
