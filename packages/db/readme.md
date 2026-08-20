## Creation migration

Modify schemas in imported in [drizzle config](./drizzle.config.ts)

Then generate a migration:

```bash
pnpm run migrations:add --name=<migration_name>
```

Check the generated migration in ./drizzle/, update as needed.

Create an accompanying down migration with `drizzle-rollback`:

```bash
pnpm run "migrations:add-rollback"
```

Check the generated down migration stub in ./drizzle and update as needed. Make sure to remove `:stub` indicator from the comment on l.1 once complete.

## Apply migration

Make sure the DB is running, then run:

```bash
pnpm run db:migrate
```

## Revert migration

```bash
pnpm run db:rollback
```

## Assert in DB

In the db context run:

```bash
SELECT * FROM drizzle.__drizzle_migrations;
```

To see all applied migrations by hash. On rollback, migrations are removed from this history.
