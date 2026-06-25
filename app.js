const PDFJS_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.mjs";
const PDFJS_WORKER_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.mjs";
const DB_NAME = "resumeRadarUserVault";
const DB_VERSION = 1;
const ACTIVE_USER_ID = "local-applicant";
const LEGACY_TRACKER_KEY = "resumeRadar.savedJobs.v1";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const nodes = {
  roleInput: $("#roleInput"),
  companyInput: $("#companyInput"),
  resumeFile: $("#resumeFile"),
  fileLabel: $("#fileLabel"),
  userNameInput: $("#userNameInput"),
  userEmailInput: $("#userEmailInput"),
  dbStatus: $("#dbStatus"),
  resumeText: $("#resumeText"),
  jobText: $("#jobText"),
  analyzeBtn: $("#analyzeBtn"),
  saveJobBtn: $("#saveJobBtn"),
  downloadCvBtn: $("#downloadCvBtn"),
  downloadPdfBtn: $("#downloadPdfBtn"),
  sampleBtn: $("#sampleBtn"),
  clearBtn: $("#clearBtn"),
  exportBtn: $("#exportBtn"),
  inputHelp: $("#inputHelp"),
  scoreOrbit: $("#scoreOrbit"),
  scoreValue: $("#scoreValue"),
  scoreTitle: $("#scoreTitle"),
  scoreSummary: $("#scoreSummary"),
  metricGrid: $("#metricGrid"),
  keywordEmpty: $("#keywordEmpty"),
  keywordReport: $("#keywordReport"),
  priorityTerms: $("#priorityTerms"),
  coveredTerms: $("#coveredTerms"),
  gapCount: $("#gapCount"),
  coveredCount: $("#coveredCount"),
  requirementMix: $("#requirementMix"),
  categoryBars: $("#categoryBars"),
  atsChecks: $("#atsChecks"),
  actionList: $("#actionList"),
  bulletList: $("#bulletList"),
  copyPlanBtn: $("#copyPlanBtn"),
  trackerTable: $("#trackerTable"),
  clearTrackerBtn: $("#clearTrackerBtn"),
};

let lastReport = null;
let lastFile = null;
let liveScanTimer = null;
let profileSaveTimer = null;
let db = null;
let savedJobsCache = [];
let currentUser = {
  id: ACTIVE_USER_ID,
  name: "",
  email: "",
  updatedAt: "",
};

const stopWords = new Set(
  `
  a about above across after again against all almost along also although always am among an and
  any are around as at be because been before being between both but by can cannot could did do
  does doing done down during each either else enough especially etc every for from further get
  gets getting had has have having he her here hers herself him himself his how i if in into is it
  its itself just least less many may me might more most much must my myself neither no nor not of
  off on once only or other our ours ourselves out over own per quite rather really same she should
  so some such than that the their theirs them themselves then there these they this those through
  to too under until up upon us use used using very via was we were what when where which while who
  whom why will with within without would you your yours yourself yourselves role roles candidate
  candidates applicant applicants job jobs position positions company companies team teams work
  working environment ability responsible responsibilities including include includes required
  requirement requirements preferred plus nice bonus strong excellent good great proven relevant
  experience experienced years year day days
`.split(/\s+/).filter(Boolean)
);

const actionVerbs = [
  "accelerated",
  "achieved",
  "aligned",
  "analyzed",
  "architected",
  "automated",
  "built",
  "coached",
  "collaborated",
  "created",
  "delivered",
  "designed",
  "directed",
  "drove",
  "enabled",
  "engineered",
  "established",
  "executed",
  "grew",
  "implemented",
  "improved",
  "launched",
  "led",
  "managed",
  "measured",
  "optimized",
  "owned",
  "prioritized",
  "reduced",
  "resolved",
  "scaled",
  "shipped",
  "streamlined",
  "supported",
  "transformed",
];

const skillBank = [
  { term: "JavaScript", aliases: ["JS", "ECMAScript"], category: "Tools" },
  { term: "TypeScript", aliases: ["TS"], category: "Tools" },
  { term: "React", aliases: ["React.js", "ReactJS"], category: "Tools" },
  { term: "Next.js", aliases: ["NextJS"], category: "Tools" },
  { term: "Node.js", aliases: ["Node", "NodeJS"], category: "Tools" },
  { term: "Python", aliases: [], category: "Tools" },
  { term: "Java", aliases: [], category: "Tools" },
  { term: "C#", aliases: ["C Sharp"], category: "Tools" },
  { term: "C++", aliases: [], category: "Tools" },
  { term: "SQL", aliases: ["Structured Query Language"], category: "Tools" },
  { term: "PostgreSQL", aliases: ["Postgres"], category: "Tools" },
  { term: "MySQL", aliases: [], category: "Tools" },
  { term: "MongoDB", aliases: [], category: "Tools" },
  { term: "REST API", aliases: ["RESTful API", "REST APIs"], category: "Tools" },
  { term: "GraphQL", aliases: [], category: "Tools" },
  { term: "AWS", aliases: ["Amazon Web Services"], category: "Tools" },
  { term: "Azure", aliases: ["Microsoft Azure"], category: "Tools" },
  { term: "GCP", aliases: ["Google Cloud", "Google Cloud Platform"], category: "Tools" },
  { term: "Docker", aliases: [], category: "Tools" },
  { term: "Kubernetes", aliases: ["K8s"], category: "Tools" },
  { term: "CI/CD", aliases: ["Continuous Integration", "Continuous Delivery"], category: "Tools" },
  { term: "Git", aliases: ["GitHub", "GitLab", "Bitbucket"], category: "Tools" },
  { term: "Terraform", aliases: [], category: "Tools" },
  { term: "Linux", aliases: [], category: "Tools" },
  { term: "Machine Learning", aliases: ["ML"], category: "Hard skills" },
  { term: "Artificial Intelligence", aliases: ["AI"], category: "Hard skills" },
  { term: "Data Analysis", aliases: ["Data Analytics"], category: "Hard skills" },
  { term: "Data Visualization", aliases: [], category: "Hard skills" },
  { term: "Power BI", aliases: ["PowerBI"], category: "Tools" },
  { term: "Tableau", aliases: [], category: "Tools" },
  { term: "Excel", aliases: ["Microsoft Excel"], category: "Tools" },
  { term: "Google Sheets", aliases: [], category: "Tools" },
  { term: "Looker", aliases: ["Looker Studio"], category: "Tools" },
  { term: "ETL", aliases: ["ELT"], category: "Hard skills" },
  { term: "A/B Testing", aliases: ["AB Testing", "Experimentation"], category: "Hard skills" },
  { term: "Statistics", aliases: ["Statistical Analysis"], category: "Hard skills" },
  { term: "Product Management", aliases: ["Product Manager"], category: "Hard skills" },
  { term: "Roadmapping", aliases: ["Product Roadmap", "Roadmap"], category: "Hard skills" },
  { term: "User Research", aliases: ["UX Research"], category: "Hard skills" },
  { term: "Market Research", aliases: [], category: "Hard skills" },
  { term: "Agile", aliases: ["Scrum", "Kanban"], category: "Hard skills" },
  { term: "Jira", aliases: [], category: "Tools" },
  { term: "Figma", aliases: [], category: "Tools" },
  { term: "UX Design", aliases: ["User Experience"], category: "Hard skills" },
  { term: "UI Design", aliases: ["User Interface"], category: "Hard skills" },
  { term: "Project Management", aliases: ["Program Management"], category: "Hard skills" },
  { term: "Stakeholder Management", aliases: [], category: "Soft skills" },
  { term: "Cross-functional", aliases: ["Cross functional"], category: "Soft skills" },
  { term: "Leadership", aliases: ["Team Leadership"], category: "Soft skills" },
  { term: "Communication", aliases: ["Written Communication", "Verbal Communication"], category: "Soft skills" },
  { term: "Problem Solving", aliases: ["Problem-solving"], category: "Soft skills" },
  { term: "Collaboration", aliases: ["Collaborative"], category: "Soft skills" },
  { term: "Customer Success", aliases: ["Customer Experience"], category: "Hard skills" },
  { term: "CRM", aliases: ["Salesforce", "HubSpot"], category: "Tools" },
  { term: "Salesforce", aliases: [], category: "Tools" },
  { term: "HubSpot", aliases: [], category: "Tools" },
  { term: "Lead Generation", aliases: ["Prospecting"], category: "Hard skills" },
  { term: "Account Management", aliases: [], category: "Hard skills" },
  { term: "Pipeline Management", aliases: ["Sales Pipeline"], category: "Hard skills" },
  { term: "SEO", aliases: ["Search Engine Optimization"], category: "Hard skills" },
  { term: "SEM", aliases: ["Paid Search"], category: "Hard skills" },
  { term: "Google Analytics", aliases: ["GA4", "Google Analytics 4"], category: "Tools" },
  { term: "Content Strategy", aliases: [], category: "Hard skills" },
  { term: "Email Marketing", aliases: [], category: "Hard skills" },
  { term: "Social Media", aliases: [], category: "Hard skills" },
  { term: "Recruiting", aliases: ["Talent Acquisition"], category: "Hard skills" },
  { term: "ATS", aliases: ["Applicant Tracking System"], category: "Tools" },
  { term: "Sourcing", aliases: ["Candidate Sourcing"], category: "Hard skills" },
  { term: "Interviewing", aliases: ["Interview Coordination"], category: "Hard skills" },
  { term: "Onboarding", aliases: [], category: "Hard skills" },
  { term: "HRIS", aliases: ["Human Resources Information System"], category: "Tools" },
  { term: "Payroll", aliases: [], category: "Hard skills" },
  { term: "Compliance", aliases: ["Regulatory Compliance"], category: "Hard skills" },
  { term: "Risk Management", aliases: [], category: "Hard skills" },
  { term: "Financial Analysis", aliases: ["Finance Analysis"], category: "Hard skills" },
  { term: "Forecasting", aliases: ["Budget Forecasting"], category: "Hard skills" },
  { term: "Budgeting", aliases: [], category: "Hard skills" },
  { term: "Accounting", aliases: [], category: "Hard skills" },
  { term: "QuickBooks", aliases: [], category: "Tools" },
  { term: "Xero", aliases: [], category: "Tools" },
  { term: "Supply Chain", aliases: ["Logistics"], category: "Hard skills" },
  { term: "Inventory Management", aliases: [], category: "Hard skills" },
  { term: "Process Improvement", aliases: ["Continuous Improvement"], category: "Hard skills" },
  { term: "Operations Management", aliases: [], category: "Hard skills" },
  { term: "Healthcare", aliases: [], category: "Domain" },
  { term: "Clinical", aliases: ["Clinical Operations"], category: "Domain" },
  { term: "HIPAA", aliases: [], category: "Credentials" },
  { term: "GDPR", aliases: [], category: "Credentials" },
  { term: "SOC 2", aliases: ["SOC2"], category: "Credentials" },
  { term: "PMP", aliases: ["Project Management Professional"], category: "Credentials" },
  { term: "CPA", aliases: ["Certified Public Accountant"], category: "Credentials" },
  { term: "MBA", aliases: ["Master of Business Administration"], category: "Credentials" },
  { term: "Bachelor's Degree", aliases: ["Bachelors Degree", "BA", "BS", "BSc"], category: "Credentials" },
  { term: "Master's Degree", aliases: ["Masters Degree", "MA", "MS", "MSc"], category: "Credentials" },
];

