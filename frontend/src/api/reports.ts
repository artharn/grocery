import { apiFetch } from "./client";
import type { ProductsReport, SalesReport } from "../types/api";

export const getSalesReport = (startDate: string, endDate: string) =>
  apiFetch<SalesReport>(`/reports/sales?startDate=${startDate}&endDate=${endDate}`);

export const getProductsReport = (startDate: string, endDate: string) =>
  apiFetch<ProductsReport>(`/reports/products?startDate=${startDate}&endDate=${endDate}`);
