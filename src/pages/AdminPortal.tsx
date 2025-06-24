import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import {
  Box,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Inventory as InventoryIcon,
  Report as ReportIcon,
  Store as StoreIcon,
} from '@mui/icons-material';
import DashboardLayout from '../components/DashboardLayout';
import DashboardStats from '../components/DashboardStats';
import EmployeeManagement from '../components/EmployeeManagement';
import AssetManagement from '../components/AssetManagement';
import ComplaintManagement from '../components/ComplaintManagement';
import VendorManagement from '../components/VendorManagement';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

const AdminPortal = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [activeSection, setActiveSection] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const allowedPaths = ['/admin'];

  useEffect(() => {
    // Check if current path is not in allowedPaths
    if (!allowedPaths.includes(location.pathname)) {
      // Redirect to login page
      navigate('/login');
    }
  }, [location.pathname, navigate]);

  const menuItems = [
    {
      icon: <DashboardIcon />,
      text: 'Dashboard',
      onClick: () => setActiveSection(0),
    },
    {
      icon: <PeopleIcon />,
      text: isMobile ? 'Employees' : 'Employee Management',
      onClick: () => setActiveSection(1),
    },
    {
      icon: <InventoryIcon />,
      text: isMobile ? 'Assets' : 'Asset Management',
      onClick: () => setActiveSection(2),
    },
    {
      icon: <ReportIcon />,
      text: isMobile ? 'Complaints' : 'Complaint Management',
      onClick: () => setActiveSection(3),
    },
    {
      icon: <StoreIcon />,
      text: isMobile ? 'Vendors' : 'Vendor Management',
      onClick: () => setActiveSection(4),
    },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 0:
        return <DashboardStats />;
      case 1:
        return <EmployeeManagement />;
      case 2:
        return <AssetManagement />;
      case 3:
        return <ComplaintManagement />;
      case 4:
        return <VendorManagement />;
      default:
        return <DashboardStats />;
    }
  };

  return (
    <DashboardLayout title="Admin Dashboard" menuItems={menuItems}>
      <Box sx={{ width: '100%', p: 3 }}>
        {renderContent()}
      </Box>
    </DashboardLayout>
  );
};

export default AdminPortal; 