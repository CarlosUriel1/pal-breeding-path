# Third-party notices

## Palworld Smart Breeder save reader

- Source: https://github.com/JohnnyDalvi/Palworld_Smart_Breeder
- Revision used: `cbf272afa5aadae8d01eafd1a70d7f1782fe8872`
- Files adapted: `web/savparse.js`, `data/passive_name_map.json`
- License: GNU GPL v3.0 (`LICENSE`)

The local app maps the parser output to its own Pal dataset and runs the parser in a Web Worker.

## ooz-wasm

- Source: https://github.com/powzix/ooz
- Bundled file: `src/vendor/ooz.js`
- Purpose: Kraken/Oodle decompression for modern Palworld `PlM` saves
- License: GNU GPL v3.0 or later (`LICENSES/ooz-wasm-GPL-3.0.txt`)

Vendored as a precompiled wasm+glue build (Emscripten output). The exact upstream revision was not
recorded when the build was bundled; the C++ source is available at the upstream repository above.

## PalCalc localization data

- Source: https://github.com/tylercamp/palcalc
- Revision used: `905335b2743e5cbd3cc402099b56e0bb515d7fea`
- Data adapted: English, Spanish and Spanish (Mexico) passive names/descriptions
- License: MIT (`LICENSES/palcalc-MIT.txt`)

## PalBreed (palbreed.com)

- Source: https://palbreed.com/breeding-path
- Data adapted: the breeding engine was reimplemented from the site's minified JavaScript bundle
  (PalBreed does not publish its source code); `src/data/pals.json` was extracted from that same
  bundle, and the 299 Pal icons in `public/pals/` were downloaded from its CDN
- License: none published

PalBreed is not open source and grants no license for these assets. They are used here only in this
personal, non-commercial reimplementation; see the README for scope and validation details.

## Game content

Palworld names, data and images are property of Pocketpair, Inc. They are included only for
identification in this unofficial, non-commercial fan utility and are not covered by the software
license above.
