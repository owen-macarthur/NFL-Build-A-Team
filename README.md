# Underdog GM (prototype)

An NFL-flavored season game: draft a QB (a *worse* QB earns a bigger score
multiplier), build chemistry around him, sim your games, and cash in win/loss
packs to grow your roster.

## What's new in this update (v7)

- **RB/TE bench slots.** Acquiring a 2nd real RB or TE doesn't replace your
  starter anymore -- it sits alongside them, and whichever has the higher
  overall automatically becomes the starter (a bench row only shows once
  you actually have one). A 3rd pickup normally bumps the weakest of the
  three off the roster, *unless* one of the three is a currently-active
  rental -- then all three stick around temporarily, since the overflow
  resolves itself once the rental expires. Bench players give teamStrength
  a small, deliberately minor bonus -- opponents have no bench field at
  all, so this never affects CPU teams.
- **Order changed**: Intro Pack now comes right after the QB draft, and
  scheme selection comes after that -- so you're picking a scheme around
  the team you actually have, not the other way around.
- **"View My Roster" toggle** on the scheme-select and pack screens --
  shows your current roster inline without leaving the screen or losing
  any selections in progress.
- **Fixed: O-Line/unit upgrade cards showing "? ? ?" forever.** Non-player
  pack options (Unit Upgrades) never had a real "spin" target, so the
  placeholder text just stuck. Now shows an invented but plausible reason
  for the boost -- "New O-Line Coach," "Pass-Rush Specialist Hired," etc.
  -- picked randomly per pull.
- **Skips the pointless pack after Week 8** if the season's over and
  playoffs weren't reached -- goes straight to the recap instead of
  offering a pack for a game that will never be played.
- **Deferred**: tiered QB draft buckets (one QB per tier instead of pure
  random) -- holding off until the real roster/ratings data comes in
  rather than building a throwaway version now.

## What's new in this update (v6)

- **Fixed: Intro Pack defense wasn't actually random.** The `solid` tier
  had exactly one defender per unit (one pass-rusher, one coverage
  player, one run-stopper), and the Intro Pack was taking the *entire*
  filtered list rather than picking one -- so the three defensive options
  were the literal same three players every single game, no randomness
  at all. Also fixed a related issue where WR only had 2 total entries
  in that tier, making it a 50/50 coin flip whenever WR came up. Fixed
  two ways: `solid` tier expanded to 3-4 players per position/unit, and
  `generateIntroPack` now picks one at random per unit via a proper
  `pickOneByTag` helper instead of grabbing everyone that matches.

## What's new in this update (v5)

- **Team schemes**: pick one offensive scheme (West Coast / Ground & Pound
  / Air Raid / Option-RPO) and one defensive scheme (Blitz Heavy / Cover 2
  / Man-to-Man / 8-in-the-Box) right after drafting your QB, before the
  Intro Pack. Every opponent has its own scheme pair too (`data.js`), and
  matchups create a real win-probability swing (`engine.js`
  `schemeEdge`/`netSchemeAdvantage`) -- a weaker roster in a favorable
  matchup can still steal a win. The scouting report screen now shows a
  one-line matchup read ("Favorable" / "Even" / "Tough") before kickoff.
- **Intro Pack is now a fantasy pack**: exactly one RB, one WR, one TE
  offered on offense (pick 2 of 3), and one D-Line/Linebacker/Secondary
  defender offered on defense (pick 2 of 3) -- a real choice instead of a
  random grant.
- **Chemistry expanded**: a true slot receiver now always helps (flat
  bonus, independent of QB style), and two pass-rush-tagged defenders
  together count as a real pass-rush duo (its own bonus, first time
  defense factors into the chemistry score at all).
- **WR auto-sort**: after any WR change, your three receivers re-sort by
  overall so "WR1" always means "your best receiver," regardless of which
  slot got replaced.
- **Rentals tracked by player reference, not array index/slot.** This was
  needed for WR auto-sort to work safely (an index-based rental would
  revert the wrong slot after a sort), and it's more robust in general.
- **Loss pack reworked**: no more rentals -- a season-long Unit Upgrade
  (+6, smaller than the win-pack version) plus a season-long depth player.
  Win-pack Unit Upgrade bumped to +10 to stay clearly better.
- **Fake stat lines** in the ticker for standout performances (grade 4+)
  when there's an actual named player to credit -- e.g. a QB or RB line
  after a big Pass/Run Game grade, a defender's line after a big Pass/Run
  Defense grade. Never fabricated for an unnamed default player.
