import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  useTheme,
  useMediaQuery,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';
import {
  Refresh as RefreshIcon,
  People as PeopleIcon,
  Computer as ComputerIcon,
  Report as ReportIcon,
  Store as StoreIcon,
  Assignment as AssignmentIcon,
  AssignmentTurnedIn as AssignmentTurnedInIcon,
} from '@mui/icons-material';
import adminService, { AdminStatistics } from '../services/adminService';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function DashboardStats() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<AdminStatistics | null>(null);

  const fetchStatistics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminService.getAdminStatistics();
      setStats(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch statistics');
      console.error('Error fetching admin statistics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatistics();
  }, []);

  const handleRefresh = () => {
    fetchStatistics();
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" action={
        <IconButton onClick={handleRefresh} size="small">
          <RefreshIcon />
        </IconButton>
      }>
        {error}
      </Alert>
    );
  }

  if (!stats) {
    return (
      <Alert severity="warning">
        No data available
      </Alert>
    );
  }

  // Prepare complaint status data for pie chart
  const complaintChartData = Object.entries(stats.complaint_status).map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: count
  }));

  // Prepare asset status data for bar chart
  const assetChartData = Object.entries(stats.asset_status).map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    count: count
  }));

  // Calculate specific complaint counts from backend data
  const activeComplaints = stats.active_complaints;
  const atsComplaints = stats.ats_complaints;
  const assistantComplaints = stats.assistant_manager_complaints;
  const managerComplaints = stats.manager_complaints;

  const statCards = [
    {
      title: 'Total Employees',
      value: stats.counts.employees,
      icon: <PeopleIcon sx={{ fontSize: 40, color: '#1976d2' }} />,
      color: '#1976d2',
    },
    {
      title: 'Total Assets',
      value: stats.counts.assets,
      icon: <ComputerIcon sx={{ fontSize: 40, color: '#388e3c' }} />,
      color: '#388e3c',
    },
    {
      title: 'Active Complaints',
      value: activeComplaints,
      icon: <ReportIcon sx={{ fontSize: 40, color: '#f57c00' }} />,
      color: '#f57c00',
    },
    {
      title: 'Total Vendors',
      value: stats.counts.vendors,
      icon: <StoreIcon sx={{ fontSize: 40, color: '#7b1fa2' }} />,
      color: '#7b1fa2',
    },
    {
      title: 'ATS Portal Complaints',
      value: atsComplaints,
      icon: <AssignmentIcon sx={{ fontSize: 40, color: '#d32f2f' }} />,
      color: '#d32f2f',
    },
    {
      title: 'Assistant Manager Complaints',
      value: assistantComplaints,
      icon: <AssignmentTurnedInIcon sx={{ fontSize: 40, color: '#0288d1' }} />,
      color: '#0288d1',
    },
    {
      title: 'Manager Complaints',
      value: managerComplaints,
      icon: <AssignmentIcon sx={{ fontSize: 40, color: '#5e35b1' }} />,
      color: '#5e35b1',
    },
  ];

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Admin Dashboard
        </Typography>
        <Tooltip title="Refresh data">
          <IconButton onClick={handleRefresh} disabled={isLoading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} mb={4}>
        {statCards.map((stat, index) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
            <Card 
              sx={{ 
                height: '100%',
                borderLeft: `4px solid ${stat.color}`,
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 3
                }
              }}
            >
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      {stat.title}
                    </Typography>
                    <Typography variant="h4" component="div" sx={{ fontWeight: 600 }}>
                      {stat.value}
                    </Typography>
                  </Box>
                  {stat.icon}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Charts Section - Only 2 key charts */}
      <Grid container spacing={3}>
        {/* Complaint Status Distribution */}
        {complaintChartData.length > 0 && (
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '400px' }}>
              <CardContent sx={{ height: '100%' }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Complaint Status Distribution
                </Typography>
                <Box sx={{ height: 'calc(100% - 40px)' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={complaintChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {complaintChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Asset Status Overview */}
        {assetChartData.length > 0 && (
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '400px' }}>
              <CardContent sx={{ height: '100%' }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Asset Status Overview
                </Typography>
                <Box sx={{ height: 'calc(100% - 40px)' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={assetChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <RechartsTooltip />
                      <Bar dataKey="count" fill="#0088FE" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Recent Complaints Section */}
      {stats.recent_complaints && stats.recent_complaints.length > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Recent Complaints
            </Typography>
            <Grid container spacing={2}>
              {stats.recent_complaints.slice(0, 5).map((complaint) => (
                <Grid item xs={12} key={complaint.id}>
                  <Box 
                    sx={{ 
                      p: 2, 
                      border: '1px solid #e0e0e0', 
                      borderRadius: 1,
                      '&:hover': { backgroundColor: '#f5f5f5' }
                    }}
                  >
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {complaint.title}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          By: {complaint.employee_name}
                        </Typography>
                      </Box>
                      <Box textAlign="right">
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            backgroundColor: 
                              complaint.status === 'resolved' ? '#4caf50' :
                              complaint.status === 'in_progress' ? '#ff9800' : '#f44336',
                            color: 'white',
                            px: 1,
                            py: 0.5,
                            borderRadius: 1
                          }}
                        >
                          {complaint.status.toUpperCase()}
                        </Typography>
                        <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                          {new Date(complaint.date_submitted).toLocaleDateString()}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
