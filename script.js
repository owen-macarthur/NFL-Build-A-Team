// script.js
// -----------------------------------------------------------------------
// UI layer only. This file should not contain game-balance math -- that
// all lives in engine.js / chemistry.js / packs.js. If you're tuning
// numbers, you almost certainly want one of those files instead.
// -----------------------------------------------------------------------
import { TEAMS, createDefaultRoster, FREE_AGENTS, OFFENSE_SCHEMES, DEFENSE_SCHEMES } from "./data.js";
import { computeChemistry, explainChemistry, tagsFitQb, UNIT_LABEL, TAG_TO_UNIT } from "./chemistry.js";
import { teamStrength, simulateWeek, generatePlayByPlay, computeQbMultiplier, computeFinalScore, effectiveUnitRating, netSchemeAdvantage } from "./engine.js";
import { generateWinPack, generateLossPack, generateIntroPack, tickRentals } from "./packs.js";

const WEEKS_TOTAL = 8; // Prototype length. Full version target: 17 + playoffs.
const PLAYOFF_LINE = Math.ceil((WEEKS_TOTAL * 10) / 17); // scaled version of "10-7 or better"
const SPIN_MS = 1100; // how long a pack card "spins" before revealing

const app = document.getElementById("app");

let state = null;

function newGameState(identity, qb, choiceSet) {
  return {
    identity,                        // the real team you drafted from (city/name/color, flavor only)
    roster: createDefaultRoster(qb), // your actual playable roster -- starts nearly empty
    qbMultiplier: computeQbMultiplier(qb, choiceSet),
    rentals: [],                     // active rental tracking, ticked only when a game is played (runSim)
    ownedPlayers: new Set(),         // every player name ever acquired -- packs never repeat these
    week: 1,
    wins: 0,
    losses: 0,
    streak: 0,
    gradeHistory: [],
  };
}

function currentChemistry() {
  return computeChemistry(state.roster);
}

function phaseHeading(text) {
  return `<div class="eyebrow">${text}</div>`;
}

function tagRow(tags) {
  if (!tags.length) return "";
  return `<div class="tag-row">${tags.map((t) => `<span class="tag">${t.replace("_", " ")}</span>`).join("")}</div>`;
}

// Small "games left" pill for a rental-tracked player, or "" if they're
// not currently a rental. Rentals are tracked by player object reference,
// so this works the same for a WR, RB, TE, or defender.
function rentalBadge(player) {
  const r = state.rentals.find((x) => x.player === player);
  return r ? `<span class="tag">⏳ ${r.gamesLeft} left</span>` : "";
}

// ---------------------------------------------------------------------
// Screen: Title
// ---------------------------------------------------------------------
function renderTitle() {
  app.innerHTML = `
    ${phaseHeading("Underdog GM &middot; Prototype")}
    <h1>UNDERDOG GM</h1>
    <p>Draft a QB, build a roster from nothing, and see how far you can carry a team that isn't stacked. Beat the odds and your score multiplier climbs.</p>
    <button id="start-btn">Start Season</button>
  `;
  document.getElementById("start-btn").addEventListener("click", renderQbSelect);
}

