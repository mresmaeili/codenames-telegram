import type { UpdateQuery } from "mongoose";

import { GameModel, type GameDocument } from "../models/game.model.js";
import type { Game } from "../../../shared/src/types/game.js";

export interface GameRepository {
  create(game: Partial<Game>): Promise<GameDocument>;
  findById(id: string): Promise<GameDocument | null>;
  findByRoomId(roomId: string): Promise<GameDocument | null>;
  update(
    id: string,
    update: UpdateQuery<GameDocument>,
  ): Promise<GameDocument | null>;
}

export const gameRepository: GameRepository = {
  async create(game) {
    return GameModel.create(game);
  },

  async findById(id) {
    return GameModel.findById(id).exec();
  },

  async findByRoomId(roomId) {
    return GameModel.findOne({ roomId }).exec();
  },

  async update(id, update) {
    return GameModel.findByIdAndUpdate(id, update, { new: true }).exec();
  },
};
