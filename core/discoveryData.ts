/**
 * AdminPath Comprehensive Global Discovery Data
 * Complete ISO-3166-1 country dataset and academic fields taxonomy.
 */

export interface CountryInfo {
  code: string;       // ISO 3166-1 alpha-2
  code3: string;      // ISO 3166-1 alpha-3
  name: string;
  flag: string;
  region: string;
  hasCatalog: boolean;
}

export interface FieldCategory {
  id: string;
  name: string;
  icon: string;
  subfields: string[];
}

export const GLOBAL_COUNTRIES: CountryInfo[] = [
  // Major destination countries
  { code: 'US', code3: 'USA', name: 'United States', flag: '🇺🇸', region: 'Americas', hasCatalog: true },
  { code: 'GB', code3: 'GBR', name: 'United Kingdom', flag: '🇬🇧', region: 'Europe', hasCatalog: true },
  { code: 'DE', code3: 'DEU', name: 'Germany', flag: '🇩🇪', region: 'Europe', hasCatalog: true },
  { code: 'CA', code3: 'CAN', name: 'Canada', flag: '🇨🇦', region: 'Americas', hasCatalog: true },
  { code: 'AU', code3: 'AUS', name: 'Australia', flag: '🇦🇺', region: 'Oceania', hasCatalog: true },
  { code: 'FR', code3: 'FRA', name: 'France', flag: '🇫🇷', region: 'Europe', hasCatalog: true },
  { code: 'NL', code3: 'NLD', name: 'Netherlands', flag: '🇳🇱', region: 'Europe', hasCatalog: true },
  { code: 'CH', code3: 'CHE', name: 'Switzerland', flag: '🇨🇭', region: 'Europe', hasCatalog: true },
  { code: 'SE', code3: 'SWE', name: 'Sweden', flag: '🇸🇪', region: 'Europe', hasCatalog: true },
  { code: 'SG', code3: 'SGP', name: 'Singapore', flag: '🇸🇬', region: 'Asia', hasCatalog: true },
  { code: 'JP', code3: 'JPN', name: 'Japan', flag: '🇯🇵', region: 'Asia', hasCatalog: true },
  { code: 'KR', code3: 'KOR', name: 'South Korea', flag: '🇰🇷', region: 'Asia', hasCatalog: true },
  { code: 'IE', code3: 'IRL', name: 'Ireland', flag: '🇮🇪', region: 'Europe', hasCatalog: true },
  { code: 'IT', code3: 'ITA', name: 'Italy', flag: '🇮🇹', region: 'Europe', hasCatalog: true },
  { code: 'ES', code3: 'ESP', name: 'Spain', flag: '🇪🇸', region: 'Europe', hasCatalog: true },
  { code: 'NZ', code3: 'NZL', name: 'New Zealand', flag: '🇳🇿', region: 'Oceania', hasCatalog: true },
  { code: 'NO', code3: 'NOR', name: 'Norway', flag: '🇳🇴', region: 'Europe', hasCatalog: true },
  { code: 'DK', code3: 'DNK', name: 'Denmark', flag: '🇩🇰', region: 'Europe', hasCatalog: true },
  { code: 'FI', code3: 'FIN', name: 'Finland', flag: '🇫🇮', region: 'Europe', hasCatalog: true },
  { code: 'BE', code3: 'BEL', name: 'Belgium', flag: '🇧🇪', region: 'Europe', hasCatalog: true },
  { code: 'AT', code3: 'AUT', name: 'Austria', flag: '🇦🇹', region: 'Europe', hasCatalog: true },
  { code: 'ID', code3: 'IDN', name: 'Indonesia', flag: '🇮🇩', region: 'Asia', hasCatalog: true },
  { code: 'MY', code3: 'MYS', name: 'Malaysia', flag: '🇲🇾', region: 'Asia', hasCatalog: true },
  { code: 'ZA', code3: 'ZAF', name: 'South Africa', flag: '🇿🇦', region: 'Africa', hasCatalog: true },
  { code: 'BR', code3: 'BRA', name: 'Brazil', flag: '🇧🇷', region: 'Americas', hasCatalog: true },
  { code: 'IN', code3: 'IND', name: 'India', flag: '🇮🇳', region: 'Asia', hasCatalog: true },
  { code: 'CN', code3: 'CHN', name: 'China', flag: '🇨🇳', region: 'Asia', hasCatalog: true },
  { code: 'MX', code3: 'MEX', name: 'Mexico', flag: '🇲🇽', region: 'Americas', hasCatalog: true },
  { code: 'PL', code3: 'POL', name: 'Poland', flag: '🇵🇱', region: 'Europe', hasCatalog: true },
  { code: 'PT', code3: 'PRT', name: 'Portugal', flag: '🇵🇹', region: 'Europe', hasCatalog: true },
  { code: 'CZ', code3: 'CZE', name: 'Czech Republic', flag: '🇨🇿', region: 'Europe', hasCatalog: true },
  { code: 'HU', code3: 'HUN', name: 'Hungary', flag: '🇭🇺', region: 'Europe', hasCatalog: true },
  { code: 'GR', code3: 'GRC', name: 'Greece', flag: '🇬🇷', region: 'Europe', hasCatalog: true },
  { code: 'TR', code3: 'TUR', name: 'Turkey', flag: '🇹🇷', region: 'Europe', hasCatalog: true },
  { code: 'AE', code3: 'ARE', name: 'United Arab Emirates', flag: '🇦🇪', region: 'Middle East', hasCatalog: true },
  { code: 'SA', code3: 'SAU', name: 'Saudi Arabia', flag: '🇸🇦', region: 'Middle East', hasCatalog: true },
  { code: 'EG', code3: 'EGY', name: 'Egypt', flag: '🇪🇬', region: 'Africa', hasCatalog: true },
  { code: 'NG', code3: 'NGA', name: 'Nigeria', flag: '🇳🇬', region: 'Africa', hasCatalog: true },
  { code: 'KE', code3: 'KEN', name: 'Kenya', flag: '🇰🇪', region: 'Africa', hasCatalog: true },
  { code: 'GH', code3: 'GHA', name: 'Ghana', flag: '🇬🇭', region: 'Africa', hasCatalog: true },
  { code: 'CL', code3: 'CHL', name: 'Chile', flag: '🇨🇱', region: 'Americas', hasCatalog: true },
  { code: 'AR', code3: 'ARG', name: 'Argentina', flag: '🇦🇷', region: 'Americas', hasCatalog: true },
  { code: 'CO', code3: 'COL', name: 'Colombia', flag: '🇨🇴', region: 'Americas', hasCatalog: true },
  { code: 'TH', code3: 'THA', name: 'Thailand', flag: '🇹🇭', region: 'Asia', hasCatalog: true },
  { code: 'VN', code3: 'VNM', name: 'Vietnam', flag: '🇻🇳', region: 'Asia', hasCatalog: true },
  { code: 'PH', code3: 'PHL', name: 'Philippines', flag: '🇵🇭', region: 'Asia', hasCatalog: true },
  { code: 'PK', code3: 'PAK', name: 'Pakistan', flag: '🇵🇰', region: 'Asia', hasCatalog: true },
  { code: 'BD', code3: 'BGD', name: 'Bangladesh', flag: '🇧🇩', region: 'Asia', hasCatalog: true },
  { code: 'TW', code3: 'TWN', name: 'Taiwan', flag: '🇹🇼', region: 'Asia', hasCatalog: true },
  { code: 'HK', code3: 'HKG', name: 'Hong Kong', flag: '🇭🇰', region: 'Asia', hasCatalog: true },
  { code: 'IL', code3: 'ISR', name: 'Israel', flag: '🇮🇱', region: 'Middle East', hasCatalog: true },
  { code: 'RO', code3: 'ROU', name: 'Romania', flag: '🇷🇴', region: 'Europe', hasCatalog: true },
  { code: 'BG', code3: 'BGR', name: 'Bulgaria', flag: '🇧🇬', region: 'Europe', hasCatalog: true },
  { code: 'HR', code3: 'HRV', name: 'Croatia', flag: '🇭🇷', region: 'Europe', hasCatalog: true },
  { code: 'SI', code3: 'SVN', name: 'Slovenia', flag: '🇸🇮', region: 'Europe', hasCatalog: true },
  { code: 'SK', code3: 'SVK', name: 'Slovakia', flag: '🇸🇰', region: 'Europe', hasCatalog: true },
  { code: 'EE', code3: 'EST', name: 'Estonia', flag: '🇪🇪', region: 'Europe', hasCatalog: true },
  { code: 'LV', code3: 'LVA', name: 'Latvia', flag: '🇱🇻', region: 'Europe', hasCatalog: true },
  { code: 'LT', code3: 'LTU', name: 'Lithuania', flag: '🇱🇹', region: 'Europe', hasCatalog: true },
  { code: 'IS', code3: 'ISL', name: 'Iceland', flag: '🇮🇸', region: 'Europe', hasCatalog: true },
  { code: 'LU', code3: 'LUX', name: 'Luxembourg', flag: '🇱🇺', region: 'Europe', hasCatalog: true },
  { code: 'CY', code3: 'CYP', name: 'Cyprus', flag: '🇨🇾', region: 'Europe', hasCatalog: true },
  { code: 'MT', code3: 'MLT', name: 'Malta', flag: '🇲🇹', region: 'Europe', hasCatalog: true },
  { code: 'QA', code3: 'QAT', name: 'Qatar', flag: '🇶🇦', region: 'Middle East', hasCatalog: true },
  { code: 'KW', code3: 'KWT', name: 'Kuwait', flag: '🇰🇼', region: 'Middle East', hasCatalog: true },
  { code: 'OM', code3: 'OMN', name: 'Oman', flag: '🇴🇲', region: 'Middle East', hasCatalog: true },
  { code: 'BH', code3: 'BHR', name: 'Bahrain', flag: '🇧🇭', region: 'Middle East', hasCatalog: true },
  { code: 'JO', code3: 'JOR', name: 'Jordan', flag: '🇯🇴', region: 'Middle East', hasCatalog: true },
  { code: 'LB', code3: 'LBN', name: 'Lebanon', flag: '🇱🇧', region: 'Middle East', hasCatalog: true },
  { code: 'MA', code3: 'MAR', name: 'Morocco', flag: '🇲🇦', region: 'Africa', hasCatalog: true },
  { code: 'TN', code3: 'TUN', name: 'Tunisia', flag: '🇹🇳', region: 'Africa', hasCatalog: true },
  { code: 'DZ', code3: 'DZA', name: 'Algeria', flag: '🇩🇿', region: 'Africa', hasCatalog: true },
  { code: 'PE', code3: 'PER', name: 'Peru', flag: '🇵🇪', region: 'Americas', hasCatalog: true },
  { code: 'UY', code3: 'URY', name: 'Uruguay', flag: '🇺🇾', region: 'Americas', hasCatalog: true },
  { code: 'EC', code3: 'ECU', name: 'Ecuador', flag: '🇪🇨', region: 'Americas', hasCatalog: true },
  { code: 'CR', code3: 'CRI', name: 'Costa Rica', flag: '🇨🇷', region: 'Americas', hasCatalog: true },
  { code: 'PA', code3: 'PAN', name: 'Panama', flag: '🇵🇦', region: 'Americas', hasCatalog: true }
];

