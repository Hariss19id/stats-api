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
          totalCommitContributions
          totalPullRequestContributions
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

function bar(value: number, max: number, width: number, color: string, x: number, y: number) {
  const filled = Math.round((Math.min(value, max) / max) * width);
  return `
    <rect x="${x}" y="${y}" width="${width}" height="7" rx="3" fill="#0a1628"/>
    <rect x="${x}" y="${y}" width="${filled}" height="7" rx="3" fill="${color}" opacity="0.9"/>`;
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

    // Collect unique languages
    const langSet = new Set<string>();
    user.repositories.nodes.forEach((r: { languages: { nodes: { name: string }[] } }) =>
      r.languages.nodes.forEach((l) => langSet.add(l.name))
    );
    const langCount = langSet.size;

    // RPG Stats (scaled)
    const STR = Math.min(99, Math.round(commits / 5));       // Commits → STR
    const INT = Math.min(99, langCount * 6);                  // Languages → INT
    const DEX = Math.min(99, prs * 4 + 10);                  // PRs → DEX
    const VIT = Math.min(99, repos * 3);                      // Repos → VIT
    const WIS = Math.min(99, stars * 8 + 5);                 // Stars → WIS
    const CHA = Math.min(99, followers * 5 + 20);            // Followers → CHA

    // Level & XP
    const totalScore = STR + INT + DEX + VIT + WIS + CHA;
    const level = Math.min(99, Math.floor(totalScore / 30) + 1);
    const xp = totalScore % 30;
    const xpNeeded = 30;

    // HP/MP
    const hp = Math.min(9999, commits * 8 + stars * 15);
    const mp = Math.min(999, langCount * 40 + prs * 10);
    const hpMax = Math.max(hp, 500);
    const mpMax = Math.max(mp, 200);

    // Class
    let charClass = "Code Warrior";
    if (INT > 70 && STR > 50) charClass = "Arcane Engineer";
    else if (STR > 70) charClass = "Commit Berserker";
    else if (INT > 70) charClass = "Syntax Mage";
    else if (CHA > 60) charClass = "Guild Master";
    else if (DEX > 60) charClass = "PR Rogue";

    const name = user.name || username;
    const joinYear = new Date(user.createdAt).getFullYear();

    const W = 520;
    const H = 380;

    const statBar = (label: string, val: number, color: string, x: number, y: number) => `
      <text x="${x}" y="${y}" fill="#7ec8e3" font-size="9" font-family="monospace">${label}</text>
      <text x="${x + 26}" y="${y}" fill="${color}" font-size="9" font-family="monospace" font-weight="bold">${val}</text>
      ${bar(val, 99, 80, color, x + 46, y - 7)}`;

    const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="rpgbg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#010b14"/>
      <stop offset="50%" style="stop-color:#0a1628"/>
      <stop offset="100%" style="stop-color:#010b14"/>
    </linearGradient>
    <linearGradient id="hpbar" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#ff0040"/>
      <stop offset="100%" style="stop-color:#ff6060"/>
    </linearGradient>
    <linearGradient id="mpbar" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#0080ff"/>
      <stop offset="100%" style="stop-color:#00d4ff"/>
    </linearGradient>
    <linearGradient id="xpbar" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#ff0080"/>
      <stop offset="100%" style="stop-color:#ffcc00"/>
    </linearGradient>
    <linearGradient id="panelbg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#0d2040"/>
      <stop offset="100%" style="stop-color:#060f1a"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="softglow">
      <feGaussianBlur stdDeviation="1" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- Main background -->
  <rect width="${W}" height="${H}" rx="14" fill="url(#rpgbg)" stroke="#00d4ff" stroke-width="1" stroke-opacity="0.5"/>

  <!-- Scanline effect -->
  ${Array.from({length: 38}, (_, i) => `<line x1="0" y1="${i * 10}" x2="${W}" y2="${i * 10}" stroke="#00d4ff" stroke-width="0.3" stroke-opacity="0.04"/>`).join('')}

  <!-- Corner decorations -->
  <polyline points="0,30 0,0 30,0" fill="none" stroke="#00d4ff" stroke-width="2" stroke-opacity="0.8" filter="url(#glow)"/>
  <polyline points="${W-30},0 ${W},0 ${W},30" fill="none" stroke="#00d4ff" stroke-width="2" stroke-opacity="0.8" filter="url(#glow)"/>
  <polyline points="0,${H-30} 0,${H} 30,${H}" fill="none" stroke="#ff0080" stroke-width="2" stroke-opacity="0.8" filter="url(#glow)"/>
  <polyline points="${W-30},${H} ${W},${H} ${W},${H-30}" fill="none" stroke="#ff0080" stroke-width="2" stroke-opacity="0.8" filter="url(#glow)"/>

  <!-- Title bar -->
  <rect x="0" y="0" width="${W}" height="36" rx="14" fill="#050e1a" opacity="0.9"/>
  <rect x="0" y="20" width="${W}" height="16" fill="#050e1a" opacity="0.9"/>
  <text x="${W/2}" y="24" text-anchor="middle" fill="#00d4ff" font-size="13" font-weight="bold" font-family="monospace" letter-spacing="3" filter="url(#glow)">◈ DEVELOPER PROFILE ◈</text>

  <!-- Divider -->
  <line x1="20" y1="38" x2="${W-20}" y2="38" stroke="#00d4ff" stroke-width="0.6" stroke-opacity="0.5"/>

  <!-- ══ LEFT PANEL: Character ══ -->
  <rect x="14" y="46" width="155" height="245" rx="8" fill="url(#panelbg)" stroke="#00d4ff" stroke-width="0.5" stroke-opacity="0.3"/>

  <!-- Avatar frame (pixel art sword icon) -->
  <rect x="34" y="58" width="115" height="115" rx="6" fill="#020d1a" stroke="#00d4ff" stroke-width="1" stroke-opacity="0.6"/>

  <!-- Pixel art character (sword + shield silhouette) -->
  <g transform="translate(91, 116)" filter="url(#glow)">
    <!-- Body -->
    <rect x="-8" y="-20" width="16" height="22" rx="2" fill="#00d4ff" opacity="0.15"/>
    <!-- Head -->
    <rect x="-7" y="-35" width="14" height="14" rx="3" fill="#00d4ff" opacity="0.7"/>
    <!-- Sword -->
    <rect x="10" y="-45" width="3" height="35" rx="1" fill="#00ffe7" opacity="0.9"/>
    <rect x="6" y="-18" width="11" height="3" rx="1" fill="#00ffe7" opacity="0.8"/>
    <!-- Shield -->
    <rect x="-20" y="-30" width="12" height="15" rx="2" fill="#ff0080" opacity="0.7"/>
    <text x="-14" y="-20" text-anchor="middle" fill="#fff" font-size="8" opacity="0.9">✦</text>
    <!-- Glow aura -->
    <circle cx="0" cy="-15" r="28" fill="none" stroke="#00d4ff" stroke-width="0.5" opacity="0.3"/>
    <circle cx="0" cy="-15" r="35" fill="none" stroke="#00d4ff" stroke-width="0.3" opacity="0.15"/>
  </g>

  <!-- Name & Class -->
  <text x="91" y="188" text-anchor="middle" fill="#ffffff" font-size="12" font-weight="bold" font-family="monospace" filter="url(#softglow)">${name}</text>
  <text x="91" y="202" text-anchor="middle" fill="#ff0080" font-size="9" font-family="monospace" letter-spacing="1" filter="url(#softglow)">${charClass.toUpperCase()}</text>

  <!-- Level badge -->
  <rect x="60" y="210" width="62" height="18" rx="4" fill="#ff0080" opacity="0.15" stroke="#ff0080" stroke-width="0.8"/>
  <text x="91" y="223" text-anchor="middle" fill="#ff0080" font-size="10" font-weight="bold" font-family="monospace">LV. ${level}</text>

  <!-- HP Bar -->
  <text x="24" y="244" fill="#ff4060" font-size="8" font-family="monospace">HP</text>
  <rect x="42" y="235" width="118" height="7" rx="3" fill="#0a1628"/>
  <rect x="42" y="235" width="${Math.round((hp/hpMax)*118)}" height="7" rx="3" fill="url(#hpbar)"/>
  <text x="163" y="244" text-anchor="end" fill="#ff4060" font-size="7" font-family="monospace">${hp}/${hpMax}</text>

  <!-- MP Bar -->
  <text x="24" y="258" fill="#00d4ff" font-size="8" font-family="monospace">MP</text>
  <rect x="42" y="249" width="118" height="7" rx="3" fill="#0a1628"/>
  <rect x="42" y="249" width="${Math.round((mp/mpMax)*118)}" height="7" rx="3" fill="url(#mpbar)"/>
  <text x="163" y="258" text-anchor="end" fill="#00d4ff" font-size="7" font-family="monospace">${mp}/${mpMax}</text>

  <!-- XP Bar -->
  <text x="24" y="272" fill="#ffcc00" font-size="8" font-family="monospace">XP</text>
  <rect x="42" y="263" width="118" height="7" rx="3" fill="#0a1628"/>
  <rect x="42" y="263" width="${Math.round((xp/xpNeeded)*118)}" height="7" rx="3" fill="url(#xpbar)"/>
  <text x="163" y="272" text-anchor="end" fill="#ffcc00" font-size="7" font-family="monospace">${xp}/${xpNeeded}</text>

  <!-- Since year -->
  <text x="91" y="288" text-anchor="middle" fill="#3a6a8a" font-size="8" font-family="monospace">Playing since ${joinYear}</text>

  <!-- ══ RIGHT PANEL: Stats ══ -->
  <rect x="179" y="46" width="328" height="160" rx="8" fill="url(#panelbg)" stroke="#ff0080" stroke-width="0.5" stroke-opacity="0.3"/>
  <text x="343" y="66" text-anchor="middle" fill="#ff0080" font-size="10" font-weight="bold" font-family="monospace" letter-spacing="2" filter="url(#softglow)">── BASE STATS ──</text>
  <line x1="193" y1="72" x2="493" y2="72" stroke="#ff0080" stroke-width="0.4" stroke-opacity="0.4"/>

  <!-- Stat bars (2 columns) -->
  ${statBar("STR", STR, "#ff4060", 193, 92)}
  ${statBar("INT", INT, "#00d4ff", 193, 112)}
  ${statBar("DEX", DEX, "#00ffe7", 193, 132)}
  ${statBar("VIT", VIT, "#7fff00", 345, 92)}
  ${statBar("WIS", WIS, "#ffcc00", 345, 112)}
  ${statBar("CHA", CHA, "#ff0080", 345, 132)}

  <line x1="193" y1="148" x2="493" y2="148" stroke="#00d4ff" stroke-width="0.4" stroke-opacity="0.3"/>

  <!-- Stat legend -->
  <text x="193" y="162" fill="#2a4a6a" font-size="8" font-family="monospace">STR=Commits  INT=Languages  DEX=PRs  VIT=Repos  WIS=Stars  CHA=Followers</text>

  <!-- ══ BOTTOM: Achievements ══ -->
  <rect x="179" y="216" width="328" height="75" rx="8" fill="url(#panelbg)" stroke="#00ffe7" stroke-width="0.5" stroke-opacity="0.3"/>
  <text x="343" y="235" text-anchor="middle" fill="#00ffe7" font-size="10" font-weight="bold" font-family="monospace" letter-spacing="2" filter="url(#softglow)">── ACHIEVEMENTS ──</text>
  <line x1="193" y1="240" x2="493" y2="240" stroke="#00ffe7" stroke-width="0.4" stroke-opacity="0.4"/>

  <!-- Achievement badges -->
  ${commits > 100 ? `<g filter="url(#softglow)"><rect x="193" y="248" width="70" height="20" rx="4" fill="#ff008020" stroke="#ff0080" stroke-width="0.8"/><text x="228" y="262" text-anchor="middle" fill="#ff0080" font-size="9" font-family="monospace">🔥 ${commits}+ Commits</text></g>` : ''}
  ${repos > 3 ? `<g filter="url(#softglow)"><rect x="270" y="248" width="65" height="20" rx="4" fill="#00d4ff20" stroke="#00d4ff" stroke-width="0.8"/><text x="302" y="262" text-anchor="middle" fill="#00d4ff" font-size="9" font-family="monospace">📁 ${repos} Repos</text></g>` : ''}
  ${langCount > 4 ? `<g filter="url(#softglow)"><rect x="342" y="248" width="75" height="20" rx="4" fill="#00ffe720" stroke="#00ffe7" stroke-width="0.8"/><text x="379" y="262" text-anchor="middle" fill="#00ffe7" font-size="9" font-family="monospace">💻 ${langCount} Languages</text></g>` : ''}
  ${stars > 0 ? `<g filter="url(#softglow)"><rect x="424" y="248" width="60" height="20" rx="4" fill="#ffcc0020" stroke="#ffcc00" stroke-width="0.8"/><text x="454" y="262" text-anchor="middle" fill="#ffcc00" font-size="9" font-family="monospace">⭐ ${stars} Stars</text></g>` : ''}

  ${followers > 0 ? `<g filter="url(#softglow)"><rect x="193" y="272" width="70" height="14" rx="3" fill="#ff008015" stroke="#ff0080" stroke-width="0.5"/><text x="228" y="282" text-anchor="middle" fill="#ff0080" font-size="8" font-family="monospace">👥 ${followers} Followers</text></g>` : ''}
  <g filter="url(#softglow)"><rect x="270" y="272" width="65" height="14" rx="3" fill="#00d4ff15" stroke="#00d4ff" stroke-width="0.5"/><text x="302" y="282" text-anchor="middle" fill="#00d4ff" font-size="8" font-family="monospace">🎮 Pro Gamer</text></g>
  <g filter="url(#softglow)"><rect x="342" y="272" width="80" height="14" rx="3" fill="#00ffe715" stroke="#00ffe7" stroke-width="0.5"/><text x="382" y="282" text-anchor="middle" fill="#00ffe7" font-size="8" font-family="monospace">🤖 ML Practitioner</text></g>

  <!-- ══ BOTTOM FOOTER ══ -->
  <line x1="20" y1="${H-30}" x2="${W-20}" y2="${H-30}" stroke="#00d4ff" stroke-width="0.4" stroke-opacity="0.4"/>
  <text x="${W/2}" y="${H-14}" text-anchor="middle" fill="#1a3a5a" font-size="8" font-family="monospace" letter-spacing="1">FULL-STACK · ANDROID · ML · DEVOPS · @Hariss19id</text>
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
      `<svg xmlns="http://www.w3.org/2000/svg" width="520" height="100">
        <rect width="520" height="100" rx="12" fill="#010b14" stroke="#ff0080" stroke-width="1"/>
        <text x="260" y="55" text-anchor="middle" fill="#ff0080" font-size="12" font-family="monospace">⚠ RPG Card failed — check GH_TOKEN</text>
      </svg>`,
      { headers: { "Content-Type": "image/svg+xml" } }
    );
  }
}
