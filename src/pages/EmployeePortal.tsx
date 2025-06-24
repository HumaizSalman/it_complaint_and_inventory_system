import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import {
  Dashboard as DashboardIcon,
  BugReport as ComplaintsIcon,
  Computer as AssetsIcon,
  VerifiedUser as ProfileIcon,
  Add as AddIcon,
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  Clear as ClearIcon,
  History as HistoryIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  Chat as ChatIcon,
  ExpandMore as ExpandMoreIcon,
  Computer,
} from '@mui/icons-material';
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  AlertColor,
  Snackbar,
  useTheme,
  useMediaQuery,
  IconButton,
  LinearProgress,
  InputAdornment,
  Divider,
  Stack,
  Avatar,
  Badge,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import api from '../utils/axios';
import { useAuth } from '../context/AuthContext';
import assetService, { Asset } from '../services/assetService';
import complaintService from '../services/complaintService';

// Define interfaces for data types
interface IEmployee {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  phone_number?: string;
  location?: string;
  date_joined: string;
}

interface IReply {
  id: string;
  complaint_id: string;
  message: string;
  from_user: string;
  timestamp: string;
  user_id?: string;
}

interface IComplaint {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  employee_id: string;
  employee: IEmployee;
  asset_id?: string;
  asset?: Asset;
  date_submitted: string;
  last_updated: string;
  resolution_date?: string;
  resolution_notes?: string;
  replies: IReply[];
  images?: string[];
}

