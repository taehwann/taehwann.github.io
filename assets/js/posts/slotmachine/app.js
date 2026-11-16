(function () {
  const mount = document.getElementById("slotmachine-post");
  if (!mount) return;
  const sets = globalThis.SLOT_DATA;
  const math = globalThis.SlotMath;
  const $ = (id) => mount.querySelector(`#${id}`);
  const percent = (value) => `${(value * 100).toFixed(2)}%`;
  const integer = (value) => value.toLocaleString("en-US");
  let selected = 1;
  $("reel-set").value = String(selected);
  let spent = 0;
  let returned = 0;
  let busy = false;
  let lastWin = 0;
  let autoSpin = false;
  let autoTimer = null;
  const initialCoins = 100;
  const assetRoot = mount.dataset.assetRoot;
  const lineColors = ["#ffdc76", "#6cffff", "#ff94d1", "#acff7d", "#c7afff"];

  function symbolImage(symbol) {
    const image = document.createElement("img");
    image.src = `${assetRoot}${symbol}.png`;
    image.alt = symbol;
    image.draggable = false;
    return image;
  }
  function makeSymbol(symbol, winning = false) {
    const cell = document.createElement("div");
    cell.className = `reel-symbol${winning ? " winning" : ""}`;
    cell.append(symbolImage(symbol));
    return cell;
  }

  function showGrid(grid, wins = []) {
    const highlighted = new Set();
    wins.forEach((win) => {
      for (let col = 0; col < win.length; col++) highlighted.add(`${math.lines[win.line][col]}-${col}`);
    });
    $("grid").replaceChildren();
    for (let c = 0; c < 5; c++) {
      const window = document.createElement("div");
      window.className = "reel-window";
      window.setAttribute("aria-hidden", "true");
      const track = document.createElement("div");
      track.className = "reel-track";
      grid.forEach((row, r) => track.append(makeSymbol(row[c], highlighted.has(`${r}-${c}`))));
      window.append(track);
      $("grid").append(window);
    }
    $("win-lines").innerHTML = wins
      .map((win) => {
        const points = math.lines[win.line]
          .slice(0, win.length)
          .map((r, c) => `${50 + c * 100},${50 + r * 100}`)
          .join(" ");
        return `<polyline points="${points}" fill="none" stroke="${lineColors[win.line]}" stroke-width="3" vector-effect="non-scaling-stroke"/>`;
      })
      .join("");
    $("grid").setAttribute(
      "aria-label",
      `Slot result. Top row: ${grid[0].join(", ")}. Middle row: ${grid[1].join(", ")}. Bottom row: ${grid[2].join(", ")}. ${wins.length} winning lines.`
    );
  }
  async function animateReels(result, set) {
    $("win-lines").replaceChildren();
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || !Element.prototype.animate) return;
    const animations = [...$("grid").children].map((window, c) => {
      const steps = 16 + c * 5;
      const reel = set.reels[c];
      const track = window.firstElementChild;
      track.replaceChildren();
      for (let i = 0; i < steps + 3; i++) {
        const index = (result.stops[c] - 1 + i + reel.length) % reel.length;
        track.append(makeSymbol(reel[index]));
      }
      const animation = track.animate([{ transform: `translateY(-${(steps * 100) / 3}%)` }, { transform: "translateY(0)" }], {
        duration: 850 + c * 200,
        easing: "cubic-bezier(.16,.62,.26,1)",
        fill: "forwards",
      });
      return animation.finished.then(() => {
        track.replaceChildren(...result.grid.map((row) => makeSymbol(row[c])));
        animation.cancel();
      });
    });
    await Promise.all(animations);
  }
  function updateSession() {
    const balance = initialCoins + returned - spent;
    $("balance").textContent = integer(balance);
    $("last-win").textContent = integer(lastWin);
    $("spin").disabled = busy || autoSpin || balance < 1;
    $("auto-spin").disabled = balance < 1 && !busy && !autoSpin;
    ["reset", "reel-set"].forEach((id) => {
      $(id).disabled = busy || autoSpin;
    });
    $("spent").textContent = integer(spent);
    $("returned").textContent = integer(returned);
    $("net").textContent = `${returned - spent > 0 ? "+" : ""}${integer(returned - spent)}`;
    $("session-rtp").textContent = spent ? percent(returned / spent) : "—";
  }
  function reset() {
    if (busy) return;
    setAutoSpin(false);
    spent = returned = 0;
    lastWin = 0;
    updateSession();
    showGrid(math.gridAt(sets[selected].reels, [0, 0, 0, 0, 0]));
    $("win-details").replaceChildren();
    $("board").classList.remove("has-win");
    $("spin-result").textContent = "100 virtual coins. All five paylines are active.";
  }
  $("reel-set").addEventListener("change", () => {
    selected = Number($("reel-set").value);
    reset();
  });
  $("reset").addEventListener("click", reset);
  $("show-paytable").addEventListener("click", () => {
    const panel = $("game-paytable");
    panel.hidden = !panel.hidden;
    $("show-paytable").setAttribute("aria-expanded", String(!panel.hidden));
  });
  function setAutoSpin(active) {
    autoSpin = active;
    if (autoTimer !== null) clearTimeout(autoTimer);
    autoTimer = null;
    $("auto-spin").textContent = active ? "Stop Auto" : "Auto Spin";
    $("auto-spin").setAttribute("aria-pressed", String(active));
    $("auto-spin").title = active ? "Stop after the current spin finishes" : "Repeat spins until stopped or coins run out";
    updateSession();
  }
  $("auto-spin").addEventListener("click", () => {
    if (autoSpin) {
      setAutoSpin(false);
      return;
    }
    if (initialCoins + returned - spent < 1) return;
    setAutoSpin(true);
    if (!busy) return playSpin();
  });
  $("spin").addEventListener("click", () => {
    if (!autoSpin) return playSpin();
  });
  async function playSpin() {
    if (busy || initialCoins + returned - spent < 1) return;
    busy = true;
    ["spin", "reset", "reel-set"].forEach((id) => {
      $(id).disabled = true;
    });
    const result = math.spin(sets[selected]);
    spent++;
    lastWin = 0;
    updateSession();
    $("win-details").replaceChildren();
    $("board").classList.remove("has-win");
    $("spin-result").textContent = "Reels spinning…";
    $("grid").setAttribute("aria-busy", "true");
    try {
      await animateReels(result, sets[selected]);
    } catch (error) {
      // A canceled visual animation must still settle the sampled outcome.
      console.warn("Reel animation interrupted; displaying the selected result.", error);
    }
    returned += result.payout;
    lastWin = result.payout;
    showGrid(result.grid, result.wins);
    busy = false;
    updateSession();
    $("spin-result").textContent = result.wins.length
      ? `${result.payout} coins returned. ${result.wins.map((w) => `Line ${w.line + 1}: ${w.length} ${w.symbol}’s (${w.payout} coins)`).join("; ")}.`
      : initialCoins + returned - spent === 0
        ? "No coins remaining. Reset to start again with 100 virtual coins."
        : "No paying match. 1 coin spent.";
    $("win-details").innerHTML = result.wins
      .map(
        (win) =>
          `<span style="--line-color:${lineColors[win.line]}">Line ${win.line + 1} · ${win.length} × ${win.symbol} · ${win.payout} coins</span>`
      )
      .join("");
    $("board").classList.toggle("has-win", result.payout > 0);
    $("grid").setAttribute("aria-busy", "false");
    if (initialCoins + returned - spent < 1) setAutoSpin(false);
    else if (autoSpin) {
      autoTimer = setTimeout(
        () => {
          autoTimer = null;
          if (autoSpin) void playSpin();
        },
        result.payout > 0 ? 1400 : 650
      );
    }
  }

  math.lines.forEach((line, index) => {
    const element = document.createElement("div");
    element.className = "payline";
    const dots = [0, 1, 2]
      .flatMap((r) => [0, 1, 2, 3, 4].map((c) => `<circle cx="${8 + c * 17}" cy="${8 + r * 17}" r="2" fill="#c0c8b7"/>`))
      .join("");
    const points = line.map((r, c) => `${8 + c * 17},${8 + r * 17}`).join(" ");
    element.innerHTML = `<svg viewBox="0 0 84 50" role="img" aria-label="Line ${index + 1}, rows ${line.map((r) => ["top", "middle", "bottom"][r]).join(", ")}">${dots}<polyline points="${points}" fill="none" stroke="#35634a" stroke-width="2"/></svg>Line ${index + 1}`;
    $("paylines").append(element);
  });
  for (const [symbol, awards] of Object.entries(sets[0].paytable)) {
    for (const target of ["paytable", "game-paytable-body"]) {
      const row = document.createElement("tr");
      const heading = document.createElement("th");
      heading.scope = "row";
      heading.className = "symbol-heading";
      heading.append(symbolImage(symbol), document.createTextNode(symbol));
      row.append(heading);
      for (const award of awards) {
        const cell = document.createElement("td");
        cell.textContent = award;
        row.append(cell);
      }
      $(target).append(row);
    }
  }
  const exactMoments = sets.map(math.moments);
  const balancingRTP = math.balancingStages(sets[0]);
  let balancingSVG =
    '<svg viewBox="0 0 640 230" role="img" aria-label="Theoretical RTP rises from 83.4806912 percent to 91.1615488 percent and then 95.9999488 percent after adjusting reels and payouts.">';
  for (const tick of [0, 0.25, 0.5, 0.75, 1]) {
    const y = 180 - tick * 145;
    balancingSVG += `<line x1="55" x2="620" y1="${y}" y2="${y}" stroke="#d6dacd"/><text x="45" y="${y + 4}" text-anchor="end" font-family="Arial" font-size="11" fill="#626b5b">${tick * 100}%</text>`;
  }
  balancingRTP.forEach((rtp, i) => {
    const x = 90 + i * 180;
    const height = rtp * 145;
    balancingSVG += `<rect x="${x}" y="${180 - height}" width="110" height="${height}" rx="3" fill="${["#9b7860", "#819371", "#35634a"][i]}"/><text x="${x + 55}" y="${168 - height}" text-anchor="middle" font-family="Arial" font-size="13" fill="#454d42">${percent(rtp)}</text><text x="${x + 55}" y="205" text-anchor="middle" font-family="Arial" font-size="11" fill="#626b5b">${["Initial", "Reel adjustment", "Paytable adjustment"][i]}</text>`;
  });
  balancingSVG += `<line x1="55" x2="620" y1="${180 - 0.96 * 145}" y2="${180 - 0.96 * 145}" stroke="#b4603c" stroke-dasharray="5 4"/></svg>`;
  $("balance-chart").innerHTML = balancingSVG;

  function drawSpread(target, values, sampled = false, metric = "sd") {
    const label = metric === "variance" ? "Variance of spin payout (coins squared)" : "Standard deviation of spin payout (coins)";
    const max = Math.max(...values, ...exactMoments.map((m) => m[metric])) * 1.18;
    let svg = `<svg viewBox="0 0 640 190" role="img" aria-label="${sampled ? "Sample" : "Exact"} ${label}: J-heavy ${values[0].toFixed(2)}; A–D-heavy ${values[1].toFixed(2)}. Higher values mean a wider payout spread.">`;
    values.forEach((value, i) => {
      const y = 28 + i * 65;
      const width = (value / max) * 415;
      const marker = 130 + (exactMoments[i][metric] / max) * 415;
      svg += `<text x="8" y="${y + 19}" fill="#454d42" font-family="Arial" font-size="12">${sets[i].name}</text><rect x="130" y="${y}" width="${width}" height="30" rx="2" fill="${["#35634a", "#bc603b"][i]}"/><text x="${140 + width}" y="${y + 19}" fill="#454d42" font-family="Arial" font-size="12">${value.toFixed(2)}</text>`;
      if (sampled) svg += `<line x1="${marker}" x2="${marker}" y1="${y - 5}" y2="${y + 35}" stroke="#202a23" stroke-width="2"/>`;
    });
    svg += `<text x="130" y="161" fill="#626b5b" font-family="Arial" font-size="11">${label}, bars start at zero</text><text x="130" y="180" fill="#626b5b" font-family="Arial" font-size="11">${sampled ? `Black markers: exact ${metric === "variance" ? "variance" : "standard deviation"}` : "Exact calculation includes covariance between paylines"}</text></svg>`;
    $(target).innerHTML = svg;
  }
  drawSpread(
    "variance-chart",
    exactMoments.map((m) => m.variance),
    false,
    "variance"
  );

  function drawBankroll(stats, count) {
    const width = 640,
      height = 280,
      left = 58,
      right = 15,
      top = 20,
      bottom = 42;
    const horizon = Math.max(...stats.map((s) => s.ruin ?? count));
    const maxBalance = Math.max(1000, ...stats.flatMap((s) => s.bankSamples.map((p) => p[1]))) * 1.1;
    const x = (n) => left + (n / horizon) * (width - left - right);
    const y = (balance) => top + (1 - balance / maxBalance) * (height - top - bottom);
    let svg = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Two example bankroll paths starting at 1,000 coins, stopping at zero or ${integer(count)} spins. Final balances and stopping times are described below.">`;
    for (let i = 0; i <= 4; i++) {
      const b = (maxBalance * i) / 4;
      svg += `<line x1="${left}" x2="${width - right}" y1="${y(b)}" y2="${y(b)}" stroke="#d6dacd"/><text x="${left - 8}" y="${y(b) + 4}" text-anchor="end" font-family="Arial" font-size="10" fill="#626b5b">${integer(Math.round(b))}</text>`;
    }
    stats.forEach((s, i) => {
      svg += `<polyline points="${s.bankSamples.map(([n, b]) => `${x(n)},${y(b)}`).join(" ")}" stroke="${["#35634a", "#bc603b"][i]}" stroke-width="2" fill="none"/>`;
      const end = s.bankSamples[s.bankSamples.length - 1];
      svg += `<circle cx="${x(end[0])}" cy="${y(end[1])}" r="4" fill="${["#35634a", "#bc603b"][i]}"/>`;
    });
    for (const fraction of [0, 0.25, 0.5, 0.75, 1])
      svg += `<text x="${x(horizon * fraction)}" y="${height - 20}" text-anchor="${fraction === 0 ? "start" : fraction === 1 ? "end" : "middle"}" font-family="Arial" font-size="10" fill="#626b5b">${integer(Math.round(horizon * fraction))}</text>`;
    svg += `<text x="${width / 2}" y="${height - 3}" text-anchor="middle" font-family="Arial" font-size="10" fill="#626b5b">Spins played · balance in coins on vertical axis</text></svg>`;
    $("bankroll-chart").innerHTML = svg;
    $("bankroll-status").textContent = stats
      .map(
        (s, i) =>
          `${sets[i].name}: ${s.ruin !== null ? `ran out of coins at spin ${integer(s.ruin)}` : `${integer(s.bankroll)} coins remaining after ${integer(count)} spins`}.`
      )
      .join(" ");
  }

  function drawChart(samples, count) {
    const width = 640,
      height = 265;
    const left = 52,
      right = 12,
      top = 17,
      bottom = 40;
    const values = samples.flatMap((series) => series.map((p) => p[1]));
    const low = Math.max(0, Math.floor((Math.min(0.96, ...values) - 0.05) * 10) / 10);
    const high = Math.ceil((Math.max(0.96, ...values) + 0.05) * 10) / 10;
    const x = (n) => left + (n / count) * (width - left - right);
    const y = (p) => top + ((high - p) / (high - low)) * (height - top - bottom);
    let svg = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Cumulative return comparison for ${integer(count)} spins. Green shows J-heavy reels and orange shows A–D-heavy reels. Exact final values are in the table below.">`;
    for (let i = 0; i <= 4; i++) {
      const p = low + ((high - low) * i) / 4;
      svg += `<line x1="${left}" x2="${width - right}" y1="${y(p)}" y2="${y(p)}" stroke="#d6dacd"/><text x="${left - 8}" y="${y(p) + 4}" text-anchor="end" fill="#626b5b" font-family="Arial" font-size="11">${Math.round(p * 100)}%</text>`;
    }
    svg += `<line x1="${left}" x2="${width - right}" y1="${y(0.96)}" y2="${y(0.96)}" stroke="#7b8473" stroke-dasharray="5 4"/>`;
    samples.forEach((series, i) => {
      svg += `<polyline points="${series.map(([n, p]) => `${x(n)},${y(p)}`).join(" ")}" fill="none" stroke="${["#35634a", "#bc603b"][i]}" stroke-width="2"/>`;
    });
    for (const fraction of [0, 0.25, 0.5, 0.75, 1])
      svg += `<text x="${x(count * fraction)}" y="${height - 20}" text-anchor="${fraction === 0 ? "start" : fraction === 1 ? "end" : "middle"}" fill="#626b5b" font-family="Arial" font-size="10">${integer(count * fraction)}</text>`;
    svg += `<text x="${width / 2}" y="${height - 3}" text-anchor="middle" fill="#626b5b" font-family="Arial" font-size="10">Spins per reel set</text></svg>`;
    $("chart").innerHTML = svg;
  }
  let simulationRun = 0;
  $("reset-simulation").addEventListener("click", () => {
    simulationRun++;
    $("simulate").disabled = false;
    $("spin-count").disabled = false;
    $("simulation-status").textContent = "Ready. Run the experiments to populate both interactive graphs.";
    $("chart").innerHTML = "<p>Run the experiments to trace observed RTP.</p>";
    $("bankroll-chart").innerHTML = "<p>Run the experiments above to follow the two players.</p>";
    $("bankroll-status").textContent = "Each player starts with 1,000 coins.";
    $("simulation-table").replaceChildren();
  });
  $("simulate").addEventListener("click", async () => {
    if ($("simulate").disabled) return;
    const run = ++simulationRun;
    $("simulate").disabled = true;
    $("spin-count").disabled = true;
    const count = Number($("spin-count").value);
    const seed = crypto.getRandomValues(new Uint32Array(1))[0];
    const stats = sets.map((_, i) => ({
      sum: 0,
      hits: 0,
      mean: 0,
      m2: 0,
      max: 0,
      samples: [],
      rng: math.seededRandom(seed + i),
      bankroll: 1000,
      ruin: null,
      bankSamples: [[0, 1000]],
      bankInterval: Math.min(100, count / 200),
    }));
    const samplers = sets.map((set, i) => math.payoutSampler(set, stats[i].rng));
    const interval = count / 200;
    for (let start = 0; start < count; start += 10000) {
      const end = Math.min(start + 10000, count);
      for (let n = start + 1; n <= end; n++) {
        sets.forEach((set, i) => {
          const payout = samplers[i]();
          const s = stats[i];
          if (s.ruin === null) {
            s.bankroll += payout - 1;
            if (s.bankroll === 0) {
              s.ruin = n;
              s.bankSamples.push([n, 0]);
            } else if (n % s.bankInterval === 0 || n === count) {
              s.bankSamples.push([n, s.bankroll]);
              if (s.bankSamples.length > 800) {
                s.bankSamples = s.bankSamples.filter((_, index, points) => index % 2 === 0 || index === points.length - 1);
                s.bankInterval *= 2;
              }
            }
          }
          s.sum += payout;
          s.hits += Number(payout > 0);
          s.max = Math.max(s.max, payout);
          const delta = payout - s.mean;
          s.mean += delta / n;
          s.m2 += delta * (payout - s.mean);
          if (n % interval === 0) s.samples.push([n, s.sum / n]);
        });
      }
      $("simulation-status").textContent = `Simulating ${integer(end)} / ${integer(count)} spins per reel set… Seed: ${seed}.`;
      await new Promise((resolve) => setTimeout(resolve, 0));
      if (run !== simulationRun) return;
    }
    drawChart(
      stats.map((s) => s.samples),
      count
    );
    drawBankroll(stats, count);
    const rows = [
      ["Observed return", (s) => percent(s.sum / count)],
      ["Spins with any win", (s) => `${percent(s.hits / count)} (${integer(s.hits)})`],
      ["Largest spin payout", (s) => `${integer(s.max)} coins`],
    ];
    $("simulation-table").innerHTML = rows
      .map(([label, format]) => `<tr><th scope="row">${label}</th>${stats.map((s) => `<td>${format(s)}</td>`).join("")}</tr>`)
      .join("");
    $("simulation-status").textContent =
      `Finished ${integer(count)} spins per reel set. Seed: ${seed}. Chart sampled every ${integer(interval)} spins.`;
    $("simulate").disabled = false;
    $("spin-count").disabled = false;
  });
  reset();
})();