// ---------------------------------------------------------------------
// Screen: QB Select -- 3 random QBs, pick one
// ---------------------------------------------------------------------
function renderQbSelect() {
  const shuffled = [...TEAMS].sort(() => Math.random() - 0.5).slice(0, 3);
  const choices = shuffled.map((t) => ({ team: t, qb: t.qb }));

  app.innerHTML = `
    ${phaseHeading("Draft Room")}
    <h1>Pick Your QB</h1>
    <p>Everyone else on your roster starts as a replacement-level default player -- your QB is the only proven piece. Lower overall = a bigger multiplier on your final score.</p>
    <div class="card-grid" id="qb-grid"></div>
  `;

  const grid = document.getElementById("qb-grid");
  choices.forEach(({ team, qb }) => {
    const mult = computeQbMultiplier(qb, choices.map((c) => c.qb));
    const card = document.createElement("div");
    card.className = "card selectable";
    card.tabIndex = 0;
    card.innerHTML = `
      <div class="qb-name">${qb.name}</div>
      <div class="qb-team">${team.city} ${team.name}</div>
      <span class="overall-pill">OVR ${qb.overall}</span>
      <div class="tag-row">${qb.tags.map((t) => `<span class="tag">${t.replace("_", " ")}</span>`).join("")}</div>
      <div class="multiplier-badge"><span>&times;</span><span class="num">${mult.toFixed(2)}</span></div>
    `;
    const choose = () => {
      state = newGameState(team, qb, choices.map((c) => c.qb));
      renderIntroPack();
    };
    card.addEventListener("click", choose);
    card.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") choose(); });
    grid.appendChild(card);
  });
}

// ---------------------------------------------------------------------
// Screen: Scheme select -- one offense scheme, one defense scheme
// ---------------------------------------------------------------------
function schemeUsedByCities(key, field) {
  return TEAMS.filter((t) => t[field] === key).slice(0, 3).map((t) => t.city).join(", ");
}

function renderSchemeSelect() {
  app.innerHTML = `
    ${phaseHeading("Scheme Room")}
    <h1>Pick Your Identity</h1>
    <p>One offensive scheme, one defensive scheme. Matchups matter -- the right scheme against the wrong opponent can steal a win.</p>
    <div id="scheme-roster-toggle"></div>
    <h3>Offense</h3>
    <div class="card-grid" id="off-scheme-grid"></div>
    <h3 style="margin-top:18px;">Defense</h3>
    <div class="card-grid" id="def-scheme-grid"></div>
    <button id="scheme-confirm-btn" style="margin-top:16px; display:none;">Confirm Schemes</button>
  `;
  attachRosterToggle(document.getElementById("scheme-roster-toggle"));

  let chosenOff = null;
  let chosenDef = null;

  const offGrid = document.getElementById("off-scheme-grid");
  Object.entries(OFFENSE_SCHEMES).forEach(([key, scheme]) => {
    const card = document.createElement("div");
    card.className = "card selectable";
    card.tabIndex = 0;
    card.innerHTML = `
      <div class="qb-name">${scheme.label}</div>
      <p>${scheme.bio}</p>
      <div class="eyebrow">Used by: ${schemeUsedByCities(key, "offenseScheme")}</div>
    `;
    const choose = () => {
      chosenOff = key;
      [...offGrid.children].forEach((c) => { c.style.outline = ""; });
      card.style.outline = "3px solid var(--gold)";
      maybeShowConfirm();
    };
    card.addEventListener("click", choose);
    card.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") choose(); });
    offGrid.appendChild(card);
  });

  const defGrid = document.getElementById("def-scheme-grid");
  Object.entries(DEFENSE_SCHEMES).forEach(([key, scheme]) => {
    const card = document.createElement("div");
    card.className = "card selectable";
    card.tabIndex = 0;
    card.innerHTML = `
      <div class="qb-name">${scheme.label}</div>
      <p>${scheme.bio}</p>
      <div class="eyebrow">Used by: ${schemeUsedByCities(key, "defenseScheme")}</div>
    `;
    const choose = () => {
      chosenDef = key;
      [...defGrid.children].forEach((c) => { c.style.outline = ""; });
      card.style.outline = "3px solid var(--gold)";
      maybeShowConfirm();
    };
    card.addEventListener("click", choose);
    card.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") choose(); });
    defGrid.appendChild(card);
  });

  function maybeShowConfirm() {
    const btn = document.getElementById("scheme-confirm-btn");
    if (chosenOff && chosenDef) {
      btn.style.display = "";
      btn.onclick = () => {
        state.roster.offenseScheme = chosenOff;
        state.roster.defenseScheme = chosenDef;
        renderTeamReveal();
      };
    }
  }
}

