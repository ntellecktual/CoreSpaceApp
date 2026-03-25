# Halo Internal (React Native)

Configuration-driven CRM prototype aligned to storyboard and architecture goals.

## Brand

- Name: Halo Internal
- Slogan: The legal operations platform that runs your firm.
- Positioning: Halo Internal helps law firms and legal teams build the operational core of their practice inside a no-code CRM shell. Non-technical admins create workflows around real case management needs while the platform captures structured, high-quality data by default. The result is faster case resolution, clearer decisions, and measurable growth.
- Product palette: `#263374`, `#FFFFFF`, `#FFD332`

## Features

- Admin configuration shell
  - Top-tabbed admin control center with explicit surfaces:
    - Workspace Creator
    - No-Code Shell Designer
    - Role Policy Builder
    - Enterprise Admin Governance (last tab)
  - Workspace Creator with editable Workspace metadata
  - Workspace identity is static after creation (name/root entity/route are immutable)
  - Dedicated `Create New Workspace` action starts a fresh workspace draft without editing existing workspaces
  - Workspace-level core fields can be added and maintained by admins over time
  - Workspace Creator sub-tabs:
    - Configure/Manage Workspace
    - Configure/Manage SubSpaces
  - SubSpace management with guardrail (max 7 SubSpaces)
  - SubSpace connective-tissue field builder
    - Drag-style field palette interaction (click-to-assign field types to selected SubSpace)
    - Field assignments persist on each SubSpace with generated tags for workspace/subspace/field-type traceability
  - Dynamic SubSpace visibility and display-type toggles
  - Enterprise governance panel (coverage, mapping health, published automation visibility)
  - No-Code Shell Designer for business-agnostic terminology (subject/workspace/subspace labels)
  - Intake Schema Builder for admin-defined profile fields (text/number/date/select)
  - End User Persona Builder with workspace scope and default tag policy
  - Lifecycle State Designer for admin-defined status language and default stage selection
  - Lifecycle Transition Rule Builder (from-stage → to-stage) with persona scope (all personas or selected personas)
- RBAC simulation
  - Runtime role switcher powered by admin-defined role catalog
  - Action-level permission enforcement in hooks and UI
  - Disabled controls + denied-action messaging for unauthorized operations
  - Role Policy Builder for role/permission/workspace mapping
- End-user runtime shell
  - Subject intake table generated from admin labels and intake schema
  - Persona-aware intake with profile fields captured from admin-defined no-code metadata
  - Mobile-friendly intake inputs with email/phone keyboard optimization and autocomplete hints
  - Client detail panel with profile, tags, workspace coverage summary, and recent activity timeline
  - Dynamic workspace selector filtered by persona workspace scope
  - Lifecycle status selection and validation fully driven by admin-defined stages
  - Transition guardrails enforce only admin-defined stage progression paths for the active subject persona
  - Counted SubSpace tabs with Always vs If Records visibility
  - Clear empty-state guidance when no visible SubSpaces are available in a selected case context
  - Governed drawer-style form entry driven by form metadata and mapped to client/workspace/subspace tags
- Signal Studio shell
  - Plain-language flow definition
  - Rules, action, tag targeting, and run-on-existing toggle
  - Empty-state monitor guidance when no published flows exist yet
  - Published flow list
