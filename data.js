// data.js
// -----------------------------------------------------------------------
// Two pools live here:
//   TEAMS         -- full rosters for all 32 teams (QB + RB + 3 WR + TE +
//                     3 impact defenders). Used for the QB draft screen
//                     AND as opponents every week -- opponents stay at
//                     full strength, which is what makes you the underdog.
//   FREE_AGENTS   -- the pool packs pull real named players from, split
//                     into superstar / great / solid / depth tiers.
//   createDefaultRoster -- builds YOUR starting roster: your drafted QB
//                     plus a wall of 60-overall "Default" placeholders.
//
// A NOTE ON ACCURACY: rosters reflect early-2026-offseason expectations
// pulled from a mix of memory and a quick web check, not a live feed.
// Real NFL rosters move constantly (trades, injuries, cuts) -- treat this
// as a reasonable snapshot to refresh periodically, not a source of truth.
// Overalls are hand-tuned approximations for game balance, not official
// ratings from anywhere.
//
// TO EXTEND LATER: swap this file's data source for a live API pull (e.g.
// Sleeper's public NFL player API, like your Build-A-Player generate-data.js
// did) if you want it to stay current automatically.
//
// TAGS reference (used by chemistry.js):
//   QB tags:  rushing, deep_ball, quick_game, rpo, pocket_passer, play_action
//   Skill tags: pure_rusher, receiving_back, deep_threat, possession, slot
//   Defense tags (map to a unit): pass_rush -> DL, coverage -> Secondary,
//     run_stopper -> LB
// -----------------------------------------------------------------------

export function createDefaultRoster(qb) {
  return {
    qb,
    rb: { name: "Default RB", pos: "RB", overall: 60, tags: [] },
    rbBench: [], // populates only once you have a 2nd real (non-default) RB
    wrs: [
      { name: "Default WR1", pos: "WR", overall: 60, tags: [] },
      { name: "Default WR2", pos: "WR", overall: 60, tags: [] },
      { name: "Default WR3", pos: "WR", overall: 60, tags: [] },
    ],
    te: { name: "Default TE", pos: "TE", overall: 60, tags: [] },
    teBench: [], // populates only once you have a 2nd real (non-default) TE
    units: { OL: 60, DL: 60, LB: 60, Secondary: 60, ST: 60 },
    defensePlayers: [],
    offenseScheme: null, // set by the scheme-select screen, before the Intro Pack
    defenseScheme: null,
  };
}

// -----------------------------------------------------------------------
// Team schemes -- picked once at the start of the season (offense +
// defense), and every opponent team has its own pair too (see the
// offenseScheme/defenseScheme fields on each TEAMS entry below). Scheme
// matchups create a small win-probability swing independent of raw talent
// (see engine.js schemeEdge/netSchemeAdvantage) -- a bad team in a good
// matchup can still catch a break.
// -----------------------------------------------------------------------
export const OFFENSE_SCHEMES = {
  "West Coast": { label: "West Coast", bio: "Short, quick passing to control the ball and pick defenses apart underneath." },
  "Ground & Pound": { label: "Ground & Pound", bio: "Power running behind a physical offensive line, wearing defenses down." },
  "Air Raid": { label: "Air Raid", bio: "Aggressive deep passing that stretches the field vertically." },
  "Option/RPO": { label: "Option / RPO", bio: "Built around a mobile QB reading the defense to run or pass on the fly." },
};

export const DEFENSE_SCHEMES = {
  "Blitz Heavy": { label: "Blitz Heavy", bio: "Aggressive pressure packages that send extra rushers after the QB." },
  "Cover 2": { label: "Cover 2 / Bend-Don't-Break", bio: "Conservative two-deep-safety shell that limits big plays over the top." },
  "Man-to-Man": { label: "Man-to-Man", bio: "Shutdown coverage that locks receivers up one-on-one." },
  "8-in-the-Box": { label: "8-in-the-Box", bio: "Loaded run-stopping front that dares teams to beat it through the air." },
};

