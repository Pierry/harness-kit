import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { theme } from '../theme';

type SkillGroup = {
  agent: string;
  blurb: string;
  skills: { name: string; covers: string }[];
  accent: string;
  delay: number;
};

const GROUPS: SkillGroup[] = [
  {
    agent: 'staff-software-engineer',
    blurb: 'Per-area skill loaded by /sse:dev (auto-detected from repo files).',
    accent: '#6ee7b7',
    delay: 32,
    skills: [
      { name: 'backend', covers: 'Java/Kotlin/Go services · Spring · gradle/maven' },
      { name: 'web', covers: 'React/Vue · Vite/Next · TS · component conventions' },
      { name: 'mobile', covers: 'iOS Swift · Android Kotlin · platform idioms' },
      { name: 'devops', covers: 'Terraform · CI/CD · k8s · observability' },
    ],
  },
  {
    agent: 'product-manager',
    blurb: 'Per-artifact skill, defines how PRD / PRP gets drafted and gated.',
    accent: '#a78bfa',
    delay: 108,
    skills: [
      { name: 'prd', covers: 'Business problem → goals → acceptance criteria → rollout' },
      { name: 'prp', covers: 'PRD context → files to touch → tests → handoff to engineering' },
    ],
  },
];

export const Skills = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: 'clamp' });
  const titleY = spring({ frame, fps, config: { damping: 16 } });
  const exit = interpolate(frame, [165, 180], [1, 0], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ padding: theme.space.pad, paddingBottom: 140, opacity: exit }}>
      <div
        style={{
          marginLeft: 80,
          opacity: titleOpacity,
          transform: `translateY(${(1 - titleY) * 20}px)`,
        }}
      >
        <div style={{ fontSize: theme.type.label, color: theme.color.textDim, letterSpacing: 4, textTransform: 'uppercase' }}>
          skills · loaded per stage
        </div>
        <div
          style={{
            fontFamily: theme.font.display,
            fontSize: theme.type.h1,
            fontWeight: 700,
            color: theme.color.text,
            marginTop: 14,
            letterSpacing: -2,
          }}
        >
          Right knowledge, <span style={{ color: theme.color.accent }}>right stage.</span>
        </div>
      </div>

      <div
        style={{
          marginTop: 48,
          marginLeft: 80,
          marginRight: 80,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 32,
        }}
      >
        {GROUPS.map((g, gi) => (
          <div key={gi}>
            <div
              style={{
                opacity: interpolate(frame, [g.delay, g.delay + 12], [0, 1], { extrapolateRight: 'clamp' }),
                display: 'flex',
                alignItems: 'baseline',
                gap: 22,
                marginBottom: 18,
              }}
            >
              <span
                style={{
                  fontFamily: theme.font.mono,
                  fontSize: 24,
                  color: g.accent,
                  fontWeight: 600,
                }}
              >
                {g.agent}
              </span>
              <span style={{ fontSize: 20, color: theme.color.textDim }}>{g.blurb}</span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              {g.skills.map((s, i) => {
                const start = g.delay + 16 + i * 12;
                const op = interpolate(frame, [start, start + 14], [0, 1], { extrapolateRight: 'clamp' });
                const reveal = spring({ frame: frame - start, fps, config: { damping: 16 } });
                return (
                  <div
                    key={i}
                    style={{
                      opacity: op,
                      transform: `translateY(${(1 - reveal) * 18}px) scale(${0.96 + reveal * 0.04})`,
                      flex: '1 1 360px',
                      background: theme.color.surface,
                      borderRadius: theme.radius.md,
                      border: `1px solid ${theme.color.borderStrong}`,
                      borderTop: `4px solid ${g.accent}`,
                      padding: 22,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: theme.font.mono,
                        fontSize: 26,
                        color: g.accent,
                        fontWeight: 600,
                        letterSpacing: 1,
                      }}
                    >
                      skills/{s.name}/SKILL.md
                    </div>
                    <div
                      style={{
                        fontSize: 20,
                        color: theme.color.textDim,
                        marginTop: 10,
                        lineHeight: 1.4,
                      }}
                    >
                      {s.covers}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
