import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as salesApi from "../../../api/sales";
import type { CreateSaleInput } from "../../../api/sales";

export function useCreateSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSaleInput) => salesApi.createSale(input),
    // A sale deducts stock, so any cached stock views go stale too —
    // harmless no-op today (no stock UI yet) and correct once Inventory ships.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["stock"] });
    },
  });
}
