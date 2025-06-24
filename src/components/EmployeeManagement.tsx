import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Typography,
  Card,
  CardContent,
  Avatar,
  Divider,
  Grid,
  useTheme,
  useMediaQuery,
  Stack,
  Snackbar,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Person as PersonIcon, ContentCopy as ContentCopyIcon } from '@mui/icons-material';

interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  date_joined?: string;
  dateJoined?: string; // For compatibility with existing code
  username?: string;
  password?: string;
  temp_password?: string;
}

interface Credentials {
  username: string;
  password: string;
}

interface Profile {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  date_joined: string;
  user_role: string;
}

const initialEmployees: Employee[] = [];

export default function EmployeeManagement() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: '',
    role: '',
  });
  const [showCredentials, setShowCredentials] = useState<{
    show: boolean;
    credentials: Credentials | null;
  }>({ show: false, credentials: null });
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  // Fetch employees from the backend
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      // Updated to use the new API endpoint
      const response = await fetch('http://localhost:8000/employees/all', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch employees');
      }
      
      const data = await response.json();
      setEmployees(data);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch profile data
  const fetchProfile = async () => {
    try {
      setLoading(true);
      // Get the user ID from localStorage (saved during login)
      const userId = localStorage.getItem('userId');
      if (!userId) {
        throw new Error('User ID not found');
      }

      const response = await fetch(`http://localhost:8000/employees/profile/${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      const data = await response.json();
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  // Add or update an employee
  const handleSubmit = async () => {
    try {
      setLoading(true);
      const endpoint = editingEmployee
        ? `http://localhost:8000/employees/${editingEmployee.id}`
        : 'http://localhost:8000/employees/';
      const method = editingEmployee ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save employee');
      }

      const data = await response.json();
      
      if (editingEmployee) {
        setEmployees((prev) =>
          prev.map((emp) => (emp.id === editingEmployee.id ? data : emp))
        );
        setSnackbarMessage('Employee updated successfully');
        setSnackbarOpen(true);
      } else {
        setEmployees((prev) => [...prev, data]);
        // Display credentials directly instead of showing email dialog
        if (data.temp_password && data.username) {
          setShowCredentials({
            show: true,
            credentials: {
              username: data.username,
              password: data.temp_password
            }
          });
        }
        setSnackbarMessage('Employee added successfully');
        setSnackbarOpen(true);
      }
      
      handleCloseDialog();
      
      // Refresh the employee list
      await fetchEmployees();
    } catch (error) {
      console.error('Error saving employee:', error);
      setSnackbarMessage('Failed to save employee: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  // Delete an employee
  const handleDelete = async (id: string) => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:8000/employees/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete employee');
      }

      setEmployees((prev) => prev.filter((emp) => emp.id !== id));
      setSnackbarMessage('Employee deleted successfully');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error deleting employee:', error);
      setSnackbarMessage('Failed to delete employee');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  // Open dialog for adding/editing an employee
  const handleOpenDialog = (employee?: Employee) => {
    if (employee) {
      setEditingEmployee(employee);
      setFormData({
        name: employee.name,
        email: employee.email,
        department: employee.department,
        role: employee.role,
      });
    } else {
      setEditingEmployee(null);
      setFormData({
        name: '',
        email: '',
        department: '',
        role: '',
      });
    }
    setOpenDialog(true);
  };

  // Close dialog
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingEmployee(null);
    setFormData({
      name: '',
      email: '',
      department: '',
      role: '',
    });
  };

  // Close credentials card
  const handleCloseCredentials = () => {
    setShowCredentials({ show: false, credentials: null });
  };

  // Fetch employees on component mount
  useEffect(() => {
    fetchEmployees();
    fetchProfile();
  }, []);

  const renderProfile = () => {
    if (loading) {
      return <Typography>Loading profile...</Typography>;
    }

    if (error) {
      return <Typography color="error">{error}</Typography>;
    }

    if (!profile) {
      return <Typography>No profile data available</Typography>;
    }

    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Avatar
              sx={{
                width: 100,
                height: 100,
                bgcolor: 'primary.main',
                fontSize: '2rem',
                mr: 3
              }}
            >
              {profile.name.charAt(0)}
            </Avatar>
            <Box>
              <Typography variant="h5" gutterBottom>
                {profile.name}
              </Typography>
              <Typography variant="subtitle1" color="textSecondary">
                {profile.role}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="textSecondary">
                Email
              </Typography>
              <Typography variant="body1" gutterBottom>
                {profile.email}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="textSecondary">
                Department
              </Typography>
              <Typography variant="body1" gutterBottom>
                {profile.department}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="textSecondary">
                Role
              </Typography>
              <Typography variant="body1" gutterBottom>
                {profile.role}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="textSecondary">
                Date Joined
              </Typography>
              <Typography variant="body1" gutterBottom>
                {new Date(profile.date_joined).toLocaleDateString()}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="textSecondary">
                System Role
              </Typography>
              <Typography variant="body1" gutterBottom>
                {profile.user_role}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box
        display="flex"
        flexDirection={isMobile ? 'column' : 'row'}
        justifyContent="space-between"
        alignItems={isMobile ? 'stretch' : 'center'}
        gap={2}
        mb={3}
      >
        <Typography variant={isMobile ? "h6" : "h5"}>
          Employee Management
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          fullWidth={isMobile}
        >
          Add Employee
        </Button>
      </Box>

      {loading && (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      )}

      {showCredentials.show && showCredentials.credentials && (
        <Card sx={{ mb: 3, bgcolor: 'success.main', boxShadow: 3 }}>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography variant={isMobile ? "subtitle1" : "h6"} color="white" gutterBottom>
              🎉 Employee Added Successfully!
            </Typography>
            <Typography color="white" variant={isMobile ? "body2" : "body1"} sx={{ mb: 2 }}>
              Login Credentials:
            </Typography>
            <Box sx={{ mt: 1, p: 2, bgcolor: 'background.paper', borderRadius: 2, mb: 2 }}>
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="caption" color="textSecondary" sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>
                      Username
                    </Typography>
                    <Typography variant={isMobile ? "body2" : "body1"} sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                      {showCredentials.credentials.username}
                    </Typography>
                  </Box>
                  <IconButton 
                    size="small"
                    onClick={() => {
                      navigator.clipboard.writeText(showCredentials.credentials!.username);
                      setSnackbarMessage('Username copied to clipboard');
                      setSnackbarOpen(true);
                    }}
                    sx={{ color: 'primary.main' }}
                  >
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="caption" color="textSecondary" sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>
                      Password
                    </Typography>
                    <Typography variant={isMobile ? "body2" : "body1"} sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                      {showCredentials.credentials.password}
                    </Typography>
                  </Box>
                  <IconButton 
                    size="small"
                    onClick={() => {
                      navigator.clipboard.writeText(showCredentials.credentials!.password);
                      setSnackbarMessage('Password copied to clipboard');
                      setSnackbarOpen(true);
                    }}
                    sx={{ color: 'primary.main' }}
                  >
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Stack>
            </Box>
            <Typography color="white" sx={{ mt: 1, fontSize: isMobile ? '0.813rem' : '0.875rem', opacity: 0.9 }}>
              ⚠️ Please save these credentials securely and share them with the employee manually. They will not be sent via email.
            </Typography>
            <Stack direction={isMobile ? "column" : "row"} spacing={1} sx={{ mt: 2 }}>
              <Button
                variant="contained"
                color="primary"
                size={isMobile ? "small" : "medium"}
                fullWidth={isMobile}
                onClick={() => {
                  const credentials = `Username: ${showCredentials.credentials!.username}\nPassword: ${showCredentials.credentials!.password}`;
                  navigator.clipboard.writeText(credentials);
                  setSnackbarMessage('Both credentials copied to clipboard');
                  setSnackbarOpen(true);
                }}
                startIcon={<ContentCopyIcon />}
              >
                Copy Both
              </Button>
              <Button
                variant="outlined"
                size={isMobile ? "small" : "medium"}
                fullWidth={isMobile}
                sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}
                onClick={handleCloseCredentials}
              >
                Close
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      <TableContainer
        component={Paper}
        sx={{
          overflowX: 'auto',
          '.MuiTableCell-root': {
            px: { xs: 1, sm: 2 },
            py: { xs: 1, sm: 1.5 },
            '&:first-of-type': {
              pl: { xs: 1, sm: 2 }
            },
            '&:last-child': {
              pr: { xs: 1, sm: 2 }
            }
          }
        }}
      >
        <Table size={isMobile ? "small" : "medium"}>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              {!isMobile && (
                <>
                  <TableCell>Department</TableCell>
                  <TableCell>Role</TableCell>
                </>
              )}
              {!isTablet && <TableCell>Date Joined</TableCell>}
              <TableCell>Username</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {employees.map((employee) => (
              <TableRow key={employee.id}>
                <TableCell>
                  <Typography variant={isMobile ? "body2" : "body1"}>
                    {employee.name}
                  </Typography>
                  {isMobile && (
                    <Stack spacing={0.5} mt={0.5}>
                      <Typography variant="caption" color="textSecondary">
                        {employee.department} - {employee.role}
                      </Typography>
                    </Stack>
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant={isMobile ? "body2" : "body1"}>
                    {employee.email}
                  </Typography>
                </TableCell>
                {!isMobile && (
                  <>
                    <TableCell>{employee.department}</TableCell>
                    <TableCell>{employee.role}</TableCell>
                  </>
                )}
                {!isTablet && (
                  <TableCell>
                    {employee.date_joined 
                      ? new Date(employee.date_joined).toLocaleDateString()
                      : employee.dateJoined 
                        ? new Date(employee.dateJoined).toLocaleDateString()
                        : '-'
                    }
                  </TableCell>
                )}
                <TableCell>
                  <Typography variant={isMobile ? "body2" : "body1"}>
                    {employee.username || employee.email || '-'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <IconButton
                    size={isMobile ? "small" : "medium"}
                    onClick={() => handleOpenDialog(employee)}
                  >
                    <EditIcon fontSize={isMobile ? "small" : "medium"} />
                  </IconButton>
                  <IconButton
                    size={isMobile ? "small" : "medium"}
                    color="error"
                    onClick={() => handleDelete(employee.id)}
                  >
                    <DeleteIcon fontSize={isMobile ? "small" : "medium"} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {employees.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant={isMobile ? "body2" : "body1"}>
                    No employees found.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        fullScreen={isMobile}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant={isMobile ? "h6" : "h5"}>
            {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Name"
              fullWidth
              size={isMobile ? "small" : "medium"}
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
            <TextField
              label="Email"
              fullWidth
              size={isMobile ? "small" : "medium"}
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
            />
            <TextField
              label="Department"
              fullWidth
              size={isMobile ? "small" : "medium"}
              value={formData.department}
              onChange={(e) =>
                setFormData({ ...formData, department: e.target.value })
              }
              required
            />
            <TextField
              label="Role"
              fullWidth
              size={isMobile ? "small" : "medium"}
              value={formData.role}
              onChange={(e) =>
                setFormData({ ...formData, role: e.target.value })
              }
              required
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: { xs: 2, sm: 2.5 } }}>
          <Button
            onClick={handleCloseDialog}
            size={isMobile ? "small" : "medium"}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="primary"
            size={isMobile ? "small" : "medium"}
            disabled={loading}
          >
            {editingEmployee ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={snackbarMessage?.includes('success') ? 'success' : 'error'} 
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}