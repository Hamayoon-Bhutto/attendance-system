import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Settings } from '../types';
import { StudentMonthStats } from './attendanceMath';

export function generateAttendanceReportPdf(
  year: number,
  month: number,
  stats: StudentMonthStats[],
  settings: Settings,
  batchName?: string
): { doc: jsPDF; filename: string; blob: Blob } {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
  const filename = `Attendance-Report-${year}-${String(month).padStart(2, '0')}.pdf`;

  // Draw Header
  const skyColor: [number, number, number] = [2, 132, 199]; // #0284C7 (Sunrise Sky Blue)
  const orangeColor: [number, number, number] = [242, 101, 34]; // #F26522

  // Top colored accent bar
  doc.setFillColor(...orangeColor);
  doc.rect(0, 0, 210, 4, 'F');
  doc.setFillColor(...skyColor);
  doc.rect(0, 4, 210, 2, 'F');

  // Academy Name & Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(...skyColor);
  doc.text(settings.academyName.toUpperCase(), 15, 19);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Official Monthly Attendance Report  •  ${monthName}${batchName ? `  •  Batch: ${batchName}` : ''}`, 15, 26);
  doc.text(`Contact: ${settings.contactPhone}  •  Generated: ${new Date().toLocaleDateString()}`, 15, 31);

  // Divider line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(15, 35, 195, 35);

  // Table rows
  const tableData = stats.map((st, idx) => {
    const star = st.percentage >= 95 ? ' ★' : '';
    return [
      idx + 1,
      st.student.fullName + star,
      st.workingDays,
      st.present,
      st.absent,
      st.late,
      st.leave,
      `${st.percentage}%`,
      st.student.status === 'active' ? 'Active' : st.student.status === 'suspended' ? 'Suspended' : 'Left',
    ];
  });

  autoTable(doc, {
    startY: 40,
    head: [['#', 'Student Name', 'Working Days', 'Present', 'Absent', 'Late', 'Leave', 'Attendance %', 'Status']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: skyColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [15, 23, 42],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'left', fontStyle: 'bold' },
      2: { halign: 'center' },
      3: { halign: 'center', textColor: [22, 163, 74] }, // green
      4: { halign: 'center', textColor: [220, 38, 38] }, // red
      5: { halign: 'center', textColor: [217, 119, 6] }, // amber
      6: { halign: 'center', textColor: [37, 99, 235] }, // blue
      7: { halign: 'right', fontStyle: 'bold' },
      8: { halign: 'center' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didDrawPage: (data) => {
      // Footer on every page
      const pageCount = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}  •  ${settings.academyName} Attendance System`,
        15,
        290
      );
    },
  });

  const blob = doc.output('blob');
  return { doc, filename, blob };
}

export function generateLeaderboardPdf(
  year: number,
  month: number,
  rankedStats: StudentMonthStats[],
  settings: Settings
): { doc: jsPDF; filename: string; blob: Blob } {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
  const filename = `Leaderboard-${year}-${String(month).padStart(2, '0')}.pdf`;

  const skyColor: [number, number, number] = [2, 132, 199];
  const amberColor: [number, number, number] = [245, 158, 11]; // #F59E0B

  // Top header banner
  doc.setFillColor(...skyColor);
  doc.rect(0, 0, 210, 36, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text(settings.academyName.toUpperCase(), 15, 15);

  doc.setFontSize(12);
  doc.setTextColor(253, 230, 138); // amber light
  doc.text(`★ MONTHLY ATTENDANCE LEADERBOARD & REWARDS ★`, 15, 23);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(224, 242, 254);
  doc.text(`Month: ${monthName}  •  Reward: ${settings.rewardText} (Top ${settings.rewardSlots})`, 15, 30);

  // Star of the month highlight block
  const star = rankedStats.find((s) => s.rank === 1);
  if (star) {
    doc.setFillColor(254, 243, 199); // light amber
    doc.roundedRect(15, 42, 180, 24, 3, 3, 'F');
    doc.setDrawColor(...amberColor);
    doc.setLineWidth(0.8);
    doc.roundedRect(15, 42, 180, 24, 3, 3, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(180, 83, 9);
    doc.text(`★ STAR OF THE MONTH: ${star.student.fullName.toUpperCase()} ★`, 20, 52);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(146, 64, 14);
    doc.text(
      `Perfect Attendance Achievement: ${star.percentage}%  •  Present: ${star.present} days  •  Prize: ${settings.rewardText}`,
      20,
      60
    );
  }

  // Table
  const tableData = rankedStats.map((st) => {
    const isRewarded = st.rank && st.rank <= settings.rewardSlots;
    const badge = st.rank === 1 ? '★ Star 1' : st.rank ? `#${st.rank}` : '-';
    const rewardNotice = isRewarded ? `Award Winner (${settings.rewardText})` : '-';

    return [
      badge,
      st.student.fullName,
      `${st.percentage}%`,
      st.present,
      st.late,
      st.absent,
      rewardNotice,
    ];
  });

  autoTable(doc, {
    startY: 72,
    head: [['Rank', 'Student Name', 'Attendance %', 'Present', 'Late', 'Absent', 'Reward Status']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: skyColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [15, 23, 42],
    },
    columnStyles: {
      0: { halign: 'center', fontStyle: 'bold', cellWidth: 18 },
      1: { halign: 'left', fontStyle: 'bold' },
      2: { halign: 'right', fontStyle: 'bold', textColor: [2, 132, 199] },
      3: { halign: 'center' },
      4: { halign: 'center' },
      5: { halign: 'center' },
      6: { halign: 'left', fontStyle: 'italic', textColor: [180, 83, 9] },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  const blob = doc.output('blob');
  return { doc, filename, blob };
}

export function exportMonthlyReportPdf(
  year: number,
  month: number,
  stats: StudentMonthStats[],
  settings: Settings,
  batchName?: string
): jsPDF {
  const { doc, filename } = generateAttendanceReportPdf(year, month, stats, settings, batchName);
  doc.save(filename);
  return doc;
}

export function exportLeaderboardPdf(
  year: number,
  month: number,
  rankedStats: StudentMonthStats[],
  settings: Settings
): jsPDF {
  const { doc, filename } = generateLeaderboardPdf(year, month, rankedStats, settings);
  doc.save(filename);
  return doc;
}
