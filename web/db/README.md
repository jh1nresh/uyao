# Store identity database

Store OS authentication uses PostgreSQL for pharmacies, users, memberships, and
single-use invitations. Reservation records remain in the existing KV store.

## Apply the schema

Run the migration from `web/` against an empty or backed-up database:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/001_store_identity.sql
```

The migration is additive. It does not import or delete existing KV reservations.

## Required environment variables

- `DATABASE_URL`: PostgreSQL connection URL.
- `STORE_OS_SESSION_SECRET`: random value of at least 32 characters.
- `STORE_OS_ADMIN_SECRET`: separate random value of at least 32 characters.
- `STORE_OS_PUBLIC_URL`: optional; defaults to `https://store.uyaohealth.com/`.

## Create a pharmacy invitation

Only uYao ops may call the admin endpoint. The returned URL contains the raw
token in the URL fragment; the database stores only its SHA-256 hash. Share the
URL through the approved onboarding channel. It expires in 72 hours by default
and can be used once.

```bash
curl -X POST https://store.uyaohealth.com/api/store/admin/invites \
  -H "Authorization: Bearer $STORE_OS_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  --data '{
    "storeSlug": "中山藥局",
    "pharmacyName": "中山藥局",
    "email": "owner@example.com",
    "role": "owner"
  }'
```

The `storeSlug` must exactly match the slug used by reservation creation. Never
reuse the consumer reservation token as Store OS authentication.
