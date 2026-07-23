import { apiFetch } from "./client";
import type { DashboardMetrics } from "../types/api";

export const getDashboardMetrics = () => apiFetch<DashboardMetrics>("/dashboard/metrics");
