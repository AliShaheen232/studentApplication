import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Globe,
  BookOpen,
  Filter,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  Building2,
  Calendar,
  DollarSign,
  GraduationCap,
  Sparkles,
  Mail,
  RotateCw,
  Clock,
  Layers,
  ArrowRight,
  ShieldCheck,
  Info,
  X
} from 'lucide-react';
import Pip from './Pip';
import { DESTINATION_COUNTRIES, CountryInfo, FIELDS_OF_STUDY, FieldCategory } from '../data/countries';

export interface DiscoveredProgram {
  id: string;
  university_id: string;
  name: string;
  level: string;               // 'Bachelor' | 'Master' | 'PhD' | 'MBA' | 'Other'
  original_degree: string;     // 'B.S.', 'M.Sc.', 'Ph.D.', 'MBA'
  department: string;
  language: string;
  duration_months: number;
  tuition: number | null;
  deadline: string | null;
  requirements: string | null;
  program_url: string;
  admissions_url?: string;
  subject_category: string;
  application_mode?: 'portal_only' | 'portal_and_email' | 'direct_email';
  university_name?: string;
  country?: string;
  country_code?: string;
  city?: string;
  domain?: string;
  website?: string;
  ranking?: number;
  source_url?: string;
  source_type?: string;
  last_verified?: string;
  match_score?: number;
}

export interface InstitutionProgram {
  id: string;
  university_id: string;
  name: string;
  level: string;
  original_degree: string | null;
  language: string | null;
  tuition: number | null;
  deadline: string | null;
  program_url: string;
  last_verified?: string;
}

export interface Institution {
  id: string;
  name: string;
  city: string | null;
  website: string;
  domain: string;
  ranking: number | null;
  tagged: boolean;
  status: 'fresh' | 'running' | 'queued' | 'stale' | 'new';
  checked_at: string | null;
  programs: InstitutionProgram[];
}

interface LiveProgram {
  id: string;
  name: string;
  level: string;
  degree: string;
  url: string;
  language: string | null;
}

const CRAWL_CONCURRENCY = 4;

interface DiscoverViewProps {
  onSelectProgramForEmail: (program: DiscoveredProgram) => void;
  onViewProgramDetails: (program: DiscoveredProgram) => void;
  onNotify: (msg: string) => void;
  initialCountry?: string;
  initialField?: string;
}

