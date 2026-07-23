import { useTranslation } from "react-i18next";
import { useDashboardMetrics } from "../hooks/useDashboard";
import { ApiError } from "../../../api/client";

export default function Dashboard() {
  const { t } = useTranslation();
  const { data, isLoading, isError, error } = useDashboardMetrics();

  if (isLoading) {
    return <p className="text-sm text-gray-500">{t("dashboard.loading")}</p>;
  }

  if (isError) {
    const message = error instanceof ApiError ? error.message : t("dashboard.loadFailed");
    return (
      <div>
        <h1 className="mb-4 text-lg font-semibold text-gray-900">{t("dashboard.title")}</h1>
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {message}
        </p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-gray-900">{t("dashboard.title")}</h1>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label={t("dashboard.todaySales")} value={data.todaySales.count} />
        <StatCard label={t("dashboard.todayRevenue")} value={`฿${data.todaySales.totalAmount}`} />
        <StatCard label={t("dashboard.activeProducts")} value={data.totalActiveProducts} />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <h2 className="mb-2 text-sm font-semibold text-gray-900">{t("dashboard.outOfStock")}</h2>
          {data.outOfStockProducts.length === 0 ? (
            <p className="text-sm text-gray-500">{t("dashboard.noOutOfStock")}</p>
          ) : (
            <div className="flex flex-col gap-1 rounded-xl border border-gray-200 bg-white p-2">
              {data.outOfStockProducts.map((product) => (
                <div key={product.id} className="px-2 py-1.5 text-sm text-gray-900">
                  {product.name}
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-2 text-sm font-semibold text-gray-900">{t("dashboard.topProducts")}</h2>
          {data.topProducts.length === 0 ? (
            <p className="text-sm text-gray-500">{t("dashboard.noSalesHistory")}</p>
          ) : (
            <div className="flex flex-col gap-1 rounded-xl border border-gray-200 bg-white p-2">
              {data.topProducts.map((product, index) => (
                <div
                  key={product.productId}
                  className="flex items-center justify-between px-2 py-1.5 text-sm"
                >
                  <span className="text-gray-900">
                    {index + 1}. {product.name}
                  </span>
                  <span className="text-gray-500">
                    {product.totalQuantitySold} {t("dashboard.sold")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}
