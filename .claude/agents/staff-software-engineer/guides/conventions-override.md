# Conventions Override

How project-specific conventions override agent defaults.

## Path

Each repo can have own conventions file per area:

```
{repo-root}/
└── .claude/
 └── conventions/
 ├── backend.md
 ├── web.md
 ├── mobile.md
 └── devops.md
```

Only files you need. No web work in repo, no web.md.

## How it works

When skill or command generates code:

1. Read plugin default conventions from `skills/{area}/SKILL.md`.
2. Check if `cwd/.claude/conventions/{area}.md` exists.
3. If yes, read it. Rules override or add to defaults.
4. On conflict, project wins.
5. No project file, use agent defaults only.

## What goes in project conventions file

DIFFERENCES from defaults, not full rule set. Examples:

```markdown
# Backend conventions for billing-service

Stack overrides:
- Java 17 (not 8 or 11)
- Spring Boot 3.x (not Spring 4.3 no-Boot)
- Spring Data JPA repositories (not AbstractRepository)
- MapStruct for mappers (not Orika)
- JUnit 5 + Mockito (not JUnit 4)
- Deploy as container, not WAR
- Package: com.example.billing

Project-specific patterns:
- All entities in com.example.billing.domain
- Service layer in .service, repositories in .repository
- Use Records for DTOs

Forbidden in this repo:
- Lombok (we use Records and explicit constructors)
- @Component annotation on classes (always @Service, @Repository, @Configuration)
```

Keep short. Document what is DIFFERENT, not what is shared with defaults.

## Avoiding drift

If convention you wrote for repo applies to others, consider promoting to agent defaults (skills/{area}/SKILL.md). Per-repo files hold genuine repo-specific decisions.

## Versioning

Track conventions changes in git. When rule changes, commit message and PR description explain why.

## Example structure for billing-service

```
billing-service/
├── .claude/
│ └── conventions/
│ ├── backend.md
│ └── devops.md
├── src/...
└── pom.xml
```

Web and mobile files absent because billing-service has no web or mobile work.
