# LifeOS Central

> A comprehensive daily-use personal operating system application built with modern web technologies. Manage tasks, track habits, and organize your digital life in one unified platform.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [Folder Structure](#folder-structure)
- [Key Components](#key-components)
- [Database Setup](#database-setup)
- [Contributing](#contributing)
- [License](#license)

## 🎯 Overview

LifeOS Central is a full-featured personal productivity and life management application designed to help you organize, track, and optimize your daily activities. Whether you're managing tasks, building habits, or analyzing your productivity patterns, LifeOS provides an intuitive and powerful interface.

### Use Cases
- Daily task and project management
- Habit tracking and goal setting
- Workflow automation through AI agents
- Data visualization and analytics
- Personal knowledge management

## ✨ Features

- **Task Management**: Create, organize, and track tasks with priority levels and due dates
- **Habit Tracking**: Build and monitor daily habits with streak counters
- **Dashboard Analytics**: Visual insights into your productivity and progress
- **Responsive Design**: Beautiful, modern UI that works on all devices
- **Real-time Data Sync**: Instant synchronization with Supabase backend
- **Dark Mode Support**: Full dark/light theme support with theme persistence
- **Advanced Components**: Rich set of UI components (accordions, dropdowns, dialogs, etc.)
- **Form Handling**: Robust form validation using React Hook Form and Zod
- **API Integration**: Seamless integration with Supabase for data management

## 📁 Project Structure

```
LifeOS_App_Daily_use_App/
├── src/
│   ├── components/          # Reusable UI components
│   ├── contexts/            # React context providers
│   ├── hooks/               # Custom React hooks
│   ├── integrations/        # Third-party integrations (Supabase)
│   ├── lib/                 # Utility functions and helpers
│   ├── pages/               # Page components
│   ├── App.tsx              # Main application component
│   ├── App.css              # Global styles
│   ├── index.css            # Base CSS
│   ├── main.tsx             # React DOM render entry
│   └── vite-env.d.ts        # Vite environment types
├── public/                  # Static assets
├── supabase/                # Supabase configuration and migrations
├── .env                     # Environment variables
├── .gitignore               # Git ignore rules
├── package.json             # Project dependencies
├── tsconfig.json            # TypeScript configuration
├── vite.config.ts           # Vite build configuration
├── tailwind.config.ts       # Tailwind CSS configuration
├── postcss.config.js        # PostCSS configuration
├── eslint.config.js         # ESLint configuration
└── README.md                # This file
```

## 🛠 Tech Stack

### Frontend
- **React 18.3.1**: Modern React with hooks
- **TypeScript 5.8**: Type-safe JavaScript
- **Vite 5.4.19**: Lightning-fast build tool
- **Tailwind CSS 3.4.17**: Utility-first CSS framework
- **Shadcn-ui**: High-quality React components

### UI/Component Libraries
- **@radix-ui**: Unstyled, accessible components
  - Accordion, Alert Dialog, Avatar, Checkbox, Dialog, Dropdown Menu, and more
- **Lucide React**: Beautiful icon library
- **Recharts 2.15.4**: Data visualization library

### State Management & Forms
- **React Hook Form 7.61.1**: Performant form handling
- **@hookform/resolvers 3.10.0**: Form validation resolvers
- **Zod 3.25.76**: TypeScript-first schema validation
- **@tanstack/react-query 5.83.0**: Server state management

### Backend & Database
- **Supabase 2.89.0**: PostgreSQL backend with real-time updates
- **SQLPlus**: Database migrations and management

### Routing
- **React Router DOM 6.30.1**: Client-side routing

### Utilities
- **date-fns 3.6.0**: Date manipulation
- **Sonner 1.7.4**: Toast notifications
- **next-themes 0.3.0**: Theme management
- **Tailwind Merge**: Tailwind CSS utility merging
- **Embla Carousel**: Carousel component

### Development Tools
- **ESLint 9.32.0**: Code linting
- **TypeScript ESLint**: TypeScript-aware linting
- **Autoprefixer 10.4.21**: CSS vendor prefixing
- **Tailwind Typography**: Typography plugin for Tailwind

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ or Bun
- npm, yarn, or Bun package manager
- Git

### Installation

1. **Clone the repository**:
```bash
git clone https://github.com/HarshChoudhary2003/LifeOS_App_Daily_use_App.git
cd LifeOS_App_Daily_use_App
```

2. **Install dependencies**:
```bash
npm install
# or
bun install
```

3. **Set up environment variables**:
Create a `.env` file in the root directory with the following:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. **Set up Supabase** (optional):
```bash
cd supabase
# Run migrations to set up database schema
```

5. **Start the development server**:
```bash
npm run dev
```
The app will be available at `http://localhost:5173`

## 📚 Available Scripts

In the project directory, you can run:

### `npm run dev`
Starts the development server with hot module replacement (HMR)
```bash
npm run dev
```

### `npm run build`
Builds the app for production optimized for performance
```bash
npm run build
```

### `npm run build:dev`
Builds the app in development mode with source maps
```bash
npm run build:dev
```

### `npm run preview`
Locally preview the production build
```bash
npm run preview
```

### `npm run lint`
Runs ESLint to check code quality
```bash
npm run lint
```

## 📂 Folder Structure Details

### `/src/components`
Reusable UI components built with Radix UI and Tailwind CSS:
- Form components (inputs, selects, checkboxes)
- Layout components (cards, dialogs, dropdowns)
- Data display components (tables, charts)

### `/src/pages`
Page-level components representing different routes:
- Dashboard
- Task management
- Habit tracking
- Settings

### `/src/hooks`
Custom React hooks for common functionality:
- Data fetching
- Local storage management
- Theme switching

### `/src/contexts`
React context providers for global state:
- User authentication
- Theme preferences
- Application settings

### `/src/integrations/supabase`
Supabase client setup and database utilities:
- Authentication
- Real-time subscriptions
- Data CRUD operations

### `/src/lib`
Utility functions and helpers:
- Date formatting
- Data transformation
- API helpers

### `/supabase`
Database configuration and migrations:
- SQL migration files
- Schema definitions
- RLS policies

## 🧩 Key Components

### Core Application Components
- **App.tsx**: Main application wrapper with routing setup
- **Layout**: Responsive layout with sidebar and header
- **Navigation**: Main navigation menu

### Feature Components
- **TaskManager**: Task creation, listing, and management
- **HabitTracker**: Daily habit tracking interface
- **Dashboard**: Analytics and overview
- **Settings**: User preferences and configuration

## 🗄 Database Setup

### Supabase Configuration

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Copy your project URL and API key
3. Add to `.env` file (see Installation step 3)
4. Run migrations from the `supabase/` directory

### Database Schema
The application uses the following main tables:
- `users` - User profiles
- `tasks` - Task management
- `habits` - Habit tracking
- `activity_logs` - User activity tracking

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

### Development Guidelines
- Use TypeScript for type safety
- Follow the existing code style (ESLint config)
- Write descriptive commit messages
- Test your changes locally
- Update documentation as needed

## 📄 License

This project is open source and available under the MIT License. See the LICENSE file for details.

## 👨‍💻 Author

**Harsh Choudhary**
- GitHub: [@HarshChoudhary2003](https://github.com/HarshChoudhary2003)
- Email: hc504360@gmail.com 

## 🙏 Acknowledgments

- [Shadcn-ui](https://ui.shadcn.com) for the beautiful component library
- [Radix UI](https://www.radix-ui.com) for accessible components
- [Tailwind CSS](https://tailwindcss.com) for the utility-first CSS framework
- [Supabase](https://supabase.com) for the backend infrastructure
- [Vite](https://vitejs.dev) for the incredible build tool

## 📞 Support

For support, please open an issue on [GitHub Issues](https://github.com/HarshChoudhary2003/LifeOS_App_Daily_use_App/issues) or contact the maintainer.

---

**Made by Harsh Choudhary**
