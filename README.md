# Palworld Breeding Path (local y privado)

Aplicación local inspirada en [PalBreed · Breeding Path](https://palbreed.com/breeding-path),
hecha en Vite + React para uso personal. No es un fork literal: PalBreed no publica su código
fuente. La interfaz, los planificadores y la importación son una implementación independiente.

El modo principal calcula con los ejemplares exactos del guardado y combina tres criterios:

1. la especie del Pal objetivo;
2. el sexo compatible de cada pareja;
3. hasta cuatro pasivas deseadas que ya existan en la colección importada.

Consulta la [guía completa de uso, privacidad y formatos](docs/GUIA-USO-Y-FORMATO.md) para seguir el
flujo desde el save hasta el árbol de crianza y revisar los esquemas JSON admitidos.

## Abrir en Windows

Haz doble clic en `start-local.cmd`. El script instala las dependencias si hacen falta e inicia la
app. Después abre `http://127.0.0.1:5199`; solo escucha en la computadora local.

También puedes iniciarla desde una terminal:

```bash
npm install
npm run dev
```

Abre http://127.0.0.1:5199.

## Cargar tus Pals desde el juego

1. Abre **Importar save → Elegir carpeta SaveGames**.
2. Selecciona `%LOCALAPPDATA%\Pal\Saved\SaveGames`.
3. Elige el mundo; la app combina `Level.sav`, `LevelMeta.sav`, `WorldOption.sav` y `Players/*.sav`.
4. Marca uno o varios jugadores. Sus archivos `_dps.sav` compartidos se incluyen automáticamente.
5. También puedes usar **Elegir Level.sav** para cargar solo ese archivo, sin separar jugadores.

Los archivos se leen en un Web Worker dentro de tu navegador. No se suben, no hay servidor de datos,
telemetría, anuncios ni recursos web externos. La colección normalizada se guarda en IndexedDB y
los `.sav` originales no se conservan.

Se importan especie, sexo, nivel, apodo, ubicación, pasivas e IVs de cada ejemplar. El planificador
usa esos ejemplares como nodos de origen, exige parejas macho/hembra y transporta las pasivas
seleccionadas por las generaciones intermedias. Los IV de HP/ATK/DEF se muestran como información,
pero todavía no son una condición ni un objetivo de optimización.

Formatos compatibles: `PlM1` (Oodle/Kraken, Palworld moderno), `PlZ1`, `PlZ2` y GVAS ya
descomprimido. Los contenedores Xbox `CNK` aún no son compatibles. El selector omite carpetas
`backup` y limita cada archivo a 512 MiB.

## Flujo de uso

1. **Importar save** carga la colección y muestra cada Pal real con su sexo y sus pasivas.
2. **Objetivo** permite buscar y elegir la especie final.
3. **Pasivas deseadas** permite elegir hasta cuatro de las que realmente están presentes en tus
   Pals. La búsqueda reconoce los nombres en español e inglés.
4. **Ruta de crianza** muestra cada cruce como `padre + madre → hijo`, con los estados
   `PROPIO`, `CRIAR PRIMERO` y `OBJETIVO`.
5. **Árbol de crianza** muestra las mismas dependencias en forma jerárquica.
6. **Guardadas** conserva localmente las configuraciones que quieras reutilizar. Las rutas de un
   save solo se habilitan mientras esté cargada la misma colección, porque se recalculan al abrirlas.

El botón **Guía** abre un menú de instrucciones para cada apartado, disponible en español e inglés.

### Pasivas bilingües y archivo personalizado

La app incluye el catálogo oficial de 115 pasivas en inglés, español y español de México. En
**Pasivas deseadas → Añadir traducciones JSON** puedes superponer nombres o descripciones propios.
Consulta `examples/passives.custom.example.json` para ver el formato. El identificador interno debe
coincidir con el que aparece en el save; los textos son libres.

### Qué garantiza el resultado

La especie y la compatibilidad de sexo de la ruta se calculan de forma determinista. La herencia de
pasivas y el sexo obtenido en cada huevo son probabilísticos: la cifra mostrada cuenta cruces
exitosos del plan, no una estimación de huevos. Puede ser necesario repetir un cruce hasta obtener el
hijo correcto. Las pasivas adicionales se marcan como competidoras para ayudarte a elegir los
ejemplares más limpios.

El modo **Seleccionar manualmente** sigue disponible cuando no quieras importar un save. Ese modo
calcula por especies poseídas y no intenta resolver sexo ni pasivas individuales.

## Estructura

| Ruta | Qué es |
| --- | --- |
| `src/engine/breeding.js` | Motor por especies: pool criable, combos únicos, fórmula de rank `(a+b+1)>>1`, ruta más corta y árbol. |
| `src/engine/collectionPlanner.js` | Planificador por ejemplar, sexo y conjunto de pasivas; se ejecuta en un Web Worker. |
| `src/import/` | Descompresión, lector GVAS, Web Worker, selector de mundos y persistencia local de la colección. |
| `src/vendor/ooz.js` | Descompresor Kraken/Oodle público usado por los saves modernos. |
| `src/data/pals.json` | Data completa de los 299 pals (stats, elementos, skills, drops, combos, combiRank…) extraída del bundle de palbreed.com. |
| `src/data/passives_i18n.json` | Catálogo bilingüe de pasivas generado desde las localizaciones de PalCalc. |
| `public/pals/*.png` | Iconos de los 299 pals. |
| `src/components/` | Importador, lista exacta, selectores, guía, ruta, árbol y planes guardados. |
| `tools/refresh-data.mjs` | Re-extrae data e iconos del sitio (`node tools/refresh-data.mjs`) cuando salga contenido nuevo del juego. |
| `tools/build-passive-catalog.mjs` | Regenera el catálogo de traducciones desde una copia local de PalCalc. |

## Fidelidad del motor

El motor portado se validó contra el motor original del sitio (ejecutado aislado en Node):
`calculateChild` en los 297×297×2 pares posibles y `findShortestPath` en 2000 casos aleatorios
dieron resultados idénticos (score, pasos y árbol).

## Límites conocidos

- Los contenedores Xbox `CNK` todavía no se pueden importar.
- Al cargar la carpeta completa, los Pals de base sin propietario verificable se excluyen; los
  almacenes dimensionales `_dps.sav` se incluyen como compartidos sin duplicarlos.
- El resultado no garantiza una tirada concreta de herencia de pasivas.
- Los IV no forman parte de la búsqueda.
- La base de datos debe actualizarse cuando Pocketpair cambie especies, cruces o pasivas.

## Licencia y créditos

El lector GVAS se adaptó de
[JohnnyDalvi/Palworld_Smart_Breeder](https://github.com/JohnnyDalvi/Palworld_Smart_Breeder),
basado a su vez en `palworld-save-tools`. Los saves modernos se descomprimen con `ooz-wasm`.
Esos componentes requieren GPL-3.0, por lo que el código de esta app se entrega bajo GPL-3.0;
consulta `LICENSE` y `THIRD_PARTY_NOTICES.md`.

Los nombres y las descripciones localizadas de pasivas se adaptaron de
[PalCalc](https://github.com/tylercamp/palcalc), bajo licencia MIT.

Palworld, sus nombres, datos e imágenes pertenecen a Pocketpair. Esta es una utilidad fan no oficial.
