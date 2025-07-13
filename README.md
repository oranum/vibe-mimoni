# Vibe Mimoni 💰

A modern personal finance application built with Next.js, TypeScript, and Supabase. Vibe Mimoni helps you track, categorize, and manage your financial transactions with an intuitive interface and powerful automation features.

## 🚀 Features

### ✅ Completed Features
- **Authentication System**: Secure user registration and login with Supabase Auth
- **Dashboard**: Overview of financial status with quick actions and navigation
- **Transaction Inbox**: 
  - View and manage pending transactions
  - Approve/reject transactions with optimistic UI updates
  - Edit transaction details (amount, description, date, source, etc.)
  - Label management with color-coded categorization
  - Add notes to transactions for better tracking
  - Split transactions into multiple parts with individual labels
  - Advanced filtering system (date range, amount range, status, labels)
  - Pagination with traditional and infinite scroll modes
  - Save and load favorite filter combinations
  - Real-time updates via Supabase subscriptions

### 🔄 In Development
- Labels Management System
- Automated Rules Engine
- Financial Reports and Analytics
- Mobile Responsive Design Enhancements

## 🛠 Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Backend**: Supabase (PostgreSQL, Authentication, Real-time)
- **Database**: PostgreSQL with Row Level Security (RLS)
- **State Management**: React Context API
- **Forms**: React Hook Form with validation
- **Notifications**: Sonner (toast notifications)
- **Development**: ESLint, Prettier, Husky (Git hooks)

## 📁 Project Structure

```
vibe-mimoni/
├── app/                          # Next.js App Router
│   ├── auth/                     # Authentication pages
│   ├── dashboard/                # Main dashboard
│   ├── inbox/                    # Transaction inbox
│   └── transactions/             # Transaction management
├── components/                   # Reusable UI components
│   ├── auth/                     # Authentication components
│   ├── transactions/             # Transaction-specific components
│   └── ui/                       # shadcn/ui base components
├── context/                      # React Context providers
│   ├── auth.tsx                  # Authentication context
│   └── filters.tsx               # Filter state management
├── lib/                          # Utility libraries
├── types/                        # TypeScript type definitions
├── utils/                        # Helper utilities
│   └── supabase/                 # Supabase client configurations
└── .taskmaster/                  # Project management
    ├── docs/                     # Development documentation
    └── tasks/                    # Task definitions and progress
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Git (for version control)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd vibe-mimoni
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   
   Create a `.env.local` file in the root directory:
   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   
   # App Configuration
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Database Setup**
   
   Run the database migrations (located in `lib/database/migrate.ts`):
   ```bash
   npm run db:migrate
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) (or the port shown in terminal) to view the application.

### Development Workflow

This project follows a chapter-based development approach with mandatory Git commits after testing. See [Development Workflow](.taskmaster/docs/development-workflow.md) for detailed guidelines.

## 📊 Database Schema

### Core Tables

- **`users`**: User profiles and authentication data
- **`transactions`**: Financial transaction records
- **`labels`**: Categorization labels with colors
- **`transaction_labels`**: Many-to-many relationship for transaction labeling
- **`rules`**: Automation rules for transaction processing (planned)

### Key Features

- **Row Level Security (RLS)**: All data is user-scoped for security
- **Real-time subscriptions**: Live updates for transaction changes
- **JSONB fields**: Flexible metadata storage
- **Indexes**: Optimized for common query patterns

## 🔐 Security

- **Authentication**: Supabase Auth with email/password
- **Authorization**: Row Level Security policies ensure users only access their data
- **Data Validation**: Client and server-side validation
- **Environment Variables**: Sensitive configuration stored securely

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 📦 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy with automatic CI/CD

### Manual Deployment

```bash
# Build the application
npm run build

# Start production server
npm start
```

## 🤝 Contributing

1. Follow the [Development Workflow](.taskmaster/docs/development-workflow.md)
2. Create feature branches for new development
3. Test thoroughly before committing
4. Write meaningful commit messages
5. Update documentation as needed

### Commit Message Format

```
<type>(<scope>): <description>

<detailed description>

Closes task <task-id>
```

Example:
```
feat(inbox): Add transaction splitting functionality

- Implemented SplitTransactionForm with dynamic form fields
- Added validation to ensure split amounts match original
- Created database operations for split transaction management
- Updated UI to display split transactions properly

Closes task 4.4
```

## 📚 Documentation

- [Development Workflow](.taskmaster/docs/development-workflow.md) - Team development process
- [API Documentation](docs/api.md) - Supabase database schema and operations
- [Component Guide](docs/components.md) - UI component documentation
- [Deployment Guide](docs/deployment.md) - Production deployment instructions

## 🐛 Troubleshooting

### Common Issues

1. **Port 3000 in use**: The app will automatically use port 3002 if 3000 is busy
2. **Supabase connection errors**: Verify environment variables are set correctly
3. **Build errors**: Clear `.next` folder and rebuild: `rm -rf .next && npm run build`

### Getting Help

- Check the [Issues](https://github.com/your-repo/vibe-mimoni/issues) for known problems
- Review the development workflow documentation
- Contact the development team

## 📈 Roadmap

- [ ] Mobile app (React Native)
- [ ] Bank integration (Plaid/Open Banking)
- [ ] Advanced analytics and reporting
- [ ] Budget planning tools
- [ ] Multi-currency support
- [ ] Export functionality (CSV, PDF)

## 📄 License

This project is proprietary. All rights reserved.

---

**Built with ❤️ using modern web technologies**
