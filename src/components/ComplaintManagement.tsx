import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Chip,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Avatar,
  Stack,
  useTheme,
  useMediaQuery,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
} from '@mui/lab';
import complaintService, { Complaint as BackendComplaint } from '../services/complaintService';

interface Complaint {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  status: 'new' | 'in-progress' | 'resolved' | 'closed';
  approvalStatus: 'pending_ats' | 'pending_assistant_manager' | 'pending_manager' | 'approved' | 'rejected';
  dateSubmitted: string;
  dateResolved?: string;
  approvalHistory: ApprovalStep[];
  responses: ComplaintResponse[];
}

interface ApprovalStep {
  level: 'ats' | 'assistant_manager' | 'manager';
  status: 'approved' | 'rejected' | 'pending';
  comment?: string;
  timestamp: string;
  by: string;
}

interface ComplaintResponse {
  id: string;
  message: string;
  from: 'manager' | 'employee';
  timestamp: string;
}

const ApprovalHistory = ({ history }: { history: ApprovalStep[] }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom>
        Approval History
      </Typography>
      <Timeline position={isMobile ? "right" : "alternate"} sx={{ p: 0 }}>
        {history.map((step, index) => (
          <TimelineItem key={index}>
            <TimelineOppositeContent sx={{ display: isMobile ? 'none' : 'block' }}>
              <Typography variant="body2" color="textSecondary">
                {new Date(step.timestamp).toLocaleString()}
              </Typography>
            </TimelineOppositeContent>
            <TimelineSeparator>
              <TimelineDot color={
                step.status === 'approved' ? 'success' :
                step.status === 'rejected' ? 'error' :
                'grey'
              }/>
              {index < history.length - 1 && <TimelineConnector />}
            </TimelineSeparator>
            <TimelineContent>
              <Typography variant="body1">
                {step.level.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {step.by}
              </Typography>
              {step.comment && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {step.comment}
                </Typography>
              )}
              {isMobile && (
                <Typography variant="caption" color="textSecondary" display="block">
                  {new Date(step.timestamp).toLocaleString()}
                </Typography>
              )}
            </TimelineContent>
          </TimelineItem>
        ))}
      </Timeline>
    </Box>
  );
};

