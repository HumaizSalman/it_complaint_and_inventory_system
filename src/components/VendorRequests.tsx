import React, { useState } from 'react';
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
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

interface VendorRequest {
  id: string;
  type: 'purchase' | 'repair' | 'maintenance';
  description: string;
  vendorName: string;
  estimatedCost: number;
  status: 'pending' | 'approved' | 'rejected';
  priority: 'low' | 'medium' | 'high';
  dateSubmitted: string;
  quotes: Quote[];
}

interface Quote {
  vendorName: string;
  amount: number;
  deliveryTime: string;
}

const initialRequests: VendorRequest[] = [
  {
    id: '1',
    type: 'purchase',
    description: 'New laptops for development team',
    vendorName: 'Tech Solutions Inc',
    estimatedCost: 5000,
    status: 'pending',
    priority: 'high',
    dateSubmitted: '2024-01-01',
    quotes: [
      {
        vendorName: 'Tech Solutions Inc',
        amount: 5000,
        deliveryTime: '2 weeks',
      },
      {
        vendorName: 'Digital Systems Ltd',
        amount: 5500,
        deliveryTime: '1 week',
      },
      {
        vendorName: 'IT Suppliers Co',
        amount: 4800,
        deliveryTime: '3 weeks',
      },
    ],
  },
];

export default function VendorRequests() {
  const [requests, setRequests] = useState<VendorRequest[]>(initialRequests);
  const [openDialog, setOpenDialog] = useState(false);
  const [openQuotesDialog, setOpenQuotesDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<VendorRequest | null>(null);
  const [formData, setFormData] = useState({
    type: 'purchase' as const,
    description: '',
    vendorName: '',
    estimatedCost: '',
    priority: 'medium' as const,
  });

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setFormData({
      type: 'purchase',
      description: '',
      vendorName: '',
      estimatedCost: '',
      priority: 'medium',
    });
  };

  const handleSubmit = () => {
    const newRequest: VendorRequest = {
      id: Math.random().toString(36).substr(2, 9),
      ...formData,
      estimatedCost: parseFloat(formData.estimatedCost),
      status: 'pending',
      dateSubmitted: new Date().toISOString().split('T')[0],
      quotes: [],
    };
    setRequests([...requests, newRequest]);
    handleCloseDialog();
  };

  const handleViewQuotes = (request: VendorRequest) => {
    setSelectedRequest(request);
    setOpenQuotesDialog(true);
  };

  const handleUpdateStatus = (requestId: string, newStatus: 'approved' | 'rejected') => {
    setRequests(
      requests.map((req) =>
        req.id === requestId ? { ...req, status: newStatus } : req
      )
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      default:
        return 'warning';
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Vendor Requests</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpenDialog}
        >
          New Request
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Type</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Vendor</TableCell>
              <TableCell>Est. Cost</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Date Submitted</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell>{request.type}</TableCell>
                <TableCell>{request.description}</TableCell>
                <TableCell>{request.vendorName}</TableCell>
                <TableCell>${request.estimatedCost}</TableCell>
                <TableCell>
                  <Chip
                    label={request.priority}
                    color={getPriorityColor(request.priority)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={request.status}
                    color={getStatusColor(request.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>{request.dateSubmitted}</TableCell>
                <TableCell>
                  <Button
                    size="small"
                    onClick={() => handleViewQuotes(request)}
                  >
                    View Quotes
                  </Button>
                  {request.status === 'pending' && (
                    <>
                      <Button
                        size="small"
                        color="primary"
                        onClick={() => handleUpdateStatus(request.id, 'approved')}
                      >
                        Approve
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        onClick={() => handleUpdateStatus(request.id, 'rejected')}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* New Request Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>New Vendor Request</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                value={formData.type}
                label="Type"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    type: e.target.value as 'purchase' | 'repair' | 'maintenance',
                  })
                }
              >
                <MenuItem value="purchase">Purchase</MenuItem>
                <MenuItem value="repair">Repair</MenuItem>
                <MenuItem value="maintenance">Maintenance</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
            <TextField
              label="Vendor Name"
              fullWidth
              value={formData.vendorName}
              onChange={(e) =>
                setFormData({ ...formData, vendorName: e.target.value })
              }
            />
            <TextField
              label="Estimated Cost"
              fullWidth
              type="number"
              value={formData.estimatedCost}
              onChange={(e) =>
                setFormData({ ...formData, estimatedCost: e.target.value })
              }
            />
            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={formData.priority}
                label="Priority"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    priority: e.target.value as 'low' | 'medium' | 'high',
                  })
                }
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            Submit
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Quotes Dialog */}
      <Dialog
        open={openQuotesDialog}
        onClose={() => setOpenQuotesDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Vendor Quotes</DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Vendor</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Delivery Time</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedRequest.quotes.map((quote, index) => (
                    <TableRow key={index}>
                      <TableCell>{quote.vendorName}</TableCell>
                      <TableCell>${quote.amount}</TableCell>
                      <TableCell>{quote.deliveryTime}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenQuotesDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
