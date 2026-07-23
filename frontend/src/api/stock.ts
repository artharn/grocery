import { apiFetch } from "./client";
import type { StockBalance, StockTransaction } from "../types/api";

export interface CreateStockTransactionInput {
  type: "IN" | "OUT" | "ADJUST";
  quantity: number;
  note?: string;
}

export const getStockBalance = (productId: number) =>
  apiFetch<StockBalance>(`/products/${productId}/stock`);

export const listStockTransactions = (productId: number) =>
  apiFetch<{ transactions: StockTransaction[] }>(`/products/${productId}/stock-transactions`);

export const createStockTransaction = (productId: number, input: CreateStockTransactionInput) =>
  apiFetch<{ transaction: StockTransaction; balance: number }>(
    `/products/${productId}/stock-transactions`,
    { method: "POST", body: input }
  );
