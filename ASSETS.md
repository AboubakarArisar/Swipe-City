# Swipe City — Asset Brief

Everything the game can load. The game runs with colored-shape placeholders until a
file with the **exact name below** exists in the listed folder — drop a PNG in and it
is picked up automatically. Tick items off as you make them.

## 1. Pick an art direction

| # | Direction | Palette |
|---|-----------|---------|
| A | **Bright cartoon, 2014 mobile** — chunky shapes, thick outlines, saturated daylight | sky `#4FC3F7`, roof `#FF7043`, accent `#FFD54F`, outline `#263238`, cloud `#FFFFFF` |
| B | **Neon night city** — dark rooftops, glowing signs and rim light | sky `#0D0B2B`, roof `#1F1B4D`, neon pink `#FF2E93`, neon cyan `#00E5FF`, coin `#FFE600` |
| C | **Sunset pastel** — soft gradients, long shadows, calm and warm | sky `#FFB199` → `#8E7CC3`, roof `#5C4B7A`, accent `#FFE29A`, highlight `#FF7E8A` |

## 2. Questions for you

**Character**
1. What is the runner's look / vibe (parkour kid, courier, street artist, …)?
2. Gender, or none — a robot, animal, or mascot?
3. Outfit and one signature item (hoodie, scarf, backpack, headphones, …)?
4. Is there a chaser / enemy behind the runner? If yes, what is it?

**World**
1. City type — generic modern, futuristic, or a specific home-city vibe?
2. Time of day (should agree with the direction you picked)?
3. Which obstacles do you want? Defaults: AC unit + roof vent (low), laundry line +
   billboard frame (high), water tank + stairwell hut (full block).

## 3. Asset list

All PNG. Sprite sheets are laid out **horizontally**, every frame the same size,
no padding between frames.

### Characters — `assets/characters/`

| File | Size (px) | Frame | Frames | Transparent |
|------|-----------|-------|--------|-------------|
| `runner_run.png` | 1024×128 | 128×128 | 8 | yes |
| `runner_jump.png` | 384×128 | 128×128 | 3 | yes |
| `runner_slide.png` | 256×128 | 128×128 | 2 | yes |
| `runner_crash.png` | 384×128 | 128×128 | 3 | yes |
| `chaser_run.png` *(optional)* | 1024×128 | 128×128 | 8 | yes |

### World — `assets/world/`

| File | Size (px) | Frame | Frames | Transparent |
|------|-----------|-------|--------|-------------|
| `roof_tile.png` | 256×256 | — | 1 | no (tiles seamlessly) |
| `roof_edge.png` | 256×64 | — | 1 | yes |
| `gap.png` | 256×256 | — | 1 | yes |
| `obstacle_low_1.png` | 128×64 | — | 1 | yes |
| `obstacle_low_2.png` | 128×64 | — | 1 | yes |
| `obstacle_high_1.png` | 128×128 | — | 1 | yes |
| `obstacle_high_2.png` | 128×128 | — | 1 | yes |
| `obstacle_block_1.png` | 128×192 | — | 1 | yes |
| `obstacle_block_2.png` | 128×192 | — | 1 | yes |
| `coin.png` | 384×64 | 64×64 | 6 | yes |
| `powerup_magnet.png` | 64×64 | — | 1 | yes |
| `powerup_shield.png` | 64×64 | — | 1 | yes |
| `bg_sky.png` | 1024×1024 | — | 1 | no |
| `bg_far.png` | 2048×512 | — | 1 | yes (tiles left↔right) |
| `bg_mid.png` | 2048×512 | — | 1 | yes (tiles left↔right) |

Notes: low obstacles are jumped over, high obstacles leave open space in their
bottom half to slide under, block obstacles fill the lane.

### UI — `assets/ui/`

| File | Size (px) | Frames | Transparent |
|------|-----------|--------|-------------|
| `logo.png` | 1024×512 | 1 | yes |
| `btn_play.png` | 256×256 | 1 | yes |
| `btn_pause.png` | 128×128 | 1 | yes |
| `icon_coin.png` | 64×64 | 1 | yes |

### Audio — `assets/audio/`

Optional, not needed to play. Add later if you want sound.

## 4. Image-generation prompts

Replace `[STYLE]` everywhere with **one** of these lines so the whole set matches:

- **A:** `bright cartoon 2D mobile game art, chunky shapes, thick dark outlines, flat saturated colors, soft cel shading, sunny daylight`
- **B:** `neon night city 2D mobile game art, dark indigo shapes, glowing pink and cyan rim light, clean vector look, soft bloom`
- **C:** `sunset pastel 2D mobile game art, soft gradients, warm peach and lavender palette, long gentle shadows, clean flat shapes`

