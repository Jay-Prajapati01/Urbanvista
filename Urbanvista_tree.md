# File Tree: UrbanVista

**Generated:** 4/10/2026, 1:18:19 AM
**Root Path:** `c:\Users\jay19\Desktop\6th Sem Sgp\URBANVISTA\UrbanVista`

```
├── 📁 .github
│   └── 📁 agents
│       └── 📝 workflow-guardian.agent.md
├── 📁 Backend
│   ├── 📁 database
│   │   ├── 📄 fix_user_auth_tables.sql
│   │   ├── 📄 phase1_rbac.sql
│   │   ├── 📄 phase2_activity_tracking.sql
│   │   └── 📄 schema.sql
│   ├── 📁 scripts
│   │   ├── 📄 httpSession.js
│   │   ├── 📄 smoke-admin-secretary-flow.js
│   │   └── 📄 verify-rbac-migration.js
│   ├── 📁 src
│   │   ├── 📁 config
│   │   │   └── 📄 supabase.js
│   │   ├── 📁 middleware
│   │   │   ├── 📄 auth.js
│   │   │   ├── 📄 csrf.js
│   │   │   ├── 📄 staffAuth.js
│   │   │   └── 📄 userAuth.js
│   │   ├── 📁 routes
│   │   │   ├── 📄 activity.js
│   │   │   ├── 📄 auth.js
│   │   │   ├── 📄 dashboard.js
│   │   │   ├── 📄 expenditures.js
│   │   │   ├── 📄 houses.js
│   │   │   ├── 📄 maintenance.js
│   │   │   ├── 📄 members.js
│   │   │   ├── 📄 reports.js
│   │   │   ├── 📄 secretaries.js
│   │   │   ├── 📄 secretaryResidents.js
│   │   │   ├── 📄 settlements.js
│   │   │   ├── 📄 userAuth.js
│   │   │   ├── 📄 userDashboard.js
│   │   │   ├── 📄 userPayments.js
│   │   │   └── 📄 vehicles.js
│   │   └── 📁 utils
│   │       ├── 📄 accessScope.js
│   │       ├── 📄 activityLogger.js
│   │       ├── 📄 audit.js
│   │       ├── 📄 authCookies.js
│   │       ├── 📄 permissions.js
│   │       └── 📄 transform.js
│   ├── 📁 tests
│   │   └── 📄 api-scope-security.integration.test.js
│   ├── ⚙️ .gitignore
│   ├── ⚙️ package-lock.json
│   ├── ⚙️ package.json
│   └── 📄 server.js
├── 📁 Frontend
│   ├── 📁 public
│   │   ├── 🖼️ favicon.svg
│   │   └── 📄 robots.txt
│   ├── 📁 src
│   │   ├── 📁 components
│   │   │   ├── 📁 admin
│   │   │   │   └── 📄 AdminLayout.tsx
│   │   │   ├── 📁 landing
│   │   │   │   ├── 📄 CTA.tsx
│   │   │   │   ├── 📄 Features.tsx
│   │   │   │   ├── 📄 Footer.tsx
│   │   │   │   ├── 📄 Header.tsx
│   │   │   │   └── 📄 Hero.tsx
│   │   │   ├── 📁 ui
│   │   │   │   ├── 📄 accordion.tsx
│   │   │   │   ├── 📄 alert-dialog.tsx
│   │   │   │   ├── 📄 alert.tsx
│   │   │   │   ├── 📄 aspect-ratio.tsx
│   │   │   │   ├── 📄 avatar.tsx
│   │   │   │   ├── 📄 badge.tsx
│   │   │   │   ├── 📄 breadcrumb.tsx
│   │   │   │   ├── 📄 button.tsx
│   │   │   │   ├── 📄 calendar.tsx
│   │   │   │   ├── 📄 card.tsx
│   │   │   │   ├── 📄 carousel.tsx
│   │   │   │   ├── 📄 chart.tsx
│   │   │   │   ├── 📄 checkbox.tsx
│   │   │   │   ├── 📄 collapsible.tsx
│   │   │   │   ├── 📄 command.tsx
│   │   │   │   ├── 📄 context-menu.tsx
│   │   │   │   ├── 📄 dialog.tsx
│   │   │   │   ├── 📄 drawer.tsx
│   │   │   │   ├── 📄 dropdown-menu.tsx
│   │   │   │   ├── 📄 form.tsx
│   │   │   │   ├── 📄 hover-card.tsx
│   │   │   │   ├── 📄 input-otp.tsx
│   │   │   │   ├── 📄 input.tsx
│   │   │   │   ├── 📄 label.tsx
│   │   │   │   ├── 📄 menubar.tsx
│   │   │   │   ├── 📄 navigation-menu.tsx
│   │   │   │   ├── 📄 pagination.tsx
│   │   │   │   ├── 📄 popover.tsx
│   │   │   │   ├── 📄 progress.tsx
│   │   │   │   ├── 📄 radio-group.tsx
│   │   │   │   ├── 📄 resizable.tsx
│   │   │   │   ├── 📄 scroll-area.tsx
│   │   │   │   ├── 📄 select.tsx
│   │   │   │   ├── 📄 separator.tsx
│   │   │   │   ├── 📄 sheet.tsx
│   │   │   │   ├── 📄 sidebar.tsx
│   │   │   │   ├── 📄 skeleton.tsx
│   │   │   │   ├── 📄 slider.tsx
│   │   │   │   ├── 📄 sonner.tsx
│   │   │   │   ├── 📄 switch.tsx
│   │   │   │   ├── 📄 table.tsx
│   │   │   │   ├── 📄 tabs.tsx
│   │   │   │   ├── 📄 textarea.tsx
│   │   │   │   ├── 📄 toast.tsx
│   │   │   │   ├── 📄 toaster.tsx
│   │   │   │   ├── 📄 toggle-group.tsx
│   │   │   │   ├── 📄 toggle.tsx
│   │   │   │   ├── 📄 tooltip.tsx
│   │   │   │   └── 📄 use-toast.ts
│   │   │   ├── 📁 user
│   │   │   │   └── 📄 UserLayout.tsx
│   │   │   └── 📄 NavLink.tsx
│   │   ├── 📁 hooks
│   │   │   ├── 📄 use-mobile.tsx
│   │   │   └── 📄 use-toast.ts
│   │   ├── 📁 lib
│   │   │   ├── 📄 activityApi.ts
│   │   │   ├── 📄 api.ts
│   │   │   ├── 📄 auth.tsx
│   │   │   ├── 📄 csv.ts
│   │   │   ├── 📄 data.ts
│   │   │   ├── 📄 razorpay.ts
│   │   │   ├── 📄 receipt.ts
│   │   │   ├── 📄 secretaryApi.ts
│   │   │   ├── 📄 theme.tsx
│   │   │   ├── 📄 userApi.ts
│   │   │   ├── 📄 userAuth.tsx
│   │   │   └── 📄 utils.ts
│   │   ├── 📁 pages
│   │   │   ├── 📁 admin
│   │   │   │   ├── 📄 ActivityLogs.tsx
│   │   │   │   ├── 📄 Dashboard.tsx
│   │   │   │   ├── 📄 Expenditures.tsx
│   │   │   │   ├── 📄 Houses.tsx
│   │   │   │   ├── 📄 LoginHistory.tsx
│   │   │   │   ├── 📄 Maintenance.tsx
│   │   │   │   ├── 📄 Members.tsx
│   │   │   │   ├── 📄 Notifications.tsx
│   │   │   │   ├── 📄 Reports.tsx
│   │   │   │   ├── 📄 Secretaries.tsx
│   │   │   │   ├── 📄 Settings.tsx
│   │   │   │   └── 📄 Vehicles.tsx
│   │   │   ├── 📁 secretary
│   │   │   │   ├── 📄 SecretaryDashboard.tsx
│   │   │   │   ├── 📄 SecretaryExpenditures.tsx
│   │   │   │   ├── 📄 SecretaryHouses.tsx
│   │   │   │   ├── 📄 SecretaryMaintenance.tsx
│   │   │   │   ├── 📄 SecretaryMembers.tsx
│   │   │   │   ├── 📄 SecretaryReports.tsx
│   │   │   │   ├── 📄 SecretaryResidents.tsx
│   │   │   │   ├── 📄 SecretarySettings.tsx
│   │   │   │   └── 📄 SecretaryVehicles.tsx
│   │   │   ├── 📁 user
│   │   │   │   ├── 📄 UserDashboard.tsx
│   │   │   │   ├── 📄 UserPayments.tsx
│   │   │   │   └── 📄 UserReceipts.tsx
│   │   │   ├── 📄 AdminLogin.tsx
│   │   │   ├── 📄 Index.tsx
│   │   │   ├── 📄 NotFound.tsx
│   │   │   ├── 📄 UserLogin.tsx
│   │   │   └── 📄 UserSignup.tsx
│   │   ├── 🎨 App.css
│   │   ├── 📄 App.tsx
│   │   ├── 🎨 index.css
│   │   ├── 📄 main.tsx
│   │   └── 📄 vite-env.d.ts
│   ├── ⚙️ .gitignore
│   ├── 📝 File_tree_frontend.md
│   ├── 📝 README.md
│   ├── 📄 bun.lockb
│   ├── ⚙️ components.json
│   ├── 📄 eslint.config.js
│   ├── 🌐 index.html
│   ├── ⚙️ package-lock.json
│   ├── ⚙️ package.json
│   ├── 📄 postcss.config.js
│   ├── 📄 tailwind.config.ts
│   ├── ⚙️ tsconfig.app.json
│   ├── ⚙️ tsconfig.json
│   ├── ⚙️ tsconfig.node.json
│   └── 📄 vite.config.ts
├── 📄 # UrbanVista Transformation Roadmap.litcoffee
├── ⚙️ .gitattributes
├── 📝 PHASE_1_IMPLEMENTATION_PLAN.md
├── 📝 PHASE_PROMPTS_README.md
├── 📝 README.md
├── 📘 UrbanVista_Image_Based_Annotated_Report.doc
├── ⚙️ package-lock.json
└── ⚙️ package.json
```

---
*Generated by FileTree Pro Extension*