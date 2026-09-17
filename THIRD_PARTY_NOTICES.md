# Third-party notices

The code of this application is Copyright (C) 2026 CarlosUriel1 and is distributed under the
GNU GPL v3.0 (`LICENSE`). The components below carry their own terms.

## Palworld Smart Breeder save reader

- Source: https://github.com/JohnnyDalvi/Palworld_Smart_Breeder
- Revision used: `cbf272afa5aadae8d01eafd1a70d7f1782fe8872`
- Files adapted: `web/savparse.js`, `data/passive_name_map.json`
- License: GNU GPL v3.0 (`LICENSE`)

The app maps the parser output to its own Pal dataset and runs the parser in a Web Worker.

## ooz-wasm

- Source: https://github.com/powzix/ooz
- Bundled file: `src/vendor/ooz.js`
- Purpose: Kraken/Oodle decompression for modern Palworld `PlM` saves
- License: GNU GPL v3.0 or later, as stated in the license headers of the upstream source files
  (`LICENSES/ooz-wasm-GPL-3.0.txt`)

Vendored as a precompiled wasm+glue build (Emscripten output). The exact upstream revision was not
recorded when the build was bundled; the C++ source is available at the upstream repository above.

## PalCalc localization data

- Source: https://github.com/tylercamp/palcalc
- Revision used: `905335b2743e5cbd3cc402099b56e0bb515d7fea`
- Data adapted: English, Spanish and Spanish (Mexico) passive names/descriptions
- License: MIT (`LICENSES/palcalc-MIT.txt`)

## PalBreed (palbreed.com)

- Source: https://palbreed.com/breeding-path
- Breeding engine: `src/engine/breeding.js` is an independent reimplementation of the breeding
  rules observed on the site (PalBreed does not publish its source code). It contains no PalBreed
  code.
- Data: `src/data/pals.json` keeps only the breeding-related fields of each Pal (rank, priority,
  elements, special combos), which are game data published by Pocketpair, obtained through
  palbreed.com.
- Images: the 299 Pal icons in `public/pals/` are Pocketpair artwork obtained from palbreed.com.
- License: none published by PalBreed.

These materials are not covered by the GPL license of this repository. They are used in this
unofficial, non-commercial fan utility solely to identify Pals and reproduce the game's breeding
rules. If you hold rights over any of them and want them removed or credited differently, please
open an issue.

## Game content

Palworld names, data and images are property of Pocketpair, Inc. They are included only for
identification in this unofficial, non-commercial fan utility and are not covered by the software
license above.
