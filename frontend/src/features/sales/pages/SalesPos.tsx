import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Product } from "../../../types/api";
import type { CreateSaleResult } from "../../../api/sales";
import { useProducts } from "../../../hooks/useProducts";
import { useCreateSale } from "../hooks/useSales";
import { ApiError } from "../../../api/client";
import BarcodeInput from "../../../components/BarcodeInput";
import ProductThumbnail from "../../../components/ProductThumbnail";

interface CartLine {
  productId: number;
  name: string;
  price: string; // display-only estimate; server resolves the real price
  quantity: number;
}

export default function SalesPos() {
  const { t } = useTranslation();
  const { data: products, isLoading, isError } = useProducts(false);
  const createSale = useCreateSale();

  const [scan, setScan] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{ result: CreateSaleResult; names: Map<number, string> } | null>(
    null
  );

  const filtered = useMemo(() => {
    if (!products) return [];
    const query = scan.trim().toLowerCase();
    if (!query) return [];
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        (p.barcode ?? "").toLowerCase().includes(query)
    );
  }, [products, scan]);

  const addToCart = (product: Product) => {
    setScanError(null);
    setCheckoutError(null);
    setCart((prev) => {
      const existing = prev.find((line) => line.productId === product.id);
      if (existing) {
        return prev.map((line) =>
          line.productId === product.id ? { ...line, quantity: line.quantity + 1 } : line
        );
      }
      return [...prev, { productId: product.id, name: product.name, price: product.price, quantity: 1 }];
    });
  };

  const handleScanSubmit = (value: string) => {
    const code = value.trim();
    if (!code || !products) return;
    const match = products.find((p) => p.barcode === code);
    if (!match) {
      setScanError(t("sales.noBarcodeMatch", { code }));
      return;
    }
    addToCart(match);
    setScan("");
  };

  const setQuantity = (productId: number, quantity: number) => {
    setCart((prev) =>
      quantity <= 0
        ? prev.filter((line) => line.productId !== productId)
        : prev.map((line) => (line.productId === productId ? { ...line, quantity } : line))
    );
  };

  const total = cart.reduce((sum, line) => sum + Number(line.price) * line.quantity, 0);

  const handleCheckout = () => {
    if (cart.length === 0 || createSale.isPending) return;
    setCheckoutError(null);
    const names = new Map(cart.map((line) => [line.productId, line.name]));
    createSale.mutate(
      { items: cart.map((line) => ({ productId: line.productId, quantity: line.quantity })) },
      {
        onSuccess: (result) => {
          setReceipt({ result, names });
          setCart([]);
        },
        onError: (err) => {
          setCheckoutError(err instanceof ApiError ? err.message : t("sales.checkoutFailed"));
        },
      }
    );
  };

  if (receipt) {
    return <Receipt result={receipt.result} names={receipt.names} onNewSale={() => setReceipt(null)} />;
  }

  return (
    <div className="pb-24">
      <h1 className="mb-4 text-lg font-semibold text-gray-900">{t("sales.title")}</h1>

      <div className="mb-2">
        <BarcodeInput
          value={scan}
          onChange={(v) => {
            setScan(v);
            setScanError(null);
          }}
          onSubmit={handleScanSubmit}
          placeholder={t("sales.scanPlaceholder")}
          autoFocus
        />
      </div>

      {scanError && (
        <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {scanError}
        </p>
      )}

      {isLoading && <p className="text-sm text-gray-500">{t("sales.loadingProducts")}</p>}
      {isError && <p className="text-sm text-red-700">{t("sales.loadFailed")}</p>}

      {filtered.length > 0 && (
        <div className="mb-4 flex flex-col gap-1 rounded-xl border border-gray-200 bg-white p-2">
          {filtered.map((product) => (
            <button
              key={product.id}
              onClick={() => {
                addToCart(product);
                setScan("");
              }}
              className="flex items-center justify-between rounded-lg px-2 py-2 text-left text-sm hover:bg-gray-50"
            >
              <span className="flex items-center gap-2">
                <ProductThumbnail imageUrl={product.image_url} alt={product.name} />
                <span>
                  <span className="font-medium text-gray-900">{product.name}</span>{" "}
                  <span className="text-xs text-gray-500">
                    {product.barcode ?? t("products.noBarcode")}
                  </span>
                </span>
              </span>
              <span className="shrink-0 text-emerald-700">{t("sales.add")}</span>
            </button>
          ))}
        </div>
      )}

      <h2 className="mb-2 text-sm font-semibold text-gray-900">{t("sales.cart")}</h2>
      {cart.length === 0 ? (
        <p className="text-sm text-gray-500">{t("sales.cartEmpty")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {cart.map((line) => (
            <div
              key={line.productId}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{line.name}</p>
                <p className="text-xs text-gray-500">
                  ฿{line.price} × {line.quantity} = ฿{(Number(line.price) * line.quantity).toFixed(2)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setQuantity(line.productId, line.quantity - 1)}
                  aria-label={t("sales.decreaseQty", { name: line.name })}
                  className="h-7 w-7 rounded-full border border-gray-300 text-sm hover:bg-gray-100"
                >
                  −
                </button>
                <span className="w-6 text-center text-sm">{line.quantity}</span>
                <button
                  onClick={() => setQuantity(line.productId, line.quantity + 1)}
                  aria-label={t("sales.increaseQty", { name: line.name })}
                  className="h-7 w-7 rounded-full border border-gray-300 text-sm hover:bg-gray-100"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {checkoutError && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {checkoutError}
        </p>
      )}

      <div className="fixed inset-x-0 bottom-16 border-t border-gray-200 bg-white px-4 py-3 sm:bottom-0 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <span className="text-base font-semibold text-gray-900">
            {t("sales.total")}: ฿{total.toFixed(2)}
          </span>
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || createSale.isPending}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {createSale.isPending ? t("sales.processing") : t("sales.checkout")}
          </button>
        </div>
      </div>
    </div>
  );
}

function Receipt({
  result,
  names,
  onNewSale,
}: {
  result: CreateSaleResult;
  names: Map<number, string>;
  onNewSale: () => void;
}) {
  const { t } = useTranslation();
  const total = Number(result.sale.total_amount);
  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold text-gray-900">{t("sales.saleComplete")}</h1>
      <p className="mb-4 text-sm text-gray-500">{result.sale.sale_no}</p>

      <div className="mb-4 flex flex-col gap-2">
        {result.items.map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3">
            <div>
              <p className="text-sm font-medium text-gray-900">
                {names.get(item.product_id) ?? t("sales.productFallback", { id: item.product_id })}
              </p>
              <p className="text-xs text-gray-500">
                ฿{item.price} × {item.quantity}
              </p>
            </div>
            <span className="text-sm font-medium text-gray-900">฿{item.subtotal}</span>
          </div>
        ))}
      </div>

      <div className="mb-6 flex items-center justify-between border-t border-gray-200 pt-3">
        <span className="text-base font-semibold text-gray-900">{t("sales.total")}</span>
        <span className="text-base font-semibold text-gray-900">฿{total.toFixed(2)}</span>
      </div>

      <button
        onClick={onNewSale}
        className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
      >
        {t("sales.newSale")}
      </button>
    </div>
  );
}