- UX and accessibility hardening
  - Left-sidebar `Settings` dropdown (above Sign Out) now groups runtime toggles in one place
    - Guide Mode toggle moved into Settings
    - Day/Night view toggle added in Settings
  - App-wide style system now responds to Day/Night mode so screens and controls update together on toggle
  - Accessible top navigation semantics for page tabs, role picker, and guided mode switch
  - Guided Mode now defaults to Off (opt-in only; never auto-enabled)
  - Turning Guided Mode On auto-switches to Workspace Creator so first-time admins land directly in Step 1
  - Legacy "Admin Builder Process" Step 1–4 strip has been removed from Admin to reduce duplication and keep focus on the robust walkthrough card
  - Robust Admin walkthrough in Guided Mode with:
    - Step-by-step path for creating business-ready workspace functionality
    - Explicit pointers to the exact tab/pane and action sequence for each step
    - Step navigation (go to step area, previous/next) and completion tracking
    - Plain-language guidance and easy examples across Workspace Creator, Shell Designer, Role Policy Builder, and Governance so first-time admins can follow without technical background
  - Final UI micro-pass: shortened long admin button labels for clearer, more consistent readability
  - Governance findings now include `Go Fix` buttons on warning items to jump directly to the related Admin setup area
    - `Go Fix` now targets the first affected SubSpace for form-coverage and relationship warnings
    - Warning cards include inline fix notes that explain exactly what to correct (especially orphan form mappings)
    - Inline notes now explicitly explain that form-link editing is not yet exposed in the current Admin tab UI
  - Temporary `Form Links (Read-only)` governance panel lists exactly which SubSpaces are missing forms in the selected workspace
  - SubSpace connective field assignments are now editable for Required/Optional after adding from the field palette
  - Workspace builder drag/drop reliability update: if web drag events are inconsistent (for example in embedded previews), admins can still stage a field and add it from the drop zone action
  - Workspace Creator revamp for cleaner flow:
    - Collapsible builder panel with persistent live preview pane
    - Explicit mini step rail in builder (`Workspace → SubSpaces → Fields → Review`) with active state and click navigation
    - Step rail status lights: green for completed steps, glowing highlight for current step, and gray pending bullets for upcoming steps
    - Grouped field palette (Core, Choice, Contact, Files)
    - Custom field naming before adding a field type
    - Editable existing SubSpace details (name, source entity, relationship) directly in preview
    - Workspace core details become read-only once created; schema evolution happens through workspace/subspace fields
    - Live preview now mirrors an actual end-user dashboard view, centered on the core entity and branching operational subspaces
    - Auto-save behavior for workspace and SubSpace edits
  - Header now includes clickable `Save Draft` next to `Publish` with visible draft-save feedback
  - Day mode visual polish pass applied for stronger contrast (text, borders, cards, inputs, buttons, and notices) for better readability on varied monitors
  - Day mode interaction-state second pass applied for clearer button/chip states (active/selected/disabled) to improve visual feedback consistency
  - Added lightweight pressed-state micro-interaction on web (scale + opacity) across interactive pressables for clearer click response
  - Keyboard-safe scroll interaction on long admin/end-user/signal forms (`keyboardShouldPersistTaps="handled"`)
  - Guide hints and modal controls improved with explicit accessibility labels and hints
  - Unified enterprise shell for Admin, Architecture, End User, and Signal Studio pages
    - Persistent left sidebar navigation (module switching, role controls, guided mode, sign-out)
    - Structured right workspace canvas with page header and action controls
    - Halo Internal brand-aligned navy interface styling across all operational pages
    - Core shell messaging now consistently reinforces the top-to-bottom operating model: core operation first, then workspace/subspace branching
  - Full-app visual harmonization using the Halo Internal palette so landing, auth, and operational pages share one consistent design language
  - Final design-system polish pass for typography and spacing consistency
    - Normalized heading/body text scale across shell, cards, forms, auth, and landing sections
    - Standardized card/panel/input padding rhythm for cleaner visual hierarchy
    - Unified button and control heights for consistent interaction density
  - Responsive typography clamps added for very small and very large web viewports (landing hero/section text + dashboard headers)
  - Responsive spacing clamps added for fluid paddings/gaps across landing sections, showcase panels, and CTA groups
  - Compact-shell adaptations for narrower viewports (stacked shell layout, wrapped header actions, and safer sidebar scaling)
  - Small-screen safeguards for landing panels and grids (column stacking + width-safe containers)
- Authentication and account management
  - Marketing page is the explicit default landing page for unauthenticated sessions
  - Professional pre-login platform overview page before authentication
  - Top banner menu on opening page with Home, About, and Login actions
  - Home/About actions smooth-scroll to their corresponding landing sections
  - Home/About content switching for a business-focused landing narrative
  - Expanded modern marketing sections (platform value, outcomes, governance, and automation readiness)
  - Detailed landing narrative covering core app function and why businesses need Halo Internal now
  - Wireframe-inspired modern hero layout: centered headline, dual CTA row, trust/logo row, and sticky pill nav
  - Light visual system and structured showcase panel for a polished product-marketing first impression
  - Sticky top banner menu on the marketing page so Home/About/Login remains visible while scrolling
  - Full login gate for web and mobile before entering app surfaces
  - Email sign-in and account creation (full name, email, password)
  - Account type toggle during signup to create admin-capable accounts
  - Social-style sign-in buttons for Google and Microsoft experiences
  - Session persistence with sign-out support
- Runtime resiliency
  - App-level error boundary prevents silent blank screens and surfaces runtime exceptions directly in UI
- Blank-slate startup model
  - No seeded workspaces, subspaces, forms, records, flows, or clients
  - First workspace is created directly from the Admin workspace form
- Architecture page with logical system diagram
- Local persistence using AsyncStorage

## Prerequisites

- Node.js 20 LTS recommended (Node 18+ supported)
- npm 10+
- Expo CLI is used via npx (no global install required)
- For Android run: Android Studio emulator or Expo Go on device

## Quick start

1. Open terminal in this folder:

  c:/Users/Kieth/Documents/Repositories/TheDream/CoreSpaceApp

1. Install dependencies:

```bash
npm install
```

1. Start Expo dev server:

```bash
npm start
```

