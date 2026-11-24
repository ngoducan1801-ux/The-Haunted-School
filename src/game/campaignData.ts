import type {
  LevelConfig,
  NpcDialogueOption,
  NpcDialogueSession,
  PuzzleDefinition,
} from '../types/game';
import { LEVEL_SPAWNS } from './schoolBlueprint';

/**
 * Complete 10-Level Campaign matching Part 3 progression from Very Easy (Level 1) to Maximum (Level 10).
 */
export const CAMPAIGN_LEVELS: LevelConfig[] = [
  {
    level: 1,
    name: 'The Empty Reception',
    subtitle: 'Abandoned Gate, Courtyard & Reception Hall',
    difficultyLabel: 'Very Easy',
    startingZone: 'School Entrance Gate (Exterior)',
    objectiveDescription:
      'Enter through the School Entrance Gate, read the Caretaker Log, restore Reception Breaker B, recover the Courtyard Exit Key in the Teacher Offices, and unlock the South Emergency Exit.',
    objectives: [
      { id: 'obj_l1_note', label: 'Locate the first mysterious note on the reception desk' },
      { id: 'obj_l1_key', label: 'Recover Courtyard Exit Key & restore Reception Circuit (Breaker B)' },
      { id: 'obj_l1_exit', label: 'Unlock the South Emergency Exit' },
    ],
    spawn: LEVEL_SPAWNS[1],
    requiredKeyId: 'key_courtyard',
    requiredSwitchId: null,
    requiredPuzzleId: 'puzzle_l1_circuit',
    exitId: 'exit_south_reception',
    ambientIntensity: 0.17,
    fogDensity: 0.036,
    flickerChance: 0.06,
    supernaturalEventRate: 0.05,
    batteryDrainMultiplier: 0.55,
    activeMonsters: ['shadow_walker'],
    witchActive: false,
  },
  {
    level: 2,
    name: 'The Forgotten Classroom',
    subtitle: 'East Classrooms & Storage Wing',
    difficultyLabel: 'Easy',
    startingZone: 'East Corridor',
    objectiveDescription:
      'Gather missing classroom items, decode the blackboard padlock sequence, recover the Principal Wing Key, and unlock the East Stairwell Exit.',
    objectives: [
      { id: 'obj_l2_items', label: 'Inspect Classroom 101/102 for missing items & blackboard clue' },
      { id: 'obj_l2_puzzle', label: 'Solve the locked classroom cabinet code (Puzzle)' },
      { id: 'obj_l2_exit', label: 'Unlock the East Wing Corridor Exit' },
    ],
    spawn: LEVEL_SPAWNS[2],
    requiredKeyId: 'key_principal',
    requiredSwitchId: null,
    requiredPuzzleId: 'puzzle_l2_cabinet',
    exitId: 'exit_east_wing',
    ambientIntensity: 0.145,
    fogDensity: 0.042,
    flickerChance: 0.11,
    supernaturalEventRate: 0.12,
    batteryDrainMultiplier: 0.72,
    activeMonsters: ['shadow_walker', 'silent_student'],
    witchActive: false,
  },
  {
    level: 3,
    name: 'The Silent Library',
    subtitle: 'Tall Bookshelves, Reading Room & Secret Archive',
    difficultyLabel: 'Easy to Medium',
    startingZone: 'School Library',
    objectiveDescription:
      'Speak with the Witch in the stacks, arrange the three historical books in order, and open the secret library passage.',
    objectives: [
      { id: 'obj_l3_witch', label: 'Encounter the Witch & recover the Archivist Note' },
      { id: 'obj_l3_puzzle', label: 'Arrange the books in chronological order (Puzzle)' },
      { id: 'obj_l3_exit', label: 'Pull the tilted secret ledger & escape via Hidden Passage' },
    ],
    spawn: LEVEL_SPAWNS[3],
    requiredKeyId: null,
    requiredSwitchId: 'switch_library_book',
    requiredPuzzleId: 'puzzle_l3_books',
    exitId: 'exit_secret_archive',
    ambientIntensity: 0.125,
    fogDensity: 0.046,
    flickerChance: 0.15,
    supernaturalEventRate: 0.2,
    batteryDrainMultiplier: 0.85,
    activeMonsters: ['shadow_walker', 'silent_student'],
    witchActive: true,
  },
  {
    level: 4,
    name: 'The Science Laboratory',
    subtitle: 'Science & Chemistry Wing (Sound-Reactive Threat)',
    difficultyLabel: 'Medium',
    startingZone: 'Science Laboratory',
    objectiveDescription:
      'Move quietly past the sound-reactive Crawler, locate lab documents, solve the reagent logic puzzle, and restore power.',
    objectives: [
      { id: 'obj_l4_doc', label: 'Find the Chemistry Incident Report & lab components' },
      { id: 'obj_l4_puzzle', label: 'Solve the Laboratory Logic Console (Puzzle)' },
      { id: 'obj_l4_exit', label: 'Restore override power & unlock the Science Corridor Exit' },
    ],
    spawn: LEVEL_SPAWNS[4],
    requiredKeyId: null,
    requiredSwitchId: 'switch_computer_override',
    requiredPuzzleId: 'puzzle_l4_lab',
    exitId: 'exit_science_hall',
    ambientIntensity: 0.105,
    fogDensity: 0.052,
    flickerChance: 0.22,
    supernaturalEventRate: 0.28,
    batteryDrainMultiplier: 0.95,
    activeMonsters: ['crawler', 'shadow_walker'],
    witchActive: false,
  },
  {
    level: 5,
    name: 'The Night Terminal Lockdown',
    subtitle: 'Computer Room, Principal’s Office & Library Wing',
    difficultyLabel: 'Medium to Hard',
    startingZone: 'Computer Room',
    objectiveDescription:
      'Cross-check lingering stories against the Principal’s Office records, decode the Computer Room login password, recover the Library Master Key, and unlock the North Library Exit.',
    objectives: [
      { id: 'obj_l5_docs', label: 'Inspect Principal’s Terminal & identify missing student Linh Tran' },
      { id: 'obj_l5_puzzle', label: 'Decode the Computer Password & unlock restricted records (Puzzle)' },
      { id: 'obj_l5_exit', label: 'Obtain Library Master Key & unlock the North Library Exit' },
    ],
    spawn: LEVEL_SPAWNS[5],
    requiredKeyId: 'key_library',
    requiredSwitchId: null,
    requiredPuzzleId: 'puzzle_l5_password',
    exitId: 'exit_north_library',
    ambientIntensity: 0.095,
    fogDensity: 0.056,
    flickerChance: 0.28,
    supernaturalEventRate: 0.36,
    batteryDrainMultiplier: 1.02,
    activeMonsters: ['silent_student', 'hallway_stalker'],
    witchActive: true,
  },
  {
    level: 6,
    name: 'The Underground Basement',
    subtitle: 'Boiler Halls & Claustrophobic Tunnels',
    difficultyLabel: 'Hard',
    startingZone: 'Underground Basement',
    objectiveDescription:
      'Manage flashlight visibility against the Hallway Stalker, restore the damaged basement breaker, and unlock the Sub-Level Hatch.',
    objectives: [
      { id: 'obj_l6_note', label: 'Read the Maintenance Warning in the boiler tunnel' },
      { id: 'obj_l6_puzzle', label: 'Restore the damaged multi-step electrical breaker (Puzzle)' },
      { id: 'obj_l6_exit', label: 'Activate Main Breaker & unlock the Sub-Level Courtyard Hatch' },
    ],
    spawn: LEVEL_SPAWNS[6],
    requiredKeyId: null,
    requiredSwitchId: 'switch_basement_breaker',
    requiredPuzzleId: 'puzzle_l6_breaker',
    exitId: 'exit_courtyard_gate',
    ambientIntensity: 0.075,
    fogDensity: 0.062,
    flickerChance: 0.36,
    supernaturalEventRate: 0.45,
    batteryDrainMultiplier: 1.12,
    activeMonsters: ['hallway_stalker', 'crawler'],
    witchActive: false,
  },
  {
    level: 7,
    name: 'The Witch’s Territory',
    subtitle: 'Ritual Chambers, Contradictions & Hidden Relics',
    difficultyLabel: 'Very Hard',
    startingZone: 'School Cafeteria',
    objectiveDescription:
      'Evaluate the Witch’s shifting stories, uncover the Brass School Seal, solve the Ritual Symbol Puzzle, and open the Infirmary Exit.',
    objectives: [
      { id: 'obj_l7_witch', label: 'Confront the Witch & cross-check NPC truthfulness' },
      { id: 'obj_l7_puzzle', label: 'Solve the Witch’s Ritual Symbol Deduction (Puzzle)' },
      { id: 'obj_l7_exit', label: 'Secure Infirmary Key & unlock the Medical Corridor Exit' },
    ],
    spawn: LEVEL_SPAWNS[7],
    requiredKeyId: 'key_infirmary',
    requiredSwitchId: null,
    requiredPuzzleId: 'puzzle_l7_symbols',
    exitId: 'exit_cafeteria_corridor',
    ambientIntensity: 0.065,
    fogDensity: 0.066,
    flickerChance: 0.42,
    supernaturalEventRate: 0.54,
    batteryDrainMultiplier: 1.2,
    activeMonsters: ['shadow_walker', 'silent_student', 'crawler'],
    witchActive: true,
  },
  {
    level: 8,
    name: 'The School Without Light',
    subtitle: 'Near-Total Darkness & Adaptive Monster Patrols',
    difficultyLabel: 'Extremely Hard',
    startingZone: 'Reception Hall',
    objectiveDescription:
      'Light emergency lanterns across the pitch-dark school, solve the auxiliary power memory puzzle, and unlock the Basement Gate.',
    objectives: [
      { id: 'obj_l8_lights', label: 'Ignite emergency lanterns to push back the darkness' },
      { id: 'obj_l8_puzzle', label: 'Solve the Central Emergency Grid Sequence (Puzzle)' },
      { id: 'obj_l8_exit', label: 'Recover Basement Gate Key & reach the Basement Descent' },
    ],
    spawn: LEVEL_SPAWNS[8],
    requiredKeyId: 'key_basement',
    requiredSwitchId: null,
    requiredPuzzleId: 'puzzle_l8_blackout',
    exitId: 'exit_basement_stair',
    ambientIntensity: 0.032,
    fogDensity: 0.074,
    flickerChance: 0.52,
    supernaturalEventRate: 0.66,
    batteryDrainMultiplier: 1.28,
    activeMonsters: ['hallway_stalker', 'crawler', 'shadow_walker'],
    witchActive: true,
  },
  {
    level: 9,
    name: 'The Forgotten Truth',
    subtitle: 'Multi-Floor Investigation & 1998 Evidence',
    difficultyLabel: 'Extremely Hard',
    startingZone: 'Outdoor Courtyard',
    objectiveDescription:
      'Reconstruct the 1998 school tragedy timeline from scattered evidence, solve the historical deduction, and reach the Rooftop Access.',
    objectives: [
      { id: 'obj_l9_evidence', label: 'Gather 1998 historical notes across the courtyard & library' },
      { id: 'obj_l9_puzzle', label: 'Reconstruct the 1998 Sequence of Events (Puzzle)' },
      { id: 'obj_l9_exit', label: 'Retrieve Rooftop Hatch Key & open Rooftop Access Door' },
    ],
    spawn: LEVEL_SPAWNS[9],
    requiredKeyId: 'key_rooftop',
    requiredSwitchId: null,
    requiredPuzzleId: 'puzzle_l9_timeline',
    exitId: 'exit_rooftop_stair',
    ambientIntensity: 0.045,
    fogDensity: 0.072,
    flickerChance: 0.56,
    supernaturalEventRate: 0.74,
    batteryDrainMultiplier: 1.32,
    activeMonsters: ['hallway_stalker', 'silent_student', 'shadow_walker'],
    witchActive: true,
  },
  {
    level: 10,
    name: 'The Final Night',
    subtitle: 'All School Floors Connected — Final Escape',
    difficultyLabel: 'Maximum',
    startingZone: 'School Rooftop (Above Floor 6)',
    objectiveDescription:
      'All monsters and the Witch roam the connected school. Solve the Final Master Cipher, activate the Rooftop Beacon, and escape.',
    objectives: [
      { id: 'obj_l10_beacon', label: 'Activate the Rooftop Emergency Beacon switch' },
      { id: 'obj_l10_puzzle', label: 'Solve the Final Master School Cipher (Puzzle)' },
      { id: 'obj_l10_exit', label: 'Unlock the Final Emergency Escape Hatch' },
    ],
    spawn: LEVEL_SPAWNS[10],
    requiredKeyId: null,
    requiredSwitchId: 'switch_rooftop_beacon',
    requiredPuzzleId: 'puzzle_l10_final',
    exitId: 'exit_final_escape',
    ambientIntensity: 0.03,
    fogDensity: 0.078,
    flickerChance: 0.62,
    supernaturalEventRate: 0.85,
    batteryDrainMultiplier: 1.38,
    activeMonsters: ['hallway_stalker', 'crawler', 'shadow_walker', 'silent_student'],
    witchActive: true,
  },
];

