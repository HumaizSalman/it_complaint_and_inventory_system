import React, { useState, useEffect } from 'react';
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
  Alert,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import api from '../utils/axios';

// Vendor interface
interface Vendor {
  id: string;
  name: string;
  email: string;
  phone: string;
  service_type: string;
  address?: string;
  contact_person?: string;
}

// Vendor creation response interface that includes credentials
interface VendorCreateResponse extends Vendor {
  temp_password?: string;
  username?: string;
}

export default function VendorManagement() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [openVendorDialog, setOpenVendorDialog] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailConfirmDialog, setShowEmailConfirmDialog] = useState(false);
  const [newVendorEmail, setNewVendorEmail] = useState<string>('');
  
  // New state for credentials display
  const [showCredentialsDialog, setShowCredentialsDialog] = useState(false);
  const [vendorCredentials, setVendorCredentials] = useState<{
    username: string;
    password: string;
    vendorName: string;
  } | null>(null);

  const [vendorForm, setVendorForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    service_type: '',
    contact_person: '',
  });

  // Fetch vendors on component mount
  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/vendor/');
      setVendors(response.data);
    } catch (error: any) {
      console.error('Error fetching vendors:', error);
      
      // Extract specific error message from API response
      let errorMsg = 'Failed to load vendors. Please try again.';
      
      if (error.response && error.response.data && error.response.data.detail) {
        // Use the specific error message from the API
        errorMsg = error.response.data.detail;
      } else if (error.response && error.response.status === 403) {
        errorMsg = 'You are not authorized to view vendors.';
      } else if (error.response && error.response.status >= 500) {
        errorMsg = 'Server error. Please try again later or contact support.';
      } else if (error.message) {
        errorMsg = `Network error: ${error.message}`;
      }
      
      setErrorMessage(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenVendorDialog = (vendor?: Vendor) => {
    if (vendor) {
      setSelectedVendor(vendor);
      setVendorForm({
        name: vendor.name,
        email: vendor.email,
        phone: vendor.phone,
        address: vendor.address || '',
        service_type: vendor.service_type,
        contact_person: vendor.contact_person || '',
      });
    } else {
      setSelectedVendor(null);
      setVendorForm({
        name: '',
        email: '',
        phone: '',
        address: '',
        service_type: '',
        contact_person: '',
      });
    }
    setOpenVendorDialog(true);
  };

  const handleSubmitVendor = async () => {
    try {
      setIsLoading(true);
      
      if (selectedVendor) {
        // Update existing vendor
        const response = await api.put(`/vendor/${selectedVendor.id}`, vendorForm);
        const updatedVendor = response.data;
        setVendors(vendors.map(v => v.id === updatedVendor.id ? updatedVendor : v));
        setSuccessMessage('Vendor updated successfully');
      } else {
        // Create new vendor
        const response = await api.post('/vendor/', vendorForm);
        const newVendor: VendorCreateResponse = response.data;
        
        // Add to vendors list (without credentials)
        const { temp_password, username, ...vendorData } = newVendor;
        setVendors([...vendors, vendorData]);
        
        // Display credentials if they were returned
        if (newVendor.temp_password && newVendor.username) {
          setVendorCredentials({
            username: newVendor.username,
            password: newVendor.temp_password,
            vendorName: newVendor.name
          });
          setShowCredentialsDialog(true);
        }
        
        setSuccessMessage('Vendor added successfully with login credentials generated');
      }
      
      setOpenVendorDialog(false);
    } catch (error: any) {
      console.error('Error saving vendor:', error);
      
      // Extract specific error message from API response
      let errorMsg = 'Failed to save vendor. Please try again.';
      
      if (error.response && error.response.data && error.response.data.detail) {
        // Use the specific error message from the API
        errorMsg = error.response.data.detail;
      } else if (error.response && error.response.status === 400) {
        errorMsg = 'Invalid vendor data. Please check all required fields.';
      } else if (error.response && error.response.status === 403) {
        errorMsg = 'You are not authorized to create vendors.';
      } else if (error.response && error.response.status >= 500) {
        errorMsg = 'Server error. Please try again later or contact support.';
      } else if (error.message) {
        errorMsg = `Network error: ${error.message}`;
      }
      
      setErrorMessage(errorMsg);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        setSuccessMessage(null);
        setErrorMessage(null);
      }, 5000); // Increased timeout for error messages
    }
  };

  // Handle email confirmation dialog response (DEPRECATED - kept for backward compatibility)
  const handleEmailConfirmation = (confirmed: boolean) => {
    // This function is no longer used since we now display credentials directly
    setShowEmailConfirmDialog(false);
    setNewVendorEmail('');
  };

  const handleDeleteVendor = async (id: string) => {
    try {
      setIsLoading(true);
      await api.delete(`/vendor/${id}`);
      setVendors(vendors.filter(vendor => vendor.id !== id));
      setSuccessMessage('Vendor deleted successfully');
    } catch (error: any) {
      console.error('Error deleting vendor:', error);
      
      // Extract specific error message from API response
      let errorMsg = 'Failed to delete vendor. Please try again.';
      
      if (error.response && error.response.data && error.response.data.detail) {
        // Use the specific error message from the API
        errorMsg = error.response.data.detail;
      } else if (error.response && error.response.status === 403) {
        errorMsg = 'You are not authorized to delete vendors.';
      } else if (error.response && error.response.status === 404) {
        errorMsg = 'Vendor not found. It may have already been deleted.';
      } else if (error.response && error.response.status >= 500) {
        errorMsg = 'Server error. Please try again later or contact support.';
      } else if (error.message) {
        errorMsg = `Network error: ${error.message}`;
      }
      
      setErrorMessage(errorMsg);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        setSuccessMessage(null);
        setErrorMessage(null);
      }, 5000);
    }
  };

  return (
    <Box>
      {isLoading && <LinearProgress sx={{ mt: 2 }} />}

      {successMessage && (
        <Alert severity="success" sx={{ mt: 2, mb: 2 }}>
          {successMessage}
        </Alert>
      )}

      {errorMessage && (
        <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
          {errorMessage}
        </Alert>
      )}

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Vendors</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenVendorDialog()}
        >
          Add Vendor
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Service Type</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Contact Person</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {vendors.map((vendor) => (
              <TableRow key={vendor.id}>
                <TableCell>{vendor.name}</TableCell>
                <TableCell>{vendor.service_type}</TableCell>
                <TableCell>{vendor.email}</TableCell>
                <TableCell>{vendor.phone}</TableCell>
                <TableCell>{vendor.contact_person || '-'}</TableCell>
                <TableCell>
                  <IconButton color="primary" onClick={() => handleOpenVendorDialog(vendor)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton color="error" onClick={() => handleDeleteVendor(vendor.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {vendors.length === 0 && !isLoading && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No vendors found. Add your first vendor!
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Vendor Dialog */}
      <Dialog open={openVendorDialog} onClose={() => setOpenVendorDialog(false)} fullWidth>
        <DialogTitle>{selectedVendor ? 'Edit Vendor' : 'Add Vendor'}</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Name"
            fullWidth
            value={vendorForm.name}
            onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
            required
          />
          <TextField
            margin="dense"
            label="Email"
            type="email"
            fullWidth
            value={vendorForm.email}
            onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
            required
          />
          <TextField
            margin="dense"
            label="Phone"
            fullWidth
            value={vendorForm.phone}
            onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
            required
          />
          <TextField
            margin="dense"
            label="Address"
            fullWidth
            value={vendorForm.address}
            onChange={(e) => setVendorForm({ ...vendorForm, address: e.target.value })}
          />
          <FormControl fullWidth margin="dense" required>
            <InputLabel>Service Type</InputLabel>
            <Select
              value={vendorForm.service_type}
              onChange={(e) => setVendorForm({ ...vendorForm, service_type: e.target.value })}
              label="Service Type"
            >
              <MenuItem value="Hardware">Hardware</MenuItem>
              <MenuItem value="Software">Software</MenuItem>
              <MenuItem value="Networking">Networking</MenuItem>
              <MenuItem value="Consulting">Consulting</MenuItem>
              <MenuItem value="Support">Support</MenuItem>
              <MenuItem value="Training">Training</MenuItem>
              <MenuItem value="Other">Other</MenuItem>
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            label="Contact Person"
            fullWidth
            value={vendorForm.contact_person}
            onChange={(e) => setVendorForm({ ...vendorForm, contact_person: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenVendorDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleSubmitVendor} 
            color="primary" 
            disabled={isLoading || !vendorForm.name || !vendorForm.email || !vendorForm.phone || !vendorForm.service_type}
          >
            {selectedVendor ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Email Confirmation Dialog */}
      <Dialog open={showEmailConfirmDialog} onClose={() => setShowEmailConfirmDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Send Login Credentials</DialogTitle>
        <DialogContent>
          <Typography>
            Do you want to send the login credentials to this vendor via email?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleEmailConfirmation(false)}>No</Button>
          <Button onClick={() => handleEmailConfirmation(true)} variant="contained" color="primary">
            Yes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Vendor Login Credentials Dialog */}
      <Dialog 
        open={showCredentialsDialog} 
        onClose={() => setShowCredentialsDialog(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: { 
            borderTop: '4px solid #4caf50',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
          }
        }}
      >
        <DialogTitle sx={{ 
          bgcolor: '#f8f9fa', 
          borderBottom: '1px solid #e9ecef',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <Box sx={{ 
            width: 40, 
            height: 40, 
            borderRadius: '50%', 
            bgcolor: '#4caf50', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            ✓
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
              Vendor Account Created Successfully!
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Login credentials have been generated
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {vendorCredentials && (
            <Box>
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  <strong>Important:</strong> Please securely share these credentials with <strong>{vendorCredentials.vendorName}</strong>. 
                  They will need these to access their vendor portal.
                </Typography>
              </Alert>
              
              <Box sx={{ 
                bgcolor: '#f5f5f5', 
                p: 3, 
                borderRadius: 2, 
                border: '2px dashed #ccc',
                textAlign: 'center'
              }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, color: '#1976d2' }}>
                  🔐 Vendor Login Credentials
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                    Username/Email:
                  </Typography>
                  <Box sx={{ 
                    bgcolor: 'white', 
                    p: 2, 
                    borderRadius: 1, 
                    border: '1px solid #ddd',
                    fontFamily: 'monospace',
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    color: '#1976d2'
                  }}>
                    {vendorCredentials.username}
                  </Box>
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                    Temporary Password:
                  </Typography>
                  <Box sx={{ 
                    bgcolor: 'white', 
                    p: 2, 
                    borderRadius: 1, 
                    border: '1px solid #ddd',
                    fontFamily: 'monospace',
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    color: '#d32f2f'
                  }}>
                    {vendorCredentials.password}
                  </Box>
                </Box>
                
                <Alert severity="warning" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Security Note:</strong> The vendor should change this password after their first login.
                  </Typography>
                </Alert>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, bgcolor: '#f8f9fa' }}>
          <Button 
            onClick={() => setShowCredentialsDialog(false)} 
            variant="contained" 
            color="primary"
            size="large"
            fullWidth
          >
            Got it, credentials noted
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
