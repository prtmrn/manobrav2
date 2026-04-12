"use client";
import { useState, useEffect, useRef } from "react";

interface Feature {
  properties: {
    label: string;
    housenumber?: string;
    street?: string;
    postcode?: string;
    city?: string;
    name?: string;
  };
  geometry: {
    coordinates: [number, number];
  };
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
  const [suggestions, setSuggestions] = useState<Feature[]>([]);
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

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
    if (val.length < 5) { setSuggestions([]); setOpen(false); return; }
    timeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(val)}`);
        const data: Feature[] = await res.json();
        setSuggestions(data);
        setOpen(data.length > 0);
      } catch {
        setSuggestions([]);
      }
    }, 300);
  }

  function handleSelect(f: Feature) {
    const p = f.properties;
    const adresse = p.housenumber && p.street
      ? `${p.housenumber} ${p.street}`
      : p.name ?? p.label;
    setQuery(adresse);
    setOpen(false);
    onChange({
      adresse,
      ville: p.city ?? "",
      code_postal: p.postcode ?? "",
      latitude: f.geometry.coordinates[1],
      longitude: f.geometry.coordinates[0],
    });
  }

  return (
    <div className="relative" ref={containerRef}>
      <input
        type="text"
        value={query}
        onChange={(e) => handleInput(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder ?? "12 rue de la Paix, Paris"}
        className={inputClass}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((f, i) => (
            <li
              key={i}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(f); }}
              className="px-4 py-2.5 text-sm text-gray-700 hover:bg-brand-50 cursor-pointer border-b border-gray-100 last:border-0"
            >
              {f.properties.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
