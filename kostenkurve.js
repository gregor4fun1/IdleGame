// Kostenkurven für das Idle-Game (30 Level)

// Gemeinsame Konfiguration für Kostenkurven und economy.js.
// Sie steht im zuerst geladenen Skript, damit auch die bestehende Kurven-Seite
// und `node kostenkurve.js` ohne zusätzliche Browser-Skripte funktionieren.
const CONFIG = Object.freeze({
  maxLevel: 30,
  unlockBase: 10, unlockGrowth: 5, autoMultiplier: 5,
  growthMin: 5, profileWeight: 0.3, badLuckWeight: 0.2,
  hashMultiplier: 31, hashModulus: 1000003,
  clickBase: 2, incomeGrowth: 5, incomeMultiplier: 1,
  cooldownBase: 1, cooldownStep: 0.5, cooldownMax: 5,
  speedMin: 0.75, speedMax: 1.25,
  referenceBase: 30, referenceStep: 14, referenceMax: 160,
  manualEfficiency: 0.8, manualLevels: 2,
  targetMinMinutes: 60, targetMaxMinutes: 120,
  nameMaxLength: 20,
  herkunft: Object.freeze(["Österreich", "Deutschland", "Schweiz", "Italien", "Ungarn", "Türkei",
    "Kroatien", "Serbien", "Polen", "anderes Land"]),
  augenfarbe: Object.freeze(["blau", "braun", "grün", "grau"]),
  haarfarbe: Object.freeze(["schwarz", "braun", "blond", "rot", "grau"]),
});
// Bestehende Schnittstellen von Gebiet B und den alten Kostenkurven.
const MAX_LEVEL = CONFIG.maxLevel;
const BASIS_PREIS = CONFIG.unlockBase;
const WACHSTUM = CONFIG.unlockGrowth;
const AUTO_FAKTOR = CONFIG.autoMultiplier;

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
    hash = (hash * CONFIG.hashMultiplier + zeichen.charCodeAt(0)) % CONFIG.hashModulus;
  }
  return hash / CONFIG.hashModulus;
}

// Algorithmus 2: Auto-Farming-Kosten pro Level
// Eingabe: level, herkunft, augenfarbe, haarfarbe, name, glueck (0–1) → Ausgabe: Preis
function pruefeCharakter(character) {
  if (!character || typeof character !== "object") throw new TypeError("Charakter fehlt");
  for (const key of ["herkunft", "augenfarbe", "haarfarbe", "name"]) {
    if (typeof character[key] !== "string" || !character[key].trim()) {
      throw new TypeError(`Charakter-Eigenschaft ${key} fehlt oder ist leer`);
    }
  }
  if (character.name.trim().length > CONFIG.nameMaxLength) {
    throw new RangeError(`Name darf höchstens ${CONFIG.nameMaxLength} Zeichen haben`);
  }
  if (!Number.isFinite(character.glueck) || character.glueck < 0 || character.glueck > 1) {
    throw new RangeError("Glücksfaktor muss eine endliche Zahl zwischen 0 und 1 sein");
  }
}

function charakterWachstum(character) {
  pruefeCharakter(character);
  const profil = textZuZahl([character.herkunft, character.augenfarbe,
    character.haarfarbe, character.name.trim()].join("|"));
  return CONFIG.growthMin + profil * CONFIG.profileWeight
    + (1 - character.glueck) * CONFIG.badLuckWeight;
}

function autoFarmingKosten(level, herkunft, augenfarbe, haarfarbe, name, glueck) {
  pruefeLevel(level);
  const wachstum = charakterWachstum({ herkunft, augenfarbe, haarfarbe, name, glueck });
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

if (typeof module !== "undefined") module.exports = { CONFIG, pruefeLevel, pruefeCharakter, charakterWachstum, textZuZahl, freischaltKosten, autoFarmingKosten, formatiere };