/**
 * Progressive puzzle catalog across all 10 levels (never revealing answers immediately).
 */
export const PUZZLE_DEFINITIONS: Record<string, PuzzleDefinition> = {
  puzzle_l1_circuit: {
    id: 'puzzle_l1_circuit',
    level: 1,
    kind: 'logic',
    title: 'Reception Circuit Fuse Check',
    prompt:
      'The Reception circuit panel has three labeled breakers: A (Courtyard Floodlight), B (East Hallway Emergency Ballast), C (Abandoned Bell). To light the way into Classroom 101 without triggering the school bell, which breaker label should be engaged?',
    clues: [
      'Notice board note: "Do NOT engage Breaker C—the bell draws movement."',
      'Caretaker log: "East Hallway ballast failed at 02:15."',
    ],
    hint: 'Identify the single breaker tied to the East Hallway lighting.',
    analyticalHint: 'Eliminate A (outdoor) and C (bell alarm); only B powers the interior hallway.',
    quickHint: 'Quick Analysis: The scorch mark sits directly beside switch B.',
    inputMode: 'choice',
    options: ['BREAKER A', 'BREAKER B', 'BREAKER C'],
    answer: 'BREAKER B',
    objectiveId: 'obj_l1_key',
    solvedText: 'Relay engaged—hallway emergency circuit restored.',
  },
  puzzle_l2_cabinet: {
    id: 'puzzle_l2_cabinet',
    level: 2,
    kind: 'math',
    title: 'Classroom 102 Padlock Sequence',
    prompt:
      'On the broken blackboard in Room 102, three numbers remain circled in chalk: 2, 6, 12, 20, __ . Enter the next number in the sequence to unlock the teacher supply cabinet.',
    clues: [
      'Differences between terms: +4, +6, +8...',
      'Chalk margin note: "Increase each step by 2."',
    ],
    hint: 'Notice how much is added at each step: +4, then +6, then +8...',
    analyticalHint: 'Pattern formula n*(n+1): 1×2=2, 2×3=6, 3×4=12, 4×5=20, next is 5×6.',
    quickHint: 'Quick Analysis: 20 plus the next even jump (+10).',
    inputMode: 'input',
    answer: '30',
    objectiveId: 'obj_l2_puzzle',
    solvedText: 'Cabinet latch snaps open cleanly.',
  },
  puzzle_l3_books: {
    id: 'puzzle_l3_books',
    level: 3,
    kind: 'order',
    title: 'Archive Shelf Ordering',
    prompt:
      'Arrange the three archive ledgers from OLDEST to NEWEST to release the hidden bookshelf catch.',
    clues: [
      'Founding Charter is stamped May 1974.',
      'Boiler Inspection Ledger is stamped Winter 1989.',
      'Final Attendance Roll is stamped October 1998.',
    ],
    hint: 'Click the books in ascending chronological year order.',
    analyticalHint: '1974 < 1989 < 1998.',
    quickHint: 'Quick Analysis: Start with the Founding Charter.',
    inputMode: 'sequence_order',
    options: ['Final Attendance (1998)', 'Founding Charter (1974)', 'Boiler Ledger (1989)'],
    answer: 'Founding Charter (1974),Boiler Ledger (1989),Final Attendance (1998)',
    objectiveId: 'obj_l3_puzzle',
    solvedText: 'Inside the shelf, a brass catch clicks—the tilted ledger is now ready.',
  },
  puzzle_l4_lab: {
    id: 'puzzle_l4_lab',
    level: 4,
    kind: 'logic',
    title: 'Chemistry Fume-Hood Interlock',
    prompt:
      'Three valves (Blue, Amber, Red) control the restricted power latch. Clues carved on the slate bench read: (1) Blue is NOT first. (2) Red opens immediately AFTER Amber. Enter the 3-letter opening sequence (e.g. XYZ using B, A, R).',
    clues: [
      'Rule 1: Blue is not in position 1.',
      'Rule 2: Amber must come right before Red (AR).',
      'Rule 3: The last valve is NOT Red.',
    ],
    hint: 'If Amber-Red are adjacent and Red cannot be last, where must Amber-Red sit?',
    analyticalHint: 'Only slots 1–2 allow AR without R being 3rd, leaving slot 3 for Blue.',
    quickHint: 'Quick Analysis: Valve A shows fresh wrench scratches first.',
    inputMode: 'input',
    answer: 'ARB',
    objectiveId: 'obj_l4_puzzle',
    solvedText: 'Fume-hood interlock unlocks with a hiss of cold air.',
  },
  puzzle_l5_password: {
    id: 'puzzle_l5_password',
    level: 5,
    kind: 'pattern',
    title: 'Computer Room Terminal Password',
    prompt:
      'The login terminal asks for the former missing student’s uppercase surname + graduation year (no spaces). Principal’s archive memo reads: "Student L. TRAN vanished during the October 1998 blackout."',
    clues: [
      'Principal Terminal Note: "Linh Tran — Class 1998."',
      'Login format hint on monitor bezel: SURNAMEYYYY',
    ],
    hint: 'Combine the student’s surname and the 4-digit year in uppercase.',
    analyticalHint: 'Pattern check: 4 letters + 4 digits = 8 characters total.',
    quickHint: 'Quick Analysis: Post-it under the keyboard reads "TRAN + blackout year".',
    inputMode: 'input',
    answer: 'TRAN1998',
    objectiveId: 'obj_l5_puzzle',
    solvedText: 'Access Granted — Restricted Wing Directory unlocked.',
  },
  puzzle_l6_breaker: {
    id: 'puzzle_l6_breaker',
    level: 6,
    kind: 'multistep',
    title: 'Basement Sub-Panel Load Balancing',
    prompt:
      'The damaged basement panel needs exactly 24 Amps across 3 relays. Available relay coils are 5A, 7A, 9A, 10A, 13A. Enter the three required amperage values separated by hyphens (e.g. 4-6-8).',
    clues: [
      'Maintenance plate: "Avoid using the corroded 13A coil."',
      'Target current: 24A using three intact coils from {5, 7, 9, 10}.',
    ],
    hint: 'Exclude 13; check which three of {5, 7, 9, 10} add up to 24.',
    analyticalHint: 'Sum of {5,7,9,10} is 31; 31 - 24 = 7, so omit 7!',
    quickHint: 'Quick Analysis: Relay 7A has a snapped copper lead.',
    inputMode: 'input',
    answer: '5-9-10',
    objectiveId: 'obj_l6_puzzle',
    solvedText: 'Sub-panel hums steadily—power routed to Main Breaker.',
  },
  puzzle_l7_symbols: {
    id: 'puzzle_l7_symbols',
    level: 7,
    kind: 'symbol',
    title: 'The Witch’s Contradiction Seal',
    prompt:
      'Three voices testify where the seal key rests (under MOON, EYE, or BELL), and exactly ONE voice tells the truth: The Night Guard insists "The seal lies under MOON." The Archive Witness whispers "It is NOT under MOON." The Pale Witch smiles "It is NOT under BELL." Which symbol breaks the seal?',
    clues: [
      'Exactly ONE of the three statements is true.',
      'Night Guard: "It lies under MOON." · Archive Witness: "It is NOT under MOON."',
      'Pale Witch: "It is NOT under BELL."',
    ],
    hint: 'The Guard and Archive Witness directly contradict each other, so one of them MUST be the sole truth-teller.',
    analyticalHint:
      'Because Guard and Witness are exact opposites, one is true and the Witch MUST be lying ("NOT under BELL" is false -> Answer is BELL).',
    quickHint: 'Quick Analysis: Fresh chalk scratches outline the BELL sigil.',
    inputMode: 'choice',
    options: ['MOON', 'EYE', 'BELL'],
    answer: 'BELL',
    objectiveId: 'obj_l7_puzzle',
    solvedText: 'The chalk circle fades—falsehoods stripped away.',
  },
  puzzle_l8_blackout: {
    id: 'puzzle_l8_blackout',
    level: 8,
    kind: 'memory',
    title: 'Blackout Emergency Grid Cipher',
    prompt:
      'The auxiliary panel flashes a four-letter blackout code formed by the initials of the 4 darkened wings visited tonight: Reception, Library, Chemistry, Basement. Enter the 4-letter code.',
    clues: [
      'Wall stencil: "R -> L -> C -> B emergency loop."',
      'Take the first letter of each wing in sequence.',
    ],
    hint: 'Read the four wing names in order: Reception, Library, Chemistry, Basement.',
    analyticalHint: 'Four-character acronym: R, L, C, B.',
    quickHint: 'Quick Analysis: Scratched directly onto the breaker cover in dust.',
    inputMode: 'input',
    answer: 'RLCB',
    objectiveId: 'obj_l8_puzzle',
    solvedText: 'Auxiliary corridor relays engage dimly across the dark wing.',
  },
  puzzle_l9_timeline: {
    id: 'puzzle_l9_timeline',
    level: 9,
    kind: 'sequence',
    title: '1998 Abandonment Timeline',
    prompt:
      'Reconstruct the true 4-step sequence of the October 1998 incident that closed the school forever.',
    clues: [
      'A chemical fire started in the Basement/Chemistry shaft first.',
      'Student Linh Tran went missing trying to retrieve records from the Library.',
      'The Principal sealed the master keys inside his office vault.',
      'The School Board ordered permanent evacuation the following morning.',
    ],
    hint: 'Cause comes first, followed by the disappearance, the cover-up lock, and final closure.',
    analyticalHint: 'Fire -> Disappearance -> Keys Sealed -> Evacuation.',
    quickHint: 'Quick Analysis: Notice dates Oct 12 -> Oct 13 -> Oct 14 -> Oct 15.',
    inputMode: 'sequence_order',
    options: [
      'Keys Sealed by Principal',
      'Chemical Surge & Fire',
      'Permanent Evacuation',
      'Student Vanished in Library',
    ],
    answer:
      'Chemical Surge & Fire,Student Vanished in Library,Keys Sealed by Principal,Permanent Evacuation',
    objectiveId: 'obj_l9_puzzle',
    solvedText: 'Historical archive verified—the rooftop access code matches.',
  },
  puzzle_l10_final: {
    id: 'puzzle_l10_final',
    level: 10,
    kind: 'code',
    title: 'The Final Master School Cipher',
    prompt:
      'Combine the four truths across all floors to unlock the Final Escape Hatch: [Room 102 sequence answer (2 digits)] + [Year of the tragedy (4 digits)] — Enter the 6-digit master override code.',
    clues: [
      'From Level 2 Classroom 102 sequence: 2, 6, 12, 20, [?]',
      'From Level 3/5/9 archives: School abandoned in October [????]',
    ],
    hint: 'Put the 2-digit Classroom 102 answer right before the 4-digit abandonment year.',
    analyticalHint: '30 followed by 1998.',
    quickHint: 'Quick Analysis: Six digits total, etched inside the Escape Hatch dial.',
    inputMode: 'input',
    answer: '301998',
    objectiveId: 'obj_l10_puzzle',
    solvedText: 'FINAL ESCAPE OVERRIDE ACCEPTED — Rooftop Hatch Unlocked!',
  },
};

