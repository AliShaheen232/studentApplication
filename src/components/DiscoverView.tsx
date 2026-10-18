import React, { useState, useEffect, useMemo } from 'react';
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
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobProgressStage, setJobProgressStage] = useState<string>('');
  const [jobStats, setJobStats] = useState<{
    institutionsDiscovered: number;
    programmesExtracted: number;
    pagesInspected: number;
    lastUpdated: string;
  } | null>(null);

  const [search, setSearch] = useState<{
    status: string;
    stale: boolean;
    fetched_at: string | null;
    programs_count: number;
    institutions_count: number;
    last_error: string | null;
  } | null>(null);

  const [coverage, setCoverage] = useState<{ institutions_total: number; institutions_checked: number } | null>(null);

  // Raw Results & Dynamic Filter
  const [programs, setPrograms] = useState<DiscoveredProgram[]>([]);
  const [selectedStudyLevel, setSelectedStudyLevel] = useState<string>('all');
  const [countrySearchQuery, setCountrySearchQuery] = useState('');
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);

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

  // Load Initial or Cached Results
  const loadResults = async (countryName?: string, fieldCategory?: string) => {
    try {
      const c = countryName || activeCountry.name;
      const f = fieldCategory || activeField.name;
      const res = await fetch(
        `/api/discovery/results?country=${encodeURIComponent(c)}&country_code=${encodeURIComponent(activeCountry.code)}&field=${encodeURIComponent(f)}`
      );
      if (res.ok) {
        const data = await res.json();
        setPrograms(data.programs || []);
        setSearch(data.search || null);
        setCoverage(data.coverage || null);
        if (data.stats) {
          setJobStats({
            ...data.stats,
            lastUpdated: data.stats.lastUpdated ? new Date(data.stats.lastUpdated.replace(' ', 'T') + 'Z').toLocaleString() : 'Not crawled yet'
          });
        }
        return data.search || null;
      }
    } catch (err) {
      console.error('Failed to load discovery results:', err);
    }
  };

  useEffect(() => {
    loadResults();
  }, [selectedCountryCode, selectedFieldId]);

  const searchTerm = customSearchTerm.trim() || activeField.name;
  const isCrawling = search?.status === 'pending' || search?.status === 'running';

  useEffect(() => {
    if (!isCrawling) return;
    const timer = window.setInterval(async () => {
      const next = await loadResults(activeCountry.name, searchTerm);
      if (next && next.status === 'ready') {
        onNotify(`New results are ready: ${next.programs_count} programmes from ${next.institutions_count} universities in ${activeCountry.name}.`);
      }
    }, 20000);
    return () => window.clearInterval(timer);
  }, [isCrawling, activeCountry.name, searchTerm]);

  // Execute Durable Discovery Job
  const handleStartDiscovery = async () => {
    setIsDiscovering(true);
    setJobProgressStage(`Searching the AdmitPath catalogue for ${activeCountry.name}...`);
    try {
      const payload = {
        country: activeCountry.name,
        country_code: activeCountry.code,
        field: customSearchTerm.trim() || activeField.name,
        preferences: {
          city: preferredCity.trim() || undefined,
          institution_name: institutionKeyword.trim() || undefined,
          intake: intakeFilter !== 'all' ? intakeFilter : undefined,
          max_tuition: maxTuitionInput ? parseFloat(maxTuitionInput) : undefined,
          language: languageFilter !== 'all' ? languageFilter : undefined,
        }
      };

      const res = await fetch('/api/discovery/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to start discovery job');
      }

      const jobData = await res.json();
      setActiveJobId(jobData.job_id);

      await loadResults(activeCountry.name, customSearchTerm.trim() || activeField.name);
      onNotify(jobData.message);
    } catch (err: any) {
      console.error(err);
      onNotify(`Discovery error: ${err.message}`);
    } finally {
      setIsDiscovering(false);
      setJobProgressStage('');
    }
  };

  // -------------------------------------------------------------
  // DYNAMIC STUDY-LEVEL FILTERS (DERIVED STRICTLY FROM RESULTS)
  // Acceptance criteria: Must not be a fixed hardcoded list.
  // Must reflect only the degree levels present in the current results.
  // -------------------------------------------------------------
  const dynamicStudyLevels = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of programs) {
      const lvl = p.level || 'Other';
      counts[lvl] = (counts[lvl] || 0) + 1;
    }
    // Convert to sorted list of available levels with counts
    const levelOrder = ['Bachelor', 'Master', 'PhD', 'MBA', 'Other'];
    const available = Object.keys(counts).sort((a, b) => {
      const idxA = levelOrder.indexOf(a);
      const idxB = levelOrder.indexOf(b);
      return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
    });

    return available.map((lvl) => ({
      level: lvl,
      label:
        lvl === 'Bachelor'
          ? "Bachelor's / Undergraduate"
          : lvl === 'Master'
          ? "Master's / Graduate"
          : lvl === 'PhD'
          ? 'PhD / Doctoral'
          : lvl,
      count: counts[lvl]
    }));
  }, [programs]);

  // Filtered Programs based on active study level and optional filters
  const filteredPrograms = useMemo(() => {
    return programs.filter((p) => {
      // 1. Study level filter
      if (selectedStudyLevel !== 'all' && p.level !== selectedStudyLevel) {
        return false;
      }
      // 2. City filter
      if (preferredCity && !p.city?.toLowerCase().includes(preferredCity.toLowerCase())) {
        return false;
      }
      // 3. Institution keyword
      if (institutionKeyword && !p.university_name?.toLowerCase().includes(institutionKeyword.toLowerCase())) {
        return false;
      }
      // 4. Max tuition
      if (maxTuitionInput && p.tuition !== null && p.tuition !== undefined) {
        const max = parseFloat(maxTuitionInput);
        if (!isNaN(max) && p.tuition > max) {
          return false;
        }
      }
      // 5. Language
      if (languageFilter !== 'all' && !p.language.toLowerCase().includes(languageFilter.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [programs, selectedStudyLevel, preferredCity, institutionKeyword, maxTuitionInput, languageFilter]);

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
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#047857] hover:bg-[#065f46] text-white font-semibold text-xs shadow-sm transition disabled:opacity-50 cursor-pointer shrink-0"
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
          {/* Country Selector */}
          <div className="relative">
            <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>1. Destination Country</span>
              <span className="text-[10px] text-slate-400 font-normal">{DESTINATION_COUNTRIES.length} destination countries</span>
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
              <span className="text-[10px] text-slate-400 font-normal">Curriculum Taxonomy</span>
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

          {/* Custom Search Keywords */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>3. Specific Focus / Keywords (Optional)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. Distributed Systems, Robotics, LLMs..."
                value={customSearchTerm}
                onChange={(e) => setCustomSearchTerm(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-800"
              />
            </div>
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
            <span>Optional Filters (City, Tuition Cap, Language, Intake)</span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOptionalFiltersOpen ? 'rotate-180' : ''}`} />
          </button>

          {(preferredCity || maxTuitionInput || languageFilter !== 'all' || intakeFilter !== 'all') && (
            <button
              onClick={() => {
                setPreferredCity('');
                setMaxTuitionInput('');
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
              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Max Annual Tuition ($ USD)</label>
              <input
                type="number"
                placeholder="e.g. 50000"
                value={maxTuitionInput}
                onChange={(e) => setMaxTuitionInput(e.target.value)}
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

      {search && (isCrawling || search.stale || search.status === 'failed' || (search.status === 'ready' && search.last_error)) && (
        <div
          className={`rounded-lg px-4 py-3 text-xs flex items-start gap-2.5 border ${
            search.status === 'failed' ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          {isCrawling ? <RotateCw className="h-4 w-4 animate-spin shrink-0 mt-0.5" /> : <Clock className="h-4 w-4 shrink-0 mt-0.5" />}
          <div>
            {isCrawling && (
              <>
                <strong>Collecting {searchTerm} programmes from university websites in {activeCountry.name}.</strong>{' '}
                This usually takes 5 to 15 minutes. You can leave this page; results appear here automatically.
                {search.stale && ' The results below are from the last crawl.'}
              </>
            )}
            {!isCrawling && search.stale && <>These results are more than 30 days old. Click Start Discovery to refresh them.</>}
            {search.status === 'failed' && <> The last crawl failed. Click Start Discovery to try again.</>}
            {!isCrawling && !search.stale && search.status === 'ready' && search.last_error && <>{search.last_error}</>}
          </div>
        </div>
      )}

      {/* 2. PROVENANCE & CRAWL COVERAGE STATS BAR */}
      {jobStats && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5 font-medium text-slate-800">
              <Building2 className="h-3.5 w-3.5 text-slate-500" />
              Universities: <strong>{jobStats.institutionsDiscovered}</strong>
            </span>
            <span className="flex items-center gap-1.5 font-medium text-slate-800">
              <GraduationCap className="h-3.5 w-3.5 text-emerald-600" />
              Distinct Programmes: <strong>{jobStats.programmesExtracted}</strong>
            </span>
            {coverage && (
              <span className="flex items-center gap-1.5 font-medium text-slate-800">
                <Search className="h-3.5 w-3.5 text-slate-500" />
                Checked: <strong>{coverage.institutions_checked}</strong> of {coverage.institutions_total} universities in {activeCountry.name}
              </span>
            )}
            <span className="flex items-center gap-1.5 text-slate-500">
              <Clock className="h-3.5 w-3.5" />
              Last crawled: {jobStats.lastUpdated}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Every programme links to the university page it came from</span>
          </div>
        </div>
      )}

      {/* 3. DYNAMIC STUDY-LEVEL FILTERS DERIVED STRICTLY FROM RESULTS */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-slate-500" />
            Study-Level Filter (Derived from Discovered Records)
          </h3>
          <span className="text-xs text-slate-500">
            Showing {filteredPrograms.length} of {programs.length} opportunities
          </span>
        </div>

        {/* Dynamic Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedStudyLevel('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              selectedStudyLevel === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            All Degrees ({programs.length})
          </button>

          {dynamicStudyLevels.map((lvl) => (
            <button
              key={lvl.level}
              onClick={() => setSelectedStudyLevel(lvl.level)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                selectedStudyLevel === lvl.level
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>{lvl.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                  selectedStudyLevel === lvl.level ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {lvl.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 4. ONE RESULT PER INSTITUTION, PROGRAMME, AND STUDY LEVEL */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPrograms.map((prog) => {
          const isPortalOnly = prog.application_mode === 'portal_only';

          return (
            <div
              key={prog.id}
              className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div className="space-y-3">
                {/* Institution & Country */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                      <span>{activeCountry.flag}</span>
                      <span>{prog.country || activeCountry.name}</span>
                      {prog.city && (
                        <>
                          <span>•</span>
                          <span>{prog.city}</span>
                        </>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 line-clamp-1 group-hover:text-emerald-800 transition">
                      {prog.university_name || 'Accredited University'}
                    </h4>
                  </div>

                  {prog.ranking && (
                    <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                      Rank #{prog.ranking}
                    </span>
                  )}
                </div>

                {/* Programme Title & Normalized Level Badge */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                        prog.level === 'PhD'
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : prog.level === 'Master'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : prog.level === 'MBA'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}
                    >
                      {prog.original_degree || prog.level}
                    </span>

                    <span className="text-[11px] text-slate-400 font-medium">
                      {prog.level === 'Bachelor'
                        ? "Bachelor's"
                        : prog.level === 'Master'
                        ? "Master's"
                        : prog.level === 'PhD'
                        ? 'Doctoral'
                        : prog.level}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-slate-900 leading-snug line-clamp-2">
                    {prog.name}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-1">{prog.department}</p>
                </div>

                {/* Key Attributes */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                  <div className="flex items-center gap-1.5 truncate">
                    <DollarSign className="h-3 w-3 text-slate-400 shrink-0" />
                    <span className="truncate">
                      {prog.tuition ? `$${prog.tuition.toLocaleString()}/yr` : 'Not available'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 truncate">
                    <Calendar className="h-3 w-3 text-slate-400 shrink-0" />
                    <span className="truncate">{prog.deadline || 'Rolling Intake'}</span>
                  </div>

                  <div className="flex items-center gap-1.5 truncate">
                    <Globe className="h-3 w-3 text-slate-400 shrink-0" />
                    <span className="truncate">{prog.language}</span>
                  </div>

                  <div className="flex items-center gap-1.5 truncate">
                    <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                    <span className="truncate">{prog.duration_months} Months</span>
                  </div>
                </div>

                {/* Provenance Tag */}
                <div className="pt-2 flex items-center justify-between text-[10px] text-slate-400">
                  <span className="inline-flex items-center gap-1 text-emerald-700">
                    <ShieldCheck className="h-3 w-3" />
                    Official Source Verified
                  </span>
                  {prog.program_url && (
                    <a
                      href={prog.program_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 text-slate-500 hover:text-slate-800"
                    >
                      Catalogue <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </div>
              </div>

              {/* REQUIRED TWO ACTIONS: View Programme Details & Send Email */}
              <div className="pt-3 mt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onViewProgramDetails(prog)}
                  className="w-full py-2 px-2.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs text-center transition cursor-pointer flex items-center justify-center gap-1"
                >
                  <Info className="h-3.5 w-3.5 text-slate-500" />
                  View Details
                </button>

                <button
                  type="button"
                  onClick={() => onSelectProgramForEmail(prog)}
                  className="w-full py-2 px-2.5 rounded-lg bg-[#047857] hover:bg-[#065f46] text-white font-semibold text-xs text-center shadow-2xs transition cursor-pointer flex items-center justify-center gap-1"
                >
                  <Mail className="h-3.5 w-3.5" />
                  Send Email
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredPrograms.length === 0 && !isDiscovering && (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <BookOpen className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No matching programmes found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {isCrawling
              ? `We are collecting programmes from university websites in ${activeCountry.name}. Results will appear here.`
              : `No saved programmes for this search in ${activeCountry.name} yet. Click "Start Discovery" to collect them from official university websites.`}
          </p>
          <button
            onClick={handleStartDiscovery}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#047857] text-white text-xs font-semibold hover:bg-[#065f46] transition cursor-pointer"
          >
            <Sparkles className="h-4 w-4" />
            Discover Programmes in {activeCountry.name}
          </button>
        </div>
      )}
    </div>
  );
}
