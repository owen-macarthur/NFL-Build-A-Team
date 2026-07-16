// packs.js
// -----------------------------------------------------------------------
// Packs hand out real named players from the free-agent pool (data.js
// FREE_AGENTS). Skill players (RB/WR/TE) slot directly into the roster;
// defensive players join a specific unit and boost it.
//
// Randomness + no-repeats: pickPlayer() excludes anyone in `owned` (every
// player you've ever acquired, tracked in state.ownedPlayers and passed in
// by script.js) so you never get offered the same player twice. Within a
// single pack, already-offered players are excluded too so one pack can't
// duplicate itself.
//
// Rentals (gamesLeft set) are tracked in state.rentals and reverted by
// tickRentals() once their games run out. Season-long pickups and unit
// upgrades have gamesLeft = null and just stay for good.
// -----------------------------------------------------------------------
import { FREE_AGENTS } from "./data.js";
import { TAG_TO_UNIT, UNIT_LABEL } from "./chemistry.js";

const DEF_IMPACT_NOTE = {
  pass_rush: "gets after the QB -- boosts your D-Line unit (Pass Defense)",
  coverage: "locks down receivers -- boosts your Secondary unit (Pass Defense)",
  run_stopper: "clogs running lanes -- boosts your Linebackers unit (Run Defense)",
};

export function describeDefender(tag) {
  return DEF_IMPACT_NOTE[tag] || "impact defender";
}

// Picks a random player from `tier`, excluding names in `excludeSet`.
// Falls back to the full tier list if everyone in it has already been
// excluded (keeps the game from breaking late in a season).
function pickPlayer(tier, excludeSet) {
  const pool = FREE_AGENTS[tier].filter((p) => !excludeSet.has(p.name));
  const candidates = pool.length ? pool : FREE_AGENTS[tier];
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function isDefensivePlayer(player) {
  return !!TAG_TO_UNIT[player.tags[0]];
}

// Replaces the RB/TE outright, or the weakest current WR (by overall).
function slotSkillPlayer(state, player) {
  const roster = state.roster;
  if (player.pos === "RB") {
    const previous = roster.rb;
    roster.rb = player;
    return { slot: "rb", previous };
  }
  if (player.pos === "TE") {
    const previous = roster.te;
    roster.te = player;
    return { slot: "te", previous };
  }
  let weakestIdx = 0;
  roster.wrs.forEach((w, i) => { if (w.overall < roster.wrs[weakestIdx].overall) weakestIdx = i; });
  const previous = roster.wrs[weakestIdx];
  roster.wrs[weakestIdx] = player;
  return { slot: "wr", wrIndex: weakestIdx, previous };
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
    player, // exposed so the UI can render tag chips
    description: `${player.name} (${player.pos}, ${player.overall} OVR) joins your team ${durationText}.${impactNote}`,
    apply: (state) => {
      state.ownedPlayers.add(player.name);
      if (isDefense) {
        state.roster.defensePlayers.push(player);
        if (gamesLeft) state.rentals.push({ kind: "defense", player, gamesLeft });
      } else {
        const slotInfo = slotSkillPlayer(state, player);
        if (gamesLeft) state.rentals.push({ kind: "skill", gamesLeft, ...slotInfo });
      }
    },
  };
}

function unitOption(id, roster, amount) {
  const unit = weakestUnit(roster);
  return {
    id,
    title: `${UNIT_LABEL[unit]} Upgrade`,
    player: null,
    description: `A coaching/depth boost to your ${UNIT_LABEL[unit]} unit (currently your weakest group) for the rest of the season. +${amount} rating.`,
    apply: (state) => applyUnitUpgrade(state, unit, amount),
  };
}

// `ownedPlayers` is a Set of every player name acquired so far this game --
// passed in by script.js from state.ownedPlayers.
export function generateWinPack(streak, roster, ownedPlayers) {
  const exclude = new Set(ownedPlayers); // local copy so we can dedupe within this pack too

  const rentalPlayer = pickPlayer("superstar", exclude);
  exclude.add(rentalPlayer.name);
  const seasonPlayer = pickPlayer("great", exclude);
  exclude.add(seasonPlayer.name);

  const options = [
    playerOption("rental", "Star Rental", rentalPlayer, 2),
    playerOption("solid_season", "Solid Starter (Season)", seasonPlayer, null),
    unitOption("group_upgrade", roster, 6),
  ];

  if (streak > 0 && streak % 3 === 0) {
    const streakTier = streak >= 5 ? "superstar" : "great";
    const streakPlayer = pickPlayer(streakTier, exclude);
    exclude.add(streakPlayer.name);
    options.push(playerOption("streak_pack", `${streak}-Win Streak Pack`, streakPlayer, null));
  }

  return options;
}

export function generateLossPack(roster, ownedPlayers) {
  const exclude = new Set(ownedPlayers);

  const tempPlayer = pickPlayer("solid", exclude);
  exclude.add(tempPlayer.name);
  const seasonPlayer = pickPlayer("depth", exclude);
  exclude.add(seasonPlayer.name);

  return [
    playerOption("temp_solid", "Solid Player (Temporary)", tempPlayer, 4),
    playerOption("season_meh", "Depth Piece (Season)", seasonPlayer, null),
  ];
}

// Call once per week to tick down rentals and revert any that just expired.
export function tickRentals(state) {
  state.rentals = state.rentals.filter((r) => {
    r.gamesLeft -= 1;
    if (r.gamesLeft > 0) return true;

    if (r.kind === "skill") {
      if (r.slot === "rb") state.roster.rb = r.previous;
      else if (r.slot === "te") state.roster.te = r.previous;
      else if (r.slot === "wr") state.roster.wrs[r.wrIndex] = r.previous;
    } else if (r.kind === "defense") {
      state.roster.defensePlayers = state.roster.defensePlayers.filter((p) => p !== r.player);
    }
    return false;
  });
}
