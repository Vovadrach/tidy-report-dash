// Helper functions to convert between hours:minutes format and decimal
export const hoursToDecimal = (hoursStr: string): number => {
  if (!hoursStr) return 0;

  if (hoursStr.includes(':')) {
    const [hours, minutes] = hoursStr.split(':').map(s => parseInt(s) || 0);
    return Math.round((hours * 60 + minutes) * 100) / 6000;
  }

  return parseFloat(hoursStr) || 0;
};

export const decimalToHours = (decimal: number): string => {
  if (!decimal) return "0";
  const totalMinutes = Math.round(decimal * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours}` : `${hours}:${minutes.toString().padStart(2, '0')}`;
};
