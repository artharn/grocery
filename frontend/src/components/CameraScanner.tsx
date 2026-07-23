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

  // `onScan` is passed as an inline arrow function by every caller (a new
  // reference on every render of the parent). Keeping it out of the
  // effect's dependency array — and reading it via a ref instead — means
  // an unrelated re-render of the parent (e.g. a background query
  // refetch) can't tear down and restart the camera mid-scan. Previously
  // it WAS a dependency, which is exactly why scanning could silently
  // never produce a result: the video stream kept restarting before a
  // frame ever got decoded.
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

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

    // useBarCodeDetectorIfSupported belongs to the constructor's config,
    // not the scan config passed to start() below.
    const scanner = new Html5Qrcode(READER_ELEMENT_ID, {
      verbose: false,
      experimentalFeatures: { useBarCodeDetectorIfSupported: true },
    });
    scannerRef.current = scanner;

    // start() normally rejects on failure, but can also throw
    // synchronously (e.g. a scan session already active on this element).
    // A synchronous throw isn't caught by .catch() on the returned
    // promise, so it must be wrapped directly or it crashes the component.
    try {
      scanner
        .start(
          { facingMode: "environment" },
          {
            fps: 10,
            // A fixed 250x250 box can end up larger than the actual video
            // feed on a narrow phone viewport (this modal is capped at
            // max-w-sm) — when that happens the library's scan region
            // stops lining up with the real video frame and decoding
            // silently never succeeds, even though the stream visibly
            // keeps running. Sizing it relative to the real viewfinder
            // avoids that, per html5-qrcode's own recommended usage.
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
              const size = Math.floor(minEdge * 0.7);
              return { width: size, height: size };
            },
          },
          (decodedText) => {
            if (stopped) return;
            stopped = true;
            onScanRef.current(decodedText);
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
  }, []); // mount once, stop only on unmount — see onScanRef above

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
