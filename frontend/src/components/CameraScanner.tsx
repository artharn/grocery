import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { useTranslation } from "react-i18next";

const READER_ELEMENT_ID = "camera-scanner-reader";

interface CameraScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

// Modal camera scanner for both QR and 1D barcodes, per fe-standard.md
// §5. This is always an alternative input path alongside the plain text
// field in BarcodeInput — never the only way to enter a code.
export default function CameraScanner({ onScan, onClose }: CameraScannerProps) {
  const { t } = useTranslation();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  // Structured, not pre-translated — translation happens at render time so
  // this effect doesn't need `t` in its dependency array (which would
  // restart the camera stream on every language switch).
  const [error, setError] = useState<{ message: string } | "generic" | null>(null);

  useEffect(() => {
    let stopped = false;
    // html5-qrcode's stop() throws SYNCHRONOUSLY — "Cannot stop, scanner
    // is not running or paused" — if called before start() has actually
    // resolved (e.g. no camera device, permission denied, or React's
    // StrictMode dev-mode double-invoke unmounting before start settles).
    // Track this explicitly rather than assuming stop() is always safe to
    // call once start() has been kicked off.
    let running = false;
    const handleStartError = (err: unknown) => {
      if (stopped) return; // effect already cleaned up (e.g. StrictMode's dev double-invoke) — ignore
      setError(err instanceof Error ? { message: err.message } : "generic");
    };

    const scanner = new Html5Qrcode(READER_ELEMENT_ID);
    scannerRef.current = scanner;

    // start() normally rejects on failure, but can also throw
    // synchronously (e.g. a scan session already active on this element).
    // A synchronous throw isn't caught by .catch() on the returned
    // promise, so it must be wrapped directly or it crashes the component.
    try {
      scanner
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            if (stopped) return;
            stopped = true;
            onScan(decodedText);
          },
          () => {
            // per-frame "nothing decoded this frame" — not an error, ignore
          }
        )
        .then(() => {
          if (stopped) {
            // Cleanup already ran before start() settled (e.g. the modal
            // was closed mid-permission-prompt) — stop the stream we just
            // opened instead of leaking an active camera.
            scanner.stop().catch(() => {});
            return;
          }
          running = true;
        })
        .catch(handleStartError);
    } catch (err) {
      handleStartError(err);
    }

    return () => {
      stopped = true;
      if (!running) return; // start() never succeeded — nothing to stop
      scanner
        .stop()
        .then(() => scanner.clear())
        .catch(() => {
          /* already stopped — nothing to clean up */
        });
    };
  }, [onScan]);

  const errorMessage = error
    ? error === "generic"
      ? t("camera.cameraErrorGeneric")
      : t("camera.cameraErrorWithMessage", { message: error.message })
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-900">{t("camera.title")}</h2>
          <button
            onClick={onClose}
            className="rounded-full px-2 py-1 text-gray-500 hover:bg-gray-100"
            aria-label={t("camera.close")}
          >
            ✕
          </button>
        </div>

        {errorMessage ? (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : (
          <div id={READER_ELEMENT_ID} className="overflow-hidden rounded-lg" />
        )}
      </div>
    </div>
  );
}
