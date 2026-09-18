import type { Game } from "../../../shared/src/types/game";
import type { Room } from "../../../shared/src/types/room";

export type PresenceStatus = "online" | "offline" | "away";
export type HostControlAction = "timer" | "word-pack" | "theme";

export interface LobbyUiState {
  starting: boolean;
  hostActionPending: boolean;
  pendingAssignment: {
    team: "blue" | "red";
    role: "operative" | "spymaster";
  } | null;
  settingsPopupAction: HostControlAction | null;
}

export interface GameUiState {
  hintSubmitting: boolean;
  hintMessage: string | null;
  reconnecting: boolean;
  refreshing: boolean;
  hasJoinedRoom: boolean;
}

export interface AppUser {
  telegramId: number;
  username: string | null;
  firstName: string;
  lastName: string | null;
  photoUrl: string | null;
  languageCode: string | null;
  lastLoginAt: string;
  createdAt: string;
  updatedAt: string;
  avatarId?: string | null;
}

export interface AppState {
  auth: {
    user: AppUser | null;
    loading: boolean;
    error: string | null;
  };
  socket: {
    connected: boolean;
    reconnecting: boolean;
  };
  room: {
    code: string | null;
    data: Room | null;
    loading: boolean;
    error: string | null;
    presence: Record<number, PresenceStatus>;
  };
  game: {
    data: Game | null;
    loading: boolean;
    error: string | null;
    lastAction: string | null;
  };
  ui: {
    lobby: LobbyUiState;
    game: GameUiState;
  };
}

export type AppAction =
  | { type: "AUTH_SET_LOADING"; loading: boolean }
  | { type: "AUTH_SET_USER"; user: AppUser | null }
  | { type: "AUTH_SET_ERROR"; error: string | null }
  | { type: "SOCKET_SET_CONNECTED"; connected: boolean }
  | { type: "SOCKET_SET_RECONNECTING"; reconnecting: boolean }
  | { type: "ROOM_SET_CODE"; code: string | null }
  | { type: "ROOM_SET_LOADING"; loading: boolean }
  | { type: "ROOM_SET_ERROR"; error: string | null }
  | { type: "ROOM_SET_DATA"; room: Room | null }
  | { type: "ROOM_SET_PRESENCE"; presence: Record<number, PresenceStatus> }
  | { type: "GAME_SET_LOADING"; loading: boolean }
  | { type: "GAME_SET_ERROR"; error: string | null }
  | { type: "GAME_SET_DATA"; game: Game | null }
  | { type: "GAME_SET_LAST_ACTION"; action: string | null }
  | { type: "LOBBY_SET_STARTING"; starting: boolean }
  | { type: "LOBBY_SET_HOST_ACTION_PENDING"; pending: boolean }
  | {
      type: "LOBBY_SET_PENDING_ASSIGNMENT";
      assignment: LobbyUiState["pendingAssignment"];
    }
  | { type: "LOBBY_SET_SETTINGS_POPUP"; action: HostControlAction | null }
  | { type: "GAME_UI_SET_HINT_SUBMITTING"; submitting: boolean }
  | { type: "GAME_UI_SET_HINT_MESSAGE"; message: string | null }
  | { type: "GAME_UI_SET_RECONNECTING"; reconnecting: boolean }
  | { type: "GAME_UI_SET_REFRESHING"; refreshing: boolean }
  | { type: "GAME_UI_SET_JOINED_ROOM"; joined: boolean };

