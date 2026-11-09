# Swipe City — Asset Brief

Swipe City is a true 3D game (Three.js). It is fully playable with built-in placeholder
art. Drop a file with the **exact name below** into the listed folder and the game uses
it automatically; if a file is missing, the placeholder stays.

Art only loads when the game is served over http(s), e.g. GitHub Pages. Opening
`index.html` straight from disk always shows placeholders (a browser security rule).

## 1. Images the game loads today

Make these with an image generator. All PNG.

| Done | File | Folder | Size (px) | Transparent | Used for |
|------|------|--------|-----------|-------------|----------|
| [ ] | `roof.png` | `assets/world/` | 1024×1024 | no, seamless tile | Surface of the rooftops you run on |
| [ ] | `facade.png` | `assets/world/` | 1024×1024 | no, seamless tile | Walls of every building |
| [ ] | `sky.png` | `assets/world/` | 2048×1024 | no | Sky behind the city |
| [ ] | `billboard.png` | `assets/world/` | 1024×512 | no | Poster on the billboard obstacle |
| [ ] | `face.png` | `assets/characters/` | 512×512 | no | Default face of the runner (your face) |
| [ ] | `logo.png` | `assets/ui/` | 1024×512 | yes | Title screen logo |

### Prompts

Start every prompt with this style line so the set matches:

```
stylized 3D game art, hand-painted look, clean shapes, soft sunny daylight, saturated colors
```

| File | Prompt (after the style line) |
|------|-------------------------------|
| `roof.png` | `Seamless tileable texture of a flat city rooftop surface seen straight from above, terracotta brick pavers in a running bond pattern, even lighting, no objects, no shadows, no text.` |
| `facade.png` | `Seamless tileable texture of a painted wooden plank townhouse wall seen straight on, even grid of white-framed windows with flower boxes, no perspective, no sky, no text.` |
| `sky.png` | `Wide panoramic daytime sky only, clear blue at the top fading to pale haze near the bottom, a few soft clouds, no buildings, no ground, no sun disc, no text.` |
| `billboard.png` | `Flat rectangular advertising poster with bold abstract shapes and bright colors, straight-on view filling the whole frame, no text, no logos, no people.` |
| `logo.png` | `Game logo with the words "Swipe City" in bold italic playful 3D lettering, a small rooftop skyline worked into the letters, transparent background.` |

`face.png` is a photo, not a generated image: a front-facing head shot, cropped square
and close (forehead to chin), even lighting, neutral background. It becomes the runner's
default face for everyone who plays. Each player can also set their own face in the game
under **Customize runner**; that photo is stored only in their browser.

Reminders: straight-on views, no perspective, consistent lighting, no text inside any
image except the logo, original designs only.

## 2. Customizing the runner

Built into the title screen, no files needed: skin, hair, top and pants colors, plus a
face photo. The runner is assembled from simple 3D shapes so every part can be recolored.

## 3. 3D models (optional, not wired yet)

A realistic character and realistic props need 3D models, which an image generator
cannot make. If you get models (`.glb` format), tell me and I will wire them in. Planned
names:

| File | Folder | Notes |
|------|--------|-------|
| `runner.glb` | `assets/characters/` | Rigged, with animation clips named `run`, `jump`, `slide`, `crash` |
| `obstacle_low_1.glb`, `obstacle_low_2.glb` | `assets/world/` | Jump over, about 1.8 m wide × 0.75 m tall |
| `obstacle_high_1.glb`, `obstacle_high_2.glb` | `assets/world/` | Slide under, clear space below 1.15 m |
| `obstacle_block_1.glb`, `obstacle_block_2.glb` | `assets/world/` | Fills the lane, about 1.8 m wide × 2.6 m tall |
| `coin.glb` | `assets/world/` | About 0.65 m across |

A custom photo face only works on the built-in runner. A `runner.glb` would replace it.

## 4. Audio — `assets/audio/`

Not used yet.
