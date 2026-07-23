import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as stockApi from "../../../api/stock";
import type { CreateStockTransactionInput } from "../../../api/stock";

const balanceKey = (productId: number) => ["stock", "balance", productId] as const;
const transactionsKey = (productId: number) => ["stock", "transactions", productId] as const;

export function useStockBalance(productId: number | null) {
  return useQuery({
    queryKey: balanceKey(productId ?? -1),
    queryFn: () => stockApi.getStockBalance(productId as number),
    enabled: productId !== null,
  });
}

export function useStockTransactions(productId: number | null) {
  return useQuery({
    queryKey: transactionsKey(productId ?? -1),
    queryFn: () => stockApi.listStockTransactions(productId as number),
    select: (data) => data.transactions,
    enabled: productId !== null,
  });
}

export function useCreateStockTransaction(productId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateStockTransactionInput) =>
      stockApi.createStockTransaction(productId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: balanceKey(productId) });
      queryClient.invalidateQueries({ queryKey: transactionsKey(productId) });
    },
  });
}
