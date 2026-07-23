import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import type { Product } from "../../../types/api";
import { useCreateProduct, useUpdateProduct } from "../hooks/useProductMutations";
import { ApiError } from "../../../api/client";
import BarcodeInput from "../../../components/BarcodeInput";
import ProductThumbnail from "../../../components/ProductThumbnail";

interface ProductFormProps {
  product?: Product; // undefined = create mode
  onClose: () => void;
}

export default function ProductForm({ product, onClose }: ProductFormProps) {
  const { t } = useTranslation();
  const isEdit = !!product;

  const [name, setName] = useState(product?.name ?? "");
  const [price, setPrice] = useState(product?.price ?? "");
  const [cost, setCost] = useState(product?.cost ?? "");
  const [barcode, setBarcode] = useState(product?.barcode ?? "");
  const [imageUrl, setImageUrl] = useState(product?.image_url ?? "");
  const [validationError, setValidationError] = useState<string | null>(null);

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct(product?.id ?? -1);
  const mutation = isEdit ? updateProduct : createProduct;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setValidationError(null);

    const trimmedName = name.trim();
    const priceNumber = Number(price);
    const costNumber = cost === "" ? undefined : Number(cost);

    // Client-side validation mirrors the backend's rules so obviously
    // invalid input never round-trips — the backend's own message is
    // still shown verbatim below for anything it rejects anyway.
    if (!trimmedName) {
      setValidationError(t("productForm.nameRequired"));
      return;
    }
    if (price === "" || Number.isNaN(priceNumber) || priceNumber < 0) {
      setValidationError(t("productForm.priceInvalid"));
      return;
    }
    if (cost !== "" && (Number.isNaN(costNumber) || (costNumber as number) < 0)) {
      setValidationError(t("productForm.costInvalid"));
      return;
    }

    const payload = {
      name: trimmedName,
      price: priceNumber,
      barcode: barcode.trim() === "" ? undefined : barcode.trim(),
      cost: costNumber,
      image_url: imageUrl.trim() === "" ? undefined : imageUrl.trim(),
    };

    mutation.mutate(payload, { onSuccess: onClose });
  };

  const apiError = mutation.error instanceof ApiError ? mutation.error.message : null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">
          {isEdit ? t("productForm.editTitle", { name: product.name }) : t("productForm.newTitle")}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t("productForm.name")}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t("productForm.barcode")}
            </label>
            <BarcodeInput value={barcode} onChange={setBarcode} placeholder={t("common.optional")} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t("productForm.imageUrl")}
            </label>
            <div className="flex items-center gap-2">
              <ProductThumbnail
                imageUrl={imageUrl.trim() || null}
                alt={t("productForm.imagePreviewAlt")}
                size="md"
              />
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder={t("productForm.imageUrlPlaceholder")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t("productForm.price")}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t("productForm.cost")}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder={t("common.optional")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {(validationError || apiError) && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {validationError ?? apiError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {mutation.isPending
                ? t("productForm.saving")
                : isEdit
                  ? t("productForm.saveChanges")
                  : t("productForm.createProduct")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
