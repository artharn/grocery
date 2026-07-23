import { apiFetch } from "./client";
import type { Product } from "../types/api";

export interface CreateProductInput {
  name: string;
  price: number;
  barcode?: string;
  cost?: number;
  image_url?: string;
}

export type UpdateProductInput = Partial<CreateProductInput>;

export const listProducts = (includeInactive = false) =>
  apiFetch<{ products: Product[] }>(
    `/products${includeInactive ? "?includeInactive=true" : ""}`
  );

export const getProduct = (id: number) => apiFetch<{ product: Product }>(`/products/${id}`);

export const createProduct = (input: CreateProductInput) =>
  apiFetch<{ product: Product }>("/products", { method: "POST", body: input });

export const updateProduct = (id: number, input: UpdateProductInput) =>
  apiFetch<{ product: Product }>(`/products/${id}`, { method: "PUT", body: input });

export const deleteProduct = (id: number) =>
  apiFetch<{ product: Product }>(`/products/${id}`, { method: "DELETE" });
