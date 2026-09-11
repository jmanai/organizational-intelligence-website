const DIMENSIONS = {
  MEET: {
    name: "Meetings",
    bands: [
      [75, "Meetings are earning their place", "Protect the system by continuing to question recurring meetings and designing around outcomes."],
      [50, "Meeting creep", "Some meetings work; others may survive because nobody has challenged them."],
      [0, "Meeting debt", "Your calendar may be carrying meetings that do not produce enough value for the time they consume."]
    ],
    recommendation: ["Better Meetings", "Audit and redesign the meeting landscape: calculate its cost, retire what has stopped earning its place, and improve the meetings worth keeping."]
  },
  DECIDE: {
    name: "Decisions",
    bands: [
      [75, "Decisions move", "People generally understand how decisions happen and where authority sits."],
      [50, "Decision friction", "Consensus, escalation, or unclear ownership may be slowing decisions."],
      [0, "Decision gridlock", "Too much decision-making may depend on hierarchy, consensus, or figuring out who is allowed to decide."]
    ],
    recommendation: ["A decision rights working session", "Make decision-making explicit: who decides what, how each type of decision gets made, what needs consultation, and what stays decided."]
  },
  SHARE: {
    name: "Information",
    bands: [
      [75, "Information flows", "People can generally access the context they need without chasing it."],
      [50, "Information pockets", "Too much information may depend on being in the right meeting, channel, or conversation."],
      [0, "Information bottlenecks", "Knowledge may be concentrated around individuals, meetings, or leadership, making autonomy difficult."]
    ],
    recommendation: ["An information flow working session", "Design how information actually travels: what is visible by default, where work in progress lives, and what people should never have to ask for."]
  },
  AGREE: {
    name: "Agreements",
    bands: [
      [75, "Explicit agreements", "Your team has consciously discussed how it wants to work."],
      [50, "Unwritten rules", "Some expectations are shared; others are learned through observation and interpretation."],
      [0, "Everyone has their own operating manual", "People may be working from different assumptions about communication, autonomy, responsiveness, and collaboration."]
    ],
    recommendation: ["A Team Agreements workshop", "Turn the unwritten rules into real agreements: communication, decisions, autonomy, responsiveness, and what happens when you disagree."]
  },
  ALIGN: {
    name: "Alignment",
    bands: [
      [75, "Shared direction", "People understand what matters and can connect everyday work to it."],
      [50, "Direction with gaps", "Broad direction may be understood, but priorities and trade-offs are not always clear enough to guide everyday decisions."],
      [0, "Competing maps", "People may be working hard toward different interpretations of what matters."]
    ],
    recommendation: ["A strategy and alignment working session", "Build shared direction rather than presenting it: surface assumptions, make trade-offs discussable, and connect everyday work to what matters."]
  }
};

const OVERALL_TEXT = {
  "Deliberately Designed": "Your team has made many conscious choices about how work happens. Keep inspecting the system so today's deliberate choices do not become tomorrow's unquestioned habits.",
  "Mostly Intentional": "A lot is working, but habit, interpretation, or individual preference may have quietly taken over in a few places. Make the dimensions with the most friction explicit.",
  "Too Much Left to Chance": "Your team has ways of working, but not enough of them have been chosen deliberately. Good people may be compensating for system friction.",
  "Running on Defaults": "Work is getting done, but probably harder than it needs to be. Meetings, decisions, information, and collaboration may depend on unwritten rules, hierarchy, and individual habits."
};

const PATTERNS = {
  "meeting-not-meeting": ["The meeting problem isn't a meeting problem", "Your meetings may be carrying your decision problem. Before redesigning agendas, examine how authority and decision-making work."],
  "meeting-is-information-system": ["The meeting is the information system", "You may be meeting because that is how information travels. Improving information flow may remove meetings without a no-meeting policy."],
  "permission-problem": ["The permission problem", "People may know where they are going but not what they are allowed to decide along the way. Look at decision rights, authority, and escalation."],
  "ta-da-organization": ["The ta-da organization", "Important things may arrive once finished rather than giving people enough context along the way."],
  "heroic-team": ["The heroic team", "Your people may be compensating for your system. Capture what is working before it depends entirely on the current people."],
  "default-operating-system": ["The default operating system", "Do not treat this as five separate fixes. Step back and deliberately design the team's broader ways of working."]
};

const ORDER = ["MEET", "DECIDE", "SHARE", "AGREE", "ALIGN"];
const COLORS = { ink: [0.055, 0.055, 0.055], paper: [0.97, 0.96, 0.94], blue: [0.02, 0.31, 0.96], red: [1, 0.27, 0.18], lime: [0.67, 0.94, 0.12], yellow: [1, 0.75, 0.02], cyan: [0.02, 0.78, 0.86], violet: [0.50, 0.12, 0.90] };

