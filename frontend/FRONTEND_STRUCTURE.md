# Frontend Project Structure

This frontend is organized using a **feature-based architecture** to make it easier for team members to work on different features independently.

## 📁 Directory Structure

```
src/
├── components/            # Feature-based component modules
│   ├── auth/             # Authentication (login, signup, home)
│   ├── hostels/          # Hostel management
│   ├── bookings/         # Booking management
│   ├── payments/          # Payment processing
│   ├── inquiries/        # Inquiry management
│   ├── latepass/         # Late pass requests
│   ├── complains/        # Complaint management
│   ├── inventory/        # Inventory management
│   ├── maintenance/      # Maintenance requests
│   ├── users/            # User management (admin)
│   └── dashboard/        # Dashboard pages
│
├── shared/               # Shared resources
│   ├── components/      # Reusable components (ProtectedRoute, Navbars)
│   ├── layouts/          # Layout components (StudentLayout, AdminLayout)
│   └── api/              # API client and utilities
│
├── App.jsx               # Main app component with routes
└── main.jsx              # Entry point
```

## 🎯 Feature Organization

Each feature folder can contain:
- **Pages/Components** - Feature-specific UI components
- **API functions** - Feature-specific API calls (optional)
- **Hooks** - Feature-specific custom hooks (optional)
- **Utils** - Feature-specific utilities (optional)
- **index.js** - Barrel exports for easier imports

### Example Feature Structure:
```
features/
└── payments/
    ├── StudentPayments.jsx
    ├── AdminPayments.jsx
    ├── PaymentForm.jsx        # (if needed)
    ├── usePayments.js         # (if needed)
    └── index.js
```

## 📦 Import Examples

### Using Component Exports:
```jsx
// Instead of long paths
import { StudentPayments } from '../../components/payments'
import { AdminDashboard } from '../../components/dashboard'
```

### Using Shared Resources:
```jsx
import { ProtectedRoute } from '../shared/components'
import { StudentLayout } from '../shared/layouts'
import { apiFetch } from '../shared/api'
```

## 👥 Team Collaboration Benefits

1. **Clear Ownership** - Each feature folder is self-contained
2. **Easy Navigation** - Find all related files in one place
3. **Reduced Conflicts** - Team members work on different features
4. **Better Organization** - Related code stays together
5. **Scalability** - Easy to add new features

## 🚀 Adding a New Component/Feature

1. Create a new folder in `components/`
2. Add your components/pages
3. Create an `index.js` for exports
4. Import in `App.jsx` for routing

Example:
```bash
components/
└── new-feature/
    ├── NewFeaturePage.jsx
    ├── NewFeatureForm.jsx
    └── index.js
```

## 📝 Notes

- **Shared components** go in `shared/components/`
- **Feature-specific components** go in their respective component folder
- **API calls** are in `shared/api/`
- Use **index.js** files for cleaner imports
