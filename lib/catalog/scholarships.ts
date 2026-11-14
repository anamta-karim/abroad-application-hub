/**
 * Curated catalog of well-known international scholarships.
 *
 * There is no free public API for scholarships, so this list is maintained by
 * hand. Keep entries conservative: describe what the award usually covers and
 * when it usually runs, never exact amounts or dates that change each cycle.
 * Everything a user imports from here is saved as unverified and labelled
 * "confirm on the official page".
 */

export type DegreeLevel = "Bachelor's" | "Master's" | "PhD" | "Research";

export interface CatalogEntry {
  id: string;
  title: string;
  recordType: "scholarship" | "program";
  provider: string;
  country: string;
  degreeLevels: DegreeLevel[];
  funding: string;
  eligibility: string;
  /** Human-readable typical application window from past cycles. */
  typicalWindow: string;
  /** Month (1-12) the call usually opens; used to set a watchlist reminder. */
  typicalOpenMonth: number | null;
  officialUrl: string;
  tags: string[];
}

export const SCHOLARSHIP_CATALOG: CatalogEntry[] = [
  {
    id: "erasmus-mundus",
    title: "Erasmus Mundus Joint Masters Scholarship",
    recordType: "scholarship",
    provider: "European Commission / Consortium Universities",
    country: "European Union",
    degreeLevels: ["Master's"],
    funding:
      "Full scholarship for an Erasmus Mundus Joint Master: participation costs, travel and installation costs, and a monthly living allowance.",
    eligibility: "Open to students worldwide; you apply directly to the joint master programme of your choice.",
    typicalWindow: "Each consortium sets its own deadline, usually between October and February.",
    typicalOpenMonth: 10,
    officialUrl:
      "https://erasmus-plus.ec.europa.eu/opportunities/opportunities-for-individuals/students/erasmus-mundus-joint-masters",
    tags: ["europe", "eu", "erasmus", "fully funded", "multi-country"],
  },
  {
    id: "chevening",
    title: "Chevening Scholarship",
    recordType: "scholarship",
    provider: "Foreign, Commonwealth & Development Office (FCDO)",
    country: "United Kingdom",
    degreeLevels: ["Master's"],
    funding: "Fully funded one-year UK master's: tuition, monthly stipend, return flights, and arrival and departure allowances.",
    eligibility:
      "Citizens of Chevening-eligible countries with at least two years' work experience; you must return home for two years afterwards.",
    typicalWindow: "Usually opens in early August and closes in early November.",
    typicalOpenMonth: 8,
    officialUrl: "https://www.chevening.org/scholarships/",
    tags: ["uk", "government", "fully funded", "leadership"],
  },
  {
    id: "commonwealth-masters",
    title: "Commonwealth Master's Scholarships",
    recordType: "scholarship",
    provider: "Commonwealth Scholarship Commission in the UK",
    country: "United Kingdom",
    degreeLevels: ["Master's"],
    funding: "Tuition, airfare, and a monthly living allowance for a one-year UK master's.",
    eligibility:
      "Citizens of eligible low- and middle-income Commonwealth countries; usually requires nomination by a national agency.",
    typicalWindow: "Typically opens in the autumn; national nominating bodies set earlier internal deadlines.",
    typicalOpenMonth: 9,
    officialUrl: "https://cscuk.fcdo.gov.uk/scholarships/",
    tags: ["uk", "commonwealth", "government", "fully funded"],
  },
  {
    id: "gates-cambridge",
    title: "Gates Cambridge Scholarship",
    recordType: "scholarship",
    provider: "University of Cambridge / Gates Cambridge Trust",
    country: "United Kingdom",
    degreeLevels: ["Master's", "PhD"],
    funding: "Full cost of study at Cambridge: university fees, maintenance allowance, airfare, and visa costs.",
    eligibility: "Non-UK citizens applying to a full-time postgraduate course at the University of Cambridge.",
    typicalWindow:
      "Apply through the Cambridge postgraduate application: the US round closes in October, other countries in December or January.",
    typicalOpenMonth: 9,
    officialUrl: "https://www.gatescambridge.org/",
    tags: ["uk", "cambridge", "university", "fully funded"],
  },
  {
    id: "rhodes",
    title: "Rhodes Scholarship",
    recordType: "scholarship",
    provider: "Rhodes Trust",
    country: "United Kingdom",
    degreeLevels: ["Master's", "PhD"],
    funding: "University fees and a stipend for postgraduate study at the University of Oxford.",
    eligibility: "You apply through your country or regional constituency; age and citizenship rules vary by constituency.",
    typicalWindow: "Deadlines vary by constituency, typically between June and October.",
    typicalOpenMonth: 6,
    officialUrl: "https://www.rhodeshouse.ox.ac.uk/scholarships/",
    tags: ["uk", "oxford", "fully funded", "leadership"],
  },
  {
    id: "clarendon",
    title: "Clarendon Fund Scholarships",
    recordType: "scholarship",
    provider: "University of Oxford",
    country: "United Kingdom",
    degreeLevels: ["Master's", "PhD"],
    funding: "Full course fees and a grant for living expenses.",
    eligibility:
      "Graduate applicants to Oxford; there is no separate application, you are considered automatically with your course application.",
    typicalWindow: "Considered with Oxford graduate applications submitted by the December or January course deadlines.",
    typicalOpenMonth: 9,
    officialUrl: "https://www.ox.ac.uk/clarendon",
    tags: ["uk", "oxford", "university", "fully funded"],
  },
  {
    id: "marshall",
    title: "Marshall Scholarship",
    recordType: "scholarship",
    provider: "Marshall Aid Commemoration Commission",
    country: "United Kingdom",
    degreeLevels: ["Master's", "PhD"],
    funding: "Fees, living costs, and travel for up to two years of graduate study at a UK university.",
    eligibility: "US citizens only, holding a first undergraduate degree.",
    typicalWindow: "Applications usually close in late September or early October.",
    typicalOpenMonth: 6,
    officialUrl: "https://www.marshallscholarship.org/",
    tags: ["uk", "us citizens", "fully funded"],
  },
  {
    id: "daad-epos",
    title: "DAAD Development-Related Postgraduate Courses (EPOS)",
    recordType: "scholarship",
    provider: "German Academic Exchange Service (DAAD)",
    country: "Germany",
    degreeLevels: ["Master's", "PhD"],
    funding: "Monthly stipend, health insurance, and travel allowance for selected development-related courses in Germany.",
    eligibility:
      "Professionals from developing countries with a bachelor's degree and usually at least two years' relevant work experience.",
    typicalWindow: "Deadlines are set per course, mostly between August and October for the following year.",
    typicalOpenMonth: 7,
    officialUrl: "https://www.daad.de/en/study-and-research-in-germany/scholarships/",
    tags: ["germany", "daad", "government", "development"],
  },
  {
    id: "deutschlandstipendium",
    title: "Deutschlandstipendium",
    recordType: "scholarship",
    provider: "Federal Government of Germany / German universities",
    country: "Germany",
    degreeLevels: ["Bachelor's", "Master's"],
    funding: "Merit-based monthly support awarded by individual German universities; open to international students.",
    eligibility: "Students enrolled, or about to enrol, at a participating German university.",
    typicalWindow: "Each university runs its own call, often in spring or summer.",
    typicalOpenMonth: null,
    officialUrl: "https://www.deutschlandstipendium.de/",
    tags: ["germany", "merit", "university"],
  },
  {
    id: "fulbright",
    title: "Fulbright Foreign Student Program",
    recordType: "scholarship",
    provider: "U.S. Department of State / Fulbright Commissions",
    country: "United States",
    degreeLevels: ["Master's", "PhD"],
    funding: "Usually covers tuition, airfare, a living stipend, and health insurance; exact benefits vary by country.",
    eligibility: "Applications are run by the Fulbright Commission or U.S. Embassy in your home country.",
    typicalWindow: "Deadlines vary by country, commonly between February and October, well over a year before study starts.",
    typicalOpenMonth: 2,
    officialUrl: "https://foreign.fulbrightonline.org/",
    tags: ["usa", "government", "fully funded"],
  },
  {
    id: "knight-hennessy",
    title: "Knight-Hennessy Scholars",
    recordType: "scholarship",
    provider: "Stanford University",
    country: "United States",
    degreeLevels: ["Master's", "PhD"],
    funding: "Full funding for a Stanford graduate degree: tuition, living stipend, and travel.",
    eligibility: "Applicants to any Stanford graduate program, from any country.",
    typicalWindow: "Applications usually close in early October for study starting the following autumn.",
    typicalOpenMonth: 6,
    officialUrl: "https://knight-hennessy.stanford.edu/",
    tags: ["usa", "stanford", "university", "fully funded", "leadership"],
  },
  {
    id: "gks",
    title: "Global Korea Scholarship (GKS)",
    recordType: "scholarship",
    provider: "National Institute for International Education (NIIED)",
    country: "South Korea",
    degreeLevels: ["Bachelor's", "Master's", "PhD"],
    funding: "Full tuition, monthly stipend, round-trip airfare, medical insurance, and one year of Korean language training.",
    eligibility: "Non-Korean citizens; apply through a Korean embassy or directly through a designated Korean university.",
    typicalWindow: "Graduate announcements usually appear in February or March; undergraduate in September.",
    typicalOpenMonth: 2,
    officialUrl: "https://www.studyinkorea.go.kr/",
    tags: ["korea", "kgsp", "niied", "government", "fully funded"],
  },
  {
    id: "mext",
    title: "MEXT Japanese Government Scholarship",
    recordType: "scholarship",
    provider: "Ministry of Education, Culture, Sports, Science and Technology (MEXT)",
    country: "Japan",
    degreeLevels: ["Bachelor's", "Master's", "PhD", "Research"],
    funding: "Tuition exemption, a monthly allowance, and round-trip airfare.",
    eligibility: "Apply through the Japanese embassy in your country, or be recommended by a Japanese university.",
    typicalWindow: "The embassy round usually opens around April or May; university-recommended rounds vary.",
    typicalOpenMonth: 4,
    officialUrl: "https://www.studyinjapan.go.jp/en/",
    tags: ["japan", "monbukagakusho", "government", "fully funded"],
  },
  {
    id: "csc",
    title: "Chinese Government Scholarship",
    recordType: "scholarship",
    provider: "China Scholarship Council (CSC)",
    country: "China",
    degreeLevels: ["Bachelor's", "Master's", "PhD"],
    funding: "Full scholarship: tuition waiver, accommodation, monthly stipend, and medical insurance.",
    eligibility: "Non-Chinese citizens; apply through a Chinese embassy or directly to a participating Chinese university.",
    typicalWindow: "Usually opens in January, with deadlines between March and April.",
    typicalOpenMonth: 1,
    officialUrl: "https://www.campuschina.org/",
    tags: ["china", "csc", "government", "fully funded"],
  },
  {
    id: "schwarzman",
    title: "Schwarzman Scholars",
    recordType: "scholarship",
    provider: "Tsinghua University / Schwarzman Scholars",
    country: "China",
    degreeLevels: ["Master's"],
    funding: "Tuition, room and board, travel, and a stipend for a one-year master's at Tsinghua University in Beijing.",
    eligibility: "Applicants worldwide with a bachelor's degree and demonstrated leadership.",
    typicalWindow: "Applications usually close in September.",
    typicalOpenMonth: 4,
    officialUrl: "https://www.schwarzmanscholars.org/",
    tags: ["china", "tsinghua", "fully funded", "leadership"],
  },
  {
    id: "turkiye-burslari",
    title: "Türkiye Scholarships (Türkiye Bursları)",
    recordType: "scholarship",
    provider: "Presidency for Turks Abroad and Related Communities (YTB)",
    country: "Turkey",
    degreeLevels: ["Bachelor's", "Master's", "PhD"],
    funding: "Tuition, monthly stipend, accommodation, health insurance, flights, and a one-year Turkish language course.",
    eligibility: "International students from all countries; age limits differ by degree level.",
    typicalWindow: "Usually opens in January and closes in February.",
    typicalOpenMonth: 1,
    officialUrl: "https://www.turkiyeburslari.gov.tr/",
    tags: ["turkey", "turkiye", "government", "fully funded"],
  },
  {
    id: "stipendium-hungaricum",
    title: "Stipendium Hungaricum",
    recordType: "scholarship",
    provider: "Tempus Public Foundation / Government of Hungary",
    country: "Hungary",
    degreeLevels: ["Bachelor's", "Master's", "PhD"],
    funding: "Tuition-free study, a monthly stipend, an accommodation contribution, and medical insurance.",
    eligibility: "Citizens of partner countries; candidates are nominated by the sending partner's authority.",
    typicalWindow: "Usually opens in November and closes in mid-January.",
    typicalOpenMonth: 11,
    officialUrl: "https://stipendiumhungaricum.hu/",
    tags: ["hungary", "europe", "government"],
  },
  {
    id: "swiss-excellence",
    title: "Swiss Government Excellence Scholarships",
    recordType: "scholarship",
    provider: "Federal Commission for Scholarships for Foreign Students (FCS)",
    country: "Switzerland",
    degreeLevels: ["PhD", "Research"],
    funding: "Monthly allowance, tuition fees, health insurance, and a housing allowance for research at Swiss public universities.",
    eligibility: "Researchers from eligible countries with a master's degree and a host professor in Switzerland.",
    typicalWindow: "Deadlines vary by country, commonly between September and December.",
    typicalOpenMonth: 8,
    officialUrl: "https://www.sbfi.admin.ch/scholarships_eng",
    tags: ["switzerland", "government", "research", "postdoc"],
  },
  {
    id: "eiffel",
    title: "Eiffel Excellence Scholarship Program",
    recordType: "scholarship",
    provider: "Campus France / Ministry for Europe and Foreign Affairs",
    country: "France",
    degreeLevels: ["Master's", "PhD"],
    funding: "Monthly allowance plus international travel, health insurance, and cultural activities.",
    eligibility: "You cannot apply directly: French higher education institutions nominate their foreign applicants.",
    typicalWindow: "Institutions usually submit nominations in early January.",
    typicalOpenMonth: 10,
    officialUrl: "https://www.campusfrance.org/en/eiffel-scholarship-program-of-excellence",
    tags: ["france", "government", "campus france"],
  },
  {
    id: "holland-scholarship",
    title: "Holland Scholarship",
    recordType: "scholarship",
    provider: "Dutch Ministry of Education and participating Dutch institutions",
    country: "Netherlands",
    degreeLevels: ["Bachelor's", "Master's"],
    funding: "A one-off partial grant in the first year of study.",
    eligibility: "Non-EEA students applying for the first time to a participating Dutch institution.",
    typicalWindow: "Deadlines are usually 1 February or 1 May, depending on the institution.",
    typicalOpenMonth: 11,
    officialUrl: "https://www.studyinnl.org/finances/holland-scholarship",
    tags: ["netherlands", "europe", "partial"],
  },
  {
    id: "si-global-professionals",
    title: "Swedish Institute Scholarships for Global Professionals",
    recordType: "scholarship",
    provider: "Swedish Institute (SI)",
    country: "Sweden",
    degreeLevels: ["Master's"],
    funding: "Full tuition, a monthly living allowance, a travel grant, and insurance.",
    eligibility:
      "Citizens of eligible countries with work and leadership experience; you must first apply to an eligible master's programme.",
    typicalWindow: "The scholarship application usually opens in February, after the university application round.",
    typicalOpenMonth: 2,
    officialUrl: "https://si.se/en/apply/scholarships/",
    tags: ["sweden", "europe", "government", "fully funded", "leadership"],
  },
  {
    id: "australia-awards",
    title: "Australia Awards Scholarships",
    recordType: "scholarship",
    provider: "Department of Foreign Affairs and Trade (DFAT)",
    country: "Australia",
    degreeLevels: ["Master's", "PhD"],
    funding: "Full tuition, return airfare, an establishment allowance, a living expenses contribution, and health cover.",
    eligibility: "Citizens of participating countries, mainly in the Indo-Pacific region.",
    typicalWindow: "Usually opens in February and closes in April or May; dates vary by country.",
    typicalOpenMonth: 2,
    officialUrl: "https://www.dfat.gov.au/people-to-people/australia-awards",
    tags: ["australia", "government", "fully funded"],
  },
  {
    id: "manaaki-nz",
    title: "Manaaki New Zealand Scholarships",
    recordType: "scholarship",
    provider: "Ministry of Foreign Affairs and Trade (MFAT)",
    country: "New Zealand",
    degreeLevels: ["Bachelor's", "Master's", "PhD"],
    funding: "Full tuition, a living allowance, travel, and medical insurance.",
    eligibility: "Citizens of eligible developing countries.",
    typicalWindow: "Usually opens in February and closes in March.",
    typicalOpenMonth: 2,
    officialUrl: "https://www.nzscholarships.govt.nz/",
    tags: ["new zealand", "government", "fully funded"],
  },
];

