# inconnu-app

The web counterpart to [Inconnu](https://github.com/tiltowait/inconnu), a Discord dice bot for *Vampire: The Masquerade 5th Edition*. Built in SvelteKit.

## Features

### Current

* Character creation wizard (`/wizard/[token]`)
* Character sheets (`/characters/guild/[guild]/[id]`), with Chronicle and XP logs
* Live updates: damage taken in Discord shows up on the sheet without a reload
* View character profiles via direct link ([like this](https://inconnu.app/profile/680d32cbc0bf6151dbd5004e))
* Browse other characters on servers you share (profiles only; no sheets)
* Documentation (`/docs`), served from the bot, so it never goes stale and never has a broken link
* Miscellaneous utils (`/utils`): a dice probability calculator and a Beast speak formatter
* **STs:** View your players' full sheets
* **STs:** View Rolepost changelogs (`/post/[id]`)
* **Supporters:** Edit your characters' traits, trackers, and profiles
* **Supporters:** Rouse, Slake, Mend, take damage, apply Stains, and test Remorse from the sheet, logged and reported just like the bot's commands

### Planned

* View, edit, & create macros
* Log XP
* Roll from your sheet (optionally posting to Discord)

### Maybe; probably not

* Character image uploads (use `/character images upload`)

## Setup

### Env vars

* `AUTH_SECRET`: Run `npx auth`
* `AUTH_DISCORD_ID`: Bot client ID
* `AUTH_DISCORD_SECRET`: Bot OAuth2 secret
* `DATABASE_URL`: local.db
* `API_KEY`: Inconnu API key
* `INCONNU_API_URL`: http://localhost:8000

### Run

1. Get [Inconnu](https://github.com/tiltowait/inconnu) running
2. Run the following commands

```sh
npm i
npm run dev
```

### Check

```sh
npm run check  # Type checking
npm run lint   # Prettier and ESLint
npm test       # Unit tests (Vitest)
```
