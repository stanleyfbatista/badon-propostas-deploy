import React from "react";
import { ArrowUpRight } from "lucide-react";
import "./privacy-links.css";

// Open separately so reading the policy never discards a form or login in progress.
export function PrivacyLinks() {
  return (
    <nav className="privacy-links" aria-label="Informações de privacidade">
      {[
        ["Privacidade", "/privacidade/"],
        ["Cookies", "/privacidade/#cookies"],
      ].map(([label, href]) => (
        <a
          key={href}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${label} (abre em nova aba)`}
          title="Abre em nova aba"
        >
          {label}
          <ArrowUpRight size={13} aria-hidden="true" />
        </a>
      ))}
    </nav>
  );
}