const EmployeePortal: React.FC = (): JSX.Element => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();
  
  // State variables
  const [activeTab, setActiveTab] = useState<number>(0);
  const [activeComplaints, setActiveComplaints] = useState<IComplaint[]>([]);
  const [resolvedComplaints, setResolvedComplaints] = useState<IComplaint[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [employeeProfile, setEmployeeProfile] = useState<IEmployee | null>(null);
  const [selectedComplaint, setSelectedComplaint] = useState<IComplaint | null>(null);
  const [complaintDialogOpen, setComplaintDialogOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<AlertColor>('info');
  const [unreadMessageCount, setUnreadMessageCount] = useState<number>(0);
  
  // New states for enhanced functionality
  const [replyText, setReplyText] = useState<string>('');
  const [activeChatTab, setActiveChatTab] = useState<number>(0);
  
  // New state for complaint creation
  const [createComplaintDialogOpen, setCreateComplaintDialogOpen] = useState<boolean>(false);
  const [newComplaint, setNewComplaint] = useState({
    title: '',
    description: '',
    priority: 'medium',
    employee_id: user?.employeeId || '',
    asset_id: ''
  });
  
  // Add this with the other state variables
  const [assetComplaints, setAssetComplaints] = useState<{ [assetId: string]: IComplaint[] }>({});
  
  const menuItems = [
    {
      icon: <DashboardIcon />,
      text: 'Dashboard',
      onClick: () => setActiveTab(0),
    },
    {
      icon: <ComplaintsIcon />,
      text: 'Complaint History',
      onClick: () => setActiveTab(1),
    },
    {
      icon: <AssetsIcon />,
      text: 'My Assets',
      onClick: () => setActiveTab(2),
    },
    {
      icon: <ProfileIcon />,
      text: 'Profile',
      onClick: () => setActiveTab(3),
    }
  ];
  
  // Fetch data when component mounts
  useEffect(() => {
    if (user?.employeeId) {
      fetchEmployeeComplaints();
      fetchEmployeeAssets();
      fetchEmployeeProfile();
      
      // Set employee ID for new complaints
      setNewComplaint(prev => ({
        ...prev,
        employee_id: user.employeeId || ''
      }));
    }
  }, [user]);
  
  // Fetch employee's active complaints
  const fetchEmployeeComplaints = async (): Promise<void> => {
    if (!user?.employeeId) return;
    
    try {
      setIsLoading(true);
      const response = await api.get(`/employees/${user.employeeId}/complaints`);
      
      // Separate active and resolved complaints
      const active: IComplaint[] = [];
      const resolved: IComplaint[] = [];
      
      response.data.forEach((complaint: IComplaint) => {
        if (complaint.status === 'resolved') {
          resolved.push(complaint);
        } else {
          active.push(complaint);
        }
      });
      
      // Get all complaints with unread messages from ATS Team
      let totalUnread = 0;
      
      // Check each complaint for unread messages
      await Promise.all([...active, ...resolved].map(async (complaint) => {
        try {
          const replies = await complaintService.getComplaintReplies(complaint.id, true);
          const unreadCount = replies.filter(r => r.from_user === "ATS Team").length;
          totalUnread += unreadCount;
        } catch (error) {
          console.error(`Error fetching replies for complaint ${complaint.id}:`, error);
        }
      }));
      
      // Update unread count
      setUnreadMessageCount(totalUnread);
      
      setActiveComplaints(active);
      setResolvedComplaints(resolved);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching complaints:', error);
      setSnackbarMessage('Failed to fetch complaints');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      setIsLoading(false);
    }
  };
  
  // Fetch employee's assets
  const fetchEmployeeAssets = async (): Promise<void> => {
    if (!user?.employeeId) {
      console.warn('No employee ID available to fetch assets');
      return;
    }
    
    try {
      setIsLoading(true);
      console.log('Fetching assets for employee ID:', user.employeeId);
      
      // First, try the getEmployeeAssets method which has built-in fallbacks
      const fetchedAssets = await assetService.getEmployeeAssets(user.employeeId);
      console.log('Successfully fetched employee assets:', fetchedAssets);
      
      if (Array.isArray(fetchedAssets)) {
        setAssets(fetchedAssets);
        
        // Fetch complaints for each asset
        const complaintsByAsset: { [assetId: string]: IComplaint[] } = {};
        
        if (fetchedAssets.length > 0) {
          // Fetch all complaints for the employee first
          const complaintsResponse = await api.get(`/employees/${user.employeeId}/complaints`);
          const allComplaints: IComplaint[] = complaintsResponse.data || [];
          
          // Group complaints by asset_id
          fetchedAssets.forEach(asset => {
            const assetComplaints = allComplaints.filter(complaint => complaint.asset_id === asset.id);
            if (assetComplaints.length > 0) {
              complaintsByAsset[asset.id] = assetComplaints;
            } else {
              complaintsByAsset[asset.id] = [];
            }
          });
          
          setAssetComplaints(complaintsByAsset);
        }
        
        if (fetchedAssets.length === 0) {
          console.log('No assets found for employee. This might be expected if no assets are assigned.');
        }
      } else {
        console.error('Unexpected response format from asset service:', fetchedAssets);
        setSnackbarMessage('Received invalid asset data format');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error('Error fetching assets:', error);
      
      // Try fallback approach directly
      try {
        console.log('Attempting fallback: Fetch all assets and filter by employee ID');
        const response = await api.get('/assets');
        if (response.data && Array.isArray(response.data)) {
          const employeeAssets = response.data.filter(
            (asset: any) => asset.assigned_to_id === user.employeeId
          );
          console.log('Fallback successful, found assets:', employeeAssets);
          setAssets(employeeAssets);
          
          // Also try to fetch complaints for these assets
          try {
            const complaintsResponse = await api.get(`/employees/${user.employeeId}/complaints`);
            const allComplaints: IComplaint[] = complaintsResponse.data || [];
            
            // Group complaints by asset_id
            const complaintsByAsset: { [assetId: string]: IComplaint[] } = {};
            employeeAssets.forEach(asset => {
              const assetComplaints = allComplaints.filter(complaint => complaint.asset_id === asset.id);
              if (assetComplaints.length > 0) {
                complaintsByAsset[asset.id] = assetComplaints;
              } else {
                complaintsByAsset[asset.id] = [];
              }
            });
            
            setAssetComplaints(complaintsByAsset);
          } catch (complaintError) {
            console.error('Failed to fetch complaints for assets:', complaintError);
          }
        } else {
          console.error('Fallback failed: Invalid response format');
          setSnackbarMessage('Failed to fetch your assigned assets');
          setSnackbarSeverity('error');
          setSnackbarOpen(true);
        }
      } catch (fallbackError) {
        console.error('Fallback fetch failed:', fallbackError);
        setSnackbarMessage('Failed to fetch assets. The asset API may not be available.');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch employee profile
  const fetchEmployeeProfile = async (): Promise<void> => {
    if (!user?.employeeId) return;
    
    try {
      setIsLoading(true);
      const response = await api.get(`/employees/${user.employeeId}`);
      setEmployeeProfile(response.data);
      setIsLoading(false);
    } catch (error) {
      // If employee endpoint fails, try by email
      try {
        if (user.email) {
          const emailResponse = await api.get(`/employees/by-email/${user.email}`);
          setEmployeeProfile(emailResponse.data);
        }
      } catch (emailError) {
        console.error('Error fetching employee profile:', emailError);
        setSnackbarMessage('Failed to fetch employee profile');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
      setIsLoading(false);
    }
  };
  
  // Open complaint detail dialog
  const handleComplaintClick = async (complaint: IComplaint): Promise<void> => {
    try {
      setIsLoading(true);
      // First set the complaint to show loading state
      setSelectedComplaint(complaint);
      setComplaintDialogOpen(true);
      
      // Then fetch the replies for this complaint
      const replies = await complaintService.getComplaintReplies(complaint.id);
      
      // Update the selected complaint with the replies
      setSelectedComplaint({
        ...complaint,
        replies: replies
      });
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching complaint replies:', error);
      setSnackbarMessage('Failed to fetch message history');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      setIsLoading(false);
    }
  };
  
  // Refresh all data
  const handleRefresh = (): void => {
    fetchEmployeeComplaints();
    fetchEmployeeAssets();
    fetchEmployeeProfile();
  };
  
  // Delete complaint
  const handleDeleteComplaint = async (complaintId: string): Promise<void> => {
    try {
      setIsLoading(true);
      await api.delete(`/complaints/${complaintId}`);
      
      // Refresh complaints after deletion
      fetchEmployeeComplaints();
      
      setSnackbarMessage('Complaint deleted successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error deleting complaint:', error);
      setSnackbarMessage('Failed to delete complaint');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      setIsLoading(false);
    }
  };
  
  // Handle input change for new complaint form
  const handleComplaintInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    setNewComplaint(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle select change for priority dropdown
    const handlePriorityChange = (e: SelectChangeEvent<string>) => {
    setNewComplaint(prev => ({
      ...prev,
      priority: e.target.value
    }));
  };

  // Create new complaint
  const handleCreateComplaint = async (): Promise<void> => {
    try {
      if (!newComplaint.title.trim() || newComplaint.title.length < 5) {
        setSnackbarMessage('Title must be at least 5 characters long');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        return;
      }
      
      if (!newComplaint.description.trim() || newComplaint.description.length < 10) {
        setSnackbarMessage('Description must be at least 10 characters long');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        return;
      }
      
      if (!newComplaint.asset_id) {
        setSnackbarMessage('Please select an asset for this complaint');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        return;
      }
      
      setIsLoading(true);
      
      // Create complaint data without images
      const complaintData = {
        title: newComplaint.title,
        description: newComplaint.description,
        priority: newComplaint.priority,
        employee_id: user?.employeeId || newComplaint.employee_id,
        asset_id: newComplaint.asset_id
      };
      
      // Call API to create complaint
      const response = await api.post('/complaints/', complaintData);
      
      setIsLoading(false);
      
      // Reset form and close dialog
      setNewComplaint({
        title: '',
        description: '',
        priority: 'medium',
        employee_id: user?.employeeId || '',
        asset_id: ''
      });
      
      setCreateComplaintDialogOpen(false);
      
      // Show success message
      setSnackbarMessage('Complaint created successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      
      // Refresh complaints list
      fetchEmployeeComplaints();
      
    } catch (error) {
      console.error('Error creating complaint:', error);
      setIsLoading(false);
      setSnackbarMessage('Failed to create complaint');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };
  
  // Add function to handle sending replies
  const handleSendReply = async (): Promise<void> => {
    if (!replyText.trim() || !selectedComplaint) return;
    
    try {
      setIsLoading(true);
      const replyData = { 
        complaint_id: selectedComplaint.id,
        message: replyText.trim(), 
        from_user: employeeProfile?.name || "Employee",
        user_id: user?.id  // Add user ID for tracking
      };
      
      // First, try to add the reply directly - this updates the resolution_notes field in the backend
      await complaintService.addReply(replyData);
      
      // Clear the input field immediately on successful send
      setReplyText('');
      
      // Set success message
      setSnackbarMessage('Message sent successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      
      // Then refresh the complaint data to show the updated chat
      try {
        // Fetch the updated complaint first
        await fetchEmployeeComplaints();
        
        // Find the updated complaint in the state
        const updatedActiveComplaint = activeComplaints.find(c => c.id === selectedComplaint.id);
        const updatedResolvedComplaint = resolvedComplaints.find(c => c.id === selectedComplaint.id);
        
        // Get the right complaint object
        const updatedComplaint = updatedActiveComplaint || updatedResolvedComplaint;
        
        if (updatedComplaint) {
          // Get the replies for this complaint
          const replies = await complaintService.getComplaintReplies(selectedComplaint.id);
          
          // Update the selected complaint with the new data
          setSelectedComplaint({
            ...updatedComplaint,
            replies: replies
          });
        } else {
          // Fallback if we can't find the updated complaint in our state
          console.warn('Could not find the updated complaint in state');
        }
      } catch (refreshError) {
        console.error('Error refreshing complaint data:', refreshError);
        // Show a warning but don't treat it as a total failure
        setSnackbarMessage('Message sent, but failed to refresh message history');
        setSnackbarSeverity('warning');
        setSnackbarOpen(true);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error sending message:', error);
      setSnackbarMessage('Failed to send message');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      setIsLoading(false);
    }
  };

  // Dashboard section - Active complaints listing
  const renderDashboard = (): JSX.Element => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant={isMobile ? "h5" : "h4"} gutterBottom>
          My Active Complaints
        </Typography>
        <Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setCreateComplaintDialogOpen(true)}
          >
            New Complaint
          </Button>
          <IconButton onClick={handleRefresh} color="primary" sx={{ ml: 1 }}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>
      
      {isLoading && <LinearProgress sx={{ mb: 2 }} />}
      
      {activeComplaints.length > 0 ? (
        <TableContainer component={Paper} sx={{ boxShadow: 2, borderRadius: '8px' }}>
          <Table size={isMobile ? "small" : "medium"}>
            <TableHead sx={{ bgcolor: theme.palette.primary.main }}>
              <TableRow>
                <TableCell sx={{ color: 'black', fontWeight: 'bold' }}>Title</TableCell>
                <TableCell sx={{ color: 'black', fontWeight: 'bold' }}>Priority</TableCell>
                <TableCell sx={{ color: 'black', fontWeight: 'bold' }}>Status</TableCell>
                <TableCell sx={{ color: 'black', fontWeight: 'bold' }}>Asset</TableCell>
                <TableCell sx={{ color: 'black', fontWeight: 'bold' }}>Date Submitted</TableCell>
                <TableCell sx={{ color: 'black', fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {activeComplaints.map((complaint) => (
                <TableRow key={complaint.id} hover>
                  <TableCell>{complaint.title}</TableCell>
                  <TableCell>
                    <Chip 
                      label={complaint.priority} 
                      color={
                        complaint.priority.toLowerCase() === 'high' ? 'error' : 
                        complaint.priority.toLowerCase() === 'medium' ? 'warning' : 'info'
                      } 
                      size="small" 
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={complaint.status} 
                      color={
                        complaint.status.toLowerCase() === 'open' ? 'info' : 
                        complaint.status.toLowerCase() === 'in_progress' ? 'warning' : 
                        complaint.status.toLowerCase() === 'forwarded' ? 'secondary' : 'success'
                      } 
                      size="small" 
                    />
                  </TableCell>
                  <TableCell>
                    {complaint.asset ? complaint.asset.name : 
                     (complaint.asset_id ? `Asset ID: ${complaint.asset_id.substring(0, 8)}...` : 'General Issue')}
                  </TableCell>
                  <TableCell>
                    {new Date(complaint.date_submitted).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <IconButton 
                        size="small" 
                        color="primary"
                        onClick={() => {
                          handleComplaintClick(complaint);
                          setActiveChatTab(0); // Details tab
                        }}
                      >
                        <ViewIcon fontSize="small" />
                      </IconButton>
                      <Badge 
                        badgeContent={complaint.replies?.filter(r => r.from_user === "ATS Team").length || 0} 
                        color="primary"
                        overlap="circular"
                      >
                        <IconButton 
                          size="small" 
                          color="secondary"
                          onClick={() => {
                            handleComplaintClick(complaint);
                            setActiveChatTab(1); // Chat tab
                          }}
                        >
                          <ChatIcon fontSize="small" />
                        </IconButton>
                      </Badge>
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => handleDeleteComplaint(complaint.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Box textAlign="center" py={4}>
          <Typography variant="h6" color="textSecondary">
            You don't have any active complaints
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setCreateComplaintDialogOpen(true)}
            sx={{ mt: 2 }}
          >
            Create New Complaint
          </Button>
        </Box>
      )}
    </Box>
  );
  
  // Complaint History section - Resolved complaints
  const renderComplaintHistory = (): JSX.Element => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant={isMobile ? "h5" : "h4"} gutterBottom>
          Complaint History
        </Typography>
        <TextField
          placeholder="Search complaints..."
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ width: 250 }}
        />
      </Box>
      
      {isLoading && <LinearProgress sx={{ mb: 2 }} />}
      
      {resolvedComplaints.length > 0 ? (
        <TableContainer component={Paper} sx={{ boxShadow: 2, borderRadius: '8px' }}>
          <Table size={isMobile ? "small" : "medium"}>
            <TableHead sx={{ bgcolor: theme.palette.success.main }}>
              <TableRow>
                <TableCell sx={{ color: 'black', fontWeight: 'bold' }}>Title</TableCell>
                <TableCell sx={{ color: 'black', fontWeight: 'bold' }}>Priority</TableCell>
                <TableCell sx={{ color: 'black', fontWeight: 'bold' }}>Asset</TableCell>
                <TableCell sx={{ color: 'black', fontWeight: 'bold' }}>Date Submitted</TableCell>
                <TableCell sx={{ color: 'black', fontWeight: 'bold' }}>Resolution Date</TableCell>
                <TableCell sx={{ color: 'black', fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {resolvedComplaints
                .filter(complaint => 
                  searchQuery ? 
                    complaint.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    complaint.description.toLowerCase().includes(searchQuery.toLowerCase())
                  : true
                )
                .map((complaint) => (
                  <TableRow key={complaint.id} hover>
                    <TableCell>{complaint.title}</TableCell>
                    <TableCell>
                      <Chip 
                        label={complaint.priority} 
                        color={
                          complaint.priority.toLowerCase() === 'high' ? 'error' : 
                          complaint.priority.toLowerCase() === 'medium' ? 'warning' : 'info'
                        } 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell>
                      {complaint.asset ? complaint.asset.name : 
                       (complaint.asset_id ? `Asset ID: ${complaint.asset_id.substring(0, 8)}...` : 'General Issue')}
                    </TableCell>
                    <TableCell>
                      {new Date(complaint.date_submitted).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {complaint.resolution_date ? 
                        new Date(complaint.resolution_date).toLocaleDateString() : 
                        new Date(complaint.last_updated).toLocaleDateString()
                      }
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <IconButton 
                          size="small" 
                          color="primary"
                          onClick={() => {
                            handleComplaintClick(complaint);
                            setActiveChatTab(0); // Details tab
                          }}
                        >
                          <ViewIcon fontSize="small" />
                        </IconButton>
                        <Badge 
                          badgeContent={complaint.replies?.filter(r => r.from_user === "ATS Team").length || 0} 
                          color="primary"
                          overlap="circular"
                        >
                          <IconButton 
                            size="small" 
                            color="secondary"
                            onClick={() => {
                              handleComplaintClick(complaint);
                              setActiveChatTab(1); // Chat tab
                            }}
                          >
                            <ChatIcon fontSize="small" />
                          </IconButton>
                        </Badge>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Box textAlign="center" py={4}>
          <Typography variant="h6" color="textSecondary">
            You don't have any resolved complaints
          </Typography>
        </Box>
      )}
    </Box>
  );
  
  // Assets section - Assigned assets
  const renderAssets = (): JSX.Element => (
    <Box>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        mb: 3 
      }}>
        <Typography variant={isMobile ? "h5" : "h4"} fontWeight="medium">
          My Assets
        </Typography>
        <Button
          startIcon={<RefreshIcon />}
          onClick={() => {
            setIsLoading(true);
            fetchEmployeeAssets()
              .finally(() => {
                setTimeout(() => setIsLoading(false), 500);
              });
          }}
          variant="contained"
          size={isMobile ? "small" : "medium"}
        >
          Refresh Assets
        </Button>
      </Box>
      
      {isLoading && <LinearProgress sx={{ mb: 3, borderRadius: 1 }} />}
      
      {assets.length > 0 ? (
        <Grid container spacing={3} mt={1}>
          {assets.map((asset) => (
            <Grid item xs={12} sm={6} md={4} key={asset.id}>
              <Card sx={{ 
                height: '100%', 
                boxShadow: 3,
                borderRadius: 2,
                transition: 'transform 0.3s, box-shadow 0.3s',
                overflow: 'hidden',
                position: 'relative',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: 6
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '4px',
                  backgroundColor: 
                    asset.condition === 'new' ? theme.palette.success.main :
                    asset.condition === 'good' ? theme.palette.info.main :
                    asset.condition === 'fair' ? theme.palette.warning.main :
                    theme.palette.error.main
                }
              }}>
                <CardContent sx={{ p: 3, pb: 2 }}>
                  <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography 
                      variant="h6" 
                      component="div" 
                      fontWeight="bold"
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        lineHeight: 1.4
                      }}
                    >
                      <AssetsIcon 
                        sx={{ 
                          mr: 1, 
                          color: 
                            asset.type.toLowerCase().includes('laptop') ? 'primary.main' :
                            asset.type.toLowerCase().includes('desktop') ? 'info.main' :
                            asset.type.toLowerCase().includes('phone') ? 'success.main' :
                            asset.type.toLowerCase().includes('tablet') ? 'warning.main' :
                            'text.secondary'
                        }} 
                      />
                      {asset.name}
                    </Typography>
                    <Chip 
                      size="small"
                      label={asset.type} 
                      color="primary"
                      variant="outlined"
                    />
                  </Box>
                  
                  <Divider sx={{ mb: 2 }} />
                  
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Status
                      </Typography>
                      <Chip 
                        size="small"
                        label={asset.status} 
                        color={
                          asset.status === 'assigned' ? 'primary' :
                          asset.status === 'available' ? 'success' :
                          'default'
                        }
                        sx={{ 
                          fontWeight: 'medium',
                          minWidth: '80px'
                        }}
                      />
                    </Grid>
                    
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Condition
                      </Typography>
                      <Chip 
                        size="small"
                        label={asset.condition} 
                        color={
                          asset.condition === 'new' ? 'success' :
                          asset.condition === 'good' ? 'info' :
                          asset.condition === 'fair' ? 'warning' :
                          'error'
                        }
                        sx={{ 
                          fontWeight: 'medium',
                          minWidth: '80px'
                        }}
                      />
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Serial Number
                      </Typography>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontFamily: 'monospace', 
                          backgroundColor: 'grey.100', 
                          p: 1, 
                          borderRadius: 1,
                          wordBreak: 'break-all'
                        }}
                      >
                        {asset.serial_number}
                      </Typography>
                    </Grid>
                    
                    {asset.assigned_date && (
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Assigned Date
                        </Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {new Date(asset.assigned_date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </Typography>
                      </Grid>
                    )}
                    
                    {asset.specifications && (
                      <Grid item xs={12}>
                        <Accordion 
                          disableGutters 
                          elevation={0}
                          sx={{ 
                            '&:before': { display: 'none' },
                            backgroundColor: 'transparent'
                          }}
                        >
                          <AccordionSummary
                            expandIcon={<ExpandMoreIcon />}
                            sx={{ p: 0, minHeight: 'unset' }}
                          >
                            <Typography variant="subtitle2" color="text.secondary">
                              Specifications
                            </Typography>
                          </AccordionSummary>
                          <AccordionDetails sx={{ px: 0, pt: 0 }}>
                            <Typography 
                              variant="body2" 
                              color="text.secondary"
                              sx={{ 
                                whiteSpace: 'pre-line', 
                                backgroundColor: 'grey.50',
                                p: 1.5,
                                borderRadius: 1,
                                border: '1px solid',
                                borderColor: 'grey.200'
                              }}
                            >
                              {asset.specifications}
                            </Typography>
                          </AccordionDetails>
                        </Accordion>
                      </Grid>
                    )}
                    
                    {/* Add the Complaint History accordion */}
                    <Grid item xs={12}>
                      <Accordion 
                        disableGutters 
                        elevation={0}
                        sx={{ 
                          '&:before': { display: 'none' },
                          backgroundColor: 'transparent'
                        }}
                      >
                        <AccordionSummary
                          expandIcon={<ExpandMoreIcon />}
                          sx={{ p: 0, minHeight: 'unset' }}
                        >
                          <Typography variant="subtitle2" color="text.secondary">
                            Complaint History {assetComplaints[asset.id] && assetComplaints[asset.id].length > 0 && 
                              `(${assetComplaints[asset.id].length})`}
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails sx={{ px: 0, pt: 0 }}>
                          {assetComplaints[asset.id] && assetComplaints[asset.id].length > 0 ? (
                            <>
                              <List dense disablePadding>
                                {assetComplaints[asset.id].map((complaint) => (
                                  <ListItem 
                                    key={complaint.id}
                                    disablePadding
                                    sx={{ 
                                      mb: 1,
                                      borderLeft: '3px solid',
                                      borderColor: 
                                        complaint.status.toLowerCase() === 'resolved' ? 'success.main' :
                                        complaint.priority.toLowerCase() === 'high' ? 'error.main' :
                                        complaint.priority.toLowerCase() === 'medium' ? 'warning.main' : 'info.main',
                                      pl: 1
                                    }}
                                    secondaryAction={
                                      <IconButton 
                                        edge="end" 
                                        size="small"
                                        onClick={() => handleComplaintClick(complaint)}
                                      >
                                        <ViewIcon fontSize="small" />
                                      </IconButton>
                                    }
                                  >
                                    <ListItemText
                                      primary={
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                            {complaint.title}
                                          </Typography>
                                          <Chip 
                                            label={complaint.status} 
                                            size="small"
                                            sx={{ height: 20, fontSize: '0.7rem' }}
                                            color={
                                              complaint.status.toLowerCase() === 'resolved' ? 'success' :
                                              complaint.status.toLowerCase() === 'in_progress' ? 'warning' : 'info'
                                            }
                                          />
                                        </Box>
                                      }
                                      secondary={`Submitted on ${new Date(complaint.date_submitted).toLocaleDateString()}`}
                                    />
                                  </ListItem>
                                ))}
                              </List>
                            </>
                          ) : (
                            <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                              No complaints reported for this asset.
                            </Typography>
                          )}
                          
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<AddIcon />}
                            onClick={() => {
                              setNewComplaint(prev => ({
                                ...prev,
                                asset_id: asset.id
                              }));
                              setCreateComplaintDialogOpen(true);
                            }}
                            sx={{ mt: 1 }}
                          >
                            Create New Complaint
                          </Button>
                        </AccordionDetails>
                      </Accordion>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Box 
          textAlign="center" 
          py={6} 
          px={3}
          sx={{
            backgroundColor: 'grey.50',
            borderRadius: 2,
            border: '1px dashed',
            borderColor: 'grey.300'
          }}
        >
          {!isLoading && (
            <>
              <Computer sx={{ fontSize: 60, color: 'grey.400', mb: 2 }} />
              <Typography variant="h6" color="textSecondary" gutterBottom>
                You don't have any assigned assets
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                If you believe this is an error, please contact IT support or try refreshing.
              </Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<RefreshIcon />}
                onClick={() => {
                  setIsLoading(true);
                  fetchEmployeeAssets()
                    .finally(() => {
                      setTimeout(() => setIsLoading(false), 500);
                    });
                }}
              >
                Refresh Assets
              </Button>
            </>
          )}
        </Box>
      )}
    </Box>
  );
  
  // Profile section - Employee details
  const renderProfile = (): JSX.Element => (
    <Box>
      <Typography variant={isMobile ? "h5" : "h4"} gutterBottom mb={4}>
        My Profile
      </Typography>
      
      {isLoading && <LinearProgress sx={{ mb: 2 }} />}
      
      {employeeProfile ? (
        <Grid container spacing={3}>
          <Grid item xs={12} sm={4} md={3}>
            <Card sx={{ height: '100%', boxShadow: 2, textAlign: 'center', p: 2 }}>
              <Avatar 
                sx={{ 
                  width: 120, 
                  height: 120, 
                  margin: '0 auto', 
                  bgcolor: theme.palette.primary.main,
                  fontSize: '3rem'
                }}
              >
                {employeeProfile.name.charAt(0).toUpperCase()}
              </Avatar>
              <Typography variant="h5" component="div" mt={2}>
                {employeeProfile.name}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {employeeProfile.role}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Box textAlign="left">
                <Typography variant="body2" gutterBottom>
                  <strong>Department:</strong> {employeeProfile.department}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Email:</strong> {employeeProfile.email}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Joined:</strong> {new Date(employeeProfile.date_joined).toLocaleDateString()}
                </Typography>
              </Box>
            </Card>
          </Grid>
          <Grid item xs={12} sm={8} md={9}>
            <Card sx={{ height: '100%', boxShadow: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Employee Information
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body1">
                      <strong>Name:</strong> {employeeProfile.name}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body1">
                      <strong>Email:</strong> {employeeProfile.email}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body1">
                      <strong>Department:</strong> {employeeProfile.department}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body1">
                      <strong>Role:</strong> {employeeProfile.role}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body1">
                      <strong>Phone:</strong> {employeeProfile.phone_number || 'Not provided'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body1">
                      <strong>Location:</strong> {employeeProfile.location || 'Not provided'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body1">
                      <strong>Join Date:</strong> {new Date(employeeProfile.date_joined).toLocaleDateString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body1">
                      <strong>Employee ID:</strong> {employeeProfile.id}
                    </Typography>
                  </Grid>
                </Grid>
                
                <Box mt={4}>
                  <Typography variant="h6" gutterBottom>
                    Account Summary
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={4}>
                      <Card sx={{ bgcolor: theme.palette.primary.light, color: 'white', p: 2 }}>
                        <Typography variant="h4" align="center">{activeComplaints.length}</Typography>
                        <Typography variant="body1" align="center">Active Complaints</Typography>
                      </Card>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Card sx={{ bgcolor: theme.palette.success.light, color: 'white', p: 2 }}>
                        <Typography variant="h4" align="center">{resolvedComplaints.length}</Typography>
                        <Typography variant="body1" align="center">Resolved Complaints</Typography>
                      </Card>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Card sx={{ bgcolor: theme.palette.info.light, color: 'white', p: 2 }}>
                        <Typography variant="h4" align="center">{assets.length}</Typography>
                        <Typography variant="body1" align="center">Assigned Assets</Typography>
                      </Card>
                    </Grid>
                  </Grid>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      ) : (
        <Box textAlign="center" py={4}>
          <Typography variant="h6" color="textSecondary">
            Unable to load profile information
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={handleRefresh}
            sx={{ mt: 2 }}
          >
            Retry
          </Button>
        </Box>
      )}
    </Box>
  );
  
  // Complaint Details Dialog
  const renderComplaintDialog = (): JSX.Element => (
    <Dialog
      open={complaintDialogOpen}
      onClose={() => setComplaintDialogOpen(false)}
      fullWidth
      maxWidth="md"
    >
      {selectedComplaint && (
        <>
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">{selectedComplaint.title}</Typography>
              <Chip 
                label={selectedComplaint.status} 
                color={
                  selectedComplaint.status.toLowerCase() === 'open' ? 'info' : 
                  selectedComplaint.status.toLowerCase() === 'in_progress' ? 'warning' : 
                  selectedComplaint.status.toLowerCase() === 'forwarded' ? 'secondary' : 'success'
                }
                size="small"
              />
            </Box>
            <Typography variant="caption" color="textSecondary">
              Submitted on {new Date(selectedComplaint.date_submitted).toLocaleString()}
            </Typography>
            <Tabs
              value={activeChatTab}
              onChange={(_, newValue) => setActiveChatTab(newValue)}
              sx={{ mt: 1 }}
            >
              <Tab label="Details" />
              <Tab 
                label="Chat" 
                icon={
                  <Badge 
                    badgeContent={selectedComplaint.replies?.filter(r => r.from_user === "ATS Team").length || 0}
                    color="primary"
                  >
                    <ChatIcon />
                  </Badge>
                } 
                iconPosition="start"
              />
            </Tabs>
          </DialogTitle>
          <DialogContent dividers>
            {activeChatTab === 0 ? (
              // Details tab
              <>
                <Box mb={3}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item>
                      <Chip 
                        label={`Priority: ${selectedComplaint.priority}`} 
                        color={
                          selectedComplaint.priority.toLowerCase() === 'high' ? 'error' : 
                          selectedComplaint.priority.toLowerCase() === 'medium' ? 'warning' : 'info'
                        }
                        size="small" 
                      />
                    </Grid>
                    <Grid item>
                      <Chip 
                        label={`Status: ${selectedComplaint.status}`} 
                        color={
                          selectedComplaint.status.toLowerCase() === 'open' ? 'info' : 
                          selectedComplaint.status.toLowerCase() === 'in_progress' ? 'warning' : 
                          selectedComplaint.status.toLowerCase() === 'forwarded' ? 'secondary' : 'success'
                        }
                        size="small" 
                      />
                    </Grid>
                  </Grid>
                </Box>
                
                <Typography variant="subtitle1" gutterBottom>Description:</Typography>
                <Typography variant="body1" paragraph>
                  {selectedComplaint.description}
                </Typography>
                
                {/* Display asset information */}
                {selectedComplaint.asset_id && (
                  <>
                    <Typography variant="subtitle1" gutterBottom>Related Asset:</Typography>
                    <Paper elevation={1} sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                      {selectedComplaint.asset ? (
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2">
                              <strong>Name:</strong> {selectedComplaint.asset.name}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2">
                              <strong>Type:</strong> {selectedComplaint.asset.type}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2">
                              <strong>Serial Number:</strong> {selectedComplaint.asset.serial_number}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2">
                              <strong>Status:</strong> {selectedComplaint.asset.status}
                            </Typography>
                          </Grid>
                          {selectedComplaint.asset.specifications && (
                            <Grid item xs={12}>
                              <Typography variant="body2">
                                <strong>Specifications:</strong> {selectedComplaint.asset.specifications}
                              </Typography>
                            </Grid>
                          )}
                        </Grid>
                      ) : (
                        <Typography variant="body1">
                          Asset ID: {selectedComplaint.asset_id} (Details not available)
                        </Typography>
                      )}
                    </Paper>
                  </>
                )}
                
                {/* Display attached images */}
                {selectedComplaint.images && selectedComplaint.images.length > 0 && (
                  <>
                    <Typography variant="subtitle1" gutterBottom>Attached Images:</Typography>
                    <Box sx={{ mb: 2 }}>
                      <Grid container spacing={2}>
                        {selectedComplaint.images.map((imagePath, index) => (
                          <Grid item xs={6} sm={4} md={3} key={index}>
                            <Paper 
                              elevation={2} 
                              sx={{ 
                                p: 1, 
                                cursor: 'pointer',
                                '&:hover': { elevation: 4 }
                              }}
                              onClick={() => {
                                // Open image in new tab for full view
                                window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/${imagePath}`, '_blank');
                              }}
                            >
                              <img
                                src={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/${imagePath}`}
                                alt={`Complaint image ${index + 1}`}
                                style={{
                                  width: '100%',
                                  height: 120,
                                  objectFit: 'cover',
                                  borderRadius: 4,
                                  display: 'block'
                                }}
                                onError={(e) => {
                                  // Handle broken image
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  target.parentElement!.innerHTML = `
                                    <div style="
                                      width: 100%; 
                                      height: 120px; 
                                      display: flex; 
                                      align-items: center; 
                                      justify-content: center; 
                                      background-color: #f5f5f5; 
                                      color: #666;
                                      border-radius: 4px;
                                    ">
                                      Image not available
                                    </div>
                                  `;
                                }}
                              />
                              <Typography variant="caption" display="block" sx={{ mt: 0.5, textAlign: 'center' }}>
                                Click to view full size
                              </Typography>
                            </Paper>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  </>
                )}
                
                {selectedComplaint.resolution_notes && (
                  <>
                    <Typography variant="subtitle1" gutterBottom>Resolution Notes:</Typography>
                    <Typography variant="body1" paragraph>
                      {selectedComplaint.resolution_notes}
                    </Typography>
                  </>
                )}
              </>
            ) : (
              // Chat tab
              <Box sx={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
                <Typography variant="subtitle1" gutterBottom>
                  Chat with IT Support Team
                </Typography>
                <Box
                  sx={{
                    flexGrow: 1,
                    overflowY: 'auto',
                    bgcolor: 'grey.50',
                    borderRadius: 1,
                    p: 2,
                    mb: 2,
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {isLoading ? (
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '100%',
                      }}
                    >
                      <LinearProgress sx={{ width: '50%', mb: 2 }} />
                      <Typography variant="body2" color="textSecondary">
                        Loading messages...
                      </Typography>
                    </Box>
                  ) : selectedComplaint.replies && selectedComplaint.replies.length > 0 ? (
                    selectedComplaint.replies.map((reply, index) => (
                      <Box
                        key={reply.id || index}
                        sx={{
                          alignSelf: reply.from_user === "ATS Team" ? 'flex-start' : 'flex-end',
                          mb: 2,
                          maxWidth: '80%',
                        }}
                      >
                        <Paper
                          elevation={1}
                          sx={{
                            p: 1.5,
                            borderRadius: 2,
                            bgcolor: reply.from_user === "ATS Team" ? 'grey.100' : 'primary.light',
                            color: reply.from_user === "ATS Team" ? 'inherit' : 'white',
                          }}
                        >
                          <Typography variant="body2">{reply.message}</Typography>
                        </Paper>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: reply.from_user === "ATS Team" ? 'flex-start' : 'flex-end',
                            mt: 0.5,
                            px: 1,
                          }}
                        >
                          <Typography variant="caption" color="textSecondary">
                            {new Date(reply.timestamp).toLocaleString()} • {reply.from_user}
                          </Typography>
                        </Box>
                      </Box>
                    ))
                  ) : (
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '100%',
                      }}
                    >
                      <Typography variant="body2" color="textSecondary">
                        No messages yet. Start the conversation with IT Support.
                      </Typography>
                    </Box>
                  )}
                </Box>
                {/* Only show chat input if complaint is not resolved */}
                {selectedComplaint.status.toLowerCase() !== 'resolved' && (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                      fullWidth
                      size={isMobile ? "small" : "medium"}
                      placeholder="Type your message..."
                      multiline
                      rows={2}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              color="primary"
                              onClick={handleSendReply}
                              disabled={!replyText.trim()}
                              sx={{ alignSelf: 'flex-end' }}
                            >
                              <SendIcon />
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendReply();
                        }
                      }}
                    />
                  </Box>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setComplaintDialogOpen(false)}>
              Close
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
  
  // Complaint Create Dialog
  const renderCreateComplaintDialog = (): JSX.Element => (
    <Dialog
      open={createComplaintDialogOpen}
      onClose={() => setCreateComplaintDialogOpen(false)}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle>Create New Complaint</DialogTitle>
      <DialogContent dividers>
        <Box component="form" noValidate autoComplete="off">
          <TextField
            name="title"
            label="Title"
            value={newComplaint.title}
            onChange={handleComplaintInputChange}
            fullWidth
            required
            margin="normal"
            variant="outlined"
            helperText="Title must be at least 5 characters"
            error={newComplaint.title.trim().length > 0 && newComplaint.title.trim().length < 5}
          />
          
          <FormControl fullWidth margin="normal" variant="outlined" required>
            <InputLabel id="asset-label">Select Asset</InputLabel>
            <Select
              labelId="asset-label"
              name="asset_id"
              value={newComplaint.asset_id}
              onChange={handleComplaintInputChange}
              label="Select Asset"
              displayEmpty
            >
              <MenuItem value="" disabled>
                <em>Select an asset to report</em>
              </MenuItem>
              {assets.map((asset) => (
                <MenuItem key={asset.id} value={asset.id}>
                  {asset.name} - {asset.type} ({asset.serial_number})
                </MenuItem>
              ))}
            </Select>
            {assets.length === 0 && (
              <Typography variant="caption" color="error">
                No assets assigned to you. Contact IT support if this is incorrect.
              </Typography>
            )}
          </FormControl>
          
          <FormControl fullWidth margin="normal" variant="outlined">
            <InputLabel id="priority-label">Priority</InputLabel>
            <Select
              fullWidth
              name="priority"
              value={newComplaint.priority}
              onChange={handleComplaintInputChange}
              label="Priority"
            >
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="critical">Critical</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            name="description"
            label="Description"
            value={newComplaint.description}
            onChange={handleComplaintInputChange}
            fullWidth
            required
            margin="normal"
            variant="outlined"
            multiline
            rows={5}
            helperText="Description must be at least 10 characters"
            error={newComplaint.description.trim().length > 0 && newComplaint.description.trim().length < 10}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setCreateComplaintDialogOpen(false)}>Cancel</Button>
        <Button 
          onClick={handleCreateComplaint} 
          variant="contained" 
          color="primary"
          disabled={isLoading || !newComplaint.asset_id || !newComplaint.title || !newComplaint.description}
        >
          {isLoading ? 'Submitting...' : 'Submit Complaint'}
        </Button>
      </DialogActions>
    </Dialog>
  );
  
  return (
    <DashboardLayout title="Employee Portal" menuItems={menuItems}>
      <Box p={3}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{
            mb: 3,
            borderBottom: 1,
            borderColor: 'divider'
          }}
        >
          <Tab 
            icon={<DashboardIcon fontSize="small" />} 
            label={!isMobile && "Dashboard"} 
            iconPosition="start"
          />
          <Tab 
            icon={<HistoryIcon fontSize="small" />} 
            label={!isMobile && "Complaint History"} 
            iconPosition="start"
          />
          <Tab 
            icon={<AssetsIcon fontSize="small" />} 
            label={!isMobile && "My Assets"} 
            iconPosition="start"
          />
          <Tab 
            icon={<ProfileIcon fontSize="small" />} 
            label={!isMobile && "Profile"} 
            iconPosition="start"
          />
        </Tabs>
        
        {activeTab === 0 && renderDashboard()}
        {activeTab === 1 && renderComplaintHistory()}
        {activeTab === 2 && renderAssets()}
        {activeTab === 3 && renderProfile()}
        
        {renderComplaintDialog()}
        {renderCreateComplaintDialog()}
        
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={6000}
          onClose={() => setSnackbarOpen(false)}
        >
          <Alert 
            onClose={() => setSnackbarOpen(false)} 
            severity={snackbarSeverity} 
            sx={{ width: '100%' }}
          >
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </Box>
    </DashboardLayout>
  );
};

export default EmployeePortal;
