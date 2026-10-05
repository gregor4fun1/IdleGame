// PLATZHALTER für economy.js (Gebiet A, Angelika). Nur zum Testen von Gebiet B, bis economy.js vorliegt.
// Formeln laut Dokument A1 bis A6. Sobald economy.js da ist, diese Datei löschen.

function unlockCost(level) {
  return freischaltKosten(level);
}

function autoCost(level, character, speedFactor) {
  const c = character;
  return autoFarmingKosten(level, c.herkunft, c.augenfarbe, c.haarfarbe, c.name, c.glueck) * speedFactor;
}

function cooldownSec(level) {
  return Math.min(1 + 0.5 * (level - 1), 5);
}

function clickIncome(level) {
  return 2 * 5 ** (level - 1);
}

function autoIncomePerSec(level) {
  return clickIncome(level) / cooldownSec(level);
}

function speedFactor(level, durationSec) {
  if (level === 1) return 1;
  const referenz = Math.min(30 + 14 * (level - 2), 145);
  return Math.min(Math.max(durationSec / referenz, 0.75), 1.25);
}
