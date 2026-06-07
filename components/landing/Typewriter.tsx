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
    <span className="block sm:whitespace-nowrap text-center">
      <span className="block sm:inline">Trouvez le bon </span>
      <span className="block sm:inline">
        <span className="text-brand-600">
          {displayText}
        </span>
        <span className="animate-blink inline-block w-0.5 h-[0.8em] bg-brand-600 align-middle ml-0.5" />
        {" "}
      </span>
      <span className="block sm:inline">en 2 minutes</span>
    </span>
  );
}
