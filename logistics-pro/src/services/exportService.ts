import { getDeliveries } from '../lib/api';

export const exportService = {
  async exportDeliveries(uid: string): Promise<string> {
    const deliveries = await getDeliveries();

    if (!deliveries.length) return '';

    const headers = ['Delivery #', 'Status', 'Pickup', 'Dropoff', 'Weight', 'Fee', 'Created'];
    const rows = deliveries.map((d: any) => [
      d.delivery_number || '',
      d.status || '',
      d.pickup_location || '',
      d.dropoff_location || '',
      d.weight || '',
      d.total_fee || '',
      d.created_at || ''
    ]);

    const csv = [headers.join(','), ...rows.map((r: string[]) => r.map(v => `"${v}"`).join(','))].join('\n');
    return csv;
  },

  downloadCSV(csv: string, filename: string = 'deliveries.csv') {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
};