export function getCatalogEntry(id: string): CatalogEntry | undefined {
  return SCHOLARSHIP_CATALOG.find((e) => e.id === id);
}

export function catalogCountries(): string[] {
  return Array.from(new Set(SCHOLARSHIP_CATALOG.map((e) => e.country))).sort();
}

export const DEGREE_LEVEL_FILTERS: DegreeLevel[] = ["Bachelor's", "Master's", "PhD", "Research"];

export interface CatalogFilters {
  query?: string;
  country?: string;
  degreeLevel?: string;
}

/**
 * Keyword search over the curated catalog. Every query word must match
 * somewhere in the entry; title and tag matches rank higher.
 */
export function searchCatalog(filters: CatalogFilters = {}): CatalogEntry[] {
  const words = (filters.query || "")
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}'-]/gu, ""))
    .filter((w) => w.length >= 2);

  const scored: { entry: CatalogEntry; score: number }[] = [];

  for (const entry of SCHOLARSHIP_CATALOG) {
    if (filters.country && entry.country !== filters.country) continue;
    if (filters.degreeLevel && !entry.degreeLevels.includes(filters.degreeLevel as DegreeLevel)) continue;

    const title = entry.title.toLowerCase();
    const tags = entry.tags.join(" ").toLowerCase();
    const rest = [entry.provider, entry.country, entry.funding, entry.eligibility, entry.degreeLevels.join(" ")]
      .join(" ")
      .toLowerCase();

    let score = 0;
    let allMatched = true;
    for (const w of words) {
      if (title.includes(w)) score += 5;
      else if (tags.includes(w)) score += 3;
      else if (rest.includes(w)) score += 1;
      else {
        allMatched = false;
        break;
      }
    }
    if (allMatched) scored.push({ entry, score });
  }

  return scored
    .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))
    .map((s) => s.entry);
}

/**
 * Next expected opening date (YYYY-MM-DD) for a watchlist reminder.
 * If the usual opening month is the current month, the reminder is due today.
 */
export function nextOpeningDate(openMonth: number, today: Date = new Date()): string {
  const year = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  if (openMonth === currentMonth) {
    return `${year}-${String(currentMonth).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  }
  const targetYear = openMonth > currentMonth ? year : year + 1;
  return `${targetYear}-${String(openMonth).padStart(2, "0")}-01`;
}
