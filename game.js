// Spiellogik (Gebiet B): Spielzustand, Käufe, Klick mit Cooldown, Spielschleife, Offline-Ertrag, Spielende.
// Greift nicht auf Elemente der Seite zu. Formeln kommen aus economy.js (Gebiet A), das Speichern aus storage.js.
// Global sind nur die Funktionen der Schnittstellen-Tabelle (siehe Object.assign am Ende).
(() => {
  const OFFLINE_MAX_SEK = 8 * 60 * 60;
  const SPEICHER_INTERVALL_MS = 10000;
  const SCHLEIFE_MS = 100;

  let spielstand = null; // null = kein Spiel, die Oberfläche zeigt die Charaktererstellung
  let letzterTick = 0;

  const erfolg = (extra) => ({ ok: true, reason: null, ...extra });
  const abgelehnt = (reason, extra) => ({ ok: false, reason, ...extra });

  // Ablehnungsgrund, wenn kein Spiel läuft oder das Level ungültig ist, sonst null
  function pruefe(level) {
    if (!spielstand) return "no_game";
    if (!Number.isInteger(level) || level < 1 || level > MAX_LEVEL) return "invalid_level"; // MAX_LEVEL aus kostenkurve.js
    return null;
  }

  function ertragProSekunde() {
    let summe = 0;
    spielstand.levels.forEach((l, i) => { if (l.auto) summe += autoIncomePerSec(i + 1); });
    return summe;
  }

  // B-F1: neues Spiel mit Guthaben 0, Level 1 ist freigeschaltet (A-F6)
  function newGame(character, nowMs = Date.now()) {
    if (!Speicher.charakterGueltig(character)) return abgelehnt("invalid_character");
    spielstand = {
      version: Speicher.VERSION,
      savedAt: nowMs,
      balance: 0,
      playtime: 0,
      finished: false,
      finishedPlaytime: null,
      character: {
        name: character.name.trim(),
        herkunft: character.herkunft,
        augenfarbe: character.augenfarbe,
        haarfarbe: character.haarfarbe,
        glueck: character.glueck,
      },
      levels: Array.from({ length: MAX_LEVEL }, (_, i) => ({
        unlocked: i === 0,
        auto: false,
        speedFactor: 1,
        unlockedAtPlaytime: 0,
        autoOfferSeen: false,
        lastClickAt: 0,
      })),
    };
    letzterTick = nowMs;
    save(nowMs);
    return erfolg();
  }

  // Liefert den Spielstand zum Lesen oder null, solange kein Spiel läuft
  function getState() {
    return spielstand;
  }

  // B1: Level kaufen, nur in aufsteigender Reihenfolge (B-F2)
  function buyLevel(level) {
    const grund = pruefe(level);
    if (grund) return abgelehnt(grund);
    const l = spielstand.levels[level - 1];
    if (l.unlocked) return abgelehnt("already_bought");
    const vorgaenger = spielstand.levels[level - 2];
    if (!vorgaenger.unlocked) return abgelehnt("previous_locked");
    const preis = unlockCost(level);
    if (spielstand.balance < preis) return abgelehnt("not_enough_money");

    spielstand.balance -= preis;
    l.unlocked = true;
    // Freischaltdauer-Bonus (A6) wird jetzt festgelegt und ändert sich danach nicht mehr
    l.speedFactor = speedFactor(level, spielstand.playtime - vorgaenger.unlockedAtPlaytime);
    l.unlockedAtPlaytime = spielstand.playtime;
    save();
    return erfolg();
  }

  // B1: Auto-Farming kaufen (B-F3), danach Spielende prüfen (B-F10)
  function buyAuto(level) {
    const grund = pruefe(level);
    if (grund) return abgelehnt(grund);
    const l = spielstand.levels[level - 1];
    if (!l.unlocked) return abgelehnt("locked");
    if (l.auto) return abgelehnt("auto_active");
    const preis = autoCost(level, spielstand.character, l.speedFactor);
    if (spielstand.balance < preis) return abgelehnt("not_enough_money");

    spielstand.balance -= preis;
    l.auto = true;
    l.autoOfferSeen = true;
    if (!spielstand.finished && spielstand.levels.every((x) => x.auto)) {
      spielstand.finished = true;
      spielstand.finishedPlaytime = spielstand.playtime;
    }
    save();
    return erfolg();
  }

  // B2: Klick mit Cooldown (B-F4)
  function clickLevel(level, nowMs = Date.now()) {
    const grund = pruefe(level);
    if (grund) return abgelehnt(grund);
    const l = spielstand.levels[level - 1];
    if (!l.unlocked) return abgelehnt("locked");
    if (l.auto) return abgelehnt("auto_active");
    const seit = (nowMs - l.lastClickAt) / 1000;
    const cooldown = cooldownSec(level);
    // seit < 0 heißt, die Uhr wurde zurückgestellt: dann gilt der Cooldown als abgelaufen
    if (seit >= 0 && seit < cooldown) return abgelehnt("cooldown", { remainingSec: cooldown - seit });

    spielstand.balance += clickIncome(level);
    l.lastClickAt = nowMs;
    return erfolg();
  }

  // B3: ein Durchlauf der Spielschleife, rechnet mit der tatsächlich vergangenen Zeit (B-F5)
  function tick(nowMs = Date.now()) {
    if (!spielstand) return abgelehnt("no_game");
    const dt = (nowMs - letzterTick) / 1000;
    letzterTick = nowMs;
    if (dt <= 0) return erfolg();

    // ponytail: ein langer Ruhezustand bei offenem Tab zählt voll als Spielzeit und Ertrag.
    // Stört das den Freischaltdauer-Bonus, hier dt begrenzen und den Rest wie Offline-Ertrag behandeln.
    spielstand.balance += ertragProSekunde() * dt;
    spielstand.playtime += dt;

    // C-F7: Auto-Farming-Angebot merken, sobald das Guthaben erstmals 25 % des Preises erreicht
    spielstand.levels.forEach((l, i) => {
      if (l.unlocked && !l.autoOfferSeen
        && spielstand.balance >= 0.25 * autoCost(i + 1, spielstand.character, l.speedFactor)) {
        l.autoOfferSeen = true;
      }
    });

    if (nowMs - spielstand.savedAt >= SPEICHER_INTERVALL_MS) save(nowMs);
    return erfolg();
  }

  // B5: speichern. Schlägt es fehl, läuft das Spiel weiter und versucht es beim nächsten Intervall erneut.
  function save(nowMs = Date.now()) {
    if (!spielstand) return abgelehnt("no_game");
    spielstand.savedAt = nowMs;
    return Speicher.speichern(spielstand) ? erfolg() : abgelehnt("save_failed");
  }

  // B5 und B4: laden und Offline-Ertrag gutschreiben (B-F6, B-F8).
  // Bei fehlendem, defektem oder veraltetem Spielstand: reason "no_save", die Oberfläche zeigt die Charaktererstellung.
  function load(nowMs = Date.now()) {
    spielstand = Speicher.laden();
    if (!spielstand) return abgelehnt("no_save");
    for (const l of spielstand.levels) l.lastClickAt = 0;

    // Negative Abwesenheit (Uhr zurückgestellt) zählt als 0, höchstens 8 Stunden
    const offlineSec = Math.min(Math.max((nowMs - spielstand.savedAt) / 1000, 0), OFFLINE_MAX_SEK);
    const offlineIncome = ertragProSekunde() * offlineSec;
    spielstand.balance += offlineIncome; // die Spielzeit bleibt gleich, damit der Freischaltdauer-Bonus nicht leidet
    letzterTick = nowMs;
    save(nowMs); // sonst würde ein zweites Neuladen dieselbe Abwesenheit noch einmal gutschreiben
    return erfolg({ offlineSec, offlineIncome });
  }

  // B-F9: Spielstand löschen. Die Bestätigung davor ist Sache der Oberfläche (C-F9).
  function reset() {
    spielstand = null;
    Speicher.loeschen();
    return erfolg();
  }

  Object.assign(globalThis, { newGame, getState, clickLevel, buyLevel, buyAuto, tick, save, load, reset });

  // Spielschleife und Sichern beim Verlassen der Seite (B-F7). Läuft nur im Browser, nicht im Test mit node.
  if (typeof window !== "undefined") {
    setInterval(() => tick(Date.now()), SCHLEIFE_MS);
    window.addEventListener("pagehide", () => save());
    document.addEventListener("visibilitychange", () => { if (document.hidden) save(); });
  }
})();
