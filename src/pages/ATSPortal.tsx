import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import {
  BugReport as ComplaintsIcon,
  History as HistoryIcon,
  Dashboard as DashboardIcon,
  Visibility as ViewIcon,
  Send as SendIcon,
  Forward as ForwardIcon,
  CheckCircle as ResolvedIcon,
  MoreVert as MoreIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Assignment as AssignmentIcon,
  Chat as ChatIcon
} from '@mui/icons-material';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  useTheme,
  useMediaQuery,
  IconButton,
  Divider,
  Snackbar,
  Grid,
  Card,
  CardContent,
  Avatar,
  Tab,
  Tabs,
  Alert,
  InputAdornment,
  Badge,
  Tooltip,
  LinearProgress,
  Menu,
  MenuItem,
  Stack,
  styled
} from '@mui/material';
import api from '../utils/axios';
import complaintService, { Complaint, Reply, ReplyCreate } from '../services/complaintService';

// Define interfaces for data types
interface IEmployee {
  id: string;
  name: string;
  email: string;
  department: string;
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
  date_submitted: string;
  last_updated: string;
  resolution_date?: string;
  resolution_notes?: string;
  component_purchase_reason?: string;
  replies: IReply[];
  images?: string[];
}

const ATSPortal = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const [complaints, setComplaints] = useState<IComplaint[]>([]);
  const [resolvedComplaints, setResolvedComplaints] = useState<IComplaint[]>([]);
  const [complaintDialogOpen, setComplaintDialogOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<IComplaint | null>(null);
  const [replyText, setReplyText] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'info' | 'warning' | 'error'>('info');
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [activeChatTab, setActiveChatTab] = useState(0);
  
  // Component Purchase Dialog states
  const [componentDialogOpen, setComponentDialogOpen] = useState(false);
  const [componentPurchaseReason, setComponentPurchaseReason] = useState('');
  const [complaintToForward, setComplaintToForward] = useState<IComplaint | null>(null);

  const menuItems = [
    {
      icon: <DashboardIcon />,
      text: 'Dashboard',
      onClick: () => setActiveTab(0),
    },
    {
      icon: <ComplaintsIcon />,
      text: 'Active Complaints',
      onClick: () => setActiveTab(1),
    },
    {
      icon: <HistoryIcon />,
      text: 'Resolved Complaints',
      onClick: () => setActiveTab(2),
    },
  ];

  const fetchComplaints = async () => {
    try {
      setIsLoading(true);
      // Fetch all complaints and filter for active ones (open and in_progress)
      const response = await api.get('/complaints/all');
      setComplaints(response.data.filter((complaint: IComplaint) => 
        complaint.status === 'open' || complaint.status === 'in_progress'
      ));
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching active complaints:', error);
      setSnackbarMessage('Failed to fetch active complaints');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      setIsLoading(false);
    }
  };

  const fetchResolvedComplaints = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/complaints/all?status=resolved');
      setResolvedComplaints(response.data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching resolved complaints:', error);
      setSnackbarMessage('Failed to fetch resolved complaints');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
    fetchResolvedComplaints();
  }, []);

  const handleComplaintClick = async (complaint: IComplaint) => {
    try {
      setIsLoading(true);
      // First set the complaint to show loading state
      setSelectedComplaint(complaint);
      setComplaintDialogOpen(true);
      setReplyText('');
      
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

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedComplaint) return;
    
    try {
      setIsLoading(true);
      const replyData = { 
        complaint_id: selectedComplaint.id,
        message: replyText.trim(), 
        from_user: "ATS Team",
        user_id: undefined // No user ID tracking for now
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
        await fetchComplaints();
        
        // Find the updated complaint in the state
        const updatedComplaint = complaints.find(c => c.id === selectedComplaint.id);
        const updatedResolvedComplaint = resolvedComplaints.find(c => c.id === selectedComplaint.id);
        
        // Get the right complaint object
        const complaintToUpdate = updatedComplaint || updatedResolvedComplaint;
        
        if (complaintToUpdate) {
          // Get the replies for this complaint
          const replies = await complaintService.getComplaintReplies(selectedComplaint.id);
          
          // Update the selected complaint with the new data
          setSelectedComplaint({
            ...complaintToUpdate,
            replies: replies
          });
        } else {
          // Fallback if we can't find the complaint in our state
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

  const handleShowComponentDialog = (complaint: IComplaint) => {
    setComplaintToForward(complaint);
    setComponentPurchaseReason('');
    setComponentDialogOpen(true);
  };

  const handleForwardWithComponents = async () => {
    if (!complaintToForward || !componentPurchaseReason.trim()) {
      setSnackbarMessage('Please enter component purchase details');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    if (componentPurchaseReason.trim().length < 10) {
      setSnackbarMessage('Component purchase reason must be at least 10 characters');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    try {
      setIsLoading(true);
      
      // Use the new API endpoint for forwarding with component details
      const response = await api.patch(`/complaints/${complaintToForward.id}/forward`, {
        component_purchase_reason: componentPurchaseReason.trim(),
        status: 'forwarded'
      });
      
      if (response.status === 200) {
        // Refresh the complaints list
        await fetchComplaints();
        
        setSnackbarMessage('Complaint forwarded to Assistant Manager with component details successfully');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        
        // Close dialogs
        setComponentDialogOpen(false);
        setComplaintDialogOpen(false);
        setSelectedComplaint(null);
        setComplaintToForward(null);
        setComponentPurchaseReason('');
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error forwarding complaint with components:', error);
      
      let errorMessage = 'Failed to forward complaint with component details';
      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as { response?: { data?: any, status?: number } };
        if (apiError.response?.data?.detail) {
          errorMessage = apiError.response.data.detail;
        }
      }
      
      setSnackbarMessage(errorMessage);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      setIsLoading(false);
    }
  };

  const handleForwardToAssistantManager = async (complaint: IComplaint) => {
    // Show the component purchase dialog instead of directly forwarding
    handleShowComponentDialog(complaint);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleRefresh = () => {
    fetchComplaints();
    fetchResolvedComplaints();
  };

  const handleResolveComplaint = async (complaint: IComplaint) => {
    if (!complaint) return;
    
    try {
      setIsLoading(true);
      
      // Use complaintService instead of direct API call
      await complaintService.resolveComplaint(complaint.id, 'Resolved by ATS team');
      
      // Refresh both complaint lists
      await fetchComplaints();
      await fetchResolvedComplaints();
      
      setSnackbarMessage('Complaint marked as resolved');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      setSelectedComplaint(null);
      setComplaintDialogOpen(false);
      setIsLoading(false);
    } catch (error) {
      console.error('Error resolving complaint:', error);
      // More detailed error information
      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as { response?: { data?: any, status?: number } };
        console.error('Error response data:', apiError.response?.data);
        console.error('Error response status:', apiError.response?.status);
      }
      setSnackbarMessage('Failed to resolve complaint');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      setIsLoading(false);
    }
  };

  const renderDashboard = () => {
    const highPriorityCount = complaints.filter(c => c.priority === 'High' || c.priority === 'high').length;
    const openCount = complaints.filter(c => c.status === 'Open' || c.status === 'open').length;
    const inProgressCount = complaints.filter(c => c.status === 'In Progress' || c.status === 'in_progress').length;
    const resolvedCount = resolvedComplaints.length;
    
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant={isMobile ? "h6" : "h5"}>ATS Dashboard</Typography>
          <Button 
            startIcon={<RefreshIcon />} 
            onClick={handleRefresh}
            size={isMobile ? "small" : "medium"}
          >
            Refresh
          </Button>
        </Box>
        
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              height: '100%', 
              boxShadow: 2,
              transition: 'transform 0.3s, box-shadow 0.3s',
              '&:hover': {
                transform: 'translateY(-5px)',
                boxShadow: 4,
              },
              background: 'linear-gradient(45deg, #ff9800 30%, #ffb74d 90%)'
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography color="white" variant="subtitle2" gutterBottom>
                      Open Tickets
                    </Typography>
                    <Typography color="white" variant="h4" component="div">
                      {openCount}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)', color: 'white' }}>
                    <ComplaintsIcon />
                  </Avatar>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={(openCount / (complaints.length || 1)) * 100} 
                  sx={{ mt: 2, bgcolor: 'rgba(255, 255, 255, 0.3)' }}
                />
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              height: '100%', 
              boxShadow: 2,
              transition: 'transform 0.3s, box-shadow 0.3s',
              '&:hover': {
                transform: 'translateY(-5px)',
                boxShadow: 4,
              },
              background: 'linear-gradient(45deg, #f44336 30%, #ef5350 90%)'
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography color="white" variant="subtitle2" gutterBottom>
                      High Priority
                    </Typography>
                    <Typography color="white" variant="h4" component="div">
                      {highPriorityCount}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)', color: 'white' }}>
                    <AssignmentIcon />
                  </Avatar>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={(highPriorityCount / (complaints.length || 1)) * 100} 
                  sx={{ mt: 2, bgcolor: 'rgba(255, 255, 255, 0.3)' }}
                />
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              height: '100%', 
              boxShadow: 2,
              transition: 'transform 0.3s, box-shadow 0.3s',
              '&:hover': {
                transform: 'translateY(-5px)',
                boxShadow: 4,
              },
              background: 'linear-gradient(45deg, #2196f3 30%, #64b5f6 90%)'
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography color="white" variant="subtitle2" gutterBottom>
                      In Progress
                    </Typography>
                    <Typography color="white" variant="h4" component="div">
                      {inProgressCount}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)', color: 'white' }}>
                    <HistoryIcon />
                  </Avatar>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={(inProgressCount / (complaints.length || 1)) * 100} 
                  sx={{ mt: 2, bgcolor: 'rgba(255, 255, 255, 0.3)' }}
                />
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              height: '100%', 
              boxShadow: 2,
              transition: 'transform 0.3s, box-shadow 0.3s',
              '&:hover': {
                transform: 'translateY(-5px)',
                boxShadow: 4,
              },
              background: 'linear-gradient(45deg, #4caf50 30%, #81c784 90%)'
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography color="white" variant="subtitle2" gutterBottom>
                      Resolved
                    </Typography>
                    <Typography color="white" variant="h4" component="div">
                      {resolvedCount}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)', color: 'white' }}>
                    <ResolvedIcon />
                  </Avatar>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={100} 
                  sx={{ mt: 2, bgcolor: 'rgba(255, 255, 255, 0.3)' }}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>Recent Complaints</Typography>
          <TableContainer component={Paper} sx={{ overflowX: 'auto', boxShadow: 2 }}>
            <Table size={isMobile ? "small" : "medium"}>
              <TableHead sx={{ bgcolor: theme.palette.primary.main }}>
                <TableRow>
                  <TableCell sx={{ color: 'white' }}>ID</TableCell>
                  <TableCell sx={{ color: 'white' }}>Title</TableCell>
                  <TableCell sx={{ color: 'white' }}>Priority</TableCell>
                  <TableCell sx={{ color: 'white' }}>Status</TableCell>
                  <TableCell sx={{ color: 'white' }}>Submitted By</TableCell>
                  <TableCell sx={{ color: 'white' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {complaints.slice(0, 5).map((complaint) => (
                  <TableRow key={complaint.id} hover>
                    <TableCell>{complaint.id.substring(0, 8)}...</TableCell>
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
                          complaint.status.toLowerCase() === 'in_progress' ? 'warning' : 'success'
                        }
                        size="small" 
                      />
                    </TableCell>
                    <TableCell>{complaint.employee.name}</TableCell>
                    <TableCell>
                      <Button 
                        variant="outlined" 
                        size="small" 
                        onClick={() => handleComplaintClick(complaint)}
                        startIcon={<ViewIcon />}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {complaints.length > 5 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Button 
                variant="text" 
                onClick={() => setActiveTab(1)}
                endIcon={<ForwardIcon />}
              >
                View All Complaints
              </Button>
            </Box>
          )}
        </Box>
      </Box>
    );
  };

  const renderComplaints = () => (
    <Box>
      <Box sx={{ display: 'flex', flexDirection: {xs: 'column', md: 'row'}, justifyContent: 'space-between', alignItems: {xs: 'flex-start', md: 'center'}, mb: 3, gap: 2 }}>
        <Typography variant={isMobile ? "h6" : "h5"}>Active Complaints</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
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
            sx={{ minWidth: {xs: '100%', sm: '250px'} }}
          />
          <IconButton onClick={handleRefresh} color="primary" size="small">
            <RefreshIcon />
          </IconButton>
          <IconButton 
            onClick={handleMenuOpen} 
            color="primary"
            size="small"
          >
            <FilterIcon />
          </IconButton>
          <Menu
            anchorEl={menuAnchorEl}
            open={Boolean(menuAnchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={handleMenuClose}>All Complaints</MenuItem>
            <MenuItem onClick={handleMenuClose}>High Priority</MenuItem>
            <MenuItem onClick={handleMenuClose}>Medium Priority</MenuItem>
            <MenuItem onClick={handleMenuClose}>Low Priority</MenuItem>
            <Divider />
            <MenuItem onClick={handleMenuClose}>Open Status</MenuItem>
            <MenuItem onClick={handleMenuClose}>In Progress Status</MenuItem>
          </Menu>
        </Box>
      </Box>
      
      {isLoading && <LinearProgress sx={{ mb: 2 }} />}
      
      <TableContainer component={Paper} sx={{ boxShadow: 2, borderRadius: '8px', overflow: 'hidden' }}>
        <Table size={isMobile ? "small" : "medium"}>
          <TableHead sx={{ bgcolor: theme.palette.primary.main }}>
            <TableRow>
              <TableCell sx={{ color: 'white' }}>ID</TableCell>
              <TableCell sx={{ color: 'white' }}>Title</TableCell>
              {!isMobile && (
                <>
                  <TableCell sx={{ color: 'white' }}>Priority</TableCell>
                  <TableCell sx={{ color: 'white' }}>Status</TableCell>
                  {!isTablet && (
                    <>
                      <TableCell sx={{ color: 'white' }}>Submitted By</TableCell>
                      <TableCell sx={{ color: 'white' }}>Date</TableCell>
                    </>
                  )}
                </>
              )}
              <TableCell sx={{ color: 'white' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {complaints
              .filter(complaint => 
                searchQuery ? 
                  complaint.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                  complaint.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  complaint.employee.name.toLowerCase().includes(searchQuery.toLowerCase())
                : true
              )
              .map((complaint) => (
                <TableRow key={complaint.id} hover>
                  <TableCell>{complaint.id.substring(0, 8)}...</TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant={isMobile ? "body2" : "body1"} sx={{ fontWeight: 'medium' }}>
                        {complaint.title}
                      </Typography>
                      {isMobile && (
                        <Box sx={{ mt: 0.5, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          <Chip 
                            label={complaint.priority} 
                            color={
                              complaint.priority.toLowerCase() === 'high' ? 'error' : 
                              complaint.priority.toLowerCase() === 'medium' ? 'warning' : 'info'
                            } 
                            size="small" 
                          />
                          <Chip 
                            label={complaint.status} 
                            color={
                              complaint.status.toLowerCase() === 'open' ? 'info' : 
                              complaint.status.toLowerCase() === 'in_progress' ? 'warning' : 'success'
                            }
                            size="small" 
                          />
                        </Box>
                      )}
                    </Box>
                  </TableCell>
                  {!isMobile && (
                    <>
                      <TableCell>
                        <Chip 
                          label={complaint.priority} 
                          color={
                            complaint.priority.toLowerCase() === 'high' ? 'error' : 
                            complaint.priority.toLowerCase() === 'medium' ? 'warning' : 'info'
                          } 
                          size={isMobile ? "small" : "medium"} 
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={complaint.status} 
                          color={
                            complaint.status.toLowerCase() === 'open' ? 'info' : 
                            complaint.status.toLowerCase() === 'in_progress' ? 'warning' : 'success'
                          }
                          size={isMobile ? "small" : "medium"} 
                        />
                      </TableCell>
                      {!isTablet && (
                        <>
                          <TableCell>{complaint.employee.name}</TableCell>
                          <TableCell>{new Date(complaint.date_submitted).toLocaleDateString()}</TableCell>
                        </>
                      )}
                    </>
                  )}
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      {isMobile ? (
                        <IconButton size="small" onClick={() => handleComplaintClick(complaint)} color="primary">
                          <ViewIcon />
                        </IconButton>
                      ) : (
                        <Button 
                          variant="outlined" 
                          size="small" 
                          onClick={() => handleComplaintClick(complaint)}
                          startIcon={<ViewIcon />}
                        >
                          View Details
                        </Button>
                      )}
                      <Badge 
                        badgeContent={complaint.replies?.filter(r => r.from_user !== "ATS Team").length || 0} 
                        color="primary"
                        overlap="circular"
                      >
                        <IconButton
                          size="small"
                          color="secondary"
                          onClick={() => {
                            handleComplaintClick(complaint);
                            setActiveChatTab(1); // Switch to chat tab
                          }}
                        >
                          <ChatIcon />
                        </IconButton>
                      </Badge>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            {complaints.filter(complaint => 
              searchQuery ? 
                complaint.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                complaint.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                complaint.employee.name.toLowerCase().includes(searchQuery.toLowerCase())
              : true
            ).length === 0 && (
              <TableRow>
                <TableCell colSpan={isMobile ? 3 : isTablet ? 5 : 7} align="center" sx={{ py: 3 }}>
                  <Typography variant="body1" color="textSecondary">No complaints found</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderResolvedComplaints = () => (
    <Box>
      <Box sx={{ display: 'flex', flexDirection: {xs: 'column', md: 'row'}, justifyContent: 'space-between', alignItems: {xs: 'flex-start', md: 'center'}, mb: 3, gap: 2 }}>
        <Typography variant={isMobile ? "h6" : "h5"}>Resolved Complaints History</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            placeholder="Search resolved complaints..."
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
            sx={{ minWidth: {xs: '100%', sm: '250px'} }}
          />
          <IconButton onClick={handleRefresh} color="primary" size="small">
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>
      
      {isLoading && <LinearProgress sx={{ mb: 2 }} />}
      
      <TableContainer component={Paper} sx={{ boxShadow: 2, borderRadius: '8px', overflow: 'hidden' }}>
        <Table size={isMobile ? "small" : "medium"}>
          <TableHead sx={{ bgcolor: theme.palette.success.main }}>
            <TableRow>
              <TableCell sx={{ color: 'white' }}>ID</TableCell>
              <TableCell sx={{ color: 'white' }}>Title</TableCell>
              <TableCell sx={{ color: 'white' }}>Priority</TableCell>
              {!isMobile && <TableCell sx={{ color: 'white' }}>Submitted By</TableCell>}
              <TableCell sx={{ color: 'white' }}>Date Submitted</TableCell>
              {!isMobile && <TableCell sx={{ color: 'white' }}>Date Resolved</TableCell>}
              {!isMobile && <TableCell sx={{ color: 'white' }}>Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {resolvedComplaints
              .filter(complaint => 
                searchQuery ? 
                  complaint.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                  complaint.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  complaint.employee.name.toLowerCase().includes(searchQuery.toLowerCase())
                : true
              )
              .map((complaint) => (
                <TableRow key={complaint.id} hover>
                  <TableCell>{complaint.id.substring(0, 8)}...</TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>{complaint.title}</Typography>
                    {isMobile && (
                      <>
                        <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                          {complaint.employee.name} • {new Date(complaint.date_submitted).toLocaleDateString()}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          Resolved: {new Date(complaint.resolution_date || complaint.last_updated).toLocaleDateString()}
                        </Typography>
                      </>
                    )}
                  </TableCell>
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
                  {!isMobile && <TableCell>{complaint.employee.name}</TableCell>}
                  <TableCell>{new Date(complaint.date_submitted).toLocaleDateString()}</TableCell>
                  {!isMobile && <TableCell>{new Date(complaint.resolution_date || complaint.last_updated).toLocaleDateString()}</TableCell>}
                  {!isMobile && (
                    <TableCell>
                      <Button 
                        variant="outlined" 
                        size="small" 
                        onClick={() => handleComplaintClick(complaint)}
                        startIcon={<ViewIcon />}
                      >
                        View
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            {resolvedComplaints.filter(complaint => 
              searchQuery ? 
                complaint.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                complaint.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                complaint.employee.name.toLowerCase().includes(searchQuery.toLowerCase())
              : true
            ).length === 0 && (
              <TableRow>
                <TableCell colSpan={isMobile ? 4 : 7} align="center" sx={{ py: 3 }}>
                  <Typography variant="body1" color="textSecondary">No resolved complaints found</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  return (
    <DashboardLayout title="ATS Portal" menuItems={menuItems}>
      <Box p={3}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ 
            mb: 3,
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': { minHeight: { xs: '48px', md: '64px' } }
          }}
        >
          <Tab 
            icon={<DashboardIcon fontSize="small" />} 
            label={!isMobile && "Dashboard"} 
            iconPosition="start"
          />
          <Tab 
            icon={<ComplaintsIcon fontSize="small" />} 
            label={!isMobile && "Active Complaints"} 
            iconPosition="start"
          />
          <Tab 
            icon={<ResolvedIcon fontSize="small" />} 
            label={!isMobile && "Resolved Complaints"} 
            iconPosition="start"
          />
        </Tabs>

        {activeTab === 0 && renderDashboard()}
        {activeTab === 1 && renderComplaints()}
        {activeTab === 2 && renderResolvedComplaints()}
        
        {/* Complaint details dialog - moved outside of tab renders to be always available */}
        <Dialog open={complaintDialogOpen} onClose={() => setComplaintDialogOpen(false)} fullScreen={isMobile}>
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant={isMobile ? "h6" : "h5"}>
                {selectedComplaint?.title || "Complaint Details"}
              </Typography>
              <Chip 
                label={selectedComplaint?.status || ""}
                color={
                  selectedComplaint?.status?.toLowerCase() === 'open' ? 'info' : 
                  selectedComplaint?.status?.toLowerCase() === 'in_progress' ? 'warning' : 'success'
                }
                size="small"
              />
            </Box>
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
                    badgeContent={selectedComplaint?.replies?.filter(r => r.from_user !== "ATS Team").length || 0} 
                    color="primary"
                  >
                    <ChatIcon />
                  </Badge>
                } 
                iconPosition="start"
              />
            </Tabs>
          </DialogTitle>
          {selectedComplaint && (
            <DialogContent>
              {activeChatTab === 0 ? (
                // Details tab content
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="textSecondary">Title</Typography>
                    <Typography variant="body1">{selectedComplaint.title}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="textSecondary">Description</Typography>
                    <Typography variant="body1">{selectedComplaint.description}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="textSecondary">Priority</Typography>
                    <Chip label={selectedComplaint.priority} color={selectedComplaint.priority === 'High' ? 'error' : 'default'} size={isMobile ? "small" : "medium"} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="textSecondary">Status</Typography>
                    <Chip label={selectedComplaint.status} size={isMobile ? "small" : "medium"} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="textSecondary">Submitted By</Typography>
                    <Typography variant="body1">{selectedComplaint.employee.name}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="textSecondary">Date Submitted</Typography>
                    <Typography variant="body1">{new Date(selectedComplaint.date_submitted).toLocaleDateString()}</Typography>
                  </Grid>
                  {selectedComplaint.component_purchase_reason && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="textSecondary">Component Purchase Details</Typography>
                      <Box sx={{ bgcolor: 'primary.50', p: 2, borderRadius: 1, border: '1px solid', borderColor: 'primary.200' }}>
                        <Typography variant="body2">{selectedComplaint.component_purchase_reason}</Typography>
                      </Box>
                    </Grid>
                  )}
                </Grid>
              ) : (
                // Chat tab content
                <Box sx={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Chat with {selectedComplaint.employee.name}
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
                            alignSelf: reply.from_user === "ATS Team" ? 'flex-end' : 'flex-start',
                            mb: 2,
                            maxWidth: '80%',
                          }}
                        >
                          <Paper
                            elevation={1}
                            sx={{
                              p: 1.5,
                              borderRadius: 2,
                              bgcolor: reply.from_user === "ATS Team" ? 'primary.light' : 'grey.100',
                              color: reply.from_user === "ATS Team" ? 'white' : 'inherit',
                            }}
                          >
                            <Typography variant="body2">{reply.message}</Typography>
                          </Paper>
                          <Box
                            sx={{
                              display: 'flex',
                              justifyContent: reply.from_user === "ATS Team" ? 'flex-end' : 'flex-start',
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
                          No messages yet. Start the conversation with {selectedComplaint.employee.name}.
                        </Typography>
                      </Box>
                    )}
                  </Box>
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
                </Box>
              )}
            </DialogContent>
          )}
          <DialogActions sx={{ p: { xs: 2, sm: 2.5 }, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1, justifyContent: 'space-between' }}>
            <Button 
              onClick={() => setComplaintDialogOpen(false)} 
              size={isMobile ? "small" : "medium"}
            >
              Close
            </Button>
            
            {selectedComplaint && selectedComplaint.status?.toLowerCase() !== 'resolved' && (
              <Box sx={{ display: 'flex', gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => selectedComplaint && handleResolveComplaint(selectedComplaint)}
                  startIcon={<ResolvedIcon />}
                  size={isMobile ? "small" : "medium"}
                >
                  Resolve Complaint
                </Button>
                
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => selectedComplaint && handleForwardToAssistantManager(selectedComplaint)}
                  startIcon={<ForwardIcon />}
                  size={isMobile ? "small" : "medium"}
                >
                  Forward to Assistant Manager
                </Button>
              </Box>
            )}
          </DialogActions>
        </Dialog>
        
        {/* Component Purchase Dialog */}
        <Dialog 
          open={componentDialogOpen} 
          onClose={() => setComponentDialogOpen(false)}
          maxWidth="md"
          fullWidth
          fullScreen={isMobile}
        >
          <DialogTitle>
            <Typography variant={isMobile ? "h6" : "h5"}>
              Forward Complaint - Component Purchase Details
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              {complaintToForward?.title}
            </Typography>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Please provide detailed information about the components required to resolve this complaint:
              </Typography>
              
              <TextField
                fullWidth
                label="Component Purchase Reason"
                placeholder="e.g., Need to purchase 2x Intel i7 processors, 4x 16GB RAM modules, and 1x motherboard to replace faulty hardware. Estimated cost: $1,200. These components are critical for resolving system crashes."
                multiline
                rows={6}
                value={componentPurchaseReason}
                onChange={(e) => setComponentPurchaseReason(e.target.value)}
                helperText={`${componentPurchaseReason.length}/10 characters minimum. Include component names, quantities, estimated costs, and justification.`}
                error={componentPurchaseReason.length > 0 && componentPurchaseReason.length < 10}
                sx={{ mb: 2 }}
              />
              
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Please include:</strong>
                  <br />• Specific component names and quantities
                  <br />• Estimated costs for budget planning
                  <br />• Technical justification for why these components are needed
                  <br />• How these components will resolve the complaint
                </Typography>
              </Alert>
              
              {complaintToForward && (
                <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
                  <Typography variant="subtitle2" color="textSecondary">Complaint Details:</Typography>
                  <Typography variant="body2"><strong>Title:</strong> {complaintToForward.title}</Typography>
                  <Typography variant="body2"><strong>Description:</strong> {complaintToForward.description}</Typography>
                  <Typography variant="body2"><strong>Priority:</strong> {complaintToForward.priority}</Typography>
                  <Typography variant="body2"><strong>Employee:</strong> {complaintToForward.employee.name} ({complaintToForward.employee.department})</Typography>
                </Box>
              )}
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: { xs: 2, sm: 2.5 }, gap: 1 }}>
            <Button 
              onClick={() => {
                setComponentDialogOpen(false);
                setComponentPurchaseReason('');
                setComplaintToForward(null);
              }}
              size={isMobile ? "small" : "medium"}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleForwardWithComponents}
              disabled={!componentPurchaseReason.trim() || componentPurchaseReason.length < 10 || isLoading}
              startIcon={<ForwardIcon />}
              size={isMobile ? "small" : "medium"}
            >
              Forward with Component Details
            </Button>
          </DialogActions>
        </Dialog>
        
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={6000}
          onClose={() => setSnackbarOpen(false)}
        >
          <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity} sx={{ width: '100%' }}>
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </Box>
    </DashboardLayout>
  );
};

export default ATSPortal;