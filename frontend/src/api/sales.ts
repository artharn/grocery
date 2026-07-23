import { apiFetch } from "./client";
import type { Sale, SaleItem } from "../types/api";

export interface CreateSaleInput {
  items: { productId: number; quantity: number }[];
}

export interface CreateSaleResult {
  sale: Sale;
  items: SaleItem[];
}

export const createSale = (input: CreateSaleInput) =>
  apiFetch<CreateSaleResult>("/sales", { method: "POST", body: input });

export const listSales = () => apiFetch<{ sales: Sale[] }>("/sales");

export const getSale = (id: number) => apiFetch<{ sale: Sale }>(`/sales/${id}`);
