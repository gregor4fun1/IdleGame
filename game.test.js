// Selbsttest für Gebiet B: node game.test.js
// Lädt die Skripte wie index.html als gewöhnliche Skripte (keine Module) und prüft die Abnahmetests der Spiellogik.
const assert = require("assert");
const fs = require("fs");
const vm = require("vm");

// Ersatz für den localStorage des Browsers
const ablage = new Map();
globalThis.localStorage = {
  getItem: (k) => (ablage.has(k) ? ablage.get(k) : null),
  setItem: (k, v) => ablage.set(k, String(v)),
  removeItem: (k) => ablage.delete(k),
};

const economy = fs.existsSync(`${__dirname}/economy.js`) ? "economy.js" : "economy-platzhalter.js";
for (const datei of ["kostenkurve.js", economy, "storage.js", "game.js"]) {
  vm.runInThisContext(fs.readFileSync(`${__dirname}/${datei}`, "utf8"), { filename: datei });
}
console.log(`Formeln aus ${economy}`);

const charakter = { name: "  Gregor ", herkunft: "Österreich", augenfarbe: "blau", haarfarbe: "braun", glueck: 0.73 };
let jetzt = 1_800_000_000_000;
Date.now = () => jetzt; // Testuhr: Käufe speichern mit Date.now()
const weiter = (sek) => { jetzt += sek * 1000; return tick(jetzt); };

// Vor dem Start gibt es kein Spiel
assert.strictEqual(getState(), null);
assert.strictEqual(load(jetzt).reason, "no_save");
assert.strictEqual(buyLevel(2).reason, "no_game");
assert.strictEqual(newGame({ ...charakter, glueck: 2 }).reason, "invalid_character");
assert.strictEqual(newGame({ ...charakter, name: "   " }).reason, "invalid_character");

// Neues Spiel: Guthaben 0, Level 1 ist freigeschaltet, Level 2 kostet 50
assert.deepStrictEqual(newGame(charakter, jetzt), { ok: true, reason: null });
let s = getState();
assert.deepStrictEqual(Object.keys(s), ["version", "savedAt", "balance", "playtime", "finished", "finishedPlaytime", "character", "levels"]);
assert.strictEqual(s.balance, 0);
assert.strictEqual(s.character.name, "Gregor");
assert.strictEqual(s.levels.length, 30);
assert.deepStrictEqual(s.levels.map((l) => l.unlocked), [true, ...Array(29).fill(false)]);
assert.strictEqual(unlockCost(2), 50);

// Ein Klick auf Level 1 bringt 2, ein zweiter Klick innerhalb von 1 Sekunde wird abgelehnt
assert.strictEqual(clickLevel(1, jetzt).ok, true);
assert.strictEqual(s.balance, 2);
const zuFrueh = clickLevel(1, jetzt + 400);
assert.deepStrictEqual([zuFrueh.ok, zuFrueh.reason], [false, "cooldown"]);
assert(Math.abs(zuFrueh.remainingSec - 0.6) < 1e-9);
assert.strictEqual(s.balance, 2);
assert.strictEqual(clickLevel(1, jetzt + 1000).ok, true);
assert.strictEqual(clickLevel(2, jetzt).reason, "locked");

// Käufe: ungültiges Level, Reihenfolge, Doppelkauf, zu wenig Guthaben. Bei Ablehnung bleibt der Stand gleich.
const vorher = JSON.stringify(s);
for (const n of [0, 31, 1.5, "2", undefined]) assert.strictEqual(buyLevel(n).reason, "invalid_level");
assert.strictEqual(buyLevel(1).reason, "already_bought");
assert.strictEqual(buyLevel(3).reason, "previous_locked");
assert.strictEqual(buyLevel(2).reason, "not_enough_money");
assert.strictEqual(buyAuto(2).reason, "locked");
assert.strictEqual(buyAuto(1).reason, "not_enough_money");
assert.strictEqual(JSON.stringify(s), vorher);

// Auto-Farming-Angebot erscheint ab 25 % des Preises (50) und bleibt danach
weiter(0.1);
assert.strictEqual(s.levels[0].autoOfferSeen, false);
s.balance = 12.5;
weiter(0.1);
assert.strictEqual(s.levels[0].autoOfferSeen, true);
s.balance = 0;
weiter(0.1);
assert.strictEqual(s.levels[0].autoOfferSeen, true);

// Auto-Farming auf Level 1 kostet 50, danach steigt das Guthaben ohne Klick um 2 pro Sekunde
s.balance = 50;
assert.strictEqual(buyAuto(1).ok, true);
assert.strictEqual(s.balance, 0);
assert.strictEqual(buyAuto(1).reason, "auto_active");
assert.strictEqual(clickLevel(1, jetzt + 5000).reason, "auto_active");
const spielzeit = s.playtime;
weiter(1);
assert(Math.abs(s.balance - 2) < 1e-9);
// Ertrag hängt an der vergangenen Zeit, nicht an der Zahl der Durchläufe: 1 × 30 s = 300 × 0,1 s
weiter(30);
for (let i = 0; i < 300; i++) weiter(0.1);
assert(Math.abs(s.balance - 122) < 1e-6);
assert(Math.abs(s.playtime - spielzeit - 61) < 1e-6);
// Uhr zurückgestellt: kein Abzug, kein Stillstand
jetzt -= 3_600_000;
tick(jetzt);
weiter(1);
assert(Math.abs(s.balance - 124) < 1e-6);

// Level 2 kaufen: Freischaltdauer-Bonus wird festgelegt und gespeichert
assert.strictEqual(buyLevel(2).ok, true);
assert.strictEqual(s.levels[1].speedFactor, speedFactor(2, s.playtime));
assert.strictEqual(s.levels[1].unlockedAtPlaytime, s.playtime);
assert.strictEqual(buyLevel(4).reason, "previous_locked");

