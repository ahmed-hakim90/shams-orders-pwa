import Image from "next/image";

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`brand-logo${compact ? " is-compact" : ""}`} aria-label="Shams Stores">
      <Image src="/shams-stores-logo.png" alt="Shams Stores — Pro Photo & Audio equipment" width={2172} height={724} priority />
    </span>
  );
}