export default function DiscoverView({
  onSelectProgramForEmail,
  onViewProgramDetails,
  onNotify,
  initialCountry,
  initialField
}: DiscoverViewProps) {
  // Discovery Parameters
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>(initialCountry || 'DE');
  const [selectedFieldId, setSelectedFieldId] = useState<string>(initialField || 'cs');
  const [customSearchTerm, setCustomSearchTerm] = useState<string>('');

  // Optional Filters
  const [isOptionalFiltersOpen, setIsOptionalFiltersOpen] = useState(false);
  const [preferredCity, setPreferredCity] = useState('');
  const [institutionKeyword, setInstitutionKeyword] = useState('');
  const [intakeFilter, setIntakeFilter] = useState('all');
  const [maxTuitionInput, setMaxTuitionInput] = useState('');
  const [languageFilter, setLanguageFilter] = useState('all');

  // Job & Results State
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [jobProgressStage, setJobProgressStage] = useState<string>('');
  const [coverage, setCoverage] = useState<{ institutions_total: number; institutions_checked: number } | null>(null);

  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedStudyLevel, setSelectedStudyLevel] = useState<string>('Master');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [progress, setProgress] = useState<Record<string, { pages: number; max: number; state: string }>>({});
  const [countrySearchQuery, setCountrySearchQuery] = useState('');
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const runRef = useRef(0);
  const activeRef = useRef(new Set<string>());

  // Active Country details
  const activeCountry = useMemo(() => {
    return DESTINATION_COUNTRIES.find((c) => c.code === selectedCountryCode) || DESTINATION_COUNTRIES.find((c) => c.code === 'DE') || DESTINATION_COUNTRIES[0];
  }, [selectedCountryCode]);

  // Active Field details
  const activeField = useMemo(() => {
    return FIELDS_OF_STUDY.find((f) => f.id === selectedFieldId) || FIELDS_OF_STUDY[0];
  }, [selectedFieldId]);

  // Filtered countries for selector modal/dropdown
  const filteredCountryOptions = useMemo(() => {
    if (!countrySearchQuery.trim()) return DESTINATION_COUNTRIES;
    const q = countrySearchQuery.toLowerCase();
    return DESTINATION_COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.code3.toLowerCase().includes(q)
    );
  }, [countrySearchQuery]);

  const fetchPage = async (nextPage: number): Promise<{ institutions: Institution[]; has_more: boolean; coverage: any } | null> => {
    const params = new URLSearchParams({
      country_code: activeCountry.code,
      field: activeField.name,
      level: selectedStudyLevel,
      page: String(nextPage),
    });
    const res = await fetch(`/api/discovery/institutions?${params.toString()}`);
    if (!res.ok) return null;
    return res.json();
  };

  const loadPage = async (nextPage = 0) => {
    setIsLoadingPage(true);
    try {
      const data = await fetchPage(nextPage);
      if (data) {
        setInstitutions(data.institutions || []);
        setPage(nextPage);
        setHasMore(!!data.has_more);
        setCoverage(data.coverage || null);
      }
      return data;
    } catch (err) {
      console.error('Failed to load universities:', err);
      return null;
    } finally {
      setIsLoadingPage(false);
    }
  };

  useEffect(() => {
    runRef.current++;
    setIsDiscovering(false);
    setProgress({});
    loadPage(0);
  }, [selectedCountryCode, selectedFieldId, selectedStudyLevel]);

  const post = async (path: string, body: unknown) => {
    const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  };

  const sleep = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

  const mergePrograms = (uniId: string, found: LiveProgram[], level: string) => {
    const fresh = found.filter((p) => p.level === level);
    if (!fresh.length) return;
    setInstitutions((prev) =>
      prev.map((inst) => {
        if (inst.id !== uniId) return inst;
        const have = new Set(inst.programs.map((p) => p.id));
        const added = fresh
          .filter((p) => !have.has(p.id))
          .map((p) => ({ id: p.id, university_id: uniId, name: p.name, level: p.level, original_degree: p.degree, language: p.language, tuition: null, deadline: null, program_url: p.url }));
        return added.length ? { ...inst, programs: [...inst.programs, ...added] } : inst;
      })
    );
  };

  // Crawls one university page by page; each request to the server handles a single page.
  const crawlOne = async (inst: Institution, run: number, field: string, level: string): Promise<'ok' | 'limit' | 'stopped'> => {
    if (activeRef.current.has(inst.id)) return 'ok';
    activeRef.current.add(inst.id);
    try {
      return await crawlSteps(inst, run, field, level);
    } finally {
      activeRef.current.delete(inst.id);
    }
  };

  const crawlSteps = async (inst: Institution, run: number, field: string, level: string): Promise<'ok' | 'limit' | 'stopped'> => {
    const begin = await post('/api/discovery/live/start', { university_id: inst.id, field });
    if (begin.data.status === 'limit') {
      onNotify(begin.data.error || 'Daily limit reached.');
      return 'limit';
    }
    if (begin.status === 401) {
      onNotify('Sign in to check universities live.');
      return 'limit';
    }
    if (begin.data.status !== 'started') {
      setProgress((p) => ({ ...p, [inst.id]: { pages: 0, max: 0, state: begin.data.status || 'error' } }));
      return 'ok';
    }
    const max = begin.data.max_pages || 8;
    const queue: { url: string; score: number; depth: number }[] = [{ url: begin.data.start_url, score: 100, depth: 0 }];
    const seen = new Set<string>([begin.data.start_url]);
    let pages = begin.data.pages || 0;
    let failedPages = 0;
    setProgress((p) => ({ ...p, [inst.id]: { pages, max, state: 'running' } }));
    while (queue.length && pages < max) {
      if (runRef.current !== run) return 'stopped';
      queue.sort((a, b) => b.score - a.score);
      const next = queue.shift()!;
      const r = await post('/api/discovery/live/step', { university_id: inst.id, field, url: next.url });
      if (r.data.status === 'wait') {
        queue.unshift(next);
        await sleep(Math.min(r.data.retry_after_ms || 1500, 15000));
        continue;
      }
      if (r.data.status === 'done' || r.data.status === 'not_claimed') break;
      if (!r.ok) {
        pages++;
        if (r.status >= 500) failedPages++;
        continue;
      }
      pages = r.data.pages;
      mergePrograms(inst.id, r.data.programs || [], level);
      if (next.depth < 2) {
        for (const l of r.data.links || []) {
          if (seen.has(l.url)) continue;
          seen.add(l.url);
          queue.push({ url: l.url, score: l.score - next.depth, depth: next.depth + 1 });
        }
      }
      setProgress((p) => ({ ...p, [inst.id]: { pages, max, state: 'running' } }));
      await sleep(1500);
    }
    const end = await post('/api/discovery/live/finish', { university_id: inst.id, field, failed_pages: failedPages });
    setProgress((p) => ({ ...p, [inst.id]: { pages, max, state: end.data.status === 'backup' ? 'queued' : 'done' } }));
    return 'ok';
  };

  const crawlList = async (list: Institution[], run: number, field: string, level: string) => {
    const todo = list.filter((i) => i.status === 'new' || i.status === 'stale');
    let next = 0;
    let stop = false;
    const worker = async () => {
      while (!stop && next < todo.length && runRef.current === run) {
        const inst = todo[next++];
        const outcome = await crawlOne(inst, run, field, level);
        if (outcome !== 'ok') stop = true;
      }
    };
    await Promise.all(Array.from({ length: Math.min(CRAWL_CONCURRENCY, todo.length) }, worker));
    return !stop;
  };

  // Execute live discovery: visible page first, then the remaining pages in the background
  const handleStartDiscovery = async () => {
    const run = ++runRef.current;
    const field = activeField.name;
    const level = selectedStudyLevel;
    setIsDiscovering(true);
    try {
      setJobProgressStage(`Checking universities in ${activeCountry.name} for ${field}...`);
      const first = await loadPage(page);
      if (!first) throw new Error('Could not load universities.');
      if (!first.institutions.length) {
        onNotify(`No universities found yet for ${field} in ${activeCountry.name}.`);
        return;
      }
      let ok = await crawlList(first.institutions, run, field, level);
      if (runRef.current !== run) return;
      onNotify(`Page ${page + 1} checked. Continuing with the other universities in the background.`);
      let more = first.has_more;
      let p = page + 1;
      while (ok && more && runRef.current === run) {
        setJobProgressStage(`Checking more universities in the background (page ${p + 1})...`);
        const data = await fetchPage(p);
        if (!data) break;
        ok = await crawlList(data.institutions, run, field, level);
        more = data.has_more;
        p++;
      }
      if (runRef.current === run && ok && !more) onNotify(`All universities for ${field} in ${activeCountry.name} have been checked.`);
    } catch (err: any) {
      console.error(err);
      onNotify(`Discovery error: ${err.message}`);
    } finally {
      if (runRef.current === run) {
        setIsDiscovering(false);
        setJobProgressStage('');
      }
    }
  };

  const goToPage = async (nextPage: number) => {
    const data = await loadPage(nextPage);
    if (data && isDiscovering) {
      const run = runRef.current;
      crawlList(data.institutions, run, activeField.name, selectedStudyLevel);
    }
  };

  // Optional filters work on the loaded page
  const visibleInstitutions = useMemo(() => {
    const max = Number(maxTuitionInput) > 0 ? Number(maxTuitionInput) : null;
    const kw = customSearchTerm.trim().toLowerCase();
    return institutions
      .filter((i) => !preferredCity || (i.city || '').toLowerCase().includes(preferredCity.toLowerCase()))
      .filter((i) => !institutionKeyword || i.name.toLowerCase().includes(institutionKeyword.toLowerCase()))
      .map((i) => ({
        ...i,
        programs: i.programs.filter(
          (p) =>
            (languageFilter === 'all' || (p.language || '').toLowerCase().includes(languageFilter)) &&
            (!kw || p.name.toLowerCase().includes(kw)) &&
            (max === null || p.tuition === null || p.tuition <= max)
        ),
      }));
  }, [institutions, preferredCity, institutionKeyword, languageFilter, customSearchTerm, maxTuitionInput]);

  const toProgram = (inst: Institution, p: InstitutionProgram): DiscoveredProgram => ({
    id: p.id,
    university_id: inst.id,
    name: p.name,
    level: p.level,
    original_degree: p.original_degree || p.level,
    department: '',
    language: p.language || 'Not listed',
    duration_months: 0,
    tuition: p.tuition,
    deadline: p.deadline,
    requirements: null,
    program_url: p.program_url,
    subject_category: activeField.name,
    university_name: inst.name,
    country: activeCountry.name,
    country_code: activeCountry.code,
    city: inst.city || undefined,
    domain: inst.domain,
    website: inst.website,
    ranking: inst.ranking || undefined,
    last_verified: p.last_verified,
  });

  const programCount = visibleInstitutions.reduce((n, i) => n + i.programs.length, 0);

  return (
    <div className="space-y-6">
      {/* 1. DISCOVERY WORKFLOW BANNER & CONTROLS */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 mb-1">
              <Globe className="h-3 w-3 text-emerald-600" />
              Country-First Dynamic Discovery Engine
            </div>
            <h2 className="text-base font-bold text-slate-900">
              Discover Academic Programmes by Destination Country & Field
            </h2>
            <p className="text-xs text-slate-500">
              Select any sovereign nation and academic field. AdminPath inspects official institutional catalogues and indexes each distinct degree opportunity.
            </p>
          </div>

          <button
            onClick={handleStartDiscovery}
            disabled={isDiscovering}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#4f3fd0] hover:bg-[#4034a8] text-white font-semibold text-xs shadow-sm transition disabled:opacity-50 cursor-pointer shrink-0"
          >
            {isDiscovering ? (
              <>
                <RotateCw className="h-4 w-4 animate-spin" />
                Searching Accredited Sources...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Start Discovery
              </>
            )}
          </button>
        </div>

        {/* Primary Parameter Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
          {/* Country Selector */}
          <div className="relative">
            <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>1. Destination Country</span>
            </label>

            <button
              type="button"
              onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white text-left text-xs text-slate-900 transition focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <div className="flex items-center gap-2.5 truncate">
                <span className="text-lg leading-none">{activeCountry.flag}</span>
                <span className="font-medium truncate">{activeCountry.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-mono">
                  {activeCountry.code}
                </span>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400 shrink-0 ml-2" />
            </button>

            {/* Country Dropdown Modal */}
            {isCountryDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-xl p-2 max-h-72 flex flex-col">
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search destination countries..."
                    value={countrySearchQuery}
                    onChange={(e) => setCountrySearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-600"
                    autoFocus
                  />
                </div>

                <div className="overflow-y-auto space-y-0.5 flex-1 pr-1">
                  {filteredCountryOptions.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => {
                        setSelectedCountryCode(c.code);
                        setIsCountryDropdownOpen(false);
                        setCountrySearchQuery('');
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs text-left transition ${
                        selectedCountryCode === c.code
                          ? 'bg-emerald-50 text-emerald-900 font-semibold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-base">{c.flag}</span>
                        <span className="truncate">{c.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">{c.code}</span>
                    </button>
                  ))}
                  {filteredCountryOptions.length === 0 && (
                    <div className="p-3 text-center text-xs text-slate-400">No countries matched query.</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Field of Study Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>2. Field of Study</span>
            </label>

            <select
              value={selectedFieldId}
              onChange={(e) => setSelectedFieldId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white text-xs text-slate-900 transition focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              {FIELDS_OF_STUDY.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.icon} {f.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              3. Study Level
            </label>
            <select
              value={selectedStudyLevel}
              onChange={(e) => setSelectedStudyLevel(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white text-xs text-slate-900 transition focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="Bachelor">Bachelor's / Undergraduate</option>
              <option value="Master">Master's / Graduate</option>
              <option value="PhD">PhD / Doctoral</option>
              <option value="MBA">MBA</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>4. Budget (USD / year)</span>
            </label>
            <input
              type="number"
              min="0"
              placeholder="e.g. 15000"
              value={maxTuitionInput}
              onChange={(e) => setMaxTuitionInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadPage(0)}
              className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-800"
            />
          </div>
        </div>

        {/* Optional Filters Toggle */}
        <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIsOptionalFiltersOpen(!isOptionalFiltersOpen)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition"
          >
            <Filter className="h-3.5 w-3.5 text-slate-500" />
            <span>Optional Filters (Keyword, City, Language, Institution)</span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOptionalFiltersOpen ? 'rotate-180' : ''}`} />
          </button>

          {(preferredCity || customSearchTerm || languageFilter !== 'all' || intakeFilter !== 'all' || institutionKeyword) && (
            <button
              onClick={() => {
                setPreferredCity('');
                setCustomSearchTerm('');
                setLanguageFilter('all');
                setIntakeFilter('all');
                setInstitutionKeyword('');
              }}
              className="text-[11px] text-emerald-700 hover:underline"
            >
              Clear optional filters
            </button>
          )}
        </div>

        {/* Collapsible Optional Filters */}
        {isOptionalFiltersOpen && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 mt-2 border-t border-dashed border-slate-200">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Target City / Region</label>
              <input
                type="text"
                placeholder="e.g. Munich, London, Boston..."
                value={preferredCity}
                onChange={(e) => setPreferredCity(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-200 bg-white"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Programme Keyword</label>
              <input
                type="text"
                placeholder="e.g. Robotics, Data, Finance..."
                value={customSearchTerm}
                onChange={(e) => setCustomSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadPage(0)}
                className="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-200 bg-white"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Language of Instruction</label>
              <select
                value={languageFilter}
                onChange={(e) => setLanguageFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-200 bg-white"
              >
                <option value="all">Any Language</option>
                <option value="english">English Taught</option>
                <option value="german">German Taught</option>
                <option value="french">French Taught</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Institution Keyword</label>
              <input
                type="text"
                placeholder="e.g. Technical University..."
                value={institutionKeyword}
                onChange={(e) => setInstitutionKeyword(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-200 bg-white"
              />
            </div>
          </div>
        )}

        {/* Live Discovery Progress Bar */}
        {isDiscovering && (
          <div className="mt-4 p-3.5 rounded-lg bg-emerald-50/80 border border-emerald-200 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-900">
              <span className="flex items-center gap-2">
                <RotateCw className="h-3.5 w-3.5 animate-spin text-emerald-700" />
                {jobProgressStage || 'Crawling university catalogues...'}
              </span>
              <span className="text-[11px] text-emerald-700 font-mono font-normal">Active Job • Polling</span>
            </div>
            <div className="w-full bg-emerald-200/60 rounded-full h-1.5 overflow-hidden">
              <div className="bg-emerald-700 h-1.5 rounded-full animate-pulse w-3/4 transition-all duration-500" />
            </div>
          </div>
        )}
      </div>

      {/* 2. COVERAGE BAR */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5 font-medium text-slate-800">
            <Building2 className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            <span>
              Page {page + 1}: <strong>{visibleInstitutions.length}</strong> universities
            </span>
          </span>
          <span className="flex items-center gap-1.5 font-medium text-slate-800">
            <GraduationCap className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>
              {selectedStudyLevel} programmes found: <strong>{programCount}</strong>
            </span>
          </span>
          {coverage && (
            <span className="flex items-center gap-1.5 font-medium text-slate-800">
              <Search className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              <span>
                Subjects known for <strong>{coverage.institutions_checked}</strong> of {coverage.institutions_total} universities in {activeCountry.name}
              </span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span>Checked live on official university websites, saved for 100 days</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-slate-500" />
          {selectedStudyLevel} programmes in {activeField.name}
        </h3>
        {isLoadingPage && <RotateCw className="h-3.5 w-3.5 animate-spin text-slate-400" />}
      </div>

      {/* 3. ONE CARD PER UNIVERSITY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {visibleInstitutions.map((inst) => {
          const prog = progress[inst.id];
          const checking = prog?.state === 'running';
          const checked = inst.status === 'fresh' || prog?.state === 'done';
          return (
            <div key={inst.id} className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                    <span>{activeCountry.flag}</span>
                    <span>{activeCountry.name}</span>
                    {inst.city && (
                      <>
                        <span>•</span>
                        <span>{inst.city}</span>
                      </>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 truncate">{inst.name}</h4>
                  <a href={inst.website} target="_blank" rel="noopener noreferrer" className="text-[11px] text-slate-500 hover:text-slate-800 inline-flex items-center gap-0.5">
                    {inst.domain} <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </div>
                <span
                  className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                    checking
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : checked
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  {checking
                    ? `Checking ${prog.pages}/${prog.max} pages`
                    : checked
                    ? 'Checked'
                    : prog?.state === 'queued' || inst.status === 'queued'
                    ? 'Queued for a deeper check'
                    : prog?.state === 'busy' || inst.status === 'running'
                    ? 'Being checked'
                    : inst.status === 'stale'
                    ? 'Older than 100 days'
                    : 'Not checked yet'}
                </span>
              </div>

              {inst.programs.length > 0 ? (
                <ul className="divide-y divide-slate-100 border-t border-slate-100">
                  {inst.programs.map((p) => (
                    <li key={p.id} className="py-2 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                            {p.original_degree || p.level}
                          </span>
                          <span className="text-xs font-semibold text-slate-900 truncate">{p.name}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-3 mt-0.5">
                          <span>{p.tuition ? `$${p.tuition.toLocaleString()}/yr` : 'Fee not listed'}</span>
                          {p.language && <span>{p.language}</span>}
                          {p.program_url && (
                            <a href={p.program_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 hover:text-slate-800">
                              Source <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onViewProgramDetails(toProgram(inst, p))}
                          className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer"
                          title="View details"
                        >
                          <Info className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onSelectProgramForEmail(toProgram(inst, p))}
                          className="p-1.5 rounded-md bg-[#4f3fd0] hover:bg-[#4034a8] text-white cursor-pointer"
                          title="Send email"
                        >
                          <Mail className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11px] text-slate-500 border-t border-slate-100 pt-2">
                  {checking
                    ? 'Reading the university website...'
                    : checked
                    ? `No ${selectedStudyLevel} programme in ${activeField.name} found on the pages we checked.`
                    : prog?.state === 'queued' || inst.status === 'queued'
                    ? 'This website could not be read live. Our background crawler checks it within a day.'
                    : 'Click Start Discovery to check this university.'}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {(page > 0 || hasMore) && (
        <div className="flex justify-center items-center gap-3">
          <button
            onClick={() => goToPage(page - 1)}
            disabled={page === 0 || isLoadingPage}
            className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Previous 15
          </button>
          <span className="text-xs text-slate-500">Page {page + 1}</span>
          <button
            onClick={() => goToPage(page + 1)}
            disabled={!hasMore || isLoadingPage}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Next 15 <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {visibleInstitutions.length === 0 && !isLoadingPage && (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
          <div className="flex justify-center">
            <Pip size={72} />
          </div>
          <h3 className="text-base font-bold text-slate-800">No universities listed yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            We have not loaded the universities of {activeCountry.name} yet. The list fills in automatically within a few days.
          </p>
        </div>
      )}
    </div>
  );
}
