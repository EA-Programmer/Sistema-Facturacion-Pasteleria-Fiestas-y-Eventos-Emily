import Image from "next/image";
import { brand } from "@/lib/brand";
import { cn } from "@/lib/utils";

type BrandMarkProps = {
  compact?: boolean;
  className?: string;
};

export function BrandMark({ compact = false, className }: BrandMarkProps) {
  const imageSize = compact ? 44 : 56;

  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <div
        className={cn(
          "grid shrink-0 place-items-center overflow-hidden rounded-lg border border-pink-100 bg-white shadow-sm",
          compact ? "size-11" : "size-14",
        )}
        style={{ width: imageSize, height: imageSize }}
      >
        <Image
          src={brand.logoPath}
          alt={`Logo ${brand.businessName}`}
          width={imageSize}
          height={imageSize}
          className="block object-contain p-1"
          style={{
            display: "block",
            width: imageSize,
            height: imageSize,
            objectFit: "contain",
            padding: 4,
          }}
        />
      </div>
      <div className="min-w-0">
        <p className={cn("truncate font-bold text-slate-950", compact ? "text-sm" : "text-base")}>
          {brand.businessName}
        </p>
        <p className="truncate text-xs font-medium text-slate-500">{brand.systemName}</p>
      </div>
    </div>
  );
}
