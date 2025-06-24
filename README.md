# IT Inventory and Complaint Management System

A comprehensive system for managing IT assets, complaints, and vendor relationships within an organization.

## Portal Integration Flow

The application consists of several interconnected portals, each serving different user roles:

### Workflow Overview

1. **Employee Portal**
   - Employees submit complaints about IT issues
   - Employees can view their assigned assets
   - Employees track status of their complaints

2. **ATS (Advanced Technical Support) Portal**
   - First level of complaint review
   - ATS team evaluates complaints and either:
     - Resolves simple issues directly
     - Forwards complex issues to Assistant Manager

3. **Assistant Manager Portal**
   - Reviews complaints forwarded from ATS
   - Can approve, reject, or forward to Manager
   - Manages mid-level approvals

4. **Manager Portal**
   - Final authority for complex complaints
   - Approves high-value purchase requests
   - Makes final decisions on critical issues

5. **Vendor Portal**
   - Vendors receive purchase requests
   - Submit quotes for requested items
   - View their profile and performance metrics

### Data Flow

1. **Complaint Flow:**
   - Employee → ATS → Assistant Manager → Manager
   - At each stage, appropriate approvals are logged
   - Notifications are sent to relevant parties
   - Status updates are visible to all involved parties

2. **Asset Management:**
   - Assets are assigned to employees
   - Maintenance records are tracked
   - Asset lifecycle is monitored

3. **Purchase Requests:**
   - Requests flow from departments to management
   - Approved requests are sent to vendors
   - Vendors provide quotes
   - Quotes are reviewed and accepted/rejected

## Authentication and Authorization

- JWT-based authentication
- Role-based access control
- Session timeout management
- Secure API endpoints

## Backend API Integration

All frontend portals communicate with the backend through a REST API. The main endpoints are:

- `/complaints` - Complaint management
- `/assets` - Asset management
- `/employees` - Employee information
- `/vendors` - Vendor management
- `/purchase-requests` - Purchase request flow

## Development and Deployment

### Running the Application

1. Start the backend server:
   ```
   cd Backend
   uvicorn main:app --reload
   ```

2. Start the frontend development server:
   ```
   npm run dev
   ```

3. Access the application at `http://localhost:5173`

### Default User Credentials

- Admin: admin@example.com / admin123
- Employee: employee@example.com / employee123
- ATS: ats@example.com / ats123
- Assistant Manager: assistant_manager@example.com / asst123
- Manager: manager@example.com / manager123
- Vendor: vendor@example.com / vendor123

## Technologies Used

- **Frontend:** React, Material-UI, TypeScript
- **Backend:** FastAPI, SQLAlchemy, PostgreSQL
- **Authentication:** JWT
- **API:** RESTful architecture

## Features

- **Multi-Role Access Control**:
  - Manager Portal
  - Assistant Manager Portal
  - Employee Portal
  - Vendor Portal
  - ATS (Asset Tracking System) Portal

- **Secure Authentication**: Built-in authentication system using Supabase
- **Modern UI**: Built with Material-UI (MUI) and Tailwind CSS
- **Responsive Design**: Works seamlessly across desktop and mobile devices
- **Real-time Updates**: Powered by Supabase real-time subscriptions
- **Data Visualization**: Includes charts and graphs using Recharts

## Tech Stack

- **Frontend Framework**: React 18
- **Language**: TypeScript
- **Styling**: 
  - Tailwind CSS
  - Material-UI (MUI)
  - Emotion (CSS-in-JS)
- **State Management**: React Hooks
- **Form Handling**: React Hook Form with Zod validation
- **Routing**: React Router v6
- **Backend/Database**: Supabase
- **Build Tool**: Vite
- **Icons**: Heroicons, Lucide React

## Prerequisites

- Node.js (Latest LTS version recommended)
- npm or yarn package manager

## Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd it_inventory_app-main
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory and add your Supabase credentials:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Start the development server:
```bash
npm run dev
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── components/     # Reusable UI components
├── pages/         # Page components for different portals
│   ├── Manager.tsx
│   ├── AssistantManagerPortal.tsx
│   ├── EmployeePortal.tsx
│   ├── VendorPortal.tsx
│   └── ATSPortal.tsx
├── theme/         # MUI theme customization
├── utils/         # Utility functions
└── App.tsx        # Main application component
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please open an issue in the GitHub repository or contact the development team.