const sectionPatterns = [
  { key: "summary", label: "Summary", pattern: /(^|\n)\s*(professional\s+summary|profile|summary|objective)\s*[:\-]?\s*(\n|$)/i },
  { key: "skills", label: "Skills", pattern: /(^|\n)\s*(technical\s+skills|skills|core\s+competencies|tools)\s*[:\-]?\s*(\n|$)/i },
  { key: "experience", label: "Experience", pattern: /(^|\n)\s*(work\s+experience|professional\s+experience|experience|employment)\s*[:\-]?\s*(\n|$)/i },
  { key: "education", label: "Education", pattern: /(^|\n)\s*(education|academic\s+background)\s*[:\-]?\s*(\n|$)/i },
  { key: "projects", label: "Projects", pattern: /(^|\n)\s*(projects|portfolio|case\s+studies)\s*[:\-]?\s*(\n|$)/i },
  { key: "certifications", label: "Certifications", pattern: /(^|\n)\s*(certifications|certificates|licenses)\s*[:\-]?\s*(\n|$)/i },
];

const sampleResume = `Jordan Avery
Cape Town, South Africa | jordan.avery@email.com | +27 82 555 0184
LinkedIn: linkedin.com/in/jordanavery | Portfolio: jordanavery.dev

Professional Summary
Product manager with 6 years of experience leading SaaS growth, analytics, and user research programs. Strong background in Agile delivery, roadmapping, stakeholder management, and data-informed prioritization.

Skills
Product Management, Roadmapping, Agile, Jira, Figma, SQL, Tableau, A/B Testing, User Research, Stakeholder Management, Go-to-market, Customer Interviews

Professional Experience
Senior Product Manager | CloudLedger | 2022 - Present
- Led cross-functional teams across engineering, design, and customer success to launch billing automation used by 18,000+ customers.
- Improved activation by 22% through funnel analysis, user research, and onboarding experiments.
- Built quarterly roadmap process that aligned sales, support, and leadership around measurable product outcomes.

Product Manager | Finlytics | 2019 - 2022
- Shipped dashboard features using SQL insights, customer interviews, and Figma prototypes.
- Reduced churn by 11% by prioritizing reporting improvements for enterprise accounts.
- Managed sprint planning, backlog refinement, and stakeholder updates in Jira.

Education
BCom Information Systems, University of Cape Town`;

const sampleJob = `Senior Product Manager, Growth

We are looking for a Senior Product Manager to own activation, retention, and monetization for a B2B SaaS platform. The ideal candidate has strong product management experience, excellent stakeholder management, and a track record of using data to ship measurable outcomes.

Responsibilities
- Lead discovery, user research, roadmap planning, and prioritization for growth opportunities.
- Partner with engineering, design, data, marketing, and customer success teams.
- Define metrics, run A/B testing, analyze funnels, and communicate product insights.
- Create clear product requirements, launch plans, and executive updates.

Requirements
- 5+ years of product management experience in B2B SaaS.
- Strong SQL, analytics, experimentation, and data visualization skills.
- Experience with Jira, Figma, Agile delivery, and cross-functional leadership.
- Excellent written communication and stakeholder management.

Preferred
- Experience with pricing, packaging, monetization, or lifecycle marketing.
- MBA or relevant business degree is a plus.`;

init();

async function init() {
  nodes.resumeFile.addEventListener("change", handleFileUpload);
  nodes.analyzeBtn.addEventListener("click", runScan);
  nodes.sampleBtn.addEventListener("click", loadSample);
  nodes.clearBtn.addEventListener("click", clearInputs);
  nodes.exportBtn.addEventListener("click", downloadReport);
  nodes.saveJobBtn.addEventListener("click", saveCurrentJob);
  nodes.downloadCvBtn.addEventListener("click", downloadPassableCv);
  nodes.downloadPdfBtn.addEventListener("click", downloadHighlightedPdf);
  nodes.copyPlanBtn.addEventListener("click", copyTailoringPlan);
  nodes.clearTrackerBtn.addEventListener("click", clearTracker);
  nodes.userNameInput.addEventListener("input", scheduleProfileSave);
  nodes.userEmailInput.addEventListener("input", scheduleProfileSave);
  [nodes.roleInput, nodes.companyInput, nodes.resumeText, nodes.jobText].forEach((input) => {
    input.addEventListener("input", scheduleLiveScan);
  });

  $$(".tab").forEach((button) => {
    button.addEventListener("click", () => activateTab(button.dataset.tab));
  });

  await initUserVault();
  await renderTracker();
  refreshIcons();
}

function scheduleLiveScan() {
  clearTimeout(liveScanTimer);

  const resumeReady = nodes.resumeText.value.trim().length > 220;
  const jobReady = nodes.jobText.value.trim().length > 220;
  if (!resumeReady || !jobReady) return;

  liveScanTimer = setTimeout(() => {
    runScan({ quiet: true });
  }, 700);
}

async function initUserVault() {
  try {
    db = await openUserDatabase();
    await migrateLegacyJobs();
    currentUser = (await getVaultRecord("users", ACTIVE_USER_ID)) || currentUser;
    nodes.userNameInput.value = currentUser.name || "";
    nodes.userEmailInput.value = currentUser.email || "";
    savedJobsCache = await getAllVaultRecords("jobs");
    await updateVaultStatus();
  } catch (error) {
    db = null;
    nodes.dbStatus.textContent = "Local vault unavailable in this browser. Scans still work, but saved data will not persist.";
    console.warn("Resume Radar vault unavailable", error);
  }
}

