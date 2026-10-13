import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getProductsList } from "../endpoints/products/list_GET.schema";
import { postSaveProduct, InputType as SaveInput } from "../endpoints/admin/product_save_POST.schema";

// React Query hooks for the product catalog.
export const useProducts = {
  useList: (includeInactive = false) =>
    useQuery({
      queryKey: ["products", includeInactive],
      queryFn: () => getProductsList({ includeInactive }),
      placeholderData: (p) => p,
    }),
  useSave: () => {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: (input: SaveInput) => postSaveProduct(input),
      onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
    });
  },
};