// ---------------------------------------------------------------------
// Screen: Intro Pack -- fantasy pack: choose 2 of 3 offense, 2 of 3 defense
// ---------------------------------------------------------------------
function renderIntroPack() {
  const { offense, defense } = generateIntroPack(state.ownedPlayers);
  const selectedOffense = new Set();
  const selectedDefense = new Set();

  app.innerHTML = `
    ${phaseHeading("Intro Pack")}
    <h1>Fantasy Pack</h1>
    <p>Pick 2 of these 3 offensive players, and 2 of these 3 defensive players. Yours for the season.</p>
    <h3>Offense -- choose 2 of 3</h3>
    <div class="card-grid" id="intro-off-grid"></div>
    <h3 style="margin-top:18px;">Defense -- choose 2 of 3</h3>
    <div class="card-grid" id="intro-def-grid"></div>
    <button id="intro-confirm-btn" style="margin-top:16px; display:none;">Confirm Picks</button>
  `;

  const offGrid = document.getElementById("intro-off-grid");
  const defGrid = document.getElementById("intro-def-grid");
  offense.forEach((opt) => offGrid.appendChild(buildSpinCard(opt)));
  defense.forEach((opt) => defGrid.appendChild(buildSpinCard(opt)));

  spinAll([...offense, ...defense], () => {
    wireToggleGroup(offense, selectedOffense, 2, maybeShowIntroConfirm);
    wireToggleGroup(defense, selectedDefense, 2, maybeShowIntroConfirm);
  });

  function maybeShowIntroConfirm() {
    const btn = document.getElementById("intro-confirm-btn");
    if (selectedOffense.size === 2 && selectedDefense.size === 2) {
      btn.style.display = "";
      btn.onclick = () => {
        offense.filter((o) => selectedOffense.has(o.id)).forEach((o) => o.apply(state));
        defense.filter((o) => selectedDefense.has(o.id)).forEach((o) => o.apply(state));
        renderSchemeSelect();
      };
    } else {
      btn.style.display = "none";
    }
  }
}

// Wires click-to-toggle selection (max `limit` picks) across a group of
// pack option cards, using an outline as the "selected" indicator.
function wireToggleGroup(options, selectedSet, limit, onChange) {
  options.forEach((opt) => {
    const card = app.querySelector(`.pack-option[data-id="${opt.id}"]`);
    card.style.pointerEvents = "";
    card.classList.add("selectable");
    card.tabIndex = 0;
    const toggle = () => {
      if (selectedSet.has(opt.id)) {
        selectedSet.delete(opt.id);
        card.style.outline = "";
      } else if (selectedSet.size < limit) {
        selectedSet.add(opt.id);
        card.style.outline = "3px solid var(--gold)";
      }
      onChange();
    };
    card.addEventListener("click", toggle);
    card.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") toggle(); });
  });
}

// ---------------------------------------------------------------------
// Pack-card spin helpers (shared by intro/win/loss packs)
// ---------------------------------------------------------------------
function buildSpinCard(opt) {
  const card = document.createElement("div");
  card.className = "card pack-option";
  card.setAttribute("data-id", opt.id);
  const isNamedReveal = opt.player && opt.title === opt.player.name;
  const initialText = opt.player ? "? ? ?" : (opt.flavorTitle || opt.title);
  card.innerHTML = `
    <h3>${isNamedReveal ? "New Player" : opt.title}</h3>
    <div class="spin-name qb-name">${initialText}</div>
    <div class="pack-reveal" style="display:none;"></div>
  `;
  return card;
}

