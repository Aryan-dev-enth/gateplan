import { connectDB } from "./mongodb";
import { JobNotificationModel } from "./models";

function decodeHtmlEntities(str: string): string {
  if (!str) return "";
  return str
    .replace(/&#8377;/g, "₹")
    .replace(/&#x20b9;/gi, "₹")
    .replace(/&#X20B9;/gi, "₹")
    .replace(/&#x20B9;/gi, "₹")
    .replace(/&#₹;/g, "₹")
    .replace(/₹/g, "₹")
    .replace(/&#165;/g, "¥")
    .replace(/&#8226;/g, "•")
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Highly target PSUs/organizations list (Maharatnas, Navratnas, and Scientific Research Centers)
const psuKeywords = [
  "coal india", "cil", "coal",
  "bel", "bharat electronics",
  "bhel", "bharat heavy electricals",
  "ntpc", "national thermal power",
  "ongc", "oil and natural gas",
  "gail", "gas authority",
  "iocl", "indian oil",
  "sail", "steel authority",
  "bpcl", "bharat petroleum",
  "hpcl", "hindustan petroleum",
  "nlc", "neyveli lignite",
  "concor", "container corporation",
  "mtnl", "mahanagar telephone",
  "eil", "engineers india",
  "hal", "hindustan aeronautics",
  "pgcil", "power grid",
  "pfc", "power finance",
  "nalco", "national aluminium",
  "nbcc", "national buildings construction",
  "nmdc", "national mineral development",
  "oil india",
  "sci", "shipping corporation",
  "rinl", "rashtriya ispat",
  "rec", "rural electrification",
  "nic", "national informatics",
  "cdac", "c-dac",
  "drdo",
  "isro"
];

// Computer Science / IT / Software keywords
const csKeywords = [
  "computer science", "information technology", "cse", "cs/it", "cs & it",
  "it officer", "systems officer", "programmer", "software", "developer",
  "mca", "computer engineer", "system administrator", "information security",
  "cyber security"
];

// Excluded branches (if job is strictly for other branches and doesn't mention CS/IT)
const excludedBranches = [
  "civil engineering", "civil engineer", 
  "mechanical engineering", "mechanical engineer",
  "electrical engineering", "electrical engineer",
  "chemical engineering", "chemical engineer",
  "mining engineering", "mining engineer",
  "petroleum engineering", "petroleum engineer",
  "metallurgical engineering", "metallurgy",
  "finance officer", "accounts officer", "chartered accountant", "ca officer",
  "medical officer", "doctor", "nursing", "pharmacist",
  "law officer", "legal officer", "advocate",
  "human resource", "hr officer"
];

function hasCsItKeywords(text: string): boolean {
  const lower = text.toLowerCase();
  
  // 1. Long phrases can be matched via substring safely
  const longPhrases = [
    "computer science", 
    "information technology", 
    "systems officer", 
    "it officer",
    "software engineer", 
    "software developer", 
    "system administrator",
    "information security", 
    "cyber security", 
    "computer engineering",
    "cs/it", 
    "cs & it", 
    "computer engineer"
  ];
  if (longPhrases.some(phrase => lower.includes(phrase))) return true;
  
  // 2. Short abbreviations must use strict word boundary regex to prevent matching inside larger words (e.g. matching "it" in "limit")
  const boundaryRegex = /\b(cse|cs|it|mca|software|developer|programmer|informatics)\b/i;
  return boundaryRegex.test(lower);
}

const excludedTitleKeywords = [
  "civil", "mechanical", "electrical", "chemical", "mining", "metallurgy", 
  "metallurgical", "finance", "accounts", "ca", "medical", "doctor", "nursing", 
  "pharmacist", "law", "legal", "hr", "human resource", "marketing", "agriculture", 
  "materials", "telecommunication", "electronics & communication", "instrumentation",
  "f&a", "finance & accounts"
];

// Helper to determine if a deadline is in the past (expired) compared to current local time
function isDeadlineExpired(dateStr: string): boolean {
  if (!dateStr || /soon|norms|specified/i.test(dateStr)) {
    return false; // Not expired if it's "Apply Soon"
  }
  
  let cleaned = dateStr.replace(/<\/?[^>]+(>|$)/g, "").replace(/&nbsp;/g, " ").trim();
  cleaned = cleaned.replace(/\s+/g, " ");

  const todayStart = new Date().setHours(0, 0, 0, 0); // start of today
  
  // 1. Try parsing dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy
  const numericMatch = cleaned.match(/\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})\b/);
  if (numericMatch) {
    const day = parseInt(numericMatch[1]);
    const month = parseInt(numericMatch[2]) - 1;
    const year = parseInt(numericMatch[3]);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) {
      return d.getTime() < todayStart;
    }
  }
  
  const parsed = Date.parse(cleaned);
  if (!isNaN(parsed)) {
    return parsed < todayStart;
  }
  
  return false;
}

// Parse PSU Govt Jobs Aggregate Directory Page
function parsePsuGovtJobs(html: string) {
  const jobs: Array<{ title: string; url: string; lastDate: string; source: string; payScale: string }> = [];
  
  // Find tables in the aggregate post
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  let match;
  
  while ((match = tableRegex.exec(html)) !== null) {
    const tableHtml = match[1];
    
    const lowerTable = tableHtml.toLowerCase();
    if (!lowerTable.includes("psu") && !lowerTable.includes("vacancy") && !lowerTable.includes("last date")) {
      continue;
    }
    
    const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let trMatch;
    let isFirstRow = true;
    
    while ((trMatch = trRegex.exec(tableHtml)) !== null) {
      if (isFirstRow) {
        isFirstRow = false;
        continue;
      }
      
      const rowHtml = trMatch[1];
      const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      const tds: string[] = [];
      let tdMatch;
      while ((tdMatch = tdRegex.exec(rowHtml)) !== null) {
        tds.push(tdMatch[1]);
      }
      
      if (tds.length >= 3) {
        const firstCol = tds[0] || "";
        
        // Find anchor tag for link (space-tolerant)
        const linkRegex = /<a\s+[^>]*href=["']\s*([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i;
        let linkMatch = linkRegex.exec(firstCol) || linkRegex.exec(rowHtml);
        
        if (linkMatch) {
          const url = (linkMatch[1] || "").trim();
          let title = firstCol.replace(/<\/?[^>]+(>|$)/g, "").replace(/&nbsp;/g, " ").trim();
          let lastDate = (tds[1] || "").replace(/<\/?[^>]+(>|$)/g, "").replace(/&nbsp;/g, " ").trim();
          // Extract PSU name from third column
          const psuRaw = tds[2] ?? "";
          const psu = psuRaw.replace(/<\/?[^>]+(>|$)/g, "").replace(/&nbsp;/g, " ").trim();
          
          if (
            url && 
            title && 
            url.startsWith("http") && 
            !url.includes("javascript:") && 
            !title.toLowerCase().includes("syllabus") && 
            !title.toLowerCase().includes("eligibility")
          ) {
            const cleanTitle = title.replace(/\s+Online\s+Form\s+202[56]/gi, "").trim();
            jobs.push({
              title: cleanTitle,
              url,
              lastDate: cleanAndExtractDate(lastDate),
              source: psu,
              payScale: "As per norms"
            });
          }
        }
      }
    }
  }
  return jobs;
}

// Helper to clean and extract exact date from string (e.g. 15/06/2026, 15 June 2026)
function cleanAndExtractDate(dateStr: string): string {
  let cleaned = dateStr.replace(/<\/?[^>]+(>|$)/g, "").replace(/&nbsp;/g, " ").trim();
  cleaned = cleaned.replace(/\s+/g, " ");

  // 1. Numeric date: dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy
  const numericMatch = cleaned.match(/\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})\b/);
  if (numericMatch) {
    return numericMatch[1];
  }

  // 2. Word-based date: 15 June 2026, 15th June 2026, 15-Jun-2026
  const textDateMatch = cleaned.match(/\b(\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-zA-Z]*\b(?:\s+\d{4})?)/i);
  if (textDateMatch) {
    return textDateMatch[1];
  }
  
  const textDateMatch2 = cleaned.match(/\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-zA-Z]*\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*,\s*\d{4}|\s+\d{4})?)\b/i);
  if (textDateMatch2) {
    return textDateMatch2[1];
  }

  const hyphenatedTextMatch = cleaned.match(/\b(\d{1,2}-(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-zA-Z]*-\d{2,4})\b/i);
  if (hyphenatedTextMatch) {
    return hyphenatedTextMatch[1];
  }

  if (cleaned.length > 0 && cleaned.length < 30) {
    return cleaned;
  }
  
  return "Apply Soon";
}

