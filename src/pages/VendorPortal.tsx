import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import {
  Edit as EditIcon,
  Store as StoreIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  LinearProgress,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  useMediaQuery,
  Snackbar,
  Alert
} from '@mui/material';
import api from '../utils/axios';
import { useAuth } from '../context/AuthContext';
import { Vendor } from '../services/vendorService';
import quoteService, { QuoteRequest, QuoteRequestCreate, QuoteResponse } from '../services/quoteService';

interface VendorData {
  quoteRequests: QuoteRequest[];
  vendorInfo: Vendor | null;
}

const VendorPortal = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();
  
  const [activeSection, setActiveSection] = useState('quotes');
  const [data, setData] = useState<VendorData>({
    quoteRequests: [],
    vendorInfo: null
  });
  const [quoteAmount, setQuoteAmount] = useState<string>('');
  const [quoteComment, setQuoteComment] = useState<string>('');
  const [deliveryTimeline, setDeliveryTimeline] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });
  
  const [quoteResponseDialog, setQuoteResponseDialog] = useState<{ open: boolean, request: QuoteRequest | null }>({ 
    open: false, 
    request: null 
  });
  
  const menuItems = [
    {
      icon: <StoreIcon />,
      text: 'Quote Requests',
      onClick: () => setActiveSection('quotes'),
    },
  ];

  const fetchVendorInfo = async () => {
    try {
      if (!user?.email) return;
      
      const response = await api.get(`/vendor/by-email/${user.email}`);
      setData(prevData => ({
        ...prevData,
        vendorInfo: response.data
      }));
      return response.data.id;
    } catch (error) {
      console.error('Error fetching vendor info:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load vendor information',
        severity: 'error'
      });
      return null;
    }
  };

  const fetchQuoteRequests = async (vendorId: string) => {
    try {
      setIsLoading(true);
      
      const response = await api.get(`/quotes/requests/vendor/${vendorId}`);
      
      setData(prevData => ({
        ...prevData,
        quoteRequests: response.data
      }));
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

  const submitQuoteResponse = async () => {
    if (!quoteResponseDialog.request || !quoteAmount.trim() || !deliveryTimeline.trim() || !data.vendorInfo?.id) {
      return;
    }
    
    try {
      setIsLoading(true);
      const vendorId = data.vendorInfo.id;
      
      const responseData = {
        quote_request_id: quoteResponseDialog.request.id,
        vendor_id: vendorId,
        quote_amount: parseFloat(quoteAmount),
        description: quoteComment,
        delivery_timeline: deliveryTimeline
      };
      
      await quoteService.submitQuoteResponse(quoteResponseDialog.request.id, responseData);
      
      // Reset form and close dialog
      setQuoteAmount('');
      setQuoteComment('');
      setDeliveryTimeline('');
      setQuoteResponseDialog({ open: false, request: null });
      
      // Refresh quote requests to show updated status
      if (data.vendorInfo?.id) {
        await fetchQuoteRequests(data.vendorInfo.id);
      }
      
      setSnackbar({
        open: true,
        message: 'Quote response submitted successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error submitting quote response:', error);
      setSnackbar({
        open: true,
        message: 'Failed to submit quote response',
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initializeVendorData = async () => {
      if (!user?.email) return;
      
      const vendorId = await fetchVendorInfo();
      if (vendorId) {
        fetchQuoteRequests(vendorId);
      }
    };
    
    initializeVendorData();
  }, [user?.email]);

  const handleQuoteResponseDialog = (request: QuoteRequest) => {
    setQuoteResponseDialog({ open: true, request });
    
    const existingResponse = request.responses?.find(r => r.vendor_id === data.vendorInfo?.id);
    if (existingResponse) {
      setQuoteAmount(existingResponse.quote_amount.toString());
      setQuoteComment(existingResponse.proposal || '');
      setDeliveryTimeline(existingResponse.delivery_timeline || '');
    } else {
      setQuoteAmount('');
      setQuoteComment('');
      setDeliveryTimeline('');
    }
  };
  
  const handleQuoteResponseDialogClose = () => {
    setQuoteResponseDialog({ open: false, request: null });
    setQuoteAmount('');
    setQuoteComment('');
    setDeliveryTimeline('');
  };

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const renderQuoteRequests = () => (
    <Box>
      <Typography variant={isMobile ? "h6" : "h5"} gutterBottom>
        Quote Requests
      </Typography>
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button 
          startIcon={<RefreshIcon />} 
          onClick={() => data.vendorInfo?.id && fetchQuoteRequests(data.vendorInfo.id)}
          size={isMobile ? "small" : "medium"}
        >
          Refresh Requests
        </Button>
      </Box>
      
      {isLoading ? (
        <LinearProgress />
      ) : data.quoteRequests.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1">No quote requests available at this time.</Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {data.quoteRequests.map((request) => {
            // Check if vendor has already responded using vendor ID, not user ID
            const hasResponded = request.responses?.some(r => r.vendor_id === data.vendorInfo?.id);
            const vendorResponse = request.responses?.find(r => r.vendor_id === data.vendorInfo?.id);
            
            return (
              <Grid item xs={12} sm={6} md={4} key={request.id}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Typography variant="h6" noWrap sx={{ maxWidth: '70%' }}>
                        {request.title}
                      </Typography>
                      <Chip 
                        label={request.status} 
                        color={
                          request.status === 'open' ? 'info' : 
                          request.status === 'pending' ? 'warning' : 
                          request.status === 'fulfilled' ? 'success' : 'default'
                        } 
                        size="small" 
                      />
                    </Box>
                    
                    <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
                      <Chip 
                        label={`Priority: ${request.priority}`} 
                        color={
                          request.priority === 'high' ? 'error' : 
                          request.priority === 'medium' ? 'warning' : 'info'
                        } 
                        size="small" 
                      />
                      
                      {request.budget && (
                        <Typography variant="body2">
                          Budget: ${request.budget.toFixed(2)}
                        </Typography>
                      )}
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2, height: 80, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {request.description}
                    </Typography>
                    
                    {request.requirements && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2">Requirements:</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {request.requirements}
                        </Typography>
                      </Box>
                    )}
                    
                    {hasResponded && vendorResponse ? (
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="subtitle2">Your Quote:</Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body1" color="primary" fontWeight="bold">
                            ${vendorResponse.quote_amount.toFixed(2)}
                          </Typography>
                          <Chip 
                            label={vendorResponse.status} 
                            color={
                              vendorResponse.status === 'accepted' ? 'success' : 
                              vendorResponse.status === 'rejected' ? 'error' : 
                              vendorResponse.status === 'negotiating' ? 'warning' : 'info'
                            } 
                            size="small" 
                          />
                        </Box>
                      </Box>
                    ) : null}
                    
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                      {hasResponded ? (
                        <Button 
                          variant="outlined"
                          color="success"
                          size="small"
                          disabled={true}
                          startIcon={<EditIcon />}
                        >
                          Quote Submitted
                        </Button>
                      ) : (
                        <Button 
                          variant="contained"
                          color="primary"
                          size="small"
                          onClick={() => handleQuoteResponseDialog(request)}
                          disabled={request.status !== 'open' && request.status !== 'pending'}
                        >
                          Submit Quote
                        </Button>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'quotes':
        return renderQuoteRequests();
      default:
        return renderQuoteRequests();
    }
  };

  return (
    <DashboardLayout
      title="Vendor Portal"
      menuItems={menuItems}
    >
      {renderContent()}
      
      <Dialog 
        open={quoteResponseDialog.open} 
        onClose={handleQuoteResponseDialogClose} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>Submit Quote Response</DialogTitle>
        <DialogContent>
          {quoteResponseDialog.request && (
            <>
              <Typography variant="subtitle1">{quoteResponseDialog.request.title}</Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                {quoteResponseDialog.request.description}
              </Typography>
              
              <TextField
                autoFocus
                margin="dense"
                label="Quote Amount ($)"
                type="number"
                fullWidth
                value={quoteAmount}
                onChange={(e) => setQuoteAmount(e.target.value)}
              />
              <TextField
                margin="dense"
                label="Delivery Timeline (e.g. 14 days, 2 weeks)"
                fullWidth
                value={deliveryTimeline}
                onChange={(e) => setDeliveryTimeline(e.target.value)}
                helperText="Specify how long it will take to deliver after order"
              />
              <TextField
                margin="dense"
                label="Proposal Details"
                multiline
                rows={4}
                fullWidth
                value={quoteComment}
                onChange={(e) => setQuoteComment(e.target.value)}
                helperText="Include any additional details about your proposal"
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleQuoteResponseDialogClose}>Cancel</Button>
          <Button 
            onClick={submitQuoteResponse} 
            color="primary"
            disabled={!quoteAmount.trim() || !deliveryTimeline.trim()}
          >
            Submit Response
          </Button>
        </DialogActions>
      </Dialog>
      
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </DashboardLayout>
  );
};

export default VendorPortal;
