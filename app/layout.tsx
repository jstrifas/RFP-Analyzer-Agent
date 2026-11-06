import type { Metadata } from "next";
import { IBM_Plex_Mono, Public_Sans, Schibsted_Grotesk } from "next/font/google";
import { Nav } from "./_components/Nav";
import { AGENT_MODEL, PROMPT_VERSION, VENDOR_NAME } from "../src/agent/config.js";
import "./globals.css";

const display = Schibsted_Grotesk({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-schibsted" });
const body = Public_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-public" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-mono" });

export const metadata: Metadata = {
  title: "Cited",
  description: "Drafts cited answers to security questionnaires, and measures whether they can be trusted.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <header className="masthead">
          <div className="masthead-inner">
            <a href="/" className="wordmark">
              <span className="wordmark-mark">Cited</span>
              <span className="wordmark-for">for {VENDOR_NAME}</span>
            </a>
            <Nav />
            <span className="masthead-meta">
              agent {PROMPT_VERSION} · {AGENT_MODEL}
            </span>
          </div>
        </header>
        <main className="page">{children}</main>
      </body>
    </html>
  );
}