function openUserDatabase() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB is not available."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains("users")) {
        database.createObjectStore("users", { keyPath: "id" });
      }

      if (!database.objectStoreNames.contains("jobs")) {
        const jobs = database.createObjectStore("jobs", { keyPath: "id" });
        jobs.createIndex("savedAt", "savedAt");
      }

      if (!database.objectStoreNames.contains("scans")) {
        const scans = database.createObjectStore("scans", { keyPath: "id" });
        scans.createIndex("createdAt", "createdAt");
      }

      if (!database.objectStoreNames.contains("uploads")) {
        const uploads = database.createObjectStore("uploads", { keyPath: "id" });
        uploads.createIndex("createdAt", "createdAt");
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function vaultStore(name, mode = "readonly") {
  if (!db) return null;
  return db.transaction(name, mode).objectStore(name);
}

function requestAsPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getVaultRecord(storeName, key) {
  const store = vaultStore(storeName);
  if (!store) return null;
  return requestAsPromise(store.get(key));
}

async function getAllVaultRecords(storeName) {
  const store = vaultStore(storeName);
  if (!store) return [];
  return requestAsPromise(store.getAll());
}

async function putVaultRecord(storeName, record) {
  const store = vaultStore(storeName, "readwrite");
  if (!store) return record;
  await requestAsPromise(store.put(record));
  return record;
}

async function deleteVaultRecord(storeName, key) {
  const store = vaultStore(storeName, "readwrite");
  if (!store) return;
  await requestAsPromise(store.delete(key));
}

async function clearVaultStore(storeName) {
  const store = vaultStore(storeName, "readwrite");
  if (!store) return;
  await requestAsPromise(store.clear());
}

async function countVaultRecords(storeName) {
  const store = vaultStore(storeName);
  if (!store) return 0;
  return requestAsPromise(store.count());
}

async function migrateLegacyJobs() {
  const legacy = localStorage.getItem(LEGACY_TRACKER_KEY);
  if (!legacy || !db) return;

  try {
    const jobs = JSON.parse(legacy);
    if (Array.isArray(jobs)) {
      for (const job of jobs) {
        await putVaultRecord("jobs", job);
      }
      localStorage.removeItem(LEGACY_TRACKER_KEY);
    }
  } catch {
    localStorage.removeItem(LEGACY_TRACKER_KEY);
  }
}

function scheduleProfileSave() {
  clearTimeout(profileSaveTimer);
  profileSaveTimer = setTimeout(saveProfile, 500);
}

async function saveProfile() {
  currentUser = {
    id: ACTIVE_USER_ID,
    name: nodes.userNameInput.value.trim(),
    email: nodes.userEmailInput.value.trim(),
    updatedAt: new Date().toISOString(),
  };

  await putVaultRecord("users", currentUser);
  await updateVaultStatus();
}

async function updateVaultStatus() {
  if (!db) return;

  const jobCount = await countVaultRecords("jobs");
  const scanCount = await countVaultRecords("scans");
  const uploadCount = await countVaultRecords("uploads");
  const profileLabel = currentUser.name ? `Profile saved for ${currentUser.name}` : "Anonymous profile ready";
  nodes.dbStatus.textContent = `${profileLabel}. ${jobCount} jobs, ${scanCount} scans, ${uploadCount} uploads stored locally.`;
}

async function saveUploadSnapshot(file, extractedText) {
  await putVaultRecord("uploads", {
    id: crypto.randomUUID?.() || `upload-${Date.now()}`,
    userId: ACTIVE_USER_ID,
    name: file.name,
    type: file.type || extensionOf(file.name),
    extension: extensionOf(file.name),
    size: file.size,
    extractedCharacters: extractedText.length,
    preview: extractedText.slice(0, 5000),
    createdAt: new Date().toISOString(),
  });
  await updateVaultStatus();
}

async function saveScanSnapshot(report, resume, job) {
  await putVaultRecord("scans", {
    id: report.id,
    userId: ACTIVE_USER_ID,
    role: report.role,
    company: report.company,
    score: report.overall,
    keywordScore: report.keywordScore,
    missing: report.missingTerms.length,
    file: lastFile,
    resumeCharacters: resume.length,
    jobCharacters: job.length,
    topGaps: report.missingTerms.slice(0, 8).map((term) => term.label),
    createdAt: report.createdAt,
  });
  await updateVaultStatus();
}

async function handleFileUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  lastFile = {
    name: file.name,
    type: file.type || extensionOf(file.name),
    extension: extensionOf(file.name),
    size: file.size,
  };

  nodes.fileLabel.textContent = `Reading ${file.name} (${formatFileSize(file.size)})`;
  nodes.inputHelp.textContent =
    extensionOf(file.name) === "pdf"
      ? "No app-side PDF size cap is applied. Large PDFs may take a while and still depend on your browser's memory."
      : "I am pulling out the text. If the document is really an image in disguise, paste the text instead.";

  try {
    const text = await readResumeFile(file);
    nodes.resumeText.value = text.trim();
    await saveUploadSnapshot(file, text.trim());
    nodes.fileLabel.textContent = file.name;
    nodes.inputHelp.textContent = text.trim().length
      ? `Resume imported from ${formatFileSize(file.size)}. The upload metadata is in your local vault.`
      : "I could not find readable text. Paste the resume manually for a better scan.";
  } catch (error) {
    nodes.fileLabel.textContent = "Upload failed. Paste text instead.";
    nodes.inputHelp.textContent = error.message;
    showToast("I could not extract that file. Paste the resume text and we can still scan it.");
  }
}

async function readResumeFile(file) {
  const extension = extensionOf(file.name);

  if (extension === "pdf") return readPdf(file);
  if (extension === "docx") return readDocx(file);
  if (["txt", "md", "text"].includes(extension)) return file.text();

  throw new Error("Supported formats are PDF, DOCX, TXT, and Markdown.");
}

async function readPdf(file) {
  const pdfjs = await import(PDFJS_URL);
  pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;

  nodes.inputHelp.textContent = `Loading PDF (${formatFileSize(file.size)}). No app-side size cap; your browser gets the final say.`;
  const data = await file.arrayBuffer();
  const document = await pdfjs.getDocument({ data }).promise;
  const pages = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    if (pageNumber === 1 || pageNumber % 5 === 0 || pageNumber === document.numPages) {
      nodes.inputHelp.textContent = `Reading PDF page ${pageNumber} of ${document.numPages}. Big files may need a minute.`;
    }

    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(" ");
    pages.push(pageText);
  }

  return pages.join("\n\n");
}

async function readDocx(file) {
  if (!window.mammoth) {
    throw new Error("DOCX parser is still loading. Try again in a moment or paste the text.");
  }

  const arrayBuffer = await file.arrayBuffer();
  const result = await window.mammoth.extractRawText({ arrayBuffer });
  return result.value || "";
}

async function runScan(options = {}) {
  const quiet = Boolean(options.quiet);
  const resume = nodes.resumeText.value.trim();
  const job = nodes.jobText.value.trim();

  if (!resume || !job) {
    if (!quiet) showToast("Add both resume text and a job description first.");
    return;
  }

  lastReport = analyzeApplication({
    resume,
    job,
    role: nodes.roleInput.value.trim(),
    company: nodes.companyInput.value.trim(),
    file: lastFile,
  });

  renderReport(lastReport);
  nodes.saveJobBtn.disabled = false;
  nodes.exportBtn.disabled = false;
  nodes.downloadCvBtn.disabled = false;
  nodes.downloadPdfBtn.disabled = false;
  nodes.copyPlanBtn.disabled = false;
  if (!quiet) {
    await saveScanSnapshot(lastReport, resume, job);
  }
  nodes.inputHelp.textContent = `Live check: ${lastReport.overall}% match, ${lastReport.missingTerms.length} things worth fixing first.`;
}

function analyzeApplication({ resume, job, role, company, file }) {
  const jobBrief = parseJobBrief(job, role, company);
  const terms = extractJobTerms(job, role);
  const assessedTerms = terms.map((term) => assessTerm(term, resume, job));

  const keywordScore = scoreWeightedCoverage(assessedTerms);
  const criticalScore = scoreCriticalCoverage(assessedTerms);
  const structure = scoreResumeStructure(resume, file);
  const evidence = scoreEvidence(resume);
  const alignment = scoreRoleAlignment(resume, job, role, jobBrief, assessedTerms);
  const profile = scoreProfileCompleteness(resume);

  const overall = clampScore(
    Math.round(
      keywordScore * 0.36 +
        criticalScore * 0.2 +
        structure.score * 0.15 +
        alignment.score * 0.13 +
        evidence.score * 0.1 +
        profile.score * 0.06
    )
  );

  const missingTerms = assessedTerms
    .filter((term) => term.status !== "covered")
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 16);

  const coveredTerms = assessedTerms
    .filter((term) => term.status === "covered")
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 24);

  const actionPlan = buildActionPlan({
    missingTerms,
    coveredTerms,
    structure,
    evidence,
    alignment,
    profile,
    jobBrief,
  });
  const cvPack = buildPassableCv({
    resume,
    missingTerms,
    coveredTerms,
    structure,
    evidence,
    alignment,
    profile,
    jobBrief,
    role: role || jobBrief.title || "Target role",
    company: company || jobBrief.company || "Target company",
  });

  return {
    id: crypto.randomUUID?.() || String(Date.now()),
    createdAt: new Date().toISOString(),
    resumeWordCount: wordCount(resume),
    jobWordCount: wordCount(job),
    role: role || jobBrief.title || "Target role",
    company: company || jobBrief.company || "Target company",
    jobBrief,
    terms: assessedTerms,
    missingTerms,
    coveredTerms,
    keywordScore,
    criticalScore,
    structure,
    evidence,
    alignment,
    profile,
    overall,
    actionPlan,
    bullets: buildBulletStarters(missingTerms, coveredTerms, jobBrief),
    recruiterLens: buildRecruiterLens(overall, assessedTerms, structure, evidence, alignment, profile, jobBrief),
    originalResume: resume,
    optimizedCv: cvPack.text,
    highlightedLines: cvPack.highlightedLines,
    changeSummary: cvPack.changeSummary,
  };
}

