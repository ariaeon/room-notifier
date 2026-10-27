import ical from "node-ical";

const courseStyles = {
  "Object-oriented Software Development I": {
    color: 5763719,
    thumbnail: {
      url: "https://cdn.discordapp.com/emojis/1277686484786217081.webp?animated=true",
    },
  },
  "Software Analysis": {
    color: 16711680,
    thumbnail: {
      url: "https://cdn.discordapp.com/emojis/1153638728468799578.webp?size=96",
    },
  },
  Databases: {
    color: 16776960,
    thumbnail: {
      url: "https://cdn.discordapp.com/emojis/545156143870246924.webp?size=96",
    },
  },
  "IT Fundamentals": {
    color: 16776960,
    thumbnail: {
      url: "https://cdn.discordapp.com/emojis/1274898393054974043.webp?size=96",
    },
  },
  "Computer Fundamentals": {
    color: 16776960,
    thumbnail: {
      url: "https://cdn.discordapp.com/emojis/721383316938293248.webp?size=96&animated=true",
    },
  },
  "Web Development I": {
    color: 16776960,
    thumbnail: {
      url: "https://cdn.discordapp.com/emojis/1138851376756170863.webp?size=96",
    },
  },
};
const DEFAULT_THUMBNAIL_URL =
  "https://cdn.discordapp.com/emojis/1277686484786217081.webp?animated=true";

async function getICS() {
  const url = process.env.ICS_URL;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }
    return await response.text();
  } catch (error) {
    console.error(error.message);
  }
}

async function notify(embed) {
  const url = process.env.DISCORD_WEBHOOK_URL;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ embeds: [embed] }),
    });
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }
  } catch (error) {
    console.error(error.message);
  }
}

function createEmbed(body) {
  const { start, location, summary } = body;
  const courseName = summary.split(",")[0].replace("PBA-TIN/", "");
  const timeFormatted = start.toLocaleTimeString("nl-BE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Brussels",
  });
  const [lokaal, campus] = location?.split("Campus: ");
  const lokaalShort = lokaal.split(" ")[0];
  const duration = new Date(body.end - body.start).getUTCHours();

  return {
    title: courseName,
    color: 5763719,
    thumbnail: {
      url: courseStyles[courseName]?.thumbnail?.url || DEFAULT_THUMBNAIL_URL,
    },
    fields: [
      {
        name: "Time",
        value: `${timeFormatted} (${duration} uur) `,
      },
      {
        name: "Location",
        value: lokaalShort,
        inline: true,
      },
      campus &&
        campus !== "Schoonmeersen" && {
          name: "Campus",
          value: campus,
          inline: true,
        },
    ].filter(Boolean),
  };
}

const ics = await getICS();
if (!ics) {
  console.error("Failed to fetch ICS data.");
  process.exit(1);
}

const currentTime = new Date();
const events = Object.values(ical.parseICS(ics))
  .filter((e) => e.type === "VEVENT" && e.location)
  .sort((a, b) => a.start - b.start);

// get a random one
// const randomEvent = events[Math.floor(Math.random() * events.length)];
// Runs every 15 min; round down so a delayed run still counts as its scheduled slot
const SLOT_MS = 15 * 60 * 1000;
const LEAD_MS = 60 * 60 * 1000;
const slot = Math.floor(currentTime / SLOT_MS) * SLOT_MS;

// Classes starting 45–60 min after this slot, so each one is announced once, ~1h ahead
const nextEvent = events.find((e) => {
  const untilStart = e.start - slot;
  return untilStart > LEAD_MS - SLOT_MS && untilStart <= LEAD_MS;
});
if (nextEvent) {
  const embed = createEmbed(nextEvent);
  await notify(embed);
} else {
  console.log("No events starting in about an hour.");
}
