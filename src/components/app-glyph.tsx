// clipboard-check glyph (lucide) used for generated app icons and the share image;
// plain svg so it renders inside next/og ImageResponse
export function AppGlyph({ size, color = "#ffffff" }: { size: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="m9 14 2 2 4-4" />
    </svg>
  );
}

// brand colors for generated images; mirrors tokens.css (css variables are unavailable there)
export const imageColors = {
  primary: "#0d857b",
  primaryStrong: "#134e4a",
  tint: "#ccfbf1",
  amber: "#fbbf24",
} as const;
