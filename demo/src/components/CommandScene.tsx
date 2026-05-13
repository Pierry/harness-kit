import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { theme } from '../theme';
import { Terminal } from './Terminal';

export type ArtifactKind = 'guide' | 'sensor' | 'eval' | 'ref';

export type ArtifactEntry = {
  kind: ArtifactKind;
  name: string;
  showFrame: number;
};

type Props = {
  kicker: string;
  title: React.ReactNode;
  termTitle: string;
  artifacts: ArtifactEntry[];
  children: React.ReactNode;
  exitStart?: number;
  exitEnd?: number;
};

const KIND_LABEL: Record<ArtifactKind, string> = {
  guide: 'GUIDE',
  sensor: 'SENSOR',
  eval: 'EVAL',
  ref: 'REF',
};

const KIND_COLOR: Record<ArtifactKind, string> = {
  guide: '#a78bfa',
  sensor: '#fbbf24',
  eval: '#6ee7b7',
  ref: '#60a5fa',
};

export const CommandScene: React.FC<Props> = ({
  kicker,
  title,
  termTitle,
  artifacts,
  children,
  exitStart,
  exitEnd,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: 'clamp' });
  const termSpring = spring({ frame: frame - 6, fps, config: { damping: 16 } });
  const panelSpring = spring({ frame: frame - 12, fps, config: { damping: 18 } });

  const fadeStart = exitStart ?? 9999;
  const fadeEnd = exitEnd ?? 9999;
  const exit = interpolate(frame, [fadeStart, fadeEnd], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ padding: theme.space.pad, paddingBottom: 140, opacity: exit }}>
      <div style={{ marginLeft: 80, opacity: titleOpacity }}>
        <div style={{ fontSize: theme.type.label, color: theme.color.textDim, letterSpacing: 4, textTransform: 'uppercase' }}>
          {kicker}
        </div>
        <div
          style={{
            fontFamily: theme.font.display,
            fontSize: theme.type.h2,
            fontWeight: 700,
            color: theme.color.text,
            marginTop: 10,
            letterSpacing: -1.5,
          }}
        >
          {title}
        </div>
      </div>

      <div
        style={{
          marginTop: 40,
          marginLeft: 80,
          marginRight: 80,
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '1.55fr 1fr',
          gap: 28,
          minHeight: 0,
        }}
      >
        <div
          style={{
            transform: `translateY(${(1 - termSpring) * 24}px)`,
            opacity: termSpring,
            display: 'flex',
            minHeight: 0,
          }}
        >
          <Terminal title={termTitle} style={{ flex: 1 }}>
            {children}
          </Terminal>
        </div>

        <div
          style={{
            transform: `translateX(${(1 - panelSpring) * 30}px)`,
            opacity: panelSpring,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            minHeight: 0,
          }}
        >
          <div style={{ fontSize: theme.type.label, color: theme.color.textFaint, letterSpacing: 3, textTransform: 'uppercase' }}>
            active artifacts
          </div>
          <div
            style={{
              flex: 1,
              padding: 20,
              background: theme.color.surface,
              borderRadius: theme.radius.md,
              border: `1px solid ${theme.color.borderStrong}`,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              overflow: 'hidden',
            }}
          >
            {artifacts.map((a, i) => (
              <ArtifactRow key={i} artifact={a} frame={frame} />
            ))}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const ArtifactRow = ({ artifact, frame }: { artifact: ArtifactEntry; frame: number }) => {
  const opacity = interpolate(frame, [artifact.showFrame, artifact.showFrame + 12], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const slide = interpolate(frame, [artifact.showFrame, artifact.showFrame + 16], [16, 0], {
    extrapolateRight: 'clamp',
  });
  const color = KIND_COLOR[artifact.kind];
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '12px 14px',
        background: theme.color.codeBg,
        borderRadius: theme.radius.sm,
        border: `1px solid ${theme.color.border}`,
        borderLeft: `3px solid ${color}`,
        opacity,
        transform: `translateX(${slide}px)`,
        fontFamily: theme.font.mono,
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 1.5,
          color,
          minWidth: 56,
        }}
      >
        {KIND_LABEL[artifact.kind]}
      </span>
      <span style={{ fontSize: 18, color: theme.color.text, flex: 1 }}>{artifact.name}</span>
    </div>
  );
};
