import { Search } from "lucide-react"
import type React from "react"
import { useMemo, useState } from "react"
import type { NoddiBrand } from "@/hooks/useNoddiBrands"

/** Filters the Noddi brand catalog by name / slug / domain. */
export function useBrandSearch(brands: NoddiBrand[]) {
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return brands
    return brands.filter((b) =>
      [b.name, b.slug, b.domain ?? ""].some((field) => field.toLowerCase().includes(needle)),
    )
  }, [brands, search])

  return { search, setSearch, filtered }
}

interface BrandSearchInputProps {
  value: string
  onChange: (value: string) => void
}

/** Search field shown at the top of brand pickers. */
export const BrandSearchInput: React.FC<BrandSearchInputProps> = ({ value, onChange }) => (
  <div className="sticky top-0 z-10 bg-popover px-2 pb-2 pt-1">
    <div className="relative">
      <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.stopPropagation()}
        placeholder="Search brands…"
        className="h-8 w-full rounded-md border border-input bg-background pl-7 pr-2 text-sm outline-none focus:ring-1 focus:ring-ring"
      />
    </div>
  </div>
)

/** Logo (or initial) + brand name, shared by every brand picker. */
export const BrandOptionContent: React.FC<{ brand: NoddiBrand }> = ({ brand }) => {
  return (
    <>
      {brand.logo_url ? (
        <img
          src={brand.logo_url}
          alt=""
          loading="lazy"
          className="h-5 w-5 rounded-sm object-contain shrink-0"
        />
      ) : (
        <span
          className="h-5 w-5 rounded-sm shrink-0 grid place-items-center bg-muted text-[10px] font-semibold text-muted-foreground"
          aria-hidden
        >
          {brand.name.charAt(0).toUpperCase()}
        </span>
      )}
      <span className="truncate flex-1">{brand.name}</span>
    </>
  )
}