export const initialAppState: AppState = {
  auth: {
    user: null,
    loading: true,
    error: null,
  },
  socket: {
    connected: false,
    reconnecting: false,
  },
  room: {
    code: null,
    data: null,
    loading: false,
    error: null,
    presence: {},
  },
  game: {
    data: null,
    loading: false,
    error: null,
    lastAction: null,
  },
  ui: {
    lobby: {
      starting: false,
      hostActionPending: false,
      pendingAssignment: null,
      settingsPopupAction: null,
    },
    game: {
      hintSubmitting: false,
      hintMessage: null,
      reconnecting: false,
      refreshing: false,
      hasJoinedRoom: false,
    },
  },
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "AUTH_SET_LOADING":
      return {
        ...state,
        auth: { ...state.auth, loading: action.loading },
      };

    case "AUTH_SET_USER":
      return {
        ...state,
        auth: { ...state.auth, user: action.user, error: null },
      };

    case "AUTH_SET_ERROR":
      return {
        ...state,
        auth: { ...state.auth, error: action.error },
      };

    case "SOCKET_SET_CONNECTED":
      return {
        ...state,
        socket: { ...state.socket, connected: action.connected },
      };

    case "SOCKET_SET_RECONNECTING":
      return {
        ...state,
        socket: { ...state.socket, reconnecting: action.reconnecting },
      };

    case "ROOM_SET_CODE":
      return {
        ...state,
        room: { ...state.room, code: action.code },
      };

    case "ROOM_SET_LOADING":
      return {
        ...state,
        room: { ...state.room, loading: action.loading },
      };

    case "ROOM_SET_ERROR":
      return {
        ...state,
        room: { ...state.room, error: action.error },
      };

    case "ROOM_SET_DATA":
      return {
        ...state,
        room: {
          ...state.room,
          data: action.room,
          loading: false,
          error: null,
        },
      };

    case "ROOM_SET_PRESENCE":
      return {
        ...state,
        room: {
          ...state.room,
          presence: action.presence,
        },
      };

    case "GAME_SET_LOADING":
      return {
        ...state,
        game: { ...state.game, loading: action.loading },
      };

    case "GAME_SET_ERROR":
      return {
        ...state,
        game: { ...state.game, error: action.error },
      };

    case "GAME_SET_DATA":
      return {
        ...state,
        game: {
          ...state.game,
          data: action.game,
          loading: false,
          error: null,
        },
      };

    case "GAME_SET_LAST_ACTION":
      return {
        ...state,
        game: {
          ...state.game,
          lastAction: action.action,
        },
      };

    case "LOBBY_SET_STARTING":
      return {
        ...state,
        ui: {
          ...state.ui,
          lobby: { ...state.ui.lobby, starting: action.starting },
        },
      };

    case "LOBBY_SET_HOST_ACTION_PENDING":
      return {
        ...state,
        ui: {
          ...state.ui,
          lobby: { ...state.ui.lobby, hostActionPending: action.pending },
        },
      };

    case "LOBBY_SET_PENDING_ASSIGNMENT":
      return {
        ...state,
        ui: {
          ...state.ui,
          lobby: { ...state.ui.lobby, pendingAssignment: action.assignment },
        },
      };

    case "LOBBY_SET_SETTINGS_POPUP":
      return {
        ...state,
        ui: {
          ...state.ui,
          lobby: { ...state.ui.lobby, settingsPopupAction: action.action },
        },
      };

    case "GAME_UI_SET_HINT_SUBMITTING":
      return {
        ...state,
        ui: {
          ...state.ui,
          game: { ...state.ui.game, hintSubmitting: action.submitting },
        },
      };

    case "GAME_UI_SET_HINT_MESSAGE":
      return {
        ...state,
        ui: {
          ...state.ui,
          game: { ...state.ui.game, hintMessage: action.message },
        },
      };

    case "GAME_UI_SET_RECONNECTING":
      return {
        ...state,
        ui: {
          ...state.ui,
          game: { ...state.ui.game, reconnecting: action.reconnecting },
        },
      };

    case "GAME_UI_SET_REFRESHING":
      return {
        ...state,
        ui: {
          ...state.ui,
          game: { ...state.ui.game, refreshing: action.refreshing },
        },
      };

    case "GAME_UI_SET_JOINED_ROOM":
      return {
        ...state,
        ui: {
          ...state.ui,
          game: { ...state.ui.game, hasJoinedRoom: action.joined },
        },
      };

    default:
      return state;
  }
}