export function validatePuzzleAnswer(puzzle: PuzzleDefinition, rawAnswer: string): boolean {
  const clean = (s: string) => s.trim().replace(/\s+/g, ' ').toUpperCase();
  if (puzzle.id === 'puzzle_l6_breaker') {
    const nums = rawAnswer.match(/\d+/g);
    if (nums && nums.length === 3) {
      const normalized = nums
        .map((n) => Number(n))
        .sort((a, b) => a - b)
        .join('-');
      return normalized === clean(puzzle.answer);
    }
  }
  return clean(rawAnswer) === clean(puzzle.answer);
}

/**
 * State-aware NPC & Witch dialogue builder.
 * Remembers conversation flags and never asks for objects already in inventory.
 */
export function buildControlledNpcDialogue(
  npcId: string,
  level: number,
  collectedItemIds: string[],
  memoryFlags: string[]
): NpcDialogueSession {
  const hasFlag = (f: string) => memoryFlags.includes(f);
  const hasItem = (id: string) => collectedItemIds.includes(id);

  if (npcId === 'npc_witch') {
    const metBefore = hasFlag('witch_met');
    const caughtLying = hasFlag('witch_caught_lie');
    const gaveRelic = hasFlag('witch_received_seal');

    let greeting =
      'Are you looking for the library? You should go upstairs... unless you want to disappear.';
    if (gaveRelic) {
      greeting =
        'You returned what belonged to the ashes. Even I will not stand in your doorway tonight—follow the stairs down, not up.';
    } else if (caughtLying) {
      greeting =
        'Careful, clever little mortal. You caught one contradiction, yet the hallways still twist when you blink.';
    } else if (metBefore && level >= 7) {
      greeting =
        'Back again? I saw someone carrying your key near the basement pipes... or perhaps it was behind the library stacks.';
    } else if (level >= 5) {
      greeting =
        'Take the left corridor. Or perhaps I should say the right one. Your friends are closer than you think.';
    }

    const options: NpcDialogueOption[] = [
      {
        id: 'witch_ask_way',
        label: 'Ask where the current level’s exit or key is hidden',
        setsMemoryFlag: 'witch_met',
        response:
          level <= 4
            ? 'You should not trust everything written on those walls. Try checking the dark corners of the Library—unless the Night Guard lied to you first.'
            : 'Take the left corridor toward the lockers... wait. Did I mean the Chemistry wing? Follow the flickering fluorescent light.',
        revealsLie:
          'Deception Detected: Her cadence shifts whenever she names a direction—her directional clue is intentionally inverted.',
      },
      {
        id: 'witch_request_task',
        label: 'Ask what she wants in exchange for the truth',
        hideIfMemoryFlag: 'witch_received_seal',
        setsMemoryFlag: 'witch_task_accepted',
        response: hasItem('relic_seal')
          ? 'You already carry the Brass School Seal in your pack! Offer it to me if you wish to hear why the bell still rings.'
          : 'Bring me the 1998 Brass School Seal hidden behind the library shelves, and I will tell you who locked the doors in 1998.',
      },
      {
        id: 'witch_give_seal',
        label: 'Hand over the Brass School Seal Relic',
        requiredItemId: 'relic_seal',
        hideIfMemoryFlag: 'witch_received_seal',
        setsMemoryFlag: 'witch_received_seal',
        response:
          'Cold brass... warm with old smoke. Listen well: the tragedy started in the Chemistry shaft in 1998, and the Principal sealed the vault before anyone escaped.',
      },
      {
        id: 'witch_confront_phuong',
        label: '[Phuong] Call out her bluff calmly and ask why she guards the hall',
        requiresCharacter: 'phuong',
        setsMemoryFlag: 'witch_caught_lie',
        disappearsAfter: level >= 7,
        response:
          level >= 7
            ? 'Tch... you see too clearly. Stay out of the ritual chamber if you value your shadow!'
            : 'Hah! You aren’t easily shaken, are you? Fine—do not trust the Silent Student in the East Wing; they imitate survivors.',
      },
    ];

    return {
      npcId: 'npc_witch',
      npcName: 'The Pale Witch',
      role: 'witch',
      greeting,
      emotionalRead:
        'Emotional Read (Phuong): She shifts seamlessly between genuine grief over 1998 and deliberate misdirection. Watch her eyes when she mentions corridors.',
      truthful: gaveRelic,
      options: filterOptions(options, collectedItemIds, memoryFlags),
    };
  }

  if (npcId === 'npc_deceptive_student') {
    const confronted = hasFlag('student_confronted');
    const greeting = confronted
      ? 'Don’t look at me like that... I only pointed you where the cold air came from.'
      : 'Wait—are you looking for the restricted records? The Principal threw every key down into the Courtyard playground!';

    const options: NpcDialogueOption[] = [
      {
        id: 'student_press',
        label: 'Compare their claim against the Principal’s Office notes',
        setsMemoryFlag: 'student_confronted',
        disappearsAfter: level >= 5,
        response:
          'Wait—no, maybe it was the Computer Room... you shouldn’t stay in one spot too long.',
        revealsLie:
          'Deception Detected: Completely false—keys and passwords are tied to the Principal’s archive and Computer Room, not the playground.',
      },
      {
        id: 'student_phuong',
        label: '[Phuong] Notice their frozen uniform & ask which class they attended',
        requiresCharacter: 'phuong',
        setsMemoryFlag: 'student_confronted',
        disappearsAfter: true,
        response:
          '...Class 1998. Nobody left that October.',
      },
    ];

    return {
      npcId: 'npc_deceptive_student',
      npcName: 'Lingering Student',
      role: 'student',
      greeting,
      emotionalRead:
        'Emotional Read (Phuong): Voice is flat and rehearsed—their uniform badge is dated October 1998. They are deliberately misleading you.',
      truthful: false,
      options: filterOptions(options, collectedItemIds, memoryFlags),
    };
  }

  if (npcId === 'npc_caretaker_echo') {
    const hasCourtyardKey = hasItem('key_courtyard');
    const greeting = hasCourtyardKey
      ? 'You already found the Courtyard Key... stay low if the fluorescent tubes begin to buzz.'
      : 'You shouldn’t be wandering the East Wing after midnight... Nobody left any keys in the Teacher Offices. Go back to the courtyard!';

    const options: NpcDialogueOption[] = [
      {
        id: 'ask_exit',
        label: 'Ask about the locked exits & electrical circuit',
        response: hasCourtyardKey
          ? 'Since you already hold the key, focus on restoring Breaker B on the reception circuit panel.'
          : 'The padlock jammed years ago. You won’t find a key anywhere near the desks.',
        revealsLie:
          'Deception Detected: He flinches when mentioning the Teacher Offices desks—the key IS inside the Teacher Offices.',
      },
      {
        id: 'phuong_tease',
        label: '[Phuong] Reassure him gently and crack a joke about the dark',
        requiresCharacter: 'phuong',
        setsMemoryFlag: 'guard_helped',
        response: hasCourtyardKey
          ? 'Haha, you already grabbed it! Good luck out there, kid.'
          : 'Heh... alright, kid. Fine—the key sits right on the Teacher Office desk, and Breaker B powers the corridor.',
      },
    ];

    return {
      npcId: 'npc_caretaker_echo',
      npcName: 'Stranded Night Guard',
      role: 'guard',
      greeting,
      emotionalRead:
        'Emotional Read (Phuong): Shallow breathing and nervous glances toward the Teacher Offices—he hides information out of fear.',
      truthful: false,
      options: filterOptions(options, collectedItemIds, memoryFlags),
    };
  }

  // Default: npc_librarian_shade
  const hasBookSwitch = hasFlag('library_switch_pulled');
  const greeting = hasBookSwitch
    ? 'The hidden shelf already slid open. Watch your step in the tunnels below.'
    : 'Keep your voice down between the stacks. The western wall slides when you arrange the archives and pull the tilted crimson ledger.';

  const options: NpcDialogueOption[] = [
    {
      id: 'ask_basement',
      label: 'Ask about the monsters & basement tunnels',
      response:
        'The Crawler in the labs hunts by footsteps and sprinting—crouch when it skitters close. The Hallway Stalker down in the basement follows bright flashlights.',
    },
    {
      id: 'phuong_comfort',
      label: '[Phuong] Ask how to verify who is telling the truth',
      requiresCharacter: 'phuong',
      response:
        'Compare every NPC story against physical notes. The Witch mixes truth with riddles, while the Silent Student always points toward dead ends.',
    },
  ];

  return {
    npcId: 'npc_librarian_shade',
    npcName: 'Archive Witness',
    role: 'archivist',
    greeting,
    emotionalRead:
      'Emotional Read (Phuong): Exhausted but sincere. Every detail she shares matches the physical logs.',
    truthful: true,
    options: filterOptions(options, collectedItemIds, memoryFlags),
  };
}

function filterOptions(
  options: NpcDialogueOption[],
  collectedItemIds: string[],
  memoryFlags: string[]
): NpcDialogueOption[] {
  return options.filter((opt) => {
    if (opt.hideIfMemoryFlag && memoryFlags.includes(opt.hideIfMemoryFlag)) return false;
    if (opt.requiresMemoryFlag && !memoryFlags.includes(opt.requiresMemoryFlag)) return false;
    if (opt.requiredItemId && !collectedItemIds.includes(opt.requiredItemId)) return false;
    return true;
  });
}
