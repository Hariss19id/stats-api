import { NextRequest, NextResponse } from "next/server";

const GH_TOKEN = process.env.GH_TOKEN;

async function fetchData(username: string) {
  const query = `
    query($login: String!) {
      user(login: $login) {
        name login createdAt
        followers { totalCount }
        repositories(first: 100, ownerAffiliations: OWNER, isFork: false) {
          nodes {
            stargazerCount
            languages(first: 5, orderBy: {field: SIZE, direction: DESC}) {
              nodes { name }
            }
          }
          totalCount
        }
        contributionsCollection {
          contributionCalendar { totalContributions }
        }
        pullRequests { totalCount }
        issues { totalCount }
      }
    }
  `;
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `Bearer ${GH_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { login: username } }),
    next: { revalidate: 1800 },
  });
  return (await res.json()).data?.user;
}

function statRow(label: string, abbr: string, val: number, color: string, y: number): string {
  const barW = Math.round((Math.min(val, 99) / 99) * 120);
  return `
  <text x="30" y="${y}" fill="#4a7a9a" font-size="9" font-family="monospace">${abbr}</text>
  <text x="48" y="${y}" fill="${color}" font-size="9" font-family="monospace" font-weight="bold">${String(val).padStart(2, " ")}</text>
  <text x="72" y="${y}" fill="#2a4a6a" font-size="8" font-family="monospace">${label}</text>
  <rect x="155" y="${y - 7}" width="120" height="6" rx="2" fill="#0a1628"/>
  <rect x="155" y="${y - 7}" width="${barW}" height="6" rx="2" fill="${color}" opacity="0.85"/>`;
}

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username") || "Hariss19id";

  try {
    const user = await fetchData(username);
    if (!user) throw new Error("Not found");

    const commits = user.contributionsCollection.contributionCalendar.totalContributions;
    const stars = user.repositories.nodes.reduce((a: number, r: { stargazerCount: number }) => a + r.stargazerCount, 0);
    const prs = user.pullRequests.totalCount;
    const repos = user.repositories.totalCount;
    const followers = user.followers.totalCount;

    const langSet = new Set<string>();
    user.repositories.nodes.forEach((r: { languages: { nodes: { name: string }[] } }) =>
      r.languages.nodes.forEach((l) => langSet.add(l.name))
    );
    const langCount = langSet.size;

    // RPG Stats (capped 0-99)
    const STR = Math.min(99, Math.round(commits / 5));
    const INT = Math.min(99, langCount * 6);
    const DEX = Math.min(99, prs * 4 + 10);
    const VIT = Math.min(99, repos * 3);
    const WIS = Math.min(99, stars * 8 + 5);
    const CHA = Math.min(99, followers * 5 + 20);

    const totalScore = STR + INT + DEX + VIT + WIS + CHA;
    const level = Math.min(99, Math.floor(totalScore / 25) + 1);
    const xp = totalScore % 25;

    const hp = Math.min(9999, commits * 8 + stars * 15);
    const mp = Math.min(999, langCount * 40 + prs * 10);
    const hpMax = Math.max(hp, 300);
    const mpMax = Math.max(mp, 100);

    let charClass = "Code Warrior";
    if (INT > 70 && STR > 50) charClass = "Arcane Engineer";
    else if (STR > 70) charClass = "Commit Berserker";
    else if (INT > 70) charClass = "Syntax Mage";
    else if (CHA > 60) charClass = "Guild Master";
    else if (DEX > 60) charClass = "PR Rogue";

    const name = user.name || username;
    const joinYear = new Date(user.createdAt).getFullYear();

    const hpBar = Math.round((hp / hpMax) * 130);
    const mpBar = Math.round((mp / mpMax) * 130);
    const xpBar = Math.round((xp / 25) * 130);

    // Achievements list (max 3 per row, 2 rows = 6 total)
    const achievements: { icon: string; text: string; color: string }[] = [];
    if (commits > 50) achievements.push({ icon: "🔥", text: `${commits} Commits`, color: "#ff4060" });
    if (repos > 2) achievements.push({ icon: "📁", text: `${repos} Repos`, color: "#00d4ff" });
    if (langCount > 3) achievements.push({ icon: "💻", text: `${langCount} Languages`, color: "#00ffe7" });
    if (stars > 0) achievements.push({ icon: "⭐", text: `${stars} Stars`, color: "#ffcc00" });
    if (followers > 0) achievements.push({ icon: "👥", text: `${followers} Followers`, color: "#ff0080" });
    achievements.push({ icon: "🎮", text: "Pro Gamer", color: "#a78bfa" });
    achievements.push({ icon: "🤖", text: "ML Engineer", color: "#00d4ff" });
    achievements.push({ icon: "📱", text: "Android Dev", color: "#7fff00" });

    // Render achievements in rows of 3
    const achRows = [];
    for (let i = 0; i < Math.min(6, achievements.length); i++) {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = 310 + col * 88;
      const y = 230 + row * 26;
      const a = achievements[i];
      achRows.push(`
  <rect x="${x}" y="${y}" width="82" height="18" rx="4" fill="${a.color}18" stroke="${a.color}" stroke-width="0.7" opacity="0.9"/>
  <text x="${x + 41}" y="${y + 12}" text-anchor="middle" fill="${a.color}" font-size="8.5" font-family="monospace">${a.icon} ${a.text}</text>`);
    }

    const W = 560;
    const H = 340;

    const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#010b14"/>
      <stop offset="100%" style="stop-color:#091828"/>
    </linearGradient>
    <linearGradient id="hpg" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#cc0030"/>
      <stop offset="100%" style="stop-color:#ff6060"/>
    </linearGradient>
    <linearGradient id="mpg" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#0060cc"/>
      <stop offset="100%" style="stop-color:#00d4ff"/>
    </linearGradient>
    <linearGradient id="xpg" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#cc6600"/>
      <stop offset="100%" style="stop-color:#ffcc00"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="1.5" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- BG -->
  <rect width="${W}" height="${H}" rx="12" fill="url(#bg)" stroke="#00d4ff" stroke-width="0.8" stroke-opacity="0.5"/>

  <!-- Scanlines -->
  ${Array.from({ length: 34 }, (_, i) => `<line x1="0" y1="${i * 10}" x2="${W}" y2="${i * 10}" stroke="#00d4ff" stroke-width="0.2" stroke-opacity="0.05"/>`).join("")}

  <!-- Corners -->
  <polyline points="0,28 0,0 28,0" fill="none" stroke="#00d4ff" stroke-width="1.5" stroke-opacity="0.8" filter="url(#glow)"/>
  <polyline points="${W - 28},0 ${W},0 ${W},28" fill="none" stroke="#00d4ff" stroke-width="1.5" stroke-opacity="0.8" filter="url(#glow)"/>
  <polyline points="0,${H - 28} 0,${H} 28,${H}" fill="none" stroke="#ff0080" stroke-width="1.5" stroke-opacity="0.8" filter="url(#glow)"/>
  <polyline points="${W - 28},${H} ${W},${H} ${W},${H - 28}" fill="none" stroke="#ff0080" stroke-width="1.5" stroke-opacity="0.8" filter="url(#glow)"/>

  <!-- Title bar -->
  <rect x="1" y="1" width="${W - 2}" height="32" rx="11" fill="#020d1a" opacity="0.95"/>
  <text x="${W / 2}" y="21" text-anchor="middle" fill="#00d4ff" font-size="12" font-weight="bold" font-family="monospace" letter-spacing="4" filter="url(#glow)">◈  DEVELOPER  PROFILE  ◈</text>
  <line x1="20" y1="34" x2="${W - 20}" y2="34" stroke="#00d4ff" stroke-width="0.5" stroke-opacity="0.5"/>

  <!-- ══ LEFT PANEL (character) ══ -->
  <rect x="14" y="42" width="275" height="${H - 54}" rx="8" fill="#060f1e" stroke="#00d4ff" stroke-width="0.5" stroke-opacity="0.25"/>

  <!-- Avatar box -->
  <rect x="28" y="54" width="100" height="100" rx="6" fill="#020d1a" stroke="#00d4ff" stroke-width="0.8" stroke-opacity="0.5"/>

  <!-- Pixel character -->
  <g transform="translate(78, 105)" filter="url(#glow)">
    <rect x="-8" y="-22" width="16" height="24" rx="2" fill="#00d4ff" opacity="0.12"/>
    <rect x="-7" y="-38" width="14" height="14" rx="3" fill="#00d4ff" opacity="0.65"/>
    <rect x="10" y="-48" width="3" height="36" rx="1" fill="#00ffe7" opacity="0.9"/>
    <rect x="6" y="-20" width="12" height="3" rx="1" fill="#00ffe7" opacity="0.8"/>
    <rect x="-22" y="-32" width="12" height="16" rx="2" fill="#ff0080" opacity="0.7"/>
    <text x="-16" y="-22" text-anchor="middle" fill="#fff" font-size="8">✦</text>
    <circle cx="0" cy="-16" r="30" fill="none" stroke="#00d4ff" stroke-width="0.5" opacity="0.2"/>
  </g>

  <!-- Name / Class / Level -->
  <text x="145" y="72" fill="#ffffff" font-size="13" font-weight="bold" font-family="monospace" filter="url(#glow)">${name}</text>
  <text x="145" y="89" fill="#ff0080" font-size="9.5" font-family="monospace" letter-spacing="1">${charClass.toUpperCase()}</text>

  <!-- Level badge -->
  <rect x="145" y="96" width="56" height="16" rx="4" fill="#ff008018" stroke="#ff0080" stroke-width="0.8"/>
  <text x="173" y="108" text-anchor="middle" fill="#ff0080" font-size="9.5" font-weight="bold" font-family="monospace">LV. ${level}</text>

  <!-- Member since -->
  <text x="145" y="130" fill="#2a4a6a" font-size="8" font-family="monospace">Since ${joinYear}</text>

  <!-- HP / MP / XP bars -->
  <text x="28" y="172" fill="#ff4060" font-size="8.5" font-weight="bold" font-family="monospace">HP</text>
  <rect x="48" y="162" width="130" height="7" rx="3" fill="#0a1628"/>
  <rect x="48" y="162" width="${hpBar}" height="7" rx="3" fill="url(#hpg)"/>
  <text x="182" y="172" text-anchor="end" fill="#ff4060" font-size="7.5" font-family="monospace">${hp}/${hpMax}</text>

  <text x="28" y="188" fill="#00d4ff" font-size="8.5" font-weight="bold" font-family="monospace">MP</text>
  <rect x="48" y="178" width="130" height="7" rx="3" fill="#0a1628"/>
  <rect x="48" y="178" width="${mpBar}" height="7" rx="3" fill="url(#mpg)"/>
  <text x="182" y="188" text-anchor="end" fill="#00d4ff" font-size="7.5" font-family="monospace">${mp}/${mpMax}</text>

  <text x="28" y="204" fill="#ffcc00" font-size="8.5" font-weight="bold" font-family="monospace">XP</text>
  <rect x="48" y="194" width="130" height="7" rx="3" fill="#0a1628"/>
  <rect x="48" y="194" width="${xpBar}" height="7" rx="3" fill="url(#xpg)"/>
  <text x="182" y="204" text-anchor="end" fill="#ffcc00" font-size="7.5" font-family="monospace">${xp}/25</text>

  <line x1="20" y1="215" x2="276" y2="215" stroke="#00d4ff" stroke-width="0.4" stroke-opacity="0.3"/>

  <!-- BASE STATS list -->
  <text x="130" y="228" text-anchor="middle" fill="#ff0080" font-size="9" font-family="monospace" letter-spacing="2">── BASE STATS ──</text>

  ${statRow("Strength", "STR", STR, "#ff4060", 248)}
  ${statRow("Intelligence", "INT", INT, "#00d4ff", 263)}
  ${statRow("Dexterity", "DEX", DEX, "#00ffe7", 278)}
  ${statRow("Vitality", "VIT", VIT, "#7fff00", 293)}
  ${statRow("Wisdom", "WIS", WIS, "#ffcc00", 308)}
  ${statRow("Charisma", "CHA", CHA, "#ff0080", 323)}

  <!-- ══ RIGHT PANEL (achievements) ══ -->
  <rect x="299" y="42" width="247" height="${H - 54}" rx="8" fill="#060f1e" stroke="#ff0080" stroke-width="0.5" stroke-opacity="0.25"/>

  <!-- Rank circle (top right) -->
  <circle cx="435" cy="110" r="55" fill="none" stroke="#0d2a3a" stroke-width="7"/>
  <circle cx="435" cy="110" r="55" fill="none" stroke="url(#hpg)" stroke-width="7"
    stroke-dasharray="${Math.round(((STR + INT + DEX + VIT + WIS + CHA) / 594) * 345)} 345"
    stroke-dashoffset="86"
    stroke-linecap="round"
    filter="url(#glow)"/>
  <text x="435" y="103" text-anchor="middle" fill="#00d4ff" font-size="22" font-weight="bold" font-family="monospace" filter="url(#glow)">${level < 20 ? "B" : level < 40 ? "A" : level < 60 ? "S" : level < 80 ? "SS" : "SSS"}</text>
  <text x="435" y="120" text-anchor="middle" fill="#7ec8e3" font-size="8" font-family="monospace">RANK</text>
  <text x="435" y="136" text-anchor="middle" fill="#ff0080" font-size="9" font-weight="bold" font-family="monospace" filter="url(#glow)">LV.${level}</text>

  <!-- Achievements title -->
  <line x1="313" y1="217" x2="534" y2="217" stroke="#00ffe7" stroke-width="0.4" stroke-opacity="0.4"/>
  <text x="423" y="213" text-anchor="middle" fill="#00ffe7" font-size="9" font-family="monospace" letter-spacing="2">── ACHIEVEMENTS ──</text>

  <!-- Achievement badges (3 per row, max 6) -->
  ${achRows.join("")}

  <!-- Footer -->
  <line x1="20" y1="${H - 18}" x2="${W - 20}" y2="${H - 18}" stroke="#00d4ff" stroke-width="0.3" stroke-opacity="0.35"/>
  <text x="${W / 2}" y="${H - 7}" text-anchor="middle" fill="#1a3a5a" font-size="7.5" font-family="monospace" letter-spacing="1">FULLSTACK · ANDROID · ML · DEVOPS · @Hariss19id</text>
</svg>`;

    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=1800, s-maxage=1800",
      },
    });
  } catch (e) {
    console.error(e);
    return new NextResponse(
      `<svg xmlns="http://www.w3.org/2000/svg" width="560" height="80">
        <rect width="560" height="80" rx="12" fill="#010b14" stroke="#ff0080" stroke-width="1"/>
        <text x="280" y="45" text-anchor="middle" fill="#ff0080" font-size="12" font-family="monospace">⚠ RPG Card error — check GH_TOKEN env var</text>
      </svg>`,
      { headers: { "Content-Type": "image/svg+xml" } }
    );
  }
}
