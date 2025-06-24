import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import {
  BugReport as ComplaintsIcon,
  History as HistoryIcon,
  Visibility as ViewIcon,
  Dashboard as DashboardIcon,
  Send as SendIcon,
  Forward as ForwardIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  AssignmentTurnedIn as ApproveIcon,
  Assignment as AssignmentIcon,
  Chat as ChatIcon,
  PlaylistAddCheck as PlaylistAddCheckIcon,
  PriorityHigh as PriorityHighIcon
} from '@mui/icons-material';
import {
  Box,
  Typography,
  Grid,
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
  Alert,
  LinearProgress,
  Card,
  CardContent,
  Avatar,
  Tab,
  Tabs,
  InputAdornment,
  Badge,
  Tooltip,
  Stack,
  CircularProgress
} from '@mui/material';
import api from '../utils/axios';
import { useAuth } from '../context/AuthContext';
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
  component_purchase_reason?: string;  // This is the key field!
  replies: IReply[];
  images?: string[];
}

// Define interfaces for type safety
interface ApprovalItem {
  id: string;
  type: string;
  title: string;
  priority: string;
  status: string;
  submittedBy: string;
  department: string;
  dateSubmitted: string;
  forwardedBy?: string;
  dateApproved?: string;
  approvedBy?: string;
  description?: string;
  resolution_notes?: string;
  component_purchase_reason?: string;  // Add this field
}

interface AssistantManagerData {
  pendingApprovals: ApprovalItem[];
  approvalsHistory: ApprovalItem[];
}

