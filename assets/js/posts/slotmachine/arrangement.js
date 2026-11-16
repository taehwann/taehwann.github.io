/* A standalone three-reel example; it does not use or change the playable slot. */
(function () {
  function enumerate(reels) {
    const counts = [0, 0, 0];
    let topWins = 0,
      bottomWins = 0,
      jointWins = 0;
    const same = (row) => row.every((symbol) => symbol === row[0]);
    for (let a = 0; a < 3; a++) {
      for (let b = 0; b < 3; b++) {
        for (let c = 0; c < 3; c++) {
          const stops = [a, b, c];
          const top = same(reels.map((reel, r) => reel[stops[r]]));
          const bottom = same(reels.map((reel, r) => reel[(stops[r] + 1) % 3]));
          counts[Number(top) + Number(bottom)]++;
          topWins += Number(top);
          bottomWins += Number(bottom);
          jointWins += Number(top && bottom);
        }
      }
    }
    const total = counts.reduce((sum, count) => sum + count, 0);
    const probabilities = counts.map((count) => count / total);
    const mean = probabilities.reduce((sum, p, payout) => sum + p * payout, 0);
    const variance = probabilities.reduce((sum, p, payout) => sum + p * (payout - mean) ** 2, 0);
    return { counts, total, probabilities, mean, variance, topWins, bottomWins, jointWins };
  }
  const arrangements = [
    ["ABC", "ABC", "ABC"],
    ["ABC", "ACB", "ABC"],
  ];
  const results = arrangements.map(enumerate);
  if (typeof module !== "undefined") module.exports = { enumerate, arrangements, results };
  if (typeof document === "undefined") return;
  const mount = document.getElementById("reel-arrangement-example");
  if (!mount) return;
  const colors = ["#35634a", "#bc603b"];
  const percent = (p) => `${(100 * p).toFixed(2)}%`;
  const width = 480,
    left = 58,
    top = 30,
    bottom = 217,
    right = 464;
  const y = (p) => bottom - p * (bottom - top);
  const description = results
    .map((result, i) => `Arrangement ${i === 0 ? "A" : "B"}: ${result.probabilities.map((p, payout) => `${payout} coins ${percent(p)}`).join(", ")}`)
    .join(". ");
  let svg = `<svg viewBox="0 0 480 275" role="img" aria-label="Exact total payout probabilities. ${description}">`;
  svg += '<text x="8" y="16" fill="#626b5b" font-family="Arial" font-size="13">Probability (%)</text>';
  for (const p of [0, 0.25, 0.5, 0.75, 1]) {
    svg += `<line x1="${left}" x2="${right}" y1="${y(p)}" y2="${y(p)}" stroke="#d6dacd"/><text x="${left - 9}" y="${y(p) + 4}" text-anchor="end" fill="#626b5b" font-family="Arial" font-size="13">${p * 100}</text>`;
  }
  for (let payout = 0; payout < 3; payout++) {
    const center = 125 + payout * 134;
    results.forEach((result, i) => {
      const p = result.probabilities[payout];
      const x = center - 43 + i * 44;
      svg += `<rect x="${x}" y="${y(p)}" width="38" height="${bottom - y(p)}" rx="2" fill="${colors[i]}"/><text x="${x + 19}" y="${y(p) - 7}" text-anchor="middle" fill="${colors[i]}" font-family="Arial" font-size="12">${percent(p)}</text>`;
    });
    svg += `<text x="${center}" y="240" text-anchor="middle" fill="#626b5b" font-family="Arial" font-size="14">${payout} ${payout === 1 ? "coin" : "coins"}</text>`;
  }
  svg += `<text x="${width / 2}" y="265" text-anchor="middle" fill="#626b5b" font-family="Arial" font-size="13">Total payout</text></svg>`;
  mount.querySelector("#arrangement-chart").innerHTML = svg;
  mount.querySelector("#arrangement-probabilities").innerHTML = [0, 1, 2]
    .map(
      (payout) =>
        `<tr><th scope="row">${payout} ${payout === 1 ? "coin" : "coins"}</th>${results.map((r) => `<td>${percent(r.probabilities[payout])}</td>`).join("")}</tr>`
    )
    .join("");
  results.forEach((result, i) => {
    mount.querySelector(`#arrangement-${i === 0 ? "a" : "b"}-moments`).textContent =
      `Expected payout: ${result.mean.toFixed(4)} coins · Variance: ${result.variance.toFixed(4)} coins²`;
  });
})();
