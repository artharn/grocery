import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Product } from "../../../types/api";
import { useProducts } from "../../../hooks/useProducts";
import { useDeleteProduct } from "../../../hooks/useProductMutations";
import { ApiError } from "../../../api/client";
import BarcodeInput from "../../../components/BarcodeInput";
import ConfirmDialog from "../../../components/ConfirmDialog";
import ProductThumbnail from "../../../components/ProductThumbnail";
import ProductForm from "../../../components/ProductForm";
import { useAuth } from "../../../context/AuthContext";

export default function ProductList() {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("PRODUCT_CREATE");
  const canUpdate = hasPermission("PRODUCT_UPDATE");
  const canDelete = hasPermission("PRODUCT_DELETE");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [search, setSearch] = useState("");
  const [formTarget, setFormTarget] = useState<"new" | Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: products, isLoading, isError } = useProducts(includeInactive);
  const deleteProduct = useDeleteProduct();

  const filtered = useMemo(() => {
    if (!products) return [];
    const query = search.trim().toLowerCase();
    if (!query) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        (p.barcode ?? "").toLowerCase().includes(query)
    );
  }, [products, search]);

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    setActionError(null);
    deleteProduct.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
      onError: (err) => {
        setActionError(err instanceof ApiError ? err.message : t("products.deactivateFailed"));
        setDeleteTarget(null);
      },
    });
  };

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold text-gray-900">{t("products.title")}</h1>
        {canCreate && (
          <button
            onClick={() => setFormTarget("new")}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            {t("products.newProduct")}
          </button>
        )}
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="sm:max-w-xs sm:flex-1">
          <BarcodeInput
            value={search}
            onChange={setSearch}
            placeholder={t("products.searchPlaceholder")}
            autoFocus
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          {t("products.showInactive")}
        </label>
      </div>

      {actionError && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </p>
      )}

      {isLoading && <p className="text-sm text-gray-500">{t("products.loading")}</p>}
      {isError && <p className="text-sm text-red-700">{t("products.loadFailed")}</p>}
      {!isLoading && !isError && filtered.length === 0 && (
        <p className="text-sm text-gray-500">{t("products.empty")}</p>
      )}

      {/* Desktop table */}
      {filtered.length > 0 && (
        <table className="hidden w-full text-left text-sm sm:table">
          <thead>
            <tr className="border-b border-gray-200 text-xs uppercase text-gray-500">
              <th className="py-2 pr-4"></th>
              <th className="py-2 pr-4">{t("products.colName")}</th>
              <th className="py-2 pr-4">{t("products.colBarcode")}</th>
              <th className="py-2 pr-4">{t("products.colPrice")}</th>
              <th className="py-2 pr-4">{t("products.colCost")}</th>
              <th className="py-2 pr-4">{t("products.colStatus")}</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((product) => (
              <tr key={product.id} className="border-b border-gray-100">
                <td className="py-2 pr-4">
                  <ProductThumbnail imageUrl={product.image_url} alt={product.name} />
                </td>
                <td className="py-2 pr-4">{product.name}</td>
                <td className="py-2 pr-4 text-gray-500">{product.barcode ?? "—"}</td>
                <td className="py-2 pr-4">฿{product.price}</td>
                <td className="py-2 pr-4 text-gray-500">{product.cost ?? "—"}</td>
                <td className="py-2 pr-4">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      product.is_active
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {product.is_active ? t("products.active") : t("products.inactive")}
                  </span>
                </td>
                <td className="py-2 text-right">
                  {canUpdate && (
                    <button
                      onClick={() => setFormTarget(product)}
                      className="mr-3 text-emerald-700 hover:underline"
                    >
                      {t("common.edit")}
                    </button>
                  )}
                  {canDelete && product.is_active && (
                    <button
                      onClick={() => setDeleteTarget(product)}
                      className="text-red-600 hover:underline"
                    >
                      {t("products.deactivate")}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Mobile cards */}
      {filtered.length > 0 && (
        <div className="flex flex-col gap-2 sm:hidden">
          {filtered.map((product) => (
            <div key={product.id} className="rounded-xl border border-gray-200 bg-white p-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <ProductThumbnail imageUrl={product.image_url} alt={product.name} />
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-xs text-gray-500">
                      {product.barcode ?? t("products.noBarcode")}
                    </p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    product.is_active
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {product.is_active ? t("products.active") : t("products.inactive")}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-sm text-gray-700">฿{product.price}</p>
                <div className="flex gap-3 text-sm">
                  {canUpdate && (
                    <button onClick={() => setFormTarget(product)} className="text-emerald-700">
                      {t("common.edit")}
                    </button>
                  )}
                  {canDelete && product.is_active && (
                    <button onClick={() => setDeleteTarget(product)} className="text-red-600">
                      {t("products.deactivate")}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {formTarget && (
        <ProductForm
          product={formTarget === "new" ? undefined : formTarget}
          onClose={() => setFormTarget(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title={t("products.deactivateTitle")}
          message={t("products.deactivateMessage", { name: deleteTarget.name })}
          confirmLabel={t("products.deactivate")}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
