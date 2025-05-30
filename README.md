# Cashé 💰

A modern personal finance management application built with React/Next.js and integrated with Google Sheets for data storage.

## ✨ Features

- **Dashboard Overview**: Get a comprehensive view of your financial health with interactive charts and insights
- **Transaction Management**: Add, edit, and categorize your income and expenses
- **Google Sheets Integration**: Seamless data synchronization with Google Sheets for data persistence
- **Real-time Data Refresh**: Automatic UI updates when new transactions are added
- **Budget Tracking**: Monitor your spending against set budgets
- **Expense Categories**: Organize transactions by customizable categories
- **Financial Insights**: AI-powered insights and spending trend analysis
- **Responsive Design**: Works perfectly on desktop and mobile devices
- **Dark/Light Theme**: Toggle between dark and light modes
- **Multi-language Support**: Available in multiple languages (i18n)

## 🚀 Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Authentication**: NextAuth.js with Google OAuth
- **Styling**: Tailwind CSS with shadcn/ui components
- **Charts**: Chart.js and Recharts for data visualization
- **Forms**: React Hook Form with Zod validation
- **Data Storage**: Google Sheets API integration
- **State Management**: React Context API with custom hooks
- **Icons**: Lucide React
- **Internationalization**: i18next

## 📋 Prerequisites

Before running this project, make sure you have:

- Node.js 18+ installed
- A Google Cloud Console project with Sheets API enabled
- Google OAuth credentials configured
- Git installed

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/juanmanuellosada/cashe-frontend.git
   cd cashe-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Environment Setup**
   
   Create a `.env.local` file in the root directory with the following variables:
   ```env
   # NextAuth Configuration
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-nextauth-secret-here
   
   # Google OAuth
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   
   # Google Sheets
   GOOGLE_SHEETS_PRIVATE_KEY=your-google-sheets-private-key
   GOOGLE_SHEETS_CLIENT_EMAIL=your-google-sheets-client-email
   GOOGLE_SPREADSHEET_ID=your-google-spreadsheet-id
   ```

4. **Google Sheets Setup**
   
   - Create a new Google Spreadsheet
   - Set up the following sheets with proper column headers:
     - `Transactions`: Date, Amount, Category, Description, Type
     - `Categories`: Name, Type, Color
     - `Budgets`: Category, Amount, Period
   - Share the spreadsheet with your service account email
   - Copy the spreadsheet ID to your environment variables

5. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

6. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000) to see the application.

## 📁 Project Structure

```
cashe-frontend/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Dashboard pages
│   └── page.tsx           # Home page
├── components/            # Reusable components
│   ├── ui/               # Base UI components (shadcn/ui)
│   ├── charts/           # Chart components
│   ├── forms/            # Form components
│   └── layout/           # Layout components
├── hooks/                # Custom React hooks
│   ├── data-refresh-context.tsx
│   └── use-*.ts          # Various custom hooks
├── lib/                  # Utility libraries
│   ├── auth.ts           # NextAuth configuration
│   ├── google-sheets.ts  # Google Sheets API
│   └── utils.ts          # General utilities
├── contexts/             # React contexts
├── public/               # Static assets
├── styles/               # Global styles
└── types/                # TypeScript type definitions
```

## 🔧 Key Features Implementation

### Data Refresh System
The application includes a sophisticated data refresh system that automatically updates all components when new data is added:

```typescript
// Custom hook for global data refresh
const { triggerRefresh } = useDataRefresh();

// Automatically refresh data after adding transactions
const onSubmit = async (data) => {
  await saveTransaction(data);
  triggerRefresh(); // Updates all connected components
};
```

### Google Sheets Integration
Seamless integration with Google Sheets for data persistence:

```typescript
// Real-time data synchronization
const syncWithSheets = async () => {
  const data = await fetchFromGoogleSheets();
  updateLocalState(data);
};
```

### Responsive Design
Built with mobile-first approach using Tailwind CSS:

- Adaptive layouts for all screen sizes
- Touch-friendly interactions
- Optimized performance on mobile devices

## 🎨 UI Components

The application uses shadcn/ui components for a consistent and beautiful interface:

- **Charts**: Interactive financial charts and graphs
- **Forms**: Elegant form components with validation
- **Navigation**: Intuitive sidebar and navigation
- **Modals**: Smooth dialog and modal interactions
- **Themes**: Dark/light mode support

## 🔐 Authentication

Secure authentication powered by NextAuth.js:

- Google OAuth integration
- Session management
- Automatic token refresh
- Secure API route protection

## 📊 Data Visualization

Rich data visualization with multiple chart types:

- **Monthly Balance**: Track account balance over time
- **Expense Categories**: Pie charts for expense breakdown
- **Spending Trends**: Line charts for spending patterns
- **Budget Progress**: Progress bars for budget tracking

## 🌍 Internationalization

Multi-language support using i18next:

- English and Spanish support
- Dynamic language switching
- Localized date and number formats

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect your GitHub repository to Vercel**
2. **Configure environment variables** in Vercel dashboard
3. **Deploy** - Vercel will automatically build and deploy your app

### Other Platforms

The app can be deployed on any platform that supports Next.js:

- Netlify
- Railway
- AWS Amplify
- Google Cloud Platform

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Known Issues

- Toast notifications may not appear consistently (working on fix)
- Docker Desktop dependency for development environment

## 🔮 Roadmap

- [ ] Mobile app (React Native)
- [ ] Advanced analytics and reporting
- [ ] Bank account integration
- [ ] Investment tracking
- [ ] Bill reminders and automation
- [ ] Export functionality (PDF, CSV)
- [ ] Multiple currency support

## 💡 Support

If you have any questions or need help:

- Open an issue on GitHub
- Contact the maintainer: Juan Manuel Losada

## 🙏 Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) for the beautiful component library
- [Next.js](https://nextjs.org/) for the amazing React framework
- [Google Sheets API](https://developers.google.com/sheets/api) for data storage
- [Vercel](https://vercel.com/) for hosting and deployment

---

Made with ❤️ by [Juan Manuel Losada](https://github.com/juanmanuellosada)
