import { useState } from 'react';
import { useAppState } from '../../app/providers/AppStateContext';
import { 
  Filter, Download, Leaf, 
  TrendingUp, Award, CheckCircle, AlertTriangle
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, 
  Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';
import { exportBatchReportToCSV } from '../../utils/export';
import { jsPDF } from 'jspdf';

type ReportTab = 'operational' | 'waste' | 'esg';

export function ReportsPage() {
  const { bins, batches, routes, branding } = useAppState();
  
  const [activeTab, setActiveTab] = useState<ReportTab>('operational');
  
  // Filters state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedRoute, setSelectedRoute] = useState('all');
  const [selectedHotel, setSelectedHotel] = useState('all');
  const [selectedDriver, setSelectedDriver] = useState('all');

  // Unique lists for dropdowns
  const uniqueHotels = Array.from(new Set(bins.map(b => b.customerName).filter(Boolean)));
  const uniqueDrivers = Array.from(new Set(routes.map(r => r.driverName).filter(Boolean)));

  // Filter batches based on selections
  const filteredBatches = batches.filter(batch => {
    // Date filter
    if (startDate && new Date(batch.timestamps.created) < new Date(startDate)) return false;
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (new Date(batch.timestamps.created) > end) return false;
    }

    // Route filter (batch doesn't have routeId directly, but we can match via bin or driver)
    if (selectedRoute !== 'all') {
      const matchedRoute = routes.find(r => r.id === selectedRoute);
      const isBinOnRoute = matchedRoute?.assignedBins.some(b => b.binId === batch.source);
      if (!isBinOnRoute) return false;
    }

    // Hotel filter
    if (selectedHotel !== 'all') {
      const bin = bins.find(b => b.id === batch.source);
      if (bin?.customerName !== selectedHotel) return false;
    }

    // Driver filter
    if (selectedDriver !== 'all') {
      if (batch.driverName?.toLowerCase() !== selectedDriver.toLowerCase()) return false;
    }

    return true;
  });

  // Filter routes based on selections
  const filteredRoutes = routes.filter(route => {
    if (selectedRoute !== 'all' && route.id !== selectedRoute) return false;
    if (selectedDriver !== 'all' && route.driverName !== selectedDriver) return false;
    return true;
  });

  // ── 1. OPERATIONAL CALCS ──
  const totalPickups = filteredBatches.length;
  
  // Route delay check
  const now = new Date().getTime();
  const delayedRoutesList = filteredRoutes.filter(r => 
    r.status !== 'completed' && now > new Date(r.expectedCompletionTime).getTime()
  );
  const totalDelayedRoutes = delayedRoutesList.length;
  
  // Driver efficiency
  const driverPerformanceData = uniqueDrivers.map(driverName => {
    const driverBatches = filteredBatches.filter(b => b.driverName === driverName);
    const driverRoutes = filteredRoutes.filter(r => r.driverName === driverName);
    const completed = driverRoutes.filter(r => r.status === 'completed').length;
    const total = driverRoutes.length;
    return {
      name: driverName,
      collections: driverBatches.length,
      routeCompletion: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  });

  // ── 2. WASTE CALCS ──
  const totalWasteCollected = filteredBatches.reduce((sum, b) => sum + b.weightKg, 0);
  const plasticRecovered = filteredBatches.reduce((sum, b) => sum + b.plasticWeightKg, 0);
  const glassRecovered = filteredBatches.reduce((sum, b) => sum + (b.glassWeightKg || 0), 0);
  const metalRecovered = filteredBatches.reduce((sum, b) => sum + (b.metalWeightKg || 0), 0);
  const otherRecovered = Math.max(0, totalWasteCollected - (plasticRecovered + glassRecovered + metalRecovered));

  // Overflow Incidents
  const overflowIncidentsCount = bins.filter(b => b.fillLevel > 85).length;
  const avgBinFill = bins.length > 0 ? Math.round(bins.reduce((sum, b) => sum + b.fillLevel, 0) / bins.length) : 0;

  const wasteCompositionData = [
    { name: 'Plastic', value: plasticRecovered, color: '#337e69' },
    { name: 'Glass', value: glassRecovered, color: '#818cf8' },
    { name: 'Metal', value: metalRecovered, color: '#fbbf24' },
    { name: 'Other', value: otherRecovered, color: '#766d8b' },
  ].filter(item => item.value > 0);

  // Waste collected per hotel
  const hotelWasteData = uniqueHotels.map(hotelName => {
    const hotelBatches = filteredBatches.filter(b => {
      const bin = bins.find(x => x.id === b.source);
      return bin?.customerName === hotelName;
    });
    return {
      name: hotelName?.slice(0, 12) || 'Other',
      weight: hotelBatches.reduce((sum, b) => sum + b.weightKg, 0),
    };
  }).sort((a, b) => b.weight - a.weight).slice(0, 5);

  // ── 3. ESG CALCS ──
  // Formula: CO2 Saved = Plastic Weight * 3.0
  const co2Saved = plasticRecovered * 3.0;
  const wasteDiverted = totalWasteCollected; 
  const recyclingRate = totalWasteCollected > 0 ? Math.round(((plasticRecovered + glassRecovered + metalRecovered) / totalWasteCollected) * 100) : 0;

  // Weekly ESG offset trend
  const weeklyEsgData = filteredBatches.map(b => ({
    date: new Date(b.timestamps.created).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    co2: parseFloat((b.plasticWeightKg * 3.0).toFixed(1)),
    weight: b.weightKg,
  })).reverse().slice(0, 8);

  const handlePrintPDF = async () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const nowStr = new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Load branding logo
    const logoBase64 = await new Promise<string | null>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = branding.logoUrl || '/image.png';
    });

    // Load SortyX logo
    const sortyxLogoBase64 = await new Promise<string | null>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = '/image-removebg.png';
    });

    // Helper functions for drawing
    const drawHeader = (reportTitle: string) => {
      // Draw Logo
      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', 20, 20, 16, 16);
      } else {
        // Fallback: draw logo block
        doc.setFillColor(51, 126, 105);
        doc.roundedRect(20, 20, 16, 16, 2, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.text('GC', 28, 30, { align: 'center' });
      }

      // Brand text
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(51, 126, 105); // --primary
      doc.text(branding.companyName || 'Green Carib', 40, 29);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(115, 140, 130); // --text-dim
      doc.text('Smart Waste Management Dashboard', 40, 34);

      // Report Header info (right aligned)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(115, 140, 130);
      doc.text('EXECUTIVE SUMMARY REPORT', 190, 24, { align: 'right' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(51, 126, 105);
      doc.text(reportTitle.toUpperCase(), 190, 30, { align: 'right' });

      // Divider line
      doc.setDrawColor(36, 54, 48); // --border
      doc.setLineWidth(0.4);
      doc.line(20, 42, 190, 42);
    };

    const drawFooter = () => {
      doc.setDrawColor(36, 54, 48);
      doc.setLineWidth(0.3);
      doc.line(20, 275, 190, 275);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(115, 140, 130);
      doc.text('Confidential - Generated via Green Carib EcoTracker', 20, 281);
      
      // Page number centered
      doc.text('Page 1 of 1', 105, 281, { align: 'center' });

      // Powered By SortyX in the right footer
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(115, 140, 130);
      doc.text('Powered By', 172, 281.5, { align: 'right' });

      if (sortyxLogoBase64) {
        doc.addImage(sortyxLogoBase64, 'PNG', 174, 277.5, 4.5, 4.5);
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 126, 105);
      doc.text('SortyX', 180, 281.5);
    };


    const drawMetadata = () => {
      doc.setFillColor(244, 246, 245); // light card background
      doc.roundedRect(20, 47, 170, 16, 2, 2, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 126, 105);
      
      // Col 1
      doc.text('DOCUMENT DETAILS', 25, 52);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 21, 19); // dark text
      doc.text(`Generated Date: ${nowStr}`, 25, 58);

      // Col 2
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(51, 126, 105);
      doc.text('OPERATIONAL FILTERS', 105, 52);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 21, 19);
      
      const routeText = selectedRoute === 'all' ? 'All' : routes.find(r => r.id === selectedRoute)?.routeName || 'All';
      const hotelText = selectedHotel === 'all' ? 'All' : selectedHotel;
      const driverText = selectedDriver === 'all' ? 'All' : selectedDriver;
      const dateText = (startDate || endDate) ? `${startDate || 'Start'} to ${endDate || 'End'}` : 'All Time';
      
      doc.text(`Route: ${routeText} | Hotel: ${hotelText} | Driver: ${driverText}`, 105, 57);
      doc.text(`Timeline: ${dateText}`, 105, 61);
    };

    const drawMetricCards = (cards: Array<{ label: string; value: string }>) => {
      const cardWidth = (170 - (cards.length - 1) * 5) / cards.length;
      const cardHeight = 22;
      const y = 68;

      cards.forEach((card, idx) => {
        const x = 20 + idx * (cardWidth + 5);
        
        // Draw card border & fill
        doc.setFillColor(244, 246, 245);
        doc.setDrawColor(212, 222, 218); // light border
        doc.setLineWidth(0.2);
        doc.roundedRect(x, y, cardWidth, cardHeight, 1.5, 1.5, 'FD');

        // Draw card label
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(115, 140, 130);
        doc.text(card.label.toUpperCase(), x + 4, y + 6);

        // Draw card value
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(51, 126, 105);
        doc.text(card.value, x + 4, y + 15);
      });
    };

    const drawSectionHeader = (title: string, y: number) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(51, 126, 105);
      doc.text(title.toUpperCase(), 20, y);
      
      doc.setDrawColor(51, 126, 105);
      doc.setLineWidth(0.4);
      doc.line(20, y + 2, 190, y + 2);
    };

    if (activeTab === 'operational') {
      drawHeader('Operational Analytics');
      drawMetadata();

      const activeRoutesCount = filteredRoutes.filter(r => r.status === 'active').length;
      const fleetUtil = filteredRoutes.length > 0 ? Math.round((activeRoutesCount / filteredRoutes.length) * 100) : 0;

      drawMetricCards([
        { label: 'Total Collections', value: String(totalPickups) },
        { label: 'Active Routes', value: String(activeRoutesCount) },
        { label: 'Delayed Routes', value: String(totalDelayedRoutes) },
        { label: 'Fleet Utilization', value: `${fleetUtil}%` },
      ]);

      // Section: Driver performance
      let currentY = 102;
      drawSectionHeader('Driver Performance Summary', currentY);

      currentY += 8;
      // Draw Table Header
      doc.setFillColor(237, 240, 238);
      doc.rect(20, currentY, 170, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 126, 105);
      doc.text('Driver Name', 25, currentY + 5);
      doc.text('Collections Completed', 95, currentY + 5, { align: 'center' });
      doc.text('Route Completion Rate', 155, currentY + 5, { align: 'center' });

      currentY += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 21, 19);

      if (driverPerformanceData.length === 0) {
        doc.text('No driver logs loaded in current selection.', 25, currentY + 6);
        currentY += 10;
      } else {
        driverPerformanceData.forEach((driver) => {
          doc.text(driver.name || 'Unknown', 25, currentY + 5.5);
          doc.text(String(driver.collections), 95, currentY + 5.5, { align: 'center' });
          doc.text(`${driver.routeCompletion}%`, 155, currentY + 5.5, { align: 'center' });

          doc.setDrawColor(237, 240, 238);
          doc.setLineWidth(0.2);
          doc.line(20, currentY + 8, 190, currentY + 8);
          currentY += 8;
        });
      }

      // Section: Route Monitoring Widget
      currentY += 6;
      drawSectionHeader('Route Efficiency Analysis', currentY);

      currentY += 8;
      // Draw Table Header
      doc.setFillColor(237, 240, 238);
      doc.rect(20, currentY, 170, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 126, 105);
      doc.text('Route Name', 25, currentY + 5);
      doc.text('Vehicle Info', 75, currentY + 5);
      doc.text('Assigned Driver', 115, currentY + 5);
      doc.text('Operational Status', 170, currentY + 5, { align: 'center' });

      currentY += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 21, 19);

      if (filteredRoutes.length === 0) {
        doc.text('No routes mapped to current filters.', 25, currentY + 6);
        currentY += 10;
      } else {
        filteredRoutes.forEach((route) => {
          doc.text(route.routeName, 25, currentY + 5.5);
          doc.text(route.vehicleNumber || 'N/A', 75, currentY + 5.5);
          doc.text(route.driverName || 'N/A', 115, currentY + 5.5);
          
          const compl = route.status === 'completed';
          doc.setFont('helvetica', 'bold');
          if (compl) {
            doc.setTextColor(34, 197, 94); // Green
            doc.text('COMPLETED', 170, currentY + 5.5, { align: 'center' });
          } else {
            // Check if delayed
            const isDelayed = new Date().getTime() > new Date(route.expectedCompletionTime).getTime();
            if (isDelayed) {
              doc.setTextColor(239, 68, 68); // Red
              doc.text('DELAYED', 170, currentY + 5.5, { align: 'center' });
            } else {
              doc.setTextColor(245, 158, 11); // Amber
              doc.text('ACTIVE', 170, currentY + 5.5, { align: 'center' });
            }
          }
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(15, 21, 19);

          doc.setDrawColor(237, 240, 238);
          doc.setLineWidth(0.2);
          doc.line(20, currentY + 8, 190, currentY + 8);
          currentY += 8;
        });
      }

      drawFooter();
    } else if (activeTab === 'waste') {
      drawHeader('Waste & Processing Reports');
      drawMetadata();

      drawMetricCards([
        { label: 'Waste Collected', value: `${totalWasteCollected.toLocaleString('en-IN')} kg` },
        { label: 'Plastic Recovered', value: `${plasticRecovered.toLocaleString('en-IN')} kg` },
        { label: 'Overflow Alerts', value: String(overflowIncidentsCount) },
        { label: 'Average Bin Fill', value: `${avgBinFill}%` },
      ]);

      // Highlight Diversion Rate
      doc.setFillColor(51, 126, 105, 0.05); // light green accent background
      doc.setDrawColor(51, 126, 105, 0.2);
      doc.setLineWidth(0.3);
      doc.roundedRect(20, 95, 170, 10, 1, 1, 'FD');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 126, 105);
      doc.text('DIVERSION PROFILE:', 25, 101.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 21, 19);
      doc.text(`Calculated Waste Diversion Rate: ${recyclingRate}% (from active collections in the selected time range)`, 62, 101.5);

      // Section: Processing audit
      let currentY = 114;
      drawSectionHeader('Facility Waste Processing Summary', currentY);

      currentY += 8;
      // Draw grid boxes for processing summary
      const boxW = 82;
      const boxH = 15;

      const remainingInProcess = filteredBatches
        .filter(b => b.status !== 'VERIFIED')
        .reduce((sum, b) => sum + b.weightKg, 0);

      const disposalResidue = filteredBatches
        .filter(b => b.status === 'VERIFIED')
        .reduce((sum, b) => {
          const recyclable = b.plasticWeightKg + (b.metalWeightKg ?? 0) + (b.glassWeightKg ?? 0);
          return sum + Math.max(0, b.weightKg - recyclable);
        }, 0);

      const procMetrics = [
        { label: 'Total Incoming waste', value: `${totalWasteCollected.toLocaleString('en-IN')} kg`, sub: 'All batches collected' },
        { label: 'Plastic processed', value: `${plasticRecovered.toLocaleString('en-IN')} kg`, sub: 'Processed and scaled' },
        { label: 'Remaining in process', value: `${remainingInProcess.toLocaleString('en-IN')} kg`, sub: 'Awaiting verification scales' },
        { label: 'Disposal residue', value: `${disposalResidue.toLocaleString('en-IN')} kg`, sub: 'Non-recyclable residues' },
      ];

      // Draw Row 1 boxes
      procMetrics.slice(0, 2).forEach((metric, idx) => {
        const x = 20 + idx * 88;
        doc.setFillColor(244, 246, 245);
        doc.roundedRect(x, currentY, boxW, boxH, 1, 1, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(115, 140, 130);
        doc.text(metric.label.toUpperCase(), x + 4, currentY + 5);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(51, 126, 105);
        doc.text(metric.value, x + 4, currentY + 11);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(115, 140, 130);
        doc.text(metric.sub, x + boxW - 4, currentY + 11, { align: 'right' });
      });

      currentY += 18;
      // Draw Row 2 boxes
      procMetrics.slice(2, 4).forEach((metric, idx) => {
        const x = 20 + idx * 88;
        doc.setFillColor(244, 246, 245);
        doc.roundedRect(x, currentY, boxW, boxH, 1, 1, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(115, 140, 130);
        doc.text(metric.label.toUpperCase(), x + 4, currentY + 5);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(51, 126, 105);
        doc.text(metric.value, x + 4, currentY + 11);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(115, 140, 130);
        doc.text(metric.sub, x + boxW - 4, currentY + 11, { align: 'right' });
      });

      // Section: Waste Composition
      currentY += boxH + 10;
      drawSectionHeader('Recovered Waste Composition Matrix', currentY);

      currentY += 8;
      // Header for composition table
      doc.setFillColor(237, 240, 238);
      doc.rect(20, currentY, 170, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 126, 105);
      doc.text('Waste Category', 25, currentY + 5);
      doc.text('Recovered Weight (kg)', 105, currentY + 5, { align: 'center' });
      doc.text('Proportion (%)', 165, currentY + 5, { align: 'center' });

      currentY += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 21, 19);

      if (wasteCompositionData.length === 0) {
        doc.text('No composition logs registered.', 25, currentY + 6);
      } else {
        const totalCompVal = wasteCompositionData.reduce((sum, item) => sum + item.value, 0);
        wasteCompositionData.forEach((item) => {
          const pctVal = totalCompVal > 0 ? Math.round((item.value / totalCompVal) * 100) : 0;
          doc.text(item.name, 25, currentY + 5.5);
          doc.text(`${item.value.toLocaleString('en-IN')} kg`, 105, currentY + 5.5, { align: 'center' });
          doc.text(`${pctVal}%`, 165, currentY + 5.5, { align: 'center' });

          doc.setDrawColor(237, 240, 238);
          doc.setLineWidth(0.2);
          doc.line(20, currentY + 8, 190, currentY + 8);
          currentY += 8;
        });
      }

      drawFooter();
    } else if (activeTab === 'esg') {
      drawHeader('Sustainability & ESG Reports');
      drawMetadata();

      drawMetricCards([
        { label: 'CO₂ Saved', value: `${co2Saved.toLocaleString('en-IN')} kg` },
        { label: 'Waste Diverted', value: `${wasteDiverted.toLocaleString('en-IN')} kg` },
        { label: 'Recovery Rate', value: `${recyclingRate}%` },
        { label: 'Diversion Rate', value: `${recyclingRate}%` },
      ]);

      // Section: Environmental offset trend
      let currentY = 102;
      drawSectionHeader('Carbon Savings & Waste Diversion Trend Ledger', currentY);

      currentY += 8;
      // Header for trend table
      doc.setFillColor(237, 240, 238);
      doc.rect(20, currentY, 170, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 126, 105);
      doc.text('Collection Date', 25, currentY + 5);
      doc.text('Total Waste Collected (kg)', 95, currentY + 5, { align: 'center' });
      doc.text('Carbon Offset (CO₂ Saved kg)', 155, currentY + 5, { align: 'center' });

      currentY += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 21, 19);

      if (weeklyEsgData.length === 0) {
        doc.text('No sustainability trends registered in the active system.', 25, currentY + 6);
        currentY += 10;
      } else {
        weeklyEsgData.forEach((data) => {
          doc.text(data.date, 25, currentY + 5.5);
          doc.text(`${data.weight.toLocaleString('en-IN')} kg`, 95, currentY + 5.5, { align: 'center' });
          doc.text(`${data.co2.toLocaleString('en-IN')} kg`, 155, currentY + 5.5, { align: 'center' });

          doc.setDrawColor(237, 240, 238);
          doc.setLineWidth(0.2);
          doc.line(20, currentY + 8, 190, currentY + 8);
          currentY += 8;
        });
      }

      // Section: ESG Calculation methodology box
      currentY += 10;
      doc.setFillColor(244, 246, 245);
      doc.setDrawColor(51, 126, 105, 0.25);
      doc.setLineWidth(0.3);
      doc.roundedRect(20, currentY, 170, 26, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 126, 105);
      doc.text('ESG CALCULATION NOTES & REGULATORY FRAMEWORK', 25, currentY + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 21, 19);
      doc.text('1. Carbon Offset Multiplier: CO₂ Saved = (Plastic Recovered in kg) × 3.0. This coefficient is derived from standard', 25, currentY + 12);
      doc.text('   emissions factors for mixed recycled plastics relative to virgin raw material extraction.', 25, currentY + 16);
      doc.text('2. Waste Diversion & Recovery: Waste Diverted is defined as solid waste processed and successfully rerouted from local', 25, currentY + 21);
      doc.text('   landfills. Recovery and Diversion rates reflect the net recyclable percentage of total gathered waste cargo.', 25, currentY + 25);

      drawFooter();
    }

    doc.save(`${branding.companyName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${activeTab}_report_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="reports-page print-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Filters Strip */}
      <div className="card no-print" style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Filter size={16} style={{ color: 'var(--primary)' }} />
          <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Operational Report Filters
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Start Date</label>
            <input 
              type="date" 
              className="form-control" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)} 
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>End Date</label>
            <input 
              type="date" 
              className="form-control" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)} 
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Filter by Route</label>
            <select 
              className="form-control"
              value={selectedRoute} 
              onChange={e => setSelectedRoute(e.target.value)}
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
            >
              <option value="all">All Routes</option>
              {routes.map(r => (
                <option key={r.id} value={r.id}>{r.routeName}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Filter by Hotel</label>
            <select 
              className="form-control"
              value={selectedHotel} 
              onChange={e => setSelectedHotel(e.target.value)}
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
            >
              <option value="all">All Hotels</option>
              {uniqueHotels.map(h => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Filter by Driver</label>
            <select 
              className="form-control"
              value={selectedDriver} 
              onChange={e => setSelectedDriver(e.target.value)}
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
            >
              <option value="all">All Drivers</option>
              {uniqueDrivers.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabs and Actions Row */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['operational', 'waste', 'esg'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="btn"
              style={{
                borderRadius: '6px',
                height: '34px',
                padding: '0 16px',
                background: activeTab === tab ? 'var(--primary)' : 'var(--surface)',
                color: activeTab === tab ? 'white' : 'var(--text-muted)',
                border: '1px solid var(--border)',
                fontWeight: 600
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)} Reports
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={handlePrintPDF} style={{ height: '34px', borderRadius: '6px', fontSize: '12px' }}>
            Export PDF Report
          </button>
          <button className="btn btn-primary" onClick={() => exportBatchReportToCSV(filteredBatches, branding.companyName, activeTab === 'operational' ? 'Operational Report' : activeTab === 'waste' ? 'Waste Report' : 'Sustainability & Diversion Report')} style={{ height: '34px', borderRadius: '6px', fontSize: '12px' }}>
            <Download size={13} /> Export CSV Ledger
          </button>
        </div>
      </div>

      {/* ── REPORT CONTENT PANELS ── */}

      {/* TAB 1: OPERATIONAL REPORTS */}
      {activeTab === 'operational' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Operational Analytics Summary
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '14px', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total Collections Completed</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>{totalPickups}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>Logs in active range</div>
              </div>
              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '14px', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Delayed Route Incidents</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: totalDelayedRoutes > 0 ? 'var(--red-400)' : 'var(--text)', marginTop: '4px' }}>{totalDelayedRoutes}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>Missed deadlines</div>
              </div>
              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '14px', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Fleet Utilization</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--sky-500)', marginTop: '4px' }}>
                  {filteredRoutes.length > 0 ? Math.round((filteredRoutes.filter(r => r.status === 'active').length / filteredRoutes.length) * 100) : 0}%
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>Active dispatch vehicles</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {/* Driver Performance Chart */}
            <div className="card">
              <div className="card-header">
                <Award size={16} className="card-icon" style={{ color: 'var(--primary)' }} />
                <h3 className="card-title">Driver Collection Logs</h3>
              </div>
              {driverPerformanceData.length === 0 ? (
                <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '32px' }}>No driver logs loaded.</div>
              ) : (
                <div style={{ height: '220px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={driverPerformanceData} margin={{ left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                      <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                      <ChartTooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)' }} />
                      <Bar dataKey="collections" fill="var(--primary)" radius={[4, 4, 0, 0]} name="Total Bins Collected" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Route status summary */}
            <div className="card">
              <div className="card-header">
                <CheckCircle size={16} className="card-icon" style={{ color: 'var(--green-400)' }} />
                <h3 className="card-title">Route Efficiency Analysis</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filteredRoutes.map(route => {
                  const compl = route.status === 'completed';
                  return (
                    <div key={route.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'var(--surface-2)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 700 }}>{route.routeName}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Driver: {route.driverName} ({route.vehicleNumber})</div>
                      </div>
                      <span style={{ 
                        fontSize: '10px', 
                        fontWeight: 700, 
                        color: compl ? 'var(--green-400)' : 'var(--amber-400)',
                        background: compl ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)',
                        padding: '2px 8px',
                        borderRadius: '4px'
                      }}>
                        {route.status.toUpperCase()}
                      </span>
                    </div>
                  );
                })}
                {filteredRoutes.length === 0 && (
                  <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '32px' }}>No routes mapped to current filters.</div>
                )}
              </div>
            </div>
          </div>

          {/* Delayed Route Ledger */}
          <div className="card">
            <div className="card-header">
              <AlertTriangle size={16} className="card-icon" style={{ color: 'var(--red-400)' }} />
              <h3 className="card-title">Delayed Route Ledger</h3>
            </div>
            {filteredRoutes.filter(r => r.status !== 'completed' && now > new Date(r.expectedCompletionTime).getTime()).length === 0 ? (
              <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '24px', fontSize: '12px' }}>
                No delayed routes recorded.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredRoutes
                  .filter(r => r.status !== 'completed' && now > new Date(r.expectedCompletionTime).getTime())
                  .map(route => {
                    const delayMins = Math.floor((now - new Date(route.expectedCompletionTime).getTime()) / (1000 * 60));
                    return (
                      <div key={route.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--surface-2)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--red-400)' }}>
                            {route.routeName} (Delayed by {delayMins} mins)
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Driver: {route.driverName} | Vehicle: {route.vehicleNumber}
                          </div>
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                          Deadline: {new Date(route.expectedCompletionTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* TAB 2: WASTE REPORTS */}
      {activeTab === 'waste' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Waste Tonnage Analytics
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '14px', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total Waste Collected</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--amber-400)', marginTop: '4px' }}>{totalWasteCollected.toLocaleString('en-IN')} kg</div>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>Solid waste tonnage</div>
              </div>
              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '14px', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Plastic Recovered</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>{plasticRecovered.toLocaleString('en-IN')} kg</div>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>Internally processed</div>
              </div>
              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '14px', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Overflow Alerts Generated</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: overflowIncidentsCount > 0 ? 'var(--red-400)' : 'var(--text)', marginTop: '4px' }}>{overflowIncidentsCount}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>Fill level &gt; 85% incidents</div>
              </div>
              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '14px', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Average Smart Bin Fill</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--green-400)', marginTop: '4px' }}>{avgBinFill}%</div>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>Capacity coefficient</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            
            {/* Donut Chart: Composition */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '14px', width: '100%' }}>
                Waste Composition Matrix
              </h3>
              {wasteCompositionData.length === 0 ? (
                <div style={{ color: 'var(--text-dim)', padding: '48px 0' }}>No composition data logged.</div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-around', flexWrap: 'wrap' }}>
                  <div style={{ height: '160px', width: '160px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={wasteCompositionData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={65}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {wasteCompositionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <ChartTooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {wasteCompositionData.map(item => (
                      <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.color }} />
                        <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{item.name}:</span>
                        <strong style={{ color: 'var(--text)' }}>{item.value.toLocaleString('en-IN')} kg</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bar chart: Hotel Waste collected */}
            <div className="card">
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '14px' }}>
                Top Hotels by Collection Volume
              </h3>
              {hotelWasteData.length === 0 ? (
                <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '32px' }}>No hotel collections reported.</div>
              ) : (
                <div style={{ height: '180px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hotelWasteData} layout="vertical" margin={{ left: -20, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} width={70} />
                      <ChartTooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)' }} />
                      <Bar dataKey="weight" fill="var(--primary)" radius={[0, 4, 4, 0]} name="Total Weight (kg)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

          </div>

          {/* Facility Waste Processing Report */}
          <div className="card">
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '14px' }}>
              Facility Waste Processing Report
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div style={{ background: 'var(--surface-2)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total Incoming Waste</div>
                <div style={{ fontSize: '18px', fontWeight: 800, marginTop: '4px', color: 'var(--text)' }}>
                  {totalWasteCollected.toLocaleString('en-IN')} kg
                </div>
                <span style={{ fontSize: '9px', color: 'var(--text-dim)' }}>Total weight of all collections</span>
              </div>
              <div style={{ background: 'var(--surface-2)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Plastic Recovered</div>
                <div style={{ fontSize: '18px', fontWeight: 800, marginTop: '4px', color: 'var(--green-400)' }}>
                  {plasticRecovered.toLocaleString('en-IN')} kg
                </div>
                <span style={{ fontSize: '9px', color: 'var(--text-dim)' }}>Recycled plastic processed</span>
              </div>
              <div style={{ background: 'var(--surface-2)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Remaining in Process</div>
                <div style={{ fontSize: '18px', fontWeight: 800, marginTop: '4px', color: 'var(--amber-400)' }}>
                  {filteredBatches
                    .filter(b => b.status !== 'VERIFIED')
                    .reduce((sum, b) => sum + b.weightKg, 0)
                    .toLocaleString('en-IN')} kg
                </div>
                <span style={{ fontSize: '9px', color: 'var(--text-dim)' }}>Awaiting verification scales</span>
              </div>
              <div style={{ background: 'var(--surface-2)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Disposal Residue</div>
                <div style={{ fontSize: '18px', fontWeight: 800, marginTop: '4px', color: 'var(--text-muted)' }}>
                  {filteredBatches
                    .filter(b => b.status === 'VERIFIED')
                    .reduce((sum, b) => {
                      const recyclable = b.plasticWeightKg + (b.metalWeightKg ?? 0) + (b.glassWeightKg ?? 0);
                      return sum + Math.max(0, b.weightKg - recyclable);
                    }, 0)
                    .toLocaleString('en-IN')} kg
                </div>
                <span style={{ fontSize: '9px', color: 'var(--text-dim)' }}>Non-recyclable residues</span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* TAB 3: ESG REPORTS */}
      {activeTab === 'esg' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ESG &amp; Ecological Offset Metrics
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '14px', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Estimated CO₂ Offset</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--green-400)', marginTop: '4px' }}>{co2Saved.toLocaleString('en-IN')} kg</div>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>Carbon savings ledger</div>
              </div>
              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '14px', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Waste Diverted from Landfill</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--sky-500)', marginTop: '4px' }}>{wasteDiverted.toLocaleString('en-IN')} kg</div>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>Reused solid waste</div>
              </div>
              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '14px', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Recycling Recovery Rate</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>{recyclingRate}%</div>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>Net recyclable proportion</div>
                      <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(51,126,105,0.03)', border: '1px solid var(--border)', padding: '10px 14px', borderRadius: '6px' }}>
              <Leaf size={20} style={{ color: 'var(--primary)', flexShrink: 0 }} />
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                <strong>CO₂ Calculations Note:</strong> CO₂ Saved = Plastic Weight × 3.0. CO₂ values are estimated using average recyclable plastic emission factors.
              </div>
            </div>            </div>
            </div>
          </div>

          {/* ESG Trends Chart */}
          <div className="card">
            <div className="card-header">
              <TrendingUp size={16} className="card-icon" style={{ color: 'var(--green-400)' }} />
              <h3 className="card-title">Carbon Savings and Waste Diversion Trends</h3>
            </div>
            {weeklyEsgData.length === 0 ? (
              <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '32px' }}>No trend logs registered.</div>
            ) : (
              <div style={{ height: '240px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyEsgData} margin={{ left: -10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} />
                    <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)' }} />
                    <ChartTooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)' }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="co2" stroke="var(--green-500)" strokeWidth={2.5} name="CO₂ Saved (kg)" dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="weight" stroke="var(--primary)" strokeWidth={2} name="Total Waste Collected (kg)" dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}

