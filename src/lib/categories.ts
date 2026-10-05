import type { Category } from "./schema";

/**
 * Map marker groups. Four hues, validated for the dark surface with the dataviz
 * validator (order: red, blue, amber, grey). Grey is deliberately low-chroma, as the
 * brief asks for grey wars; it is backed by a secondary encoding (ring markers).
 */
export const GROUPS = {
  killings: { label: "Massacres and targeted killings", color: "#d94a3f" },
  response: { label: "India's response", color: "#3987e5" },
  terror: { label: "Terror attacks", color: "#c98500" },
  war: { label: "Wars and Pakistani shelling", color: "#7d8590" },
} as const;
export type GroupKey = keyof typeof GROUPS;
export const GROUP_ORDER: GroupKey[] = ["killings", "response", "terror", "war"];

export const CATEGORY_META: Record<Category, { label: string; group: GroupKey }> = {
  massacre: { label: "Massacre", group: "killings" },
  targeted_killing: { label: "Targeted killing", group: "killings" },
  pilgrim_attack: { label: "Attack on pilgrims", group: "killings" },
  riot: { label: "Riot", group: "killings" },
  exodus: { label: "Exodus and displacement", group: "killings" },
  abduction: { label: "Abduction or hijacking", group: "killings" },
  fidayeen: { label: "Fidayeen (suicide squad) attack", group: "terror" },
  ied: { label: "IED or bomb", group: "terror" },
  grenade: { label: "Grenade attack", group: "terror" },
  ambush: { label: "Ambush", group: "terror" },
  infiltration: { label: "Infiltration", group: "terror" },
  encounter: { label: "Encounter or counter-terror operation", group: "response" },
  india_strike: { label: "Indian strike across the LoC or border", group: "response" },
  policy: { label: "Policy milestone", group: "response" },
  war: { label: "War", group: "war" },
  cross_border_shelling: { label: "Cross-border shelling or attack", group: "war" },
};

export const groupOf = (c: Category) => CATEGORY_META[c].group;
export const colorOf = (c: Category) => GROUPS[groupOf(c)].color;

/** Chart series for deaths by category. Reference dark slots, in an order validated adjacent with the grey "not broken down" series last. */
export const DEATH_SERIES = [
  { key: "security_forces", label: "Security forces", color: "#3987e5" },
  { key: "terrorists", label: "Terrorists", color: "#199e70" },
  { key: "civilians", label: "Civilians", color: "#d95926" },
] as const;

/** Tactic families for the tactic-shift chart. Reference dark slots 1 to 6, validated adjacent. */
export const TACTIC_FAMILIES = [
  { key: "shooting", label: "Mass or targeted shooting", color: "#3987e5", tactics: ["mass_shooting", "targeted_shooting", "armed_assault"] },
  { key: "fidayeen", label: "Fidayeen and suicide attacks", color: "#d95926", tactics: ["suicide_fidayeen", "vbied"] },
  { key: "explosive", label: "IEDs, grenades and drones", color: "#199e70", tactics: ["ied", "grenade", "drone"] },
  { key: "ambush", label: "Ambushes", color: "#c98500", tactics: ["ambush"] },
  { key: "kidnap", label: "Kidnapping and hijacking", color: "#d55181", tactics: ["kidnapping", "hijacking", "abduction"] },
  { key: "military", label: "Shelling, war and strikes", color: "#9085e9", tactics: ["artillery_shelling", "conventional_war", "air_strike", "ground_raid", "missile_strike"] },
] as const;

export const TACTIC_LABEL: Record<string, string> = {
  armed_assault: "Armed assault",
  mass_shooting: "Mass shooting",
  targeted_shooting: "Targeted shooting",
  suicide_fidayeen: "Fidayeen or suicide attack",
  ied: "IED",
  vbied: "Vehicle bomb",
  grenade: "Grenade",
  ambush: "Ambush",
  arson: "Arson",
  abduction: "Abduction",
  kidnapping: "Kidnapping",
  hijacking: "Hijacking",
  artillery_shelling: "Artillery shelling",
  drone: "Drone",
  conventional_war: "Conventional war",
  air_strike: "Air strike",
  ground_raid: "Ground raid",
  missile_strike: "Missile strike",
  cordon_and_search: "Cordon and search",
  policy_measure: "Policy measure",
  displacement: "Displacement",
  other: "Other",
};

export const TARGET_LABEL: Record<string, string> = {
  civilians: "Civilians",
  pilgrims: "Pilgrims",
  security_forces: "Security forces",
  police: "Police",
  political: "Political figures",
  migrant_workers: "Migrant workers",
  minority_community: "Minority community",
  government_employees: "Government employees",
  terrorists: "Terrorists",
  military: "Military",
  infrastructure: "Infrastructure",
  none: "None",
};

export const CONFIDENCE_LABEL = {
  confirmed: "Confirmed (2+ sources agree)",
  reported: "Reported (rests on one source)",
  disputed: "Disputed (sources disagree)",
} as const;
