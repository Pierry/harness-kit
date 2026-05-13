# Stage card output convention

Every pipeline stage command (PRD, PRP, plan, dev, test, pr) prints two blocks
in its chat response. The card mirrors what the Remotion demo shows in its
"active artifacts" panel — guides, refs, sensors, eval, next step — but renders
inline in the Claude session so it works without any UI.

The card is part of the LLM's output, not a hook. Hooks update the status bar;
this card explains what the stage is about to do (or just did) in human-readable
form.

## Header card

Printed before drafting begins. Lists what will be loaded and what comes next.

```
━━━ {command} · {feature_id}{area_suffix} ━━━
guides:   {guide-1.md}, {guide-2.md}, ...
refs:     {ref-1.md}, {ref-2.md}, ...
sensors:  {sensor-name}, {sensor-name}, ...
eval:     {eval-name}
next:     {/next:command}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

`{area_suffix}` is ` · {area}` for SSE stages (backend, web, mobile, devops),
empty otherwise.

## Footer card

Printed after the artifact is saved and gates ran. Shows pass/fail and score.

```
━━━ done · {command} ━━━
artifact: {relative/output/path.md}
sensors:  {pass | failed: name1, name2}
eval:     {N}/10
next:     {/next:command | (pipeline complete)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Examples

```
━━━ /product-manager:prd · 2026-05-13-billing-multi-currency ━━━
guides:   prd-guidelines.md, writing-style.md
refs:     business-info.md, squads/billing/context.md
sensors:  prd-structure, prd-acceptance-criteria
eval:     prd-quality
next:     /product-manager:prp
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

```
━━━ done · /product-manager:prd ━━━
artifact: outputs/prd/2026-05-13-billing-multi-currency.md
sensors:  pass
eval:     8.6/10
next:     /product-manager:prp
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

```
━━━ /sse:plan · 2026-05-13-billing-multi-currency · backend ━━━
guides:   pipeline.md, coding-style.md, skills/backend/SKILL.md
refs:     prp/2026-05-13-billing-multi-currency.md, conventions/backend.md
sensors:  plan-structure
eval:     plan-quality
next:     /sse:dev
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Keep the card terse. List filenames only (no full paths). Skip a line that has
no entries.