// -----------------------------------------------------------------------
// FREE_AGENTS -- four tiers, used by packs.js:
//   superstar -- Star Rental only (2-game rental). Deliberately tiny and
//     elite: top ~5 WRs/RBs, top 3 TEs, top 10 defenders in the league.
//   great     -- Solid Starter (Season) win-pack option, streak packs.
//   solid     -- Loss-pack temporary pickup (4-game rental).
//   depth     -- Loss-pack season-long pickup.
// -----------------------------------------------------------------------
export const FREE_AGENTS = {
  superstar: [
    { name: "Ja'Marr Chase", pos: "WR", overall: 99, tags: ["deep_threat"] },
    { name: "Justin Jefferson", pos: "WR", overall: 98, tags: ["deep_threat"] },
    { name: "CeeDee Lamb", pos: "WR", overall: 96, tags: ["deep_threat"] },
    { name: "Amon-Ra St. Brown", pos: "WR", overall: 96, tags: ["slot"] },
    { name: "Puka Nacua", pos: "WR", overall: 95, tags: ["possession"] },
    { name: "Bijan Robinson", pos: "RB", overall: 97, tags: ["pure_rusher"] },
    { name: "Saquon Barkley", pos: "RB", overall: 97, tags: ["pure_rusher"] },
    { name: "Jahmyr Gibbs", pos: "RB", overall: 95, tags: ["receiving_back"] },
    { name: "Christian McCaffrey", pos: "RB", overall: 95, tags: ["receiving_back"] },
    { name: "Derrick Henry", pos: "RB", overall: 94, tags: ["pure_rusher"] },
    { name: "Trey McBride", pos: "TE", overall: 92, tags: ["possession"] },
    { name: "George Kittle", pos: "TE", overall: 91, tags: ["possession"] },
    { name: "Sam LaPorta", pos: "TE", overall: 88, tags: ["possession"] },
    { name: "Myles Garrett", pos: "EDGE", overall: 98, tags: ["pass_rush"] },
    { name: "T.J. Watt", pos: "EDGE", overall: 96, tags: ["pass_rush"] },
    { name: "Micah Parsons", pos: "EDGE", overall: 96, tags: ["pass_rush"] },
    { name: "Aidan Hutchinson", pos: "EDGE", overall: 93, tags: ["pass_rush"] },
    { name: "Nick Bosa", pos: "EDGE", overall: 95, tags: ["pass_rush"] },
    { name: "Sauce Gardner", pos: "CB", overall: 94, tags: ["coverage"] },
    { name: "Patrick Surtain II", pos: "CB", overall: 95, tags: ["coverage"] },
    { name: "Derwin James", pos: "S", overall: 92, tags: ["coverage"] },
    { name: "Fred Warner", pos: "LB", overall: 96, tags: ["run_stopper"] },
    { name: "Roquan Smith", pos: "LB", overall: 93, tags: ["run_stopper"] },
  ],
  great: [
    { name: "A.J. Brown", pos: "WR", overall: 90, tags: ["deep_threat"] },
    { name: "Davante Adams", pos: "WR", overall: 88, tags: ["deep_threat"] },
    { name: "Tyreek Hill", pos: "WR", overall: 88, tags: ["deep_threat"] },
    { name: "James Cook", pos: "RB", overall: 88, tags: ["pure_rusher"] },
    { name: "De'Von Achane", pos: "RB", overall: 89, tags: ["receiving_back"] },
    { name: "Mark Andrews", pos: "TE", overall: 86, tags: ["deep_threat"] },
    { name: "Trey Hendrickson", pos: "EDGE", overall: 90, tags: ["pass_rush"] },
    { name: "Josh Hines-Allen", pos: "EDGE", overall: 88, tags: ["pass_rush"] },
    { name: "Trent McDuffie", pos: "CB", overall: 88, tags: ["coverage"] },
    { name: "Bobby Wagner", pos: "LB", overall: 84, tags: ["run_stopper"] },
  ],
  solid: [
    { name: "Courtland Sutton", pos: "WR", overall: 83, tags: ["possession"] },
    { name: "Rashee Rice", pos: "WR", overall: 84, tags: ["slot"] },
    { name: "Josh Downs", pos: "WR", overall: 78, tags: ["slot"] },
    { name: "Christian Kirk", pos: "WR", overall: 79, tags: ["possession"] },
    { name: "Rico Dowdle", pos: "RB", overall: 81, tags: ["pure_rusher"] },
    { name: "Chase Brown", pos: "RB", overall: 82, tags: ["receiving_back"] },
    { name: "Alexander Mattison", pos: "RB", overall: 76, tags: ["pure_rusher"] },
    { name: "Zack Moss", pos: "RB", overall: 77, tags: ["pure_rusher"] },
    { name: "Evan Engram", pos: "TE", overall: 81, tags: ["possession"] },
    { name: "Dalton Kincaid", pos: "TE", overall: 80, tags: ["possession"] },
    { name: "Cole Kmet", pos: "TE", overall: 78, tags: ["possession"] },
    { name: "Noah Fant", pos: "TE", overall: 77, tags: ["possession"] },
    { name: "Jaire Alexander", pos: "CB", overall: 83, tags: ["coverage"] },
    { name: "Mike Hilton", pos: "CB", overall: 76, tags: ["coverage"] },
    { name: "Cameron Dantzler", pos: "CB", overall: 75, tags: ["coverage"] },
    { name: "Kyle Van Noy", pos: "EDGE", overall: 80, tags: ["pass_rush"] },
    { name: "Za'Darius Smith", pos: "EDGE", overall: 81, tags: ["pass_rush"] },
    { name: "Carl Lawson", pos: "EDGE", overall: 77, tags: ["pass_rush"] },
    { name: "Logan Wilson", pos: "LB", overall: 82, tags: ["run_stopper"] },
    { name: "Demario Davis", pos: "LB", overall: 83, tags: ["run_stopper"] },
    { name: "Elandon Roberts", pos: "LB", overall: 78, tags: ["run_stopper"] },
  ],
  depth: [
    { name: "Tutu Atwell", pos: "WR", overall: 73, tags: ["slot"] },
    { name: "Malik Washington", pos: "WR", overall: 72, tags: ["possession"] },
    { name: "Tyler Badie", pos: "RB", overall: 69, tags: ["receiving_back"] },
    { name: "Isiah Pacheco", pos: "RB", overall: 74, tags: ["pure_rusher"] },
    { name: "Durham Smythe", pos: "TE", overall: 67, tags: ["possession"] },
    { name: "Jonathan Bullard", pos: "EDGE", overall: 70, tags: ["pass_rush"] },
    { name: "Kindle Vildor", pos: "CB", overall: 68, tags: ["coverage"] },
    { name: "Kwon Alexander", pos: "LB", overall: 69, tags: ["run_stopper"] },
  ],
};

