"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/ask", label: "Ask" },
  { href: "/questionnaire", label: "Questionnaire" },
  { href: "/report", label: "Report Card" },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav className="nav" aria-label="Main">
      {LINKS.map((l) => {
        const active = path.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
