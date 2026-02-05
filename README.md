# inconnu-app

The web counterpart to [Inconnu](https://github.com/tiltowait/inconnu), a Discord dice bot for *Vampire: The Masquerade 5th Edition*. Built in SvelteKit.

## Features

### Current

* Landing page (`/`) (anything resembling ad copy is an accomplishment for me)
* Character creation wizard (`/wizard/[token]`)
* Personal character viewer (`/characters/[id]`)
* Miscellaneous utils (`/utils`)

### Planned

- [ ] View other characters on servers you share
- [ ] View character profiles via direct link ([like this](https://inconnu.app/profile/680d32cbc0bf6151dbd5004e), but much nicer-looking)
- [ ] **STs:** View your players' full sheets
- [ ] **STs:** View Rolepost changelogs
- [ ] Port over https://docs.inconnu.app

### Maybe

* Update your characters' traits, profiles
* View, edit, & create macros
* View XP logs (surprisingly tricky)

### Not planned

* Character image uploads

## Setup

### Env vars

* `AUTH_SECRET`: Run `npx auth`
* `AUTH_DISCORD_ID`: Bot client ID
* `AUTH_DISCORD_SECRET`: Bot OAuth2 secret
* `DATABASE_URL`: local.db
* `API_KEY`: Inconnu API key
* `INCONNU_API_URL`: http://localhost:8000

### Run

1. Get [https://github.com/tiltowait/inconnu](Inconnu) running
2. Run the following commands

```sh
npm i
npm run dev
```
