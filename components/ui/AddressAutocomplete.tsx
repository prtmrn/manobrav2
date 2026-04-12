"use client";
import { useState, useEffect, useRef } from "react";

interface AddressSuggestion {
  display_name: string;
  address: {
    house_number?: string;
    road?: string;
    postcode?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
  };
  lat: string;
  lon: string;
}

interface AddressResult {
  adresse: string;
  ville: string;
  code_postal: string;
  latitude: number;
  longitude: number;
}

interface Props {
  value: string;
  onChange: (result: AddressResult) => void;
  placeholder?: string;
  inputClass?: string;
}

export default function AddressAutocomplete({ value, onChange, placeholder, inputClass }: Props) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleInput(val: string) {
    setQuery(val);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (val.length < 3) { setSuggestions([]); setOpen(false); return; }
    timeoutRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/geocode?q=${encodeURIComponent(val)}`
        );
        const data: AddressSuggestion[] = await res.json();
        console.log("suggestions:", data.length, data);
        setSuggestions(data);
        setOpen(data.length > 0);
        console.log("open set to:", data.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 400);
  }

  function handleSelect(s: AddressSuggestion) {
    const road = s.address.road ?? "";
    const number = s.address.house_number ?? "";
    const adresse = number ? `${number} ${road}`.trim() : road;
    const ville = s.address.city ?? s.address.town ?? s.address.village ?? s.address.municipality ?? "";
    const code_postal = s.address.postcode ?? "";
    setQuery(adresse || s.display_name);
    setOpen(false);
    onChange({
      adresse: adresse || s.display_name,
      ville,
      code_postal,
      latitude: parseFloat(s.lat),
      longitude: parseFloat(s.lon),
    });
  }

  return (
    <div className="relative" ref={containerRef}>
      <input
        type="text"
        value={query}
        onChange={(e) => handleInput(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder ?? "12 rue de la Paix"}
        className={inputClass}
        autoComplete="off"
      />
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {open && suggestions.length > 0 && (
        <ul className="fixed z-[9999] bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto" style={{ width: containerRef.current?.getBoundingClientRect().width, left: containerRef.current?.getBoundingClientRect().left, top: (containerRef.current?.getBoundingClientRect().bottom ?? 0) + 4 }}>
          {suggestions.map((s, i) => (
            <li
              key={i}
              onClick={() => handleSelect(s)}
              className="px-4 py-2.5 text-sm text-gray-700 hover:bg-brand-50 cursor-pointer border-b border-gray-100 last:border-0"
            >
              {s.display_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
