# Theme Migration & Visual System (`docs/theme-migration.md`)

## Overview
This document details the transition of AdmitPath from a dark-mode palette to the high-contrast, editorial light theme inspired by Websentry. The new design emphasizes readability, analytical clarity, and responsive execution.

## Step-by-Step Implementation

### Step 1: Typography & Google Fonts Configuration
- **File**: `index.html`
- **Changes**: Added Google Fonts link for `Newsreader` (optical size 6..72pt, weights 400..700) alongside `Plus Jakarta Sans` and `JetBrains Mono`.
- **Purpose**: Section headers (`Daily`, `How it is working`, university titles) utilize the editorial serif aesthetic, while metrics and body text use clean sans-serif for optimal legibility.
- **Classes**: Body configured with `bg-[#f4f6f8] text-slate-800 antialiased selection:bg-emerald-700 selection:text-white font-sans`.

### Step 2: Global CSS & Design Tokens
- **File**: `src/index.css`
- **Changes**:
  - Defined base theme variables: background `#f4f6f8`, primary text `#1e293b`.
  - Added `.font-serif-editorial` utility mapped to `'Newsreader', 'Georgia', 'Cambria', serif`.
  - Configured subtle light scrollbars with `#cbd5e1` thumb and `#f1f5f9` track.

### Step 3: Sidebar Redesign
- **File**: `src/App.tsx`
- **Changes**:
  - Replaced the dark slate sidebar with a pure white background (`bg-white border-r border-slate-200`).
  - Added brand icon badge in dark slate (`bg-slate-900 text-white rounded-md p-1.5`) with shield iconography.
  - Active navigation pill: styled with an emerald green border (`border border-[#047857]`), subtle mint background (`bg-[#f0fdf4]`), and deep forest green text (`text-[#064e3b] font-medium`).
  - Inactive navigation items: styled with muted slate (`text-slate-600 hover:text-slate-900 hover:bg-slate-50`).
  - Added responsive collapse toggle for desktop and sliding drawer for mobile.

### Step 4: "Daily" Dashboard & Analytical Overview
- **File**: `src/App.tsx`
- **Changes**:
  - Implemented the default `Daily` tab mirroring the analytical dashboard:
    - **Latest Day Strip**: 7 white metric tiles (`178 profiles found`, `137 with a website`, `186 websites checked`, `66 working well` in `#047857`, `68 minor issues` in `#b45309`, `52 glitchy or down` in `#b91c1c`, `73 emails found`).
    - **All Time Strip**: 8 white metric tiles (`848 profiles`, `755 with website`, `402 with email`, `244 good`, `260 minor`, `76 glitchy`, `73 down`, `191 contacted`).
    - **How it is working**: White card featuring channel breakdown table (Show HN, Google Maps, LinkedIn, Directories), conversion percentages, best-rate indicators (`▲`), and side-by-side funnel visualizations (`Leads by method` stacked bars and `From lead to pitch` conversion funnel in `#047857`).

### Step 5: Full Application Component Reskinning
- **File**: `src/App.tsx`
- **Changes**:
  - **University Directory**: Pure white cards with subtle borders (`border-slate-200/80`), dark serif titles, and clean slate action buttons.
  - **Program Catalog**: Clean level tags, bold serif headers, and forest green CTA buttons (`bg-[#047857] hover:bg-[#065f46]`).
  - **Public Contacts**: Clean table with `bg-slate-50/70` header, crisp dark text, and subtle hover states.
  - **Student Profile**: White form containers with clean borders and focused emerald ring indicators.
  - **Admissions Matcher**: Fit cards styled with percentage badges, factor breakdown dots, and match checkmarks.
  - **Compose & Review**: Clean white two-column desk with raw text and formatted preview tabs.
  - **Outbox & Sent**: Clear cards with delivery badges and bounce rate indicator.
  - **Settings & Docs**: High-contrast configuration panels and markdown reader.

## Verification & Testing
- Build validation: `npm run build` completed in `237ms` with zero warnings.
- Lint validation: `tsc --noEmit` passed with zero errors.
- Unit tests: All 25 Python test suites executed and passed in `0.413s`.
