// Zahlenformat (Gebiet C, Algorithmus C1): formatiere aus kostenkurve.js, aber abgeschnitten statt gerundet.
// So wird nie mehr Geld angezeigt, als vorhanden ist (999 950 ist 999.9K, nicht 1000.0K).
function formatMoney(amount) {
  if (!(amount >= 1000)) return String(Math.floor(Math.max(amount, 0) || 0));
  // Ziffern und Zehnerpotenz aus der Exponentialschreibweise lesen, damit beim Teilen kein Rundungsfehler entsteht
  const [mantisse, exponent] = amount.toExponential().split("e");
  const ziffern = mantisse.replace(".", "").padEnd(4, "0");
  const stufe = Math.floor(exponent / 3);
  const vorKomma = 1 + (exponent % 3);
  const einheiten = ["", "K", "M", "B", "T"];
  const i = stufe - einheiten.length;
  const einheit = i < 0 ? einheiten[stufe] : String.fromCharCode(65 + Math.floor(i / 26), 65 + (i % 26));
  return `${ziffern.slice(0, vorKomma)}.${ziffern[vorKomma]}${einheit}`;
}

// Selbsttest mit der Tabelle aus C1: node format.js
if (typeof require !== "undefined" && require.main === module) {
  const assert = require("assert");
  const tabelle = [
    [999, "999"], [1000, "1.0K"], [1500, "1.5K"], [999999, "999.9K"], [19531250, "19.5M"],
    [1e12, "1.0T"], [1e15, "1.0AA"], [1e18, "1.0AB"], [10 * 5 ** 29, "1.8AC"], [1e93, "1.0BA"],
    [0, "0"], [999.9, "999"], [999950, "999.9K"],
  ];
  for (const [betrag, anzeige] of tabelle) assert.strictEqual(formatMoney(betrag), anzeige);
  console.log("OK");
}
