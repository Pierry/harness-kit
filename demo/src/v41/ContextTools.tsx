import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { theme } from '../theme';

type Tool = {
  cmd: string;
  name: string;
  what: string;
  scope: string;
  cache: string;
  badge: string;
};

const tools: Tool[] = [
  {
    cmd: '/context:pack',
    name: 'repomix',
    what: 'snapshot the repo into one AI-friendly file',
    scope: 'per feature · ephemeral',
    cache: '.claude/runtime/cache/repomix/{id}.xml',
    badge: 'no API key',
  },
  {
    cmd: '/context:graph',
    name: 'graphify',
    what: 'queryable knowledge graph of the codebase',
    scope: 'per repo · long-lived',
    cache: '.claude/runtime/cache/graphify/{slug}/',
    badge: 'code-only · Tree-sitter local',
  },
];

export const ContextTools = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerOpacity = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: 'clamp' });
  const exit = interpolate(frame, [320, 360], [1, 0], { extrapolateRight: 'clamp' });
  const footerOpacity = interpolate(frame, [200, 230], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        padding: theme.space.pad,
        justifyContent: 'center',
        opacity: exit,
      }}
    >
      <div
        style={{
          opacity: headerOpacity,
          textAlign: 'center',
          marginBottom: 50,
          color: theme.color.textDim,
          fontSize: theme.type.h3,
        }}
      >
        <span style={{ color: theme.color.text }}>context tools.</span> optional. manual. fall back to grep.
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 48,
          maxWidth: 1700,
          margin: '0 auto',
        }}
      >
        {tools.map((t, i) => {
          const start = 40 + i * 36;
          const opacity = interpolate(frame, [start, start + 24], [0, 1], { extrapolateRight: 'clamp' });
          const y = spring({ frame: frame - start, fps, config: { damping: 18 } });
          return (
            <div
              key={t.cmd}
              style={{
                opacity,
                transform: `translateY(${(1 - y) * 40}px)`,
                background: theme.color.surface,
                border: `1px solid ${theme.color.borderStrong}`,
                borderRadius: theme.radius.lg,
                padding: 40,
                display: 'flex',
                flexDirection: 'column',
                gap: 22,
                minHeight: 420,
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: theme.font.mono,
                    fontSize: theme.type.h3,
                    fontWeight: 700,
                    color: theme.color.accent,
                  }}
                >
                  {t.cmd}
                </div>
                <div
                  style={{
                    color: theme.color.textDim,
                    fontSize: theme.type.body,
                    marginTop: 8,
                    fontFamily: theme.font.mono,
                  }}
                >
                  binds to <span style={{ color: theme.color.text }}>{t.name}</span>
                </div>
              </div>

              <div style={{ color: theme.color.text, fontSize: theme.type.body, lineHeight: 1.4 }}>{t.what}</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 'auto' }}>
                <Row label="scope" value={t.scope} />
                <Row label="cache" value={t.cache} mono />
              </div>

              <div
                style={{
                  alignSelf: 'flex-start',
                  marginTop: 4,
                  padding: '8px 16px',
                  borderRadius: 999,
                  background: `${theme.color.success}18`,
                  border: `1px solid ${theme.color.success}`,
                  color: theme.color.success,
                  fontSize: theme.type.label,
                  fontFamily: theme.font.mono,
                }}
              >
                {t.badge}
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          opacity: footerOpacity,
          marginTop: 44,
          textAlign: 'center',
          color: theme.color.textFaint,
          fontSize: theme.type.label,
          fontFamily: theme.font.mono,
          letterSpacing: 0.5,
        }}
      >
        PRP explorer · plan · SDD supervisor all consult the cache when present
      </div>
    </AbsoluteFill>
  );
};

const Row = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
  <div style={{ display: 'flex', gap: 16, alignItems: 'baseline' }}>
    <span
      style={{
        color: theme.color.textFaint,
        fontSize: theme.type.label,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        width: 70,
        flexShrink: 0,
      }}
    >
      {label}
    </span>
    <span
      style={{
        color: theme.color.text,
        fontFamily: mono ? theme.font.mono : theme.font.body,
        fontSize: mono ? theme.type.codeSmall : theme.type.body,
      }}
    >
      {value}
    </span>
  </div>
);