// Cycles each card's name through random candidates at the same position
// as the real pick, then locks in on the true result.
function spinAll(options, onAllDone) {
  let remaining = options.length;
  function finishSpin() {
    remaining--;
    if (remaining === 0) onAllDone();
  }

  options.forEach((opt) => {
    const card = app.querySelector(`.pack-option[data-id="${opt.id}"]`);
    const nameEl = card.querySelector(".spin-name");

    if (!opt.player) {
      finishSpin();
      return;
    }

    const candidates = [
      ...FREE_AGENTS.superstar, ...FREE_AGENTS.great, ...FREE_AGENTS.solid, ...FREE_AGENTS.depth,
    ].filter((p) => p.pos === opt.player.pos);
    const namesToSpin = candidates.length ? candidates : [opt.player];

    let ticks = 0;
    const totalTicks = Math.round(SPIN_MS / 70);
    const interval = setInterval(() => {
      nameEl.textContent = namesToSpin[Math.floor(Math.random() * namesToSpin.length)].name;
      ticks++;
      if (ticks >= totalTicks) {
        clearInterval(interval);
        nameEl.textContent = opt.player.name;
        finishSpin();
      }
    }, 70);
  });

  // Reveal each card's detail content once its own spin lands.
  options.forEach((opt) => {
    const card = app.querySelector(`.pack-option[data-id="${opt.id}"]`);
    const check = setInterval(() => {
      const nameEl = card.querySelector(".spin-name");
      const isDone = !opt.player || nameEl.textContent === opt.player.name;
      if (isDone) {
        clearInterval(check);
        const reveal = card.querySelector(".pack-reveal");
        const fit = opt.player && tagsFitQb(state.roster.qb.tags, opt.player.tags);
        reveal.innerHTML = `
          <p>${opt.description}</p>
          ${opt.player ? tagRow(opt.player.tags) : ""}
          ${fit ? `<span class="tag">✓ Scheme Fit</span>` : ""}
        `;
        reveal.style.display = "";
      }
    }, 80);
  });
}

// ---------------------------------------------------------------------
// Screen: Team reveal + chemistry breakdown
// ---------------------------------------------------------------------
// Shared roster display (Offense + Defense cards), including RB/TE bench
// rows when they exist. Used by the team reveal screen and by the
// "View Roster" toggle available on the scheme-select and pack screens.
function rosterCardsHtml(r) {
  const defenseByUnit = { DL: [], LB: [], Secondary: [] };
  r.defensePlayers.forEach((p) => {
    const unit = TAG_TO_UNIT[p.tags[0]];
    if (unit && defenseByUnit[unit]) defenseByUnit[unit].push(p);
  });

  const unitRow = (unitKey) => {
    const rating = Math.round(effectiveUnitRating(r, unitKey));
    const players = defenseByUnit[unitKey] || [];
    return `
      <div class="roster-row"><span class="roster-role">${unitKey}</span><span>${UNIT_LABEL[unitKey]}</span><span class="overall-pill">${rating}</span></div>
      ${players.map((p) => `
        <div class="roster-row" style="padding-left:16px;"><span class="roster-role">${p.pos}</span><span>${p.name}${tagRow(p.tags)}${rentalBadge(p)}</span><span class="overall-pill">${p.overall}</span></div>
      `).join("")}
    `;
  };

  const benchRow = (label, player) => `
    <div class="roster-row" style="padding-left:16px;"><span class="roster-role">${label}</span><span>${player.name}${tagRow(player.tags)}${rentalBadge(player)}</span><span class="overall-pill">${player.overall}</span></div>
  `;

  return `
    <div class="card">
      <h3>Offense</h3>
      <div class="roster-row"><span class="roster-role">QB</span><span>${r.qb.name}${tagRow(r.qb.tags)}</span><span class="overall-pill">${r.qb.overall}</span></div>
      <div class="roster-row"><span class="roster-role">RB</span><span>${r.rb.name}${tagRow(r.rb.tags)}${rentalBadge(r.rb)}</span><span class="overall-pill">${r.rb.overall}</span></div>
      ${r.rbBench.map((p) => benchRow("RB2", p)).join("")}
      ${r.wrs.map((w, i) => `<div class="roster-row"><span class="roster-role">WR${i + 1}</span><span>${w.name}${tagRow(w.tags)}${rentalBadge(w)}</span><span class="overall-pill">${w.overall}</span></div>`).join("")}
      <div class="roster-row"><span class="roster-role">TE</span><span>${r.te.name}${tagRow(r.te.tags)}${rentalBadge(r.te)}</span><span class="overall-pill">${r.te.overall}</span></div>
      ${r.teBench.map((p) => benchRow("TE2", p)).join("")}
      <div class="roster-row"><span class="roster-role">OL</span><span>${UNIT_LABEL.OL}</span><span class="overall-pill">${r.units.OL}</span></div>
    </div>

    <div class="card">
      <h3>Defense &amp; Special Teams</h3>
      ${unitRow("DL")}
      ${unitRow("LB")}
      ${unitRow("Secondary")}
      <div class="roster-row"><span class="roster-role">ST</span><span>${UNIT_LABEL.ST}</span><span class="overall-pill">${Math.round(effectiveUnitRating(r, "ST"))}</span></div>
    </div>
  `;
}

