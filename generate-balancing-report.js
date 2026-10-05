// node generate-balancing-report.js: reproduzierbare, eigenständige HTML-Auswertung.
// Kein Build-Schritt für das Spiel; nur beim Ändern der Balancing-Konfiguration nötig.
const fs = require('node:fs');
const path = require('node:path');
const { CONFIG, unlockCost, clickIncome, autoIncomePerSec } = require('./economy.js');
const { simulate } = require('./simulation.js');
const growths = [5, 5.25, 5.5];
const runs = growths.map(growth => simulate({ growth }));
const baseline = growths.map(growth => simulate({ growth, bonus: false }));
const levels = Array.from({ length: CONFIG.maxLevel }, (_, i) => i + 1);
const colors = ['#126b48', '#b65317', '#315ccc', '#7b438c'];
const fmt = n => n.toLocaleString('de-AT', { maximumFractionDigits: 2 });
function chart(id, title, unit, series, log = false) {
  const w = 900, h = 340, left = 76, right = 20, top = 18, bottom = 42;
  const values = series.flatMap(s => s.values);
  const transform = n => log ? Math.log10(Math.max(1, n)) : n;
  const max = Math.max(...values.map(transform)) * 1.04;
  const x = i => left + i / (levels.length - 1) * (w - left - right);
  const y = v => h - bottom - transform(v) / max * (h - top - bottom);
  let svg = `<svg viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="${id}-title ${id}-desc"><title id="${id}-title">${title}</title><desc id="${id}-desc">${unit}. ${log ? 'Logarithmische' : 'Lineare'} Skala. Zahlenwerte stehen in der Tabelle darunter.</desc>`;
  for (let i = 0; i <= 4; i++) {
    const v = max * i / 4, yy = h - bottom - v / max * (h - top - bottom);
    svg += `<line x1="${left}" y1="${yy}" x2="${w-right}" y2="${yy}" stroke="#dce4dc"/><text x="${left-9}" y="${yy+4}" text-anchor="end">${log ? '10^'+v.toFixed(1) : Math.round(v)}</text>`;
  }
  for (const n of [1, 5, 10, 15, 20, 25, 30]) svg += `<text x="${x(n-1)}" y="${h-17}" text-anchor="middle">${n}</text>`;
  series.forEach((s, i) => {
    svg += `<polyline fill="none" stroke="${colors[i]}" stroke-width="2.8" ${i % 2 ? 'stroke-dasharray="8 4"' : ''} points="${s.values.map((v, j) => `${x(j)},${y(v)}`).join(' ')}"/>`;
  });
  svg += '</svg>';
  const legend = series.map((s, i) => `<span style="--series:${colors[i]}">${s.label}</span>`).join('');
  const rows = levels.map((n, i) => `<tr><th scope="row">${n}</th>${series.map(s => `<td>${fmt(s.values[i])}</td>`).join('')}</tr>`).join('');
  return `<section><h2>${title}</h2><p>${unit} · ${log ? 'logarithmische' : 'lineare'} Skala · X-Achse: Level</p>${svg}<div class="legend">${legend}</div><details><summary>Alle Zahlenwerte anzeigen</summary><div class="scroll"><table><thead><tr><th>Level</th>${series.map(s=>`<th>${s.label}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div></details></section>`;
}
const cards = runs.map(r => `<article><p>Wachstumsfaktor ${fmt(r.growth)}</p><strong>${fmt(r.minutes)} <small>Min.</small></strong><p>${r.withinTarget ? '✓ Zielbereich erfüllt' : '⚠ Außerhalb des Zielbereichs'}</p></article>`).join('');
const charts = [
  chart('cost', 'Kosten vergleichen', 'Geldeinheiten; Auto-Farming ohne Freischaltdauer-Faktor', [
    { label: 'Freischalten', values: levels.map(unlockCost) },
    ...growths.map(g => ({ label: `Auto g=${fmt(g)}`, values: levels.map(n => Math.round(CONFIG.unlockBase * CONFIG.autoMultiplier * g ** (n-1))) }))
  ], true),
  chart('income', 'Einkommen pro Level', 'Geldeinheiten pro Klick bzw. Sekunde', [
    { label: 'Pro Klick', values: levels.map(clickIncome) },
    { label: 'Auto pro Sekunde', values: levels.map(autoIncomePerSec) }
  ], true),
  chart('duration', 'Zeit bis zur nächsten Freischaltung', 'Sekunden seit der vorherigen Freischaltung; inklusive Freischaltdauer-Faktor', runs.map(r => ({ label: `g=${fmt(r.growth)}`, values: r.levels.map(l => l.unlockDuration) })))
].join('');
const html = `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BikeBuddy · Spielökonomie & Balancing</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f3f5ef;color:#182a21;font:16px/1.6 system-ui,sans-serif}main{max-width:1080px;margin:auto;padding:44px 24px}header{padding:16px 0 28px;border-bottom:1px solid #cfd8ce}.eyebrow{color:#126b48;font-weight:700;letter-spacing:.12em;font-size:12px}h1{font-size:clamp(28px,5vw,44px);line-height:1.15;margin:10px 0}h2{font-size:24px;margin:0}p{color:#526156;margin:8px 0 16px}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin:28px 0}.cards article,section{background:white;border:1px solid #dce4dc;border-radius:14px;padding:24px}.cards strong{font-size:36px;letter-spacing:-.04em}.cards small{font-size:18px;font-weight:500}.cards p{margin:0}section{margin:24px 0}svg{width:100%;height:auto;margin:8px 0}svg text{font:12px system-ui;fill:#526156}.legend{display:flex;flex-wrap:wrap;gap:16px}.legend span:before{content:'';display:inline-block;width:22px;height:3px;background:var(--series);vertical-align:middle;margin-right:6px}details{margin-top:20px;border-top:1px solid #dce4dc;padding-top:12px}summary{cursor:pointer;color:#126b48;font-weight:600}.scroll{overflow:auto}table{width:100%;border-collapse:collapse;font-size:14px}th,td{text-align:right;padding:9px 12px;border-bottom:1px solid #e0e7df;white-space:nowrap}th:first-child{text-align:left}code{background:#eef3ed;padding:2px 5px;border-radius:4px}a{color:#126b48}footer{font-size:14px;color:#526156}@media(max-width:650px){main{padding:22px 14px}.cards{grid-template-columns:1fr;gap:10px}.cards article,section{padding:18px}.cards strong{font-size:30px}}
</style></head><body><main><header><div class="eyebrow">BIKEBUDDY / GEBIET A / ANGELIKA</div><h1>Spielökonomie & Balancing</h1><p>30 Level. Nachvollziehbare Formeln. Ziel: ${CONFIG.targetMinMinutes}–${CONFIG.targetMaxMinutes} Minuten aktive Spielzeit im Simulationsmodell.</p><a href="index.html">Zum Spiel →</a></header>
<div class="cards">${cards}</div>
<section><h2>So wird geprüft</h2><p>Die Simulation kauft jeweils die günstigste verfügbare Freischaltung oder Automatisierung. Automatisierte Level liefern den vollen Ertrag; die zwei ertragreichsten manuellen Level liefern 80 %. Bei gleichem Preis hat das nächste Level Vorrang. Die Gesamtdauer umfasst alle 59 Käufe.</p><p>Level 1 ist bei t = 0 kostenlos freigeschaltet. Sein rechnerischer Kurvenpreis bleibt 10. Die Freischaltdauer von Level 1 wird deshalb als 0 angezeigt. Die Automatisierung aller Level ist erst später abgeschlossen.</p><p><strong>Kalibrierung gegenüber der PDF:</strong> Die maximale Referenzdauer wurde von 145 auf ${CONFIG.referenceMax} Sekunden erhöht. Mit 145 Sekunden dauerte der Prüffall g = 5,5 einschließlich Freischaltdauer-Faktor 122,41 Minuten. Kosten, Einkommen, Cooldowns und Faktorgrenzen bleiben bei den PDF-Werten.</p><p>Ohne Freischaltdauer-Faktor: ${baseline.map(r=>`g=${fmt(r.growth)}: ${fmt(r.minutes)} Min.`).join(' · ')}. Die PDF nennt gerundete Näherungen von 63, 83 und 112 Minuten.</p></section>
${charts}<footer>Reproduzierbar mit <code>node generate-balancing-report.js</code>. Simulation: <code>node simulation.js</code>. Tests: <code>node economy.test.js</code> und <code>node game.test.js</code>. Keine externen Bibliotheken oder Netzwerkaufrufe.</footer></main></body></html>`;
fs.writeFileSync(path.join(__dirname, 'kostenkurve.html'), html);
console.log('kostenkurve.html aktualisiert');
