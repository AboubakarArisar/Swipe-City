# Swipe City

**Don't look down.**

An endless 3D rooftop runner for the browser. Sprint across the city skyline, switch
between three lanes, jump the gaps, slide under obstacles and grab coins.

**Play:** https://aboubakararisar.github.io/Swipe-City/

![Screenshot placeholder](assets/ui/screenshot.png)

## How to play

| Action | Keyboard | Touch |
|--------|----------|-------|
| Change lane | Left / Right or A / D | Swipe left / right |
| Jump | Up, W or Space | Swipe up |
| Slide | Down or S | Swipe down |
| Pause | P or Esc | Pause button |

- Jump over low obstacles and the gaps between rooftops.
- Slide under billboards and pipes.
- Switch lanes around water tanks and stairwell huts.
- The shield absorbs one hit. The magnet pulls in nearby coins for 8 seconds.
- Score = distance in metres + 10 per coin. Your best score is saved in the browser.

## Make the runner yours

On the title screen open **Customize runner** to pick skin, hair, top and pants colors
and to put your own face on the runner from a photo. The photo never leaves your device.

## Run locally

No build step. Open `index.html` in a browser, or serve the folder:

```
python -m http.server 8000
```

Custom art in `assets/` only loads when served over http(s). See [ASSETS.md](ASSETS.md)
for the file list.

## Credits

- Game and art by Aboubakar Arisar
- 3D rendering with [three.js](https://threejs.org/) (MIT), bundled in `vendor/`

## License

MIT. See [LICENSE](LICENSE).