// Adds a "View Roster" toggle button to `container` that shows/hides the
// roster cards inline, without navigating away from the current screen.
function attachRosterToggle(container) {
  const btn = document.createElement("button");
  btn.className = "secondary";
  btn.textContent = "View My Roster";
  btn.style.marginBottom = "16px";
  const panel = document.createElement("div");
  panel.style.display = "none";
  panel.innerHTML = rosterCardsHtml(state.roster);
  btn.addEventListener("click", () => {
    const showing = panel.style.display !== "none";
    panel.style.display = showing ? "none" : "";
    btn.textContent = showing ? "View My Roster" : "Hide My Roster";
  });
  container.appendChild(btn);
  container.appendChild(panel);
}

function renderTeamReveal() {
  const r = state.roster;
  const chemistry = currentChemistry();
  const notes = explainChemistry(r);

  app.innerHTML = `
    ${statusStrip()}
    ${phaseHeading(`Regular Season &middot; Week ${state.week}/${WEEKS_TOTAL}`)}
    <h1>${state.identity.city} ${state.identity.name}</h1>
    <div class="multiplier-badge"><span>Score Multiplier</span><span class="num">&times;${state.qbMultiplier.toFixed(2)}</span></div>
    <div class="tag-row">
      <span class="tag">${OFFENSE_SCHEMES[r.offenseScheme]?.label || r.offenseScheme}</span>
      <span class="tag">${DEFENSE_SCHEMES[r.defenseScheme]?.label || r.defenseScheme}</span>
    </div>

    <div class="card" style="margin-top:18px;">
      <h2>Chemistry: ${chemistry}/100</h2>
      ${notes.length ? `<p>${notes.join(". ")}.</p>` : `<p>No standout tag pairings yet -- get some real skill players via packs to build chemistry.</p>`}
    </div>

    ${rosterCardsHtml(r)}

    <button id="play-btn">Play Week ${state.week}</button>
  `;
  document.getElementById("play-btn").addEventListener("click", playWeek);
}

// ---------------------------------------------------------------------
// Screen: Opponent preview (short scouting snapshot before kickoff)
// ---------------------------------------------------------------------
function strengthTier(strength) {
  if (strength >= 90) return "Elite";
  if (strength >= 85) return "Strong";
  if (strength >= 78) return "Average";
  return "Rebuilding";
}

function schemeEdgeLabel(roster, opponent) {
  const adv = netSchemeAdvantage(roster, opponent);
  if (adv > 0) return "Favorable matchup";
  if (adv < 0) return "Tough matchup";
  return "Even matchup";
}

