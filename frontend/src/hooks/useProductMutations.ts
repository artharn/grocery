import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as productsApi from "../api/products";
import type { CreateProductInput, UpdateProductInput } from "../api/products";

// Shared at the top level, not under features/products/ — Sales and
// Inventory also create products now (the "not found while scanning"
// quick-create flow), not just the Products feature's own pages. Same
// promote-once-used-by-2+-features rule as the shared useProducts query.
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
