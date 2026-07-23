import { apiFetch } from "./client";
import type { LoginResponse, User } from "../types/api";

export const login = (username: string, password: string) =>
  apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: { username, password },
    auth: false,
  });

export const getMe = () => apiFetch<{ user: User }>("/auth/me");
