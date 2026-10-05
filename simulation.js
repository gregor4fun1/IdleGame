// Gebiet A: ereignisbasierte Simulation A7. Nur Node, keine Bibliotheken.
// node simulation.js [--json] [--no-bonus]
const economy = require('./economy.js');
const { CONFIG, unlockCost, autoIncomePerSec, speedFactor, growthFactor, autoCost } = economy;

function simulate({ growth = 5.25, character, bonus = true } = {}) {
  if (character !== undefined) growth = growthFactor(character);
  const maxGrowth = CONFIG.growthMin + CONFIG.profileWeight + CONFIG.badLuckWeight;
  if (!Number.isFinite(growth) || growth < CONFIG.growthMin || growth > maxGrowth) {
    throw new RangeError('Wachstumsfaktor außerhalb des konfigurierten Bereichs');
  }
  let balance = 0, timeSec = 0, unlocked = 1;
  const levels = Array.from({ length: CONFIG.maxLevel }, (_, i) => ({
    level: i + 1, auto: false, factor: 1, unlockedAt: i === 0 ? 0 : null,
    unlockDuration: i === 0 ? 0 : null, autoAt: null,
  }));
  const purchases = [];
  while (unlocked < CONFIG.maxLevel || levels.some(level => !level.auto)) {
    const available = levels.slice(0, unlocked);
    const automatic = available.filter(l => l.auto).reduce((sum, l) => sum + autoIncomePerSec(l.level), 0);
    const manual = available.filter(l => !l.auto).map(l => autoIncomePerSec(l.level))
      .sort((a, b) => b - a).slice(0, CONFIG.manualLevels).reduce((sum, income) => sum + income, 0)
      * CONFIG.manualEfficiency;
    const rate = automatic + manual;
    const candidates = [];
    // Bei Gleichstand zuerst das nächste Level, dann Auto-Farming nach Levelnummer.
    if (unlocked < CONFIG.maxLevel) candidates.push({ type: 'level', level: unlocked + 1, price: unlockCost(unlocked + 1) });
    for (const l of available.filter(l => !l.auto)) {
      const price = character !== undefined ? autoCost(l.level, character, l.factor)
        : Math.round(CONFIG.unlockBase * CONFIG.autoMultiplier * growth ** (l.level - 1)) * l.factor;
      candidates.push({ type: 'auto', level: l.level, price });
    }
    candidates.sort((a, b) => a.price - b.price);
    const next = candidates[0];
    const waitSec = Math.max(0, (next.price - balance) / rate);
    if (!Number.isFinite(waitSec) || rate <= 0) throw new Error('Simulation kann nicht fortschreiten');
    timeSec += waitSec;
    balance = Math.max(0, balance + rate * waitSec - next.price);
    const level = levels[next.level - 1];
    if (next.type === 'level') {
      level.unlockDuration = timeSec - levels[next.level - 2].unlockedAt;
      level.unlockedAt = timeSec;
      level.factor = bonus ? speedFactor(next.level, level.unlockDuration) : 1;
      unlocked++;
    } else {
      level.auto = true;
      level.autoAt = timeSec;
    }
    purchases.push({ ...next, timeSec, waitSec, balance });
  }
  const minutes = timeSec / 60;
  return { growth, bonus, timeSec, minutes, balance, levels, purchases,
    withinTarget: minutes >= CONFIG.targetMinMinutes && minutes <= CONFIG.targetMaxMinutes };
}

if (require.main === module) {
  const results = [5, 5.25, 5.5].map(growth => simulate({ growth, bonus: !process.argv.includes('--no-bonus') }));
  if (process.argv.includes('--json')) console.log(JSON.stringify(results, null, 2));
  else {
    console.table(results.map(r => ({ Wachstum: r.growth, Bonus: r.bonus,
      Minuten: r.minutes.toFixed(2), Ziel: r.withinTarget ? 'OK' : 'ABWEICHUNG' })));
    console.table(results[0].levels.map((l, i) => ({ Level: l.level,
      ...Object.fromEntries(results.map(r => [`g=${r.growth}: Freischaltdauer (s)`, r.levels[i].unlockDuration.toFixed(2)]))
    })));
    console.log('Level 1 ist bei t=0 kostenlos offen. Gesamtdauer umfasst alle 59 Käufe einschließlich Auto-Farming.');
  }
  if (results.some(r => !r.withinTarget)) process.exitCode = 1;
}
module.exports = { simulate };
