import { SectorId } from "@/game/types";

// Offline/fallback startup name+creative generator. Used when no LLM key is
// configured, the call errors, or it doesn't return in time — guarantees the
// game NEVER stalls waiting on a network call during a live 1200-player event.

const PREFIXES = [
  "Nova", "Bodhi", "Arka", "Veda", "Uday", "Sutra", "Prana", "Kavach",
  "Disha", "Setu", "Tarang", "Anaya", "Bharani", "Chetna", "Drishti", "Aika",
];
const SUFFIXES: Record<SectorId, string[]> = {
  healthcare: ["Health", "Care", "Vital", "Med", "Cure"],
  sports: ["Play", "Sprint", "Arena", "Pulse", "Champ"],
  semiconductors: ["Chip", "Silicon", "Fab", "Node", "Core"],
  quantum: ["Qubit", "Quantum", "Entangle", "Flux", "Wave"],
  entertainment: ["Studio", "Frame", "Reel", "Beat", "Stage"],
  robotics: ["Bot", "Arm", "Motion", "Forge", "Auto"],
  agriculture: ["Farm", "Root", "Harvest", "Soil", "Grain"],
  mobility: ["Transit", "Ride", "Route", "Hub", "Wheel"],
  education: ["Learn", "Class", "Mind", "Scholar", "Grade"],
  climate: ["Green", "Eco", "Cool", "Air", "Earth"],
};

const USPS: Record<SectorId, string[]> = {
  healthcare: [
    "diagnoses in seconds instead of days",
    "predicts outbreaks before they spread",
    "cuts hospital wait times by 70%",
  ],
  sports: [
    "spots championship talent from grassroots data",
    "predicts injuries before they happen",
    "personalizes training with real-time biometrics",
  ],
  semiconductors: [
    "designs chips 10x faster with generative AI",
    "cuts fab defect rates by half",
    "optimizes power efficiency automatically",
  ],
  quantum: [
    "stabilizes qubits for longer coherence",
    "makes quantum simulations enterprise-ready",
    "runs hybrid quantum-classical pipelines at scale",
  ],
  entertainment: [
    "turns any idea into a viral campaign overnight",
    "personalizes content for every regional language",
    "predicts what goes viral before it happens",
  ],
  robotics: [
    "cuts factory downtime with predictive maintenance",
    "automates the last mile of manufacturing",
    "makes robots learn new tasks in minutes",
  ],
  agriculture: [
    "predicts crop yield with satellite precision",
    "cuts water usage by 40% with smart irrigation",
    "connects smallholder farmers to fair markets",
  ],
  mobility: [
    "cuts commute times with predictive routing",
    "optimizes EV charging network placement",
    "makes public transit painless with live AI routing",
  ],
  education: [
    "personalizes every lesson to the student",
    "brings world-class tutoring to any village",
    "predicts learning gaps before they widen",
  ],
  climate: [
    "cuts urban emissions with live grid optimization",
    "predicts floods before they hit",
    "turns waste heat into usable energy",
  ],
};

const BUSINESS_MODELS = [
  "B2B SaaS subscription",
  "Usage-based API licensing",
  "Freemium with enterprise upsell",
  "Government + enterprise contracts",
  "Marketplace commission model",
  "Platform + data licensing",
];

const AI_STACKS = [
  ["Computer Vision", "Edge AI", "LLM Agents"],
  ["Predictive ML", "Time-series Forecasting", "RAG"],
  ["Generative AI", "Reinforcement Learning", "Vector Search"],
  ["Multi-modal AI", "Federated Learning", "Real-time Inference"],
  ["Sensor Fusion", "Digital Twins", "AutoML"],
];

const ARCHETYPES = [
  "The Relentless Builder",
  "The Visionary Scientist",
  "The Scrappy Hustler",
  "The Systems Thinker",
  "The Moonshot Dreamer",
  "The Data Whisperer",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateOfflineStartup(sector: SectorId) {
  const name = `${pick(PREFIXES)}${pick(SUFFIXES[sector])}`;
  const usp = pick(USPS[sector]);
  return {
    name,
    tagline: `${name} — AI that ${usp}`,
    usp: usp.charAt(0).toUpperCase() + usp.slice(1),
    aiStack: pick(AI_STACKS),
    businessModel: pick(BUSINESS_MODELS),
    founderArchetype: pick(ARCHETYPES),
  };
}
