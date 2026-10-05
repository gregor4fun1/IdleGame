// Strichmännchen (Gebiet C, Algorithmus C2): erzeugt für jedes Level eine eigene Figur als SVG-Text.
// Zeichenfläche 100 mal 140. Gesperrte Level sind grau und halb durchsichtig.
function stickFigureSvg(level, gesperrt = false) {
  // 37 und 360 haben keinen gemeinsamen Teiler, jedes der 30 Level bekommt einen anderen Farbton
  const farbe = gesperrt ? "#888" : `hsl(${(level * 37) % 360} 70% 45%)`;
  const zubehoer = [
    "",                                                                        // nichts
    `<path d="M30 18h40M38 18V4h24v14z" fill="${farbe}"/>`,                    // Hut
    `<path d="M35 26a15 15 0 0 1 30 0z" fill="${farbe}"/>`,                    // Helm
    `<path d="M75 50V118M68 118h14v8l-7 8l-7-8z" fill="${farbe}"/>`,           // Schaufel
    `<path d="M13 86h24v18H13z" fill="${farbe}"/><path d="M20 86v-6h10v6"/>`,  // Koffer
    `<path d="M37 18V5l7 7l6-9l6 9l7-7v13z" fill="${farbe}"/>`,                // Krone
  ][(level - 1) % 6];
  const rang = Math.floor((level - 1) / 10); // 0, 1 oder 2 Streifen auf dem Körper
  const streifen = [68, 78].slice(0, rang).map((y) => `<path d="M42 ${y}h16"/>`).join("");

  return `<svg viewBox="0 0 100 140" role="img" aria-label="Strichmännchen Level ${level}" fill="none"`
    + ` stroke="${gesperrt ? "#888" : "#222"}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"`
    + `${gesperrt ? ' opacity="0.5"' : ""}>`
    + `<circle cx="50" cy="30" r="13"/><path d="M50 43V95M50 60L25 80M50 60L75 80M50 95L30 130M50 95L70 130"/>`
    + `<g stroke="${farbe}">${zubehoer}<g stroke-width="5">${streifen}</g></g></svg>`;
}