export default function ComplaintManagement() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [filterApprovalStatus, setFilterApprovalStatus] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to map backend complaint data to frontend format
  const mapBackendComplaint = (backendComplaint: BackendComplaint): Complaint => {
    return {
      id: backendComplaint.id,
      employeeId: backendComplaint.employee_id,
      employeeName: backendComplaint.employee?.name || 'Unknown Employee',
      department: backendComplaint.employee?.department || 'Unknown Department',
      title: backendComplaint.title,
      description: backendComplaint.description,
      category: 'General', // Backend doesn't have category, use default
      priority: (backendComplaint.priority as 'low' | 'medium' | 'high') || 'medium',
      status: mapBackendStatus(backendComplaint.status),
      approvalStatus: determineApprovalStatus(backendComplaint.status),
      dateSubmitted: new Date(backendComplaint.date_submitted).toISOString().split('T')[0],
      dateResolved: backendComplaint.resolution_date ? 
        new Date(backendComplaint.resolution_date).toISOString().split('T')[0] : undefined,
      approvalHistory: [], // Backend doesn't have approval history structure yet
      responses: backendComplaint.replies?.map(reply => ({
        id: reply.id,
        message: reply.message,
        from: reply.from_user === 'employee' ? 'employee' : 'manager',
        timestamp: reply.timestamp,
      })) || [],
    };
  };

  // Function to map backend status to frontend status format
  const mapBackendStatus = (backendStatus: string): 'new' | 'in-progress' | 'resolved' | 'closed' => {
    switch (backendStatus.toLowerCase()) {
      case 'open':
      case 'submitted':
        return 'new';
      case 'in_progress':
      case 'forwarded':
      case 'pending_approval':
        return 'in-progress';
      case 'resolved':
        return 'resolved';
      case 'closed':
      case 'rejected':
        return 'closed';
      default:
        return 'new';
    }
  };

  // Function to determine approval status based on backend status
  const determineApprovalStatus = (status: string): Complaint['approvalStatus'] => {
    switch (status.toLowerCase()) {
      case 'open':
      case 'submitted':
        return 'pending_ats';
      case 'forwarded':
        return 'pending_assistant_manager';
      case 'pending_approval':
        return 'pending_manager';
      case 'resolved':
        return 'approved';
      case 'rejected':
        return 'rejected';
      default:
        return 'pending_ats';
    }
  };

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await complaintService.getAllComplaintsAdmin();
      const mappedComplaints = response.map(mapBackendComplaint);
      setComplaints(mappedComplaints);
    } catch (error) {
      console.error('Error fetching complaints:', error);
      setError('Failed to fetch complaints. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const handleRefresh = () => {
    fetchComplaints();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'error' as const;
      case 'medium':
        return 'warning' as const;
      case 'low':
        return 'success' as const;
      default:
        return 'default' as const;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
        return 'success' as const;
      case 'in-progress':
        return 'warning' as const;
      case 'closed':
        return 'error' as const;
      case 'new':
        return 'info' as const;
      default:
        return 'default' as const;
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleRowClick = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Complaint Management
        </Typography>
        <IconButton onClick={handleRefresh} disabled={loading}>
          <RefreshIcon />
        </IconButton>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Complaints
              </Typography>
              <Typography variant="h4">
                {complaints.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Pending Approval
              </Typography>
              <Typography variant="h4">
                {complaints.filter(c => c.approvalStatus.includes('pending')).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                In Progress
              </Typography>
              <Typography variant="h4">
                {complaints.filter(c => c.status === 'in-progress').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Resolved
              </Typography>
              <Typography variant="h4">
                {complaints.filter(c => c.status === 'resolved').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter Controls */}
      <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Filter by Approval Status</InputLabel>
          <Select
            value={filterApprovalStatus}
            label="Filter by Approval Status"
            onChange={(e) => setFilterApprovalStatus(e.target.value)}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="pending_ats">Pending ATS</MenuItem>
            <MenuItem value="pending_assistant_manager">Pending Assistant Manager</MenuItem>
            <MenuItem value="pending_manager">Pending Manager</MenuItem>
            <MenuItem value="approved">Approved</MenuItem>
            <MenuItem value="rejected">Rejected</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  {!isMobile && (
                    <>
                      <TableCell>Employee</TableCell>
                      <TableCell>Department</TableCell>
                    </>
                  )}
                  <TableCell>Priority</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Approval Status</TableCell>
                  {!isTablet && <TableCell>Date</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {complaints
                  .filter(
                    (complaint) =>
                      filterApprovalStatus === 'all' ||
                      complaint.approvalStatus === filterApprovalStatus
                  )
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((complaint) => (
                    <TableRow 
                      key={complaint.id}
                      onClick={() => handleRowClick(complaint)}
                      sx={{ 
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: 'action.hover',
                        },
                      }}
                    >
                      <TableCell>
                        <Typography variant={isMobile ? "body2" : "body1"}>
                          {complaint.title}
                        </Typography>
                        {isMobile && (
                          <Stack spacing={0.5} mt={0.5}>
                            <Typography variant="caption" color="textSecondary">
                              {complaint.employeeName} - {complaint.department}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {complaint.dateSubmitted}
                            </Typography>
                          </Stack>
                        )}
                      </TableCell>
                      {!isMobile && (
                        <>
                          <TableCell>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Avatar sx={{ width: 24, height: 24, fontSize: '0.875rem' }}>
                                {complaint.employeeName.charAt(0)}
                              </Avatar>
                              <Typography variant="body2">
                                {complaint.employeeName}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>{complaint.department}</TableCell>
                        </>
                      )}
                      <TableCell>
                        <Chip
                          label={complaint.priority}
                          color={getPriorityColor(complaint.priority)}
                          size={isMobile ? "small" : "medium"}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={complaint.status}
                          color={getStatusColor(complaint.status)}
                          size={isMobile ? "small" : "medium"}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={complaint.approvalStatus.replace(/pending_/g, '').replace(/_/g, ' ')}
                          color={complaint.approvalStatus === 'approved' ? 'success' : 'warning'}
                          size={isMobile ? "small" : "medium"}
                        />
                      </TableCell>
                      {!isTablet && <TableCell>{complaint.dateSubmitted}</TableCell>}
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={complaints.filter(
                (complaint) =>
                  filterApprovalStatus === 'all' ||
                  complaint.approvalStatus === filterApprovalStatus
              ).length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </TableContainer>
        </>
      )}

      {/* Complaint Details Panel */}
      {selectedComplaint && (
        <Paper sx={{ mt: 3, p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Complaint Details
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>
                <strong>Title:</strong> {selectedComplaint.title}
              </Typography>
              <Typography variant="body2" paragraph>
                <strong>Description:</strong> {selectedComplaint.description}
              </Typography>
              <Typography variant="body2" paragraph>
                <strong>Submitted By:</strong> {selectedComplaint.employeeName} ({selectedComplaint.department})
              </Typography>
              <Typography variant="body2">
                <strong>Date Submitted:</strong> {selectedComplaint.dateSubmitted}
              </Typography>
              {selectedComplaint.dateResolved && (
                <Typography variant="body2">
                  <strong>Date Resolved:</strong> {selectedComplaint.dateResolved}
                </Typography>
              )}
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>
                Response History
              </Typography>
              {selectedComplaint.responses.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No responses yet
                </Typography>
              ) : (
                selectedComplaint.responses.map((response) => (
                  <Box
                    key={response.id}
                    sx={{
                      mb: 2,
                      p: 1.5,
                      bgcolor: response.from === 'manager' ? 'primary.light' : 'grey.100',
                      borderRadius: 1,
                    }}
                  >
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      <strong>{response.from === 'manager' ? 'Manager' : 'Employee'}:</strong>
                    </Typography>
                    <Typography variant="body2" paragraph>
                      {response.message}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {new Date(response.timestamp).toLocaleString()}
                    </Typography>
                  </Box>
                ))
              )}
            </Grid>
          </Grid>
        </Paper>
      )}
    </Box>
  );
}