Replace `[RUNNER]` with your character description once you have answered section 2,
and reuse it word for word in every runner prompt.

**Reminders for every image:** transparent background (except sky and roof tile),
side view, same lighting direction (top-left), no text inside the image except the
logo, nothing cropped at the edges, original design — no existing game characters.

| File | Prompt |
|------|--------|
| `runner_run.png` | `[STYLE]. Sprite sheet, 8 frames in a single horizontal row, evenly spaced, of [RUNNER] in a full sprint cycle, side view facing right, same size and position in every frame, transparent background, no text.` |
| `runner_jump.png` | `[STYLE]. Sprite sheet, 3 frames in a single horizontal row: take-off, mid-air tuck, landing, of [RUNNER], side view facing right, transparent background, no text.` |
| `runner_slide.png` | `[STYLE]. Sprite sheet, 2 frames in a single horizontal row of [RUNNER] sliding low on one leg, side view facing right, transparent background, no text.` |
| `runner_crash.png` | `[STYLE]. Sprite sheet, 3 frames in a single horizontal row of [RUNNER] stumbling, tumbling, then sitting dazed, side view facing right, transparent background, no text.` |
| `chaser_run.png` | `[STYLE]. Sprite sheet, 8 frames in a single horizontal row of [CHASER] running, side view facing right, transparent background, no text.` |
| `roof_tile.png` | `[STYLE]. Seamless tileable texture of a flat city rooftop surface seen from above at a slight angle, gravel and tar panels, subtle seams, no objects, no text.` |
| `roof_edge.png` | `[STYLE]. Side view of a rooftop ledge with a low parapet wall and metal trim, horizontally tileable, transparent background, no text.` |
| `gap.png` | `[STYLE]. View down a narrow alley gap between two buildings, walls fading into darkness far below, transparent background around the edges, no text.` |
| `obstacle_low_1.png` | `[STYLE]. Single rooftop air-conditioning unit, low and wide, side view, game obstacle sprite, transparent background, no text.` |
| `obstacle_low_2.png` | `[STYLE]. Single low rooftop vent pipe cluster, side view, game obstacle sprite, transparent background, no text.` |
| `obstacle_high_1.png` | `[STYLE]. Laundry line strung between two poles with clothes hanging in the top half, empty space underneath, side view, game obstacle sprite, transparent background, no text.` |
| `obstacle_high_2.png` | `[STYLE]. Blank billboard frame on tall legs, panel in the top half, open space underneath, side view, game obstacle sprite, transparent background, no text.` |
| `obstacle_block_1.png` | `[STYLE]. Tall rooftop water tank on a stand, side view, game obstacle sprite, transparent background, no text.` |
| `obstacle_block_2.png` | `[STYLE]. Small rooftop stairwell hut with a closed door, tall, side view, game obstacle sprite, transparent background, no text.` |
| `coin.png` | `[STYLE]. Sprite sheet, 6 frames in a single horizontal row of a gold coin spinning on its vertical axis from face-on to edge-on and back, skyline silhouette embossed on the face, transparent background, no text.` |
| `powerup_magnet.png` | `[STYLE]. Single horseshoe magnet pickup icon with a soft glow, game power-up, transparent background, no text.` |
| `powerup_shield.png` | `[STYLE]. Single glowing bubble shield pickup icon, game power-up, transparent background, no text.` |
| `bg_sky.png` | `[STYLE]. Sky background only, smooth vertical gradient with a few soft clouds, no buildings, no text.` |
| `bg_far.png` | `[STYLE]. Distant city skyline silhouette, hazy and low contrast, wide panorama, seamlessly tileable left to right, transparent background above the buildings, no text.` |
| `bg_mid.png` | `[STYLE]. Mid-distance city buildings with windows, antennas and water towers, wide panorama, seamlessly tileable left to right, transparent background above the buildings, no text.` |
| `logo.png` | `[STYLE]. Game logo with the words "Swipe City" in bold playful lettering, a small rooftop skyline worked into the letters, transparent background.` |
| `btn_play.png` | `[STYLE]. Round game play button with a triangle play symbol, glossy, transparent background, no text.` |
| `btn_pause.png` | `[STYLE]. Round game pause button with two vertical bars, matching the play button, transparent background, no text.` |
| `icon_coin.png` | `[STYLE]. Single gold coin icon, face-on, skyline silhouette embossed, transparent background, no text.` |

Tip: most generators do not output exact sizes or true transparency. Generate large,
remove the background, then resize / slice to the sizes in section 3.
