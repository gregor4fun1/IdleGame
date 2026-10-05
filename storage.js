// Datenhaltung (Gebiet B): Spielstand im localStorage sichern, lesen, prüfen und löschen.
// Einziger globaler Name ist Speicher, damit nichts mit den Dateien der anderen Gebiete kollidiert.
const Speicher = (() => {
  const SCHLUESSEL = "idle-game-spielstand";
  const VERSION = 1;

  const zahl = (x) => typeof x === "number" && Number.isFinite(x) && x >= 0;
  const text = (x) => typeof x === "string" && x.trim().length > 0;

  function charakterGueltig(c) {
    return c !== null && typeof c === "object"
      && text(c.name) && c.name.trim().length <= 20
      && text(c.herkunft) && text(c.augenfarbe) && text(c.haarfarbe)
      && zahl(c.glueck) && c.glueck <= 1;
  }

  // B5 Schritt 4: lesbar, vollständig und in sich stimmig
  function spielstandGueltig(s) {
    return s !== null && typeof s === "object"
      && s.version === VERSION
      && zahl(s.savedAt) && zahl(s.balance) && zahl(s.playtime)
      && typeof s.finished === "boolean"
      && (s.finishedPlaytime === null || zahl(s.finishedPlaytime))
      && charakterGueltig(s.character)
      && Array.isArray(s.levels) && s.levels.length === MAX_LEVEL // MAX_LEVEL aus kostenkurve.js
      && s.levels.every((l, i) => l !== null && typeof l === "object"
        && typeof l.unlocked === "boolean" && typeof l.auto === "boolean"
        && typeof l.autoOfferSeen === "boolean"
        // Grenzen aus CONFIG (kostenkurve.js): außerhalb davon werfen autoCost und speedFactor aus economy.js
        && zahl(l.speedFactor) && l.speedFactor >= CONFIG.speedMin && l.speedFactor <= CONFIG.speedMax
        && (i > 0 || l.speedFactor === 1)
        && zahl(l.unlockedAtPlaytime) && l.unlockedAtPlaytime <= s.playtime
        && (!l.auto || l.unlocked)                                   // Auto-Farming nur auf freigeschalteten Leveln
        && (i === 0 ? l.unlocked : !l.unlocked || s.levels[i - 1].unlocked)); // Level 1 frei, keine Lücke
  }

  // Schreibt den Spielstand. lastClickAt wird nicht gespeichert: nach dem Laden ist jeder Cooldown abgelaufen.
  // Liefert false, wenn das Schreiben fehlschlägt (Speicher voll, privater Modus). Das Spiel läuft dann weiter.
  function speichern(spielstand) {
    try {
      localStorage.setItem(SCHLUESSEL, JSON.stringify(spielstand, (k, v) => (k === "lastClickAt" ? undefined : v)));
      return true;
    } catch {
      return false;
    }
  }

  // Liefert den geprüften Spielstand oder null, wenn er fehlt, defekt oder veraltet ist
  function laden() {
    try {
      const s = JSON.parse(localStorage.getItem(SCHLUESSEL));
      return spielstandGueltig(s) ? s : null;
    } catch {
      return null;
    }
  }

  function loeschen() {
    try { localStorage.removeItem(SCHLUESSEL); } catch { /* kein Speicher vorhanden, nichts zu löschen */ }
  }

  return { SCHLUESSEL, VERSION, charakterGueltig, speichern, laden, loeschen };
})();