// Speichern alle 10 Sekunden
const gespeichertUm = s.savedAt;
weiter(9);
assert.strictEqual(s.savedAt, gespeichertUm);
weiter(1.5);
assert.strictEqual(s.savedAt, jetzt);

// Neuladen: Spielstand unverändert, lastClickAt steht nicht im Speicher
save(jetzt);
const ohneKlickzeit = (x) => JSON.stringify(x, (k, v) => (k === "lastClickAt" ? undefined : v));
const gesichert = ohneKlickzeit(s);
assert(!ablage.get(Speicher.SCHLUESSEL).includes("lastClickAt"));
let geladen = load(jetzt);
assert.deepStrictEqual(geladen, { ok: true, reason: null, offlineSec: 0, offlineIncome: 0 });
assert.strictEqual(ohneKlickzeit(getState()), gesichert);
assert(getState().levels.every((l) => l.lastClickAt === 0)); // nach dem Laden ist jeder Cooldown abgelaufen

// 1 Minute geschlossen, nur Level 1 automatisiert: Offline-Ertrag 120, Spielzeit bleibt gleich
s = getState();
const guthaben = s.balance, zeit = s.playtime;
jetzt += 60_000;
geladen = load(jetzt);
assert.deepStrictEqual([geladen.offlineSec, geladen.offlineIncome], [60, 120]);
s = getState();
assert(Math.abs(s.balance - guthaben - 120) < 1e-6);
assert.strictEqual(s.playtime, zeit);
assert.strictEqual(load(jetzt).offlineIncome, 0); // kein doppelter Ertrag beim zweiten Neuladen
// Höchstens 8 Stunden, zurückgestellte Uhr zählt als 0
jetzt += 100 * 3_600_000;
assert.strictEqual(load(jetzt).offlineSec, 28800);
assert.strictEqual(load(jetzt - 5000).offlineSec, 0);
jetzt = getState().savedAt;

// Defekte, unvollständige und veraltete Spielstände führen ohne Fehler zu einem neuen Spiel
const heil = ablage.get(Speicher.SCHLUESSEL);
const kaputt = (aendern) => { const k = JSON.parse(heil); aendern(k); return JSON.stringify(k); };
const defekte = [
  "{kaputt", "null", "42", "[]",
  kaputt((k) => { k.version = 0; }),
  kaputt((k) => { k.balance = -1; }),
  kaputt((k) => { k.balance = "viel"; }),
  kaputt((k) => { delete k.character.haarfarbe; }),
  kaputt((k) => { k.levels.pop(); }),
  kaputt((k) => { k.levels[0].unlocked = false; }),
  kaputt((k) => { k.levels[5].unlocked = true; }),
  kaputt((k) => { k.levels[9].auto = true; }),
  kaputt((k) => { k.levels[3] = null; }),
];
for (const eintrag of defekte) {
  ablage.set(Speicher.SCHLUESSEL, eintrag);
  assert.deepStrictEqual(load(jetzt), { ok: false, reason: "no_save" }, eintrag.slice(0, 40));
  assert.strictEqual(getState(), null);
}
ablage.set(Speicher.SCHLUESSEL, heil);
assert.strictEqual(load(jetzt).ok, true);

// Schlägt das Schreiben fehl, läuft das Spiel weiter
const setItem = localStorage.setItem;
localStorage.setItem = () => { throw new Error("voll"); };
assert.strictEqual(save(jetzt).reason, "save_failed");
assert.strictEqual(buyAuto(2).ok, true); // Kauf gelingt trotzdem (Guthaben stammt aus dem Offline-Ertrag oben)
localStorage.setItem = setItem;

// Spielende: alle 30 Level und alle Auto-Farming-Freischaltungen, Beträge bis 1e24 ohne Überlauf
s = getState();
s.balance = 1e24;
for (let n = 3; n <= 30; n++) assert.strictEqual(buyLevel(n).ok, true, `Level ${n}`);
for (let n = 3; n <= 29; n++) assert.strictEqual(buyAuto(n).ok, true, `Auto ${n}`);
assert.strictEqual(s.finished, false);
assert.strictEqual(s.finishedPlaytime, null);
assert.strictEqual(buyAuto(30).ok, true);
assert.strictEqual(s.finished, true);
assert.strictEqual(s.finishedPlaytime, s.playtime);
assert(Number.isFinite(s.balance) && s.balance >= 0);
weiter(5); // Auto-Farming läuft nach dem Spielende weiter, die Endzeit bleibt stehen
assert(s.playtime > s.finishedPlaytime);
assert.strictEqual(load(jetzt).ok, true);
assert.strictEqual(getState().finished, true);

// Ein Durchlauf der Spielschleife mit 30 automatisierten Leveln dauert unter 5 ms
const start = process.hrtime.bigint();
for (let i = 0; i < 1000; i++) weiter(0.1);
const msProTick = Number(process.hrtime.bigint() - start) / 1e6 / 1000;
assert(msProTick < 5, `tick dauert ${msProTick} ms`);

// Reset: Spielstand weg, danach beginnt alles mit der Charaktererstellung
assert.strictEqual(reset().ok, true);
assert.strictEqual(getState(), null);
assert.strictEqual(ablage.has(Speicher.SCHLUESSEL), false);
assert.strictEqual(load(jetzt).reason, "no_save");
assert.strictEqual(tick(jetzt).reason, "no_game");

console.log(`tick: ${msProTick.toFixed(4)} ms`);
console.log("OK");