function extractJobTerms(job, role) {
  const terms = new Map();
  const normalizedJob = normalizeForSearch(job);

  const addTerm = (label, options = {}) => {
    const cleaned = cleanTerm(label);
    if (!isUsefulTerm(cleaned)) return;

    const key = normalizeKey(cleaned);
    const current = terms.get(key);
    const category = options.category || inferCategory(cleaned);
    const level = options.level || getRequirementLevel(job, cleaned);
    const frequency = countTerm(job, cleaned, options.aliases || []);
    const weight = buildTermWeight({ label: cleaned, category, level, frequency, source: options.source });

    if (!current || weight > current.weight) {
      terms.set(key, {
        label: options.display || cleaned,
        category,
        level,
        aliases: options.aliases || [],
        source: options.source || "job",
        frequency,
        weight,
      });
    }
  };

  skillBank.forEach((skill) => {
    if (termAppears(normalizedJob, skill.term, skill.aliases)) {
      addTerm(skill.term, {
        category: skill.category,
        aliases: skill.aliases,
        display: skill.term,
        source: "skill bank",
      });
    }
  });

  extractRequirementChunks(job).forEach((chunk) => addTerm(chunk, { source: "requirement line" }));
  extractNgrams(job).forEach((term) => addTerm(term.label, { source: "job frequency", level: term.level }));

  extractRoleSignals(role || "").forEach((term) => {
    addTerm(term, { category: "Role match", level: "required", source: "target role" });
  });

  return Array.from(terms.values())
    .map((term) => ({ ...term, weight: Number(term.weight.toFixed(2)) }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 54);
}

function extractRequirementChunks(job) {
  const lines = job
    .split(/\n|(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const important = lines.filter((line) =>
    /(require|responsib|qualification|skill|experience|proficient|knowledge|familiar|must|preferred|bonus|plus|you will|you have|looking for|partner with|lead|own|manage)/i.test(line)
  );

  const chunks = [];

  important.forEach((line) => {
    const trimmed = line
      .replace(/^[-*\u2022]\s*/, "")
      .replace(/^(requirements?|responsibilities|qualifications?|preferred|skills?)\s*[:\-]\s*/i, "")
      .replace(/\([^)]*\)/g, " ");

    trimmed
      .split(/,|;|\/|\s+\|\s+|\s+and\s+|\s+or\s+/i)
      .map(cleanTerm)
      .filter((piece) => piece.length >= 3 && piece.length <= 54)
      .forEach((piece) => chunks.push(piece));
  });

  return unique(chunks).slice(0, 40);
}

function extractNgrams(job) {
  const tokens = tokenize(job).filter((token) => !stopWords.has(token) && token.length > 2);
  const counts = new Map();

  for (let size = 2; size <= 3; size += 1) {
    for (let index = 0; index <= tokens.length - size; index += 1) {
      const gram = tokens.slice(index, index + size);
      if (!gram.some((token) => token.length > 4 || /^[a-z]+\d+$/.test(token))) continue;

      const phrase = gram.join(" ");
      if (!isUsefulTerm(phrase)) continue;
      counts.set(phrase, (counts.get(phrase) || 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([label, count]) => ({ label, count, level: count >= 3 ? "core" : "preferred" }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 18);
}

function extractRoleSignals(role) {
  return role
    .split(/\s+/)
    .map(cleanTerm)
    .filter((term) => term.length > 3 && !stopWords.has(term.toLowerCase()));
}

function assessTerm(term, resume, job) {
  const occurrences = countTerm(resume, term.label, term.aliases);
  const jobOccurrences = Math.max(1, countTerm(job, term.label, term.aliases));
  const status = occurrences === 0 ? "missing" : occurrences < Math.min(2, jobOccurrences) && term.level === "required" ? "weak" : "covered";

  return {
    ...term,
    occurrences,
    jobOccurrences,
    status,
  };
}

function scoreWeightedCoverage(terms) {
  const total = terms.reduce((sum, term) => sum + term.weight, 0) || 1;
  const earned = terms.reduce((sum, term) => {
    if (term.status === "covered") return sum + term.weight;
    if (term.status === "weak") return sum + term.weight * 0.45;
    return sum;
  }, 0);

  return clampScore(Math.round((earned / total) * 100));
}

function scoreCriticalCoverage(terms) {
  const critical = terms.filter((term) => term.level === "required" || term.weight >= 1.55);
  const pool = critical.length ? critical : terms.slice(0, 12);
  const total = pool.reduce((sum, term) => sum + term.weight, 0) || 1;
  const earned = pool.reduce((sum, term) => {
    if (term.status === "covered") return sum + term.weight;
    if (term.status === "weak") return sum + term.weight * 0.35;
    return sum;
  }, 0);

  return clampScore(Math.round((earned / total) * 100));
}

function scoreResumeStructure(resume, file) {
  const words = wordCount(resume);
  const sections = sectionPatterns.map((section) => ({ ...section, found: section.pattern.test(resume) }));
  const hasEmail = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(resume);
  const hasPhone = /(\+?\d[\d\s().-]{7,}\d)/.test(resume);
  const hasExperience = sections.find((section) => section.key === "experience")?.found;
  const hasSkills = sections.find((section) => section.key === "skills")?.found;
  const hasEducation = sections.find((section) => section.key === "education")?.found;
  const hasDates = /\b(20\d{2}|19\d{2})\b/.test(resume);
  const tableSignals = (resume.match(/\t|\|/g) || []).length;
  const hasReadableText = words >= 160;
  const likelyTooLong = words > 1300;
  const likelyTooShort = words < 280;
  const fileType = file?.extension || "pasted text";

  const checks = [
    makeCheck({
      title: "Readable resume text",
      detail: hasReadableText
        ? "The scanner can read enough text to evaluate the resume."
        : "The resume text is very short. Scanned PDFs and image resumes often fail ATS parsing.",
      status: hasReadableText ? "pass" : "fail",
      points: hasReadableText ? 18 : 0,
      max: 18,
    }),
    makeCheck({
      title: "Contact signals",
      detail: hasEmail && hasPhone ? "Email and phone are visible." : "Add both an email and phone number near the top.",
      status: hasEmail && hasPhone ? "pass" : hasEmail || hasPhone ? "warn" : "fail",
      points: hasEmail && hasPhone ? 12 : hasEmail || hasPhone ? 7 : 0,
      max: 12,
    }),
    makeCheck({
      title: "Standard ATS sections",
      detail: `${sections.filter((section) => section.found).map((section) => section.label).join(", ") || "No standard headings detected"}.`,
      status: hasExperience && hasSkills && hasEducation ? "pass" : hasExperience && (hasSkills || hasEducation) ? "warn" : "fail",
      points: hasExperience && hasSkills && hasEducation ? 24 : hasExperience && (hasSkills || hasEducation) ? 15 : 5,
      max: 24,
    }),
    makeCheck({
      title: "Timeline clarity",
      detail: hasDates ? "Dates are visible, which helps ATS and recruiters understand chronology." : "Add years for each role or education item.",
      status: hasDates ? "pass" : "warn",
      points: hasDates ? 10 : 4,
      max: 10,
    }),
    makeCheck({
      title: "Layout risk",
      detail:
        tableSignals < 14
          ? "Low table or column signal in the extracted text."
          : "Many tabs or pipe characters were found. Tables and columns can parse poorly.",
      status: tableSignals < 14 ? "pass" : "warn",
      points: tableSignals < 14 ? 12 : 5,
      max: 12,
    }),
    makeCheck({
      title: "Resume length",
      detail: likelyTooLong
        ? "The resume looks long. Keep the most relevant experience tight."
        : likelyTooShort
          ? "The resume may be too thin for this scan. Add proof, tools, and outcomes."
          : "Length is in a reasonable range for ATS screening.",
      status: likelyTooLong || likelyTooShort ? "warn" : "pass",
      points: likelyTooLong || likelyTooShort ? 6 : 12,
      max: 12,
    }),
    makeCheck({
      title: "File format",
      detail:
        fileType === "docx"
          ? "DOCX is usually the safest ATS format."
          : fileType === "pdf"
            ? "PDF can work if text is selectable, but some ATS parse DOCX more reliably."
            : "Pasted text is excellent for analysis. Submit DOCX or selectable PDF when applying.",
      status: fileType === "pdf" ? "warn" : "pass",
      points: fileType === "pdf" ? 8 : 12,
      max: 12,
    }),
  ];

  return {
    score: scoreChecks(checks),
    checks,
    sections,
  };
}

function scoreEvidence(resume) {
  const lines = resume.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const bulletLines = lines.filter((line) => /^[-*\u2022]/.test(line) || actionVerbs.some((verb) => startsWithWord(line, verb)));
  const metricLines = bulletLines.filter((line) => /(\d+%?|\$|revenue|cost|users|customers|hours|days|weeks|million|k\b|m\b)/i.test(line));
  const actionLines = bulletLines.filter((line) => actionVerbs.some((verb) => startsWithWord(line.replace(/^[-*\u2022]\s*/, ""), verb)));
  const outcomeLines = bulletLines.filter((line) => /(increased|reduced|improved|saved|grew|launched|delivered|accelerated|retention|revenue|conversion|churn|cost|quality)/i.test(line));

  const bulletBase = Math.min(100, Math.round((bulletLines.length / 8) * 100));
  const metricScore = bulletLines.length ? Math.round((metricLines.length / bulletLines.length) * 100) : 0;
  const actionScore = bulletLines.length ? Math.round((actionLines.length / bulletLines.length) * 100) : 0;
  const outcomeScore = bulletLines.length ? Math.round((outcomeLines.length / bulletLines.length) * 100) : 0;

  const score = clampScore(Math.round(bulletBase * 0.2 + metricScore * 0.38 + actionScore * 0.24 + outcomeScore * 0.18));
  const checks = [
    makeCheck({
      title: "Impact metrics",
      detail: `${metricLines.length} of ${Math.max(bulletLines.length, 1)} evidence lines include numbers, scale, or measurable outcomes.`,
      status: metricScore >= 45 ? "pass" : metricScore >= 20 ? "warn" : "fail",
      points: Math.round(metricScore * 0.4),
      max: 40,
    }),
    makeCheck({
      title: "Action-led bullets",
      detail: `${actionLines.length} lines start with strong action verbs.`,
      status: actionScore >= 65 ? "pass" : actionScore >= 35 ? "warn" : "fail",
      points: Math.round(actionScore * 0.35),
      max: 35,
    }),
    makeCheck({
      title: "Outcome language",
      detail: `${outcomeLines.length} lines connect work to business, customer, or operational outcomes.`,
      status: outcomeScore >= 45 ? "pass" : outcomeScore >= 20 ? "warn" : "fail",
      points: Math.round(outcomeScore * 0.25),
      max: 25,
    }),
  ];

  return { score, checks, bulletLines, metricLines, actionLines };
}

function scoreRoleAlignment(resume, job, role, jobBrief, terms) {
  const roleTerms = extractRoleSignals(role || jobBrief.title || "").filter((term) => term.length > 3);
  const roleMatches = roleTerms.filter((term) => countTerm(resume, term) > 0);
  const requiredYears = extractYears(job);
  const resumeYears = extractYears(resume);
  const topRequired = terms.filter((term) => term.level === "required").slice(0, 10);
  const coveredRequired = topRequired.filter((term) => term.status === "covered").length;
  const titleScore = roleTerms.length ? Math.round((roleMatches.length / roleTerms.length) * 100) : 70;
  const yearsScore = requiredYears ? (resumeYears >= requiredYears ? 100 : resumeYears ? 60 : 25) : 75;
  const requirementScore = topRequired.length ? Math.round((coveredRequired / topRequired.length) * 100) : 70;
  const score = clampScore(Math.round(titleScore * 0.28 + yearsScore * 0.22 + requirementScore * 0.5));

  const checks = [
    makeCheck({
      title: "Role-title alignment",
      detail: roleTerms.length
        ? `${roleMatches.length} of ${roleTerms.length} target-title signals appear in the resume.`
        : "Add a target role to sharpen title alignment.",
      status: titleScore >= 70 ? "pass" : titleScore >= 35 ? "warn" : "fail",
      points: Math.round(titleScore * 0.3),
      max: 30,
    }),
    makeCheck({
      title: "Experience threshold",
      detail: requiredYears
        ? `Job asks for about ${requiredYears}+ years; resume mentions ${resumeYears || "no explicit"} years.`
        : "No clear years threshold was detected in the job post.",
      status: yearsScore >= 90 ? "pass" : yearsScore >= 55 ? "warn" : "fail",
      points: Math.round(yearsScore * 0.25),
      max: 25,
    }),
    makeCheck({
      title: "Required-skill alignment",
      detail: `${coveredRequired} of ${Math.max(topRequired.length, 1)} top required signals are covered.`,
      status: requirementScore >= 75 ? "pass" : requirementScore >= 45 ? "warn" : "fail",
      points: Math.round(requirementScore * 0.45),
      max: 45,
    }),
  ];

  return { score, checks, roleTerms, roleMatches, requiredYears, resumeYears };
}

function scoreProfileCompleteness(resume) {
  const links = {
    linkedin: /linkedin\.com\/in\//i.test(resume),
    github: /github\.com\//i.test(resume),
    portfolio: /(portfolio|website|https?:\/\/(?!.*linkedin).*\.|\.dev|\.io)/i.test(resume),
    location: /(remote|hybrid|onsite|cape town|johannesburg|durban|pretoria|south africa|united states|uk|london|new york)/i.test(resume),
  };

  const points = [
    links.linkedin ? 35 : 0,
    links.github || links.portfolio ? 30 : 0,
    links.location ? 15 : 0,
    /certification|certified|license|pmp|cpa|mba|degree/i.test(resume) ? 20 : 0,
  ];

  const score = clampScore(points.reduce((sum, point) => sum + point, 0));
  const checks = [
    makeCheck({
      title: "Public profile enrichment",
      detail: links.linkedin
        ? "LinkedIn is visible. Add a portfolio or GitHub if it strengthens this role."
        : "Add a LinkedIn URL so recruiters can verify and enrich your profile.",
      status: links.linkedin ? "pass" : "warn",
      points: links.linkedin ? 35 : 12,
      max: 35,
    }),
    makeCheck({
      title: "Proof links",
      detail:
        links.github || links.portfolio
          ? "A portfolio, GitHub, or website signal is visible."
          : "Add a portfolio, GitHub, case study, or work sample link when relevant.",
      status: links.github || links.portfolio ? "pass" : "warn",
      points: links.github || links.portfolio ? 30 : 10,
      max: 30,
    }),
  ];

  return { score, checks, links };
}

function parseJobBrief(job, role, company) {
  const lines = job.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const firstTitleLine = lines.find((line) => line.length <= 80 && !/responsibilities|requirements|about us|who we are/i.test(line));
  const years = extractYears(job);
  const seniority = matchFirst(job, /\b(intern|junior|associate|mid-level|mid level|senior|lead|principal|manager|director|head of|vp)\b/i);
  const workMode = matchFirst(job, /\b(remote|hybrid|onsite|on-site)\b/i);
  const employmentType = matchFirst(job, /\b(full[-\s]?time|part[-\s]?time|contract|freelance|temporary|permanent)\b/i);
  const salary = matchFirst(job, /(\$|R|EUR|GBP|USD)\s?\d[\d,.\skmK-]+/i);

  return {
    title: role || firstTitleLine || "",
    company: company || "",
    years,
    seniority: seniority ? titleCase(seniority) : "",
    workMode: workMode ? titleCase(workMode.replace("-", " ")) : "",
    employmentType: employmentType ? titleCase(employmentType.replace("-", " ")) : "",
    salary: salary || "",
  };
}

function buildRecruiterLens(overall, terms, structure, evidence, alignment, profile, jobBrief) {
  const missingCritical = terms.filter((term) => term.level === "required" && term.status === "missing").slice(0, 5);
  const coveredHigh = terms.filter((term) => term.status === "covered").slice(0, 5);
  const riskFlags = [
    ...structure.checks.filter((check) => check.status !== "pass").slice(0, 2),
    ...alignment.checks.filter((check) => check.status !== "pass").slice(0, 2),
    ...profile.checks.filter((check) => check.status !== "pass").slice(0, 1),
  ];

  const tags = [
    jobBrief.seniority,
    jobBrief.workMode,
    jobBrief.employmentType,
    ...coveredHigh.slice(0, 4).map((term) => term.label),
  ].filter(Boolean);

  return {
    verdict:
      overall >= 82
        ? "Honestly, this looks shortlist-friendly"
        : overall >= 68
          ? "Close. A few smart edits could help"
          : overall >= 50
            ? "There is a fit here, but it needs a glow-up"
            : "This version may get filtered too early",
    tags,
    missingCritical,
    riskFlags,
    screeningQuestions: buildScreeningQuestions(missingCritical, terms, evidence),
  };
}

function buildActionPlan({ missingTerms, structure, evidence, alignment, profile }) {
  const actions = [];
  const requiredGaps = missingTerms.filter((term) => term.level === "required").slice(0, 5);

  if (requiredGaps.length) {
    actions.push(
      `Add truthful proof for ${requiredGaps.map((term) => term.label).join(", ")} in your Skills or Experience section.`
    );
  }

  const weakTerms = missingTerms.filter((term) => term.status === "weak").slice(0, 4);
  if (weakTerms.length) {
    actions.push(`Strengthen weak signals by repeating ${weakTerms.map((term) => term.label).join(", ")} in recent bullets with outcomes.`);
  }

  const failedStructure = structure.checks.find((check) => check.status === "fail" || check.status === "warn");
  if (failedStructure) actions.push(failedStructure.detail);

  if (evidence.score < 70) {
    actions.push("Rewrite at least three bullets to include a metric, business outcome, or scale marker.");
  }

  if (alignment.score < 70) {
    actions.push("Mirror the target title and strongest role language in the headline or summary if it is accurate.");
  }

  if (profile.score < 70) {
    actions.push("Add recruiter-verifiable profile links such as LinkedIn, portfolio, GitHub, or case studies.");
  }

  if (!actions.length) {
    actions.push("You are close. Tighten the top three covered keywords into recent, metric-backed bullets before applying.");
  }

  actions.push("Save this job to the pipeline, set the next stage, and rerun the scan after edits to track improvement.");

  return actions.slice(0, 7);
}

function buildPassableCv({ resume, missingTerms, coveredTerms, structure, evidence, alignment, profile, jobBrief, role, company }) {
  const contactBlock = extractContactBlock(resume);
  const body = cleanResumeBody(resume, contactBlock);
  const coveredSkills = coveredTerms.filter(isCvSkill).slice(0, 18).map((term) => formatCvSkill(term.label));
  const weakSkills = missingTerms.filter((term) => term.status === "weak").filter(isCvSkill).slice(0, 4).map((term) => formatCvSkill(term.label));
  const safeSkills = unique([...coveredSkills, ...weakSkills]).slice(0, 18);
  const missingRequired = missingTerms.filter((term) => term.level === "required").slice(0, 6);
  const roleName = role || jobBrief.title || "Target role";
  const highlightedLines = [];
  const changeSummary = [];
  const lines = [];

  if (contactBlock) {
    lines.push(contactBlock);
  }

  const summary = buildTargetedSummary(roleName, company, safeSkills, evidence, alignment);
  lines.push("TARGET SUMMARY");
  lines.push(summary);
  highlightedLines.push("TARGET SUMMARY", summary);
  changeSummary.push({
    change: "Added a targeted summary at the top.",
    reason:
      "ATS tools and recruiters both look for quick role alignment. This summary mirrors the target role and uses skills already found in the uploaded CV.",
  });

  if (safeSkills.length) {
    const skillsLine = safeSkills.join(", ");
    lines.push("");
    lines.push("CORE SKILLS");
    lines.push(skillsLine);
    highlightedLines.push("CORE SKILLS", skillsLine);
    changeSummary.push({
      change: "Created a clean Core Skills section.",
      reason:
        "A simple text-based skills section is easier for ATS parsing than graphics, tables, or skills hidden inside long paragraphs.",
    });
  }

  if (body) {
    lines.push("");
    lines.push("EXPERIENCE, EDUCATION, AND PROJECTS");
    lines.push(body);
    highlightedLines.push("EXPERIENCE, EDUCATION, AND PROJECTS");
    changeSummary.push({
      change: "Standardized the main body under ATS-friendly headings.",
      reason:
        "Standard headings help resume parsers identify experience, education, projects, dates, and role history with less confusion.",
    });
  }

  if (evidence.score < 72) {
    const proofLine = "Suggested proof edit: add 2-3 bullets with a metric, scale marker, or outcome where you can prove the result.";
    lines.push("");
    lines.push("FINAL PROOF CHECK");
    lines.push(proofLine);
    highlightedLines.push("FINAL PROOF CHECK", proofLine);
    changeSummary.push({
      change: "Flagged the need for stronger quantified proof.",
      reason:
        "Resume checkers commonly reward measurable accomplishments. Numbers help a recruiter understand scope and impact quickly.",
    });
  }

  if (missingRequired.length) {
    changeSummary.push({
      change: `Did not automatically insert missing required terms: ${missingRequired.map((term) => term.label).join(", ")}.`,
      reason:
        "Those terms were not clearly evidenced in the uploaded CV. Add them only if they are true, then connect each one to a real project, tool, credential, or result.",
    });
  }

  if (profile.score < 70) {
    changeSummary.push({
      change: "Recommended stronger profile links.",
      reason:
        "Applicant tracking systems store profile data, and recruiters often verify fit through LinkedIn, portfolios, GitHub, or work samples.",
    });
  }

  return {
    text: lines.join("\n"),
    highlightedLines,
    changeSummary,
  };
}

function buildTargetedSummary(role, company, skills, evidence, alignment) {
  const skillText = skills.slice(0, 6).join(", ") || "relevant experience";
  const companyText = company && company !== "Target company" ? ` for ${company}` : "";
  const proofText =
    evidence.score >= 70
      ? "with measurable outcomes and clear delivery evidence"
      : "with room to add stronger metrics and outcome proof";
  const alignmentText =
    alignment.score >= 70
      ? "aligned to the core requirements in the job post"
      : "targeted toward the role's core requirements";

  return `${role} candidate${companyText} with experience across ${skillText}, ${proofText}. Resume is ${alignmentText} and formatted for readable ATS parsing.`;
}

function isCvSkill(term) {
  const label = cleanTerm(term.label || "");
  const tooGeneric = new Set(["senior", "junior", "lead", "manager", "product", "data", "design", "team", "role"]);
  const lower = label.toLowerCase();
  const roleTitleFragment =
    /^(senior|junior|lead|principal|associate)\b/.test(lower) ||
    (/\b(manager|director|specialist|analyst|engineer|developer|designer)\b/.test(lower) && !/\bmanagement\b/.test(lower));

  return term.category !== "Role match" && label.length > 2 && !tooGeneric.has(lower) && !roleTitleFragment;
}

function formatCvSkill(label) {
  const cleaned = cleanTerm(label);
  const known = skillBank.find((skill) => normalizeKey(skill.term) === normalizeKey(cleaned));
  if (known) return known.term;
  if (cleaned === cleaned.toUpperCase()) return cleaned;
  return titleCase(cleaned);
}

function extractContactBlock(resume) {
  const lines = resume.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const contactLines = [];

  for (const line of lines.slice(0, 8)) {
    if (sectionPatterns.some((section) => section.pattern.test(`\n${line}\n`))) break;
    contactLines.push(line);
    if (contactLines.length >= 4) break;
  }

  return contactLines.join("\n");
}

function cleanResumeBody(resume, contactBlock) {
  let body = resume.trim();
  if (contactBlock) body = body.replace(contactBlock, "").trim();

  return body
    .replace(/\t/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();
}

function buildBulletStarters(missingTerms, coveredTerms, jobBrief) {
  const roleLabel = (jobBrief.title || "target role").replace(/[,|].*$/, "").trim();
  const priority = missingTerms.length ? missingTerms : coveredTerms.slice(0, 6);
  const fallbackTerm = coveredTerms[0]?.label || "the target skill";

  const starters = priority.slice(0, 6).map((term, index) => {
    const termLabel = term.label || fallbackTerm;
    const templates = [
      `Led a ${termLabel} initiative for [team/customer segment], improving [metric] by [result].`,
      `Used ${termLabel} to identify [insight/problem] and deliver [business outcome] across [scope].`,
      `Partnered with [function] to apply ${termLabel}, reducing [cost/risk/time] by [result].`,
      `Built a repeatable ${termLabel} process that helped [audience] achieve [measurable outcome].`,
      `Translated ${termLabel} requirements into [deliverable], enabling [team] to [result].`,
      `Owned ${termLabel} execution for ${roleLabel}, moving [metric] from [before] to [after].`,
    ];

    return {
      text: templates[index % templates.length],
      note: term.status === "missing" ? "Use only if you have real experience with this term." : "Good candidate for a stronger evidence bullet.",
    };
  });

  return starters.length
    ? starters
    : [
        {
          text: "Led [project] for [audience], improving [metric] by [result] through [skill/tool].",
          note: "Replace every bracket with true details from your work.",
        },
      ];
}

function buildScreeningQuestions(missingCritical, terms, evidence) {
  const questions = [];

  missingCritical.slice(0, 3).forEach((term) => {
    questions.push(`If asked about ${term.label}, what true example proves your depth or explains the gap?`);
  });

  const strongest = terms.find((term) => term.status === "covered");
  if (strongest) questions.push(`What is your strongest story showing ${strongest.label} in action?`);

  if (evidence.score < 70) {
    questions.push("Which achievement can you quantify most clearly in the first recruiter screen?");
  }

  return questions.slice(0, 5);
}

function renderReport(report) {
  renderScore(report);
  renderMetrics(report);
  renderKeywords(report);
  renderChecks(report);
  renderTailoring(report);
  refreshIcons();
}

function renderScore(report) {
  nodes.scoreOrbit.style.setProperty("--score", report.overall);
  nodes.scoreValue.textContent = String(report.overall);
  nodes.scoreTitle.textContent = report.recruiterLens.verdict;
  nodes.scoreSummary.textContent = `For ${report.role} at ${report.company}, I found ${report.coveredTerms.length} helpful signals and ${report.missingTerms.length} priority gaps. ${scoreAdvice(report.overall)}`;
}

function renderMetrics(report) {
  const metrics = [
    ["Keywords", report.keywordScore, "Weighted coverage"],
    ["Critical", report.criticalScore, "Must-haves"],
    ["Parse vibe", report.structure.score, "Format + sections"],
    ["Proof", report.evidence.score, "Metrics + verbs"],
  ];

  nodes.metricGrid.innerHTML = metrics
    .map(
      ([label, value, caption]) => `
        <article class="metric-card">
          <span>${escapeHtml(label)}</span>
          <strong>${value}%</strong>
          <small>${escapeHtml(caption)}</small>
        </article>
      `
    )
    .join("");
}

function renderKeywords(report) {
  nodes.keywordEmpty.hidden = true;
  nodes.keywordReport.hidden = false;
  nodes.gapCount.textContent = `${report.missingTerms.length} gaps`;
  nodes.coveredCount.textContent = `${report.coveredTerms.length} covered`;

  const required = report.terms.filter((term) => term.level === "required").length;
  const preferred = report.terms.filter((term) => term.level === "preferred").length;
  nodes.requirementMix.textContent = `${required} required, ${preferred} preferred`;

  nodes.priorityTerms.innerHTML = report.missingTerms.length
    ? report.missingTerms.map(renderTerm).join("")
    : `<p class="empty-line">No big gaps found. That is a nice little confidence boost. Tighten proof and wording before applying.</p>`;

  nodes.coveredTerms.innerHTML = report.coveredTerms.length
    ? report.coveredTerms.map(renderTerm).join("")
    : `<p class="empty-line">I am not seeing overlaps yet. Add more resume detail or paste a fuller job post.</p>`;

  nodes.categoryBars.innerHTML = renderCategoryBars(report.terms);
}

function renderTerm(term) {
  const badge = term.status === "covered" ? "got it" : term.status === "weak" ? "thin" : "gap";
  const badgeClass = term.status === "covered" ? "covered" : term.status === "weak" ? "weak" : "missing";
  const level = term.level === "required" ? "Required" : term.level === "preferred" ? "Preferred" : "Core";

  return `
    <div class="term-item">
      <div>
        <strong>${escapeHtml(term.label)}</strong>
        <small>${escapeHtml(term.category)} | ${level} | job mentions: ${term.jobOccurrences}</small>
      </div>
      <span class="term-badge ${badgeClass}">${badge}</span>
    </div>
  `;
}

function renderCategoryBars(terms) {
  const groups = groupBy(terms, (term) => term.category);

  return Object.entries(groups)
    .sort(([, a], [, b]) => b.length - a.length)
    .map(([category, categoryTerms]) => {
      const covered = categoryTerms.filter((term) => term.status === "covered").length;
      const weak = categoryTerms.filter((term) => term.status === "weak").length;
      const value = Math.round(((covered + weak * 0.45) / categoryTerms.length) * 100);

      return `
        <div class="category-row">
          <strong>${escapeHtml(category)}</strong>
          <div class="bar-track" aria-hidden="true">
            <div class="bar-fill" style="--bar: ${value}%"></div>
          </div>
          <span>${value}%</span>
        </div>
      `;
    })
    .join("");
}

function renderChecks(report) {
  const allChecks = [
    ...report.structure.checks,
    ...report.alignment.checks,
    ...report.evidence.checks,
    ...report.profile.checks,
  ];

  const lens = report.recruiterLens;
  const chips = lens.tags.length ? lens.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("") : "<span>No tags yet</span>";
  const risks = lens.riskFlags.length
    ? lens.riskFlags.map((risk) => `<li>${escapeHtml(risk.title)}: ${escapeHtml(risk.detail)}</li>`).join("")
    : "<li>No major first-screen risks detected. We love a calm moment.</li>";
  const questions = lens.screeningQuestions.length
    ? lens.screeningQuestions.map((question) => `<li>${escapeHtml(question)}</li>`).join("")
    : "<li>Prepare one concise story for your strongest achievement.</li>";

  nodes.atsChecks.innerHTML = `
    <div class="screening-brief">
      <div>
        <p class="eyebrow">First-screen lens</p>
        <h3>${escapeHtml(lens.verdict)}</h3>
        <div class="profile-tags">${chips}</div>
      </div>
      <div>
        <p class="eyebrow">Tiny alarms</p>
        <ul>${risks}</ul>
      </div>
      <div>
        <p class="eyebrow">What I would prep</p>
        <ul>${questions}</ul>
      </div>
    </div>
    ${allChecks.map(renderCheck).join("")}
  `;
}

function renderCheck(check) {
  const icon = check.status === "pass" ? "check" : check.status === "warn" ? "triangle-alert" : "x";

  return `
    <div class="check-item">
      <span class="check-status ${check.status}">
        <i data-lucide="${icon}"></i>
      </span>
      <div class="check-copy">
        <strong>${escapeHtml(check.title)}</strong>
        <small>${escapeHtml(check.detail)}</small>
      </div>
      <span class="check-points">${check.points}/${check.max}</span>
    </div>
  `;
}

function renderTailoring(report) {
  nodes.actionList.innerHTML = report.actionPlan.map((action) => `<li>${escapeHtml(action)}</li>`).join("");

  const recruiterMessage = buildRecruiterMessage(report);
  const interviewProof = report.recruiterLens.screeningQuestions
    .map((question) => `<p>${escapeHtml(question)}</p>`)
    .join("");

  nodes.bulletList.innerHTML = `
    ${report.bullets
      .map(
        (bullet) => `
          <div class="bullet-card">
            <p>${escapeHtml(bullet.text)}</p>
            <small>${escapeHtml(bullet.note)}</small>
          </div>
        `
      )
      .join("")}
    <div class="bullet-card accent-card">
      <small>Recruiter message starter</small>
      <p>${escapeHtml(recruiterMessage)}</p>
    </div>
    <div class="bullet-card">
      <small>Interview proof prompts</small>
      ${interviewProof || "<p>Prepare a concise example for your strongest measurable achievement.</p>"}
    </div>
  `;
}

function buildRecruiterMessage(report) {
  const covered = report.coveredTerms.slice(0, 3).map((term) => term.label).join(", ");
  const role = report.role || "the role";
  const company = report.company || "your team";

  return `Hi [Name], I am applying for ${role} at ${company}. My strongest fit is ${covered || "relevant experience"}, and I recently delivered [specific outcome]. I would love to compare notes on how that maps to the role.`;
}

function activateTab(tabName) {
  $$(".tab").forEach((button) => button.classList.toggle("active", button.dataset.tab === tabName));
  $$(".tab-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `${tabName}Panel`);
  });
}

async function saveCurrentJob() {
  if (!lastReport) return;

  const job = {
    id: lastReport.id,
    userId: ACTIVE_USER_ID,
    applicantName: currentUser.name,
    applicantEmail: currentUser.email,
    title: lastReport.role,
    company: lastReport.company,
    score: lastReport.overall,
    keywordScore: lastReport.keywordScore,
    missing: lastReport.missingTerms.length,
    stage: lastReport.overall >= 80 ? "Ready" : "Tailoring",
    nextAction: lastReport.actionPlan[0],
    savedAt: new Date().toISOString(),
  };

  await putVaultRecord("jobs", job);
  savedJobsCache = [job, ...savedJobsCache.filter((saved) => saved.id !== job.id)].slice(0, 40);
  await updateVaultStatus();
  await renderTracker();
  activateTab("tracker");
  showToast("Pinned to your application trail.");
}

async function renderTracker() {
  if (db) {
    savedJobsCache = await getAllVaultRecords("jobs");
  }

  const jobs = [...savedJobsCache].sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));

  if (!jobs.length) {
    nodes.trackerTable.innerHTML = `<p class="empty-line">No saved jobs yet. Run a scan, then pin it here so your future self knows what to fix next.</p>`;
    return;
  }

  nodes.trackerTable.innerHTML = jobs
    .map(
      (job) => `
        <div class="tracker-row" data-id="${escapeHtml(job.id)}">
          <div class="tracker-job">
            <strong>${escapeHtml(job.title)}</strong>
            <small>${escapeHtml(job.company)} | ${formatDate(job.savedAt)}</small>
          </div>
          <span class="score-chip">${job.score}%</span>
          <select aria-label="Pipeline stage">
            ${["Wishlist", "Tailoring", "Ready", "Applied", "Interview", "Offer"].map(
              (stage) => `<option value="${stage}" ${stage === job.stage ? "selected" : ""}>${stage}</option>`
            ).join("")}
          </select>
          <span class="check-points">${job.missing} gaps</span>
          <button class="delete-job" type="button" title="Delete saved job">
            <i data-lucide="trash-2"></i>
          </button>
          <div class="tracker-next">${escapeHtml(job.nextAction || "Add a next action.")}</div>
        </div>
      `
    )
    .join("");

  $$(".tracker-row").forEach((row) => {
    const id = row.dataset.id;

    row.querySelector("select").addEventListener("change", async (event) => {
      const job = savedJobsCache.find((saved) => saved.id === id);
      if (!job) return;

      const updatedJob = { ...job, stage: event.target.value, updatedAt: new Date().toISOString() };
      savedJobsCache = savedJobsCache.map((saved) => (saved.id === id ? updatedJob : saved));
      await putVaultRecord("jobs", updatedJob);
      await updateVaultStatus();
      showToast("Pipeline stage updated.");
    });

    row.querySelector(".delete-job").addEventListener("click", async () => {
      savedJobsCache = savedJobsCache.filter((job) => job.id !== id);
      await deleteVaultRecord("jobs", id);
      await updateVaultStatus();
      await renderTracker();
      refreshIcons();
    });
  });

  refreshIcons();
}

async function clearTracker() {
  savedJobsCache = [];
  await clearVaultStore("jobs");
  await updateVaultStatus();
  await renderTracker();
  showToast("Application trail cleared.");
}

function loadSample() {
  nodes.roleInput.value = "Senior Product Manager, Growth";
  nodes.companyInput.value = "Northstar SaaS";
  nodes.resumeText.value = sampleResume;
  nodes.jobText.value = sampleJob;
  lastFile = { name: "sample-resume.txt", extension: "txt", type: "text/plain" };
  nodes.fileLabel.textContent = "Sample resume loaded";
  runScan();
}

function clearInputs() {
  nodes.roleInput.value = "";
  nodes.companyInput.value = "";
  nodes.resumeText.value = "";
  nodes.jobText.value = "";
  nodes.resumeFile.value = "";
  nodes.fileLabel.textContent = "Drop in PDF of any size, DOCX, TXT, or paste below";
  nodes.inputHelp.textContent =
    "The score updates as you edit. Think of it as a calm pre-flight check, not a judgment from the hiring heavens.";
  lastReport = null;
  lastFile = null;
  resetResults();
  showToast("Inputs cleared.");
}

function resetResults() {
  nodes.scoreOrbit.style.setProperty("--score", 0);
  nodes.scoreValue.textContent = "--";
  nodes.scoreTitle.textContent = "Ready when you are";
  nodes.scoreSummary.textContent =
    "Add a resume and a job description. I will point out the gaps, the bright spots, and the edits most worth your time.";
  nodes.metricGrid.innerHTML = ["Keywords", "Critical", "Parse vibe", "Proof"]
    .map(
      (label) => `
        <article class="metric-card">
          <span>${label}</span>
          <strong>--</strong>
          <small>${label === "Keywords" ? "Coverage" : label === "Critical" ? "Must-haves" : label === "Parse vibe" ? "Structure" : "Impact proof"}</small>
        </article>
      `
    )
    .join("");
  nodes.keywordEmpty.hidden = false;
  nodes.keywordReport.hidden = true;
  nodes.atsChecks.innerHTML = `<div class="empty-line">Run a scan and I will show the first-screen checks: parsing, sections, contact info, format, impact, and recruiter-style risks.</div>`;
  nodes.actionList.innerHTML = "<li>Run a scan to generate a ranked tailoring plan.</li>";
  nodes.bulletList.innerHTML = `<p class="empty-line">After a scan, I will turn the gaps into honest bullet starters, recruiter messages, and prep prompts.</p>`;
  nodes.saveJobBtn.disabled = true;
  nodes.exportBtn.disabled = true;
  nodes.downloadCvBtn.disabled = true;
  nodes.downloadPdfBtn.disabled = true;
  nodes.copyPlanBtn.disabled = true;
}

function copyTailoringPlan() {
  if (!lastReport) return;

  const plan = lastReport.actionPlan.map((action, index) => `${index + 1}. ${action}`).join("\n");
  navigator.clipboard.writeText(plan);
  showToast("Tailoring plan copied.");
}

function downloadReport() {
  if (!lastReport) return;

  const report = [
    `Resume Radar ATS Scan`,
    `Role: ${lastReport.role}`,
    `Company: ${lastReport.company}`,
    `Overall match: ${lastReport.overall}%`,
    `Keyword coverage: ${lastReport.keywordScore}%`,
    `Critical coverage: ${lastReport.criticalScore}%`,
    `Parse vibe: ${lastReport.structure.score}%`,
    `Evidence: ${lastReport.evidence.score}%`,
    "",
    "Priority gaps:",
    ...lastReport.missingTerms.map((term) => `- ${term.label} (${term.level}, ${term.category})`),
    "",
    "Covered signals:",
    ...lastReport.coveredTerms.slice(0, 18).map((term) => `- ${term.label}`),
    "",
    "Tailoring plan:",
    ...lastReport.actionPlan.map((action, index) => `${index + 1}. ${action}`),
    "",
    "Note: This is a transparent ATS-style estimate, not a guarantee of employer ranking.",
  ].join("\n");

  const blob = new Blob([report], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `resume-radar-${slugify(lastReport.role)}-report.txt`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function downloadPassableCv() {
  if (!lastReport) return;

  const note = [
    "Resume Radar passable CV draft",
    "Review before sending. The draft improves ATS readability but does not verify truth for you.",
    "",
  ].join("\n");
  const blob = new Blob([note + lastReport.optimizedCv], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `passable-cv-${slugify(lastReport.role)}.txt`;
  anchor.click();
  URL.revokeObjectURL(url);
  showToast("Passable CV draft downloaded.");
}

function downloadHighlightedPdf() {
  if (!lastReport) return;

  const jsPDF = window.jspdf?.jsPDF;
  if (!jsPDF) {
    showToast("PDF maker is still loading. Try again in a moment.");
    return;
  }

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const page = {
    width: doc.internal.pageSize.getWidth(),
    height: doc.internal.pageSize.getHeight(),
    margin: 48,
  };

  let y = page.margin;
  y = writePdfTitle(doc, page, y, "Resume Radar CV Repair Pack");
  y = writePdfText(doc, page, y, `Role: ${lastReport.role}`, { bold: true });
  y = writePdfText(doc, page, y, `Company: ${lastReport.company}`, { bold: true });
  y = writePdfText(doc, page, y, `Match score after scan: ${lastReport.overall}%`, { bold: true });
  y += 12;

  y = writePdfSectionTitle(doc, page, y, "What changed and why");
  lastReport.changeSummary.forEach((item, index) => {
    y = writePdfText(doc, page, y, `${index + 1}. ${item.change}`, { bold: true, fill: [255, 246, 204] });
    y = writePdfText(doc, page, y, item.reason, { size: 10, color: [80, 91, 84] });
    y += 6;
  });

  y = writePdfSectionTitle(doc, page, y, "Top priority gaps");
  const gaps = lastReport.missingTerms.slice(0, 10);
  if (gaps.length) {
    gaps.forEach((term) => {
      y = writePdfText(doc, page, y, `- ${term.label}: ${term.level} ${term.category}. Add only with truthful proof.`, { size: 10 });
    });
  } else {
    y = writePdfText(doc, page, y, "- No major keyword gaps found. Tighten evidence and formatting.", { size: 10 });
  }

  doc.addPage();
  y = page.margin;
  y = writePdfTitle(doc, page, y, "Original uploaded CV text");
  y = writePdfText(doc, page, y, lastReport.originalResume, { size: 9, leading: 12 });

  doc.addPage();
  y = page.margin;
  y = writePdfTitle(doc, page, y, "Highlighted passable CV draft");
  y = writePdfText(
    doc,
    page,
    y,
    "Highlighted lines are recommended additions or structure changes. Review every line before sending.",
    { size: 10, color: [80, 91, 84] }
  );
  y += 8;

  const highlightedSet = new Set(lastReport.highlightedLines);
  lastReport.optimizedCv.split("\n").forEach((line) => {
    const cleanLine = line.trim();
    const isHighlighted = highlightedSet.has(cleanLine);
    y = writePdfText(doc, page, y, line || " ", {
      size: /^[A-Z][A-Z,\s]+$/.test(cleanLine) ? 10.5 : 9.5,
      bold: /^[A-Z][A-Z,\s]+$/.test(cleanLine),
      leading: 12,
      fill: isHighlighted ? [255, 246, 204] : null,
    });
  });

  doc.save(`highlighted-cv-${slugify(lastReport.role)}.pdf`);
  showToast("Highlighted PDF downloaded.");
}

function writePdfTitle(doc, page, y, text) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(23, 32, 28);
  doc.text(text, page.margin, y);
  return y + 28;
}

function writePdfSectionTitle(doc, page, y, text) {
  y = ensurePdfSpace(doc, page, y, 34);
  doc.setFillColor(232, 247, 255);
  doc.roundedRect(page.margin - 3, y - 16, page.width - page.margin * 2 + 6, 24, 5, 5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(23, 32, 28);
  doc.text(text, page.margin, y);
  return y + 24;
}

function writePdfText(doc, page, y, text, options = {}) {
  const size = options.size || 10.5;
  const leading = options.leading || size + 5;
  const maxWidth = page.width - page.margin * 2;
  const lines = doc.splitTextToSize(String(text), maxWidth);
  const blockHeight = Math.max(leading, lines.length * leading);
  y = ensurePdfSpace(doc, page, y, blockHeight + 6);

  if (options.fill) {
    doc.setFillColor(...options.fill);
    doc.roundedRect(page.margin - 4, y - size - 4, maxWidth + 8, blockHeight + 7, 4, 4, "F");
  }

  doc.setFont("helvetica", options.bold ? "bold" : "normal");
  doc.setFontSize(size);
  doc.setTextColor(...(options.color || [23, 32, 28]));
  doc.text(lines, page.margin, y);
  return y + blockHeight;
}

function ensurePdfSpace(doc, page, y, needed) {
  if (y + needed <= page.height - page.margin) return y;
  doc.addPage();
  return page.margin;
}

function makeCheck({ title, detail, status, points, max }) {
  return { title, detail, status, points: clampNumber(points, 0, max), max };
}

function scoreChecks(checks) {
  const earned = checks.reduce((sum, check) => sum + check.points, 0);
  const total = checks.reduce((sum, check) => sum + check.max, 0) || 1;
  return clampScore(Math.round((earned / total) * 100));
}

function buildTermWeight({ label, category, level, frequency, source }) {
  const categoryWeight = {
    "Hard skills": 1.18,
    Tools: 1.12,
    Credentials: 1.08,
    Domain: 1.02,
    "Role match": 1.15,
    "Soft skills": 0.82,
  }[category] || 1;

  const levelWeight = level === "required" ? 1.42 : level === "preferred" ? 0.82 : 1;
  const frequencyWeight = Math.min(0.42, Math.max(0, frequency - 1) * 0.1);
  const sourceWeight = source === "skill bank" ? 0.12 : source === "target role" ? 0.18 : 0;
  const lengthPenalty = label.split(/\s+/).length > 4 ? -0.12 : 0;

  return clampNumber(categoryWeight * levelWeight + frequencyWeight + sourceWeight + lengthPenalty, 0.55, 2.4);
}

function getRequirementLevel(job, term) {
  const normalized = normalizeForSearch(job);
  const key = normalizeForSearch(term);
  const index = normalized.indexOf(key);
  const windowText = index >= 0 ? normalized.slice(Math.max(0, index - 110), index + key.length + 110) : normalized;

  if (/\b(preferred|nice to have|bonus|plus|advantage|desirable)\b/.test(windowText)) return "preferred";
  if (/\b(required|must|minimum|need|needs|essential|proficient|proven|hands-on|hands on|qualification|experience with|you have)\b/.test(windowText)) {
    return "required";
  }

  return "core";
}

function inferCategory(term) {
  const lower = term.toLowerCase();

  if (/(degree|certified|certification|license|mba|bachelor|master|phd|hipaa|gdpr|soc 2|pmp|cpa)/i.test(lower)) return "Credentials";
  if (/(leadership|communication|collaboration|stakeholder|problem solving|cross-functional|detail|adaptable)/i.test(lower)) return "Soft skills";
  if (/(saas|healthcare|finance|fintech|retail|ecommerce|marketing|sales|clinical|logistics)/i.test(lower)) return "Domain";
  if (skillBank.some((skill) => normalizeKey(skill.term) === normalizeKey(term))) return skillBank.find((skill) => normalizeKey(skill.term) === normalizeKey(term)).category;

  return "Hard skills";
}

function isUsefulTerm(term) {
  const cleaned = cleanTerm(term);
  if (cleaned.length < 3 || cleaned.length > 64) return false;

  const words = cleaned.toLowerCase().split(/\s+/);
  if (words.every((word) => stopWords.has(word))) return false;
  if (/^(and|or|with|for|from|to|in|of)\b/i.test(cleaned)) return false;
  if (/\b(we are|you are|this role|the ideal|our team|looking for)\b/i.test(cleaned)) return false;

  return true;
}

function termAppears(normalizedText, term, aliases = []) {
  return [term, ...aliases].some((choice) => {
    const normalizedChoice = normalizeForSearch(choice);
    return new RegExp(`(^|[^a-z0-9+#])${escapeRegExp(normalizedChoice)}([^a-z0-9+#]|$)`, "i").test(normalizedText);
  });
}

function countTerm(text, term, aliases = []) {
  const normalized = normalizeForSearch(text);
  const choices = unique([term, ...aliases]).map(normalizeForSearch).filter(Boolean);

  return choices.reduce((best, choice) => {
    const regex = new RegExp(`(^|[^a-z0-9+#])${escapeRegExp(choice)}([^a-z0-9+#]|$)`, "gi");
    const matches = normalized.match(regex) || [];
    return Math.max(best, matches.length);
  }, 0);
}

function extractYears(text) {
  const matches = Array.from(text.matchAll(/(\d{1,2})\+?\s*(?:years|yrs)/gi)).map((match) => Number(match[1]));
  return matches.length ? Math.max(...matches) : 0;
}

function startsWithWord(line, word) {
  return new RegExp(`^${escapeRegExp(word)}\\b`, "i").test(line.trim());
}

function scoreAdvice(score) {
  if (score >= 82) return "You are in a strong range; now make the proof crisp.";
  if (score >= 68) return "You are not far off; a few targeted edits could lift this fast.";
  if (score >= 50) return "There is something here, but the resume needs clearer job-language coverage.";
  return "I would tailor this version pretty heavily before applying.";
}

function normalizeForSearch(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[^\w+#.$%/\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeKey(text) {
  return normalizeForSearch(text).replace(/[^a-z0-9+#]+/g, " ").trim();
}

function cleanTerm(term) {
  return String(term || "")
    .replace(/^[-*\u2022]\s*/, "")
    .replace(/\s+/g, " ")
    .replace(/^[,;:.]+|[,;:.]+$/g, "")
    .replace(/^(including|include|such as|using|with|and|or|plus|must have|nice to have)\s+/i, "")
    .trim();
}

function tokenize(text) {
  return normalizeForSearch(text)
    .replace(/[$%.]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function wordCount(text) {
  return tokenize(text).length;
}

function groupBy(items, keyFn) {
  return items.reduce((groups, item) => {
    const key = keyFn(item);
    groups[key] = groups[key] || [];
    groups[key].push(item);
    return groups;
  }, {});
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function clampScore(value) {
  return clampNumber(value, 0, 100);
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

function matchFirst(text, regex) {
  const match = text.match(regex);
  return match ? match[0] : "";
}

function titleCase(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function extensionOf(fileName) {
  return String(fileName || "").split(".").pop().toLowerCase();
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value));
}

function formatFileSize(bytes) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = Number(bytes) || 0;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  const precision = size >= 10 || unitIndex === 0 ? 0 : 1;
  return `${size.toFixed(precision)} ${units[unitIndex]}`;
}

function slugify(value) {
  return normalizeKey(value).replace(/\s+/g, "-") || "scan";
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function refreshIcons() {
  if (window.lucide) window.lucide.createIcons();
}

function showToast(message) {
  const existing = $(".toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 2800);
}
