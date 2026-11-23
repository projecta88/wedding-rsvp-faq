# Backend configuration for Cloudflare Pages

This backend is deployed as a Cloudflare Pages Function, not as a separate Worker. The route is `functions/api/[[path]].js`.

1. Create a D1 database named `wedding-smart-rsvp`.
2. Bind it to your Pages project as `DB` in Settings > Functions > D1 database bindings.
3. Apply `migrations/0001_init.sql` to that D1 database.
4. Add `ADMIN_PASSWORD` as an encrypted Pages project secret under Settings > Variables and Secrets.
5. Redeploy the Pages project.

The frontend calls same-origin `/api/*` routes, so no external proxy URL is needed.
