import { useQuery } from "@tanstack/react-query";
import * as dashboardApi from "../../../api/dashboard";

export function useDashboardMetrics() {
  return useQuery({
    queryKey: ["dashboard", "metrics"],
    queryFn: dashboardApi.getDashboardMetrics,
  });
}
