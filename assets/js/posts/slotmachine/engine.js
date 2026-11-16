/* Shared by the browser demo and the mathematical checks. */
(function (root) {
  const lines = [
    [1, 1, 1, 1, 1],
    [0, 0, 0, 0, 0],
    [2, 2, 2, 2, 2],
    [0, 1, 2, 1, 0],
    [2, 1, 0, 1, 2],
  ];
  function gridAt(reels, stops) {
    return [0, 1, 2].map((row) => reels.map((reel, i) => reel[(stops[i] + row - 1 + reel.length) % reel.length]));
  }
  function evaluate(grid, paytable) {
    const wins = [];
    lines.forEach((line, index) => {
      const symbol = grid[line[0]][0];
      let length = 1;
      while (length < 5 && grid[line[length]][length] === symbol) length++;
      if (length >= 3) wins.push({ line: index, symbol, length, payout: paytable[symbol][length - 3] });
    });
    return { wins, payout: wins.reduce((sum, win) => sum + win.payout, 0) };
  }
  function spin(set, random = Math.random) {
    const stops = set.reels.map((reel) => Math.floor(random() * reel.length));
    const grid = gridAt(set.reels, stops);
    return { grid, stops, ...evaluate(grid, set.paytable) };
  }
  function theory(set) {
    let expected = 0;
    let lineHit = 0;
    const details = Object.entries(set.paytable).map(([symbol, awards]) => {
      const p = set.reels.map((reel) => reel.filter((s) => s === symbol).length / reel.length);
      const first3 = p[0] * p[1] * p[2];
      const probabilities = [first3 * (1 - p[3]), first3 * p[3] * (1 - p[4]), first3 * p[3] * p[4]];
      const value = probabilities.reduce((sum, probability, i) => sum + probability * awards[i], 0);
      expected += value;
      lineHit += first3;
      return { symbol, p, probabilities, value };
    });
    return { rtp: expected * lines.length, lineHit, details };
  }
  function seededRandom(seed) {
    let state = seed >>> 0;
    return function () {
      state += 0x6d2b79f5;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function moments(set) {
    // A longest-match payout equals a3*I(>=3) + (a4-a3)*I(>=4) + (a5-a4)*I(>=5).
    // Joint indicators preserve neighboring-symbol and shared-payline dependence.
    const terms = lines.flatMap((line) =>
      Object.entries(set.paytable).flatMap(([symbol, awards]) =>
        awards.map((award, i) => ({ line, symbol, length: i + 3, weight: award - (awards[i - 1] || 0) }))
      )
    );
    const cache = new Map();
    function joint(a, b) {
      let probability = 1;
      for (let r = 0; r < Math.max(a.length, b.length); r++) {
        const rowA = r < a.length ? a.line[r] : -1;
        const rowB = r < b.length ? b.line[r] : -1;
        const key = `${r}:${rowA}:${a.symbol}:${rowB}:${b.symbol}`;
        if (!cache.has(key)) {
          const reel = set.reels[r];
          let count = 0;
          for (let stop = 0; stop < reel.length; stop++) {
            if ((rowA < 0 || reel[(stop + rowA) % reel.length] === a.symbol) && (rowB < 0 || reel[(stop + rowB) % reel.length] === b.symbol)) count++;
          }
          cache.set(key, count / reel.length);
        }
        probability *= cache.get(key);
        if (!probability) break;
      }
      return probability;
    }
    let mean = 0,
      second = 0;
    for (let i = 0; i < terms.length; i++) {
      mean += terms[i].weight * joint(terms[i], terms[i]);
      for (let j = i; j < terms.length; j++) second += (i === j ? 1 : 2) * terms[i].weight * terms[j].weight * joint(terms[i], terms[j]);
    }
    const variance = Math.max(0, second - mean * mean);
    return { mean, second, variance, sd: Math.sqrt(variance) };
  }
  function balancingStages(set) {
    const intermediate = {
      reels: set.reels.map((reel) => [...reel]),
      paytable: Object.fromEntries(Object.entries(set.paytable).map(([s, awards]) => [s, [...awards]])),
    };
    intermediate.paytable.J[2] = 90;
    const initial = { reels: intermediate.reels.map((reel) => [...reel]), paytable: intermediate.paytable };
    initial.reels[0][initial.reels[0].indexOf("J")] = "B";
    return [initial, intermediate, set].map((configuration) => theory(configuration).rtp);
  }
  function payoutSampler(set, random = Math.random) {
    // Cache each circular window; large simulations need only the total award.
    const symbols = Object.keys(set.paytable);
    const windows = set.reels.map((reel) =>
      reel.map((_, stop) => [0, 1, 2].map((row) => symbols.indexOf(reel[(stop + row - 1 + reel.length) % reel.length])))
    );
    const awards = symbols.map((symbol) => set.paytable[symbol]);
    const visible = Array(5);
    return function () {
      for (let r = 0; r < 5; r++) visible[r] = windows[r][Math.floor(random() * windows[r].length)];
      let payout = 0;
      for (let l = 0; l < lines.length; l++) {
        const line = lines[l];
        const symbol = visible[0][line[0]];
        let length = 1;
        while (length < 5 && visible[length][line[length]] === symbol) length++;
        if (length >= 3) payout += awards[symbol][length - 3];
      }
      return payout;
    };
  }
  const api = { lines, gridAt, evaluate, spin, theory, moments, balancingStages, payoutSampler, seededRandom };
  root.SlotMath = api;
  if (typeof module !== "undefined") module.exports = api;
})(globalThis);