export const FIELDS_OF_STUDY: FieldCategory[] = [
  {
    id: 'cs',
    name: 'Computer Science',
    icon: '💻',
    subfields: ['Algorithms & Complexity', 'Computer Systems', 'Cybersecurity', 'Cloud Computing', 'Computer Networks', 'Programming Languages']
  },
  {
    id: 'ai',
    name: 'Artificial Intelligence',
    icon: '🤖',
    subfields: ['Machine Learning', 'Deep Learning', 'Computer Vision', 'Natural Language Processing', 'Robotics & Autonomous Systems', 'Generative AI']
  },
  {
    id: 'ds',
    name: 'Data Science',
    icon: '📊',
    subfields: ['Big Data Analytics', 'Applied Statistics', 'Data Engineering', 'Business Analytics', 'Predictive Modeling', 'Information Retrieval']
  },
  {
    id: 'se',
    name: 'Software Engineering',
    icon: '⚙️',
    subfields: ['Software Architecture', 'DevOps & SRE', 'Distributed Systems', 'Mobile App Development', 'Web Engineering', 'Human-Computer Interaction']
  },
  {
    id: 'it',
    name: 'Information Technology',
    icon: '🌐',
    subfields: ['Network Administration', 'IT Management', 'Database Systems', 'Enterprise Information Systems', 'Information Security']
  },
  {
    id: 'eng',
    name: 'Engineering',
    icon: '🛠️',
    subfields: ['Mechanical Engineering', 'Electrical Engineering', 'Civil Engineering', 'Chemical Engineering', 'Aerospace Engineering', 'Biomedical Engineering']
  },
  {
    id: 'mba',
    name: 'Business Administration',
    icon: '📈',
    subfields: ['Executive MBA', 'Strategic Leadership', 'International Business', 'Operations Management', 'Supply Chain Management', 'Consulting']
  },
  {
    id: 'mgmt',
    name: 'Business and Management',
    icon: '🏢',
    subfields: ['Marketing', 'Human Resource Management', 'Entrepreneurship', 'Organizational Behavior', 'Innovation & Technology Management']
  },
  {
    id: 'acc',
    name: 'Accountancy and Accounting',
    icon: '🧾',
    subfields: ['Financial Accounting', 'Managerial Accounting', 'Auditing & Assurance', 'Taxation', 'Forensic Accounting']
  },
  {
    id: 'fin',
    name: 'Finance',
    icon: '💳',
    subfields: ['Quantitative Finance', 'Corporate Finance', 'Investment Banking', 'Financial Risk Management', 'Fintech', 'Asset Management']
  },
  {
    id: 'econ',
    name: 'Economics',
    icon: '📉',
    subfields: ['Econometrics', 'Macroeconomics', 'Microeconomics', 'Development Economics', 'Behavioral Economics', 'International Trade']
  },
  {
    id: 'med',
    name: 'Medicine and Health Sciences',
    icon: '🩺',
    subfields: ['Public Health', 'Biomedical Science', 'Health Informatics', 'Epidemiology', 'Nursing', 'Clinical Research', 'Pharmacology']
  },
  {
    id: 'law',
    name: 'Law',
    icon: '⚖️',
    subfields: ['International Law', 'Corporate & Commercial Law', 'Intellectual Property Law', 'Human Rights Law', 'Cyber Law', 'LL.M. Studies']
  },
  {
    id: 'arts',
    name: 'Arts and Humanities',
    icon: '🎨',
    subfields: ['History', 'Philosophy', 'Literature', 'Linguistics', 'Art History', 'Cultural Studies']
  },
  {
    id: 'des',
    name: 'Design',
    icon: '✨',
    subfields: ['UI/UX Design', 'Industrial Design', 'Architecture', 'Graphic Design', 'Game Design', 'Interactive Media']
  },
  {
    id: 'soc',
    name: 'Social Sciences',
    icon: '🌍',
    subfields: ['Political Science', 'Sociology', 'Psychology', 'International Relations', 'Anthropology', 'Public Policy']
  },
  {
    id: 'edu',
    name: 'Education',
    icon: '📚',
    subfields: ['Higher Education Administration', 'Curriculum & Instruction', 'Educational Technology', 'Special Education', 'Language Teaching']
  },
  {
    id: 'sci',
    name: 'Natural Sciences',
    icon: '🔬',
    subfields: ['Physics', 'Chemistry', 'Biological Sciences', 'Mathematics', 'Earth & Environmental Sciences', 'Astrophysics']
  }
];

export const NORMALIZED_STUDY_LEVELS = [
  "Bachelor's / Undergraduate",
  "Master's / Graduate",
  "PhD / Doctoral",
  "MBA",
  "Other / Diploma"
] as const;

export function normalizeLevel(levelRaw: string): string {
  const l = (levelRaw || '').toLowerCase();
  if (l.includes('phd') || l.includes('doc') || l.includes('dr.')) return 'PhD';
  if (l.includes('mba')) return 'MBA';
  if (l.includes('master') || l.includes('ms') || l.includes('msc') || l.includes('meng') || l.includes('ma')) return 'Master';
  if (l.includes('bachelor') || l.includes('bs') || l.includes('bsc') || l.includes('ba') || l.includes('undergrad')) return 'Bachelor';
  return 'Other';
}