- **Fixed: rentals ending early / players vanishing.** Two related root
  causes: rentals were ticking the instant a pack was confirmed (before
  any game was played with the new player), and an old rental left
  tracking an overwritten slot could later fire and revert to a stale
  snapshot -- wiping out a permanent pickup. Both fixed: `tickRentals`
  only fires once per week, at the moment a game is simulated
  (`script.js` `runSim`), and `packs.js` clears any stale rental the
  instant its player is displaced.
- **Category-weighted pack picks**, so WR/RB/TE/DEF pulls feel evenly
  likely regardless of how the tier pools are shaped or how much you've
  already picked over -- likely the source of the "too many TEs" feeling.
- **Games-remaining icon** (⏳) on any roster player currently on a rental.
- **Scheme Fit icon** (✓) on pack cards when a player's tags complement
  your QB's style.
- **Opponent scouting report** before kickoff, kept short: team, strength
  tier, QB, and the scheme matchup read.
- **Pack spin reveal**: player pulls cycle through same-position
  candidates before landing on the real pick. Selection is disabled until
  a card's own spin finishes.

## What's new in v4

- **Fixed: players disappearing / not adding.** Root cause was two related
  bugs: (1) rentals were ticking down the instant you confirmed a pack,
  before you'd played a single game with the new player, so a "2-game"
  rental only ever lasted 1 real game; (2) when a new player overwrote a
  slot (say TE), an old rental still tracking that slot wasn't cancelled --
  so it could later expire and revert the slot back to a stale snapshot,
  wiping out whatever's there now, permanent pickup or not. Both are fixed:
  `tickRentals` now only fires once per week, at the moment a game is
  actually simulated (`script.js` `runSim`), and `packs.js` clears any
  stale rental for a slot the instant something new is slotted into it.
- **Opponent scouting report** before kickoff -- deliberately short: team
  name, a strength tier (Elite/Strong/Average/Rebuilding), and their QB.
  One card, one button.
- **Intro Pack**: a one-time, automatic pre-season pack -- 2 offensive +
  2 defensive players (season-long, pulled from the `solid` tier) so
  Week 1 isn't entirely default players.
- **Pack spin reveal**: player pulls now cycle through candidate names
  before landing on the real pick, for suspense. Selecting a pack option
  is disabled until its own spin finishes.
- **Games-remaining icon** (⏳) on any roster player currently on a rental,
  shown right on the team reveal screen.
- **Scheme Fit icon** (✓) on pack cards when a player's tags complement
  your QB's style, using the same compatibility logic as the chemistry
  score -- so you can eyeball the fit before picking, not just after.
- **Category-weighted pack picks.** Previously a pack pull was a flat
  random index over the whole tier array, which meant whichever position
  had the most entries in that tier (defense, usually) showed up most
  often, and after `owned` names got filtered out, whatever was left
  unpicked could skew hard toward one position by pure chance -- likely
  why TEs felt overrepresented. Packs now pick a broad category (WR/RB/
  TE/DEF) with even odds first, then a player within it, so the four
  groups feel equally likely regardless of pool shape or how much you've
  already picked over.

## What's new in v3

- **All 32 teams** at full strength as opponents/QB draft pool (`data.js`).
  Rosters reflect early-2026-offseason expectations from a quick web check
  plus general knowledge -- treat as a reasonable snapshot, not a live
  feed (see the note in `data.js` about refreshing this later).
- **Packs never repeat a player you've already acquired.** `state.ownedPlayers`
  tracks every name you've picked up across the whole game; `pickPlayer()`
  in `packs.js` excludes them (and excludes anyone already offered earlier
  in the *same* pack, so one pack can't duplicate itself either). Players
  you were offered but didn't pick can still show up again later -- only
  ones you actually took are excluded.
- **Star Rental is now a true superstar, 2 games only.** A brand-new
  `superstar` tier in `FREE_AGENTS` -- top ~5 WRs/RBs, top 3 TEs, top 10
  defenders in the league -- feeds Star Rental exclusively. 5-win streak
  packs also pull from this tier (season-long, no rental limit); 3-win
  streak packs pull from the next tier down (`great`).
- **Pack cards show the player's tags** (same chip style as everywhere
  else) so you can eyeball chemistry fit before picking.
- **Combined final score** at recap: record + ending roster overall +
  ending chemistry, all multiplied by your QB multiplier. Full formula
  and reasoning is documented in `engine.js` (`computeFinalScore`), and
  the recap screen shows the point breakdown so it's not a black box.
- **Phase heading** at the top of every screen (Draft Room / Regular
  Season -- Week N / Win Pack / Playoffs / Season Recap) so it's always
  clear where you are in the game.

## What's in this prototype (v2 recap)

- **8 opponent teams** at full strength (real rosters, `data.js`) -- you are
  the underdog on purpose.