// Pure Regex & Text Pattern detail extractor to parse subpages without AI
// Strictly checks for B.Tech CSE / IT eligibility and deadline validity
function parseDetailsNoAi(html: string, url: string, title: string) {
  const cleanHtml = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/script>/gi, "") // clean markup
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, "");
    
  const entryMatch = /<div class=['"]entry-content['"]>([\s\S]*?)<\/div>\s*<section/i.exec(cleanHtml) || 
                     /<div class=['"]entry-content['"]>([\s\S]*?)<\/div>/i.exec(cleanHtml) ||
                     /<div class=['"]post-body entry-content['"]>([\s\S]*?)<\/div>/i.exec(cleanHtml) ||
                     /<div class=['"]post-body['"]>([\s\S]*?)<\/div>/i.exec(cleanHtml) ||
                     /<table[^>]*class=['"]td['"][^>]*>([\s\S]*?)<\/table>/i.exec(cleanHtml);
                     
  let articleHtml = entryMatch ? entryMatch[1] : cleanHtml;
  articleHtml = decodeHtmlEntities(articleHtml);
  
  const rawText = articleHtml
    .replace(/<\/?[^>]+(>|$)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
    
  const lowerText = rawText.toLowerCase();
  const lowerTitle = title.toLowerCase();
  
  // --- A. Branch and PSU Target Filtering ---
  const isTargetPsu = psuKeywords.some(psu => lowerTitle.includes(psu) || lowerText.includes(psu));

  // Check if title or body contains CS/IT keywords with strict word boundaries
  const titleHasCs = hasCsItKeywords(title);
  const bodyHasCs = hasCsItKeywords(rawText);
  const hasCsKeywords = titleHasCs || bodyHasCs;
  
  // General Officer jobs accept ANY graduate, which includes B.Tech CSE.
  const isGeneralOfficerRecruitment = 
    lowerTitle.includes("probationary officer") || 
    lowerTitle.includes("po recruitment") || 
    lowerTitle.includes("grade b officer") ||
    lowerTitle.includes("civil services") ||
    lowerTitle.includes("assistant manager") ||
    lowerTitle.includes("management trainee") ||
    (lowerTitle.includes("recruitment") && (
      lowerText.includes("any degree") || 
      lowerText.includes("any graduate") || 
      lowerText.includes("any discipline")
    ));

  // Filter eligibility
  let isCseEligible = false;
  
  if (hasCsKeywords) {
    isCseEligible = true;
  } else if (isTargetPsu) {
    const isGeneralEng = 
      lowerText.includes("all branches") || 
      lowerText.includes("any discipline") || 
      lowerText.includes("engineering graduate") ||
      lowerText.includes("degree in engineering") ||
      lowerText.includes("b.e. / b.tech");
      
    if (isGeneralEng) {
      isCseEligible = true;
    }
  } else if (isGeneralOfficerRecruitment) {
    isCseEligible = true;
  }

  // B. Strict Whole-Word Title Exclusions for non-CS branches (e.g. electrical, mechanical, civil, hr, marketing)
  if (!titleHasCs) {
    const hasBranchExclusion = excludedTitleKeywords.some(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      return regex.test(lowerTitle);
    });
    if (hasBranchExclusion) {
      isCseEligible = false;
    }
  }

  // C. General Body Exclusions (if job is strictly for other branches and doesn't mention CS/IT)
  const hasBodyExclusions = excludedBranches.some(branch => lowerTitle.includes(branch) || (lowerText.includes(branch) && !hasCsKeywords));
  if (hasBodyExclusions) {
    isCseEligible = false;
  }

  // Strictly skip jobs that are not B.Tech CSE eligible
  if (!isCseEligible) {
    console.log(`[JobScraper] Skipping: "${title}" (Not eligible for B.Tech CSE)`);
    return null;
  }
  
  // --- B. Structured details parsing ---
  let vacancies = "Not specified";
  let payScale = "As per norms";
  let eligibility = "B.Tech CSE / IT";
  let lastDate = "Apply Soon";

  const qualKeywords = [
    { key: "computer science", label: "B.Tech CS" },
    { key: "information technology", label: "B.Tech IT" },
    { key: "b.tech", label: "B.Tech" },
    { key: "b.e", label: "B.E" },
    { key: "mca", label: "MCA" },
    { key: "m.tech", label: "M.Tech" },
    { key: "graduate", label: "Graduation" }
  ];

  // Pre-parse 1-column tables from IndGovtJobs (first table typically has 9 rows of 1 column each)
  const tables = articleHtml.match(/<table[^>]*>([\s\S]*?)<\/table>/gi) || [];
  for (const table of tables) {
    const rows = table.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
    const isSingleColTable = rows.length > 0 && rows.every(row => {
      const tds = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
      return tds.length === 1;
    });
    
    if (isSingleColTable && rows.length >= 7 && rows.length <= 11) {
      const parsedRows = rows.map(row => {
        const tdMatch = /<td[^>]*>([\s\S]*?)<\/td>/i.exec(row);
        return tdMatch && tdMatch[1] ? tdMatch[1].replace(/<\/?[^>]+(>|$)/g, "").trim() : "";
      });
      
      if (parsedRows[1] && /^\s*\d+\s*(?:posts|vacancies)/i.test(parsedRows[1])) {
        vacancies = parsedRows[1];
      }
      if (parsedRows[3] && (parsedRows[3].includes("₹") || parsedRows[3].toLowerCase().includes("pay") || parsedRows[3].toLowerCase().includes("salary") || parsedRows[3].toLowerCase().includes("stipend"))) {
        payScale = parsedRows[3];
      }
      if (parsedRows[4]) {
        eligibility = parsedRows[4];
      }
      if (parsedRows[8]) {
        const possibleDate = cleanAndExtractDate(parsedRows[8]);
        if (possibleDate !== "Apply Soon") {
          lastDate = possibleDate;
        }
      }
    }
  }

  // 1. Parse details from HTML table rows
  const tableRows = articleHtml.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
  for (const tr of tableRows) {
    const tds = tr.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
    if (tds.length >= 2) {
      const firstTd = tds[0] || "";
      const secondTd = tds[1] || "";
      const keyText = firstTd.replace(/<\/?[^>]+(>|$)/g, "").trim().toLowerCase();
      const valHtml = secondTd;
      const valText = valHtml.replace(/<\/?[^>]+(>|$)/g, "").replace(/&nbsp;/g, " ").trim();
      
      if (!valText || valText.toLowerCase().includes("click here") || valText.toLowerCase() === "link") continue;
      
      // Vacancies (If the row key contains "vacancy" or matches a CS/IT post name directly)
      const isCsItRow = csKeywords.some(kw => keyText.includes(kw));
      if (isCsItRow && /^\s*\d+\s*(?:posts|vacancies)?\s*$/i.test(valText)) {
        vacancies = valText;
      } else if (vacancies === "Not specified" && (
        keyText.includes("vacancy") || 
        keyText.includes("no. of post") || 
        keyText.includes("total post") || 
        keyText.includes("total vacancy")
      )) {
        vacancies = valText;
      }
      
      // Pay Scale
      if (payScale === "As per norms" && (
        keyText.includes("pay scale") || 
        keyText.includes("salary") || 
        keyText.includes("stipend") || 
        keyText.includes("remuneration")
      )) {
        payScale = valText;
      }
      
      // Eligibility (Ignore keys that contain dates like "as on", "date", or "limit" to prevent parsing dates as eligibility)
      if (eligibility === "B.Tech CSE / IT" && (
        (keyText.includes("eligibility") || 
         keyText.includes("qualification") || 
         keyText.includes("education")) &&
        !keyText.includes("as on") &&
        !keyText.includes("date") &&
        !keyText.includes("limit") &&
        !keyText.includes("considered")
      )) {
        const cellQuals = [];
        const cellLower = valText.toLowerCase();
        for (const qual of qualKeywords) {
          if (cellLower.includes(qual.key)) {
            cellQuals.push(qual.label);
          }
        }
        if (cellQuals.length > 0) {
          eligibility = Array.from(new Set(cellQuals)).slice(0, 3).join(" / ");
        } else if (valText.length < 60) {
          eligibility = valText;
        }
      }
 
      // If this is a 3-column table row (Post | Age/Other | Qualification) and matches a CS/IT post, capture qualification directly
      if (tds.length >= 3) {
        const thirdTd = tds[2] || "";
        const valText3 = thirdTd.replace(/<\/?[^>]+(>|$)/g, "").replace(/&nbsp;/g, " ").trim();
        if (isCsItRow && valText3 && valText3.length > 5) {
          eligibility = valText3;
        }
      }
 
      // Last Date
      if (lastDate === "Apply Soon" && (
        keyText.includes("last date") || 
        keyText.includes("closing date") || 
        keyText.includes("apply by") || 
        keyText.includes("deadline")
      )) {
        lastDate = cleanAndExtractDate(valText);
      }
    }
  }

  // 2. Fallbacks for Vacancies (using Regex on text)
  if (vacancies === "Not specified") {
    const vacancyRegexes = [
      /(?:total\s+)?vacancies\s*[:\-]\s*([\d,]+(?:\s+posts)?)/i,
      /(?:total\s+)?posts\s*[:\-]\s*([\d,]+(?:\s+posts)?)/i,
      /([\d,]+)\s*(?:vacancies|posts)/i,
      /vacancies\s*of\s*([\d,]+)/i,
      /total\s*of\s*([\d,]+)/i
    ];
    
    for (const regex of vacancyRegexes) {
      const vMatch = regex.exec(rawText);
      if (vMatch && vMatch[1]) {
        vacancies = vMatch[1].trim();
        break;
      }
    }
  }
  
  // 3. Fallbacks for Pay Scale
  if (payScale === "As per norms") {
    const payRegexes = [
      /(?:pay\s+scale|salary|stipend)\s*[:\-]\s*([^.,;|\n\r]+)/i,
      /scale\s+of\s+pay\s*[:\-]\s*([^.,;|\n\r]+)/i,
      /(?:Rs\.|₹)\s*([\d,]+\s*(?:[-–—]|to)\s*(?:Rs\.|₹)?\s*[\d,]+)/i,
      /stipend\s*of\s*([^.,;|\n\r]+)/i
    ];
    
    for (const regex of payRegexes) {
      const pMatch = regex.exec(rawText);
      if (pMatch && pMatch[1]) {
        payScale = pMatch[1].trim();
        break;
      }
    }
  }
  
  payScale = payScale.replace(/[\?]+/g, "").trim();

  // 4. Fallbacks for Eligibility
  if (eligibility === "B.Tech CSE / IT") {
    const qualifications = [];
    for (const qual of qualKeywords) {
      if (lowerText.includes(qual.key) || lowerTitle.includes(qual.key)) {
        qualifications.push(qual.label);
      }
    }
    if (qualifications.length > 0) {
      eligibility = Array.from(new Set(qualifications)).slice(0, 3).join(" / ");
    }
  }

  // 5. Fallbacks for Last Date
  if (lastDate === "Apply Soon") {
    const listItems = articleHtml.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
    for (const li of listItems) {
      const text = li.replace(/<\/?[^>]+(>|$)/g, "").replace(/&nbsp;/g, " ").trim();
      const match = /(?:last\s+date|closing\s+date|deadline|apply\s+by)\s*[:\-]\s*([^.,;|\n\r]+)/i.exec(text);
      if (match && match[1]) {
        const valText = match[1].trim();
        if (valText.length < 50) {
          lastDate = cleanAndExtractDate(valText);
          if (lastDate !== "Apply Soon") break;
        }
      }
    }
  }

  if (lastDate === "Apply Soon") {
    const dateRegexes = [
      /(?:last\s+date\s+to\s+apply|last\s+date|closing\s+date|deadline|apply\s+before)\s*[:\-–]\s*([^.,;|\n\r]+)/i,
      /(?:last\s+date|closing\s+date)\s+is\s+([^.,;|\n\r]+)/i,
      /apply\s+online\s+last\s+date\s*[:\-–]\s*([^.,;|\n\r]+)/i
    ];
    for (const regex of dateRegexes) {
      const dMatch = regex.exec(rawText);
      if (dMatch && dMatch[1]) {
        const valText = dMatch[1].trim();
        if (valText.length < 50) {
          lastDate = cleanAndExtractDate(valText);
          if (lastDate !== "Apply Soon") break;
        }
      }
    }
  }

  // Strictly skip jobs that are past their application deadline (expired)
  if (lastDate && isDeadlineExpired(lastDate)) {
    console.log(`[JobScraper] Skipping: "${title}" (Deadline ${lastDate} is already past)`);
    return null;
  }

  // 6. Extract Application / Official Link (DOM parser)
  let applicationLink = url;
  
  const applySelectors = [
    /<a\s+[^>]*href=["']\s*([^"']+)["'][^>]*><b>\s*(?:Apply\s+Online|Official\s+Notification|Download\s+PDF|Apply|Notification)\s*<\/b><\/a>/i,
    /<a\s+[^>]*href=["']\s*([^"']+)["'][^>]*>(?:Apply\s+Online|Click\s+Here\s+to\s+Apply|Apply\s+Link|Direct\s+Link\s+to\s+Apply|Official\s+Website)<\/a>/i,
    /<a\s+[^>]*href=["']\s*([^"']+)["'][^>]*><b>\s*(?:Click\s+Here\s+to\s+Apply|Register|Apply)\s*<\/b><\/a>/i,
    /<a\s+[^>]*href=["']\s*([^"']+)["'][^>]*class=['"][^'"]*btn[^'"]*['"][^>]*>([\s\S]*?)<\/a>/i
  ];
  
  let foundLink = false;
  for (const regex of applySelectors) {
    const linkMatch = regex.exec(articleHtml);
    if (linkMatch && linkMatch[1]) {
      const href = linkMatch[1].trim();
      if (href.startsWith("http") && !href.includes("bankersadda") && !href.includes("indgovtjobs") && !href.includes("sarkariresult")) {
        applicationLink = href;
        foundLink = true;
        break;
      }
    }
  }
  
  if (!foundLink) {
    const applyTableMatch = /<td>\s*(?:Apply\s+Online|Registration|Online\s+Form|Official\s+Website)\s*<\/td>\s*<td>\s*<a\s+[^>]*href=["']\s*([^"']+)["']/i.exec(articleHtml) ||
                            /<td>\s*<b>\s*(?:Apply\s+Online|Registration|Online\s+Form|Official\s+Website)\s*<\/b>\s*<\/td>\s*<td>\s*<a\s+[^>]*href=["']\s*([^"']+)["']/i.exec(articleHtml);
    if (applyTableMatch && applyTableMatch[1]) {
      const href = applyTableMatch[1].trim();
      if (href.startsWith("http") && !href.includes("bankersadda") && !href.includes("indgovtjobs") && !href.includes("sarkariresult")) {
        applicationLink = href;
        foundLink = true;
      }
    }
  }
  
  if (!foundLink) {
    const generalLinkRegex = /<a\s+[^>]*href=["']\s*([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let glMatch;
    while ((glMatch = generalLinkRegex.exec(articleHtml)) !== null) {
      const href = glMatch[1];
      const text = glMatch[2].replace(/<\/?[^>]+(>|$)/g, "").toLowerCase();
      if (href && href.startsWith("http") && !href.includes("bankersadda") && !href.includes("indgovtjobs") && !href.includes("sarkariresult")) {
        if (text.includes("apply") || text.includes("register") || text.includes("online form") || text.includes("notification") || text.includes("click here")) {
          applicationLink = href.trim();
          break;
        }
      }
    }
  }

  const csSpecificTag = csKeywords.some(keyword => lowerTitle.includes(keyword) || lowerText.includes(keyword));

  const overview = `Recruitment notice eligible for B.Tech Computer Science / IT / MCA. Evaluated for specific computer engineering roles, vacancies, salary scales, and application timelines.`;

  return {
    payScale: decodeHtmlEntities(payScale),
    vacancies: decodeHtmlEntities(vacancies),
    eligibility: decodeHtmlEntities(eligibility),
    overview: decodeHtmlEntities(overview),
    applicationLink: applicationLink,
    lastDate: decodeHtmlEntities(lastDate),
    isCsItSpecific: csSpecificTag,
    isGeneralOfficer: !csSpecificTag
  };
}

// Scrape details for a single job subpage
async function scrapeJobDetails(url: string, title: string) {
  try {
    console.log(`[JobScraper] Fetching subpage details from: ${url}`);
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    
    const html = await res.text();
    return parseDetailsNoAi(html, url, title);
  } catch (err) {
    console.error(`[JobScraper] Error scraping subpage for ${title}:`, err);
    return null;
  }
}

// Main execution function
export async function runJobScrape(forceAll: boolean = false) {
  try {
    console.log("[JobScraper] Connecting to database...");
    await connectDB();
    
    // --- Source: IndGovtJobs PSU Aggregate Directory ---
    let psuDirectoryJobs: Array<{ title: string; url: string; lastDate: string; source: string; payScale: string }> = [];
    try {
      console.log("[JobScraper] Fetching IndGovtJobs PSU Aggregate Directory...");
      const res = await fetch("https://www.indgovtjobs.in/2019/07/PSU-Govt-Jobs.html", {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });
      if (res.ok) {
        const html = await res.text();
        psuDirectoryJobs = parsePsuGovtJobs(html);
        console.log(`[JobScraper] Extracted ${psuDirectoryJobs.length} active jobs from IndGovtJobs PSU Directory.`);
      }
    } catch (e) {
      console.error("[JobScraper] Failed to fetch IndGovtJobs PSU Directory:", e);
    }
    
    // Prioritize targeted PSUs in merge list
    const psuJobs = psuDirectoryJobs.filter(job => 
      psuKeywords.some(psu => job.title.toLowerCase().includes(psu) || job.url.toLowerCase().includes(psu))
    );
    
    const otherJobs = psuDirectoryJobs.filter(job => 
      !psuKeywords.some(psu => job.title.toLowerCase().includes(psu) || job.url.toLowerCase().includes(psu))
    );

    const mergedList = [...psuJobs, ...otherJobs];
    console.log(`[JobScraper] Combined list size: ${mergedList.length} unique URLs (Prioritized ${psuJobs.length} target PSU jobs).`);
    
    if (mergedList.length === 0) {
      console.warn("[JobScraper] No job recruitments parsed. Directory page structure might have changed.");
      return 0;
    }
    
    let processedCount = 0;
    
    // Slicing top 50 jobs
    const activeJobs = mergedList.slice(0, 50);
    
    for (const job of activeJobs) {
      const existing = await JobNotificationModel.findOne({ url: job.url });
      
      const isOutdated = existing && (
        !existing.payScale || 
        existing.payScale === "As per norms" || 
        existing.lastDate === "Apply Soon" ||
        (Date.now() - new Date(existing.scrapedAt).getTime() > 1000 * 60 * 60 * 24 * 5)
      );
      
      if (!existing || isOutdated || forceAll) {
        // Skip right away if list-level date parsed as expired
        if (job.lastDate && isDeadlineExpired(job.lastDate)) {
          if (existing) {
            await JobNotificationModel.deleteOne({ url: job.url });
            console.log(`[JobScraper] Removed expired job from cache: ${job.title}`);
          }
          continue;
        }

        const details = await scrapeJobDetails(job.url, job.title);
        
        if (details) {
          const cleanTitle = decodeHtmlEntities(job.title).replace(/\s*[-–—]\s*\d+\s*$/, "").trim();
          let finalVacancies = details.vacancies;
          if ((!finalVacancies || finalVacancies === "Not specified" || finalVacancies === "Not Specified") && job.title.match(/\s*[-–—]\s*\d+\s*$/)) {
            const match = job.title.match(/\s*[-–—]\s*(\d+)\s*$/);
            if (match) finalVacancies = match[1];
          }

          const upsertDoc = {
            title: cleanTitle,
            url: job.url,
            lastDate: details.lastDate || job.lastDate || "Apply Soon",
            payScale: details.payScale,
            vacancies: finalVacancies,
            eligibility: details.eligibility,
            overview: details.overview,
            applicationLink: details.applicationLink,
            isCsItSpecific: details.isCsItSpecific,
            isGeneralOfficer: details.isGeneralOfficer,
            scrapedAt: new Date(),
            source: job.source
          };
          
          await JobNotificationModel.findOneAndUpdate(
            { url: job.url },
            { $set: upsertDoc },
            { upsert: true, returnDocument: 'after' }
          );
          
          processedCount++;
          console.log(`[JobScraper] Upserted B.Tech CSE Eligible Job: ${job.title} (CS/IT: ${details.isCsItSpecific}, Vacancies: ${details.vacancies})`);
          
          await new Promise(r => setTimeout(r, 1500));
        } else {
          if (existing) {
            await JobNotificationModel.deleteOne({ url: job.url });
            console.log(`[JobScraper] Removed non-CSE or expired job from cache: ${job.title}`);
          }
        }
      } else {
        // Sync dates if they are extended
        if (job.lastDate && job.lastDate !== "Apply Soon" && existing.lastDate !== job.lastDate) {
          existing.lastDate = job.lastDate;
          existing.scrapedAt = new Date();
          await existing.save();
          console.log(`[JobScraper] Updated lastDate for: ${job.title} -> ${job.lastDate}`);
        }
      }
    }
    
    // Purge any remaining strictly non-eligible or expired jobs from DB just in case
    const allStoredJobs = await JobNotificationModel.find({});
    for (const stored of allStoredJobs) {
      const lowerStoredTitle = stored.title.toLowerCase();
      const lowerStoredOverview = (stored.overview || "").toLowerCase();
      const lowerStoredElig = (stored.eligibility || "").toLowerCase();
      
      const psuCheck = psuKeywords.some(psu => lowerStoredTitle.includes(psu));
      const hasCsKeywords = csKeywords.some(kw => lowerStoredTitle.includes(kw) || lowerStoredOverview.includes(kw) || lowerStoredElig.includes(kw));
      
      const isGeneralRecruit = 
        lowerStoredTitle.includes("probationary officer") || 
        lowerStoredTitle.includes("po recruitment") || 
        lowerStoredTitle.includes("grade b officer") ||
        lowerStoredTitle.includes("civil services") ||
        lowerStoredTitle.includes("assistant manager") ||
        lowerStoredTitle.includes("management trainee") ||
        lowerStoredElig.includes("any degree") || 
        lowerStoredElig.includes("any graduate");

      let matchesEligibility = hasCsKeywords || isGeneralRecruit || (psuCheck && (lowerStoredTitle.includes("computer") || lowerStoredTitle.includes("cs") || lowerStoredTitle.includes("it") || lowerStoredTitle.includes("cse")));
      
      const matchesExcl = excludedBranches.some(branch => lowerStoredTitle.includes(branch));
      if (matchesExcl) {
        matchesEligibility = false;
      }
      
      // Auto-purge expired jobs
      if (stored.lastDate && isDeadlineExpired(stored.lastDate)) {
        matchesEligibility = false;
      }
      
      if (!matchesEligibility) {
        await JobNotificationModel.deleteOne({ _id: stored._id });
        console.log(`[JobScraper] Purged historical non-CSE or expired job: ${stored.title}`);
      }
    }
    
    console.log(`[JobScraper] Scraper completed. Total newly synced B.Tech CSE jobs: ${processedCount}`);
    return processedCount;
  } catch (error) {
    console.error("[JobScraper] Critical failure in scraper loop:", error);
    throw error;
  }
}
