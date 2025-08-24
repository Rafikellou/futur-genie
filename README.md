# Futur Génie - Educational Management Platform

<div align="center">
  <h3>🎓 A comprehensive educational platform for schools, teachers, parents, and students</h3>
  <p>Built with Next.js 15, React 19, Supabase, and TypeScript</p>
  
  ![Next.js](https://img.shields.io/badge/Next.js-15.5.0-black)
  ![React](https://img.shields.io/badge/React-19.1.0-blue)
  ![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
  ![Supabase](https://img.shields.io/badge/Supabase-2.39.0-green)
  ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC)
</div>

## 🌟 Features

### 👨‍💼 For School Directors
- **Complete School Management**: User management, classroom organization, teacher assignments
- **Real-time Analytics**: Comprehensive statistics and engagement metrics
- **Invitation System**: Seamless onboarding for teachers, parents, and students
- **Performance Monitoring**: School-wide performance tracking and reporting

### 👩‍🏫 For Teachers
- **AI-Powered Quiz Creation**: Generate quizzes automatically using OpenAI integration
- **Classroom Management**: Organize students, assignments, and progress tracking
- **Real-time Statistics**: Track student engagement and performance
- **Progress Analytics**: Detailed insights into student learning patterns

### 👨‍👩‍👧‍👦 For Parents
- **Child Progress Monitoring**: Real-time access to children's academic performance
- **Engagement Statistics**: Weekly activity reports and achievement tracking
- **Multi-child Support**: Manage multiple children from a single dashboard
- **Communication Tools**: Stay connected with teachers and school updates

### 👨‍🎓 For Students
- **Interactive Learning**: Take quizzes and participate in educational activities
- **Self-Service Learning**: Access to grade-appropriate quiz bank
- **Progress Tracking**: Monitor personal achievement and improvement
- **Gamified Experience**: Engaging interface with achievement badges

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 15.5.0 with App Router
- **Language**: TypeScript 5.0
- **Styling**: Tailwind CSS 4.0
- **UI Components**: Radix UI with custom design system
- **Icons**: Lucide React
- **State Management**: React Context API

### Backend
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with Row Level Security
- **API**: Next.js API routes
- **AI Integration**: OpenAI API for quiz generation
- **File Storage**: Supabase Storage

### Development & Deployment
- **Build Tool**: Turbopack (Next.js)
- **Testing**: Jest + React Testing Library
- **Linting**: ESLint with Next.js configuration
- **Deployment**: Vercel, Docker, or self-hosted options

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm, yarn, pnpm, or bun
- Supabase account
- OpenAI API key (for AI quiz generation)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/futur-genie.git
   cd futur-genie
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your environment variables:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   OPENAI_API_KEY=your_openai_api_key
   ```

4. **Set up the database**
   
   Execute the SQL files in your Supabase dashboard in this order:
   - `sql/schema.sql` - Database schema and tables
   - `sql/rls-policies.sql` - Row Level Security policies
   - `sql/seed-data.sql` - Sample data for testing

5. **Validate your setup**
   ```bash
   npm run validate-env
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) to see the application.

## 🧪 Testing

Run the comprehensive test suite:

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run CI tests
npm run test:ci
```

## 📦 Deployment

### Quick Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/futur-genie)

### Manual Deployment

1. **Validate environment**
   ```bash
   npm run validate-env
   ```

2. **Run pre-deployment checks**
   ```bash
   npm run pre-deploy
   ```

3. **Deploy to your platform**
   ```bash
   # Deploy to Vercel
   npm run deploy:vercel
   
   # Deploy with Docker
   npm run deploy:docker
   
   # Build only
   npm run deploy:build-only
   ```

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## 🏗️ Project Structure

```
futur-genie/
├── sql/                    # Database schema and seed data
│   ├── schema.sql
│   ├── rls-policies.sql
│   └── seed-data.sql
├── src/
│   ├── app/                # Next.js App Router pages
│   ├── components/         # React components
│   │   ├── auth/          # Authentication components
│   │   ├── dashboards/    # Role-based dashboards
│   │   ├── director/      # Director-specific components
│   │   ├── teacher/       # Teacher-specific components
│   │   ├── student/       # Student-specific components
│   │   └── ui/            # Reusable UI components
│   ├── contexts/          # React contexts
│   ├── lib/               # Utility libraries
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Helper functions
├── __tests__/             # Test files
├── .env.example           # Environment variables template
├── DEPLOYMENT.md          # Detailed deployment guide
└── README.md              # This file
```

## 🔧 Configuration

### Environment Variables

See [.env.example](./.env.example) for all available environment variables.

### Database Configuration

The application uses Supabase with Row Level Security (RLS) policies for secure data access. Each user role has specific permissions:

- **Directors**: Full access to their school's data
- **Teachers**: Access to their assigned classrooms and students
- **Parents**: Access to their children's data only
- **Students**: Access to their own data and assigned quizzes

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write tests for new features
- Use the existing component patterns
- Follow the established code style
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [Project Wiki](https://github.com/your-username/futur-genie/wiki)
- **Issues**: [GitHub Issues](https://github.com/your-username/futur-genie/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/futur-genie/discussions)

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org) for the amazing React framework
- [Supabase](https://supabase.com) for backend-as-a-service
- [Tailwind CSS](https://tailwindcss.com) for utility-first styling
- [Radix UI](https://radix-ui.com) for accessible component primitives
- [OpenAI](https://openai.com) for AI-powered quiz generation

---

<div align="center">
  <p>Built with ❤️ for educators worldwide</p>
  <p>© 2025 Futur Génie. All rights reserved.</p>
</div>