function ascii(value) {
  return String(value == null ? "" : value)
    .replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-").replace(/[^\x20-\x7E]/g, " ");
}

function esc(value) {
  return ascii(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function colour(rgb) { return `${rgb.join(" ")} rg`; }

function wrap(text, maxChars) {
  const words = ascii(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    if (!line || `${line} ${word}`.length <= maxChars) line = line ? `${line} ${word}` : word;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines;
}

function text(font, size, x, y, value, rgb = COLORS.ink) {
  return `BT /${font} ${size} Tf ${colour(rgb)} ${x} ${y} Td (${esc(value)}) Tj ET`;
}

function paragraph(commands, value, x, y, widthChars, size = 10, leading = 14, font = "F1", rgb = COLORS.ink) {
  for (const line of wrap(value, widthChars)) {
    commands.push(text(font, size, x, y, line, rgb));
    y -= leading;
  }
  return y;
}

function rect(x, y, w, h, rgb, stroke = false) {
  return `${colour(rgb)} ${x} ${y} ${w} ${h} re ${stroke ? "S" : "f"}`;
}

function bandFor(key, pct) {
  return DIMENSIONS[key].bands.find(([min]) => pct >= min);
}

function pageOne(data) {
  const c = [];
  c.push(rect(0, 0, 595, 842, COLORS.paper));
  c.push(rect(0, 650, 595, 192, COLORS.ink));
  c.push(text("F2", 20, 42, 800, "Organizational", COLORS.paper));
  c.push(text("F2", 20, 42, 778, "Intelligence", COLORS.paper));
  c.push(rect(173, 780, 7, 7, COLORS.blue)); c.push(rect(182, 780, 7, 7, COLORS.red));
  c.push(rect(173, 771, 7, 7, COLORS.lime)); c.push(rect(182, 771, 7, 7, COLORS.violet));
  c.push(text("F3", 9, 42, 720, "WOW ASSESSMENT REPORT", COLORS.yellow));
  const teamSize = data.team.length <= 30 ? 29 : data.team.length <= 42 ? 22 : 17;
  c.push(text("F2", teamSize, 42, 682, data.team.slice(0, 55), COLORS.paper));
  c.push(text("F2", 21, 42, 620, data.band, COLORS.ink));
  c.push(text("F2", 66, 445, 596, String(data.overall), COLORS.blue));
  c.push(text("F1", 10, 530, 599, "/100", COLORS.ink));
  paragraph(c, OVERALL_TEXT[data.band] || "A snapshot of how deliberately your team's everyday work is designed.", 42, 592, 76, 11, 16);
  c.push(text("F3", 10, 42, 522, "THE FIVE DIMENSIONS", COLORS.ink));

  const barColours = [COLORS.blue, COLORS.violet, COLORS.cyan, COLORS.yellow, COLORS.lime];
  let y = 488;
  ORDER.forEach((key, index) => {
    const score = data.percentages[key];
    const info = bandFor(key, score);
    const isLow = key === data.friction;
    const isHigh = key === data.strength;
    const barColour = isLow && !isHigh ? COLORS.red : isHigh && !isLow ? COLORS.lime : barColours[index];
    c.push(text("F2", 12, 42, y + 8, DIMENSIONS[key].name, COLORS.ink));
    c.push(text("F2", 12, 500, y + 8, `${score}/100`, COLORS.ink));
    c.push(rect(150, y + 5, 330, 8, [0.84, 0.83, 0.81]));
    c.push(rect(150, y + 5, 330 * score / 100, 8, barColour));
    c.push(text("F1", 9, 150, y - 10, info[1], COLORS.ink));
    y -= 56;
  });

  c.push(rect(42, 108, 245, 100, [0.91, 0.96, 0.80]));
  c.push(text("F3", 9, 56, 186, "YOUR STRENGTH", COLORS.ink));
  c.push(text("F2", 18, 56, 160, DIMENSIONS[data.strength].name, COLORS.ink));
  paragraph(c, bandFor(data.strength, data.percentages[data.strength])[2], 56, 140, 42, 9, 12);
  c.push(rect(308, 108, 245, 100, [1, 0.89, 0.86]));
  c.push(text("F3", 9, 322, 186, "YOUR BIGGEST FRICTION", COLORS.ink));
  c.push(text("F2", 18, 322, 160, DIMENSIONS[data.friction].name, COLORS.ink));
  paragraph(c, bandFor(data.friction, data.percentages[data.friction])[2], 322, 140, 42, 9, 12);
  c.push(text("F1", 8, 42, 52, "A reflection prompt, not a measure of organizational effectiveness.", [0.35, 0.35, 0.35]));
  c.push(text("F3", 8, 504, 52, "01 / 02", [0.35, 0.35, 0.35]));
  return c.join("\n");
}

function pageTwo(data) {
  const c = [];
  c.push(rect(0, 0, 595, 842, COLORS.paper));
  c.push(rect(0, 792, 595, 50, COLORS.ink));
  c.push(text("F2", 16, 42, 811, "Organizational Intelligence", COLORS.paper));
  c.push(text("F3", 9, 42, 754, "WHAT THE RESULTS SUGGEST", COLORS.ink));
  let y = 716;
  const primary = PATTERNS[data.primaryPattern] || data.patterns.map((id) => PATTERNS[id]).find(Boolean);
  if (primary) {
    c.push(rect(42, y - 112, 511, 132, COLORS.ink));
    c.push(text("F3", 9, 60, y - 2, "THE PATTERN WE'D LOOK AT", COLORS.lime));
    c.push(text("F2", 20, 60, y - 32, primary[0], COLORS.paper));
    paragraph(c, primary[1], 60, y - 58, 76, 10, 14, "F1", COLORS.paper);
    y -= 164;
  }
  const rec = DIMENSIONS[data.friction].recommendation;
  c.push(rect(42, y - 150, 511, 170, [0.89, 0.92, 1]));
  c.push(rect(42, y - 150, 8, 170, COLORS.blue));
  c.push(text("F3", 9, 64, y - 4, "WHERE WE'D START", COLORS.blue));
  c.push(text("F2", 21, 64, y - 36, rec[0], COLORS.ink));
  let py = paragraph(c, rec[1], 64, y - 64, 72, 11, 16);
  paragraph(c, `Based on ${DIMENSIONS[data.friction].name} being the lowest-scoring dimension${primary ? ", read alongside the pattern above" : ""}.`, 64, py - 12, 78, 9, 13, "F1", [0.35, 0.35, 0.35]);
  y -= 196;
  if (data.oneThing) {
    c.push(rect(42, y - 92, 511, 112, [1, 0.95, 0.78]));
    c.push(text("F3", 9, 60, y - 2, "THE ONE THING YOU'D CHANGE", COLORS.ink));
    paragraph(c, `"${data.oneThing}"`, 60, y - 30, 75, 12, 17, "F1", COLORS.ink);
    y -= 136;
  }
  c.push(text("F3", 9, 42, y, "WHAT HAPPENS NEXT", COLORS.ink));
  c.push(text("F2", 22, 42, y - 34, "Turn the insight into a better way of working.", COLORS.ink));
  paragraph(c, "A 30-minute conversation can help make sense of the result, test what is really creating friction, and choose a practical place to begin.", 42, y - 62, 80, 11, 16);
  c.push(rect(42, y - 145, 210, 38, COLORS.blue));
  c.push(text("F2", 11, 61, y - 131, "BOOK A FREE CONSULTATION", COLORS.paper));
  c.push(text("F1", 10, 42, 52, "orgintelligence.io", COLORS.ink));
  c.push(text("F1", 9, 42, 34, `Prepared for ${data.firstName} | ${data.email}`, [0.35, 0.35, 0.35]));
  c.push(text("F3", 8, 504, 34, "02 / 02", [0.35, 0.35, 0.35]));
  return c.join("\n");
}

function buildPdf(streams) {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [6 0 R 8 0 R] /Count 2 >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents 7 0 R >>",
    `<< /Length ${streams[0].length} >>\nstream\n${streams[0]}\nendstream`,
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents 9 0 R >>",
    `<< /Length ${streams[1].length} >>\nstream\n${streams[1]}\nendstream`
  ];
  let pdf = "%PDF-1.4\n%OI-WOW\n";
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

export function createAssessmentPdf(input) {
  const data = {
    firstName: ascii(input.firstName).slice(0, 100), email: ascii(input.email).slice(0, 254),
    team: ascii(input.team).slice(0, 80), overall: Number(input.overall), band: ascii(input.overallBand).slice(0, 100),
    percentages: Object.fromEntries(ORDER.map((key) => [key, Number(input.dimensionPercentages[key])])),
    strength: ORDER.includes(input.strength) ? input.strength : ORDER[0],
    friction: ORDER.includes(input.friction) ? input.friction : ORDER[0],
    patterns: Array.isArray(input.patterns) ? input.patterns.slice(0, 2) : [],
    primaryPattern: ascii(input.primaryPattern).slice(0, 100),
    oneThing: ascii(input.oneThing).slice(0, 360)
  };
  return buildPdf([pageOne(data), pageTwo(data)]);
}

export function bytesToBase64(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}