1. Choose a target:
   - Press w for web
   - Press a for Android
   - Scan QR with Expo Go for device

## Direct run commands

Use these if you want one-step launch:

```bash
# Web
npm run web

# Android
npm run android

# iOS (requires macOS)
npm run ios
```

## First-run validation

Run these checks to confirm everything is healthy:

```bash
npx tsc --noEmit
npx expo-doctor
```

## Troubleshooting startup

- If Metro cache seems stale:

```bash
npx expo start -c
```

- If dependencies changed and app fails to resolve modules:

```bash
rm -rf node_modules package-lock.json
npm install
```

- If `npm audit` flags `minimatch` while staying on Expo 54, keep `package.json` `overrides.minimatch` pinned to a patched release (currently `10.2.4`) and run:

```bash
npm install
npm audit
```

- If Android emulator is not detected, open Android Studio and start an AVD first.

## Project structure

- App.tsx: app entry point
- src/types.ts: domain schema (Workspace, SubSpace, Forms, Flows, Tags)
- src/data/defaultData.ts: blank-slate tenant defaults and base role catalog
- src/context/AppStateContext.tsx: local persistence and mutation actions
- src/screens/MarketingScreen.tsx: professional pre-login overview and entry CTA
- src/screens/AuthScreen.tsx: login, sign-up, and social sign-in shell
- src/screens/HomeScreen.tsx: top-level shell and navigation
- src/screens/home/constants.ts: step definitions and tab metadata
- src/screens/home/hooks: feature hooks for traceable state and actions
  - useAdminShellDesigner: no-code shell label, intake schema, and persona management
  - useClientIntake: client intake + selection state
  - useEndUserRuntime: subject-scoped workspace/subspace runtime with persona workspace filtering
  - useAdminEnterpriseInsights: admin governance and enterprise readiness metrics

## Enterprise admin-first CRM model

This app follows an admin-first process where runtime UX is generated from admin-managed configuration:

1. Admin defines Workspaces (domain contexts) and SubSpaces (operational categories).
2. Admin binds forms to workspace/subspace pairs and configures visibility rules.
3. Admin configures shell labels, intake schema, and end-user personas in a no-code governance workflow.
4. Admin defines lifecycle stage vocabulary (for example "Draft", "Awaiting Triage", "Approved") and a default stage.
5. Admin defines allowed lifecycle transitions (for example "Draft → In Review" and "In Review → Approved").
6. End users intake subjects and operate only within approved workspace/subspace categories, persona scope, and lifecycle policy.
7. Every runtime record is tagged to preserve traceability across subject, workspace, and subspace context.

### Enterprise indicators currently modeled

- Configuration governance
  - Route coverage for workspaces
  - Relationship definition coverage for related subspaces
  - Form-to-subspace mapping health and orphan-form detection
- Operational governance
  - Published automation flow visibility
  - Dynamic category availability from admin changes without code edits
  - Client-scoped activity timeline and workspace coverage metrics
- Traceability and data discipline
  - Client-linked records (`clientId`)
  - Multi-dimensional tags for filtering, policy, and automation targeting
  - Context-preserving runtime flow from intake to record creation

### RBAC policy shell (implemented)

- No hardcoded position names are required by the system.
- Admins define role names, role descriptions, permission mapping, and workspace scope directly in Role Policy Builder.
- Runtime role switcher reflects whatever role definitions admin configured.
- Permission templates are available for one-click bootstrap:
  - Platform Admin Pack
  - Intake Pack
  - Automation Pack
  - Read Only Pack
- Admins can save any current role permission set as a custom reusable template via “Save as Template.”
- Custom templates are persisted locally and can be applied/deleted from Role Policy Builder.
- Templates now support Clone and New Version actions to evolve policies without overwriting prior definitions.
- Version metadata includes template version number and lineage/parent references for traceability.
- “Diff vs Latest” compares permission-level changes between any template version and the latest lineage version.
- Side-by-side diff mode allows selecting any base and compare versions within a lineage for direct permission drift analysis.
- Diff panel supports one-click “Promote Compare as New Version” to capture reviewed changes as the next governed template version.
- Permission catalog currently supports:
  - `workspace.manage`
  - `subspace.manage`
  - `client.intake`
  - `record.create`
  - `flow.publish`
- Workspace scope supports:
  - `all` workspaces
  - `selected` workspaces mapped by admin

## Notes

This implementation is intentionally self-contained for rapid iteration. Typical enterprise next steps:

- Replace demo auth shell with production identity integrations for Google and Microsoft Entra ID plus backend token exchange
- API and auth integration (Entra ID)
- Database and storage tenant isolation
- Server-side visibility and rules engine
- Immutable audit and event stream
- Configuration versioning and promotion workflow
- Role-based policy enforcement per workspace/subspace action
- SLA, escalation, and lifecycle state policies for client records
