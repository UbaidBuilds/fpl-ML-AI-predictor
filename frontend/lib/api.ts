import axios from "axios";
import type {
  Player,
  PaginatedResponse,
  AuthResponse,
  User,
  PredictionApiResponse,
  PlayerQueryParams,
  TeamAnalyzerResponse,
  PlayerFixturesResponse,
  GameweekFixturesResponse,
  TransferSuggestionsResponse,
  TransferSuggestRequest,
  MyTeamResponse,
} from "./types";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export const authApi = {
  register: (data: {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
  }) => api.post<AuthResponse>("/register", data),

  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>("/login", data),

  logout: () => api.post<{ message: string }>("/logout"),

  getUser: () => api.get<User>("/user"),
};

export const playerApi = {
  getAll: (params?: PlayerQueryParams) =>
    api.get<PaginatedResponse<Player>>("/players", { params }),

  getById: (id: number) => api.get<Player>(`/players/${id}`),

  getPrediction: (playerId: number) =>
    api.get<PredictionApiResponse>(`/players/${playerId}/prediction`),
};

export const teamAnalyzerApi = {
  analyze: (fplTeamId: number) =>
    api.post<TeamAnalyzerResponse>("/team-analyzer", {
      fpl_team_id: fplTeamId,
    }),
};

export const fixtureApi = {
  getPlayerFixtures: (playerId: number) =>
    api.get<PlayerFixturesResponse>(`/players/${playerId}/fixtures`),

  getByGameweek: (gameweek?: number) =>
    api.get<GameweekFixturesResponse>("/fixtures", {
      params: gameweek ? { gameweek } : {},
    }),
};

export const transferApi = {
  suggest: (params: TransferSuggestRequest) =>
    api.post<TransferSuggestionsResponse>("/transfers/suggest", params),
};

export const myTeamApi = {
  load: (fplTeamId: number) =>
    api.post<MyTeamResponse>("/my-team", {
      fpl_team_id: fplTeamId,
    }),
};

export default api;
