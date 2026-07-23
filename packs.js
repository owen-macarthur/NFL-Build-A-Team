// packs.js
// -----------------------------------------------------------------------
// Packs hand out real named players from the free-agent pool (data.js
// FREE_AGENTS). Skill players (RB/WR/TE) slot directly into the roster;
// defensive players join a specific unit and boost it.
//
// RB/TE now support a bench slot: acquiring a 2nd real (non-default) RB
// or TE doesn't replace your starter, it sits alongside them -- whichever
// has the higher overall becomes the starter automatically. A 3rd pickup
// normally bumps the weakest of the three off the roster entirely, UNLESS
// one of the three is a currently-active rental, in which case all three
// stick around temporarily (the rental will resolve the overflow on its
// own once it expires). The bench contributes a small strength bonus --
// real, but deliberately minor compared to starter-level impact -- and
// never applies to CPU opponents (they don't have bench fields at all).
//
// WR ordering: after any WR change, roster.wrs is re-sorted descending by
// overall, so "WR1" always means "your best receiver" regardless of which
// slot happened to get overwritten. WR always keeps exactly 3 entries
// (backfilling with a Default WR if needed) since all three are starters.
//
// Rental tracking is by player OBJECT REFERENCE, not array index or slot
// name -- tickRentals() finds a rental's player wherever they currently
// sit (starter, bench, or a WR slot) and removes them directly, rather
// than reverting to a stored "previous" snapshot. That's what lets a
// bench player get correctly promoted to starter when the starter's
// rental expires, and it's generally more robust against roster changes
// that happen in between.
//
// Category-weighted picking: pickPlayer() picks a broad category
// (WR/RB/TE/DEF) with equal odds first, then a player within it, so the
// four groups feel equally likely regardless of pool shape or how much
// of the pool you've already owned.
//
// tickRentals() should only be called once per week, at the moment a game
// is actually simulated (see script.js runSim) -- not right after a pack
// is confirmed, or a rental loses a game it was never used for.
// -----------------------------------------------------------------------
import { FREE_AGENTS } from "./data.js";
import { TAG_TO_UNIT, UNIT_LABEL } from "./chemistry.js";

const DEF_IMPACT_NOTE = {
  pass_rush: "gets after the QB -- boosts your D-Line unit (Pass Defense)",
  coverage: "locks down receivers -- boosts your Secondary unit (Pass Defense)",
  run_stopper: "clogs running lanes -- boosts your Linebackers unit (Run Defense)",
};

// A few flavor options per unit so the "why did this improve" text feels
// like something actually happened, not a bare stat bump.
const UNIT_UPGRADE_FLAVOR = {
  OL: ["New O-Line Coach", "Offensive Line Overhaul", "Run-Blocking Scheme Tweak"],
  DL: ["New D-Line Coach", "Pass-Rush Specialist Hired", "Front-Four Retooled"],
  LB: ["New Linebackers Coach", "Run-Fit Discipline Clicks", "Linebacker Corps Retooled"],
  Secondary: ["New Defensive Backs Coach", "Coverage Scheme Overhaul", "Secondary Communication Clicks"],
  ST: ["New Special Teams Coordinator", "Return Game Overhaul", "Coverage Units Retooled"],
};

export function describeDefender(tag) {
  return DEF_IMPACT_NOTE[tag] || "impact defender";
}

function isDefensivePlayer(player) {
  return !!TAG_TO_UNIT[player.tags[0]];
}

function categoryOf(player) {
  return isDefensivePlayer(player) ? "DEF" : player.pos; // "WR" | "RB" | "TE" | "DEF"
}

function isDefaultPlayer(player) {
  return player.name.startsWith("Default");
}

function sortWrsDescending(roster) {
  roster.wrs.sort((a, b) => b.overall - a.overall);
}

function pickPlayer(tier, excludeSet) {
  const available = FREE_AGENTS[tier].filter((p) => !excludeSet.has(p.name));
  const pool = available.length ? available : FREE_AGENTS[tier];
  const categories = [...new Set(pool.map(categoryOf))];
  const chosenCategory = categories[Math.floor(Math.random() * categories.length)];
  const withinCategory = pool.filter((p) => categoryOf(p) === chosenCategory);
  return withinCategory[Math.floor(Math.random() * withinCategory.length)];
}

