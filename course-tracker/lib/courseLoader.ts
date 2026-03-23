import fs from "fs";
import path from "path";

export interface Lecture {
  id: string;
  title: string;
  type: string;
  url: string;
  duration: number; // seconds
  isLecture: boolean; // true = video/liveclass, false = pdf/article/file
}

export interface Module {
  id: string;
  name: string;
  subjectId: string;
  lectures: Lecture[];
}

export interface Subject {
  id: string;
  name: string;
  modules: Module[];
  tag?: "full" | "compact" | "notes" | "extra"; // classification
}

const COURSES_DIR = path.join(process.cwd(), "..", "COURSES-cmd");

function slugify(str: string) {
  return str.replace(/[^a-zA-Z0-9]/g, "_");
}

/** Types that count as actual watchable lectures */
export const LECTURE_TYPES = new Set(["video", "liveclass"]);

/**
 * Module-level patterns to exclude — these are supplementary, not core lectures.
 * Matched case-insensitively against the module folder name.
 */
const EXCLUDED_MODULE_PATTERNS = [
  /hand.?written notes/i,
  /students.*notes/i,
  /toppers.*notes/i,
  /\(old\)/i,
  /\(can skip\)/i,
  /\(optional\)/i,
  /old.*module/i,
  /^old\s/i,
  /useful links/i,
  /orientation session/i,
  /weekly quizzes/i,
  /mentorship sessions/i,
  /toppers interviews/i,
  /general session/i,
  /optional logarithmic/i,
];

/**
 * Subject numbers that are "extras" — compact courses, notes, general sessions.
 * These are shown in a separate "Extras" folder on the dashboard and are NOT
 * counted in the overall ETA / completion percentage.
 *
 * 14 = Discrete Math Compact
 * 15 = Digital Logic Compact
 * 16 = DBMS Compact
 * 17 = TOC Compact
 * 18 = Toppers' Handwritten Notes
 * 19 = General Sessions
 */
const EXTRA_SUBJECT_NUMBERS = new Set([14, 15, 16, 17, 18, 19]);

/**
 * For subjects that have both a "NEW" and "OLD" version of the same module,
 * we keep only the NEW one. Detected by module name starting with "NEW" or "OLD".
 */
function deduplicateModules(modules: { name: string; rawName: string; id: string; subjectId: string; lectures: Lecture[] }[]) {
  // If there's a "NEW X" and "OLD X" pair, drop the OLD one
  const newNames = new Set(
    modules
      .filter((m) => /^new\s/i.test(m.name))
      .map((m) => m.name.replace(/^new\s+/i, "").toLowerCase())
  );

  return modules.filter((m) => {
    if (/^old\s/i.test(m.name)) {
      const base = m.name.replace(/^old\s+/i, "").toLowerCase();
      if (newNames.has(base)) return false; // drop old if new exists
    }
    return true;
  });
}

export function loadCourses(): Subject[] {
  if (!fs.existsSync(COURSES_DIR)) return [];

  const subjectDirs = fs
    .readdirSync(COURSES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  const subjects: Subject[] = [];

  for (const subjectDir of subjectDirs) {
    // Extract leading number to check exclusion list
    const numMatch = subjectDir.name.match(/^(\d+)\./);
    const subjectNum = numMatch ? parseInt(numMatch[1], 10) : 0;

    if (EXTRA_SUBJECT_NUMBERS.has(subjectNum)) {
      // Still load it, but tag as extra so dashboard can group it separately
      // We'll set tag below
    }

    const subjectPath = path.join(COURSES_DIR, subjectDir.name);
    const subjectId = slugify(subjectDir.name);
    const subjectName = subjectDir.name.replace(/^\d+\.\s*/, "");

    const moduleDirs = fs
      .readdirSync(subjectPath, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    const rawModules = moduleDirs
      .map((modDir) => {
        const modName = modDir.name.replace(/^\d+\.\s*/, "");

        // Skip excluded module patterns
        if (EXCLUDED_MODULE_PATTERNS.some((p) => p.test(modDir.name) || p.test(modName))) {
          return null;
        }

        const modPath = path.join(subjectPath, modDir.name);
        const moduleId = slugify(subjectDir.name + "__" + modDir.name);

        let lectures: Lecture[] = [];
        const dataFile = path.join(modPath, "data.json");
        if (fs.existsSync(dataFile)) {
          try {
            const raw = JSON.parse(fs.readFileSync(dataFile, "utf-8"));
            lectures = raw.map((item: Record<string, unknown>) => ({
              id: item.id as string,
              title: item.title as string,
              type: item.type as string,
              url: item.url as string,
              duration: (item.duration as number) || 0,
              isLecture: LECTURE_TYPES.has(item.type as string),
            }));
          } catch {
            lectures = [];
          }
        }

        return { id: moduleId, name: modName, rawName: modDir.name, subjectId, lectures };
      })
      .filter(Boolean) as { id: string; name: string; rawName: string; subjectId: string; lectures: Lecture[] }[];

    const modules: Module[] = deduplicateModules(rawModules).map(({ rawName: _r, ...m }) => m);

    // Skip subjects with no modules after filtering
    if (modules.length === 0) continue;

    subjects.push({
      id: subjectId,
      name: subjectName,
      modules,
      tag: EXTRA_SUBJECT_NUMBERS.has(subjectNum) ? "extra" : "full",
    });
  }

  return subjects;
}
