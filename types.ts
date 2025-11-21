export enum LocationId {
  Station = 'station',
  TownSquare = 'town_square',
  OldLibrary = 'old_library',
  Observatory = 'observatory',
  Forest = 'forest',
  MayasHouse = 'mayas_house',
}

export enum GamePhase {
  Start = 'start',
  Playing = 'playing',
  Puzzle = 'puzzle',
  Memory = 'memory',
  Ending = 'ending',
}

export interface Clue {
  id: string;
  name: string;
  description: string;
  discoveredAt: string; // timestamp or turn
}

export interface GameState {
  currentLocation: LocationId;
  inventory: string[];
  clues: Clue[];
  narrativeHistory: NarrativeEntry[];
  phase: GamePhase;
  trust: Record<string, number>; // Character name -> Trust level (0-100)
  puzzleActive?: PuzzleState;
}

export interface NarrativeEntry {
  id: string;
  speaker: 'System' | 'Alex' | 'Maya' | 'Silas' | 'Evelyn' | 'Jonas' | 'Whisperer' | string;
  text: string;
  type: 'description' | 'dialogue' | 'action' | 'memory';
  timestamp: number;
}

export interface PuzzleState {
  id: string;
  description: string;
  type: 'code' | 'logic';
  solved: boolean;
}

export interface ActionOption {
  label: string;
  actionType: 'move' | 'investigate' | 'talk' | 'custom';
  payload?: string;
}
