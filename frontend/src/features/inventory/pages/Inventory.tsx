import { useMemo, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import type { Product } from "../../../types/api";
import { useProducts } from "../../../hooks/useProducts";
import { useStockBalance, useStockTransactions, useCreateStockTransaction } from "../hooks/useStock";
import { ApiError } from "../../../api/client";
import BarcodeInput from "../../../components/BarcodeInput";
import ProductThumbnail from "../../../components/ProductThumbnail";

type MovementType = "IN" | "OUT" | "ADJUST";

export default function Inventory() {
  const { t } = useTranslation();
  const { data: products } = useProducts(true); // includes inactive — stock stays viewable for them
  const [search, setSearch] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Product | null>(null);

  const filtered = useMemo(() => {
    if (!products) return [];
    const query = search.trim().toLowerCase();
    if (!query) return [];
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        (p.barcode ?? "").toLowerCase().includes(query)
    );
  }, [products, search]);

  const selectProduct = (product: Product) => {
    setSelected(product);
    setSearch("");
    setSearchError(null);
  };

  const handleSubmit = (value: string) => {
    const code = value.trim();
    if (!code || !products) return;
    const match = products.find((p) => p.barcode === code);
    if (!match) {
      setSearchError(t("inventory.noBarcodeMatch", { code }));
      return;
    }
    selectProduct(match);
  };

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-gray-900">{t("inventory.title")}</h1>

      <BarcodeInput
        value={search}
        onChange={(v) => {
          setSearch(v);
          setSearchError(null);
        }}
        onSubmit={handleSubmit}
        placeholder={t("inventory.searchPlaceholder")}
        autoFocus
      />

      {searchError && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {searchError}
        </p>
      )}

      {filtered.length > 0 && (
        <div className="mt-3 flex flex-col gap-1 rounded-xl border border-gray-200 bg-white p-2">
          {filtered.map((product) => (
            <button
              key={product.id}
              onClick={() => selectProduct(product)}
              className="flex items-center justify-between rounded-lg px-2 py-2 text-left text-sm hover:bg-gray-50"
            >
              <span className="flex items-center gap-2">
                <ProductThumbnail imageUrl={product.image_url} alt={product.name} />
                <span>
                  <span className="font-medium text-gray-900">{product.name}</span>{" "}
                  <span className="text-xs text-gray-500">
                    {product.barcode ?? t("products.noBarcode")}
                  </span>
                  {!product.is_active && (
                    <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                      {t("inventory.inactiveBadge")}
                    </span>
                  )}
                </span>
              </span>
              <span className="shrink-0 text-emerald-700">{t("inventory.view")}</span>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="mt-6">
          <ProductStockDetail product={selected} onClose={() => setSelected(null)} />
        </div>
      )}
    </div>
  );
}

function ProductStockDetail({ product, onClose }: { product: Product; onClose: () => void }) {
  const { t } = useTranslation();
  const { data: balance, isLoading: balanceLoading } = useStockBalance(product.id);
  const { data: transactions, isLoading: txLoading, isError: txError } = useStockTransactions(product.id);
  const createTransaction = useCreateStockTransaction(product.id);

  const [type, setType] = useState<MovementType>("IN");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setValidationError(null);

    const quantityNumber = Number(quantity);
    if (quantity === "" || !Number.isInteger(quantityNumber)) {
      setValidationError(t("inventory.quantityWholeNumber"));
      return;
    }
    if ((type === "IN" || type === "OUT") && quantityNumber <= 0) {
      setValidationError(t("inventory.quantityPositive", { type }));
      return;
    }
    if (type === "ADJUST" && quantityNumber === 0) {
      setValidationError(t("inventory.adjustNonZero"));
      return;
    }

    createTransaction.mutate(
      { type, quantity: quantityNumber, note: note.trim() === "" ? undefined : note.trim() },
      {
        onSuccess: () => {
          setQuantity("");
          setNote("");
        },
      }
    );
  };

  const apiError = createTransaction.error instanceof ApiError ? createTransaction.error.message : null;

  const quantityLabel =
    type === "OUT"
      ? t("inventory.quantityOut")
      : type === "ADJUST"
        ? t("inventory.quantityAdjust")
        : t("inventory.quantity");

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{product.name}</h2>
          <p className="text-xs text-gray-500">{product.barcode ?? t("products.noBarcode")}</p>
        </div>
        <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-800">
          {t("common.close")}
        </button>
      </div>

      <p className="mb-4 text-2xl font-semibold text-gray-900">
        {balanceLoading ? "…" : (balance?.balance ?? 0)}
        <span className="ml-1 text-sm font-normal text-gray-500">{t("inventory.unitsInStock")}</span>
      </p>

      <form onSubmit={handleSubmit} className="mb-5 flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-end">
        <div className="sm:w-32">
          <label className="mb-1 block text-sm font-medium text-gray-700">{t("inventory.type")}</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as MovementType)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="IN">IN</option>
            <option value="OUT">OUT</option>
            <option value="ADJUST">ADJUST</option>
          </select>
        </div>
        <div className="sm:w-32">
          <label className="mb-1 block text-sm font-medium text-gray-700">{quantityLabel}</label>
          <input
            type="number"
            step="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-gray-700">{t("inventory.note")}</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("common.optional")}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <button
          type="submit"
          disabled={createTransaction.isPending}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {createTransaction.isPending ? t("inventory.recording") : t("inventory.record")}
        </button>
      </form>

      {(validationError || apiError) && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {validationError ?? apiError}
        </p>
      )}

      <h3 className="mb-2 text-sm font-semibold text-gray-900">{t("inventory.history")}</h3>
      {txLoading && <p className="text-sm text-gray-500">{t("inventory.loadingHistory")}</p>}
      {txError && <p className="text-sm text-red-700">{t("inventory.historyFailed")}</p>}
      {!txLoading && !txError && transactions?.length === 0 && (
        <p className="text-sm text-gray-500">{t("inventory.noMovements")}</p>
      )}
      {transactions && transactions.length > 0 && (
        <div className="flex flex-col gap-1">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm odd:bg-gray-50"
            >
              <div>
                <span className="font-medium text-gray-900">{tx.type}</span>{" "}
                <span className="text-gray-500">{new Date(tx.created_at).toLocaleString()}</span>
                {tx.note && <span className="ml-2 text-gray-500">— {tx.note}</span>}
              </div>
              <span className={tx.quantity < 0 ? "text-red-600" : "text-emerald-700"}>
                {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
