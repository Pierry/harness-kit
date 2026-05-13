# Conventions Override

How project-specific conventions override the plugin defaults.

## Path

Each repo can have its own conventions file per area:

```
{repo-root}/
└── .claude/
 └── conventions/
 ├── backend.md
 ├── web.md
 ├── mobile.md
 └── devops.md
```

Only the files you need. If you do not have web work in this repo, do not create web.md.

## How it works

When a skill or command generates code:

1. Read the plugin's default conventions from `skills/{area}/SKILL.md`.
2. Check if `cwd/.claude/conventions/{area}.md` exists.
3. If yes, read it. Rules in this file override or add to the defaults.
4. If a rule conflicts, project wins.
5. If no project file, use plugin defaults only.

## What goes in a project conventions file

The DIFFERENCES from defaults, not the full rule set. Examples:

```markdown
# Backend conventions for recon-service

Stack overrides:
- Java 17 (not 8 or 11)
- Spring Boot 3.x (not Spring 4.3 no-Boot)
- Spring Data JPA repositories (not AbstractRepository)
- MapStruct for mappers (not Orika)
- JUnit 5 + Mockito (not JUnit 4)
- Deploy as container, not WAR
- Package: br.com.team.recon

Project-specific patterns:
- All entities in br.com.team.recon.domain
- Service layer in .service, repositories in .repository
- Use Records for DTOs

Forbidden in this repo:
- Lombok (we use Records and explicit constructors)
- @Component annotation on classes (always @Service, @Repository, @Configuration)
```

Keep it short. Document what is DIFFERENT, not what is shared with defaults.

## Avoiding drift

If a convention you wrote for the repo also applies to others, consider promoting it to the plugin defaults (skills/{area}/SKILL.md). Per-repo files should hold genuine repo-specific decisions.

## Versioning

Track conventions changes in git. When a rule changes, the commit message and PR description explain why.

## Example structure for recon-service

```
recon-service/
├── .claude/
│ └── conventions/
│ ├── backend.md
│ └── devops.md
├── src/...
└── pom.xml
```

Web and mobile files absent because recon-service has no web or mobile work.
