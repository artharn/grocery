import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as productsApi from "../../../api/products";
import type { CreateProductInput, UpdateProductInput } from "../../../api/products";

// Only the Products feature's own pages (ProductList, ProductForm) mutate
// products — Inventory and Sales only ever read the list (see the shared
// useProducts in src/hooks/), so these stay feature-owned.
export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProductInput) => productsApi.createProduct(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useUpdateProduct(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProductInput) => productsApi.updateProduct(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => productsApi.deleteProduct(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });
}
