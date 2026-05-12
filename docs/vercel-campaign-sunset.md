# Vercel campaign sunset

Matters Studio now owns the reusable versions of four legacy Vercel campaign
tools through the `/campaign-tools` route:

- `thematters/user-data-project-2022` -> 2022 年度創作成就卡
- `thematters/thankyou-card` -> 2023 致謝詞小卡
- `thematters/matters-identity` -> Matters Identity Card
- `thematters/campaign-call-for-vote` -> Nomad Matters 拉票海報

## Migration boundary

The Studio implementation is a maintained React workflow, not a direct SvelteKit
embed. It keeps the durable parts of the old projects:

- Matters ID input
- optional Matters profile lookup through `https://server.matters.town/graphql`
- optional 2022 annual stats lookup through `https://user-data-api.matters.one`
- deterministic browser preview
- PNG download

The old public microsites should be treated as historical campaign deployments.
Do not add new feature work to those Vercel projects unless production traffic
requires an emergency fix before redirect.

## Sunset checklist

1. Verify `/campaign-tools` in Studio can generate PNGs for all four templates.
2. Add a short README note in each legacy repo that the maintained workflow has
   moved to `matters-studio`.
3. In Vercel, either redirect each domain to `https://studio.matters.town` or
   keep a static archived deployment if public access is still needed.
4. Pause or remove Vercel preview deployments for the four legacy projects after
   redirects are confirmed.
5. Keep the GitHub repos archived/read-only for source provenance.

## Public-access note

`studio.matters.town` is intended as an internal tool behind Cloudflare Access.
If a future campaign needs public self-service card generation again, create a
public export route or a generated static campaign page from Studio rather than
opening the entire Studio app.
