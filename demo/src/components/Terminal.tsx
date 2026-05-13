import React from 'react';
import { theme } from '../theme';

type Props = {
  title?: string;
  children: React.ReactNode;
  width?: number | string;
  height?: number | string;
  style?: React.CSSProperties;
};

export const Terminal: React.FC<Props> = ({ title = 'zsh', children, width = '100%', height = '100%', style }) => (
  <div
    style={{
      width,
      height,
      background: theme.color.codeBg,
      borderRadius: theme.radius.lg,
      border: `1px solid ${theme.color.borderStrong}`,
      boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 4px 14px rgba(0,0,0,0.4)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: theme.font.mono,
      ...style,
    }}
  >
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '14px 20px',
        borderBottom: `1px solid ${theme.color.border}`,
        background: theme.color.surfaceElev,
      }}
    >
      <Dot color="#ff5f57" />
      <Dot color="#febc2e" />
      <Dot color="#28c840" />
      <div style={{ marginLeft: 16, color: theme.color.textDim, fontSize: 18, fontFamily: theme.font.mono }}>{title}</div>
    </div>
    <div style={{ padding: 28, flex: 1, color: theme.color.text, fontSize: theme.type.code, lineHeight: 1.55 }}>
      {children}
    </div>
  </div>
);

const Dot = ({ color }: { color: string }) => (
  <div style={{ width: 14, height: 14, borderRadius: '50%', background: color }} />
);
