// engine.js
// -----------------------------------------------------------------------
// The actual game logic, kept separate from the UI on purpose. render()
// functions in script.js should never need to know HOW a result was
// calculated, just what the result object looks like.
//
// Two different "shapes" pass through here:
//   - a user ROSTER (from data.js createDefaultRoster): has .units and
//     .defensePlayers, gets upgraded via packs, and carries its own
//     .offenseScheme/.defenseScheme.
//   - a real opponent TEAM (from data.js TEAMS): has a fixed .defense
//     array of tagged impact players, no .units, and its own
//     .offenseScheme/.defenseScheme.
// The helpers below normalize both into the same profile shape so
// strength/grading math doesn't need to branch everywhere.
// -----------------------------------------------------------------------
import { TAG_TO_UNIT } from "./chemistry.js";

// Real NFL rosters have a full O-line/special teams unit we don't model
// individually -- assume competent-starter level so opponents aren't
// artificially weak in areas we didn't bother simulating.
const OPPONENT_OL = 78;
const OPPONENT_ST = 72;

function avgOr(list, fallback) {
  if (!list.length) return fallback;
  return list.reduce((s, p) => s + p.overall, 0) / list.length;
}

function rand(spread) {
  return (Math.random() - 0.5) * spread;
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// A unit's rating, including any impact defenders assigned to it via packs.
// OL and ST aren't boosted by named players yet -- only by Unit Upgrade packs.
export function effectiveUnitRating(roster, unit) {
  const base = roster.units[unit];
  if (unit === "OL" || unit === "ST") return base;
  const assigned = roster.defensePlayers.filter((p) => TAG_TO_UNIT[p.tags[0]] === unit);
  if (!assigned.length) return base;
  const bonus = assigned.reduce((s, p) => s + Math.max(0, p.overall - 60) * 0.5, 0);
  return Math.min(99, base + bonus);
}

function getDefenseProfile(entity) {
  if (entity.units) {
    return {
      passRush: effectiveUnitRating(entity, "DL"),
      coverage: effectiveUnitRating(entity, "Secondary"),
      runStop: effectiveUnitRating(entity, "LB"),
    };
  }
  const defAvg = entity.defense.reduce((s, p) => s + p.overall, 0) / entity.defense.length;
  return {
    passRush: avgOr(entity.defense.filter((p) => p.tags.includes("pass_rush")), defAvg),
    coverage: avgOr(entity.defense.filter((p) => p.tags.includes("coverage")), defAvg),
    runStop: avgOr(entity.defense.filter((p) => p.tags.includes("run_stopper")), defAvg),
  };
}

// A deliberately small bonus for a real (non-default) bench player at RB
// or TE -- present but minor, never enough to matter as much as an actual
// starter upgrade. Opponent TEAMS entities have no rbBench/teBench field
// at all, so this naturally evaluates to 0 for them -- backups only ever
// help the user's own roster, never a CPU team.
function benchBonus(bench) {
  if (!bench || !bench.length) return 0;
  return bench.reduce((sum, p) => sum + Math.max(0, p.overall - 60) * 0.15, 0);
}
// Weighted overall for a full team/roster -- the core "how good are you"
// number. Deliberately scheme-independent -- schemes affect win
// probability separately (see netSchemeAdvantage) so this number stays a
// stable "how talented is this roster" reading.
export function teamStrength(entity) {
  const wrAvg = entity.wrs.reduce((s, p) => s + p.overall, 0) / entity.wrs.length;
  const ol = entity.units ? entity.units.OL : OPPONENT_OL;
  const st = entity.units ? effectiveUnitRating(entity, "ST") : OPPONENT_ST;
  const def = getDefenseProfile(entity);
  const defAvg = (def.passRush + def.coverage + def.runStop) / 3;
  const rbOverall = entity.rb.overall + benchBonus(entity.rbBench);
  const teOverall = entity.te.overall + benchBonus(entity.teBench);

  return (
    entity.qb.overall * 0.28 +
    rbOverall * 0.12 +
    wrAvg * 0.20 +
    teOverall * 0.08 +
    ol * 0.10 +
    defAvg * 0.17 +
    st * 0.05
  );
}

// -----------------------------------------------------------------------
// Scheme matchups. Each defense scheme has offense schemes it counters
// (strongVs) and offense schemes that counter it (weakVs). This is what
// lets a worse roster still catch an upset-friendly matchup.
// -----------------------------------------------------------------------
const SCHEME_SWING = 4;

const DEFENSE_COUNTERS = {
  "Blitz Heavy": { strongVs: ["Ground & Pound", "Air Raid"], weakVs: ["Option/RPO", "West Coast"] },
  "Cover 2": { strongVs: ["Air Raid"], weakVs: ["West Coast"] },
  "Man-to-Man": { strongVs: ["West Coast", "Air Raid"], weakVs: ["Option/RPO", "Ground & Pound"] },
  "8-in-the-Box": { strongVs: ["Ground & Pound"], weakVs: ["Air Raid", "West Coast"] },
};

// Positive = the offense wins this matchup, negative = the defense wins
// it, 0 = neutral pairing.
export function schemeEdge(offenseScheme, defenseScheme) {
  const counters = DEFENSE_COUNTERS[defenseScheme];
  if (!counters) return 0;
  if (counters.strongVs.includes(offenseScheme)) return -SCHEME_SWING;
  if (counters.weakVs.includes(offenseScheme)) return SCHEME_SWING;
  return 0;
}

// Net scheme advantage for the user's roster in this matchup: their
// offense vs the opponent's defense, minus the opponent's offense vs
// their defense. Added directly into the strength diff before the win
// roll -- a positive number favors the user regardless of raw talent.
export function netSchemeAdvantage(roster, oppTeam) {
  if (!roster.offenseScheme || !roster.defenseScheme) return 0;
  return schemeEdge(roster.offenseScheme, oppTeam.defenseScheme) - schemeEdge(oppTeam.offenseScheme, roster.defenseScheme);
}

// The core "did you win" roll. Strength difference + chemistry + scheme
// matchup + randomness.
export function simulateWeek(roster, oppTeam, chemistry) {
  const schemeAdv = netSchemeAdvantage(roster, oppTeam);
  const userStrength = teamStrength(roster) + (chemistry - 50) * 0.25 + schemeAdv;
  const oppStrength = teamStrength(oppTeam);
  const diff = userStrength - oppStrength;

  const winProb = 1 / (1 + Math.exp(-diff / 8));
  const won = Math.random() < winProb;

  const grades = generateGrades(roster, chemistry);
  const { userScore, oppScore } = generateScoreline(won, diff);

  return { won, winProb, grades, userScore, oppScore };
}

function toGrade(value) {
  if (value >= 85) return 5;
  if (value >= 70) return 4;
  if (value >= 55) return 3;
  if (value >= 40) return 2;
  return 1;
}

function generateGrades(roster, chemistry) {
  const wrAvg = roster.wrs.reduce((s, p) => s + p.overall, 0) / roster.wrs.length;
  const def = getDefenseProfile(roster);
  const ol = roster.units.OL;
  const st = effectiveUnitRating(roster, "ST");

  const passGame = roster.qb.overall * 0.5 + wrAvg * 0.2 + ol * 0.15 + (chemistry - 50) * 0.4 + rand(15);
  const runGame = roster.rb.overall * 0.5 + benchBonus(roster.rbBench) + ol * 0.4 + rand(18);
  const twoMinute = roster.qb.overall * 0.75 + (chemistry - 50) * 0.5 + rand(15);
  const runDefense = def.runStop + rand(15);
  const passDefense = def.coverage * 0.5 + def.passRush * 0.5 + rand(15);
  const turnovers = roster.qb.overall - 20 + rand(25); // higher QB overall -> fewer giveaways
  const specialTeams = st + rand(20);

  return {
    "Pass Game": toGrade(passGame),
    "Run Game": toGrade(runGame),
    "2-Minute Offense": toGrade(twoMinute),
    "Run Defense": toGrade(runDefense),
    "Pass Defense": toGrade(passDefense),
    "Turnover Battle": toGrade(turnovers),
    "Special Teams": toGrade(specialTeams),
  };
}

function generateScoreline(won, diff) {
  const base = 20 + Math.round(rand(14));
  const margin = Math.max(1, Math.round(Math.abs(diff) / 2 + rand(6)));
  const userScore = won ? base + margin : base;
  const oppScore = won ? base : base + margin;
  return { userScore: Math.max(userScore, 3), oppScore: Math.max(oppScore, 3) };
}

// -----------------------------------------------------------------------
// Fake stat lines: only generated for a standout performance (grade >= 4)
// in a category, and only when there's an actual named player to credit
// -- never fabricated for a default/unnamed unit.
// -----------------------------------------------------------------------
function fakeStatLine(kind, player, grade) {
  const great = grade === 5;
  switch (kind) {
    case "pass": {
      const att = randInt(26, 34);
      const comp = Math.min(att, randInt(18, 25) + (great ? 3 : 0));
      const yards = randInt(230, 310) + (great ? 40 : 0);
      const tds = randInt(2, great ? 4 : 3);
      return `${player.name}: ${comp}/${att}, ${yards} yds, ${tds} TD`;
    }
    case "rush": {
      const carries = randInt(14, 22);
      const yards = randInt(70, 130) + (great ? 35 : 0);
      const tds = randInt(0, great ? 2 : 1);
      return `${player.name}: ${carries} car, ${yards} yds, ${tds} TD`;
    }
    case "pass_defense": {
      const pbu = randInt(1, 3);
      const pick = great ? randInt(1, 2) : (Math.random() < 0.3 ? 1 : 0);
      return `${player.name}: ${pbu} PBU${pick ? `, ${pick} INT` : ""}`;
    }
    case "run_defense": {
      const tackles = randInt(6, 11) + (great ? 2 : 0);
      const tfl = randInt(0, great ? 3 : 2);
      return `${player.name}: ${tackles} tkl${tfl ? `, ${tfl} TFL` : ""}`;
    }
    default:
      return "";
  }
}

// Simple scripted-feeling ticker lines -- text lines that reveal one at a
// time (the "easiest for now" version). Adds a fake stat line for a named
// player whenever their category graded well.
export function generatePlayByPlay(userCity, oppCity, roster, grades, won, userScore, oppScore) {
  const lines = [];
  lines.push(`Kickoff: ${userCity} vs ${oppCity}`);

  if (grades["Pass Game"] >= 4) {
    lines.push(`${roster.qb.name} is slicing this defense up through the air.`);
    lines.push(fakeStatLine("pass", roster.qb, grades["Pass Game"]));
  } else if (grades["Pass Game"] <= 2) {
    lines.push(`${roster.qb.name} is under siege -- the passing game can't find a rhythm.`);
  }

  if (grades["Run Game"] >= 4) {
    lines.push(`${roster.rb.name} is breaking off chunk runs all afternoon.`);
    lines.push(fakeStatLine("rush", roster.rb, grades["Run Game"]));
  } else if (grades["Run Game"] <= 2) {
    lines.push(`${roster.rb.name} can't find a crease -- the run game stalls.`);
  }

  if (grades["Turnover Battle"] <= 2) lines.push(`Costly turnover for ${userCity} -- ${oppCity} capitalizes.`);
  else if (grades["Turnover Battle"] >= 4) lines.push(`${userCity}'s defense forces a turnover at a huge moment.`);

  if (grades["Pass Defense"] >= 4) {
    lines.push(`The secondary is locking receivers down -- ${oppCity}'s passing attack is stuck.`);
    const defender = roster.defensePlayers.find((p) => p.tags.includes("coverage") || p.tags.includes("pass_rush"));
    if (defender) lines.push(fakeStatLine("pass_defense", defender, grades["Pass Defense"]));
  }
  if (grades["Run Defense"] >= 4) {
    lines.push(`The front seven is stuffing every run ${oppCity} tries.`);
    const defender = roster.defensePlayers.find((p) => p.tags.includes("run_stopper"));
    if (defender) lines.push(fakeStatLine("run_defense", defender, grades["Run Defense"]));
  }
  if (grades["2-Minute Offense"] >= 4) lines.push(`Clutch two-minute drive from ${roster.qb.name} before the half.`);

  lines.push(`FINAL: ${userCity} ${userScore} -- ${oppCity} ${oppScore}`);
  lines.push(won ? `${userCity} win it.` : `${userCity} fall short.`);

  return lines;
}

// QB choice multiplier: picking a lower-overall QB out of the 3 offered
// gives a bigger multiplier on your final score, scaled against the best
// overall in the choice set (not a fixed number) so it stays fair no
// matter which 3 QBs get offered.
export function computeQbMultiplier(chosenQb, choiceSet) {
  const best = Math.max(...choiceSet.map((q) => q.overall));
  const gap = best - chosenQb.overall;
  return +(1 + gap * 0.02).toFixed(2);
}

// A single number describing how good your final roster is, on roughly
// the same 0-99 scale as player overalls.
export function rosterOverallRating(roster) {
  const wrAvg = roster.wrs.reduce((s, p) => s + p.overall, 0) / roster.wrs.length;
  const unitAvg = ["OL", "DL", "LB", "Secondary", "ST"]
    .map((u) => effectiveUnitRating(roster, u))
    .reduce((a, b) => a + b, 0) / 5;
  const rbOverall = roster.rb.overall + benchBonus(roster.rbBench);
  const teOverall = roster.te.overall + benchBonus(roster.teBench);
  return (roster.qb.overall + rbOverall + wrAvg + teOverall + unitAvg) / 5;
}

// The final season score: record (up to 50 pts) + ending roster overall
// (up to 30 pts) + ending chemistry (up to 20 pts), all multiplied by the
// QB multiplier -- "did a lot with less" pays off exactly like the
// original pitch.
export function computeFinalScore(wins, losses, roster, chemistry, qbMultiplier) {
  const winPct = wins / Math.max(1, wins + losses);
  const rosterOverall = rosterOverallRating(roster);
  const rosterFactor = Math.min(1, Math.max(0, (rosterOverall - 60) / 39));
  const chemFactor = chemistry / 100;

  const recordPts = winPct * 50;
  const rosterPts = rosterFactor * 30;
  const chemPts = chemFactor * 20;

  const rawScore = recordPts + rosterPts + chemPts;
  const finalScore = Math.round(rawScore * qbMultiplier);

  return {
    finalScore,
    letter: toFinalLetterGrade(finalScore),
    breakdown: { recordPts: Math.round(recordPts), rosterPts: Math.round(rosterPts), chemPts: Math.round(chemPts), rosterOverall: Math.round(rosterOverall), qbMultiplier },
  };
}

function toFinalLetterGrade(score) {
  if (score >= 130) return "S";
  if (score >= 105) return "A";
  if (score >= 80) return "B";
  if (score >= 55) return "C";
  if (score >= 35) return "D";
  return "F";
}
