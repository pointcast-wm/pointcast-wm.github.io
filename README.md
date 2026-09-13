# PointCast project page

Anonymous project page for the ICRA 2027 submission *PointCast: One World
Model for Rigid, Articulated, and Deformable Object Manipulation*.

The page leads with the paper's two method figures (the pipeline and the
three attention patterns), then shows what the paper cannot: every-frame
rollout videos of the paper's own gallery episodes (simulation, the real PGND
benchmark, zero-shot captures) and the planning episodes. It carries the
abstract and one line of context per section; the paper's prose, tables and
result figures are not repeated. Tables that did not fit the paper sit in a
collapsed supplementary block.

One static page (`index.html`) plus `static/`. No build step, no external
scripts, no analytics. Layout adapted from the Academic Project Page Template
(Nerfies-derived, CC BY-SA 4.0); the only third-party file is
`static/css/bulma.min.css`.

## Layout

```
index.html                 the page
static/css/index.css       page styles (colors follow the paper's figure palette)
static/js/index.js         play clips while on screen, per-clip frame scrubber
                           (play/pause, step, slider), episode selector, copy BibTeX
static/images/*.png        the two method figures (paper Figs. 2 and 3), web-scaled,
                           metadata stripped
static/videos/*.mp4        rollout videos: one per simulated regime,
                           one per real category, one per zero-shot capture,
                           one per planning task
static/pdfs/               empty until the anonymized PDF is added
scripts/check_site.py      pre-publish gate (retired numbers, identifying strings)
```

## Before publishing

1. **Account and repository.** Serve this from a fresh account or
   organization named after the paper or neutrally, never from an account
   whose name identifies an author: a GitHub Pages URL carries the account
   name. For a user/organization site the repository is named
   `<account>.github.io` and Pages serves the default branch root.
2. **Commit identity.** Commit with a neutral author. The local git config
   of this checkout already sets one; verify with `git config user.name`
   before the first commit. Repository history is public.
3. **Links.** Replace the three pending buttons in the header (`Paper`,
   `Code`, `Dataset`) with `<a>` links once the assets exist: the anonymized
   PDF under `static/pdfs/`, an anonymized code mirror (never a personal
   remote), and the dataset host. Set `og:url` and an absolute `og:image` in
   the `<head>` once the URL is known.
4. **Gate.** Run the checker and require PASS on both checks:

   ```
   python3 scripts/check_site.py --registry <path to the paper's cell_provenance.json> \
                                 --banned <path to a file of identifying strings, kept outside this repo>
   ```

   It scans the authored pages for every value in the paper registry's
   `retired` list, and every file (text, file names, image metadata, video
   metadata) for identifying strings. Neither input lives in this repository.
5. **Robots.** The page ships with `noindex, nofollow`. Remove that meta tag
   after de-anonymization if the page should be indexed.

## Regenerating assets

The method figures are the paper's own figure assets, resized for the web
with their metadata dropped. The rollout videos play the paper's
galleries over time: the same episodes, cameras, crops and colours, every
frame of the rollout, stitched with ffmpeg (H.264, metadata stripped). The
planning videos re-render recorded planning episodes from stored simulator
states through the paper's render hook. The commands live in the paper's
private build notes, not here.
