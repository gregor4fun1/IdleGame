// Kostenkurven für das Idle-Game (30 Level)

const MAX_LEVEL = 30;
const BASIS_PREIS = 10;       // Preis von Level 1
const WACHSTUM = 5;           // Level n+1 kostet 5x so viel wie Level n → Level 30 ≈ 1,9 AC
const AUTO_FAKTOR = 5;        // Auto-Farming kostet 5x den Freischaltpreis

function pruefeLevel(level) {
  if (!Number.isInteger(level) || level < 1 || level > MAX_LEVEL) {
    throw new RangeError(`Level muss eine ganze Zahl zwischen 1 und ${MAX_LEVEL} sein`);
  }
}

// Algorithmus 1: Freischaltkosten pro Level
// Eingabe: level (1–30) → Ausgabe: Preis
function freischaltKosten(level) {
  pruefeLevel(level);
  return Math.round(BASIS_PREIS * WACHSTUM ** (level - 1));
}

// Macht aus einem Text eine feste Zahl zwischen 0 und 1 (gleicher Text → gleiche Zahl)
function textZuZahl(text) {
  let hash = 0;
  for (const zeichen of String(text).toLowerCase().trim()) {
    hash = (hash * 31 + zeichen.charCodeAt(0)) % 1000003;
  }
  return hash / 1000003;
}

// Algorithmus 2: Auto-Farming-Kosten pro Level
// Eingabe: level, herkunft, augenfarbe, haarfarbe, name, glueck (0–1) → Ausgabe: Preis
function autoFarmingKosten(level, herkunft, augenfarbe, haarfarbe, name, glueck) {
  pruefeLevel(level);
  if (typeof glueck !== "number" || glueck < 0 || glueck > 1) {
    throw new RangeError("Glücksfaktor muss zwischen 0 und 1 liegen");
  }

  // Der Spieler bestimmt den Wachstumsfaktor (5,0 bis 6,0), nicht nur einen Aufschlag.
  // Dadurch gehen die Kurven verschiedener Spieler mit jedem Level weiter auseinander.
  // Untergrenze = WACHSTUM → Auto-Farming kostet nie weniger als AUTO_FAKTOR × Freischaltpreis.
  const profil = textZuZahl([herkunft, augenfarbe, haarfarbe, name].join("|")); // 0–1, fest pro Spieler
  const wachstum = WACHSTUM + profil * 0.6 + (1 - glueck) * 0.4; // Profil bis +0,6, Pech bis +0,4

  return Math.round(BASIS_PREIS * AUTO_FAKTOR * wachstum ** (level - 1));
}

// Skalierte Zahlendarstellung: 1.5K, 2.3M, 4B, 7T, 1AA, 3AB, ...
const EINHEITEN = ["", "K", "M", "B", "T"];
function formatiere(betrag) {
  let i = 0;
  while (betrag >= 1000) { betrag /= 1000; i++; }
  const einheit = i < EINHEITEN.length ? EINHEITEN[i] : "A" + String.fromCharCode(65 + i - EINHEITEN.length);
  return (i ? betrag.toFixed(1) : Math.round(betrag)) + einheit;
}

// Selbsttest: node kostenkurve.js
if (typeof require !== "undefined" && require.main === module) {
  const assert = require("assert");
  assert.strictEqual(freischaltKosten(1), 10);
  for (let l = 2; l <= MAX_LEVEL; l++) assert(freischaltKosten(l) > freischaltKosten(l - 1));
  assert.throws(() => freischaltKosten(0));
  assert.throws(() => freischaltKosten(31));

  const spieler = ["Österreich", "blau", "braun", "Gregor"];
  const a = autoFarmingKosten(5, ...spieler, 0.5);
  assert.strictEqual(a, autoFarmingKosten(5, ...spieler, 0.5));       // deterministisch
  assert(autoFarmingKosten(5, ...spieler, 1) < autoFarmingKosten(5, ...spieler, 0)); // Glück senkt Preis
  assert.throws(() => autoFarmingKosten(5, ...spieler, 2));
  for (let l = 1; l <= MAX_LEVEL; l++) {
    assert(autoFarmingKosten(l, ...spieler, 1) >= freischaltKosten(l) * AUTO_FAKTOR); // nie billiger als Untergrenze
  }

  assert.strictEqual(formatiere(999), "999");
  assert.strictEqual(formatiere(1500), "1.5K");
  assert.strictEqual(formatiere(2e12), "2.0T");
  assert.strictEqual(formatiere(1e15), "1.0AA");
  assert.strictEqual(formatiere(3e18), "3.0AB");

  for (let l = 1; l <= MAX_LEVEL; l++) {
    console.log(`Level ${l}: freischalten ${formatiere(freischaltKosten(l))}, auto-farming ${formatiere(autoFarmingKosten(l, ...spieler, 0.5))}`);
  }
  console.log("OK");
}

if (typeof module !== "undefined") module.exports = { freischaltKosten, autoFarmingKosten, formatiere };
