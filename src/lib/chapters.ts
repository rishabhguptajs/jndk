/**
 * Era chapters for the scrollytelling page. Text is original writing that summarises
 * events recorded in the atlas; every claim here is backed by an event card listed in `events`.
 */
export type Chapter = {
  id: string;
  title: string;
  years: [number, number];
  bounds: [[number, number], [number, number]];
  body: string[];
  events: string[];
};

const JK: Chapter["bounds"] = [[72.4, 32.2], [80.6, 37.2]];
const VALLEY_JAMMU: Chapter["bounds"] = [[73.4, 32.3], [76.4, 34.8]];
const PIR_PANJAL: Chapter["bounds"] = [[73.6, 32.3], [76.2, 33.9]];

export const CHAPTERS: Chapter[] = [
  {
    id: "1947",
    title: "1947 to 1948: Pakistan's invasion",
    years: [1947, 1949],
    bounds: [[72.6, 32.4], [76.6, 36.4]],
    body: [
      "On 22 October 1947 tribal lashkars crossed into Jammu and Kashmir. The operation, code-named Gulmarg, was planned by the Pakistan Army, which armed and transported the tribesmen and placed its officers among them. Regular Pakistani troops later fought openly.",
      "Hindus and Sikhs were killed in Muzaffarabad, Bhimber, Rajouri and Mirpur, and prisoners died at the Alibeg camp. Baramulla was sacked. Published estimates for several of these massacres differ by thousands, and the atlas shows the full range rather than one number.",
      "India flew troops into Srinagar after the accession of 26 October. Poonch held out under siege for a year, Skardu fell in August 1948, and tanks crossed Zoji La that November. A ceasefire on 1 January 1949 left Pakistan in occupation of a large part of the state, and more than 31,000 families had been displaced.",
    ],
    events: ["1947-10-22-muzaffarabad-invasion", "1947-11-25-mirpur-massacre", "1947-11-07-rajouri-massacre", "1947-pojk-displacement"],
  },
  {
    id: "1965-1971",
    title: "1965 and 1971",
    years: [1965, 1972],
    bounds: [[73.4, 32.4], [77.8, 35.2]],
    body: [
      "In August 1965 Pakistan sent armed infiltrators across the ceasefire line in Operation Gibraltar, hoping to start a revolt. Kashmiris did not rise, and many reported the infiltrators. India took the Haji Pir pass to cut their route, and Pakistan answered with an armoured thrust at Chhamb.",
      "In December 1971 Pakistan attacked at Chhamb again. In the north, the Ladakh Scouts retook Turtuk and nearby villages held since 1948. The Simla Agreement of 1972 turned the ceasefire line into the Line of Control.",
    ],
    events: ["1965-08-05-operation-gibraltar", "1965-08-28-haji-pir-captured", "1971-12-turtuk-liberated", "1972-07-02-simla-agreement"],
  },
  {
    id: "1986-1990",
    title: "1986 to 1990: the turn and the exodus",
    years: [1984, 1990],
    bounds: VALLEY_JAMMU,
    body: [
      "Siachen was secured in 1984. Two years later, riots in Anantnag targeted Kashmiri Pandit homes and temples. In July 1988 the JKLF set off bombs in Srinagar, and from 1989 its gunmen began killing prominent Pandits and officials, among them Tika Lal Taploo and Neelkanth Ganjoo.",
      "The release of five militants for Rubaiya Sayeed in December 1989 emboldened the armed groups. On the night of 19 January 1990 threats rang out from mosque loudspeakers, and over the following months almost the entire Pandit community left the Valley. Official records count 64,827 families.",
    ],
    events: ["1986-02-anantnag-riots", "1989-09-14-tika-lal-taploo", "1989-12-08-rubaiya-sayeed-abduction", "1990-01-19-pandit-exodus"],
  },
  {
    id: "1990s",
    title: "The 1990s: insurgency and massacres",
    years: [1990, 1998],
    bounds: VALLEY_JAMMU,
    body: [
      "Through the 1990s the insurgency was at its peak. Pakistan-backed groups including Hizbul Mujahideen, Harkat-ul-Ansar and Lashkar-e-Taiba carried out killings, kidnappings and massacres across the state.",
      "Massacres of Hindus spread from the Valley into Doda, Kishtwar, Udhampur and Rajouri: the Kishtwar bus in 1993, Barshalla in 1996, Sangrampora in 1997, and Wandhama, Prankote, Chapnari and Chamba in 1998. This chapter is where the atlas is thinnest, and many more incidents remain to be added.",
    ],
    events: ["1993-08-14-kishtwar-bus-massacre", "1998-01-25-wandhama", "1998-04-17-prankote-dakikote", "1998-06-19-chapnari"],
  },
  {
    id: "kargil",
    title: "1999: Kargil",
    years: [1999, 1999],
    bounds: [[74.8, 33.8], [77.4, 35.0]],
    body: [
      "In the spring of 1999 Pakistani troops occupied heights across the Line of Control in Kargil. Captain Saurabh Kalia's patrol was captured and its men tortured and killed. India's Operation Vijay retook the peaks by late July at a cost of 527 soldiers.",
    ],
    events: ["1999-05-03-kargil-war", "1999-05-15-saurabh-kalia-patrol"],
  },
  {
    id: "2000s",
    title: "The 2000s: the fidayeen era",
    years: [1999, 2007],
    bounds: VALLEY_JAMMU,
    body: [
      "After Kargil, suicide squads attacked army camps, police stations and public places. Jaish-e-Mohammed, founded after the IC 814 hijack exchange, brought the car bomb, and the Legislative Assembly was attacked in October 2001.",
      "Pilgrims and minorities were struck again and again: Chittisinghpura in 2000, the Amarnath camps in 2000, 2001 and 2002, Kaluchak, Qasim Nagar and the Raghunath temple in 2002, and Nadimarg in 2003. A ceasefire on the LoC in November 2003 brought several years of quiet on the border.",
    ],
    events: ["2000-03-20-chittisinghpura", "2001-10-01-jk-assembly-attack", "2002-05-14-kaluchak", "2003-03-23-nadimarg"],
  },
  {
    id: "2008-2016",
    title: "2008 to 2016: unrest and Uri",
    years: [2008, 2016],
    bounds: VALLEY_JAMMU,
    body: [
      "Attacks continued after the ceasefire years, among them the Narbal bus bomb, fidayeen raids in Jammu, the Hyderpora ambush, and, in 2016, the killing of Hizbul commander Burhan Wani and the months of unrest that followed.",
      "On 18 September 2016 fidayeen struck the army brigade at Uri. Eleven days later Indian special forces crossed the Line of Control and hit launch pads in the first publicly acknowledged surgical strikes.",
    ],
    events: ["2013-06-24-hyderpora-ambush", "2016-09-18-uri-attack", "2016-09-29-surgical-strikes"],
  },
  {
    id: "2019",
    title: "2019: Pulwama, Balakot and Article 370",
    years: [2019, 2019],
    bounds: JK,
    body: [
      "On 14 February 2019 a Jaish-e-Mohammed suicide bomber killed 40 CRPF personnel at Lethpora in Pulwama. On 26 February the Indian Air Force struck a Jaish camp at Balakot inside Pakistan, and the next day Pakistan's air force struck back.",
      "In August, Parliament ended the special status of the state and reorganised it into two Union Territories, which came into being on 31 October 2019.",
    ],
    events: ["2019-02-14-pulwama", "2019-02-26-balakot", "2019-08-05-article-370"],
  },
  {
    id: "2021-2024",
    title: "2021 to 2024: targeted killings and the Jammu shift",
    years: [2020, 2024],
    bounds: PIR_PANJAL,
    body: [
      "From 2021 militants turned to killing individuals: Kashmiri Pandits, Sikhs, Hindu teachers and workers from other states. Makhan Lal Bindroo, Supinder Kaur, Rahul Bhat and Rajni Bala were among them.",
      "At the same time violence moved south of the Pir Panjal. Small groups of foreign militants ambushed soldiers in the forests of Poonch, Rajouri, Kathua and Doda, massacred Hindus at Dhangri, and attacked a pilgrim bus at Reasi in June 2024. Turn on the hotspot drift in the atlas to see the centre of violence move.",
    ],
    events: ["2021-10-05-bindroo", "2022-05-12-rahul-bhat", "2023-01-01-dhangri", "2024-06-09-reasi-bus"],
  },
  {
    id: "2025",
    title: "2025: Pahalgam and Operation Sindoor",
    years: [2025, 2025],
    bounds: [[70.5, 29.0], [77.5, 35.5]],
    body: [
      "On 22 April 2025 militants killed 26 people, most of them tourists, at Baisaran meadow above Pahalgam, after asking about their religion. On 7 May India struck nine sites in Pakistan and Pakistan-occupied Jammu and Kashmir tied to Jaish-e-Mohammed, Lashkar-e-Taiba and Hizbul Mujahideen.",
      "Pakistan shelled towns along the Line of Control, hitting Poonch hardest, until both sides agreed to stop firing on 10 May. In July security forces killed the three men behind the Pahalgam attack.",
    ],
    events: ["2025-04-22-pahalgam-baisaran", "2025-05-07-operation-sindoor", "2025-05-07-poonch-shelling", "2025-07-28-operation-mahadev"],
  },
  {
    id: "2026",
    title: "2026 to date",
    years: [2026, 2026],
    bounds: JK,
    body: [
      "Encounters continued in the forests of Kishtwar, Udhampur and Budgam through 2026, and a labourer from Chhattisgarh was killed in Kulgam in July. This chapter is recorded up to October 2026 and will grow as reporting is reviewed.",
    ],
    events: ["2026-01-19-kishtwar-singpura", "2026-07-31-kulgam-kiln-labourer", "2026-09-yusmarg-moosa"],
  },
];
