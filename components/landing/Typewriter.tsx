"use client";
import { useEffect, useState } from "react";

const METIERS = [
  "plombier",
  "serrurier",
  "électricien",
  "chauffagiste",
  "vitrier",
];

const SPEED = 60;
const DELETE_SPEED = 35;
const WAIT_TIME = 2000;

export default function Typewriter() {
  const [displayText, setDisplayText] = useState(METIERS[0]);
  const [index, setIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(METIERS[0].length);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const current = METIERS[index];
    let timeout: NodeJS.Timeout;

    if (!isDeleting) {
      if (charIndex < current.length) {
        timeout = setTimeout(() => {
          setDisplayText(current.slice(0, charIndex + 1));
          setCharIndex(c => c + 1);
        }, SPEED);
      } else {
        timeout = setTimeout(() => setIsDeleting(true), WAIT_TIME);
      }
    } else {
      if (charIndex > 0) {
        timeout = setTimeout(() => {
          setDisplayText(current.slice(0, charIndex - 1));
          setCharIndex(c => c - 1);
        }, DELETE_SPEED);
      } else {
        setIsDeleting(false);
        setIndex(i => (i + 1) % METIERS.length);
      }
    }

    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting, index]);

  return (
    <span className="whitespace-nowrap sm:whitespace-nowrap">
      Trouvez le bon{" "}
      <span className="text-brand-600 relative inline-block min-w-[8ch]">
        {displayText}
        <span className="animate-blink ml-0.5 inline-block w-0.5 h-[0.85em] bg-brand-600 align-middle" />
        <svg
          className="absolute -bottom-2 left-0 w-full"
          viewBox="0 0 300 12"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M2 9.5C50 3.5 150 1 298 9.5"
            stroke="#16a34a"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      </span>
      {" "}en 2 minutes
    </span>
  );
}
