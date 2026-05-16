import { NextRequest, NextResponse } from "next/server";

const GH_TOKEN = process.env.GH_TOKEN;

interface Repo {
  primaryLanguage: { name: string; color: string } | null;
  languages: {
    edges: { size: number; node: { name: string; color: string } }[];
  };
}

async function fetchTopLanguages(username: string) {
  const query = `
    query($login: String!) {
      user(login: $login) {
        repositories(first: 100, ownerAffiliations: OWNER, isFork: false, orderBy: {field: UPDATED_AT, direction: DESC}) {
          nodes {
            primaryLanguage { name color }
            languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
              edges { size node { name color } }
            }
          }
        }
      }
    }
  `;

  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables: { login: username } }),
    next: { revalidate: 1800 },
  });

  const json = await res.json();
  const repos: Repo[] = json.data?.user?.repositories?.nodes || [];

  const langMap: Record<string, { size: number; color: string }> = {};
  for (const repo of repos) {
    for (const edge of repo.languages?.edges || []) {
      const { name, color } = edge.node;
      if (!langMap[name]) langMap[name] = { size: 0, color: color || "#888" };
      langMap[name].size += edge.size;
    }
  }

  const sorted = Object.entries(langMap)
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, 8);

  const total = sorted.reduce((s, [, v]) => s + v.size, 0);
  return sorted.map(([name, { size, color }]) => ({
    name,
    color,
    pct: Math.round((size / total) * 100),
  }));
}

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username") || "Hariss19id";

  try {
    const langs = await fetchTopLanguages(username);

    const barHeight = 10;
    const rowH = 28;
    const headerH = 50;
    const totalH = headerH + langs.length * rowH + 30;

    // Build percentage bar segments
    let xOffset = 25;
    const barWidth = 420;
    const barSegments = langs.map((l) => {
      const w = Math.round((l.pct / 100) * barWidth);
      const seg = `<rect x="${xOffset}" y="${headerH - 4}" width="${w}" height="${barHeight}" fill="${l.color}" rx="2"/>`;
      xOffset += w;
      return seg;
    });

    const rows = langs
      .map((l, i) => {
        const y = headerH + i * rowH + 18;
        const barW = Math.round((l.pct / 100) * 280);
        return `
      <circle cx="32" cy="${y - 3}" r="5" fill="${l.color}"/>
      <text x="44" y="${y}" fill="#e0f7ff" font-size="11">${l.name}</text>
      <rect x="200" y="${y - 8}" width="280" height="7" rx="3" fill="#0d2a3a"/>
      <rect x="200" y="${y - 8}" width="${barW}" height="7" rx="3" fill="${l.color}" opacity="0.85"/>
      <text x="492" y="${y}" fill="#7ec8e3" font-size="10" text-anchor="end">${l.pct}%</text>`;
      })
      .join("\n");

    const svg = `<svg width="500" height="${totalH}" viewBox="0 0 500 ${totalH}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#010b14"/>
      <stop offset="100%" style="stop-color:#0d1b2a"/>
    </linearGradient>
    <filter id="glow2">
      <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
      <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <rect width="500" height="${totalH}" rx="12" fill="url(#bg2)" stroke="#00d4ff" stroke-width="0.8" stroke-opacity="0.4"/>

  <!-- Corner accents -->
  <line x1="0" y1="20" x2="20" y2="0" stroke="#00d4ff" stroke-width="1" stroke-opacity="0.5"/>
  <line x1="480" y1="0" x2="500" y2="20" stroke="#00d4ff" stroke-width="1" stroke-opacity="0.5"/>

  <!-- Title -->
  <text x="25" y="28" fill="#00d4ff" font-size="13" font-weight="bold" font-family="monospace" filter="url(#glow2)">◈ Top Languages</text>
  <line x1="25" y1="36" x2="475" y2="36" stroke="#00d4ff" stroke-width="0.5" stroke-opacity="0.4"/>

  <!-- Multi-color bar -->
  <rect x="25" y="${headerH - 5}" width="420" height="${barHeight}" rx="4" fill="#0d2a3a"/>
  ${barSegments.join("\n  ")}

  ${rows}
</svg>`;

    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=1800, s-maxage=1800",
      },
    });
  } catch {
    return new NextResponse(
      `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="80">
        <rect width="500" height="80" rx="12" fill="#010b14" stroke="#ff0080" stroke-width="1"/>
        <text x="250" y="45" text-anchor="middle" fill="#ff0080" font-size="12" font-family="monospace">⚠ Failed to load languages</text>
      </svg>`,
      { headers: { "Content-Type": "image/svg+xml" } }
    );
  }
}
