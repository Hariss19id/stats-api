import { NextRequest, NextResponse } from "next/server";

const GH_TOKEN = process.env.GH_TOKEN;

async function fetchGitHubStats(username: string) {
  const query = `
    query($login: String!) {
      user(login: $login) {
        name
        login
        followers { totalCount }
        repositories(first: 100, ownerAffiliations: OWNER, isFork: false) {
          nodes {
            stargazerCount
            primaryLanguage { name }
          }
          totalCount
        }
        contributionsCollection {
          totalCommitContributions
          totalPullRequestContributions
          totalIssueContributions
          totalRepositoryContributions
          contributionCalendar { totalContributions }
        }
        pullRequests(states: MERGED) { totalCount }
        issues { totalCount }
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
  return json.data?.user;
}

function calcRank(data: {
  commits: number;
  prs: number;
  issues: number;
  stars: number;
  followers: number;
  repos: number;
}) {
  const score =
    data.commits * 2 +
    data.prs * 3 +
    data.issues * 1 +
    data.stars * 4 +
    data.followers * 1 +
    data.repos * 1;

  if (score >= 3000) return { rank: "S++", pct: 99 };
  if (score >= 1500) return { rank: "S+", pct: 95 };
  if (score >= 800) return { rank: "S", pct: 90 };
  if (score >= 400) return { rank: "A++", pct: 80 };
  if (score >= 200) return { rank: "A+", pct: 70 };
  if (score >= 100) return { rank: "A", pct: 60 };
  if (score >= 50) return { rank: "B+", pct: 45 };
  return { rank: "B", pct: 30 };
}

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username") || "Hariss19id";

  try {
    const user = await fetchGitHubStats(username);
    if (!user) throw new Error("User not found");

    const stars = user.repositories.nodes.reduce(
      (a: number, r: { stargazerCount: number }) => a + r.stargazerCount,
      0
    );
    const commits =
      user.contributionsCollection.contributionCalendar.totalContributions;
    const prs = user.pullRequests.totalCount;
    const issues = user.issues.totalCount;
    const followers = user.followers.totalCount;
    const repos = user.repositories.totalCount;

    const { rank, pct } = calcRank({ commits, prs, issues, stars, followers, repos });
    const barWidth = Math.round((pct / 100) * 200);

    const svg = `<svg width="470" height="200" viewBox="0 0 470 200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#010b14"/>
      <stop offset="100%" style="stop-color:#0d1b2a"/>
    </linearGradient>
    <linearGradient id="bar" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#ff0080"/>
      <stop offset="100%" style="stop-color:#00d4ff"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
      <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <style>
      text { font-family: 'JetBrains Mono', 'Courier New', monospace; }
    </style>
  </defs>

  <!-- Background -->
  <rect width="470" height="200" rx="12" fill="url(#bg)" stroke="#00d4ff" stroke-width="0.8" stroke-opacity="0.4"/>

  <!-- Corner accents -->
  <line x1="0" y1="20" x2="20" y2="0" stroke="#00d4ff" stroke-width="1" stroke-opacity="0.6"/>
  <line x1="450" y1="0" x2="470" y2="20" stroke="#00d4ff" stroke-width="1" stroke-opacity="0.6"/>
  <line x1="0" y1="180" x2="20" y2="200" stroke="#00d4ff" stroke-width="1" stroke-opacity="0.6"/>
  <line x1="450" y1="200" x2="470" y2="180" stroke="#00d4ff" stroke-width="1" stroke-opacity="0.6"/>

  <!-- Title -->
  <text x="25" y="32" fill="#00d4ff" font-size="13" font-weight="bold" filter="url(#glow)">◈ ${user.name || username}'s GitHub Stats</text>
  <line x1="25" y1="42" x2="445" y2="42" stroke="#00d4ff" stroke-width="0.5" stroke-opacity="0.4"/>

  <!-- Stats Items -->
  <text x="25" y="66" fill="#7ec8e3" font-size="11">⭐  Total Stars</text>
  <text x="310" y="66" fill="#ffffff" font-size="11" font-weight="bold">${stars.toLocaleString()}</text>

  <text x="25" y="88" fill="#7ec8e3" font-size="11">📦  Total Commits</text>
  <text x="310" y="88" fill="#ffffff" font-size="11" font-weight="bold">${commits.toLocaleString()}</text>

  <text x="25" y="110" fill="#7ec8e3" font-size="11">🔀  Pull Requests</text>
  <text x="310" y="110" fill="#ffffff" font-size="11" font-weight="bold">${prs.toLocaleString()}</text>

  <text x="25" y="132" fill="#7ec8e3" font-size="11">🐛  Issues</text>
  <text x="310" y="132" fill="#ffffff" font-size="11" font-weight="bold">${issues.toLocaleString()}</text>

  <text x="25" y="154" fill="#7ec8e3" font-size="11">📁  Repositories</text>
  <text x="310" y="154" fill="#ffffff" font-size="11" font-weight="bold">${repos.toLocaleString()}</text>

  <!-- Rank circle -->
  <circle cx="405" cy="105" r="45" fill="none" stroke="#0d2a3a" stroke-width="6"/>
  <circle cx="405" cy="105" r="45" fill="none" stroke="url(#bar)" stroke-width="6"
    stroke-dasharray="${Math.round(pct * 2.827)} 283"
    stroke-dashoffset="71"
    stroke-linecap="round"
    filter="url(#glow)"/>
  <text x="405" y="100" text-anchor="middle" fill="#00d4ff" font-size="18" font-weight="bold" filter="url(#glow)">${rank}</text>
  <text x="405" y="118" text-anchor="middle" fill="#7ec8e3" font-size="9">RANK</text>

  <!-- Progress bar -->
  <text x="25" y="178" fill="#7ec8e3" font-size="9">SCORE</text>
  <rect x="70" y="168" width="200" height="6" rx="3" fill="#0d2a3a"/>
  <rect x="70" y="168" width="${barWidth}" height="6" rx="3" fill="url(#bar)" filter="url(#glow)"/>
  <text x="280" y="178" fill="#00d4ff" font-size="9">${pct}%</text>
</svg>`;

    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=1800, s-maxage=1800",
      },
    });
  } catch {
    return new NextResponse(`<svg xmlns="http://www.w3.org/2000/svg" width="470" height="100">
      <rect width="470" height="100" rx="12" fill="#010b14" stroke="#ff0080" stroke-width="1"/>
      <text x="235" y="55" text-anchor="middle" fill="#ff0080" font-size="13" font-family="monospace">⚠ Failed to load stats — check GH_TOKEN</text>
    </svg>`, {
      headers: { "Content-Type": "image/svg+xml" },
    });
  }
}
