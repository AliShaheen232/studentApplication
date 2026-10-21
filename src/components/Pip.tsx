import React from "react";

export default function Pip({ size = 72, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" aria-hidden="true" className={`ap-float ${className}`}>
      <ellipse cx="40" cy="72" rx="20" ry="3.5" fill="#4f3fd0" opacity="0.14" />
      <path d="M40 12c18 0 28 12 28 28s-10 26-28 26S12 56 12 40 22 12 40 12z" fill="#8f84fb" />
      <ellipse cx="29" cy="40" rx="6" ry="7" fill="#fff" className="ap-blink" />
      <ellipse cx="51" cy="40" rx="6" ry="7" fill="#fff" className="ap-blink" />
      <circle cx="30" cy="41" r="3" fill="#1f1a4d" />
      <circle cx="52" cy="41" r="3" fill="#1f1a4d" />
      <ellipse cx="22" cy="50" rx="4" ry="2.6" fill="#f9a8d4" opacity="0.8" />
      <ellipse cx="58" cy="50" rx="4" ry="2.6" fill="#f9a8d4" opacity="0.8" />
      <path d="M33 52q7 6 14 0" stroke="#1f1a4d" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M16 22l24-10 24 10-24 9z" fill="#2dd4bf" />
      <path d="M64 22v10" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
