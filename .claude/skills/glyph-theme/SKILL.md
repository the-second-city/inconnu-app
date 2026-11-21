---
name: glyph-theme
description: Create, recolor, or tune a glyph (emoji) theme for the Discord bot with scripts/render-glyphs.mjs, checking its preview until every glyph reads on the theme's background and on Discord's light and dark themes. Use when asked to make, adjust, fix, or preview a glyph or emoji theme, or its colors.
---

# Glyph themes

`scripts/render-glyphs.mjs` draws the bot's emoji (damage boxes, Humanity diamonds, Hunger drops, dice) in a theme's colors. Its header documents every color flag and what it writes. Read it before starting; don't repeat it from memory.

A theme is only done once its preview checks out on all three of its panels:

1. The theme's own background (`--bg`), the one it's designed for
2. Discord Light (`#FFFFFF`)
3. Discord Dark (`#24242A`, its embed background)

The bot only shows emoji in embeds, so these are the embed backgrounds. People see the emoji on whichever Discord theme they use, not just the one the theme was designed for, so a glyph that vanishes on any panel is a bug.

## Steps

1. **Pick the colors.** For a saved theme (`THEMES` in the script), start from its entry. For a new theme, start from the user's palette or background and pick colors that suit it. The glyphs need to tell apart at a glance:
   - Superficial from Aggravated
   - filled from empty Humanity
   - Stains from filled Humanity
   - full from empty Hunger
   - normal dice from Hunger dice

   Pass every color you mean explicitly, including the optional ones. Their fallbacks (in the header) are only a starting point.

2. **Render it** into the scratchpad, not the repo:

   ```bash
   node scripts/render-glyphs.mjs <theme> <color flags...> --out <scratchpad>/<theme>
   ```

3. **Measure contrast** with this skill's checker. Pass every color the theme uses, named, and the same `--bg`:

   ```bash
   node .claude/skills/glyph-theme/contrast.mjs --bg '<top>,<bottom>' hale='#…' superficial='#…' …
   ```

   It prints each color's WCAG contrast against the background (both ends of a gradient), Discord Light, and Discord Dark. `!` marks ratios under 3:1, WCAG's minimum for graphics, and `!!` marks those under 2:1.

4. **Look at the preview.** Read `<out>/preview.png` with the Read tool, so you see the image. Numbers miss things the eye catches, and the reverse:
   - A glyph's details: the slash and cross in damage boxes, the cross on degeneration, the dice's ankh, stars, drips, and skull eyes. The Roll track draws them at 24px, about as Discord shows emoji inline, so judge them there, not just in the large row.
   - Neighbors that blur together, such as Superficial against Aggravated, or a Stain against filled Humanity.
   - A stroke that disappears and leaves a fill floating, or the other way round.

5. **Adjust and repeat** steps 2 to 4 until it passes (see the targets below). Change lightness first and keep each color's hue, so the theme keeps its character. Change one or two colors per round, and say which ones and why.

6. **Report** the final flags and their contrast table, and show the user the preview: give its full path, or Read it. Ask whether to save the colors as a `THEMES` entry. Only save them when the user says yes. A saved theme's colors go in `THEMES`; also update the example command in the header if the theme is `peach`.

## Targets

A color can rarely reach 3:1 on all three backgrounds. Against a light background such as peach, a color dark enough for the background is nearly too dark for Discord Dark. So:

- **On the theme's background:** every glyph should be at least 3:1. That's the background the theme is for.
- **On Discord Light and Discord Dark:** at least 2:1, with no `!!`. A glyph passes if its fill or its stroke reaches that, as long as the preview shows its shape clearly. For example, a dark Humanity fill with a lighter stroke still reads on Discord Dark.
- **Never ship a `!!` you haven't looked at.** If a glyph has `!!` on a panel, check that panel in the preview. If the glyph only reads because of a stroke, say so.

If the targets can't all be met, prefer the theme's background, then whichever Discord theme the user names, and tell the user what you traded away.

## Notes

- The output's `png/` and `svg/` folders are cleared on every run, so render into a folder that holds only this theme.
- Theme names prefix Discord emoji names (at most 32 characters), so a theme name is at most 20 characters. The script checks this.
- The glyphs' shapes come from the sheet's components (`src/lib/components/characters/glyphs/`); the dice import theirs from `glyphs/dice/shapes.ts`. This skill only changes colors. If a shape looks wrong, say so rather than editing the shapes.
