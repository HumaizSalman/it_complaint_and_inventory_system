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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Grid,
  Card,
  CardContent,
  Alert,
  useTheme,
  useMediaQuery,
  Stack,
  CircularProgress,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, SwapHoriz as AssignIcon, Build as RepairIcon, Timeline as TimelineIcon, Psychology as PsychologyIcon, GetApp as DownloadIcon } from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend, ResponsiveContainer } from 'recharts';
import assetService, { Asset as AssetType, AssetCreate } from '../services/assetService';
import api from '../utils/axios';
import jsPDF from 'jspdf';
import ReactMarkdown from 'react-markdown';

interface RepairRecord {
  id: string;
  date: string;
  description: string;
  cost: number;
  type: 'repair' | 'maintenance';
  technician: string;
  parts?: string[];
}

// Extend the Asset type with UI-specific properties
interface Asset extends AssetType {
  assigned_to?: {
    name: string;
    email: string;
    department: string;
  };
}

interface Employee {
  id: string;
  name: string;
  department: string;
  email: string;
}

interface FormData {
  name: string;
  type: string;
  serialNumber: string;
  condition: string;
  specifications: string;
  purchaseCost: number;
  assignedToId?: string;
}

export default function AssetManagement() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const [assets, setAssets] = useState<Asset[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openAssignDialog, setOpenAssignDialog] = useState(false);
  const [openHistoryDialog, setOpenHistoryDialog] = useState(false);
  const [openAIPredictionDialog, setOpenAIPredictionDialog] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [formData, setFormData] = useState<FormData>({
    name: '',
    type: '',
    serialNumber: '',
    condition: 'new',
    specifications: '',
    purchaseCost: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [aiPrediction, setAiPrediction] = useState<any>(null);
  const [aiPredictionLoading, setAiPredictionLoading] = useState(false);
  const [complaints, setComplaints] = useState<any[]>([]);

  // Asset type options
  const assetTypes = ['Laptop', 'Desktop', 'Monitor', 'Mouse', 'Keyboard', 'Phone', 'Tablet', 'Printer'];

  // Add API integration functions
  const fetchAssets = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await assetService.getAssets();
      setAssets(data);
    } catch (error) {
      console.error('Error fetching assets:', error);
      setError('Failed to load assets. The asset API may not be available.');
    } finally {
      setLoading(false);
    }
  };

  const createAsset = async (assetData: AssetCreate) => {
    try {
      const newAsset = await assetService.createAsset(assetData);
      console.log('Asset created:', newAsset); // Debug log
      return newAsset;
    } catch (error) {
      console.error('Error creating asset:', error);
      throw error;
    }
  };

  const updateAsset = async (id: string, assetData: Partial<Asset>) => {
    try {
      const updatedAsset = await assetService.updateAsset(id, assetData);
      await fetchAssets(); // Refresh the list
      return updatedAsset;
    } catch (error) {
      console.error('Error updating asset:', error);
      throw error;
    }
  };

  const deleteAsset = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this asset?')) {
      try {
        await assetService.deleteAsset(id);
      } catch (error) {
        console.error('Error deleting asset:', error);
      }
    }
  };

  const assignAsset = async (assetId: string, employeeId: string) => {
    try {
      await assetService.assignAssetToEmployee(assetId, employeeId);
      await fetchAssets(); // Refresh the list
    } catch (error) {
      console.error('Error assigning asset:', error);
      throw error;
    }
  };

  const unassignAsset = async (assetId: string) => {
    try {
      await assetService.unassignAsset(assetId);
      await fetchAssets(); // Refresh the list
    } catch (error) {
      console.error('Error unassigning asset:', error);
      throw error;
    }
  };

  const handleOpenDialog = (asset?: Asset) => {
    if (asset) {
      setSelectedAsset(asset);
      setFormData({
        name: asset.name,
        type: asset.type,
        serialNumber: asset.serial_number,
        condition: asset.condition,
        specifications: asset.specifications,
        purchaseCost: asset.purchase_cost,
        assignedToId: asset.assigned_to_id
      });
    } else {
      setSelectedAsset(null);
      setFormData({
        name: '',
        type: '',
        serialNumber: '',
        condition: 'new',
        specifications: '',
        purchaseCost: 0,
        assignedToId: undefined
      });
    }
    setOpenDialog(true);
  };

  const handleOpenAssignDialog = (asset: Asset) => {
    setSelectedAsset(asset);
    setOpenAssignDialog(true);
  };

  const handleAssignAsset = async (employeeId: string) => {
    if (selectedAsset) {
      try {
        setLoading(true);
        await assignAsset(selectedAsset.id, employeeId);
        
        // Store the selected employee ID for showing success message
        setSelectedEmployee(employeeId);
        
        // Close the dialog and clear selection
        setOpenAssignDialog(false);
        
        // Update the assets list to reflect the changes
        await fetchAssets();
        
        // Show success message (already handled by parent component)
        
        // Clear selected asset after a delay to ensure success message can use its data
        setTimeout(() => {
          setSelectedAsset(null);
          // Clear the selected employee after showing the success message
          setTimeout(() => setSelectedEmployee(''), 3000);
        }, 100);
      } catch (error) {
        console.error('Error assigning asset:', error);
        setError('Failed to assign asset. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleUnassignAsset = async (asset: Asset) => {
    try {
      await unassignAsset(asset.id);
      setSelectedAsset(null);
    } catch (error) {
      console.error('Error unassigning asset:', error);
    }
  };

  const handleSubmit = async () => {
    try {
      const assetData = {
        name: formData.name,
        type: formData.type,
        status: formData.assignedToId ? 'assigned' : 'available',
        serial_number: formData.serialNumber,
        condition: formData.condition,
        specifications: formData.specifications || '',
        purchase_cost: formData.purchaseCost,
        purchase_date: selectedAsset?.purchase_date || new Date().toISOString(),
        expected_lifespan: 5,
        total_repair_cost: selectedAsset?.total_repair_cost || 0,
        next_maintenance_due: selectedAsset?.next_maintenance_due || 
          new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
        assigned_to_id: formData.assignedToId || undefined
      };

      if (selectedAsset) {
        await updateAsset(selectedAsset.id, assetData);
        console.log('Asset updated successfully');
      } else {
        await createAsset(assetData);
        console.log('Asset created successfully');
      }

      setOpenDialog(false);
      setFormData({
        name: '',
        type: '',
        serialNumber: '',
        condition: 'new',
        specifications: '',
        purchaseCost: 0,
        assignedToId: undefined
      });
      setSelectedAsset(null);
      await fetchAssets();
    } catch (error) {
      console.error('Error saving asset:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this asset?')) {
      try {
        await deleteAsset(id);
      } catch (error) {
        console.error('Error deleting asset:', error);
      }
    }
  };

  const handleAIPrediction = async (asset: Asset) => {
    console.log('AI Prediction requested for asset:', asset.name);
    setSelectedAsset(asset);
    setOpenAIPredictionDialog(true);
    setAiPrediction(null);
    setComplaints([]);
    
    try {
      setAiPredictionLoading(true);
      
      // Fetch complaints for this asset
      const assetComplaints = await assetService.getAssetComplaints(asset.id);
      setComplaints(assetComplaints);
      
      // Fetch AI prediction
      const prediction = await assetService.getAssetAIPrediction(asset.id);
      setAiPrediction(prediction);
      
    } catch (error) {
      console.error('Error fetching AI prediction:', error);
      setError('Failed to fetch AI prediction. Please try again.');
    } finally {
      setAiPredictionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'success';
      case 'assigned':
        return 'primary';
      case 'maintenance':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'new':
        return 'success';
      case 'good':
        return 'primary';
      case 'fair':
        return 'warning';
      case 'poor':
        return 'error';
      default:
        return 'default';
    }
  };

  // Function to calculate remaining lifespan
  const calculateRemainingLifespan = (asset: Asset) => {
    const purchaseDate = new Date(asset.purchase_date);
    const today = new Date();
    const yearsPassed = (today.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
    return Math.max(0, asset.expected_lifespan - yearsPassed);
  };

  // Function to predict end of life
  const predictEndOfLife = (asset: Asset) => {
    const purchaseDate = new Date(asset.purchase_date);
    const endOfLifeDate = new Date(purchaseDate);
    endOfLifeDate.setFullYear(endOfLifeDate.getFullYear() + asset.expected_lifespan);
    return endOfLifeDate;
  };

  // Function to calculate maintenance health score (0-100)
  const calculateHealthScore = (asset: Asset) => {
    const remainingLifespan = calculateRemainingLifespan(asset);
    const repairCostRatio = asset.total_repair_cost / asset.purchase_cost;
    const ageScore = (remainingLifespan / asset.expected_lifespan) * 60; // 60% weight to age
    const costScore = Math.max(0, (1 - repairCostRatio) * 40); // 40% weight to repair costs
    return Math.round(Math.max(0, Math.min(100, ageScore + costScore)));
  };

  // Function to determine condition based on health score
  const determineCondition = (healthScore: number): Asset['condition'] => {
    if (healthScore >= 75) return 'new';
    if (healthScore >= 50) return 'good';
    if (healthScore >= 25) return 'fair';
    return 'poor';
  };

  // Generate forecast data for charts
  const generateForecastData = (asset: Asset) => {
    const data = [];
    const purchaseDate = new Date(asset.purchase_date);
    const endOfLife = predictEndOfLife(asset);
    const monthsDiff = (endOfLife.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 30);

    for (let i = 0; i <= monthsDiff; i++) {
      const date = new Date(purchaseDate);
      date.setMonth(date.getMonth() + i);
      
      // Calculate expected health score for this point in time
      const monthsElapsed = i;
      const expectedHealthScore = 100 - ((monthsElapsed / monthsDiff) * 100);
      
      data.push({
        date: date.toISOString().split('T')[0],
        expectedHealth: Math.round(expectedHealthScore)
      });
    }
    return data;
  };

  // Update useEffect to fetch employees
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const response = await api.get('/employees/all');
        setEmployees(response.data);
        await fetchAssets();
      } catch (error) {
        console.error('Error initializing:', error);
        setError('Failed to initialize data');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Add this function to handle retrying
  const handleRetry = () => {
    fetchAssets();
  };

  // Function to parse markdown and render formatted PDF
  const parseMarkdownForPDF = (text: string, doc: jsPDF, startY: number, margin: number, maxWidth: number) => {
    const lines = text.split('\n');
    let yPosition = startY;
    const lineHeight = 5;
    
    lines.forEach((line) => {
      if (!line.trim()) {
        yPosition += lineHeight / 2; // Add small spacing for empty lines
        return;
      }
      
      // Handle bold headings (** text **)
      if (line.match(/^\*\*(.*?)\*\*$/)) {
        const heading = line.replace(/^\*\*(.*?)\*\*$/, '$1');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        
        // Wrap heading text if it's too long
        const wrappedHeading = doc.splitTextToSize(heading, maxWidth);
        doc.text(wrappedHeading, margin, yPosition);
        yPosition += wrappedHeading.length * (lineHeight + 1) + 2;
      }
      // Handle list items (- text)
      else if (line.match(/^[\s]*[-•✓]\s/)) {
        const listItem = line.replace(/^[\s]*[-•✓]\s/, '• ');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(40, 40, 40);
        
        // Wrap list items properly
        const availableWidth = maxWidth - 15; // Account for bullet indentation
        const wrappedLines = doc.splitTextToSize(listItem, availableWidth);
        doc.text(wrappedLines, margin + 10, yPosition);
        yPosition += wrappedLines.length * lineHeight + 1;
      }
      // Handle regular text with inline bold
      else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(40, 40, 40);
        
        // Parse inline bold text with proper wrapping
        if (line.includes('**')) {
          // For lines with inline bold, treat as regular text and let PDF handle wrapping
          // Replace markdown bold with simple formatting for better wrapping
          const cleanedLine = line.replace(/\*\*(.*?)\*\*/g, '$1');
          const wrappedLines = doc.splitTextToSize(cleanedLine, maxWidth);
          
          // Process each wrapped line to apply bold formatting where needed
          wrappedLines.forEach((wrappedLine: string, index: number) => {
            const currentY = yPosition + (index * lineHeight);
            
            // Check if this line contains any of the originally bold text
            if (line.includes('**')) {
              // For simplicity, make the entire line bold if it contains bold markers
              // This ensures no overflow while maintaining emphasis
              const hasBoldContent = /\*\*(.*?)\*\*/.test(line);
              if (hasBoldContent) {
                doc.setFont('helvetica', 'bold');
              } else {
                doc.setFont('helvetica', 'normal');
              }
            }
            
            doc.text(wrappedLine, margin, currentY);
          });
          
          yPosition += wrappedLines.length * lineHeight + 1;
        } else {
          // Regular text without formatting
          const wrappedLines = doc.splitTextToSize(line, maxWidth);
          doc.text(wrappedLines, margin, yPosition);
          yPosition += wrappedLines.length * lineHeight + 1;
        }
      }
    });
    
    return yPosition;
  };

  // Function to generate and download PDF report
  const generatePDFReport = () => {
    if (!selectedAsset || !aiPrediction) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 25;
    const maxWidth = pageWidth - (margin * 2) - 5; // Extra 5pt safety margin
    
    // Set default font
    doc.setFont('helvetica');
    
    // Add header with company/system branding
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('IT Complaint and Inventory Management System', margin, 15);
    
    // Add horizontal line under header
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(margin, 20, pageWidth - margin, 20);
    
    // Main title - Asset Name/ID
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    const assetTitle = `${selectedAsset.name}`;
    
    // Wrap asset title if it's too long
    const wrappedTitle = doc.splitTextToSize(assetTitle, maxWidth);
    doc.text(wrappedTitle, margin, 40);
    
    // Asset ID subtitle  
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    const assetIdText = `Asset ID: ${selectedAsset.id}`;
    const wrappedAssetId = doc.splitTextToSize(assetIdText, maxWidth);
    doc.text(wrappedAssetId, margin, 52);
    
    // Generated date section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Generated:', margin, 70);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    const currentDate = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    doc.text(currentDate, margin + 35, 70);
    
    // Add separator line
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(margin, 80, pageWidth - margin, 80);
    
    // AI Prediction section
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('AI Prediction Analysis', margin, 95);
    
    // Confidence and metadata in a subtle way
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    const metaText = `Confidence: ${aiPrediction.confidence.toUpperCase()} • Based on ${aiPrediction.complaint_count} complaint(s) • Analysis Date: ${new Date(aiPrediction.generated_at).toLocaleDateString()}`;
    const wrappedMetaText = doc.splitTextToSize(metaText, maxWidth);
    doc.text(wrappedMetaText, margin, 105);
    
    // Parse and render markdown content for prediction
    const contentEndY = parseMarkdownForPDF(aiPrediction.prediction, doc, 120, margin, maxWidth);
    
    // Add footer only if there's enough space, otherwise add on new page
    let yPosition;
    if (contentEndY > pageHeight - 40) {
      doc.addPage();
      yPosition = 30;
    } else {
      yPosition = pageHeight - 25;
    }
    
    // Footer with separator line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(margin, yPosition - 10, pageWidth - margin, yPosition - 10);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text('Generated by IT Complaint and Inventory Management System', margin, yPosition);
    
    // Generate clean filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const cleanAssetName = selectedAsset.name.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `AI_Prediction_Report_${cleanAssetName}_${timestamp}.pdf`;
    
    // Download the PDF
    doc.save(filename);
  };

  return (
    <Box>
      <Box 
        display="flex" 
        flexDirection={isMobile ? 'column' : 'row'} 
        justifyContent="space-between" 
        alignItems={isMobile ? 'stretch' : 'center'} 
        gap={2}
        mb={3}
      >
        <Typography variant={isMobile ? "h6" : "h5"}>Asset Management</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          fullWidth={isMobile}
        >
          Add Asset
        </Button>
      </Box>

      {loading && (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={handleRetry}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {selectedEmployee && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Asset {selectedAsset?.name} successfully assigned to {employees.find((emp) => emp.id === selectedEmployee)?.name}
        </Alert>
      )}

      {/* Asset Statistics */}
      {!error && (
        <Grid container spacing={isMobile ? 2 : 3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                <Typography color="textSecondary" gutterBottom variant={isMobile ? "body2" : "body1"}>
                  Total Assets
                </Typography>
                <Typography variant={isMobile ? "h5" : "h4"}>
                  {assets.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                <Typography color="textSecondary" gutterBottom variant={isMobile ? "body2" : "body1"}>
                  Available Assets
                </Typography>
                <Typography variant={isMobile ? "h5" : "h4"}>
                  {assets.filter(a => a.status === 'available').length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                <Typography color="textSecondary" gutterBottom variant={isMobile ? "body2" : "body1"}>
                  Assigned Assets
                </Typography>
                <Typography variant={isMobile ? "h5" : "h4"}>
                  {assets.filter(a => a.status === 'assigned').length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                <Typography color="textSecondary" gutterBottom variant={isMobile ? "body2" : "body1"}>
                  In Maintenance
                </Typography>
                <Typography variant={isMobile ? "h5" : "h4"}>
                  {assets.filter(a => a.status === 'maintenance').length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {!error && (
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
                {!isMobile && <TableCell>Type</TableCell>}
                <TableCell>Status</TableCell>
                {!isTablet && (
                  <>
                    <TableCell>Assigned To</TableCell>
                    <TableCell>Serial Number</TableCell>
                  </>
                )}
                <TableCell>Condition</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {assets.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell>
                    <Typography variant={isMobile ? "body2" : "body1"}>
                      {asset.name}
                    </Typography>
                    {isMobile && (
                      <Stack spacing={0.5} mt={0.5}>
                        <Typography variant="caption" color="textSecondary">
                          {asset.type}
                        </Typography>
                        {asset.specifications && (
                          <Typography variant="caption" color="textSecondary">
                            {asset.specifications}
                          </Typography>
                        )}
                      </Stack>
                    )}
                  </TableCell>
                  {!isMobile && <TableCell>{asset.type}</TableCell>}
                  <TableCell>
                    <Chip
                      label={asset.status}
                      color={getStatusColor(asset.status)}
                      size={isMobile ? "small" : "medium"}
                    />
                  </TableCell>
                  {!isTablet && (
                    <>
                      <TableCell>
                        {asset.assigned_to ? (
                          <Box>
                            <Typography variant="body2">
                              {asset.assigned_to.name}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {asset.assigned_to.department}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="textSecondary">
                            Not Assigned
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{asset.serial_number}</TableCell>
                    </>
                  )}
                  <TableCell>
                    <Chip
                      label={asset.condition}
                      color={getConditionColor(asset.condition)}
                      size={isMobile ? "small" : "medium"}
                    />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Tooltip title="Edit Asset">
                        <IconButton
                          size={isMobile ? "small" : "medium"}
                          onClick={() => handleOpenDialog(asset)}
                        >
                          <EditIcon fontSize={isMobile ? "small" : "medium"} />
                        </IconButton>
                      </Tooltip>
                      {asset.status !== 'assigned' ? (
                        <Tooltip title="Assign to Employee">
                          <IconButton
                            size={isMobile ? "small" : "medium"}
                            color="primary"
                            onClick={() => handleOpenAssignDialog(asset)}
                          >
                            <AssignIcon fontSize={isMobile ? "small" : "medium"} />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Tooltip title="Unassign from Employee">
                          <IconButton
                            size={isMobile ? "small" : "medium"}
                            color="warning"
                            onClick={() => handleUnassignAsset(asset)}
                          >
                            <AssignIcon fontSize={isMobile ? "small" : "medium"} />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Delete Asset">
                        <IconButton
                          size={isMobile ? "small" : "medium"}
                          color="error"
                          onClick={() => handleDelete(asset.id)}
                        >
                          <DeleteIcon fontSize={isMobile ? "small" : "medium"} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Get Deep Prediction from AI">
                        <IconButton
                          size={isMobile ? "small" : "medium"}
                          color="secondary"
                          onClick={() => handleAIPrediction(asset)}
                        >
                          <PsychologyIcon fontSize={isMobile ? "small" : "medium"} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {assets.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={isMobile ? 4 : isTablet ? 5 : 7} align="center">
                    <Typography variant="body1" sx={{ py: 2 }}>
                      No assets found. Click 'Add Asset' to create one.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add/Edit Asset Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)}
        fullScreen={isMobile}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant={isMobile ? "h6" : "h5"}>
            {selectedAsset ? 'Edit Asset' : 'Add New Asset'}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Name"
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <TextField
              select
              label="Type"
              fullWidth
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              required
            >
              {assetTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Serial Number"
              fullWidth
              value={formData.serialNumber}
              onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
              required
            />
            <TextField
              select
              label="Condition"
              fullWidth
              value={formData.condition}
              onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
              required
            >
              <MenuItem value="new">New</MenuItem>
              <MenuItem value="good">Good</MenuItem>
              <MenuItem value="fair">Fair</MenuItem>
              <MenuItem value="poor">Poor</MenuItem>
            </TextField>
            <TextField
              label="Specifications"
              fullWidth
              multiline
              rows={3}
              value={formData.specifications}
              onChange={(e) => setFormData({ ...formData, specifications: e.target.value })}
            />
            <TextField
              label="Purchase Cost"
              type="number"
              fullWidth
              value={formData.purchaseCost}
              onChange={(e) => setFormData({ ...formData, purchaseCost: Number(e.target.value) })}
              required
            />
            <TextField
              select
              label="Assign to Employee"
              fullWidth
              value={formData.assignedToId || ''}
              onChange={(e) => setFormData({ ...formData, assignedToId: e.target.value })}
            >
              <MenuItem value="">Not Assigned</MenuItem>
              {employees.map((employee) => (
                <MenuItem key={employee.id} value={employee.id}>
                  {employee.name} ({employee.department})
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            color="primary"
            disabled={!formData.name || !formData.type || !formData.serialNumber}
          >
            {selectedAsset ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign Asset Dialog */}
      <Dialog 
        open={openAssignDialog} 
        onClose={() => setOpenAssignDialog(false)}
        fullScreen={isMobile}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant={isMobile ? "h6" : "h5"}>
            Assign Asset
          </Typography>
          {loading && <LinearProgress sx={{ mt: 1 }} />}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {selectedAsset && (
              <>
                <Typography variant="subtitle1" gutterBottom>
                  Select an employee to assign <strong>{selectedAsset.name}</strong>
                </Typography>
                <Box sx={{ my: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                  <Typography variant="body2" color="textSecondary">
                    <strong>Asset Type:</strong> {selectedAsset.type}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    <strong>Serial Number:</strong> {selectedAsset.serial_number}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    <strong>Condition:</strong> {selectedAsset.condition}
                  </Typography>
                </Box>
              </>
            )}
            <Box sx={{ mt: 2 }}>
              {employees.map((employee) => (
                <Button
                  key={employee.id}
                  fullWidth
                  variant={selectedEmployee === employee.id ? "contained" : "outlined"}
                  onClick={() => setSelectedEmployee(employee.id)}
                  sx={{ 
                    mb: 1,
                    justifyContent: 'flex-start',
                    borderColor: selectedEmployee === employee.id ? 'primary.main' : 'grey.300',
                    bgcolor: selectedEmployee === employee.id ? 'primary.main' : 'background.paper',
                    '&:hover': {
                      bgcolor: selectedEmployee === employee.id ? 'primary.dark' : 'grey.100',
                    }
                  }}
                >
                  <Box sx={{ textAlign: 'left', width: '100%', p: 1 }}>
                    <Typography variant="subtitle1">{employee.name}</Typography>
                    <Typography variant="body2" color={selectedEmployee === employee.id ? "white" : "textSecondary"}>
                      {employee.department} • {employee.email}
                    </Typography>
                  </Box>
                </Button>
              ))}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: { xs: 2, sm: 2.5 } }}>
          <Button 
            onClick={() => {
              setOpenAssignDialog(false);
              setSelectedEmployee('');
            }}
            size={isMobile ? "small" : "medium"}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => handleAssignAsset(selectedEmployee)}
            disabled={!selectedEmployee || loading}
            startIcon={loading ? <CircularProgress size={20} /> : undefined}
          >
            Assign Asset
          </Button>
        </DialogActions>
      </Dialog>

      {/* Repair History Dialog */}
      <Dialog
        open={openHistoryDialog}
        onClose={() => setOpenHistoryDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Asset History & Forecast - {selectedAsset?.name}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Asset Health Metrics
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="subtitle2" color="textSecondary">
                        Health Score
                      </Typography>
                      <Typography variant="h4">
                        {selectedAsset ? calculateHealthScore(selectedAsset) : 0}%
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="subtitle2" color="textSecondary">
                        Total Repair Cost
                      </Typography>
                      <Typography variant="h4">
                        ${selectedAsset?.total_repair_cost || 0}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="subtitle2" color="textSecondary">
                        Remaining Lifespan
                      </Typography>
                      <Typography variant="h4">
                        {selectedAsset ? Math.round(calculateRemainingLifespan(selectedAsset) * 10) / 10 : 0} years
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Health Score Forecast
              </Typography>
              <Paper sx={{ p: 2, height: 300 }}>
                {selectedAsset && (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={generateForecastData(selectedAsset)}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        interval={Math.floor(generateForecastData(selectedAsset).length / 5)}
                      />
                      <YAxis />
                      <ChartTooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="expectedHealth"
                        stroke="#8884d8"
                        name="Expected Health"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Repair History
              </Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Cost</TableCell>
                      <TableCell>Technician</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {/* Remove or comment out this section
                      {selectedAsset?.repairHistory.map((repair) => (
                        <TableRow key={repair.id}>
                          <TableCell>{repair.date}</TableCell>
                          <TableCell>{repair.description}</TableCell>
                          // ... other cells
                        </TableRow>
                      ))}
                    */}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenHistoryDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* AI Prediction Dialog */}
      <Dialog
        open={openAIPredictionDialog}
        onClose={() => setOpenAIPredictionDialog(false)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <PsychologyIcon color="secondary" />
            <Typography variant={isMobile ? "h6" : "h5"}>
              Deep AI Prediction Analysis
            </Typography>
          </Box>
          <Typography variant="subtitle2" color="textSecondary" sx={{ mt: 1 }}>
            Asset: {selectedAsset?.name} ({selectedAsset?.type})
          </Typography>
          {aiPredictionLoading && <LinearProgress sx={{ mt: 1 }} />}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {aiPredictionLoading ? (
              <Box display="flex" flexDirection="column" alignItems="center" gap={2} py={4}>
                <CircularProgress size={60} />
                <Typography variant="body1" color="textSecondary">
                  Analyzing complaint history and generating AI prediction...
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  This may take a few moments as our AI processes the data.
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={3}>
                {/* Asset Overview Card */}
                <Grid item xs={12}>
                  <Card sx={{ bgcolor: 'background.default' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="secondary">
                        📊 Asset Overview
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6} md={3}>
                          <Box textAlign="center">
                            <Typography variant="h4" color="primary">
                              {selectedAsset ? calculateHealthScore(selectedAsset) : 0}%
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              Current Health Score
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                          <Box textAlign="center">
                            <Typography variant="h4" color="warning.main">
                              {complaints.length}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              Total Complaints
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                          <Box textAlign="center">
                            <Typography variant="h4" color="success.main">
                              {selectedAsset ? Math.round(calculateRemainingLifespan(selectedAsset) * 10) / 10 : 0}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              Years Since Purchase
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                          <Box textAlign="center">
                            <Chip 
                              label={aiPrediction?.confidence || 'Unknown'} 
                              color={
                                aiPrediction?.confidence === 'high' ? 'success' : 
                                aiPrediction?.confidence === 'medium' ? 'warning' : 'error'
                              }
                              size="small"
                            />
                            <Typography variant="caption" color="textSecondary" display="block">
                              AI Confidence Level
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>

                {/* AI Prediction Card */}
                {aiPrediction && (
                  <Grid item xs={12}>
                    <Card>
                      <CardContent>
                        <Box display="flex" alignItems="center" gap={1} mb={2}>
                          <PsychologyIcon color="secondary" />
                          <Typography variant="h6" color="secondary">
                            🤖 AI-Generated Prediction
                          </Typography>
                          {aiPrediction.note && (
                            <Chip 
                              label="Fallback Mode" 
                              size="small" 
                              color="warning" 
                              variant="outlined"
                            />
                          )}
                        </Box>
                        
                        <Alert severity="info" sx={{ mb: 2 }}>
                          <Typography variant="body2">
                            Generated on {new Date(aiPrediction.generated_at).toLocaleString()} | 
                            Based on {aiPrediction.complaint_count} complaint(s) | 
                            Confidence: {aiPrediction.confidence}
                          </Typography>
                        </Alert>

                        <Paper sx={{ p: 3, bgcolor: 'grey.50' }}>
                          <Box
                            sx={{
                              '& h1, & h2, & h3, & h4, & h5, & h6': {
                                fontFamily: 'inherit',
                                fontWeight: 'bold',
                                marginTop: 2,
                                marginBottom: 1,
                              },
                              '& h1': { fontSize: '1.5rem' },
                              '& h2': { fontSize: '1.3rem' },
                              '& h3': { fontSize: '1.1rem' },
                              '& p': {
                                marginBottom: 1,
                                lineHeight: 1.6,
                              },
                              '& strong': {
                                fontWeight: 'bold',
                                color: 'primary.main',
                              },
                              '& ul, & ol': {
                                paddingLeft: 2,
                                marginBottom: 1,
                              },
                              '& li': {
                                marginBottom: 0.5,
                              },
                            }}
                          >
                            <ReactMarkdown>{aiPrediction.prediction}</ReactMarkdown>
                          </Box>
                        </Paper>

                        {aiPrediction.note && (
                          <Alert severity="warning" sx={{ mt: 2 }}>
                            <Typography variant="body2">
                              {aiPrediction.note}
                            </Typography>
                          </Alert>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {/* Complaint History Card */}
                {complaints.length > 0 && (
                  <Grid item xs={12}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom color="secondary">
                          📋 Recent Complaint History ({complaints.length} total)
                        </Typography>
                        <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
                          {complaints.slice(0, 5).map((complaint, index) => (
                            <Paper 
                              key={complaint.id} 
                              sx={{ p: 2, mb: 1, border: '1px solid', borderColor: 'grey.200' }}
                            >
                              <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                                <Box flex={1}>
                                  <Typography variant="subtitle2" fontWeight="bold">
                                    {complaint.title}
                                  </Typography>
                                  <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                                    {complaint.description.substring(0, 150)}
                                    {complaint.description.length > 150 && '...'}
                                  </Typography>
                                  <Box display="flex" gap={1} mt={1}>
                                    <Chip 
                                      label={complaint.priority} 
                                      size="small" 
                                      color={
                                        complaint.priority === 'high' ? 'error' : 
                                        complaint.priority === 'medium' ? 'warning' : 'default'
                                      }
                                    />
                                    <Chip 
                                      label={complaint.status} 
                                      size="small" 
                                      variant="outlined"
                                    />
                                  </Box>
                                </Box>
                                <Typography variant="caption" color="textSecondary">
                                  {new Date(complaint.date_submitted).toLocaleDateString()}
                                </Typography>
                              </Box>
                            </Paper>
                          ))}
                          {complaints.length > 5 && (
                            <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', mt: 1 }}>
                              ... and {complaints.length - 5} more complaints
                            </Typography>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {/* No Complaints Card */}
                {complaints.length === 0 && !aiPredictionLoading && (
                  <Grid item xs={12}>
                    <Card>
                      <CardContent sx={{ textAlign: 'center', py: 4 }}>
                        <Typography variant="h6" color="success.main" gutterBottom>
                          🎉 Great News!
                        </Typography>
                        <Typography variant="body1" color="textSecondary">
                          This asset has no complaint history. This is typically a good sign indicating 
                          reliable performance and proper maintenance.
                        </Typography>
                        <Alert severity="success" sx={{ mt: 2 }}>
                          <Typography variant="body2">
                            Assets with clean complaint histories generally have longer lifespans and 
                            require less maintenance intervention.
                          </Typography>
                        </Alert>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
              </Grid>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: { xs: 2, sm: 3 } }}>
          <Button 
            onClick={() => setOpenAIPredictionDialog(false)}
            size={isMobile ? "small" : "medium"}
          >
            Close
          </Button>
          {aiPrediction && (
            <>
              <Button 
                variant="outlined" 
                color="secondary"
                onClick={() => {
                  const predictionText = `AI Prediction Report for ${selectedAsset?.name}\n\nGenerated: ${new Date(aiPrediction.generated_at).toLocaleString()}\nConfidence: ${aiPrediction.confidence}\nComplaint Count: ${aiPrediction.complaint_count}\n\n${aiPrediction.prediction}`;
                  navigator.clipboard.writeText(predictionText);
                  alert('AI prediction copied to clipboard!');
                }}
                size={isMobile ? "small" : "medium"}
              >
                Copy Report
              </Button>
              <Button 
                variant="contained" 
                color="primary"
                startIcon={<DownloadIcon />}
                onClick={generatePDFReport}
                size={isMobile ? "small" : "medium"}
              >
                Download PDF Report
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
