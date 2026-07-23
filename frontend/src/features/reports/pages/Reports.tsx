import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useSalesReport, useProductsReport } from "../hooks/useReports";
import { ApiError } from "../../../api/client";

// Local-date formatting (not toISOString) — a UTC round-trip shifts the
// date by a day near midnight in timezones ahead of UTC, the same footgun
// already hit once on the backend side (see grocery-api's dailyBreakdown fix).
function toLocalDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function defaultRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 6);
  return { startDate: toLocalDateInput(start), endDate: toLocalDateInput(end) };
}

export default function Reports() {
  const { t } = useTranslation();
  const initial = useMemo(defaultRange, []);
  const [startDate, setStartDate] = useState(initial.startDate);
  const [endDate, setEndDate] = useState(initial.endDate);

  const rangeValid = startDate !== "" && endDate !== "" && startDate <= endDate;

  const sales = useSalesReport(startDate, endDate, rangeValid);
  const products = useProductsReport(startDate, endDate, rangeValid);

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-gray-900">{t("reports.title")}</h1>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">{t("reports.from")}</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">{t("reports.to")}</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {!rangeValid && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {t("reports.rangeInvalid")}
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <SalesReportSection
          data={sales.data}
          isLoading={rangeValid && sales.isLoading}
          error={sales.error}
        />
        <ProductsReportSection
          data={products.data}
          isLoading={rangeValid && products.isLoading}
          error={products.error}
        />
      </div>
    </div>
  );
}

function errorMessage(t: TFunction, error: unknown): string {
  return error instanceof ApiError ? error.message : t("reports.loadFailed");
}

function SalesReportSection({
  data,
  isLoading,
  error,
}: {
  data: ReturnType<typeof useSalesReport>["data"];
  isLoading: boolean;
  error: unknown;
}) {
  const { t } = useTranslation();
  const message = !isLoading && error ? errorMessage(t, error) : null;
  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold text-gray-900">{t("reports.salesSection")}</h2>
      {isLoading && <p className="text-sm text-gray-500">{t("reports.loading")}</p>}
      {message && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {message}
        </p>
      )}
      {data && (
        <>
          <div className="mb-3 flex gap-4">
            <StatChip label={t("reports.salesLabel")} value={data.totalSales} />
            <StatChip label={t("reports.revenueLabel")} value={`฿${data.totalRevenue}`} />
          </div>
          {data.dailyBreakdown.length === 0 ? (
            <p className="text-sm text-gray-500">{t("reports.noSalesInRange")}</p>
          ) : (
            <div className="flex flex-col gap-1 rounded-xl border border-gray-200 bg-white p-2">
              {data.dailyBreakdown.map((day) => (
                <div key={day.date} className="flex items-center justify-between px-2 py-1.5 text-sm">
                  <span className="text-gray-900">{day.date}</span>
                  <span className="text-gray-500">
                    {day.count} {t("reports.sale", { count: day.count })} · ฿{day.revenue}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ProductsReportSection({
  data,
  isLoading,
  error,
}: {
  data: ReturnType<typeof useProductsReport>["data"];
  isLoading: boolean;
  error: unknown;
}) {
  const { t } = useTranslation();
  const message = !isLoading && error ? errorMessage(t, error) : null;
  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold text-gray-900">{t("reports.productsSection")}</h2>
      {isLoading && <p className="text-sm text-gray-500">{t("reports.loading")}</p>}
      {message && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {message}
        </p>
      )}
      {data && (
        <>
          {data.products.length === 0 ? (
            <p className="text-sm text-gray-500">{t("reports.noProductsInRange")}</p>
          ) : (
            <div className="flex flex-col gap-1 rounded-xl border border-gray-200 bg-white p-2">
              {data.products.map((product) => (
                <div
                  key={product.productId}
                  className="flex items-center justify-between px-2 py-1.5 text-sm"
                >
                  <span className="text-gray-900">{product.name}</span>
                  <span className="text-gray-500">
                    {product.quantitySold} {t("reports.sold")} · ฿{product.revenue}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-gray-100 px-3 py-1.5">
      <span className="text-xs text-gray-500">{label}: </span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}
