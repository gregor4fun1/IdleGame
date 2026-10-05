// Gebiet A (Angelika): reine Formeln, keine Spielzustands- oder DOM-Zugriffe.
// Browser: kostenkurve.js zuerst laden. Node: require('./economy.js').
// CONFIG wird aus der gemeinsamen Quelle kostenkurve.js unverändert exportiert.
(function (root) {
  const kosten = typeof module !== 'undefined' && module.exports
    ? require('./kostenkurve.js')
    : { CONFIG, pruefeLevel, charakterWachstum, freischaltKosten, autoFarmingKosten };
  const config = kosten.CONFIG;

  function unlockCost(level) {
    // Level 1 hat den rechnerischen Preis 10; newGame stellt es kostenlos bereit.
    return kosten.freischaltKosten(level);
  }
  function growthFactor(character) { return kosten.charakterWachstum(character); }
  function speedFactor(level, durationSec) {
    kosten.pruefeLevel(level);
    if (!Number.isFinite(durationSec) || durationSec < 0) {
      throw new RangeError('Freischaltdauer muss eine endliche Zahl ab 0 sein');
    }
    if (level === 1) return 1;
    const reference = Math.min(config.referenceBase + config.referenceStep * (level - 2), config.referenceMax);
    return Math.max(config.speedMin, Math.min(config.speedMax, durationSec / reference));
  }
  function autoCost(level, character, factor) {
    kosten.pruefeLevel(level);
    if (!Number.isFinite(factor) || factor < config.speedMin || factor > config.speedMax
        || (level === 1 && factor !== 1)) {
      throw new RangeError('Ungültiger Freischaltdauer-Faktor (Level 1: 1; sonst 0,75 bis 1,25)');
    }
    // growthFactor prüft auch fehlende Eigenschaften, bevor darauf zugegriffen wird.
    growthFactor(character);
    return kosten.autoFarmingKosten(level, character.herkunft, character.augenfarbe,
      character.haarfarbe, character.name, character.glueck) * factor;
  }
  function clickIncome(level) {
    kosten.pruefeLevel(level);
    return config.clickBase * config.incomeGrowth ** (level - 1) * config.incomeMultiplier;
  }
  function cooldownSec(level) {
    kosten.pruefeLevel(level);
    return Math.min(config.cooldownBase + config.cooldownStep * (level - 1), config.cooldownMax);
  }
  function autoIncomePerSec(level) { return clickIncome(level) / cooldownSec(level); }

  const api = { CONFIG: config, unlockCost, autoCost, clickIncome, autoIncomePerSec,
    cooldownSec, growthFactor, speedFactor };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else {
    // CONFIG ist bereits ein globales const im vorher geladenen kostenkurve.js.
    for (const key of Object.keys(api)) if (key !== 'CONFIG') root[key] = api[key];
  }
})(globalThis);
