import React from "react";

interface BrandIconProps {
  className?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  alt?: string;
}

const sizeMap = {
  xs: "h-5 w-5",
  sm: "h-7 w-7",
  md: "h-8 w-8",
  lg: "h-9 w-9",
  xl: "h-10 w-10",
};

/**
 * Standard AdminPath unified brand icon.
 * Ensures the exact same vector favicon icon (/favicon.svg)
 * is rendered consistently in the browser tab, navbar, sidebar, and footer.
 */
export default function BrandIcon({
  className = "",
  size = "md",
  alt = "AdminPath Logo",
}: BrandIconProps) {
  const sizeClass = sizeMap[size] || sizeMap.md;
  return (
    <img
      src="/favicon.svg"
      alt={alt}
      className={`shrink-0 object-contain ${sizeClass} ${className}`}
    />
  );
}