function renderOpponentPreview(opponent, isPlayoff) {
  const strength = teamStrength(opponent);
  app.innerHTML = `
    ${statusStrip()}
    ${phaseHeading(isPlayoff ? "Playoffs &middot; Scouting Report" : `Regular Season &middot; Week ${state.week} &middot; Scouting Report`)}
    <h1>${opponent.city} ${opponent.name}</h1>
    <div class="card">
      <div class="roster-row"><span class="roster-role">TIER</span><span>${strengthTier(strength)}</span><span class="overall-pill">${Math.round(strength)}</span></div>
      <div class="roster-row"><span class="roster-role">QB</span><span>${opponent.qb.name}${tagRow(opponent.qb.tags)}</span><span class="overall-pill">${opponent.qb.overall}</span></div>
      <div class="roster-row"><span class="roster-role">SCHEME</span><span>${schemeEdgeLabel(state.roster, opponent)}</span><span></span></div>
    </div>
    <button id="kickoff-btn">Kickoff</button>
  `;
  document.getElementById("kickoff-btn").addEventListener("click", () => runSim(opponent, isPlayoff));
}

// ---------------------------------------------------------------------
// Screen: Weekly sim ticker
// ---------------------------------------------------------------------
function playWeek() {
  const opponents = TEAMS.filter((t) => t.code !== state.identity.code);
  const opponent = opponents[Math.floor(Math.random() * opponents.length)];
  renderOpponentPreview(opponent, false);
}

function runSim(opponent, isPlayoff) {
  const chemistry = currentChemistry();
  const result = simulateWeek(state.roster, opponent, chemistry);
  const lines = generatePlayByPlay(state.identity.city, opponent.city, state.roster, result.grades, result.won, result.userScore, result.oppScore);

  // Tick rentals now -- this game is the one "using up" a rental's game,
  // so this must happen only once, exactly when a game is actually played
  // (not when a pack is confirmed). Ticker text above already used the
  // pre-tick roster, which is correct: those are the players who played.
  tickRentals(state);

  app.innerHTML = `
    ${statusStrip()}
    ${phaseHeading(isPlayoff ? "Playoffs &middot; Live" : `Regular Season &middot; Week ${state.week} &middot; Live`)}
    <h1>${state.identity.city} vs ${opponent.city}</h1>
    <div class="ticker" id="ticker"></div>
  `;

  const ticker = document.getElementById("ticker");
  lines.forEach((line, i) => {
    setTimeout(() => {
      const div = document.createElement("div");
      div.className = "ticker-line";
      div.textContent = line;
      ticker.appendChild(div);
      if (i === lines.length - 1) {
        const btn = document.createElement("button");
        btn.textContent = "Next";
        btn.style.marginTop = "16px";
        btn.addEventListener("click", () => {
          if (isPlayoff) renderPlayoffResult(opponent, result);
          else renderWeekResult(opponent, result);
        });
        ticker.appendChild(btn);
      }
    }, i * 550);
  });
}

function gradeRowsHtml(grades) {
  return Object.entries(grades)
    .map(([label, grade]) => `
      <div class="grade-row">
        <span class="grade-label">${label}</span>
        <span class="grade-stars">${"★".repeat(grade)}<span class="dim">${"★".repeat(5 - grade)}</span></span>
      </div>`)
    .join("");
}

// ---------------------------------------------------------------------
// Screen: Grades + win/loss result (regular season)
// ---------------------------------------------------------------------
function renderWeekResult(opponent, result) {
  state.gradeHistory.push(result.grades);
  if (result.won) { state.wins++; state.streak++; } else { state.losses++; state.streak = 0; }

  // A pack for a game that will never be played is pointless -- if this
  // was the last week of the season and playoffs weren't reached, skip
  // straight to the recap instead of offering a pack.
  const seasonIsOver = state.week >= WEEKS_TOTAL && state.wins < PLAYOFF_LINE;

  app.innerHTML = `
    ${statusStrip()}
    ${phaseHeading(`Regular Season &middot; Week ${state.week} &middot; Result`)}
    <div class="result-banner ${result.won ? "win" : "loss"}">${result.won ? "WIN" : "LOSS"}</div>
    <div class="scoreboard">
      <span>${state.identity.city} ${result.userScore}</span>
      <span class="vs">FINAL</span>
      <span>${opponent.city} ${result.oppScore}</span>
    </div>
    <div class="card">
      <h2>Game Grades</h2>
      ${gradeRowsHtml(result.grades)}
    </div>
    <button id="pack-btn">${seasonIsOver ? "See Season Recap" : `Open ${result.won ? "Win" : "Loss"} Pack`}</button>
  `;
  document.getElementById("pack-btn").addEventListener("click", () => {
    if (seasonIsOver) renderRecap(false);
    else renderPackScreen(result.won);
  });
}

