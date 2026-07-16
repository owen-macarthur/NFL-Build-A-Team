// engine.js
// -----------------------------------------------------------------------
// The actual game logic, kept separate from the UI on purpose. render()
// functions in script.js should never need to know HOW a result was
// calculated, just what the result object looks like.
//
// Two different "shapes" pass through here:
//   - a user ROSTER (from data.js createDefaultRoster): has .units and
//     .defensePlayers, gets upgraded via packs.
//   - a real opponent TEAM (from data.js TEAMS): has a fixed .defense
//     array of tagged impact players, no .units.
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

// Weighted overall for a full team/roster -- the core "how good are you" number.
export function teamStrength(entity) {
  const wrAvg = entity.wrs.reduce((s, p) => s + p.overall, 0) / entity.wrs.length;
  const ol = entity.units ? entity.units.OL : OPPONENT_OL;
  const st = entity.units ? effectiveUnitRating(entity, "ST") : OPPONENT_ST;
  const def = getDefenseProfile(entity);
  const defAvg = (def.passRush + def.coverage + def.runStop) / 3;

  return (
    entity.qb.overall * 0.28 +
    entity.rb.overall * 0.12 +
    wrAvg * 0.20 +
    entity.te.overall * 0.08 +
    ol * 0.10 +
    defAvg * 0.17 +
    st * 0.05
  );
}

// The core "did you win" roll. Strength difference + chemistry + randomness.
export function simulateWeek(roster, oppTeam, chemistry) {
  const userStrength = teamStrength(roster) + (chemistry - 50) * 0.25;
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
  const runGame = roster.rb.overall * 0.5 + ol * 0.4 + rand(18);
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

// Simple scripted-feeling ticker lines -- text lines that reveal one at a
// time (the "easiest for now" version). Swap this out later for the
// fancier animated version without touching anything else.
export function generatePlayByPlay(userCity, oppCity, roster, grades, won, userScore, oppScore) {
  const lines = [];
  lines.push(`Kickoff: ${userCity} vs ${oppCity}`);

  if (grades["Pass Game"] >= 4) lines.push(`${roster.qb.name} is slicing this defense up through the air.`);
  else if (grades["Pass Game"] <= 2) lines.push(`${roster.qb.name} is under siege -- the passing game can't find a rhythm.`);

  if (grades["Run Game"] >= 4) lines.push(`${roster.rb.name} is breaking off chunk runs all afternoon.`);
  else if (grades["Run Game"] <= 2) lines.push(`${roster.rb.name} can't find a crease -- the run game stalls.`);

  if (grades["Turnover Battle"] <= 2) lines.push(`Costly turnover for ${userCity} -- ${oppCity} capitalizes.`);
  else if (grades["Turnover Battle"] >= 4) lines.push(`${userCity}'s defense forces a turnover at a huge moment.`);

  if (grades["Pass Defense"] >= 4) lines.push(`The secondary is locking receivers down -- ${oppCity}'s passing attack is stuck.`);
  if (grades["Run Defense"] >= 4) lines.push(`The front seven is stuffing every run ${oppCity} tries.`);
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
// the same 0-99 scale as player overalls. Used by computeFinalScore below,
// and handy to display on its own ("Ending Overall: X").
export function rosterOverallRating(roster) {
  const wrAvg = roster.wrs.reduce((s, p) => s + p.overall, 0) / roster.wrs.length;
  const unitAvg = ["OL", "DL", "LB", "Secondary", "ST"]
    .map((u) => effectiveUnitRating(roster, u))
    .reduce((a, b) => a + b, 0) / 5;
  return (roster.qb.overall + roster.rb.overall + wrAvg + roster.te.overall + unitAvg) / 5;
}

// The final season score: how well did you actually do, given what you
// had to work with? Combines four things the player asked for --
//   - record            (up to 50 pts)
//   - ending roster overall (up to 30 pts) -- rewards actually building a team
//   - ending chemistry      (up to 20 pts) -- rewards good pairings, not just talent
// ...then multiplies the total by your QB multiplier, so drafting a lower
// QB and still performing well pays off exactly like the original pitch:
// "did a lot with less."
export function computeFinalScore(wins, losses, roster, chemistry, qbMultiplier) {
  const winPct = wins / Math.max(1, wins + losses);
  const rosterOverall = rosterOverallRating(roster);
  const rosterFactor = Math.min(1, Math.max(0, (rosterOverall - 60) / 39)); // 60 (all-default) -> 0, 99 -> 1
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
  // rawScore tops out at 100, then gets multiplied by up to ~1.5x for a
  // heavy-underdog QB pick -- so a max realistic score is around 140-150.
  if (score >= 130) return "S";
  if (score >= 105) return "A";
  if (score >= 80) return "B";
  if (score >= 55) return "C";
  if (score >= 35) return "D";
  return "F";
}

// Final grade/score for the season, factoring in the QB multiplier.
export function computeSeasonScore(wins, losses, avgGradeTotal, qbMultiplier) {
  const winPct = wins / Math.max(1, wins + losses);
  const base = winPct * 60 + (avgGradeTotal / 35) * 40; // avgGradeTotal out of 7 cats * 5 max = 35
  const finalScore = Math.round(base * qbMultiplier);
  return { finalScore, letter: toLetterGrade(finalScore) };
}

function toLetterGrade(score) {
  if (score >= 95) return "S";
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  if (score >= 40) return "D";
  return "F";
}