const AssistantManagerPortal = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();

  // State declarations - always declare all hooks at the top level
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [data, setData] = useState<AssistantManagerData>({
    pendingApprovals: [],
    approvalsHistory: []
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ApprovalItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean,
    message: string,
    severity: 'success' | 'error' | 'info' | 'warning'
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  // New state variables for complaint detail and chat functionality
  const [complaintDetailOpen, setComplaintDetailOpen] = useState(false);
  const [activeChatTab, setActiveChatTab] = useState(0);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [replyText, setReplyText] = useState('');

  // Menu items for the sidebar
  const menuItems = [
    {
      icon: <DashboardIcon />,
      text: 'Dashboard',
      onClick: () => setActiveTab(0),
    },
    {
      icon: <ComplaintsIcon />,
      text: 'Pending Approvals',
      onClick: () => setActiveTab(1),
    },
    {
      icon: <HistoryIcon />,
      text: 'Approvals History',
      onClick: () => setActiveTab(2),
    },
  ];

  // Function to fetch pending approvals
  const fetchPendingApprovals = async () => {
    try {
      setIsLoading(true);
      // Use the correct API endpoint for assistant managers
      const response = await api.get('/assistant-manager/complaints');
      
      // Ensure we have an array to work with
      const responseData = Array.isArray(response.data) ? response.data : [];
      console.log('Assistant Manager complaints data:', responseData);
      
      // Filter for complaints with forwarded status (forwarded by ATS)
      const forwardedComplaints = responseData.filter((item: IComplaint) => 
        item.status === 'forwarded'
      );
      
      // Transform the data for frontend display
      const pendingApprovals = forwardedComplaints.map((item: IComplaint) => ({
        id: item.id,
        type: 'Complaint',
        title: item.title,
        priority: item.priority,
        status: 'Pending Approval',
        submittedBy: item.employee && item.employee.name ? item.employee.name : 'Unknown',
        department: item.employee && item.employee.department ? item.employee.department : 'Unknown',
        dateSubmitted: item.date_submitted,
        forwardedBy: 'ATS Team',
        description: item.description,
        resolution_notes: item.resolution_notes,
        component_purchase_reason: item.component_purchase_reason  // Include component details
      }));
      
      setData(prevData => ({
        ...prevData,
        pendingApprovals
      }));
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load pending approvals',
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to fetch approval history
  const fetchApprovalHistory = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/assistant-manager/approval-history');
      
      // Ensure we have an array to work with
      const responseData = Array.isArray(response.data) ? response.data : [];
      console.log('Approval history data:', responseData);
      
      // Transform the data for frontend display
      const approvalsHistory = responseData.map((item: IComplaint) => {
        // Determine status based on resolution notes and current status
        let displayStatus = 'Processed';
        if (item.resolution_notes) {
          if (item.resolution_notes.includes('Approved by assistant_manager')) {
            displayStatus = 'Approved';
          } else if (item.resolution_notes.includes('Rejected by assistant_manager')) {
            displayStatus = 'Rejected';
          } else if (item.status === 'in_progress') {
            displayStatus = 'Approved';
          } else if (item.status === 'closed' || item.status === 'resolved') {
            displayStatus = 'Processed';
          }
        }
        
        return {
          id: item.id,
          type: 'Complaint',
          title: item.title,
          priority: item.priority,
          status: displayStatus,
          submittedBy: item.employee && item.employee.name ? item.employee.name : 'Unknown', 
          department: item.employee && item.employee.department ? item.employee.department : 'Unknown',
          dateSubmitted: item.date_submitted,
          dateApproved: item.last_updated,
          approvedBy: 'Assistant Manager',
          description: item.description,
          resolution_notes: item.resolution_notes
        };
      });
      
      setData(prevData => ({
        ...prevData,
        approvalsHistory
      }));
    } catch (error) {
      console.error('Error fetching approval history:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load approval history',
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh function for dashboard
  const handleRefresh = () => {
    fetchPendingApprovals();
    fetchApprovalHistory();
  };

  // Load data when the component mounts and when tab changes
  useEffect(() => {
    // Load data based on active tab
    if (activeTab === 0) {
      // Dashboard needs both data sets
      fetchPendingApprovals();
      fetchApprovalHistory();
    } else if (activeTab === 1) {
      // Pending approvals tab
      fetchPendingApprovals();
    } else if (activeTab === 2) {
      // Approval history tab
      fetchApprovalHistory();
    }
  }, [activeTab]);

  // Handle opening the approval dialog
  const handleApprovalClick = (item: ApprovalItem) => {
    setSelectedItem(item);
    setApprovalDialogOpen(true);
  };

  // Handle opening the complaint detail dialog with chat functionality
  const handleComplaintDetailClick = async (item: ApprovalItem) => {
    try {
      setIsLoading(true);
      // Fetch the complete complaint to get full details including replies
      const complaintData = await complaintService.getComplaintById(item.id);
      setSelectedComplaint(complaintData);
      
      // Get replies for the complaint
      try {
        const replies = await complaintService.getComplaintReplies(item.id);
        if (complaintData) {
          complaintData.replies = replies;
          setSelectedComplaint({...complaintData});
        }
      } catch (error) {
        console.error('Error fetching replies:', error);
      }
      
      setComplaintDetailOpen(true);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching complaint details:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load complaint details',
        severity: 'error'
      });
      setIsLoading(false);
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
        from_user: "Assistant Manager",
        user_id: user?.id  // Add user ID for tracking
      };
      
      // First, try to add the reply directly - this updates the resolution_notes field in the backend
      await complaintService.addReply(replyData);
      
      // Clear the input field immediately on successful send
      setReplyText('');
      
      // Set success message
      setSnackbar({
        open: true,
        message: 'Message sent successfully',
        severity: 'success'
      });
      
      // Then refresh the complaint data to show the updated chat
      try {
        // Fetch the updated complaint first
        const updatedComplaint = await complaintService.getComplaintById(selectedComplaint.id);
        
        if (updatedComplaint) {
          // Get the replies for this complaint
          const replies = await complaintService.getComplaintReplies(selectedComplaint.id);
          
          // Update the selected complaint with the new data
          setSelectedComplaint({
            ...updatedComplaint,
            replies: replies
          });
        } else {
          // Fallback if we can't find the updated complaint
          console.warn('Could not find the updated complaint');
        }
      } catch (refreshError) {
        console.error('Error refreshing complaint data:', refreshError);
        // Show a warning but don't treat it as a total failure
        setSnackbar({
          open: true,
          message: 'Message sent, but failed to refresh message history',
          severity: 'warning'
        });
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error sending message:', error);
      setSnackbar({
        open: true,
        message: 'Failed to send message',
        severity: 'error'
      });
      setIsLoading(false);
    }
  };

  // Handle opening the rejection dialog
  const handleReject = () => {
    setRejectionDialogOpen(true);
  };

  // Handle snackbar close
  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };
  
  // Handle approving a complaint
  const handleApprove = async () => {
    if (!selectedItem) return;
    
    try {
      setIsLoading(true);
      await complaintService.approveComplaint(
        selectedItem.id,
        'assistant_manager',
        'Approved by Assistant Manager'
      );
      
      // Update local state
      setData(prevData => ({
        pendingApprovals: prevData.pendingApprovals.filter(item => item.id !== selectedItem.id),
        approvalsHistory: [
          ...prevData.approvalsHistory,
          {
            ...selectedItem,
            status: 'Approved',
            dateApproved: new Date().toISOString(),
            approvedBy: 'Assistant Manager'
          }
        ]
      }));
      
      setSnackbar({
        open: true,
        message: 'Complaint approved successfully',
        severity: 'success'
      });
      setApprovalDialogOpen(false);
    } catch (error) {
      console.error('Error approving complaint:', error);
      setSnackbar({
        open: true,
        message: 'Failed to approve complaint',
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle rejecting a complaint
  const handleRejectConfirm = async () => {
    if (!selectedItem || !rejectionReason.trim()) return;
    
    try {
      setIsLoading(true);
      
      // Use the new rejection endpoint with notification
      console.debug('Sending rejection with reason:', {
        id: selectedItem.id,
        reason: rejectionReason
      });
      
      const response = await api.patch(`/complaints/${selectedItem.id}/reject`, {
        reason: rejectionReason
      });
      
      console.debug('Rejection response:', response.data);
      
      // Update local state - remove from pending approvals and add to history
      setData(prevData => ({
        pendingApprovals: prevData.pendingApprovals.filter(item => item.id !== selectedItem.id),
        approvalsHistory: [
          ...prevData.approvalsHistory,
          {
            ...selectedItem,
            status: 'Rejected - Awaiting Action',
            dateApproved: new Date().toISOString(),
            approvedBy: 'Assistant Manager'
          }
        ]
      }));
      
      setSnackbar({
        open: true,
        message: 'Complaint rejected successfully and ATS team notified',
        severity: 'info'
      });
      setRejectionDialogOpen(false);
      setApprovalDialogOpen(false);
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting complaint:', error);
      console.error('Error details:', (error as any).response?.data || (error as Error).message);
      setSnackbar({
        open: true,
        message: 'Failed to reject complaint: ' + ((error as any).response?.data?.detail || (error as Error).message),
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle forwarding a complaint to manager
  const handleForward = async () => {
    if (!selectedItem) return;
    
    try {
      setIsLoading(true);
      
      // Use the dedicated forward-to-manager endpoint
      const updateData = {
        assigned_to: null  // Will be assigned by manager
      };
      
      // Use the new dedicated endpoint for forwarding to manager
      const response = await api.patch(`/complaints/${selectedItem.id}/forward-to-manager`, updateData);
      
      console.debug('Forward response:', response.data);
      
      // Update local state
      setData(prevData => ({
        pendingApprovals: prevData.pendingApprovals.filter(item => item.id !== selectedItem.id),
        approvalsHistory: [
          ...prevData.approvalsHistory,
          {
            ...selectedItem,
            status: 'Forwarded to Manager',
            dateApproved: new Date().toISOString(),
            approvedBy: 'Assistant Manager'
          }
        ]
      }));
      
      setSnackbar({
        open: true,
        message: 'Complaint forwarded to Manager successfully with component details',
        severity: 'success'
      });
      setApprovalDialogOpen(false);
    } catch (error) {
      console.error('Error forwarding complaint:', error);
      console.error('Error details:', (error as any).response?.data || (error as Error).message);
      setSnackbar({
        open: true,
        message: 'Failed to forward complaint: ' + ((error as any).response?.data?.detail || (error as Error).message),
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Render dashboard view with statistics
  const renderDashboard = () => {
    const statCards = [
      { 
        title: 'Pending Approvals', 
        value: data.pendingApprovals?.length || 0,
        icon: <PlaylistAddCheckIcon color="primary" fontSize="large" />,
        color: theme.palette.primary.main,
        onClick: () => setActiveTab(1)
      },
      { 
        title: 'High Priority Items', 
        value: data.pendingApprovals?.filter(item => item.priority.toLowerCase() === 'high').length || 0,
        icon: <PriorityHighIcon sx={{ color: theme.palette.error.main }} fontSize="large" />,
        color: theme.palette.error.main,
        onClick: () => setActiveTab(1)
      },
      { 
        title: 'Approved Items', 
        value: data.approvalsHistory?.filter(item => item.status === 'Approved').length || 0,
        icon: <CheckCircleIcon sx={{ color: theme.palette.success.main }} fontSize="large" />,
        color: theme.palette.success.main,
        onClick: () => setActiveTab(2)
      },
      { 
        title: 'Rejected Items', 
        value: data.approvalsHistory?.filter(item => item.status === 'Rejected').length || 0,
        icon: <CancelIcon sx={{ color: theme.palette.warning.main }} fontSize="large" />,
        color: theme.palette.warning.main,
        onClick: () => setActiveTab(2)
      }
    ];

    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>
          Dashboard
        </Typography>
        
        <Grid container spacing={3}>
          {statCards.map((stat, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card 
                sx={{ 
                  height: '100%', 
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: 4
                  },
                  borderLeft: `4px solid ${stat.color}`
                }}
                onClick={stat.onClick}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography color="textSecondary" gutterBottom>
                        {stat.title}
                      </Typography>
                      <Typography variant="h4" component="div">
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

        {/* Pending Approvals Section */}
        <Box sx={{ mt: 5 }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            mb: 2 
          }}>
            <Typography variant="h6">
              Recent Pending Approvals
            </Typography>
            <Button 
              variant="outlined" 
              size="small" 
              onClick={() => setActiveTab(1)}
              endIcon={<ViewIcon />}
            >
              View All
            </Button>
          </Box>
          
          <TableContainer component={Paper} sx={{ boxShadow: 2 }}>
            <Table size={isMobile ? "small" : "medium"}>
              <TableHead sx={{ bgcolor: theme.palette.primary.main }}>
                <TableRow>
                  <TableCell sx={{ color: 'white' }}>Title</TableCell>
                  <TableCell sx={{ color: 'white' }}>Priority</TableCell>
                  <TableCell sx={{ color: 'white' }}>Submitted By</TableCell>
                  <TableCell sx={{ color: 'white' }}>Department</TableCell>
                  <TableCell sx={{ color: 'white' }}>Date</TableCell>
                  <TableCell sx={{ color: 'white' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                      <CircularProgress size={30} />
                    </TableCell>
                  </TableRow>
                ) : data.pendingApprovals.length > 0 ? (
                  // Show only the first 5 pending approvals
                  data.pendingApprovals.slice(0, 5).map((item) => (
                    <TableRow key={item.id} hover>
                      <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.title}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={item.priority} 
                          color={
                            item.priority.toLowerCase() === 'high' ? 'error' : 
                            item.priority.toLowerCase() === 'medium' ? 'warning' : 'info'
                          } 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell>{item.submittedBy}</TableCell>
                      <TableCell>{item.department}</TableCell>
                      <TableCell>{new Date(item.dateSubmitted).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="View Details">
                            <IconButton 
                              size="small" 
                              color="primary" 
                              onClick={() => handleApprovalClick(item)}
                            >
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Approve">
                            <IconButton 
                              size="small" 
                              color="success" 
                              onClick={() => {
                                setSelectedItem(item);
                                handleApprove();
                              }}
                            >
                              <ApproveIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Reject">
                            <IconButton 
                              size="small" 
                              color="error" 
                              onClick={() => {
                                setSelectedItem(item);
                                handleReject();
                              }}
                            >
                              <CancelIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                      No pending approvals found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Box>
    );
  };

  // Render pending approvals table
  const renderPendingApprovals = () => {
    // Filter function to apply search
    const filteredApprovals = data.pendingApprovals.filter(item => 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.submittedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.priority.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <Box>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          mb: 3 
        }}>
          <Typography variant={isMobile ? "h6" : "h5"}>Pending Approvals</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              size="small"
              placeholder="Search approvals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ width: isMobile ? 150 : 250 }}
            />
            <Button 
              startIcon={<RefreshIcon />} 
              onClick={fetchPendingApprovals}
              size={isMobile ? "small" : "medium"}
            >
              Refresh
            </Button>
          </Box>
        </Box>

        <TableContainer component={Paper} sx={{ overflowX: 'auto', boxShadow: 2 }}>
          <Table size={isMobile ? "small" : "medium"}>
            <TableHead sx={{ bgcolor: theme.palette.primary.main }}>
              <TableRow>
                <TableCell sx={{ color: 'white' }}>ID</TableCell>
                <TableCell sx={{ color: 'white' }}>Title</TableCell>
                <TableCell sx={{ color: 'white' }}>Type</TableCell>
                <TableCell sx={{ color: 'white' }}>Priority</TableCell>
                <TableCell sx={{ color: 'white' }}>Submitted By</TableCell>
                <TableCell sx={{ color: 'white' }}>Status</TableCell>
                <TableCell sx={{ color: 'white' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                    <CircularProgress size={30} />
                  </TableCell>
                </TableRow>
              ) : filteredApprovals.length > 0 ? (
                filteredApprovals.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell>{item.id.substring(0, 8)}...</TableCell>
                    <TableCell>{item.title}</TableCell>
                    <TableCell>{item.type}</TableCell>
                    <TableCell>
                      <Chip 
                        label={item.priority} 
                        color={
                          item.priority.toLowerCase() === 'high' ? 'error' : 
                          item.priority.toLowerCase() === 'medium' ? 'warning' : 'info'
                        } 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell>{item.submittedBy}</TableCell>
                    <TableCell>
                      <Chip 
                        label={item.status} 
                        color="warning" 
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="View Details">
                          <IconButton 
                            size="small" 
                            color="primary" 
                            onClick={() => handleApprovalClick(item)}
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Reject">
                          <IconButton 
                            size="small" 
                            color="error" 
                            onClick={() => {
                              setSelectedItem(item);
                              handleReject();
                            }}
                          >
                            <CancelIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Forward to Manager">
                          <IconButton 
                            size="small" 
                            color="info" 
                            onClick={() => {
                              setSelectedItem(item);
                              handleForward();
                            }}
                          >
                            <ForwardIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                    <Typography variant="body1" color="textSecondary">No pending approvals found</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  // Render approvals history table
  const renderApprovalHistory = () => {
    // Filter function to apply search
    const filteredHistory = data.approvalsHistory.filter(item => 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.submittedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.status.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <Box>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          mb: 3 
        }}>
          <Typography variant={isMobile ? "h6" : "h5"}>Approval History</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              size="small"
              placeholder="Search history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ width: isMobile ? 150 : 250 }}
            />
            <Button 
              startIcon={<RefreshIcon />} 
              onClick={fetchApprovalHistory}
              size={isMobile ? "small" : "medium"}
            >
              Refresh
            </Button>
          </Box>
        </Box>

        <TableContainer component={Paper} sx={{ overflowX: 'auto', boxShadow: 2 }}>
          <Table size={isMobile ? "small" : "medium"}>
            <TableHead sx={{ bgcolor: theme.palette.primary.main }}>
              <TableRow>
                <TableCell sx={{ color: 'white' }}>ID</TableCell>
                <TableCell sx={{ color: 'white' }}>Title</TableCell>
                <TableCell sx={{ color: 'white' }}>Type</TableCell>
                <TableCell sx={{ color: 'white' }}>Priority</TableCell>
                <TableCell sx={{ color: 'white' }}>Submitted By</TableCell>
                <TableCell sx={{ color: 'white' }}>Status</TableCell>
                <TableCell sx={{ color: 'white' }}>Action Date</TableCell>
                <TableCell sx={{ color: 'white' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                    <CircularProgress size={30} />
                  </TableCell>
                </TableRow>
              ) : filteredHistory.length > 0 ? (
                filteredHistory.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell>{item.id.substring(0, 8)}...</TableCell>
                    <TableCell>{item.title}</TableCell>
                    <TableCell>{item.type}</TableCell>
                    <TableCell>
                      <Chip 
                        label={item.priority} 
                        color={
                          item.priority.toLowerCase() === 'high' ? 'error' : 
                          item.priority.toLowerCase() === 'medium' ? 'warning' : 'info'
                        } 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell>{item.submittedBy}</TableCell>
                    <TableCell>
                      <Chip 
                        label={item.status} 
                        color={item.status === 'Approved' ? 'success' : 'error'} 
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{item.dateApproved ? new Date(item.dateApproved).toLocaleDateString() : '-'}</TableCell>
                    <TableCell>
                      <Tooltip title="View Details">
                        <IconButton 
                          size="small" 
                          color="primary" 
                          onClick={() => handleApprovalClick(item)}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                    <Typography variant="body1" color="textSecondary">No approval history found</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  // Tab content renderer
  const renderTabContent = () => {
    switch (activeTab) {
      case 0:
        return renderDashboard();
      case 1:
        return renderPendingApprovals();
      case 2:
        return renderApprovalHistory();
      default:
        return null;
    }
  };

  // Complaint Details Dialog with Chat
  const renderComplaintDetailDialog = () => (
    <Dialog
      open={complaintDetailOpen}
      onClose={() => setComplaintDetailOpen(false)}
      maxWidth="md"
      fullWidth
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
                  selectedComplaint.replies && (
                    <Badge 
                      badgeContent={selectedComplaint.replies?.filter(r => r.from_user !== "Assistant Manager").length || 0}
                      color="primary"
                    >
                      <ChatIcon />
                    </Badge>
                  )
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
                
                {selectedComplaint.component_purchase_reason && (
                  <>
                    <Typography variant="subtitle1" gutterBottom>Component Purchase Details:</Typography>
                    <Box sx={{ 
                      bgcolor: 'primary.50', 
                      p: 2, 
                      borderRadius: 1, 
                      border: '1px solid', 
                      borderColor: 'primary.200',
                      mb: 2
                    }}>
                      <Typography variant="body2" color="primary.main" sx={{ fontWeight: 'medium' }}>
                        {selectedComplaint.component_purchase_reason}
                      </Typography>
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
                  Chat with {selectedComplaint.employee?.name || "Employee"}
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
                  {selectedComplaint.replies && selectedComplaint.replies.length > 0 ? (
                    selectedComplaint.replies.map((reply, index) => (
                      <Box
                        key={reply.id || index}
                        sx={{
                          alignSelf: reply.from_user === "Assistant Manager" ? 'flex-end' : 'flex-start',
                          mb: 2,
                          maxWidth: '80%',
                        }}
                      >
                        <Paper
                          elevation={1}
                          sx={{
                            p: 1.5,
                            borderRadius: 2,
                            bgcolor: reply.from_user === "Assistant Manager" ? 'primary.light' : 'grey.100',
                            color: reply.from_user === "Assistant Manager" ? 'white' : 'inherit',
                          }}
                        >
                          <Typography variant="body2">{reply.message}</Typography>
                        </Paper>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: reply.from_user === "Assistant Manager" ? 'flex-end' : 'flex-start',
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
                        No messages yet. Start the conversation with the employee.
                      </Typography>
                    </Box>
                  )}
                </Box>
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
            <Button onClick={() => setComplaintDetailOpen(false)}>
              Close
            </Button>
            {activeChatTab === 0 && selectedComplaint.status.toLowerCase() === 'forwarded' && (
              <>
                <Button 
                  variant="contained" 
                  color="error"
                  onClick={() => {
                    setSelectedItem({
                      id: selectedComplaint.id,
                      type: 'Complaint',
                      title: selectedComplaint.title,
                      priority: selectedComplaint.priority,
                      status: selectedComplaint.status,
                      submittedBy: selectedComplaint.employee?.name || 'Unknown',
                      department: selectedComplaint.employee?.department || 'Unknown',
                      dateSubmitted: selectedComplaint.date_submitted,
                      description: selectedComplaint.description
                    });
                    setComplaintDetailOpen(false);
                    handleReject();
                  }}
                >
                  Reject
                </Button>
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={() => {
                    setSelectedItem({
                      id: selectedComplaint.id,
                      type: 'Complaint',
                      title: selectedComplaint.title,
                      priority: selectedComplaint.priority,
                      status: selectedComplaint.status,
                      submittedBy: selectedComplaint.employee?.name || 'Unknown',
                      department: selectedComplaint.employee?.department || 'Unknown',
                      dateSubmitted: selectedComplaint.date_submitted,
                      description: selectedComplaint.description
                    });
                    setComplaintDetailOpen(false);
                    handleForward();
                  }}
                >
                  Forward to Manager
                </Button>
              </>
            )}
          </DialogActions>
        </>
      )}
    </Dialog>
  );

  return (
    <DashboardLayout title="Assistant Manager Portal" menuItems={menuItems}>
      <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
        <Tab label="Dashboard" />
        <Tab label="Pending Approvals" />
        <Tab label="Approvals History" />
      </Tabs>

      {renderTabContent()}

      {/* Approval Details Dialog */}
      <Dialog
        open={approvalDialogOpen}
        onClose={() => setApprovalDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Typography variant={isMobile ? "h6" : "h5"}>
            Approval Details
          </Typography>
        </DialogTitle>
        <DialogContent>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
              <CircularProgress />
            </Box>
          ) : selectedItem && (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary">Title</Typography>
                  <Typography variant="body1">{selectedItem.title}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Type</Typography>
                  <Typography variant="body1">{selectedItem.type}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Priority</Typography>
                  <Chip 
                    label={selectedItem.priority}
                    color={
                      selectedItem.priority.toLowerCase() === 'high' ? 'error' : 
                      selectedItem.priority.toLowerCase() === 'medium' ? 'warning' : 'info'
                    }
                    size={isMobile ? "small" : "medium"}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Status</Typography>
                  <Typography variant="body1">{selectedItem.status}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Department</Typography>
                  <Typography variant="body1">{selectedItem.department}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary">Submitted By</Typography>
                  <Typography variant="body1">{selectedItem.submittedBy}</Typography>
                </Grid>
                {selectedItem.forwardedBy && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="textSecondary">Forwarded By</Typography>
                    <Typography variant="body1">{selectedItem.forwardedBy}</Typography>
                  </Grid>
                )}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary">Description</Typography>
                  <Typography variant="body1">{selectedItem.description || 'No description provided'}</Typography>
                </Grid>
                {selectedItem.component_purchase_reason && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="textSecondary">Component Purchase Details</Typography>
                    <Box sx={{ 
                      bgcolor: 'primary.50', 
                      p: 2, 
                      borderRadius: 1, 
                      border: '1px solid', 
                      borderColor: 'primary.200' 
                    }}>
                      <Typography variant="body2" color="primary.main" sx={{ fontWeight: 'medium' }}>
                        {selectedItem.component_purchase_reason}
                      </Typography>
                    </Box>
                  </Grid>
                )}
                <Grid item xs={12}>
                  <Button 
                    variant="outlined" 
                    color="primary" 
                    onClick={() => {
                      setApprovalDialogOpen(false);
                      handleComplaintDetailClick(selectedItem);
                    }}
                    startIcon={<ChatIcon />}
                  >
                    Open Chat and Details
                  </Button>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: { xs: 2, sm: 2.5 }, flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 1 : 0 }}>
          <Button 
            onClick={() => setApprovalDialogOpen(false)}
            fullWidth={isMobile}
            size={isMobile ? "large" : "medium"}
            disabled={isLoading}
          >
            Close
          </Button>
          <Button 
            variant="contained" 
            color="error"
            onClick={handleReject}
            fullWidth={isMobile}
            size={isMobile ? "large" : "medium"}
            disabled={isLoading}
          >
            Reject
          </Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleForward}
            fullWidth={isMobile}
            size={isMobile ? "large" : "medium"}
            disabled={isLoading}
          >
            Forward to Manager
          </Button>
        </DialogActions>
      </Dialog>

      {/* Complaint Detail Dialog with Chat */}
      {renderComplaintDetailDialog()}

      {/* Rejection Reason Dialog */}
      <Dialog
        open={rejectionDialogOpen}
        onClose={() => setRejectionDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Provide Rejection Reason</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Reason for Rejection"
            type="text"
            fullWidth
            variant="outlined"
            multiline
            rows={4}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectionDialogOpen(false)} disabled={isLoading}>Cancel</Button>
          <Button 
            onClick={handleRejectConfirm} 
            variant="contained" 
            color="error"
            disabled={!rejectionReason.trim() || isLoading}
          >
            Confirm Rejection
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </DashboardLayout>
  );
};

export default AssistantManagerPortal;