// ---------------------------------------------------------------------
// Screen: Pack selection (with spin reveal)
// ---------------------------------------------------------------------
function renderPackScreen(won) {
  const options = won
    ? generateWinPack(state.streak, state.roster, state.ownedPlayers)
    : generateLossPack(state.roster, state.ownedPlayers);

  app.innerHTML = `
    ${statusStrip()}
    ${phaseHeading(`${won ? "Win" : "Loss"} Pack`)}
    <h1>Choose Your Reward</h1>
    <div id="pack-roster-toggle"></div>
    <div id="pack-grid"></div>
  `;
  attachRosterToggle(document.getElementById("pack-roster-toggle"));

  const grid = document.getElementById("pack-grid");
  options.forEach((opt) => {
    const card = buildSpinCard(opt);
    card.classList.add("selectable");
    card.tabIndex = 0;
    card.style.pointerEvents = "none"; // enabled once its spin lands
    grid.appendChild(card);
  });

  spinAll(options, () => {
    options.forEach((opt) => {
      const card = app.querySelector(`.pack-option[data-id="${opt.id}"]`);
      card.style.pointerEvents = "";
      const pick = () => { opt.apply(state); renderPackConfirm(opt); };
      card.addEventListener("click", pick);
      card.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") pick(); });
    });
  });
}

function renderPackConfirm(opt) {
  const nextLabel = state.week >= WEEKS_TOTAL ? "See Season Recap" : `Continue to Week ${state.week + 1}`;
  app.innerHTML = `
    ${statusStrip()}
    ${phaseHeading("Pack Confirmed")}
    <div class="card">
      <h2>Added: ${opt.title}</h2>
      <p>${opt.description}</p>
      ${opt.player ? tagRow(opt.player.tags) : ""}
    </div>
    <button id="continue-btn">${nextLabel}</button>
  `;
  document.getElementById("continue-btn").addEventListener("click", () => {
    state.week++;
    if (state.week > WEEKS_TOTAL) {
      if (state.wins >= PLAYOFF_LINE) renderPlayoffIntro();
      else renderRecap(false);
    } else {
      renderTeamReveal();
    }
  });
}

// ---------------------------------------------------------------------
// Screens: Playoffs (no packs after these games)
// ---------------------------------------------------------------------
function renderPlayoffIntro() {
  app.innerHTML = `
    ${statusStrip()}
    ${phaseHeading("Playoffs")}
    <h1>You Clinched a Spot</h1>
    <p>You hit the ${PLAYOFF_LINE}-${WEEKS_TOTAL - PLAYOFF_LINE} playoff line. One game, win or go home. No pack afterward -- this one's just for the record book.</p>
    <button id="playoff-btn">See Matchup</button>
  `;
  document.getElementById("playoff-btn").addEventListener("click", () => {
    const field = TEAMS.filter((t) => t.code !== state.identity.code);
    const opponent = field.reduce((strongest, t) => (teamStrength(t) > teamStrength(strongest) ? t : strongest), field[0]);
    renderOpponentPreview(opponent, true);
  });
}

