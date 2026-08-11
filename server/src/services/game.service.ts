import type {
  Card,
  CardColor,
  Game,
  GameCompletionReason,
  GameStatus,
  GameView,
  HintEntry,
  PublicCard,
  SpymasterCard,
  Turn,
} from "../../../shared/src/types/game.js";
import { RoomModel } from "../models/room.model.js";
import type { RoomDocument } from "../models/room.model.js";
import type { RoomStatus } from "../../../shared/src/types/room.js";
import type { GameDocument } from "../models/game.model.js";
import { gameRepository } from "../repositories/game.repository.js";
import { getWordPoolForGame } from "./word.service.js";

interface CreateGameInput {
  roomCode: string;
}

interface CreateGameResult {
  game: GameDocument;
  room: RoomDocument;
}

const BOARD_SIZE = 25;
const STARTING_TEAM_CARD_COUNT = 9;
const OTHER_TEAM_CARD_COUNT = 8;
const OTHER_CARD_COUNT = 7;
const ASSASSIN_CARD_COUNT = 1;

function createStartingTeam(): Turn {
  return Math.random() < 0.5 ? "red" : "blue";
}

function buildCardColors(startingTeam: Turn): CardColor[] {
  const colors: CardColor[] = [];

  for (let index = 0; index < STARTING_TEAM_CARD_COUNT; index += 1) {
    colors.push(startingTeam);
  }

  for (let index = 0; index < OTHER_TEAM_CARD_COUNT; index += 1) {
    colors.push(startingTeam === "red" ? "blue" : "red");
  }

  for (let index = 0; index < OTHER_CARD_COUNT; index += 1) {
    colors.push("neutral");
  }

  for (let index = 0; index < ASSASSIN_CARD_COUNT; index += 1) {
    colors.push("assassin");
  }

  return colors;
}

function shuffleCards<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }
  return shuffled;
}

export function buildGameBoard(words: string[], startingTeam: Turn): Card[] {
  const colors = buildCardColors(startingTeam);
  const shuffledColors = shuffleCards(colors);
  const shuffledWords = shuffleCards(words);

  return shuffledWords.slice(0, BOARD_SIZE).map((word, index) => ({
    word,
    color: shuffledColors[index] ?? null,
    revealed: false,
  }));
}

export function buildGameView(input: {
  id?: string;
  roomId: string;
  status: GameStatus;
  board: Card[];
  startingTeam: Turn;
  currentTurn: Turn;
  remainingGuesses: number;
  currentHintWord: string | null;
  currentHintNumber: number | null;
  hintSubmittedAt: Date | null;
  hintHistory: HintEntry[];
  selectedCardId: string | null;
  selectedByPlayerId: string | null;
  selectedAt: Date | null;
  winningTeam: Turn | null;
  completionReason: GameCompletionReason | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  role: "operative" | "spymaster";
}): GameView {
  const base = {
    id: input.id,
    roomId: input.roomId,
    status: input.status,
    startingTeam: input.startingTeam,
    currentTurn: input.currentTurn,
    remainingGuesses: input.remainingGuesses,
    currentHintWord: input.currentHintWord,
    currentHintNumber: input.currentHintNumber,
    hintSubmittedAt: input.hintSubmittedAt,
    hintHistory: input.hintHistory,
    selectedCardId: input.selectedCardId,
    selectedByPlayerId: input.selectedByPlayerId,
    selectedAt: input.selectedAt,
    winningTeam: input.winningTeam,
    completionReason: input.completionReason,
    completedAt: input.completedAt,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };

  if (input.role === "spymaster") {
    return {
      ...base,
      role: "spymaster",
      board: input.board.map(
        (card): SpymasterCard => ({
          word: card.word,
          color: card.color ?? "neutral",
          revealed: card.revealed,
        }),
      ),
    };
  }

  return {
    ...base,
    role: "operative",
    board: input.board.map(
      (card): PublicCard => ({
        word: card.word,
        revealed: card.revealed,
        color: card.revealed ? (card.color ?? null) : null,
      }),
    ),
  };
}

export async function getGameByRoomCode(
  roomCode: string,
  viewerTelegramId?: number,
): Promise<GameView | null> {
  const room = await RoomModel.findOne({
    roomCode: roomCode.toUpperCase(),
  }).exec();

  if (!room) {
    return null;
  }

  const viewerRole =
    viewerTelegramId !== undefined
      ? (room.players.find((player) => player.telegramId === viewerTelegramId)
          ?.role ?? "operative")
      : "operative";

  const game = await gameRepository.findByRoomId(room._id.toString());
  if (!game) {
    return null;
  }

  return buildGameView({
    id: game._id?.toString(),
    roomId: game.roomId,
    status: game.status,
    board: game.board,
    startingTeam: game.startingTeam,
    currentTurn: game.currentTurn,
    remainingGuesses: game.remainingGuesses,
    currentHintWord: game.currentHintWord ?? null,
    currentHintNumber: game.currentHintNumber ?? null,
    hintSubmittedAt: game.hintSubmittedAt ?? null,
    hintHistory: game.hintHistory ?? [],
    selectedCardId: game.selectedCardId ?? null,
    selectedByPlayerId: game.selectedByPlayerId ?? null,
    selectedAt: game.selectedAt ?? null,
    winningTeam: game.winningTeam ?? null,
    completionReason: game.completionReason ?? null,
    completedAt: game.completedAt ?? null,
    createdAt: game.createdAt,
    updatedAt: game.updatedAt,
    role: viewerRole,
  });
}

export async function createGame(
  input: CreateGameInput,
): Promise<CreateGameResult> {
  const room = await RoomModel.findOne({
    roomCode: input.roomCode.toUpperCase(),
  }).exec();
  if (!room) {
    throw new Error("Room not found.");
  }

  const startingTeam = createStartingTeam();
  const words = await getWordPoolForGame(room.settings.language ?? "fa");
  if (words.length < BOARD_SIZE) {
    throw new Error("Not enough words available for the requested game board.");
  }

  const selectedWords = shuffleCards(words).slice(0, BOARD_SIZE);
  const board = buildGameBoard(selectedWords, startingTeam);

  const existingGame = await gameRepository.findByRoomId(room._id.toString());
  if (existingGame) {
    return { game: existingGame, room };
  }

  const gamePayload: Partial<Game> = {
    roomId: room._id.toString(),
    status: "active" as GameStatus,
    board,
    startingTeam,
    currentTurn: startingTeam,
    remainingGuesses: 0,
    currentHintWord: null,
    currentHintNumber: null,
    hintSubmittedAt: null,
    hintHistory: [],
    selectedCardId: null,
    selectedByPlayerId: null,
    selectedAt: null,
    winningTeam: null,
    completionReason: null,
    completedAt: null,
  };

  const game = await gameRepository.create(gamePayload);
  room.status = "playing" as RoomStatus;
  await room.save();

  return { game, room };
}
