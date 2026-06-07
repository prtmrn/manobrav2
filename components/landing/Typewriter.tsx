"use client";
import { useEffect, useState } from "react";

const TEXTS = [
  "Trouvez le bon plombier en 2 minutes",
  "Trouvez le bon serrurier en 2 minutes",
  "Trouvez le bon électricien en 2 minutes",
  "Trouvez le bon chauffagiste en 2 minutes",
  "Trouvez le bon vitrier en 2 minutes",
];

const SPEED = 45;
const DELETE_SPEED = 25;
const WAIT_TIME = 2200;

export default function Typewriter() {
  const [displayText, setDisplayText] = useState("");
  const [index, setIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const current = TEXTS[index];
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
        setIndex(i => (i + 1) % TEXTS.length);
      }
    }

    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting, index]);

  return (
    <span className="inline-block">
      {displayText}
      <span className="animate-blink ml-0.5 inline-block w-0.5 h-[0.9em] bg-brand-600 align-middle" />
    </span>
  );
}
