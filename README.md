# Wedding Smart RSVP — Cloudflare Pages project

Minimal luxury starting design: ivory background, warm neutral typography, editable text, fonts and colors.

## Project contents
- `public/` — guest RSVP page, admin page, styles and browser scripts
- `functions/api/[[path]].js` — Cloudflare Pages Function API route
- `worker/src/index.js` — API logic
- `worker/migrations/0001_init.sql` — D1 database schema
- `wrangler.toml` — Pages output directory and D1 binding

## Important deployment choice
Use **Cloudflare Pages Git integration** for this full-stack project. Cloudflare's dashboard drag-and-drop Direct Upload does not compile a `functions/` directory. The Pages Functions API must be deployed with the Functions code included.

## Setup overview
1. Upload this project folder to a GitHub repository (keep the `functions`, `public`, `worker`, and `wrangler.toml` paths).
2. In Cloudflare, create a Pages project and connect that GitHub repository.
3. Set Framework preset to None, build command blank, and build output directory to `public`.
4. Create a D1 database named `wedding-smart-rsvp`.
5. In Pages project Settings > Functions > D1 database bindings, bind database `wedding-smart-rsvp` to variable name `DB`.
6. Apply `worker/migrations/0001_init.sql` to the D1 database using Cloudflare's D1 console or Wrangler.
7. In Pages project Settings > Variables and Secrets, add `ADMIN_PASSWORD` as an encrypted secret. Use a strong, unique password.
8. Redeploy the Pages project after adding the binding and secret.
9. Open `/admin.html`, sign in, and add invited guests with their seat allowance (including the invited guest).
10. Embed the deployed Pages URL in Canva using Canva's Embed feature.

## Guest rules
- Exact full-name lookup.
- Seat allowance includes the invited guest.
- If accepting, the guest must enter exactly seat allowance minus one companion names.
- Declining requires no companion names.
- Each invitation can submit only once.

## Security note
Full-name-only lookup is convenient but not proof of identity: anyone who knows an invitee's full name may try to look up that invitation. Before using this for a private event, consider adding a per-invitation PIN or unique invitation code.
Deployment refresh

## Mobile workflow
You can create a GitHub repository and upload files using the GitHub mobile website, but configuring D1 migrations and Pages bindings is easier on a desktop. Do not enter real guest data until the backend is deployed and tested.
