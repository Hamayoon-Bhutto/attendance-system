export async function sharePdfFile(
  blob: Blob,
  filename: string,
  shareTitle: string,
  shareText: string
): Promise<{ sharedViaNative: boolean; message: string }> {
  const file = new File([blob], filename, { type: 'application/pdf' });

  // Try native Web Share API with file support (iOS Safari 15+, Android Chrome)
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: shareTitle,
        text: shareText,
      });
      return { sharedViaNative: true, message: 'Shared successfully!' };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { sharedViaNative: false, message: 'Share cancelled' };
      }
      console.warn('Native share failed, falling back:', err);
    }
  }

  // Fallback: Trigger browser file download
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);

  // Open WhatsApp Web / App share dialog with summary text
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n\n(PDF file downloaded to your device)`)}`;
  window.open(whatsappUrl, '_blank');

  return {
    sharedViaNative: false,
    message: 'PDF downloaded! Opened WhatsApp share sheet.',
  };
}

export function getGuardianWhatsAppUrl(
  guardianPhone: string,
  studentName: string,
  academyName: string,
  monthName: string,
  presentDays: number,
  workingDays: number,
  percentage: number,
  feeStatus: string
): string {
  // Strip non-numeric characters except leading +
  const cleanPhone = guardianPhone.replace(/[^\d+]/g, '');
  const text =
    `Assalam o Alaikum, this is ${academyName}.\n\n` +
    `Attendance Update for ${studentName} (${monthName}):\n` +
    `• Attended: ${presentDays} of ${workingDays} working days (${percentage}%)\n` +
    `• Monthly Fee Status: ${feeStatus.toUpperCase()}\n\n` +
    `Thank you for keeping regular training discipline!`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}
