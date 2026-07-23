import { useQuery } from "@tanstack/react-query";
import * as reportsApi from "../../../api/reports";

export function useSalesReport(startDate: string, endDate: string, enabled: boolean) {
  return useQuery({
    queryKey: ["reports", "sales", startDate, endDate],
    queryFn: () => reportsApi.getSalesReport(startDate, endDate),
    enabled,
  });
}

export function useProductsReport(startDate: string, endDate: string, enabled: boolean) {
  return useQuery({
    queryKey: ["reports", "products", startDate, endDate],
    queryFn: () => reportsApi.getProductsReport(startDate, endDate),
    enabled,
  });
}
