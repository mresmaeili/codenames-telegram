export type CardColor = "red" | "blue" | "neutral" | "assassin";
export type GameStatus = "active" | "finished";
export type Turn = "red" | "blue";
export type GameCompletionReason =
  | "all-red-cards-revealed"
  | "all-blue-cards-revealed"
  | "assassin-revealed";

export interface Card {
  word: string;
  color: CardColor | null;
  revealed: boolean;
}

export interface HintEntry {
  word: string;
  number: number;
  team: Turn;
  submittedAt: Date;
}

export interface PublicCard {
  word: string;
  revealed: boolean;
  color: CardColor | null;
}

export interface SpymasterCard extends PublicCard {
  color: CardColor;
}

export interface Game {
  id?: string;
  roomId: string;
  status: GameStatus;
  board: Card[];
  startingTeam: Turn;
  currentTurn: Turn;
  remainingGuesses: number;
  redCardsRemaining: number;
  blueCardsRemaining: number;
  currentHintWord: string | null;
  currentHintNumber: number | null;
  hintSubmittedAt: Date | null;
  turnStartedAt?: Date | null;
  hintHistory: HintEntry[];
  selectedCardId: string | null;
  selectedByPlayerId: string | null;
  selectedAt: Date | null;
  winningTeam?: Turn | null;
  completionReason?: GameCompletionReason | null;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GameViewBase {
  id?: string;
  roomId: string;
  status: GameStatus;
  board: PublicCard[] | SpymasterCard[];
  startingTeam: Turn;
  currentTurn: Turn;
  remainingGuesses: number;
  redCardsRemaining: number;
  blueCardsRemaining: number;
  currentHintWord: string | null;
  currentHintNumber: number | null;
  hintSubmittedAt: Date | null;
  turnStartedAt?: Date | null;
  hintHistory: HintEntry[];
  selectedCardId: string | null;
  selectedByPlayerId: string | null;
  selectedAt: Date | null;
  winningTeam?: Turn | null;
  completionReason?: GameCompletionReason | null;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  role: "operative" | "spymaster";
}

export interface OperativeGameView extends GameViewBase {
  board: PublicCard[];
  role: "operative";
}

export interface SpymasterGameView extends GameViewBase {
  board: SpymasterCard[];
  role: "spymaster";
}

export type GameView = OperativeGameView | SpymasterGameView;
