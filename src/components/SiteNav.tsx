import Link from "next/link";

const LINKS = [
  { href: "/", label: "Atlas" },
  { href: "/chapters/", label: "Chapters" },
  { href: "/stats/", label: "Statistics" },
  { href: "/groups/", label: "Groups" },
  { href: "/methodology/", label: "Methodology" },
  { href: "/sources/", label: "Sources" },
  { href: "/data/", label: "Data" },
];

export function SiteNav() {
  return (
    <header className="site-nav">
      <Link href="/" className="brand">
        <span className="brand-title">J&amp;K Conflict Atlas</span>
        <span className="brand-sub">1947 to present</span>
      </Link>
      <nav aria-label="Main">
        <ul>
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href}>{l.label}</Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
