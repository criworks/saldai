#!/usr/bin/env node
/**
 * Genera `mobile/global.css` desde los tokens.
 *
 * Las variables CSS que usa NativeWind (`--card`, `--muted-foreground`, …) son
 * los mismos colores que ya están en `@saldai/ui/tokens`, pero en formato HSL.
 * Antes estaban escritas a mano y duplicadas en `:root` y en `.dark`, con el
 * hex de referencia en un comentario al lado, así que cualquier cambio de color
 * había que hacerlo en tres lugares y el comentario podía quedar mintiendo.
 *
 * Uso: `npm run tokens:css` desde mobile/ (o desde la raíz).
 * Con `--check` no escribe nada y falla si el archivo está desactualizado, que
 * es lo que corre CI.
 */
import { writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { semantic, radius, hexAHsl } from "@saldai/ui/tokens";

const destino = join(dirname(fileURLToPath(import.meta.url)), "..", "global.css");

const variables = Object.entries(semantic)
  .map(([nombre, hex]) => `    --${nombre}: ${hexAHsl(hex)}; /* ${hex} */`)
  .join("\n");

// El radio base de los componentes de react-native-reusables, en rem.
const radioBase = `    --radius: ${radius.md / 16}rem;`;

const bloque = `${variables}\n\n${radioBase}`;

// El tema es uno solo (la app es oscura), pero `.dark` tiene que existir porque
// NativeWind resuelve las clases con darkMode: "class".
const css = `/* ARCHIVO GENERADO — no editar a mano.
 *
 * Se genera desde packages/ui/tokens.js con \`npm run tokens:css\`.
 * Para cambiar un color, cambialo en los tokens y volvé a generar.
 */

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
${bloque}
  }

  .dark {
${bloque}
  }
}
`;

if (process.argv.includes("--check")) {
  const actual = readFileSync(destino, "utf8");
  if (actual !== css) {
    console.error(
      "mobile/global.css está desactualizado respecto a los tokens.\n" +
        "Corré `npm run tokens:css` y comiteá el resultado."
    );
    process.exit(1);
  }
  console.log("mobile/global.css está al día con los tokens.");
} else {
  writeFileSync(destino, css);
  console.log("mobile/global.css generado desde los tokens.");
}