function renderPlayoffResult(opponent, result) {
  state.playoffResult = result.won ? "won" : "lost";
  app.innerHTML = `
    ${statusStrip()}
    ${phaseHeading("Playoffs &middot; Result")}
    <div class="result-banner ${result.won ? "win" : "loss"}">${result.won ? "PLAYOFF WIN" : "ELIMINATED"}</div>
    <div class="scoreboard">
      <span>${state.identity.city} ${result.userScore}</span>
      <span class="vs">FINAL</span>
      <span>${opponent.city} ${result.oppScore}</span>
    </div>
    <div class="card">
      <h2>Game Grades</h2>
      ${gradeRowsHtml(result.grades)}
    </div>
    <button id="recap-btn">See Season Recap</button>
  `;
  document.getElementById("recap-btn").addEventListener("click", () => renderRecap(true));
}

// ---------------------------------------------------------------------
// Screen: Season recap
// ---------------------------------------------------------------------
function renderRecap(reachedPlayoffs) {
  const catTotals = {};
  state.gradeHistory.forEach((g) => {
    Object.entries(g).forEach(([k, v]) => { catTotals[k] = (catTotals[k] || 0) + v; });
  });
  const weeks = state.gradeHistory.length;
  const catAverages = Object.fromEntries(
    Object.entries(catTotals).map(([k, v]) => [k, (v / weeks).toFixed(1)])
  );

  const chemistry = currentChemistry();
  const { finalScore, letter, breakdown } = computeFinalScore(state.wins, state.losses, state.roster, chemistry, state.qbMultiplier);

  let playoffLine = `Missed the ${PLAYOFF_LINE}-${WEEKS_TOTAL - PLAYOFF_LINE} playoff line. (Full 17-game version: 10-7.)`;
  if (reachedPlayoffs) {
    playoffLine = state.playoffResult === "won"
      ? `Clinched the playoffs and won your playoff game.`
      : `Clinched the playoffs but were eliminated.`;
  }

  app.innerHTML = `
    ${phaseHeading("Season Recap")}
    <h1>${state.identity.city} ${state.identity.name}</h1>
    <p>Final Record: <strong>${state.wins}-${state.losses}</strong> &middot; QB Multiplier: <strong>&times;${state.qbMultiplier.toFixed(2)}</strong></p>
    <p>${playoffLine}</p>

    <div class="final-grade">${letter}</div>
    <p style="text-align:center; color:var(--muted);">Final Score: ${finalScore}</p>

    <div class="card">
      <h2>Score Breakdown</h2>
      <div class="grade-row"><span class="grade-label">Record (${state.wins}-${state.losses})</span><span class="grade-stars">${breakdown.recordPts} pts</span></div>
      <div class="grade-row"><span class="grade-label">Ending Roster Overall (${breakdown.rosterOverall})</span><span class="grade-stars">${breakdown.rosterPts} pts</span></div>
      <div class="grade-row"><span class="grade-label">Ending Chemistry (${chemistry}/100)</span><span class="grade-stars">${breakdown.chemPts} pts</span></div>
      <div class="grade-row"><span class="grade-label">QB Multiplier</span><span class="grade-stars">&times;${breakdown.qbMultiplier.toFixed(2)}</span></div>
    </div>

    <div class="card">
      <h2>Season Averages (Grades)</h2>
      ${Object.entries(catAverages).map(([k, v]) => `
        <div class="grade-row"><span class="grade-label">${k}</span><span class="grade-stars">${v} / 5</span></div>
      `).join("")}
    </div>

    <button id="again-btn">Play Again</button>
  `;
  document.getElementById("again-btn").addEventListener("click", renderTitle);
}

// ---------------------------------------------------------------------
// Shared status strip
// ---------------------------------------------------------------------
function statusStrip() {
  if (!state) return "";
  return `
    <div class="status-strip">
      <span>WEEK ${Math.min(state.week, WEEKS_TOTAL)}/${WEEKS_TOTAL}</span>
      <span>RECORD ${state.wins}-${state.losses}</span>
      <span>STREAK ${state.streak}</span>
      <span>MULT &times;${state.qbMultiplier.toFixed(2)}</span>
    </div>
  `;
}

renderTitle();
