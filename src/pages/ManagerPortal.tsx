import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
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
  Snackbar,
  Alert,
  LinearProgress,
  Tabs,
  Tab,
  InputAdornment,
  Badge,
  Tooltip,
  Stack,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Report as ReportIcon,
  Visibility as ViewIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Chat as ChatIcon,
  AssignmentTurnedIn as ApproveIcon,
  Store as StoreIcon,
} from '@mui/icons-material';
import api from '../utils/axios';
import { useAuth } from '../context/AuthContext';
import complaintService, { Complaint } from '../services/complaintService';
import vendorService, { Vendor } from '../services/vendorService';
import quoteService, { QuoteRequest, QuoteResponse } from '../services/quoteService';

const ManagerPortal = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const allowedPaths = ['/manager'];

  // State variables
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [forwardedComplaints, setForwardedComplaints] = useState<Complaint[]>([]);
  const [approvedComplaints, setApprovedComplaints] = useState<Complaint[]>([]);
  const [rejectedComplaints, setRejectedComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [complaintDetailOpen, setComplaintDetailOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [activeChatTab, setActiveChatTab] = useState(0);
  const [replyText, setReplyText] = useState('');
  const [snackbar, setSnackbar] = useState<{
    open: boolean,
    message: string,
    severity: 'success' | 'error' | 'info' | 'warning'
  }>({
    open: false,
    message: '',
    severity: 'info'
  });
  const [createQuoteDialogOpen, setCreateQuoteDialogOpen] = useState(false);
  const [quoteRequestForm, setQuoteRequestForm] = useState({
    title: '',
    description: '',
    requirements: '',
    budget: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    due_date: ''
  });
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [availableVendors, setAvailableVendors] = useState<Vendor[]>([]);
  const [quoteRequests, setQuoteRequests] = useState<QuoteRequest[]>([]);
  const [selectedQuoteRequest, setSelectedQuoteRequest] = useState<QuoteRequest | null>(null);
  const [vendorResponsesOpen, setVendorResponsesOpen] = useState(false);
  const [comparisonMetrics, setComparisonMetrics] = useState({
    costWeight: 0.7,
    timelineWeight: 0.3
  });
  
  // Track which complaints have associated quote requests
  const [complaintsWithQuoteRequests, setComplaintsWithQuoteRequests] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Check if current path is not in allowedPaths
    if (!allowedPaths.includes(location.pathname)) {
      // Redirect to login page
      navigate('/login');
    }
  }, [location.pathname, navigate]);

  // Menu items for the sidebar
  const menuItems = [
    {
      icon: <DashboardIcon />,
      text: 'Dashboard',
      onClick: () => setActiveTab(0),
    },
    {
      icon: <ReportIcon />,
      text: 'Forwarded Complaints',
      onClick: () => setActiveTab(1),
    },
    {
      icon: <StoreIcon />,
      text: 'Vendor Quotes',
      onClick: () => setActiveTab(2),
    },
  ];

  // Check if complaints have associated quote requests
  const checkComplaintsQuoteRequests = async (complaints: Complaint[]) => {
    const complaintsWithQuotes = new Set<string>();
    
    // Check each complaint for associated quote requests
    for (const complaint of complaints) {
      try {
        const result = await complaintService.checkComplaintHasQuoteRequests(complaint.id);
        if (result.has_quote_requests) {
          complaintsWithQuotes.add(complaint.id);
          console.log(`✅ Complaint ${complaint.id} has quote requests - hiding approve button`);
        } else {
          console.log(`🔍 Complaint ${complaint.id} has no quote requests - showing approve button`);
        }
      } catch (error) {
        console.error(`Error checking quote requests for complaint ${complaint.id}:`, error);
        // If there's an error, assume no quote requests exist (show approve button)
      }
    }
    
    setComplaintsWithQuoteRequests(complaintsWithQuotes);
  };

  // Fetch forwarded complaints
  const fetchForwardedComplaints = async () => {
    try {
      setIsLoading(true);
      // Use the correct API endpoint for managers
      const response = await api.get('/manager/complaints');
      
      // Backend now properly filters complaints forwarded by assistant managers
      // No need for additional frontend filtering since backend only returns
      // complaints with 'pending_manager_approval', 'in_progress', 'pending_approval' status
      const complaintsForApproval = Array.isArray(response.data) ? response.data : [];
      
      setForwardedComplaints(complaintsForApproval);
      
      // Check which complaints have quote requests
      await checkComplaintsQuoteRequests(complaintsForApproval);
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching forwarded complaints:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load forwarded complaints',
        severity: 'error'
      });
      setIsLoading(false);
    }
  };

  // Fetch approved complaints
  const fetchApprovedComplaints = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/complaints/all?status=in_progress');
      
      // Filter for complaints that were approved by the manager
      const managerApproved = Array.isArray(response.data) 
        ? response.data.filter((complaint: Complaint) => 
            complaint.resolution_notes && 
            complaint.resolution_notes.includes('Approved by manager')
          )
        : [];
      
      setApprovedComplaints(managerApproved);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching approved complaints:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load approved complaints',
        severity: 'error'
      });
      setIsLoading(false);
    }
  };

  // Fetch rejected complaints
  const fetchRejectedComplaints = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/complaints/all?status=rejected');
      
      // Filter for complaints that were rejected by the manager
      const managerRejected = Array.isArray(response.data) 
        ? response.data.filter((complaint: Complaint) => 
            complaint.resolution_notes && 
            complaint.resolution_notes.includes('Rejected by manager')
          )
        : [];
      
      setRejectedComplaints(managerRejected);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching rejected complaints:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load rejected complaints',
        severity: 'error'
      });
      setIsLoading(false);
    }
  };

  // Refresh all complaints data
  const handleRefresh = () => {
    fetchForwardedComplaints();
    fetchApprovedComplaints();
    fetchRejectedComplaints();
  };

  // Load data when component mounts or active tab changes
  useEffect(() => {
    if (activeTab === 0 || activeTab === 1) {
      fetchForwardedComplaints();
      fetchApprovedComplaints();
      fetchRejectedComplaints();
    }
  }, [activeTab]);

  // Handle opening complaint detail dialog with chat functionality
  const handleComplaintClick = async (complaint: Complaint) => {
    try {
      setIsLoading(true);
      const complaintData = await complaintService.getComplaintById(complaint.id);
      setSelectedComplaint(complaintData);
      
      // Get replies for the complaint
      try {
        const replies = await complaintService.getComplaintReplies(complaint.id);
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

  // Handle sending replies
  const handleSendReply = async (): Promise<void> => {
    if (!replyText.trim() || !selectedComplaint) return;
    
    try {
      setIsLoading(true);
      const replyData = { 
        complaint_id: selectedComplaint.id,
        message: replyText.trim(), 
        from_user: "Manager",
        user_id: user?.id
      };
      
      await complaintService.addReply(replyData);
      
      // Clear input field
      setReplyText('');
      
      // Set success message
      setSnackbar({
        open: true,
        message: 'Message sent successfully',
        severity: 'success'
      });
      
      // Refresh complaint data to show updated chat
      try {
        const updatedComplaint = await complaintService.getComplaintById(selectedComplaint.id);
        
        if (updatedComplaint) {
          const replies = await complaintService.getComplaintReplies(selectedComplaint.id);
          setSelectedComplaint({
            ...updatedComplaint,
            replies: replies
          });
        } else {
          console.warn('Could not find the updated complaint');
        }
      } catch (refreshError) {
        console.error('Error refreshing complaint data:', refreshError);
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

  // Handle approving a complaint
  const handleApprove = async (complaint: Complaint) => {
    try {
      // Instead of immediately approving the complaint, first open the vendor form
      setSelectedComplaint(complaint);
      setCreateQuoteDialogOpen(true);
      
      // Initialize the quote request form with the complaint data
      setQuoteRequestForm({
        title: `Quote request for: ${complaint.title}`,
        description: complaint.description,
        requirements: '',
        budget: '',
        priority: complaint.priority as 'low' | 'medium' | 'high',
        due_date: ''
      });
      
      // Fetch vendors for selection
      fetchVendors();
    } catch (error) {
      console.error('Error during approval process:', error);
      setSnackbar({
        open: true,
        message: 'Failed to process approval',
        severity: 'error'
      });
    }
  };

  // Handle opening the rejection dialog
  const handleReject = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setRejectionDialogOpen(true);
  };

  // Handle rejecting a complaint
  const handleRejectConfirm = async () => {
    if (!selectedComplaint || !rejectionReason.trim()) return;
    
    try {
      setIsLoading(true);
      
      // Use the new rejection endpoint with notification
      console.debug('Sending rejection with reason:', {
        id: selectedComplaint.id,
        reason: rejectionReason
      });
      
      await api.patch(`/complaints/${selectedComplaint.id}/reject`, {
        reason: rejectionReason
      });
      
      // Refresh data
      handleRefresh();
      
      setSnackbar({
        open: true,
        message: 'Complaint rejected successfully and ATS team notified',
        severity: 'info'
      });
      setRejectionDialogOpen(false);
      setComplaintDetailOpen(false);
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting complaint:', error);
      console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
      setSnackbar({
        open: true,
        message: 'Failed to reject complaint',
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle snackbar close
  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // Fetch all vendors
  const fetchVendors = useCallback(async () => {
    try {
      const response = await vendorService.getVendors();
      setAvailableVendors(response);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load vendors',
        severity: 'error'
      });
    }
  }, []);

  // Initialize quote request form when a complaint is selected
  useEffect(() => {
    if (selectedComplaint && createQuoteDialogOpen) {
      setQuoteRequestForm({
        title: `Quote request for: ${selectedComplaint.title}`,
        description: selectedComplaint.description,
        requirements: '',
        budget: '',
        priority: selectedComplaint.priority as 'low' | 'medium' | 'high',
        due_date: ''
      });
      
      // Fetch vendors for selection
      fetchVendors();
    }
  }, [selectedComplaint, createQuoteDialogOpen, fetchVendors]);

  // Create quote request from complaint
  const handleCreateQuoteRequest = async () => {
    if (!selectedComplaint || selectedVendors.length === 0) {
      setSnackbar({
        open: true,
        message: 'Please select at least one vendor',
        severity: 'warning'
      });
      return;
    }
    
    try {
      setIsLoading(true);
      
      // First, approve the complaint formally
      await complaintService.approveComplaint(
        selectedComplaint.id,
        'manager',
        'Final approval by Manager'
      );
      
      // Create the quote request
      const quoteRequestData = {
        ...quoteRequestForm,
        budget: quoteRequestForm.budget ? parseFloat(quoteRequestForm.budget) : undefined,
        due_date: quoteRequestForm.due_date ? new Date(quoteRequestForm.due_date).toISOString() : undefined,
        status: 'open'
      };
      
      const createdRequest = await quoteService.createQuoteRequest(quoteRequestData);
      
      // Add selected vendors to the quote request
      for (const vendorId of selectedVendors) {
        await quoteService.addVendorToQuoteRequest(createdRequest.id, vendorId);
      }
      
      // Add this complaint to the set of complaints with quote requests
      setComplaintsWithQuoteRequests(prev => {
        const newSet = new Set(prev);
        newSet.add(selectedComplaint.id);
        return newSet;
      });
      
      // Refresh complaint data to reflect the newly approved status
      handleRefresh();
      
      setSnackbar({
        open: true,
        message: 'Complaint approved and quote request sent to vendors successfully',
        severity: 'success'
      });
      
      setCreateQuoteDialogOpen(false);
      setSelectedVendors([]);
      
    } catch (error) {
      console.error('Error creating quote request:', error);
      setSnackbar({
        open: true,
        message: 'Failed to approve complaint and create quote request',
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle canceling the quote request dialog
  const handleCancelQuoteRequest = () => {
    setCreateQuoteDialogOpen(false);
    setSelectedVendors([]);
    setSelectedComplaint(null);
    
    setSnackbar({
      open: true,
      message: 'Approval cancelled - complaint remains in pending state',
      severity: 'info'
    });
  };

  // Render dashboard
  const renderDashboard = () => {
    return (
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant={isMobile ? "h6" : "h5"} sx={{ fontWeight: 'bold' }}>
            Manager Dashboard
          </Typography>
          <Button
            startIcon={<RefreshIcon />}
            variant="outlined"
            onClick={handleRefresh}
            size={isMobile ? "small" : "medium"}
          >
            Refresh
          </Button>
        </Box>
        
        {isLoading && <LinearProgress sx={{ mb: 2 }} />}
        
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={4}>
            <Paper 
              sx={{ 
                height: '100%',
                cursor: 'pointer',
                transition: 'transform 0.3s, box-shadow 0.3s',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: 4,
                },
                background: 'linear-gradient(45deg, #ff9800 30%, #ffb74d 90%)',
                borderRadius: 2,
                boxShadow: 2
              }}
              onClick={() => setActiveTab(1)}
            >
              <Box sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography color="white" variant="subtitle2" gutterBottom>
                      Pending Approvals
                    </Typography>
                    <Typography color="white" variant="h4" component="div">
                      {forwardedComplaints.length}
                    </Typography>
                  </Box>
                  <ReportIcon sx={{ fontSize: 40, color: 'rgba(255, 255, 255, 0.8)' }} />
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={100} 
                  sx={{ mt: 2, bgcolor: 'rgba(255, 255, 255, 0.3)' }}
                />
              </Box>
            </Paper>
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <Paper 
              sx={{ 
                height: '100%',
                cursor: 'pointer',
                transition: 'transform 0.3s, box-shadow 0.3s',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: 4,
                },
                background: 'linear-gradient(45deg, #4caf50 30%, #81c784 90%)',
                borderRadius: 2,
                boxShadow: 2
              }}
              onClick={() => setActiveTab(1)}
            >
              <Box sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography color="white" variant="subtitle2" gutterBottom>
                      Approved
                    </Typography>
                    <Typography color="white" variant="h4" component="div">
                      {approvedComplaints.length}
                    </Typography>
                  </Box>
                  <CheckCircleIcon sx={{ fontSize: 40, color: 'rgba(255, 255, 255, 0.8)' }} />
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={100} 
                  sx={{ mt: 2, bgcolor: 'rgba(255, 255, 255, 0.3)' }}
                />
              </Box>
            </Paper>
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <Paper 
              sx={{ 
                height: '100%',
                cursor: 'pointer',
                transition: 'transform 0.3s, box-shadow 0.3s',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: 4,
                },
                background: 'linear-gradient(45deg, #f44336 30%, #ef5350 90%)',
                borderRadius: 2,
                boxShadow: 2
              }}
              onClick={() => setActiveTab(1)}
            >
              <Box sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography color="white" variant="subtitle2" gutterBottom>
                      Rejected
                    </Typography>
                    <Typography color="white" variant="h4" component="div">
                      {rejectedComplaints.length}
                    </Typography>
                  </Box>
                  <CancelIcon sx={{ fontSize: 40, color: 'rgba(255, 255, 255, 0.8)' }} />
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={100} 
                  sx={{ mt: 2, bgcolor: 'rgba(255, 255, 255, 0.3)' }}
                />
              </Box>
            </Paper>
          </Grid>
        </Grid>
        
        {/* Quick Actions Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
            Quick Actions
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<ReportIcon />}
                onClick={() => setActiveTab(1)}
                sx={{ py: 1.5 }}
              >
                View Complaints
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<StoreIcon />}
                onClick={() => setActiveTab(2)}
                sx={{ py: 1.5 }}
              >
                Vendor Quotes
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<RefreshIcon />}
                onClick={handleRefresh}
                sx={{ py: 1.5 }}
              >
                Refresh Data
              </Button>
            </Grid>
          </Grid>
        </Box>
        
        {/* Recent Activity Section - Simplified */}
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
            Recent Activity
          </Typography>
          <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2 }}>
            <Typography variant="subtitle1" gutterBottom color="primary">
              Recent Pending Actions
            </Typography>
            {forwardedComplaints.length > 0 ? (
              <Box>
                {forwardedComplaints.slice(0, 3).map((complaint) => (
                  <Box 
                    key={complaint.id}
                    sx={{ 
                      py: 2,
                      borderBottom: '1px solid #e0e0e0',
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' },
                      '&:last-child': { borderBottom: 'none' }
                    }}
                    onClick={() => handleComplaintClick(complaint)}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                          {complaint.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {complaint.employee?.name || 'Unknown'} • {new Date(complaint.date_submitted).toLocaleDateString()}
                        </Typography>
                      </Box>
                      <Chip 
                        label={complaint.priority} 
                        color={
                          complaint.priority.toLowerCase() === 'high' ? 'error' : 
                          complaint.priority.toLowerCase() === 'medium' ? 'warning' : 'info'
                        } 
                        size="small" 
                      />
                    </Box>
                  </Box>
                ))}
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                  <Button 
                    variant="text" 
                    onClick={() => setActiveTab(1)}
                    size="small"
                  >
                    View All Pending Items ({forwardedComplaints.length})
                  </Button>
                </Box>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                No pending actions
              </Typography>
            )}
          </Paper>
        </Box>
      </Box>
    );
  };

  // Render complaints
  const renderComplaints = () => {
    const filteredComplaints = forwardedComplaints.filter(complaint => 
      complaint.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      complaint.employee?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      complaint.priority?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <Box sx={{ p: 2 }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          mb: 3 
        }}>
          <Typography variant={isMobile ? "h6" : "h5"} sx={{ fontWeight: 'bold' }}>
            Forwarded Complaints
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              size="small"
              placeholder="Search complaints..."
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
              onClick={handleRefresh}
              variant="outlined"
              size={isMobile ? "small" : "medium"}
            >
              Refresh
            </Button>
          </Box>
        </Box>

        <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 2 }}>
          <Table size={isMobile ? "small" : "medium"}>
            <TableHead sx={{ bgcolor: theme.palette.primary.main }}>
              <TableRow>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Title</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Priority</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Employee</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Department</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Date Submitted</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={30} />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Loading complaints...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : filteredComplaints.length > 0 ? (
                filteredComplaints.map((complaint) => (
                  <TableRow 
                    key={complaint.id} 
                    hover
                    sx={{ 
                      '&:hover': { 
                        bgcolor: 'action.hover' 
                      }
                    }}
                  >
                    <TableCell sx={{ maxWidth: 200 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {complaint.title}
                      </Typography>
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
                    <TableCell>{complaint.employee?.name || 'Unknown'}</TableCell>
                    <TableCell>{complaint.employee?.department || 'Unknown'}</TableCell>
                    <TableCell>{new Date(complaint.date_submitted).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Tooltip title="View Details">
                          <IconButton 
                            size="small" 
                            color="primary" 
                            onClick={() => handleComplaintClick(complaint)}
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        {/* Only show approve button if complaint doesn't have quote requests */}
                        {!complaintsWithQuoteRequests.has(complaint.id) && (
                          <Tooltip title="Approve">
                            <IconButton 
                              size="small" 
                              color="success" 
                              onClick={() => handleApprove(complaint)}
                            >
                              <ApproveIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        {/* Show "Quote Created" chip if complaint has quote requests */}
                        {complaintsWithQuoteRequests.has(complaint.id) && (
                          <Tooltip title="Vendor quotes have been requested for this complaint">
                            <Chip 
                              label="Quote Created" 
                              color="success" 
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: '0.75rem' }}
                            />
                          </Tooltip>
                        )}
                        <Tooltip title="Reject">
                          <IconButton 
                            size="small" 
                            color="error" 
                            onClick={() => handleReject(complaint)}
                          >
                            <CancelIcon />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      No forwarded complaints found
                    </Typography>
                    {searchQuery && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Try adjusting your search criteria
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  // Complaint Detail Dialog
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
                      badgeContent={selectedComplaint.replies?.filter(r => r.from_user !== "Manager").length || 0}
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
                
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="textSecondary">Employee</Typography>
                    <Typography variant="body1">{selectedComplaint.employee?.name || "Unknown"}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="textSecondary">Department</Typography>
                    <Typography variant="body1">{selectedComplaint.employee?.department || "Unknown"}</Typography>
                  </Grid>
                </Grid>
                
                {selectedComplaint.resolution_notes && (
                  <>
                    <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>Resolution Notes:</Typography>
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
                          alignSelf: reply.from_user === "Manager" ? 'flex-end' : 'flex-start',
                          mb: 2,
                          maxWidth: '80%',
                        }}
                      >
                        <Paper
                          elevation={1}
                          sx={{
                            p: 1.5,
                            borderRadius: 2,
                            bgcolor: reply.from_user === "Manager" ? 'primary.light' : 'grey.100',
                            color: reply.from_user === "Manager" ? 'white' : 'inherit',
                          }}
                        >
                          <Typography variant="body2">{reply.message}</Typography>
                        </Paper>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: reply.from_user === "Manager" ? 'flex-end' : 'flex-start',
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
                              <ChatIcon />
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
                    setComplaintDetailOpen(false);
                    handleReject(selectedComplaint);
                  }}
                >
                  Reject
                </Button>
                <Button 
                  variant="contained" 
                  color="success"
                  onClick={() => handleApprove(selectedComplaint)}
                >
                  Approve
                </Button>
              </>
            )}
          </DialogActions>
        </>
      )}
    </Dialog>
  );

  // Add an additional fetch function for quote requests
  const fetchQuoteRequests = async () => {
    try {
      setIsLoading(true);
      const requests = await quoteService.getQuoteRequests();
      setQuoteRequests(requests);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching quote requests:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load quote requests',
        severity: 'error'
      });
      setIsLoading(false);
    }
  };

  // Load quote requests when tab changes
  useEffect(() => {
    if (activeTab === 2) {
      fetchQuoteRequests();
    }
  }, [activeTab]);

  // Handle viewing vendor responses for a specific quote request
  const handleViewResponses = (request: QuoteRequest) => {
    setSelectedQuoteRequest(request);
    setVendorResponsesOpen(true);
  };

  // Accept a vendor's quote
  const handleAcceptQuote = async (responseId: string) => {
    try {
      setIsLoading(true);
      await quoteService.reviewQuoteResponse(responseId, { status: 'accepted' });
      
      // Refresh data
      if (selectedQuoteRequest) {
        const updatedRequest = await quoteService.getQuoteRequestById(selectedQuoteRequest.id);
        setSelectedQuoteRequest(updatedRequest);
      }
      fetchQuoteRequests();
      
      setSnackbar({
        open: true,
        message: 'Quote accepted successfully',
        severity: 'success'
      });
      
    } catch (error) {
      console.error('Error accepting quote:', error);
      setSnackbar({
        open: true,
        message: 'Failed to accept quote',
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Reject a vendor's quote
  const handleRejectQuote = async (responseId: string) => {
    try {
      setIsLoading(true);
      await quoteService.reviewQuoteResponse(responseId, { status: 'rejected' });
      
      // Refresh data
      if (selectedQuoteRequest) {
        const updatedRequest = await quoteService.getQuoteRequestById(selectedQuoteRequest.id);
        setSelectedQuoteRequest(updatedRequest);
      }
      fetchQuoteRequests();
      
      setSnackbar({
        open: true,
        message: 'Quote rejected successfully',
        severity: 'success'
      });
      
    } catch (error) {
      console.error('Error rejecting quote:', error);
      setSnackbar({
        open: true,
        message: 'Failed to reject quote',
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate vendor score based on quote amount and delivery timeline
  const calculateVendorScore = (response: QuoteResponse) => {
    // Get the lowest quote amount among all responses
    const lowestQuote = selectedQuoteRequest?.responses.reduce(
      (min, r) => (r.quote_amount < min ? r.quote_amount : min),
      selectedQuoteRequest?.responses[0]?.quote_amount || 0
    );
    
    // Parse delivery timeline to days (assuming format like "10 days", "2 weeks", etc.)
    const deliveryDays = parseDeliveryTimeline(response.delivery_timeline || '');
    
    // Get the shortest delivery timeline among all responses
    const shortestTimeline = selectedQuoteRequest?.responses.reduce(
      (min, r) => {
        const days = parseDeliveryTimeline(r.delivery_timeline || '');
        return days < min ? days : min;
      },
      parseDeliveryTimeline(selectedQuoteRequest?.responses[0]?.delivery_timeline || '')
    ) || 1;
    
    // Calculate cost score (lower is better)
    const costScore = lowestQuote > 0 
      ? (lowestQuote / response.quote_amount) * 100 
      : 100;
    
    // Calculate timeline score (lower is better)
    const timelineScore = deliveryDays > 0 && shortestTimeline > 0
      ? (shortestTimeline / deliveryDays) * 100
      : 100;
    
    // Calculate weighted score
    const weightedScore = 
      (costScore * comparisonMetrics.costWeight) + 
      (timelineScore * comparisonMetrics.timelineWeight);
    
    return {
      costScore: Math.round(costScore),
      timelineScore: Math.round(timelineScore),
      weightedScore: Math.round(weightedScore)
    };
  };

  // Helper to parse delivery timeline string to days
  const parseDeliveryTimeline = (timeline: string): number => {
    if (!timeline) return 0;
    
    const number = parseInt(timeline.match(/\d+/)?.[0] || '0');
    
    if (timeline.includes('day')) {
      return number;
    } else if (timeline.includes('week')) {
      return number * 7;
    } else if (timeline.includes('month')) {
      return number * 30;
    }
    
    return number;
  };

  // Add a new tab content for Vendor Quotes
  const renderVendorQuotes = () => {
    return (
      <Box sx={{ p: 2 }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          mb: 3 
        }}>
          <Typography variant={isMobile ? "h6" : "h5"} sx={{ fontWeight: 'bold' }}>
            Vendor Quote Requests
          </Typography>
          <Button 
            startIcon={<RefreshIcon />} 
            onClick={fetchQuoteRequests}
            variant="outlined"
            size={isMobile ? "small" : "medium"}
          >
            Refresh
          </Button>
        </Box>
        
        {isLoading ? (
          <LinearProgress sx={{ mb: 2 }} />
        ) : quoteRequests.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2, boxShadow: 2 }}>
            <StoreIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Quote Requests
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Approve a complaint and create a quote request to get started.
            </Typography>
          </Paper>
        ) : (
          <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 2 }}>
            <Table size={isMobile ? "small" : "medium"}>
              <TableHead sx={{ bgcolor: theme.palette.primary.main }}>
                <TableRow>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Title</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Priority</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Budget</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Due Date</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Responses</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {quoteRequests.map((request) => (
                  <TableRow 
                    key={request.id} 
                    hover
                    sx={{ 
                      '&:hover': { 
                        bgcolor: 'action.hover' 
                      }
                    }}
                  >
                    <TableCell sx={{ maxWidth: 200 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {request.title}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={request.priority} 
                        color={
                          request.priority === 'high' ? 'error' : 
                          request.priority === 'medium' ? 'warning' : 'info'
                        } 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={request.status} 
                        color={
                          request.status === 'open' ? 'info' : 
                          request.status === 'pending' ? 'warning' : 
                          request.status === 'fulfilled' ? 'success' : 'default'
                        } 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {request.budget ? `$${request.budget.toFixed(2)}` : 'Not specified'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {request.due_date ? new Date(request.due_date).toLocaleDateString() : 'Not specified'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={`${request.responses?.length || 0} quotes`} 
                        color={request.responses?.length > 0 ? 'success' : 'default'} 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="outlined" 
                        size="small"
                        color="primary"
                        disabled={!request.responses?.length}
                        onClick={() => handleViewResponses(request)}
                        startIcon={<ViewIcon />}
                      >
                        View Quotes
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    );
  };

  // Render tab content
  const renderContent = () => {
    switch (activeTab) {
      case 0:
        return renderDashboard();
      case 1:
        return renderComplaints();
      case 2:
        return renderVendorQuotes();
      default:
        return renderDashboard();
    }
  };

  return (
    <DashboardLayout title="Manager Dashboard" menuItems={menuItems}>
      <Box sx={{ width: '100%', p: 3 }}>
        {renderContent()}
        
        {/* Complaint Detail Dialog */}
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
        
        {/* Quote Request Dialog */}
        <Dialog
          open={createQuoteDialogOpen}
          onClose={handleCancelQuoteRequest}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 2,
              boxShadow: 6
            }
          }}
        >
          <DialogTitle sx={{ 
            bgcolor: 'primary.main', 
            color: 'white',
            p: 2,
            fontSize: '1.2rem',
            fontWeight: 'bold'
          }}>
            Create Vendor Quote Request
            <Typography variant="subtitle2" sx={{ mt: 1, opacity: 0.9 }}>
              Complete this form to approve the complaint and send request to vendors
            </Typography>
          </DialogTitle>
          <DialogContent sx={{ px: 3, py: 2 }}>
            {isLoading && <LinearProgress sx={{ mb: 2 }} />}
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="subtitle1" sx={{ mt: 1, mb: 1, fontWeight: 'bold', color: 'primary.main' }}>
                  Request Details
                </Typography>
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  autoFocus
                  label="Title"
                  type="text"
                  fullWidth
                  variant="outlined"
                  value={quoteRequestForm.title}
                  onChange={(e) => setQuoteRequestForm({ ...quoteRequestForm, title: e.target.value })}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  label="Description"
                  type="text"
                  fullWidth
                  variant="outlined"
                  multiline
                  rows={3}
                  value={quoteRequestForm.description}
                  onChange={(e) => setQuoteRequestForm({ ...quoteRequestForm, description: e.target.value })}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  label="Specific Requirements"
                  type="text"
                  fullWidth
                  variant="outlined"
                  multiline
                  rows={3}
                  placeholder="List all technical specifications and requirements here"
                  value={quoteRequestForm.requirements}
                  onChange={(e) => setQuoteRequestForm({ ...quoteRequestForm, requirements: e.target.value })}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Budget (USD)"
                  type="number"
                  fullWidth
                  variant="outlined"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                  value={quoteRequestForm.budget}
                  onChange={(e) => setQuoteRequestForm({ ...quoteRequestForm, budget: e.target.value })}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Due Date"
                  type="date"
                  fullWidth
                  variant="outlined"
                  InputLabelProps={{ shrink: true }}
                  value={quoteRequestForm.due_date}
                  onChange={(e) => setQuoteRequestForm({ ...quoteRequestForm, due_date: e.target.value })}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel id="priority-label">Priority</InputLabel>
                  <Select
                    labelId="priority-label"
                    value={quoteRequestForm.priority}
                    onChange={(e) => setQuoteRequestForm({ ...quoteRequestForm, priority: e.target.value as 'low' | 'medium' | 'high' })}
                    label="Priority"
                  >
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                  Select Vendors to Request Quotes
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  * Required: Select at least one vendor
                </Typography>
              </Grid>
              
              <Grid item xs={12}>
                {isLoading && <LinearProgress />}
                {availableVendors.length === 0 ? (
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    No vendors available. Please add vendors first.
                  </Alert>
                ) : (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                    {availableVendors.map((vendor) => (
                      <Chip
                        key={vendor.id}
                        label={vendor.name}
                        onClick={() => {
                          // Toggle vendor selection
                          if (selectedVendors.includes(vendor.id)) {
                            setSelectedVendors(selectedVendors.filter(id => id !== vendor.id));
                          } else {
                            setSelectedVendors([...selectedVendors, vendor.id]);
                          }
                        }}
                        color={selectedVendors.includes(vendor.id) ? "primary" : "default"}
                        variant={selectedVendors.includes(vendor.id) ? "filled" : "outlined"}
                        sx={{ 
                          m: 0.5, 
                          px: 1,
                          py: 2,
                          borderRadius: 4,
                          transition: 'all 0.2s',
                          '&:hover': {
                            boxShadow: 2
                          }
                        }}
                      />
                    ))}
                  </Box>
                )}
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Button 
              onClick={handleCancelQuoteRequest} 
              disabled={isLoading}
              sx={{ borderRadius: 4 }}
            >
              Cancel (Leave Complaint Pending)
            </Button>
            <Button 
              onClick={handleCreateQuoteRequest} 
              variant="contained" 
              color="primary"
              disabled={!quoteRequestForm.title.trim() || !quoteRequestForm.description.trim() || !quoteRequestForm.requirements.trim() || !quoteRequestForm.budget.trim() || !quoteRequestForm.priority || !quoteRequestForm.due_date.trim() || selectedVendors.length === 0 || isLoading}
              sx={{ 
                px: 3,
                borderRadius: 4,
                boxShadow: 2
              }}
              startIcon={<CheckCircleIcon />}
            >
              Approve & Create Request
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
        
        {/* Vendor Responses Dialog */}
        <Dialog 
          open={vendorResponsesOpen} 
          onClose={() => setVendorResponsesOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Vendor Quotes Comparison
            {selectedQuoteRequest && (
              <Typography variant="subtitle1" color="text.secondary">
                {selectedQuoteRequest.title}
              </Typography>
            )}
          </DialogTitle>
          <DialogContent>
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
                <CircularProgress />
              </Box>
            ) : selectedQuoteRequest?.responses?.length ? (
              <>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>Comparison Weights</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="body2" gutterBottom>
                        Cost: {Math.round(comparisonMetrics.costWeight * 100)}%
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={comparisonMetrics.costWeight * 100} 
                        color="primary"
                        sx={{ height: 10, borderRadius: 5 }}
                      />
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="body2" gutterBottom>
                        Timeline: {Math.round(comparisonMetrics.timelineWeight * 100)}%
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={comparisonMetrics.timelineWeight * 100} 
                        color="secondary"
                        sx={{ height: 10, borderRadius: 5 }}
                      />
                    </Box>
                  </Box>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" gutterBottom>Adjust weights:</Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Button 
                        variant={comparisonMetrics.costWeight === 0.7 ? "contained" : "outlined"}
                        size="small"
                        onClick={() => setComparisonMetrics({ costWeight: 0.7, timelineWeight: 0.3 })}
                      >
                        Cost Focus (70/30)
                      </Button>
                      <Button 
                        variant={comparisonMetrics.costWeight === 0.5 ? "contained" : "outlined"}
                        size="small"
                        onClick={() => setComparisonMetrics({ costWeight: 0.5, timelineWeight: 0.5 })}
                      >
                        Balanced (50/50)
                      </Button>
                      <Button 
                        variant={comparisonMetrics.costWeight === 0.3 ? "contained" : "outlined"}
                        size="small"
                        onClick={() => setComparisonMetrics({ costWeight: 0.3, timelineWeight: 0.7 })}
                      >
                        Timeline Focus (30/70)
                      </Button>
                    </Box>
                  </Box>
                </Box>
                
                <TableContainer component={Paper} sx={{ mb: 3 }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: theme.palette.primary.main }}>
                      <TableRow>
                        <TableCell sx={{ color: 'white' }}>Vendor</TableCell>
                        <TableCell sx={{ color: 'white' }}>Quote Amount</TableCell>
                        <TableCell sx={{ color: 'white' }}>Delivery Timeline</TableCell>
                        <TableCell sx={{ color: 'white' }}>Cost Score</TableCell>
                        <TableCell sx={{ color: 'white' }}>Timeline Score</TableCell>
                        <TableCell sx={{ color: 'white' }}>Overall Score</TableCell>
                        <TableCell sx={{ color: 'white' }}>Status</TableCell>
                        <TableCell sx={{ color: 'white' }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedQuoteRequest.responses
                        .sort((a, b) => {
                          const scoreA = calculateVendorScore(a).weightedScore;
                          const scoreB = calculateVendorScore(b).weightedScore;
                          return scoreB - scoreA; // Sort by highest score first
                        })
                        .map((response) => {
                          const scores = calculateVendorScore(response);
                          return (
                            <TableRow key={response.id} hover>
                              <TableCell>{response.vendor?.name || 'Unknown'}</TableCell>
                              <TableCell>${response.quote_amount.toFixed(2)}</TableCell>
                              <TableCell>{response.delivery_timeline || 'Not specified'}</TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <Box sx={{ width: 60 }}>
                                    {scores.costScore}%
                                  </Box>
                                  <LinearProgress 
                                    variant="determinate" 
                                    value={scores.costScore} 
                                    color="primary"
                                    sx={{ flexGrow: 1, height: 8, borderRadius: 5 }}
                                  />
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <Box sx={{ width: 60 }}>
                                    {scores.timelineScore}%
                                  </Box>
                                  <LinearProgress 
                                    variant="determinate" 
                                    value={scores.timelineScore} 
                                    color="secondary"
                                    sx={{ flexGrow: 1, height: 8, borderRadius: 5 }}
                                  />
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <Box sx={{ width: 60 }}>
                                    {scores.weightedScore}%
                                  </Box>
                                  <LinearProgress 
                                    variant="determinate" 
                                    value={scores.weightedScore} 
                                    color="success"
                                    sx={{ flexGrow: 1, height: 8, borderRadius: 5 }}
                                  />
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Chip 
                                  label={response.status} 
                                  color={
                                    response.status === 'accepted' ? 'success' : 
                                    response.status === 'rejected' ? 'error' : 
                                    response.status === 'negotiating' ? 'warning' : 'info'
                                  } 
                                  size="small" 
                                />
                              </TableCell>
                              <TableCell>
                                {response.status === 'pending_review' && (
                                  <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Button 
                                      variant="contained" 
                                      color="success" 
                                      size="small"
                                      onClick={() => handleAcceptQuote(response.id)}
                                    >
                                      Accept
                                    </Button>
                                    <Button 
                                      variant="contained" 
                                      color="error" 
                                      size="small"
                                      onClick={() => handleRejectQuote(response.id)}
                                    >
                                      Reject
                                    </Button>
                                  </Box>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </TableContainer>
                
                <Typography variant="body2" color="text.secondary">
                  * Scores are calculated based on cost and delivery timeline. The vendor with the highest overall score offers the best value based on your selected priorities.
                </Typography>
              </>
            ) : (
              <Typography>No vendor responses received yet.</Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setVendorResponsesOpen(false)}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
};

export default ManagerPortal; 