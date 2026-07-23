import { useQuery } from "@tanstack/react-query";
import * as productsApi from "../api/products";

// Shared at the top level, not under features/products/, because the
// product list is read by three features (Products, Inventory, Sales) —
// per fe-standard.md §1, anything used by 2+ features is promoted out of
// a single feature folder rather than creating a cross-feature import.
export const productsKey = (includeInactive: boolean) =>
  ["products", { includeInactive }] as const;

export function useProducts(includeInactive: boolean) {
  return useQuery({
    queryKey: productsKey(includeInactive),
    queryFn: () => productsApi.listProducts(includeInactive),
    select: (data) => data.products,
  });
}
