// Gebiet A: node economy.test.js. Unabhängige Beispiele, Grenzen und Integration.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const e = require('./economy.js');
const legacy = require('./kostenkurve.js');
const { simulate } = require('./simulation.js');
const c = { name: 'Angelika', herkunft: 'Österreich', augenfarbe: 'blau', haarfarbe: 'braun', glueck: 0.73 };
const original = JSON.stringify(c);
assert.strictEqual(e.CONFIG, legacy.CONFIG);
assert.equal(e.unlockCost(1), 10); // Startfreischaltung ist Aufgabe von newGame.
assert.equal(e.unlockCost(2), 50);
assert.equal(e.unlockCost(10), 19531250);
assert.equal(e.unlockCost(30), 10 * 5 ** 29);
assert.equal(e.autoCost(1, c, 1), 50);
assert.equal(e.clickIncome(1), 2);
assert.equal(e.autoIncomePerSec(1), 2);
assert.equal(e.cooldownSec(1), 1);
assert.equal(e.cooldownSec(5), 3);
assert.equal(e.cooldownSec(9), 5);
assert.equal(e.cooldownSec(30), 5);
assert.equal(e.speedFactor(1, 0), 1);
assert.equal(e.speedFactor(5, 60), 60 / 72);
assert.equal(e.speedFactor(30, 160), 1);
assert.equal(e.speedFactor(5, 0), 0.75);
assert.equal(e.speedFactor(5, 1000), 1.25);
assert.equal(legacy.textZuZahl('a'), 97 / 1000003);
assert.equal(legacy.textZuZahl('ab'), 3105 / 1000003);
assert.equal(e.growthFactor(c), e.growthFactor({ ...c, name: '  ANGELIKA  ' }));
assert(e.growthFactor({ ...c, glueck: 1 }) < e.growthFactor({ ...c, glueck: 0 }));
for (let n = 1; n <= 30; n++) {
  for (const fn of [e.unlockCost, e.clickIncome, e.autoIncomePerSec, e.cooldownSec]) {
    assert(Number.isFinite(fn(n)) && fn(n) >= 0);
  }
  assert.equal(e.autoIncomePerSec(n) * e.cooldownSec(n), e.clickIncome(n));
  const base = legacy.autoFarmingKosten(n, c.herkunft, c.augenfarbe, c.haarfarbe, c.name, c.glueck);
  assert.equal(e.autoCost(n, c, 1), base);
  if (n > 1) {
    assert.equal(e.autoCost(n, c, 0.75), base * 0.75);
    assert.equal(e.autoCost(n, c, 1.25), base * 1.25);
  }
}
for (const n of [0, 31, -1, 1.5, '2', NaN, Infinity, null, undefined]) {
  for (const fn of [e.unlockCost, e.clickIncome, e.autoIncomePerSec, e.cooldownSec]) assert.throws(() => fn(n));
  assert.throws(() => e.speedFactor(n, 1));
  assert.throws(() => e.autoCost(n, c, 1));
}
for (const duration of [-1, NaN, Infinity, '1', null, undefined]) assert.throws(() => e.speedFactor(1, duration));
for (const factor of [-1, 0.74, 1.26, NaN, Infinity, null, undefined]) assert.throws(() => e.autoCost(2, c, factor));
assert.throws(() => e.autoCost(1, c, 0.75));
for (const invalid of [undefined, null, {}, { ...c, name: ' ' }, { ...c, name: 'a'.repeat(21) },
  ...['herkunft', 'augenfarbe', 'haarfarbe', 'name'].map(key => ({ ...c, [key]: undefined })),
  ...[NaN, Infinity, -0.1, 1.1, '0.5', null].map(glueck => ({ ...c, glueck }))]) {
  assert.throws(() => e.growthFactor(invalid));
  assert.throws(() => e.autoCost(1, invalid, 1));
}
assert.equal(JSON.stringify(c), original);
assert(Object.isFrozen(e.CONFIG) && Object.isFrozen(e.CONFIG.herkunft));

// Näherungswerte des PDF-Probelaufs: höchstens eine Minute Abweichung.
[5, 5.25, 5.5].forEach((growth, i) => {
  assert(Math.abs(simulate({ growth, bonus: false }).minutes - [63, 83, 112][i]) < 1);
});
// Dichtes Raster zusätzlich zu A7; kein mathematischer Beweis für alle reellen Faktoren.
let min = Infinity, max = 0;
for (let i = 0; i <= 10000; i++) {
  const r = simulate({ growth: 5 + i / 20000 });
  assert(r.withinTarget, `g=${r.growth}: ${r.minutes} Minuten`);
  assert.equal(r.purchases.length, 59);
  assert(r.levels.every(l => l.auto && l.unlockedAt !== null && l.autoAt >= l.unlockedAt));
  assert(r.purchases.every((p, j, all) => p.balance >= 0 && p.waitSec >= 0 && (!j || p.timeSec >= all[j-1].timeSec)));
  min = Math.min(min, r.minutes); max = Math.max(max, r.minutes);
}
const actual = simulate({ character: c });
assert(actual.withinTarget);
assert.equal(actual.growth, e.growthFactor(c));
for (const growth of [4.9, 5.6, NaN, Infinity, '5']) assert.throws(() => simulate({ growth }));

// Tatsächliche Browser-Reihenfolge: globale Funktionen und UI-Auswahllisten.
const context = vm.createContext({});
for (const file of ['kostenkurve.js', 'economy.js']) vm.runInContext(fs.readFileSync(`${__dirname}/${file}`, 'utf8'), context);
assert.equal(vm.runInContext('unlockCost(2)', context), 50);
assert.equal(vm.runInContext('CONFIG.herkunft.length', context), 10);
assert.equal(vm.runInContext('MAX_LEVEL === CONFIG.maxLevel', context), true);
const html = fs.readFileSync(`${__dirname}/index.html`, 'utf8');
assert(html.includes('src="economy.js"'));
assert(!html.includes('src="economy-platzhalter.js"'));
console.log(`10.001 Wachstumsfaktoren: ${min.toFixed(2)} bis ${max.toFixed(2)} Minuten. OK`);
