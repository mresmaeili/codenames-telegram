import type { UpdateQuery } from "mongoose";

import { RoomModel, type RoomDocument } from "../models/room.model.js";
import type { Room } from "../../../shared/src/types/room.js";

export interface RoomRepository {
  create(room: Partial<Room>): Promise<RoomDocument>;
  findById(id: string): Promise<RoomDocument | null>;
  findByCode(roomCode: string): Promise<RoomDocument | null>;
  findAll(): Promise<RoomDocument[]>;
  update(
    id: string,
    update: UpdateQuery<RoomDocument>,
  ): Promise<RoomDocument | null>;
  delete(id: string): Promise<boolean>;
}

export const roomRepository: RoomRepository = {
  async create(room) {
    return RoomModel.create(room);
  },

  async findById(id) {
    return RoomModel.findById(id).exec();
  },

  async findByCode(roomCode) {
    return RoomModel.findOne({ roomCode }).exec();
  },

  async findAll() {
    return RoomModel.find().exec();
  },

  async update(id, update) {
    return RoomModel.findByIdAndUpdate(id, update, { new: true }).exec();
  },

  async delete(id) {
    const result = await RoomModel.deleteOne({ _id: id }).exec();
    return result.deletedCount > 0;
  },
};