- **Your roster starts almost empty**: your drafted QB, plus 60-overall
  `Default RB/WR1-3/TE` placeholders and baseline 60-rated O-Line, D-Line,
  Linebackers, Secondary, and Special Teams units. Everything else is earned.
- **Packs hand out real named players** (`FREE_AGENTS` pool in `data.js`).
  Skill players slot directly into RB/TE, or replace your weakest WR.
  Defensive pickups join a specific unit and boost it -- the pack text
  always says which unit and what it improves.
- **Unit Upgrade packs name the exact unit** being upgraded (currently your
  weakest one) rather than a vague "team boost."
- Rentals (5-game win-pack rentals, 4-game loss-pack rentals) automatically
  revert to the previous player once their games run out.
- Play-by-play ticker now pauses on a **Next** button at the end of the
  breakdown instead of auto-advancing.
- Every player's tags now render on their roster card, so chemistry fits
  (or misses) are visible at a glance -- and update as your roster changes.
- **Playoffs**: clinching the scaled win line triggers one playoff game
  against the toughest team in the field, with no pack afterward.
- Full game loop: QB draft → roster reveal/chemistry → weekly sim → 7-category
  grades → win/loss pack → repeat for 8 weeks → playoffs (if you qualify) →
  season recap with letter grade.

## Running it locally

Because the files use ES modules (`import`/`export`), your browser needs to
load them over `http://`, not by double-clicking `index.html` (that opens it
as `file://`, which modules block for security reasons). Easiest options:

- **VS Code**: install the "Live Server" extension, right-click
  `index.html` → "Open with Live Server."
- **No install needed**: if you have Node, run this from the project folder:
  ```
  npx serve .
  ```
  then open the URL it prints.

## Deploying

Same as Build-A-Player: push this folder to a GitHub repo and turn on GitHub
Pages (Settings → Pages → deploy from the branch/folder). GitHub Pages serves
everything over `https://`, so the ES modules work with zero changes.

## File structure

| File | Purpose |
|---|---|
| `data.js` | Opponent team rosters, the free-agent pool packs draw from, and `createDefaultRoster()` for your starting team. Add more teams/free agents here to scale up. |
| `chemistry.js` | Tag-compatibility scoring between QB and RB/top WR/TE, plus the shared `TAG_TO_UNIT` / `UNIT_LABEL` maps. |
| `engine.js` | Team/roster strength math (unit-aware), win/loss roll, the 7 grade categories, play-by-play text, QB multiplier, season score/letter grade. |
| `packs.js` | Win/loss/streak pack options -- pulls real players from `FREE_AGENTS`, slots them into your roster or a defensive unit, and tracks/reverts rentals. |
| `script.js` | UI only -- screen-by-screen rendering and event wiring, including the playoff flow. No game-balance numbers should live here. |
| `style.css` | "Primetime war room" visual theme -- dark stadium palette, gold accent, scoreboard/mono type for stats. Untouched in this update. |

## Known simplifications (intentional, for the prototype)

- 8 teams, so opponents repeat across the season -- fine for testing, but
  the 32-team version should build a real schedule with no repeats.
- Season length is 8 games (`WEEKS_TOTAL` in `script.js`), with the playoff
  line scaled proportionally to your 10-7-in-17 idea. Bump `WEEKS_TOTAL` to
  17 once you're ready and the playoff math updates itself.
- Playoffs are a single game against the strongest remaining team (a
  "wild card" style test), not a full bracket yet -- easy to extend into
  multiple rounds once the single-game version feels right.
- Grades and win probability use reasonable-feeling formulas, not real
  play-by-play simulation -- easy to retune in `engine.js` once you've played
  it and have a feel for what should swing more/less.
- Special Teams grade responds to your ST unit rating but there's no kicker
  data yet; Discipline isn't in yet either -- both are good next additions.
- O-Line and Special Teams units currently only improve via Unit Upgrade
  packs (not via named-player pickups) since there's no offensive-line or
  kicker pool in `FREE_AGENTS` yet.

## Roadmap (per your notes -- not built yet, just structured to support it)

- **Save slots (3-5)**: `state` in `script.js` is already a single plain
  object -- serializing it to `localStorage` (or a downloadable file, since
  GitHub Pages has no backend) is a small addition when you're ready.
- **Dynasty mode**: carry a saved Super Bowl-winning team into a new season.
  Holding off on this makes sense until there's a plan for capping/decaying
  an overpowered roster between seasons.
- **Friend vs. friend matchups**: since `simulateWeek(userTeam, oppTeam, ...)`
  already takes two arbitrary teams, loading two saved teams against each
  other is mostly a UI flow, not new engine work.
- **Mid-sim play-calling**: would hook into `generatePlayByPlay` in
  `engine.js`, turning some ticker lines into decision points instead of
  fixed text.
