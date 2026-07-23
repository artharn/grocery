import { useState, forwardRef } from "react";
import { useTranslation } from "react-i18next";
import CameraScanner from "./CameraScanner";

interface BarcodeInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  // Fired on a "complete code" event — a hardware scanner's terminating
  // Enter, or a camera decode — as opposed to onChange, which fires per
  // keystroke for live filtering. Optional: callers that only need
  // filter-as-you-type (e.g. Products search) can omit it.
  onSubmit?: (value: string) => void;
  // Shows a spinner while true (e.g. the product list a scan needs to
  // match against is still fetching). Doesn't disable the field — typed/
  // scanned text is never dropped — callers are expected to check this
  // themselves in their onSubmit handler instead of silently no-op-ing.
  loading?: boolean;
}

// Two input modes for the same field, per fe-standard.md §5:
// 1. Plain text field — hardware HID barcode scanners just type into
//    whatever's focused, no extra code needed.
// 2. Camera button — opens CameraScanner, fills this same field on scan.
const BarcodeInput = forwardRef<HTMLInputElement, BarcodeInputProps>(
  ({ value, onChange, placeholder, autoFocus, onSubmit, loading }, ref) => {
    const { t } = useTranslation();
    const [scannerOpen, setScannerOpen] = useState(false);

    return (
      <div className="flex gap-2">
        <div className="relative w-full">
          <input
            ref={ref}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && onSubmit) {
                e.preventDefault();
                onSubmit(value);
              }
            }}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          {loading && (
            <span
              role="status"
              aria-label={t("common.loading")}
              className="absolute inset-y-0 right-3 flex items-center"
            >
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-emerald-600" />
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setScannerOpen(true)}
          className="shrink-0 rounded-lg border border-gray-300 px-3 text-lg hover:bg-gray-100"
          aria-label={t("barcode.scanWithCamera")}
        >
          📷
        </button>

        {scannerOpen && (
          <CameraScanner
            onScan={(text) => {
              onChange(text);
              setScannerOpen(false);
              onSubmit?.(text);
            }}
            onClose={() => setScannerOpen(false)}
          />
        )}
      </div>
    );
  }
);

BarcodeInput.displayName = "BarcodeInput";

export default BarcodeInput;
