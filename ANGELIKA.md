# Gebiet A: Spielökonomie und Balancing

Angelikas Implementierung nach der PDF vom 05.10.2026. Das Spiel lässt sich direkt über `index.html` öffnen. Keine Installation, kein Build und keine externen Bibliotheken erforderlich.

## Dateien und Integration

- `kostenkurve.js`: bestehende Kostenfunktionen, Charakterprüfung, Hash und **eine gemeinsame CONFIG**. Die Konfiguration liegt bewusst im zuerst geladenen Skript, damit vorhandene Aufrufer, `MAX_LEVEL` in Gebiet B und der eigenständige Kostenkurventest weiterhin funktionieren. `economy.js` exportiert in Node genau dieses Objekt; im Browser ist es global verfügbar.
- `economy.js`: alle vereinbarten reinen Funktionen (`unlockCost`, `autoCost`, `clickIncome`, `autoIncomePerSec`, `cooldownSec`, `growthFactor`, `speedFactor`). Keine DOM-, Speicher- oder Spielzustandszugriffe.
- `simulation.js`: Node-Simulation A7 mit Kaufprotokoll, Zeit je Level und drei Prüffaktoren. Optional `--json` oder `--no-bonus`. Bei verfehltem Zeitziel Exit-Code 1.
- `economy.test.js`: Beispiele, Grenzfälle, ungültige Eingaben, Determinismus, Browser-Globals und ein Raster aus 10.001 Wachstumsfaktoren.
- `generate-balancing-report.js`: erzeugt die eigenständige `kostenkurve.html` mit SVG-Diagrammen und Zahlentabellen. Die bisherige URL `kostenkurven.html` leitet dorthin weiter; historische v1/v2-Dateien bleiben erhalten.
- `index.html`: ausschließlich die Einbindung des Platzhalters auf `economy.js` umgestellt. Die Dateien für Spiellogik, Datenhaltung und Oberfläche bleiben ansonsten unverändert. `economy-platzhalter.js` bleibt als alte Referenz erhalten und wird vom Spiel nicht mehr geladen.

## Fachliche Entscheidungen

- `unlockCost(1) === 10` entspricht A1. Kostenlos ist die **Startfreischaltung** in Gregors `newGame`, nicht der rechnerische Kurvenpreis.
- Wachstumsfaktor: `5 + Profil * 0.3 + (1 - Glück) * 0.2`. Namen werden getrimmt; Groß-/Kleinschreibung beeinflusst den Hash nicht. Vorhandene Rundung der Auto-Grundkosten bleibt erhalten, der Freischaltdauer-Faktor wird danach multipliziert.
- Alle Formeln prüfen Level und relevante Eingaben. Fehlende Charakterfelder und nicht endliche Zahlen werden mit Fehlern abgewiesen. Die Herkunftslisten beschränken die Oberfläche; vorhandene Charaktere mit anderen nicht leeren Herkunftswerten bleiben berechenbar.
- **Kalibrierung:** `referenceMax` wurde gegenüber A6 von 145 auf **160 Sekunden** angehoben. Mit 145 Sekunden erreicht der teuerste Prüffall einschließlich Bonus/Malus 122,41 Minuten; das verfehlt A-N1. Mit 160 Sekunden ergeben sich für g=5 / 5,25 / 5,5 rund **74,26 / 87,66 / 118,04 Minuten**. Die Grenzen 0,75 bis 1,25 bleiben unverändert.
- Ohne Bonus/Malus ergibt die Simulation 62,67 / 82,45 / 111,47 Minuten. Die PDF-Werte 63 / 83 / 112 sind Näherungen; Gleichstände werden hier ausdrücklich zugunsten der Level-Freischaltung aufgelöst.
- Das Raster von 10.001 Faktoren zwischen 5 und 5,5 ergibt 73,12 bis 118,04 Minuten. Das ist eine zusätzliche numerische Prüfung, **kein mathematischer Beweis für jeden möglichen Charakter oder jede Spielweise**. A7 nimmt kontinuierlichen manuellen Ertrag mit 80 % Effizienz an; echte Klickzeitpunkte können abweichen.
- `CONFIG.incomeMultiplier` ist im normalen Spiel 1. Für eine Vorführung kann es bewusst auf 10 gesetzt werden; das 60–120-Minuten-Abnahmeziel gilt ausschließlich für den normalen Modus. Danach den Bericht neu erzeugen.

## Prüfen

```sh
node kostenkurve.js
node economy.test.js
node game.test.js
node simulation.js
node simulation.js --no-bonus
node generate-balancing-report.js
```

Die bestehende Spiellogik wird mit den echten Formeln getestet, nicht mit dem Platzhalter. `kostenkurve.html` zeigt Kosten, Einkommen und Freischaltdauern einschließlich vollständiger Tabellen ohne externe Abhängigkeiten.
