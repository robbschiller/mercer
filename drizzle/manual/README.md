# Manual SQL (fallback migrations)

If `bun run db:push` crashes with `TypeError: Cannot read properties of undefined (reading 'replace')`, that is a [known drizzle-kit issue](https://github.com/drizzle-team/drizzle-orm/issues/3766) when introspecting some PostgreSQL / Supabase databases.

Use:

```sh
bun run db:apply-manual
```

This runs every `*.sql` file in this folder in **lexical order**. Add new files as `002_description.sql`, `003_...sql`, etc., when you change the schema and `db:push` still cannot run.

For a **new** Supabase project with no tables yet, create tables via the Supabase SQL editor using your full schema, or fix `db:push` when Drizzle ships a patch.
