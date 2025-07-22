# 📝 Cursor AI Instructions — Home Finance Management App

## 📄 Purpose
This file contains all the **context and guidance** you need to help me build this project step-by-step.  
You are my senior developer and pair-programmer.  
Always think strategically and propose the best-practice approach to each task.

---

# 🎯 Project Overview
We are building a **Home Finance Management Web App** designed to help individuals & families gain control over their finances.  

The app combines:
- Inbox-style approval workflow
- Automation through rules engine
- Flexible labeling & filtering
- Insights through dashboards & reports

---

# 👤 Target Users
- Individuals and families
- People who prefer to review and approve their data manually, with optional automation
- Users who value structure, clarity, and insights into their financial behavior

---

# 🛠 Tech Stack
- **Frontend**: Next.js + TypeScript + TailwindCSS
- **Backend/DB**: Supabase (PostgreSQL, Auth, REST)
- **Auth**: Supabase (email/password)
- **APIs**: Supabase REST endpoints + optional custom Next.js API routes
- **Optional Testing**: Jest, Cypress

## 🧩 Component Development with ShadCN/UI MCP

This project uses **shadcn/ui** components with dedicated MCP tools for component exploration and implementation:

### **Available MCP Tools:**
- `mcp_shadcn-ui_list_components` - List all available shadcn/ui v4 components
- `mcp_shadcn-ui_get_component` - Get source code for specific components
- `mcp_shadcn-ui_get_component_demo` - Get demo/usage examples for components
- `mcp_shadcn-ui_get_component_metadata` - Get component metadata and dependencies

### **Development Workflow:**
1. **Explore Available Components**: Use `list_components` to see what's available
2. **Get Component Source**: Use `get_component` to retrieve the latest component code
3. **See Usage Examples**: Use `get_component_demo` to understand proper implementation
4. **Install & Integrate**: Create component files in `components/ui/` and integrate

### **Best Practices:**
- Always use the MCP tools to get the latest v4 components
- Follow shadcn/ui patterns for consistency
- Use TypeScript and proper prop interfaces
- Implement components with RTL/Hebrew support when needed

---

# 📋 Core Features
✅ Transaction Inbox (Inbox-first, approval workflow)  
✅ Labels (flat, multi-label, filtering & reporting)  
✅ Rules Engine (automatic labeling based on conditions)  
✅ Dashboard (income, expenses, trends, forecasts)  
✅ Investments & Assets (track values & returns)

---

# 🗄 Database Schema
We use **Supabase (PostgreSQL)** with the following tables:  

### `transactions`
| Column           | Type                | Notes |
|------------------|---------------------|-------|
| id               | uuid (PK)          | auto |
| user_id          | uuid (FK → auth.users) | |
| amount           | numeric            | positive or negative |
| description      | text               | |
| identifier       | text               | external ID |
| date             | timestamp          | |
| source           | text               | |
| status           | enum (`pending`, `approved`) | |
| notes            | text (nullable)   | |
| created_at       | timestamp          | default now() |

### `labels`
| Column     | Type    | Notes |
|------------|---------|-------|
| id         | uuid (PK) | |
| user_id    | uuid (FK) | |
| name       | text (unique per user) | |
| recurring  | boolean  | |
| created_at | timestamp | |

### `transaction_labels`
| Column           | Type            | Notes |
|------------------|-----------------|-------|
| transaction_id   | uuid (FK → transactions.id) | |
| label_id         | uuid (FK → labels.id) | |

### `rules`
| Column           | Type            | Notes |
|------------------|-----------------|-------|
| id               | uuid (PK)       | |
| user_id          | uuid (FK)       | |
| name             | text            | |
| conditions       | jsonb           | array of conditions |
| labels_to_apply  | uuid[] (FK → labels.id) | |
| order_index      | integer         | |
| created_at       | timestamp       | |

---

# 👨‍💻 Working Agreements
✅ Always use Next.js idioms + TypeScript best practices  
✅ Use Supabase client library (`@supabase/supabase-js`) in frontend  
✅ Provide clear folder structure & filenames with each response  
✅ Assume `.env` is configured with Supabase keys  
✅ Use TailwindCSS for styling, keep components reusable & accessible  
✅ Suggest indexes, constraints & RLS for database tables  
✅ If something is unclear — ask me before proceeding  
✅ Propose tests when implementing non-trivial logic  

---

# 🚀 Next Tasks (recommended sequence)
1️⃣ Write SQL schema & migrations for Supabase (`transactions`, `labels`, `transaction_labels`, `rules`), with indexes & constraints  
2️⃣ Scaffold Next.js project structure (`/pages`, `/components`, `/lib`, `/styles`, `/public`, etc.)  
3️⃣ Implement Supabase Auth with protected routes  
4️⃣ Build API hooks & helper functions for transactions, labels, rules  
5️⃣ Create Inbox UI (table/list of transactions with actions)  
6️⃣ Create Rules Manager UI (create/edit rules)  
7️⃣ Build Dashboard UI (charts & insights)

---
---

# 🔗 Best Practices
✅ Keep tasks small and testable  
✅ Test DB schema in Supabase Dashboard  
✅ Use `.env` to store sensitive credentials  
✅ Commit migrations & schema changes to version control  
✅ Enable and test RLS in Supabase  
✅ Build mobile-friendly, responsive UI

---

# 📄 When in doubt
If you are unsure how to proceed, ask me specific clarifying questions and propose at least two options for how to solve the problem.

---

# 📂 Notes
This file should be loaded at the start of each Cursor session, or kept in the project root as `INSTRUCTIONS.md`.

---

> 📌 Reminder: You are a senior engineer tasked with helping me ship this app efficiently and cleanly, while explaining the reasoning behind each decision. Think like it’s your product too.