// Picks exactly one player of the given position (RB/WR/TE), excluding
// already-owned/excluded names. Used by the Intro Pack, which always
// offers exactly one of each position (not a random category draw).
function pickOnePosition(pool, pos, excludeSet) {
  const candidates = pool.filter((p) => p.pos === pos && !excludeSet.has(p.name));
  const fallback = pool.filter((p) => p.pos === pos);
  const list = candidates.length ? candidates : fallback;
  return list[Math.floor(Math.random() * list.length)];
}

// Same idea, but for defenders: picks one random player matching a
// specific unit-mapping tag (pass_rush/coverage/run_stopper), rather than
// taking every matching player in the pool.
function pickOneByTag(pool, tag, excludeSet) {
  const candidates = pool.filter((p) => p.tags[0] === tag && !excludeSet.has(p.name));
  const fallback = pool.filter((p) => p.tags[0] === tag);
  const list = candidates.length ? candidates : fallback;
  return list[Math.floor(Math.random() * list.length)];
}

function isRentalPlayer(state, player) {
  return state.rentals.some((r) => r.player === player);
}

// Removes any rental still tracking this exact player object, so it can't
// fire a stale revert later after the player's been displaced.
function clearRentalTrackingFor(state, outgoingPlayer) {
  state.rentals = state.rentals.filter((r) => r.player !== outgoingPlayer);
}

// Adds a new RB or TE, keeping a starter + optional bench (see file header
// for the overflow/rental rule).
function addWithBench(state, starterKey, benchKey, newPlayer) {
  const roster = state.roster;
  const pool = [];
  if (!isDefaultPlayer(roster[starterKey])) pool.push(roster[starterKey]);
  pool.push(...roster[benchKey]);
  pool.push(newPlayer);
  pool.sort((a, b) => b.overall - a.overall);

  if (pool.length > 2) {
    const anyRental = pool.some((p) => isRentalPlayer(state, p));
    if (!anyRental) {
      const displaced = pool.pop();
      clearRentalTrackingFor(state, displaced);
    }
    // else: temporarily keep all 3 -- resolves itself once the rental expires
  }

  roster[starterKey] = pool[0];
  roster[benchKey] = pool.slice(1);
}

// Replaces the weakest current WR (by overall), then re-sorts so WR1 is
// always the best of the three.
function slotWr(state, player) {
  const roster = state.roster;
  let weakestIdx = 0;
  roster.wrs.forEach((w, i) => { if (w.overall < roster.wrs[weakestIdx].overall) weakestIdx = i; });
  clearRentalTrackingFor(state, roster.wrs[weakestIdx]);
  roster.wrs[weakestIdx] = player;
  sortWrsDescending(roster);
}

function applyUnitUpgrade(state, unit, amount) {
  state.roster.units[unit] = Math.min(99, state.roster.units[unit] + amount);
}

function weakestUnit(roster) {
  return Object.entries(roster.units).sort((a, b) => a[1] - b[1])[0][0];
}

// Builds a pack option around an already-picked player object so the
// caller controls exclusion across the whole pack (see generateWinPack).
function playerOption(id, title, player, gamesLeft) {
  const isDefense = isDefensivePlayer(player);
  const durationText = gamesLeft ? `on a ${gamesLeft}-game rental` : "for the rest of the season";
  const impactNote = isDefense ? ` This player ${describeDefender(player.tags[0])}.` : "";

  return {
    id,
    title,
    player, // exposed so the UI can render tag chips + spin reveal
    description: `${player.name} (${player.pos}, ${player.overall} OVR) joins your team ${durationText}.${impactNote}`,
    apply: (state) => {
      state.ownedPlayers.add(player.name);
      if (isDefense) {
        state.roster.defensePlayers.push(player);
      } else if (player.pos === "RB") {
        addWithBench(state, "rb", "rbBench", player);
      } else if (player.pos === "TE") {
        addWithBench(state, "te", "teBench", player);
      } else {
        slotWr(state, player);
      }
      if (gamesLeft) state.rentals.push({ kind: isDefense ? "defense" : "skill", player, gamesLeft });
    },
  };
}

function unitOption(id, title, roster, amount) {
  const unit = weakestUnit(roster);
  const flavor = UNIT_UPGRADE_FLAVOR[unit][Math.floor(Math.random() * UNIT_UPGRADE_FLAVOR[unit].length)];
  return {
    id,
    title: title || `${UNIT_LABEL[unit]} Upgrade`,
    player: null,
    flavorTitle: flavor, // shown in place of the "spin" reveal, since there's no player to pull
    description: `${flavor}: a boost to your ${UNIT_LABEL[unit]} unit (currently your weakest group) for the rest of the season. +${amount} rating.`,
    apply: (state) => applyUnitUpgrade(state, unit, amount),
  };
}

