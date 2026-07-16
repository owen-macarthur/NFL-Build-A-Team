// script.js
// -----------------------------------------------------------------------
// UI layer only. This file should not contain game-balance math -- that
// all lives in engine.js / chemistry.js / packs.js. If you're tuning
// numbers, you almost certainly want one of those files instead.
// -----------------------------------------------------------------------
import { TEAMS, createDefaultRoster } from "./data.js";
import { computeChemistry, explainChemistry, UNIT_LABEL, TAG_TO_UNIT } from "./chemistry.js";
import { teamStrength, simulateWeek, generatePlayByPlay, computeQbMultiplier, computeFinalScore, effectiveUnitRating } from "./engine.js";
import { generateWinPack, generateLossPack, tickRentals } from "./packs.js";

const WEEKS_TOTAL = 8; // Prototype length. Full version target: 17 + playoffs.
const PLAYOFF_LINE = Math.ceil((WEEKS_TOTAL * 10) / 17); // scaled version of "10-7 or better"

const app = document.getElementById("app");

let state = null;

function newGameState(identity, qb, choiceSet) {
  return {
    identity,                        // the real team you drafted from (city/name/color, flavor only)
    roster: createDefaultRoster(qb), // your actual playable roster -- starts nearly empty
    qbMultiplier: computeQbMultiplier(qb, choiceSet),
    rentals: [],                     // active rental tracking (see packs.js tickRentals)
    ownedPlayers: new Set(),         // every player name ever acquired -- packs never repeat these
    week: 1,
    wins: 0,
    losses: 0,
    streak: 0,
    gradeHistory: [],
  };
}

function currentChemistry() {
  const r = state.roster;
  const topWr = r.wrs.reduce((best, w) => (w.overall > best.overall ? w : best), r.wrs[0]);
  return computeChemistry(r.qb, r.rb, topWr, r.te);
}

// Consistent "what phase of the game am I in" heading, shown at the top
// of every screen so it's clear where you are even as the game progresses
// through a lot of different states.
function phaseHeading(text) {
  return `<div class="eyebrow">${text}</div>`;
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
      renderTeamReveal();
    };
    card.addEventListener("click", choose);
    card.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") choose(); });
    grid.appendChild(card);
  });
}

// ---------------------------------------------------------------------
// Screen: Team reveal + chemistry breakdown
// ---------------------------------------------------------------------
function tagRow(tags) {
  if (!tags.length) return "";
  return `<div class="tag-row">${tags.map((t) => `<span class="tag">${t.replace("_", " ")}</span>`).join("")}</div>`;
}

function renderTeamReveal() {
  const r = state.roster;
  const chemistry = currentChemistry();
  const topWr = r.wrs.reduce((best, w) => (w.overall > best.overall ? w : best), r.wrs[0]);
  const notes = explainChemistry(r.qb, r.rb, topWr, r.te);

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
        <div class="roster-row" style="padding-left:16px;"><span class="roster-role">${p.pos}</span><span>${p.name}${tagRow(p.tags)}</span><span class="overall-pill">${p.overall}</span></div>
      `).join("")}
    `;
  };

  app.innerHTML = `
    ${statusStrip()}
    ${phaseHeading(`Regular Season &middot; Week ${state.week}/${WEEKS_TOTAL}`)}
    <h1>${state.identity.city} ${state.identity.name}</h1>
    <div class="multiplier-badge"><span>Score Multiplier</span><span class="num">&times;${state.qbMultiplier.toFixed(2)}</span></div>

    <div class="card" style="margin-top:18px;">
      <h2>Chemistry: ${chemistry}/100</h2>
      ${notes.length ? `<p>${notes.join(". ")}.</p>` : `<p>No standout tag pairings yet -- get some real skill players via packs to build chemistry.</p>`}
    </div>

    <div class="card">
      <h3>Offense</h3>
      <div class="roster-row"><span class="roster-role">QB</span><span>${r.qb.name}${tagRow(r.qb.tags)}</span><span class="overall-pill">${r.qb.overall}</span></div>
      <div class="roster-row"><span class="roster-role">RB</span><span>${r.rb.name}${tagRow(r.rb.tags)}</span><span class="overall-pill">${r.rb.overall}</span></div>
      ${r.wrs.map((w, i) => `<div class="roster-row"><span class="roster-role">WR${i + 1}</span><span>${w.name}${tagRow(w.tags)}</span><span class="overall-pill">${w.overall}</span></div>`).join("")}
      <div class="roster-row"><span class="roster-role">TE</span><span>${r.te.name}${tagRow(r.te.tags)}</span><span class="overall-pill">${r.te.overall}</span></div>
      <div class="roster-row"><span class="roster-role">OL</span><span>${UNIT_LABEL.OL}</span><span class="overall-pill">${r.units.OL}</span></div>
    </div>

    <div class="card">
      <h3>Defense &amp; Special Teams</h3>
      ${unitRow("DL")}
      ${unitRow("LB")}
      ${unitRow("Secondary")}
      <div class="roster-row"><span class="roster-role">ST</span><span>${UNIT_LABEL.ST}</span><span class="overall-pill">${Math.round(effectiveUnitRating(r, "ST"))}</span></div>
    </div>

    <button id="play-btn">Play Week ${state.week}</button>
  `;
  document.getElementById("play-btn").addEventListener("click", playWeek);
}

// ---------------------------------------------------------------------
// Screen: Weekly sim ticker
// ---------------------------------------------------------------------
function playWeek() {
  const opponents = TEAMS.filter((t) => t.code !== state.identity.code);
  const opponent = opponents[Math.floor(Math.random() * opponents.length)];
  runSim(opponent, false);
}

function runSim(opponent, isPlayoff) {
  const chemistry = currentChemistry();
  const result = simulateWeek(state.roster, opponent, chemistry);
  const lines = generatePlayByPlay(state.identity.city, opponent.city, state.roster, result.grades, result.won, result.userScore, result.oppScore);

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
    <button id="pack-btn">Open ${result.won ? "Win" : "Loss"} Pack</button>
  `;
  document.getElementById("pack-btn").addEventListener("click", () => renderPackScreen(result.won));
}

// ---------------------------------------------------------------------
// Screen: Pack selection
// ---------------------------------------------------------------------
function renderPackScreen(won) {
  const options = won
    ? generateWinPack(state.streak, state.roster, state.ownedPlayers)
    : generateLossPack(state.roster, state.ownedPlayers);

  app.innerHTML = `
    ${statusStrip()}
    ${phaseHeading(`${won ? "Win" : "Loss"} Pack`)}
    <h1>Choose Your Reward</h1>
    ${options.map((opt) => `
      <div class="card selectable pack-option" data-id="${opt.id}" tabindex="0">
        <h3>${opt.title}</h3>
        <p>${opt.description}</p>
        ${opt.player ? tagRow(opt.player.tags) : ""}
      </div>`).join("")}
  `;

  app.querySelectorAll(".pack-option").forEach((el) => {
    const id = el.getAttribute("data-id");
    const opt = options.find((o) => o.id === id);
    const pick = () => {
      opt.apply(state);
      renderPackConfirm(opt);
    };
    el.addEventListener("click", pick);
    el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") pick(); });
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
    tickRentals(state);
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
    <button id="playoff-btn">Play Playoff Game</button>
  `;
  document.getElementById("playoff-btn").addEventListener("click", () => {
    const field = TEAMS.filter((t) => t.code !== state.identity.code);
    const opponent = field.reduce((strongest, t) => (teamStrength(t) > teamStrength(strongest) ? t : strongest), field[0]);
    runSim(opponent, true);
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
