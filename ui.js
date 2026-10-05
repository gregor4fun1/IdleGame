// Benutzeroberfläche (Gebiet C): Charaktererstellung, Level-Karten, Leiste und Meldungen.
// Ändert den Spielstand nie direkt, sondern ruft nur die Funktionen aus game.js auf.
// Global ist nur render(state).
(() => {
  // PLATZHALTER: Die Auswahllisten gehören in CONFIG in economy.js (Gebiet A).
  // Bis es CONFIG gibt, gelten die Listen aus dem Dokument. Die Feldnamen in CONFIG sind angenommen.
  const config = typeof CONFIG !== "undefined" ? CONFIG : {};
  const LISTEN = {
    herkunft: config.herkunft ?? ["Österreich", "Deutschland", "Schweiz", "Italien", "Ungarn", "Türkei",
      "Kroatien", "Serbien", "Polen", "anderes Land"],
    augenfarbe: config.augenfarbe ?? ["blau", "braun", "grün", "grau"],
    haarfarbe: config.haarfarbe ?? ["schwarz", "braun", "blond", "rot", "grau"],
  };

  const GRUENDE = {
    invalid_level: "Ungültiges Level.",
    already_bought: "Bereits gekauft.",
    previous_locked: "Das vorherige Level fehlt.",
    not_enough_money: "Zu wenig Guthaben.",
    locked: "Das Level ist noch gesperrt.",
    auto_active: "Auto-Farming ist bereits aktiv.",
    cooldown: "Der Cooldown läuft noch.",
    invalid_character: "Der Charakter ist ungültig.",
  };
  const ZUSTAND_TEXT = {
    gesperrt: "🔒 gesperrt",
    kaufbar: "🛒 kaufbar",
    freigeschaltet: "✔ freigeschaltet",
    automatisiert: "⚙ automatisch",
  };
  const AKTIONEN = { clickLevel, buyLevel, buyAuto };

  const $ = (id) => document.getElementById(id);
  const zweistellig = (x) => String(Math.floor(x)).padStart(2, "0");

  let glueck = 0;
  let abschlussZu = false;
  let karten = [];

  // "2 h 13 min" für die Offline-Meldung
  function dauerText(sek) {
    const h = Math.floor(sek / 3600), min = Math.floor((sek % 3600) / 60);
    if (h) return `${h} h ${min} min`;
    return min ? `${min} min` : `${Math.floor(sek)} s`;
  }

  // Stunden:Minuten:Sekunden für den Abschluss
  function uhrText(sek) {
    return `${Math.floor(sek / 3600)}:${zweistellig((sek % 3600) / 60)}:${zweistellig(sek % 60)}`;
  }

  function melde(text) {
    $("hinweis").textContent = text;
  }

  // C-F1: Der Glücksfaktor wird bei jedem Öffnen der Charaktererstellung einmal gewürfelt
  function oeffneErstellung() {
    glueck = Math.round(Math.random() * 100) / 100;
    $("glueck").textContent = `Glück: ${Math.round(glueck * 100)} %`;
    $("name").value = "";
    $("starten").disabled = true;
    $("spiel").hidden = true;
    $("erstellung").hidden = false;
    $("name").focus();
  }

  // C3: Der Zustand einer Karte ergibt sich allein aus dem Spielzustand
  function kartenZustand(state, i) {
    const l = state.levels[i];
    if (l.auto) return "automatisiert";
    if (l.unlocked) return "freigeschaltet";
    return i === 0 || state.levels[i - 1].unlocked ? "kaufbar" : "gesperrt";
  }

  function kartenHtml(state, n, zustand) {
    const l = state.levels[n - 1];
    const ertrag = zustand === "automatisiert"
      ? `${formatMoney(autoIncomePerSec(n))} pro Sekunde`
      : `${formatMoney(clickIncome(n))} pro Klick`;
    let buttons = "";
    if (zustand === "kaufbar") {
      buttons = `<button data-aktion="buyLevel">Freischalten<br>${formatMoney(unlockCost(n))}</button>`;
    } else if (zustand === "freigeschaltet") {
      buttons = `<button data-aktion="clickLevel">Farmen<br>+${formatMoney(clickIncome(n))}</button>`;
      if (l.autoOfferSeen) { // C-F7
        const preis = formatMoney(autoCost(n, state.character, l.speedFactor));
        buttons += `<button data-aktion="buyAuto">Auto-Farming<br>${preis}</button>`;
      }
    }
    return `<div class="figur">${stickFigureSvg(n, !l.unlocked)}</div>`
      + `<div class="info"><h2>Level ${n}</h2><p>${ZUSTAND_TEXT[zustand]}</p><p>Ertrag: ${ertrag}</p></div>`
      + `<div class="buttons">${buttons}</div>`
      + (zustand === "freigeschaltet" ? `<div class="balken" aria-hidden="true"><i></i></div>` : "");
  }

  // Karten werden nur neu aufgebaut, wenn sich ihr Zustand ändert. Sonst gingen Fokus und Klicks verloren.
  function renderKarten(state) {
    const jetzt = Date.now();
    state.levels.forEach((l, i) => {
      const n = i + 1, karte = karten[i], zustand = kartenZustand(state, i);
      const schluessel = zustand + (l.autoOfferSeen ? "+angebot" : "");
      if (karte.dataset.schluessel !== schluessel) {
        const hatFokus = karte.contains(document.activeElement);
        karte.dataset.schluessel = schluessel;
        karte.className = `karte ${zustand}`;
        karte.innerHTML = kartenHtml(state, n, zustand);
        if (hatFokus) karte.querySelector("button")?.focus();
      }
      const button = (aktion) => karte.querySelector(`[data-aktion=${aktion}]`);
      if (zustand === "kaufbar") button("buyLevel").disabled = state.balance < unlockCost(n); // C-F4
      if (zustand === "freigeschaltet") {
        const cooldown = cooldownSec(n), seit = (jetzt - l.lastClickAt) / 1000;
        const rest = seit >= 0 && seit < cooldown ? cooldown - seit : 0;
        button("clickLevel").disabled = rest > 0; // C-F3
        karte.querySelector(".balken i").style.width = `${(rest / cooldown) * 100}%`;
        const auto = button("buyAuto");
        if (auto) auto.disabled = state.balance < autoCost(n, state.character, l.speedFactor);
      }
    });
  }

  function renderLeiste(state) {
    let proSekunde = 0;
    state.levels.forEach((l, i) => { if (l.auto) proSekunde += autoIncomePerSec(i + 1); });
    $("guthaben").textContent = formatMoney(state.balance);
    $("proSekunde").textContent = formatMoney(proSekunde);
    $("fortschritt").textContent = `Level ${state.levels.filter((l) => l.unlocked).length} von ${state.levels.length}`;

    // C-F9: Abschluss mit Spielzeit und Charakter
    if (state.finished && !abschlussZu && $("abschluss").hidden) {
      const c = state.character;
      $("abschlussText").textContent = `Geschafft! Spielzeit ${uhrText(state.finishedPlaytime)}. `
        + `Charakter: ${c.name}, ${c.herkunft}, Augen ${c.augenfarbe}, Haare ${c.haarfarbe}, `
        + `Glück ${Math.round(c.glueck * 100)} %.`;
      $("abschluss").hidden = false;
    }
  }

  // Wird zehnmal pro Sekunde aufgerufen (C-N2). Ohne Spielstand erscheint die Charaktererstellung.
  function render(state) {
    if (!state) {
      if ($("erstellung").hidden) oeffneErstellung();
      return;
    }
    $("erstellung").hidden = true;
    $("spiel").hidden = false;
    renderLeiste(state);
    renderKarten(state);
  }

  function neuesSpiel() {
    if (!confirm("Spielstand wirklich löschen und neu beginnen?")) return; // C-F9
    reset();
    abschlussZu = false;
    $("abschluss").hidden = true;
    $("offline").hidden = true;
    melde("");
    render(getState());
  }

  for (const [feld, werte] of Object.entries(LISTEN)) {
    for (const wert of werte) $(feld).add(new Option(wert));
  }
  karten = Array.from({ length: MAX_LEVEL }, (_, i) => {
    const karte = document.createElement("article");
    karte.dataset.level = i + 1;
    return $("karten").appendChild(karte);
  });

  $("name").addEventListener("input", () => {
    const laenge = $("name").value.trim().length;
    $("starten").disabled = laenge < 1 || laenge > 20;
  });
  $("erstellung").addEventListener("submit", (e) => {
    e.preventDefault();
    const r = newGame({
      name: $("name").value, herkunft: $("herkunft").value, augenfarbe: $("augenfarbe").value,
      haarfarbe: $("haarfarbe").value, glueck,
    });
    melde(r.ok ? "" : GRUENDE[r.reason] ?? r.reason);
    render(getState());
  });

  // Ein Listener für alle Karten. Die Karten werden sofort neu gezeichnet, das Guthaben folgt im nächsten Takt.
  $("karten").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-aktion]");
    if (!b) return;
    const r = AKTIONEN[b.dataset.aktion](Number(b.closest("[data-level]").dataset.level));
    melde(r.ok ? "" : GRUENDE[r.reason] ?? r.reason);
    renderKarten(getState());
  });

  $("reset").addEventListener("click", neuesSpiel);
  $("neuesSpiel").addEventListener("click", neuesSpiel);
  $("weiterspielen").addEventListener("click", () => { abschlussZu = true; $("abschluss").hidden = true; });
  $("offlineOk").addEventListener("click", () => { $("offline").hidden = true; });

  // Start: Spielstand laden und den Offline-Ertrag melden (C-F9)
  const geladen = load();
  if (geladen.ok && geladen.offlineIncome > 0) {
    $("offlineText").textContent =
      `Während du ${dauerText(geladen.offlineSec)} weg warst: +${formatMoney(geladen.offlineIncome)}`;
    $("offline").hidden = false;
  }
  globalThis.render = render;
  render(getState());
  setInterval(() => render(getState()), 100);
})();
