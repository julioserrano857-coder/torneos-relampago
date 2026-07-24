// Bracket generation algorithm for single elimination tournaments
// Handles non-power-of-2 team counts with byes

export function calculateRounds(teamCount: number): number {
  if (teamCount <= 1) return 0
  return Math.ceil(Math.log2(teamCount))
}

export function nextPowerOf2(n: number): number {
  if (n <= 0) return 1
  return Math.pow(2, Math.ceil(Math.log2(n)))
}

export function calculateByes(teamCount: number): number {
  const nextP2 = nextPowerOf2(teamCount)
  return nextP2 - teamCount
}

export interface BracketSlot {
  position: number // 0-indexed position in the bracket
  homeSeed: number | null // seed number (1-based), null = bye/TBD
  awaySeed: number | null
  isBye: boolean // true if one team gets a bye (auto-advance)
}

/**
 * Generate the initial bracket layout for a single elimination tournament.
 * Uses standard seeding: 1v(n), 2v(n-1), etc. with byes for top seeds.
 */
export function generateBracketSeeds(teamCount: number): BracketSlot[] {
  const totalSlots = nextPowerOf2(teamCount)
  const firstRoundMatchCount = totalSlots / 2
  const byes = calculateByes(teamCount)

  // Generate standard seeding order
  const seeds: number[] = []
  for (let i = 1; i <= teamCount; i++) {
    seeds.push(i)
  }

  // Standard bracket placement: 1 vs n, 2 vs n-1, etc.
  const slots: BracketSlot[] = []
  for (let i = 0; i < firstRoundMatchCount; i++) {
    const topSeed = i + 1
    const bottomSeed = teamCount - i

    const slot: BracketSlot = {
      position: i,
      homeSeed: topSeed,
      awaySeed: bottomSeed > topSeed ? bottomSeed : null,
      isBye: false,
    }

    // If bottom seed doesn't exist (odd number scenario), this is a bye
    if (bottomSeed <= topSeed || bottomSeed > teamCount) {
      slot.awaySeed = null
      slot.isBye = true
    }

    slots.push(slot)
  }

  // Assign byes to top-seeded players (those facing the lowest seeds that don't exist)
  // Actually, re-seed properly: top seeds get byes
  if (byes > 0) {
    // Reconstruct bracket with byes for top seeds
    const reconstructedSlots: BracketSlot[] = []

    // Top seeds (1 through byes) get byes
    // Remaining seeds fill the first round
    const byeSeeds: number[] = []
    const playingSeeds: number[] = []

    for (let i = 1; i <= teamCount; i++) {
      if (i <= byes) {
        byeSeeds.push(i)
      } else {
        playingSeeds.push(i)
      }
    }

    // First: all bye slots (home seed gets auto-advance, no opponent)
    for (let i = 0; i < byeSeeds.length; i++) {
      reconstructedSlots.push({
        position: i,
        homeSeed: byeSeeds[i],
        awaySeed: null,
        isBye: true,
      })
    }

    // Then: playing seeds in standard bracket order
    const playingMatchCount = firstRoundMatchCount - byes
    for (let i = 0; i < playingMatchCount; i++) {
      reconstructedSlots.push({
        position: byeSeeds.length + i,
        homeSeed: playingSeeds[i],
        awaySeed: playingSeeds[playingSeeds.length - 1 - i],
        isBye: false,
      })
    }

    return reconstructedSlots
  }

  return slots
}

/**
 * Generate all rounds of matches for a tournament.
 * Returns match definitions for each round.
 */
export function generateTournamentMatches(teamCount: number) {
  const rounds: { roundNumber: number; matchCount: number }[] = []
  const totalRounds = calculateRounds(teamCount)
  let currentMatchCount = nextPowerOf2(teamCount) / 2

  for (let r = 1; r <= totalRounds; r++) {
    rounds.push({
      roundNumber: r,
      matchCount: currentMatchCount,
    })
    currentMatchCount = Math.ceil(currentMatchCount / 2)
  }

  return rounds
}

/**
 * Get the round name based on round number and total rounds
 */
export function getRoundName(roundNumber: number, totalRounds: number): string {
  if (roundNumber === totalRounds) return 'Final'
  if (roundNumber === totalRounds - 1) return 'Semifinal'
  if (roundNumber === totalRounds - 2) return 'Cuartos de Final'
  if (roundNumber === totalRounds - 3) return 'Octavos de Final'
  return `Ronda ${roundNumber}`
}

/**
 * Find which matches in a round should be byes
 */
export function assignByesToMatches(
  matches: { round: number; matchNumber: number }[],
  teamCount: number,
  byes: number
): Set<number> {
  // Top seeds get byes - they are seeds 1 through `byes`
  // These are placed at the top of the bracket
  const byePositions = new Set<number>()
  for (let i = 0; i < byes; i++) {
    byePositions.add(i)
  }
  return byePositions
}
