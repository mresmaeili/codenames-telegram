import type { Game } from "../../../shared/src/types/game";
import type { Room } from "../../../shared/src/types/room";

import type {
  AppAction,
  AppUser,
  HostControlAction,
  LobbyUiState,
  PresenceStatus,
} from "./appReducer";

export function setAuthLoading(loading: boolean): AppAction {
  return { type: "AUTH_SET_LOADING", loading };
}

export function setAuthUser(user: AppUser | null): AppAction {
  return { type: "AUTH_SET_USER", user };
}

export function setAuthError(error: string | null): AppAction {
  return { type: "AUTH_SET_ERROR", error };
}

export function setSocketConnected(connected: boolean): AppAction {
  return { type: "SOCKET_SET_CONNECTED", connected };
}

export function setSocketReconnecting(reconnecting: boolean): AppAction {
  return { type: "SOCKET_SET_RECONNECTING", reconnecting };
}

export function setRoomCode(code: string | null): AppAction {
  return { type: "ROOM_SET_CODE", code };
}

export function setRoomLoading(loading: boolean): AppAction {
  return { type: "ROOM_SET_LOADING", loading };
}

export function setRoomError(error: string | null): AppAction {
  return { type: "ROOM_SET_ERROR", error };
}

export function setRoomData(room: Room | null): AppAction {
  return { type: "ROOM_SET_DATA", room };
}

export function setRoomPresence(
  presence: Record<number, PresenceStatus>,
): AppAction {
  return { type: "ROOM_SET_PRESENCE", presence };
}

export function setGameLoading(loading: boolean): AppAction {
  return { type: "GAME_SET_LOADING", loading };
}

export function setGameError(error: string | null): AppAction {
  return { type: "GAME_SET_ERROR", error };
}

export function setGameData(game: Game | null): AppAction {
  return { type: "GAME_SET_DATA", game };
}

export function setGameLastAction(action: string | null): AppAction {
  return { type: "GAME_SET_LAST_ACTION", action };
}

export function setLobbyStarting(starting: boolean): AppAction {
  return { type: "LOBBY_SET_STARTING", starting };
}

export function setLobbyHostActionPending(pending: boolean): AppAction {
  return { type: "LOBBY_SET_HOST_ACTION_PENDING", pending };
}

export function setLobbyPendingAssignment(
  assignment: LobbyUiState["pendingAssignment"],
): AppAction {
  return { type: "LOBBY_SET_PENDING_ASSIGNMENT", assignment };
}

export function setLobbySettingsPopup(
  action: HostControlAction | null,
): AppAction {
  return { type: "LOBBY_SET_SETTINGS_POPUP", action };
}

export function setGameHintSubmitting(submitting: boolean): AppAction {
  return { type: "GAME_UI_SET_HINT_SUBMITTING", submitting };
}

export function setGameHintMessage(message: string | null): AppAction {
  return { type: "GAME_UI_SET_HINT_MESSAGE", message };
}

export function setGameReconnecting(reconnecting: boolean): AppAction {
  return { type: "GAME_UI_SET_RECONNECTING", reconnecting };
}

export function setGameRefreshing(refreshing: boolean): AppAction {
  return { type: "GAME_UI_SET_REFRESHING", refreshing };
}

export function setGameJoinedRoom(joined: boolean): AppAction {
  return { type: "GAME_UI_SET_JOINED_ROOM", joined };
}
