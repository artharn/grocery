import { useEffect, useState } from "react";

interface ProductThumbnailProps {
  imageUrl: string | null;
  alt: string;
  size?: "sm" | "md";
}

const SIZE_CLASSES: Record<NonNullable<ProductThumbnailProps["size"]>, string> = {
  sm: "h-8 w-8",
  md: "h-12 w-12",
};

// Same placeholder for "no image" and "image failed to load" — one visual
// language app-wide, per fe-standard.md's product-images requirements.
export default function ProductThumbnail({ imageUrl, alt, size = "sm" }: ProductThumbnailProps) {
  const [failed, setFailed] = useState(false);
  // Reset the failed flag whenever the URL itself changes (e.g. a typo
  // fixed in the product form) — same component instance, new src.
  useEffect(() => setFailed(false), [imageUrl]);
  const sizeClass = SIZE_CLASSES[size];

  if (!imageUrl || failed) {
    return (
      <div
        className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400`}
        aria-hidden="true"
      >
        📦
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      onError={() => setFailed(true)}
      className={`${sizeClass} shrink-0 rounded-lg object-cover`}
    />
  );
}