// `ownedPlayers` is a Set of every player name acquired so far this game --
// passed in by script.js from state.ownedPlayers.
export function generateWinPack(streak, roster, ownedPlayers) {
  const exclude = new Set(ownedPlayers);

  const rentalPlayer = pickPlayer("superstar", exclude);
  exclude.add(rentalPlayer.name);
  const seasonPlayer = pickPlayer("great", exclude);
  exclude.add(seasonPlayer.name);

  const options = [
    playerOption("rental", "Star Rental", rentalPlayer, 2),
    playerOption("solid_season", "Solid Starter (Season)", seasonPlayer, null),
    unitOption("group_upgrade", null, roster, 10),
  ];

  if (streak > 0 && streak % 3 === 0) {
    const streakTier = streak >= 5 ? "superstar" : "great";
    const streakPlayer = pickPlayer(streakTier, exclude);
    exclude.add(streakPlayer.name);
    options.push(playerOption("streak_pack", `${streak}-Win Streak Pack`, streakPlayer, null));
  }

  return options;
}

// No rentals in the loss pack -- a season-long unit boost (smaller than
// the win-pack version) instead, plus a season-long depth player.
export function generateLossPack(roster, ownedPlayers) {
  const exclude = new Set(ownedPlayers);
  const seasonPlayer = pickPlayer("depth", exclude);

  return [
    unitOption("unit_boost", null, roster, 6),
    playerOption("season_meh", "Depth Piece (Season)", seasonPlayer, null),
  ];
}

// Pre-season "fantasy pack": exactly one RB, one WR, one TE offered on the
// offensive side (pick 2 of 3), and one DL/LB/Secondary defender each on
// the defensive side (pick 2 of 3). All season-long. Pulled from the
// "solid" tier -- good enough to matter, not so good it undercuts the
// "build from nothing" pitch.
export function generateIntroPack(ownedPlayers) {
  const exclude = new Set(ownedPlayers);
  const offensePool = FREE_AGENTS.solid.filter((p) => !isDefensivePlayer(p));
  const defensePool = FREE_AGENTS.solid.filter((p) => isDefensivePlayer(p));

  const rb = pickOnePosition(offensePool, "RB", exclude); exclude.add(rb.name);
  const wr = pickOnePosition(offensePool, "WR", exclude); exclude.add(wr.name);
  const te = pickOnePosition(offensePool, "TE", exclude); exclude.add(te.name);

  const dl = pickOneByTag(defensePool, "pass_rush", exclude); exclude.add(dl.name);
  const lb = pickOneByTag(defensePool, "run_stopper", exclude); exclude.add(lb.name);
  const sec = pickOneByTag(defensePool, "coverage", exclude); exclude.add(sec.name);

  const offense = [rb, wr, te].map((p) => playerOption(`intro_${p.name}`, p.name, p, null));
  const defense = [dl, lb, sec].map((p) => playerOption(`intro_${p.name}`, p.name, p, null));

  return { offense, defense };
}

// Call once per week, at the moment a game is actually simulated, to tick
// down rentals and remove any that just expired -- by reference, wherever
// they currently sit (starter, bench, WR slot, or defense).
export function tickRentals(state) {
  state.rentals = state.rentals.filter((r) => {
    r.gamesLeft -= 1;
    if (r.gamesLeft > 0) return true;
    removeExpiredPlayer(state, r.player);
    return false;
  });
}

function removeExpiredPlayer(state, player) {
  const roster = state.roster;

  if (roster.rb === player) {
    roster.rb = roster.rbBench.length ? roster.rbBench.shift() : { name: "Default RB", pos: "RB", overall: 60, tags: [] };
    return;
  }
  if (roster.rbBench.includes(player)) {
    roster.rbBench = roster.rbBench.filter((p) => p !== player);
    return;
  }
  if (roster.te === player) {
    roster.te = roster.teBench.length ? roster.teBench.shift() : { name: "Default TE", pos: "TE", overall: 60, tags: [] };
    return;
  }
  if (roster.teBench.includes(player)) {
    roster.teBench = roster.teBench.filter((p) => p !== player);
    return;
  }
  const wrIdx = roster.wrs.indexOf(player);
  if (wrIdx !== -1) {
    roster.wrs[wrIdx] = { name: "Default WR", pos: "WR", overall: 60, tags: [] };
    sortWrsDescending(roster);
    return;
  }
  roster.defensePlayers = roster.defensePlayers.filter((p) => p !== player);
}
