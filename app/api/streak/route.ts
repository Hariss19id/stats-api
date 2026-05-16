import { NextRequest, NextResponse } from "next/server";

const GH_TOKEN = process.env.GH_TOKEN;

async function fetchContributions(username: string) {
  const now = new Date();
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(now.getFullYear() - 1);

  const query = `
    query($login: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $login) {
        name
        createdAt
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                date
                contributionCount
              }
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
    body: JSON.stringify({
      query,
      variables: {
        login: username,
        from: oneYearAgo.toISOString(),
        to: now.toISOString(),
      },
    }),
    next: { revalidate: 1800 },
  });

  const json = await res.json();
  return json.data?.user;
}

function calcStreak(days: { date: string; contributionCount: number }[]) {
  const sorted = [...days].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let currentStreak = 0;
  let maxStreak = 0;
  let tempStreak = 0;
  let lastDate: Date | null = null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const day of sorted) {
    const d = new Date(day.date);
    if (day.contributionCount > 0) {
      if (lastDate) {
        const diff = (d.getTime() - lastDate.getTime()) / 86400000;
        if (diff === 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      } else {
        tempStreak = 1;
      }
      if (tempStreak > maxStreak) maxStreak = tempStreak;
      lastDate = d;
    } else {
      tempStreak = 0;
      lastDate = null;
    }
  }

  // Calculate current streak from today backwards
  const sortedDesc = [...sorted].reverse();
  let counting = true;
  for (const day of sortedDesc) {
    if (!counting) break;
    if (day.contributionCount > 0) {
      currentStreak++;
    } else if (currentStreak > 0) {
      counting = false;
    }
  }

  return { currentStreak, maxStreak };
}

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username") || "Hariss19id";

  try {
    const user = await fetchContributions(username);
    if (!user) throw new Error("User not found");

    const allDays =
      user.contributionsCollection.contributionCalendar.weeks.flatMap(
        (w: { contributionDays: { date: string; contributionCount: number }[] }) =>
          w.contributionDays
      );

    const total =
      user.contributionsCollection.contributionCalendar.totalContributions;
    const { currentStreak, maxStreak } = calcStreak(allDays);

    const joinYear = new Date(user.createdAt).getFullYear();
    const thisYear = new Date().getFullYear();
    const yearsOnGH = thisYear - joinYear || 1;

    const svg = `<svg width="520" height="160" viewBox="0 0 520 160" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sbg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#010b14"/>
      <stop offset="100%" style="stop-color:#0d1b2a"/>
    </linearGradient>
    <linearGradient id="fire" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#ff0080"/>
      <stop offset="100%" style="stop-color:#ff6600"/>
    </linearGradient>
    <filter id="glow3">
      <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
      <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <rect width="520" height="160" rx="12" fill="url(#sbg)" stroke="#00d4ff" stroke-width="0.8" stroke-opacity="0.4"/>

  <!-- Corner accents -->
  <line x1="0" y1="18" x2="18" y2="0" stroke="#ff0080" stroke-width="1.2" stroke-opacity="0.6"/>
  <line x1="502" y1="0" x2="520" y2="18" stroke="#ff0080" stroke-width="1.2" stroke-opacity="0.6"/>
  <line x1="0" y1="142" x2="18" y2="160" stroke="#ff0080" stroke-width="1.2" stroke-opacity="0.6"/>
  <line x1="502" y1="160" x2="520" y2="142" stroke="#ff0080" stroke-width="1.2" stroke-opacity="0.6"/>

  <!-- Title -->
  <text x="260" y="26" text-anchor="middle" fill="#00d4ff" font-size="12" font-weight="bold" font-family="monospace" filter="url(#glow3)">◈ CONTRIBUTION STREAK ◈</text>
  <line x1="25" y1="34" x2="495" y2="34" stroke="#00d4ff" stroke-width="0.5" stroke-opacity="0.3"/>

  <!-- Dividers -->
  <line x1="174" y1="44" x2="174" y2="148" stroke="#00d4ff" stroke-width="0.5" stroke-opacity="0.3"/>
  <line x1="348" y1="44" x2="348" y2="148" stroke="#00d4ff" stroke-width="0.5" stroke-opacity="0.3"/>

  <!-- TOTAL CONTRIBUTIONS -->
  <text x="87" y="72" text-anchor="middle" fill="#7ec8e3" font-size="10" font-family="monospace">Total Contributions</text>
  <text x="87" y="108" text-anchor="middle" fill="#00d4ff" font-size="32" font-weight="bold" font-family="monospace" filter="url(#glow3)">${total}</text>
  <text x="87" y="130" text-anchor="middle" fill="#7ec8e3" font-size="9" font-family="monospace">Last ${yearsOnGH} year${yearsOnGH > 1 ? "s" : ""}</text>

  <!-- CURRENT STREAK (center, biggest) -->
  <text x="260" y="65" text-anchor="middle" fill="#ff0080" font-size="11" font-family="monospace" filter="url(#glow3)">🔥 Current Streak</text>
  <text x="260" y="115" text-anchor="middle" fill="#ffffff" font-size="44" font-weight="bold" font-family="monospace" filter="url(#glow3)">${currentStreak}</text>
  <text x="260" y="135" text-anchor="middle" fill="#ff0080" font-size="10" font-family="monospace">day${currentStreak !== 1 ? "s" : ""}</text>

  <!-- LONGEST STREAK -->
  <text x="434" y="72" text-anchor="middle" fill="#7ec8e3" font-size="10" font-family="monospace">Longest Streak</text>
  <text x="434" y="108" text-anchor="middle" fill="#00ffe7" font-size="32" font-weight="bold" font-family="monospace" filter="url(#glow3)">${maxStreak}</text>
  <text x="434" y="130" text-anchor="middle" fill="#7ec8e3" font-size="9" font-family="monospace">day${maxStreak !== 1 ? "s" : ""} best</text>
</svg>`;

    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=1800, s-maxage=1800",
      },
    });
  } catch {
    return new NextResponse(
      `<svg xmlns="http://www.w3.org/2000/svg" width="520" height="80">
        <rect width="520" height="80" rx="12" fill="#010b14" stroke="#ff0080" stroke-width="1"/>
        <text x="260" y="45" text-anchor="middle" fill="#ff0080" font-size="12" font-family="monospace">⚠ Failed to load streak data</text>
      </svg>`,
      { headers: { "Content-Type": "image/svg+xml" } }
    );
  }
}