export const TEAMS = [
  { code: "BUF", city: "Buffalo", name: "Bills", color: "#0C2D64", accent: "#D8A62B", offenseScheme: "Air Raid", defenseScheme: "Cover 2",
    qb: { name: "Josh Allen", pos: "QB", overall: 97, tags: ["rushing", "deep_ball"] },
    rb: { name: "James Cook", pos: "RB", overall: 89, tags: ["pure_rusher"] },
    wrs: [
      { name: "Khalil Shakir", pos: "WR", overall: 85, tags: ["possession", "slot"] },
      { name: "Keon Coleman", pos: "WR", overall: 82, tags: ["deep_threat"] },
      { name: "Curtis Samuel", pos: "WR", overall: 80, tags: ["slot"] },
    ],
    te: { name: "Dalton Kincaid", pos: "TE", overall: 84, tags: ["possession"] },
    defense: [
      { name: "Greg Rousseau", pos: "EDGE", overall: 87, tags: ["pass_rush"] },
      { name: "Christian Benford", pos: "CB", overall: 85, tags: ["coverage"] },
      { name: "Terrel Bernard", pos: "LB", overall: 84, tags: ["run_stopper"] },
    ] },
  { code: "MIA", city: "Miami", name: "Dolphins", color: "#008E97", accent: "#F58220", offenseScheme: "West Coast", defenseScheme: "Man-to-Man",
    qb: { name: "Tua Tagovailoa", pos: "QB", overall: 87, tags: ["quick_game", "pocket_passer"] },
    rb: { name: "De'Von Achane", pos: "RB", overall: 90, tags: ["receiving_back"] },
    wrs: [
      { name: "Tyreek Hill", pos: "WR", overall: 96, tags: ["deep_threat"] },
      { name: "Jaylen Waddle", pos: "WR", overall: 90, tags: ["slot"] },
      { name: "Malik Washington", pos: "WR", overall: 78, tags: ["possession"] },
    ],
    te: { name: "Jonnu Smith", pos: "TE", overall: 82, tags: ["possession"] },
    defense: [
      { name: "Bradley Chubb", pos: "EDGE", overall: 86, tags: ["pass_rush"] },
      { name: "Jalen Ramsey", pos: "CB", overall: 92, tags: ["coverage"] },
      { name: "Jordyn Brooks", pos: "LB", overall: 83, tags: ["run_stopper"] },
    ] },
  { code: "BAL", city: "Baltimore", name: "Ravens", color: "#241773", accent: "#9E7C0C", offenseScheme: "Ground & Pound", defenseScheme: "Blitz Heavy",
    qb: { name: "Lamar Jackson", pos: "QB", overall: 94, tags: ["rushing", "deep_ball"] },
    rb: { name: "Derrick Henry", pos: "RB", overall: 92, tags: ["pure_rusher"] },
    wrs: [
      { name: "Zay Flowers", pos: "WR", overall: 87, tags: ["slot"] },
      { name: "Rashod Bateman", pos: "WR", overall: 82, tags: ["possession"] },
      { name: "DeAndre Hopkins", pos: "WR", overall: 83, tags: ["possession"] },
    ],
    te: { name: "Mark Andrews", pos: "TE", overall: 88, tags: ["deep_threat"] },
    defense: [
      { name: "Kyle Van Noy", pos: "EDGE", overall: 82, tags: ["pass_rush"] },
      { name: "Marlon Humphrey", pos: "CB", overall: 90, tags: ["coverage"] },
      { name: "Roquan Smith", pos: "LB", overall: 92, tags: ["run_stopper"] },
    ] },
  { code: "CIN", city: "Cincinnati", name: "Bengals", color: "#FB4F14", accent: "#000000", offenseScheme: "Air Raid", defenseScheme: "Cover 2",
    qb: { name: "Joe Burrow", pos: "QB", overall: 95, tags: ["deep_ball", "pocket_passer"] },
    rb: { name: "Chase Brown", pos: "RB", overall: 84, tags: ["receiving_back"] },
    wrs: [
      { name: "Ja'Marr Chase", pos: "WR", overall: 98, tags: ["deep_threat"] },
      { name: "Tee Higgins", pos: "WR", overall: 90, tags: ["possession"] },
      { name: "Andrei Iosivas", pos: "WR", overall: 76, tags: ["slot"] },
    ],
    te: { name: "Mike Gesicki", pos: "TE", overall: 79, tags: ["possession"] },
    defense: [
      { name: "Trey Hendrickson", pos: "EDGE", overall: 93, tags: ["pass_rush"] },
      { name: "DJ Turner", pos: "CB", overall: 80, tags: ["coverage"] },
      { name: "Logan Wilson", pos: "LB", overall: 84, tags: ["run_stopper"] },
    ] },
  { code: "SF", city: "San Francisco", name: "49ers", color: "#AA0000", accent: "#B3995D", offenseScheme: "West Coast", defenseScheme: "Man-to-Man",
    qb: { name: "Brock Purdy", pos: "QB", overall: 88, tags: ["rpo", "quick_game"] },
    rb: { name: "Christian McCaffrey", pos: "RB", overall: 96, tags: ["receiving_back"] },
    wrs: [
      { name: "Deebo Samuel", pos: "WR", overall: 85, tags: ["possession"] },
      { name: "Brandon Aiyuk", pos: "WR", overall: 88, tags: ["deep_threat"] },
      { name: "Jauan Jennings", pos: "WR", overall: 80, tags: ["slot"] },
    ],
    te: { name: "George Kittle", pos: "TE", overall: 91, tags: ["possession"] },
    defense: [
      { name: "Nick Bosa", pos: "EDGE", overall: 96, tags: ["pass_rush"] },
      { name: "Charvarius Ward", pos: "CB", overall: 86, tags: ["coverage"] },
      { name: "Fred Warner", pos: "LB", overall: 95, tags: ["run_stopper"] },
    ] },
  { code: "DET", city: "Detroit", name: "Lions", color: "#0076B6", accent: "#B0B7BC", offenseScheme: "Ground & Pound", defenseScheme: "8-in-the-Box",
    qb: { name: "Jared Goff", pos: "QB", overall: 89, tags: ["pocket_passer", "play_action"] },
    rb: { name: "Jahmyr Gibbs", pos: "RB", overall: 91, tags: ["receiving_back"] },
    wrs: [
      { name: "Amon-Ra St. Brown", pos: "WR", overall: 93, tags: ["slot"] },
      { name: "Jameson Williams", pos: "WR", overall: 84, tags: ["deep_threat"] },
      { name: "Tim Patrick", pos: "WR", overall: 76, tags: ["possession"] },
    ],
    te: { name: "Sam LaPorta", pos: "TE", overall: 87, tags: ["possession"] },
    defense: [
      { name: "Aidan Hutchinson", pos: "EDGE", overall: 92, tags: ["pass_rush"] },
      { name: "Terrion Arnold", pos: "CB", overall: 82, tags: ["coverage"] },
      { name: "Alex Anzalone", pos: "LB", overall: 81, tags: ["run_stopper"] },
    ] },
  { code: "KC", city: "Kansas City", name: "Chiefs", color: "#E31837", accent: "#FFB81C", offenseScheme: "West Coast", defenseScheme: "Blitz Heavy",
    qb: { name: "Patrick Mahomes", pos: "QB", overall: 99, tags: ["deep_ball", "rushing"] },
    rb: { name: "Isiah Pacheco", pos: "RB", overall: 83, tags: ["pure_rusher"] },
    wrs: [
      { name: "Xavier Worthy", pos: "WR", overall: 85, tags: ["deep_threat"] },
      { name: "Rashee Rice", pos: "WR", overall: 86, tags: ["slot"] },
      { name: "JuJu Smith-Schuster", pos: "WR", overall: 77, tags: ["possession"] },
    ],
    te: { name: "Travis Kelce", pos: "TE", overall: 90, tags: ["possession"] },
    defense: [
      { name: "George Karlaftis", pos: "EDGE", overall: 85, tags: ["pass_rush"] },
      { name: "Trent McDuffie", pos: "CB", overall: 88, tags: ["coverage"] },
      { name: "Nick Bolton", pos: "LB", overall: 84, tags: ["run_stopper"] },
    ] },
  { code: "PHI", city: "Philadelphia", name: "Eagles", color: "#004C54", accent: "#A5ACAF", offenseScheme: "Option/RPO", defenseScheme: "Cover 2",
    qb: { name: "Jalen Hurts", pos: "QB", overall: 90, tags: ["rushing", "rpo"] },
    rb: { name: "Saquon Barkley", pos: "RB", overall: 97, tags: ["pure_rusher"] },
    wrs: [
      { name: "DeVonta Smith", pos: "WR", overall: 88, tags: ["possession"] },
      { name: "Jahan Dotson", pos: "WR", overall: 76, tags: ["slot"] },
      { name: "Jack Bech", pos: "WR", overall: 74, tags: ["deep_threat"] },
    ],
    te: { name: "Dallas Goedert", pos: "TE", overall: 85, tags: ["possession"] },
    defense: [
      { name: "Nolan Smith Jr.", pos: "EDGE", overall: 82, tags: ["pass_rush"] },
      { name: "Darius Slay", pos: "CB", overall: 84, tags: ["coverage"] },
      { name: "Zack Baun", pos: "LB", overall: 86, tags: ["run_stopper"] },
    ] },
  { code: "ARI", city: "Arizona", name: "Cardinals", color: "#97233F", accent: "#FFFFFF", offenseScheme: "Option/RPO", defenseScheme: "Blitz Heavy",
    qb: { name: "Kyler Murray", pos: "QB", overall: 85, tags: ["rushing", "deep_ball"] },
    rb: { name: "James Conner", pos: "RB", overall: 84, tags: ["pure_rusher"] },
    wrs: [
      { name: "Marvin Harrison Jr.", pos: "WR", overall: 87, tags: ["deep_threat"] },
      { name: "Michael Wilson", pos: "WR", overall: 76, tags: ["possession"] },
      { name: "Greg Dortch", pos: "WR", overall: 74, tags: ["slot"] },
    ],
    te: { name: "Trey McBride", pos: "TE", overall: 90, tags: ["possession"] },
    defense: [
      { name: "Josh Sweat", pos: "EDGE", overall: 85, tags: ["pass_rush"] },
      { name: "Garrett Williams", pos: "CB", overall: 78, tags: ["coverage"] },
      { name: "Mack Wilson Sr.", pos: "LB", overall: 77, tags: ["run_stopper"] },
    ] },
  { code: "ATL", city: "Atlanta", name: "Falcons", color: "#A71930", accent: "#000000", offenseScheme: "Ground & Pound", defenseScheme: "Cover 2",
    qb: { name: "Michael Penix Jr.", pos: "QB", overall: 83, tags: ["deep_ball", "pocket_passer"] },
    rb: { name: "Bijan Robinson", pos: "RB", overall: 95, tags: ["pure_rusher"] },
    wrs: [
      { name: "Drake London", pos: "WR", overall: 89, tags: ["possession"] },
      { name: "Darnell Mooney", pos: "WR", overall: 79, tags: ["deep_threat"] },
      { name: "Ray-Ray McCloud III", pos: "WR", overall: 73, tags: ["slot"] },
    ],
    te: { name: "Kyle Pitts", pos: "TE", overall: 84, tags: ["deep_threat"] },
    defense: [
      { name: "Matthew Judon", pos: "EDGE", overall: 82, tags: ["pass_rush"] },
      { name: "A.J. Terrell", pos: "CB", overall: 86, tags: ["coverage"] },
      { name: "Kaden Elliss", pos: "LB", overall: 79, tags: ["run_stopper"] },
    ] },
  { code: "CAR", city: "Carolina", name: "Panthers", color: "#0085CA", accent: "#101820", offenseScheme: "West Coast", defenseScheme: "8-in-the-Box",
    qb: { name: "Bryce Young", pos: "QB", overall: 78, tags: ["quick_game", "pocket_passer"] },
    rb: { name: "Chuba Hubbard", pos: "RB", overall: 82, tags: ["pure_rusher"] },
    wrs: [
      { name: "Tetairoa McMillan", pos: "WR", overall: 82, tags: ["deep_threat"] },
      { name: "Xavier Legette", pos: "WR", overall: 77, tags: ["possession"] },
      { name: "Adam Thielen", pos: "WR", overall: 76, tags: ["slot"] },
    ],
    te: { name: "Ja'Tavion Sanders", pos: "TE", overall: 75, tags: ["possession"] },
    defense: [
      { name: "D.J. Wonnum", pos: "EDGE", overall: 78, tags: ["pass_rush"] },
      { name: "Jaycee Horn", pos: "CB", overall: 86, tags: ["coverage"] },
      { name: "Trevin Wallace", pos: "LB", overall: 74, tags: ["run_stopper"] },
    ] },
  { code: "CHI", city: "Chicago", name: "Bears", color: "#0B162A", accent: "#C83803", offenseScheme: "Ground & Pound", defenseScheme: "8-in-the-Box",
    qb: { name: "Caleb Williams", pos: "QB", overall: 84, tags: ["rushing", "deep_ball"] },
    rb: { name: "D'Andre Swift", pos: "RB", overall: 82, tags: ["receiving_back"] },
    wrs: [
      { name: "DJ Moore", pos: "WR", overall: 88, tags: ["deep_threat"] },
      { name: "Rome Odunze", pos: "WR", overall: 83, tags: ["possession"] },
      { name: "Olamide Zaccheaus", pos: "WR", overall: 73, tags: ["slot"] },
    ],
    te: { name: "Colston Loveland", pos: "TE", overall: 78, tags: ["possession"] },
    defense: [
      { name: "Montez Sweat", pos: "EDGE", overall: 87, tags: ["pass_rush"] },
      { name: "Jaylon Johnson", pos: "CB", overall: 87, tags: ["coverage"] },
      { name: "T.J. Edwards", pos: "LB", overall: 82, tags: ["run_stopper"] },
    ] },
  { code: "CLE", city: "Cleveland", name: "Browns", color: "#311D00", accent: "#FF3C00", offenseScheme: "Ground & Pound", defenseScheme: "Blitz Heavy",
    qb: { name: "Dillon Gabriel", pos: "QB", overall: 72, tags: ["pocket_passer", "quick_game"] },
    rb: { name: "Quinshon Judkins", pos: "RB", overall: 79, tags: ["pure_rusher"] },
    wrs: [
      { name: "Jerry Jeudy", pos: "WR", overall: 82, tags: ["deep_threat"] },
      { name: "Cedric Tillman", pos: "WR", overall: 74, tags: ["possession"] },
      { name: "Diontae Johnson", pos: "WR", overall: 76, tags: ["slot"] },
    ],
    te: { name: "David Njoku", pos: "TE", overall: 84, tags: ["possession"] },
    defense: [
      { name: "Myles Garrett", pos: "EDGE", overall: 98, tags: ["pass_rush"] },
      { name: "Denzel Ward", pos: "CB", overall: 86, tags: ["coverage"] },
      { name: "Jeremiah Owusu-Koramoah", pos: "LB", overall: 84, tags: ["run_stopper"] },
    ] },
  { code: "DAL", city: "Dallas", name: "Cowboys", color: "#041E42", accent: "#869397", offenseScheme: "Air Raid", defenseScheme: "Blitz Heavy",
    qb: { name: "Dak Prescott", pos: "QB", overall: 90, tags: ["pocket_passer", "play_action"] },
    rb: { name: "Javonte Williams", pos: "RB", overall: 79, tags: ["pure_rusher"] },
    wrs: [
      { name: "CeeDee Lamb", pos: "WR", overall: 96, tags: ["deep_threat"] },
      { name: "George Pickens", pos: "WR", overall: 85, tags: ["deep_threat"] },
      { name: "Jalen Tolbert", pos: "WR", overall: 74, tags: ["possession"] },
    ],
    te: { name: "Jake Ferguson", pos: "TE", overall: 79, tags: ["possession"] },
    defense: [
      { name: "Osa Odighizuwa", pos: "EDGE", overall: 83, tags: ["pass_rush"] },
      { name: "Trevon Diggs", pos: "CB", overall: 84, tags: ["coverage"] },
      { name: "DeMarvion Overshown", pos: "LB", overall: 78, tags: ["run_stopper"] },
    ] },
  { code: "DEN", city: "Denver", name: "Broncos", color: "#FB4F14", accent: "#002244", offenseScheme: "West Coast", defenseScheme: "Man-to-Man",
    qb: { name: "Bo Nix", pos: "QB", overall: 85, tags: ["quick_game", "rpo"] },
    rb: { name: "RJ Harvey", pos: "RB", overall: 78, tags: ["pure_rusher"] },
    wrs: [
      { name: "Courtland Sutton", pos: "WR", overall: 84, tags: ["deep_threat"] },
      { name: "Marvin Mims Jr.", pos: "WR", overall: 78, tags: ["deep_threat"] },
      { name: "Trent Sherfield", pos: "WR", overall: 71, tags: ["possession"] },
    ],
    te: { name: "Evan Engram", pos: "TE", overall: 82, tags: ["possession"] },
    defense: [
      { name: "Nik Bonitto", pos: "EDGE", overall: 85, tags: ["pass_rush"] },
      { name: "Patrick Surtain II", pos: "CB", overall: 95, tags: ["coverage"] },
      { name: "Alex Singleton", pos: "LB", overall: 78, tags: ["run_stopper"] },
    ] },
  { code: "GB", city: "Green Bay", name: "Packers", color: "#203731", accent: "#FFB612", offenseScheme: "West Coast", defenseScheme: "Man-to-Man",
    qb: { name: "Jordan Love", pos: "QB", overall: 89, tags: ["deep_ball", "pocket_passer"] },
    rb: { name: "Josh Jacobs", pos: "RB", overall: 88, tags: ["pure_rusher"] },
    wrs: [
      { name: "Jayden Reed", pos: "WR", overall: 82, tags: ["slot"] },
      { name: "Romeo Doubs", pos: "WR", overall: 78, tags: ["possession"] },
      { name: "Christian Watson", pos: "WR", overall: 79, tags: ["deep_threat"] },
    ],
    te: { name: "Tucker Kraft", pos: "TE", overall: 82, tags: ["possession"] },
    defense: [
      { name: "Rashan Gary", pos: "EDGE", overall: 85, tags: ["pass_rush"] },
      { name: "Jaire Alexander", pos: "CB", overall: 84, tags: ["coverage"] },
      { name: "Quay Walker", pos: "LB", overall: 80, tags: ["run_stopper"] },
    ] },
  { code: "HOU", city: "Houston", name: "Texans", color: "#03202F", accent: "#A71930", offenseScheme: "Air Raid", defenseScheme: "Man-to-Man",
    qb: { name: "C.J. Stroud", pos: "QB", overall: 86, tags: ["deep_ball", "pocket_passer"] },
    rb: { name: "Joe Mixon", pos: "RB", overall: 82, tags: ["pure_rusher"] },
    wrs: [
      { name: "Nico Collins", pos: "WR", overall: 89, tags: ["deep_threat"] },
      { name: "John Metchie III", pos: "WR", overall: 75, tags: ["slot"] },
      { name: "Xavier Hutchinson", pos: "WR", overall: 73, tags: ["possession"] },
    ],
    te: { name: "Dalton Schultz", pos: "TE", overall: 81, tags: ["possession"] },
    defense: [
      { name: "Danielle Hunter", pos: "EDGE", overall: 88, tags: ["pass_rush"] },
      { name: "Derek Stingley Jr.", pos: "CB", overall: 87, tags: ["coverage"] },
      { name: "Azeez Al-Shaair", pos: "LB", overall: 80, tags: ["run_stopper"] },
    ] },
  { code: "IND", city: "Indianapolis", name: "Colts", color: "#002C5F", accent: "#A2AAAD", offenseScheme: "Ground & Pound", defenseScheme: "8-in-the-Box",
    qb: { name: "Daniel Jones", pos: "QB", overall: 79, tags: ["rushing", "pocket_passer"] },
    rb: { name: "Jonathan Taylor", pos: "RB", overall: 90, tags: ["pure_rusher"] },
    wrs: [
      { name: "Michael Pittman Jr.", pos: "WR", overall: 84, tags: ["possession"] },
      { name: "Josh Downs", pos: "WR", overall: 78, tags: ["slot"] },
      { name: "Alec Pierce", pos: "WR", overall: 75, tags: ["deep_threat"] },
    ],
    te: { name: "Tyler Warren", pos: "TE", overall: 79, tags: ["possession"] },
    defense: [
      { name: "Kwity Paye", pos: "EDGE", overall: 82, tags: ["pass_rush"] },
      { name: "Kenny Moore II", pos: "CB", overall: 83, tags: ["coverage"] },
      { name: "Zaire Franklin", pos: "LB", overall: 84, tags: ["run_stopper"] },
    ] },
  { code: "JAX", city: "Jacksonville", name: "Jaguars", color: "#006778", accent: "#D7A22A", offenseScheme: "Air Raid", defenseScheme: "Cover 2",
    qb: { name: "Trevor Lawrence", pos: "QB", overall: 87, tags: ["deep_ball", "pocket_passer"] },
    rb: { name: "Tank Bigsby", pos: "RB", overall: 77, tags: ["pure_rusher"] },
    wrs: [
      { name: "Brian Thomas Jr.", pos: "WR", overall: 88, tags: ["deep_threat"] },
      { name: "Travis Hunter", pos: "WR", overall: 85, tags: ["possession"] },
      { name: "Parker Washington", pos: "WR", overall: 73, tags: ["slot"] },
    ],
    te: { name: "Brenton Strange", pos: "TE", overall: 76, tags: ["possession"] },
    defense: [
      { name: "Josh Hines-Allen", pos: "EDGE", overall: 88, tags: ["pass_rush"] },
      { name: "Tyson Campbell", pos: "CB", overall: 82, tags: ["coverage"] },
      { name: "Devin Lloyd", pos: "LB", overall: 81, tags: ["run_stopper"] },
    ] },
  { code: "LAC", city: "Los Angeles", name: "Chargers", color: "#0080C6", accent: "#FFC20E", offenseScheme: "Ground & Pound", defenseScheme: "Cover 2",
    qb: { name: "Justin Herbert", pos: "QB", overall: 91, tags: ["deep_ball", "pocket_passer"] },
    rb: { name: "Omarion Hampton", pos: "RB", overall: 80, tags: ["pure_rusher"] },
    wrs: [
      { name: "Ladd McConkey", pos: "WR", overall: 85, tags: ["slot"] },
      { name: "Quentin Johnston", pos: "WR", overall: 76, tags: ["deep_threat"] },
      { name: "Tre' Harris", pos: "WR", overall: 74, tags: ["possession"] },
    ],
    te: { name: "Will Dissly", pos: "TE", overall: 76, tags: ["possession"] },
    defense: [
      { name: "Khalil Mack", pos: "EDGE", overall: 88, tags: ["pass_rush"] },
      { name: "Derwin James", pos: "CB", overall: 92, tags: ["coverage"] },
      { name: "Daiyan Henley", pos: "LB", overall: 79, tags: ["run_stopper"] },
    ] },
  { code: "LAR", city: "Los Angeles", name: "Rams", color: "#003594", accent: "#FFA300", offenseScheme: "West Coast", defenseScheme: "Blitz Heavy",
    qb: { name: "Matthew Stafford", pos: "QB", overall: 93, tags: ["deep_ball", "pocket_passer"] },
    rb: { name: "Kyren Williams", pos: "RB", overall: 86, tags: ["pure_rusher"] },
    wrs: [
      { name: "Puka Nacua", pos: "WR", overall: 92, tags: ["possession"] },
      { name: "Davante Adams", pos: "WR", overall: 87, tags: ["deep_threat"] },
      { name: "Tutu Atwell", pos: "WR", overall: 74, tags: ["slot"] },
    ],
    te: { name: "Colby Parkinson", pos: "TE", overall: 76, tags: ["possession"] },
    defense: [
      { name: "Jared Verse", pos: "EDGE", overall: 84, tags: ["pass_rush"] },
      { name: "Cobie Durant", pos: "CB", overall: 78, tags: ["coverage"] },
      { name: "Nate Landman", pos: "LB", overall: 76, tags: ["run_stopper"] },
    ] },
  { code: "LV", city: "Las Vegas", name: "Raiders", color: "#000000", accent: "#A5ACAF", offenseScheme: "West Coast", defenseScheme: "8-in-the-Box",
    qb: { name: "Kirk Cousins", pos: "QB", overall: 80, tags: ["pocket_passer", "play_action"] },
    rb: { name: "Ashton Jeanty", pos: "RB", overall: 85, tags: ["pure_rusher"] },
    wrs: [
      { name: "Jakobi Meyers", pos: "WR", overall: 80, tags: ["possession"] },
      { name: "Tre Tucker", pos: "WR", overall: 74, tags: ["deep_threat"] },
      { name: "Dont'e Thornton Jr.", pos: "WR", overall: 72, tags: ["slot"] },
    ],
    te: { name: "Brock Bowers", pos: "TE", overall: 92, tags: ["possession"] },
    defense: [
      { name: "Maxx Crosby", pos: "EDGE", overall: 93, tags: ["pass_rush"] },
      { name: "Jack Jones", pos: "CB", overall: 76, tags: ["coverage"] },
      { name: "Germaine Pratt", pos: "LB", overall: 76, tags: ["run_stopper"] },
    ] },
  { code: "MIN", city: "Minnesota", name: "Vikings", color: "#4F2683", accent: "#FFC62F", offenseScheme: "Air Raid", defenseScheme: "Blitz Heavy",
    qb: { name: "J.J. McCarthy", pos: "QB", overall: 78, tags: ["play_action", "pocket_passer"] },
    rb: { name: "Aaron Jones", pos: "RB", overall: 82, tags: ["pure_rusher"] },
    wrs: [
      { name: "Justin Jefferson", pos: "WR", overall: 98, tags: ["deep_threat"] },
      { name: "Jordan Addison", pos: "WR", overall: 82, tags: ["possession"] },
      { name: "Jalen Nailor", pos: "WR", overall: 73, tags: ["slot"] },
    ],
    te: { name: "T.J. Hockenson", pos: "TE", overall: 84, tags: ["possession"] },
    defense: [
      { name: "Jonathan Greenard", pos: "EDGE", overall: 82, tags: ["pass_rush"] },
      { name: "Byron Murphy Jr.", pos: "CB", overall: 81, tags: ["coverage"] },
      { name: "Blake Cashman", pos: "LB", overall: 76, tags: ["run_stopper"] },
    ] },
  { code: "NE", city: "New England", name: "Patriots", color: "#002244", accent: "#C60C30", offenseScheme: "Option/RPO", defenseScheme: "Man-to-Man",
    qb: { name: "Drake Maye", pos: "QB", overall: 92, tags: ["rushing", "deep_ball"] },
    rb: { name: "TreVeyon Henderson", pos: "RB", overall: 80, tags: ["pure_rusher"] },
    wrs: [
      { name: "Stefon Diggs", pos: "WR", overall: 85, tags: ["possession"] },
      { name: "DeMario Douglas", pos: "WR", overall: 74, tags: ["slot"] },
      { name: "Kayshon Boutte", pos: "WR", overall: 72, tags: ["deep_threat"] },
    ],
    te: { name: "Hunter Henry", pos: "TE", overall: 79, tags: ["possession"] },
    defense: [
      { name: "Harold Landry III", pos: "EDGE", overall: 81, tags: ["pass_rush"] },
      { name: "Christian Gonzalez", pos: "CB", overall: 87, tags: ["coverage"] },
      { name: "Robert Spillane", pos: "LB", overall: 78, tags: ["run_stopper"] },
    ] },
  { code: "NO", city: "New Orleans", name: "Saints", color: "#D3BC8D", accent: "#101820", offenseScheme: "West Coast", defenseScheme: "Cover 2",
    qb: { name: "Tyler Shough", pos: "QB", overall: 76, tags: ["pocket_passer", "quick_game"] },
    rb: { name: "Travis Etienne Jr.", pos: "RB", overall: 82, tags: ["receiving_back"] },
    wrs: [
      { name: "Chris Olave", pos: "WR", overall: 85, tags: ["deep_threat"] },
      { name: "Rashid Shaheed", pos: "WR", overall: 78, tags: ["slot"] },
      { name: "Jordyn Tyson", pos: "WR", overall: 73, tags: ["possession"] },
    ],
    te: { name: "Juwan Johnson", pos: "TE", overall: 74, tags: ["possession"] },
    defense: [
      { name: "Cameron Jordan", pos: "EDGE", overall: 82, tags: ["pass_rush"] },
      { name: "Alontae Taylor", pos: "CB", overall: 78, tags: ["coverage"] },
      { name: "Demario Davis", pos: "LB", overall: 83, tags: ["run_stopper"] },
    ] },
  { code: "NYG", city: "New York", name: "Giants", color: "#0B2265", accent: "#A71930", offenseScheme: "Option/RPO", defenseScheme: "8-in-the-Box",
    qb: { name: "Jaxson Dart", pos: "QB", overall: 79, tags: ["rushing", "pocket_passer"] },
    rb: { name: "Cam Skattebo", pos: "RB", overall: 78, tags: ["pure_rusher"] },
    wrs: [
      { name: "Malik Nabers", pos: "WR", overall: 89, tags: ["deep_threat"] },
      { name: "Wan'Dale Robinson", pos: "WR", overall: 78, tags: ["slot"] },
      { name: "Darius Slayton", pos: "WR", overall: 74, tags: ["possession"] },
    ],
    te: { name: "Theo Johnson", pos: "TE", overall: 73, tags: ["possession"] },
    defense: [
      { name: "Brian Burns", pos: "EDGE", overall: 88, tags: ["pass_rush"] },
      { name: "Deonte Banks", pos: "CB", overall: 78, tags: ["coverage"] },
      { name: "Bobby Okereke", pos: "LB", overall: 81, tags: ["run_stopper"] },
    ] },
  { code: "NYJ", city: "New York", name: "Jets", color: "#125740", accent: "#000000", offenseScheme: "Option/RPO", defenseScheme: "Man-to-Man",
    qb: { name: "Justin Fields", pos: "QB", overall: 80, tags: ["rushing", "deep_ball"] },
    rb: { name: "Breece Hall", pos: "RB", overall: 86, tags: ["receiving_back"] },
    wrs: [
      { name: "Garrett Wilson", pos: "WR", overall: 89, tags: ["deep_threat"] },
      { name: "Allen Lazard", pos: "WR", overall: 74, tags: ["possession"] },
      { name: "Malachi Corley", pos: "WR", overall: 71, tags: ["slot"] },
    ],
    te: { name: "Mason Taylor", pos: "TE", overall: 74, tags: ["possession"] },
    defense: [
      { name: "Will McDonald IV", pos: "EDGE", overall: 78, tags: ["pass_rush"] },
      { name: "Sauce Gardner", pos: "CB", overall: 94, tags: ["coverage"] },
      { name: "Quincy Williams", pos: "LB", overall: 80, tags: ["run_stopper"] },
    ] },
  { code: "PIT", city: "Pittsburgh", name: "Steelers", color: "#000000", accent: "#FFB612", offenseScheme: "Ground & Pound", defenseScheme: "8-in-the-Box",
    qb: { name: "Aaron Rodgers", pos: "QB", overall: 82, tags: ["pocket_passer", "play_action"] },
    rb: { name: "Jaylen Warren", pos: "RB", overall: 79, tags: ["pure_rusher"] },
    wrs: [
      { name: "DK Metcalf", pos: "WR", overall: 87, tags: ["deep_threat"] },
      { name: "Calvin Austin III", pos: "WR", overall: 74, tags: ["slot"] },
      { name: "Roman Wilson", pos: "WR", overall: 71, tags: ["possession"] },
    ],
    te: { name: "Pat Freiermuth", pos: "TE", overall: 78, tags: ["possession"] },
    defense: [
      { name: "T.J. Watt", pos: "EDGE", overall: 96, tags: ["pass_rush"] },
      { name: "Joey Porter Jr.", pos: "CB", overall: 82, tags: ["coverage"] },
      { name: "Patrick Queen", pos: "LB", overall: 81, tags: ["run_stopper"] },
    ] },
  { code: "SEA", city: "Seattle", name: "Seahawks", color: "#002244", accent: "#69BE28", offenseScheme: "West Coast", defenseScheme: "Cover 2",
    qb: { name: "Sam Darnold", pos: "QB", overall: 88, tags: ["deep_ball", "pocket_passer"] },
    rb: { name: "Kenneth Walker III", pos: "RB", overall: 84, tags: ["pure_rusher"] },
    wrs: [
      { name: "Jaxon Smith-Njigba", pos: "WR", overall: 87, tags: ["slot"] },
      { name: "Cooper Kupp", pos: "WR", overall: 84, tags: ["possession"] },
      { name: "Tory Horton", pos: "WR", overall: 72, tags: ["deep_threat"] },
    ],
    te: { name: "AJ Barner", pos: "TE", overall: 74, tags: ["possession"] },
    defense: [
      { name: "Derick Hall", pos: "EDGE", overall: 78, tags: ["pass_rush"] },
      { name: "Riq Woolen", pos: "CB", overall: 82, tags: ["coverage"] },
      { name: "Ernest Jones IV", pos: "LB", overall: 80, tags: ["run_stopper"] },
    ] },
  { code: "TB", city: "Tampa Bay", name: "Buccaneers", color: "#D50A0A", accent: "#34302B", offenseScheme: "Air Raid", defenseScheme: "Blitz Heavy",
    qb: { name: "Baker Mayfield", pos: "QB", overall: 87, tags: ["pocket_passer", "play_action"] },
    rb: { name: "Bucky Irving", pos: "RB", overall: 83, tags: ["receiving_back"] },
    wrs: [
      { name: "Mike Evans", pos: "WR", overall: 88, tags: ["deep_threat"] },
      { name: "Chris Godwin", pos: "WR", overall: 85, tags: ["possession"] },
      { name: "Jalen McMillan", pos: "WR", overall: 76, tags: ["slot"] },
    ],
    te: { name: "Cade Otton", pos: "TE", overall: 76, tags: ["possession"] },
    defense: [
      { name: "Yaya Diaby", pos: "EDGE", overall: 80, tags: ["pass_rush"] },
      { name: "Zyon McCollum", pos: "CB", overall: 78, tags: ["coverage"] },
      { name: "Lavonte David", pos: "LB", overall: 82, tags: ["run_stopper"] },
    ] },
  { code: "TEN", city: "Tennessee", name: "Titans", color: "#4B92DB", accent: "#0C2340", offenseScheme: "Ground & Pound", defenseScheme: "Blitz Heavy",
    qb: { name: "Cam Ward", pos: "QB", overall: 80, tags: ["rushing", "deep_ball"] },
    rb: { name: "Tony Pollard", pos: "RB", overall: 81, tags: ["pure_rusher"] },
    wrs: [
      { name: "Calvin Ridley", pos: "WR", overall: 83, tags: ["deep_threat"] },
      { name: "Tyler Lockett", pos: "WR", overall: 79, tags: ["slot"] },
      { name: "Elic Ayomanor", pos: "WR", overall: 73, tags: ["possession"] },
    ],
    te: { name: "Chig Okonkwo", pos: "TE", overall: 76, tags: ["possession"] },
    defense: [
      { name: "James Pearce Jr.", pos: "EDGE", overall: 76, tags: ["pass_rush"] },
      { name: "L'Jarius Sneed", pos: "CB", overall: 82, tags: ["coverage"] },
      { name: "Kenneth Murray Jr.", pos: "LB", overall: 75, tags: ["run_stopper"] },
    ] },
  { code: "WAS", city: "Washington", name: "Commanders", color: "#5A1414", accent: "#FFB612", offenseScheme: "Option/RPO", defenseScheme: "8-in-the-Box",
    qb: { name: "Jayden Daniels", pos: "QB", overall: 91, tags: ["rushing", "deep_ball"] },
    rb: { name: "Jacory Croskey-Merritt", pos: "RB", overall: 76, tags: ["pure_rusher"] },
    wrs: [
      { name: "Terry McLaurin", pos: "WR", overall: 88, tags: ["deep_threat"] },
      { name: "Deebo Samuel", pos: "WR", overall: 84, tags: ["possession"] },
      { name: "Noah Brown", pos: "WR", overall: 74, tags: ["slot"] },
    ],
    te: { name: "Zach Ertz", pos: "TE", overall: 79, tags: ["possession"] },
    defense: [
      { name: "Dante Fowler Jr.", pos: "EDGE", overall: 79, tags: ["pass_rush"] },
      { name: "Marshon Lattimore", pos: "CB", overall: 84, tags: ["coverage"] },
      { name: "Bobby Wagner", pos: "LB", overall: 83, tags: ["run_stopper"] },
    ] },
];
