# Palworld Breeding Path (local)

Clon local de [palbreed.com/breeding-path](https://palbreed.com/breeding-path) para uso personal,
hecho en Vite + React con código limpio y extensible (la página original no es open source y su
JS está minificado, así que se reconstruyó la app y se portó su motor de crianza).

## Correr

```bash
npm install
npm run dev
```

Abre http://localhost:5199.

## Qué hace

- **Mis Pals**: selecciona los Pals que tienes (se guardan en localStorage).
- **Objetivo**: elige el Pal que quieres obtener.
- **Ruta de crianza**: lista de cruzas paso a paso (con géneros cuando el combo único los exige).
- **Árbol de crianza**: la misma ruta como árbol de dependencias.
- **Guardadas**: guarda/carga combinaciones de origen + objetivo (localStorage).

## Estructura

| Ruta | Qué es |
| --- | --- |
| `src/engine/breeding.js` | Motor de crianza: pool criable, combos únicos, fórmula de rank `(a+b+1)>>1` con desempate por `combiPriority`, Dijkstra de ruta más corta y armado del árbol. |
| `src/data/pals.json` | Data completa de los 299 pals (stats, elementos, skills, drops, combos, combiRank…) extraída del bundle de palbreed.com. |
| `public/pals/*.png` | Iconos de los 299 pals. |
| `src/components/` | Picker, vista de ruta, vista de árbol y rutas guardadas. |
| `tools/refresh-data.mjs` | Re-extrae data e iconos del sitio (`node tools/refresh-data.mjs`) cuando salga contenido nuevo del juego. |

## Fidelidad del motor

El motor portado se validó contra el motor original del sitio (ejecutado aislado en Node):
`calculateChild` en los 297×297×2 pares posibles y `findShortestPath` en 2000 casos aleatorios
dieron resultados idénticos (score, pasos y árbol).

## Ideas de features

- Filtros por elemento / tipo de trabajo en el picker.
- Ver todas las parejas que producen un pal (`parentsOf` ya está en el motor, sin UI).
- Importar Pals desde el guardado del juego (`%localappdata%\Pal\Saved\SaveGames`).
- Costo estimado en huevos/tiempo por ruta.
