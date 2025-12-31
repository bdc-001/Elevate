import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Plus, ExternalLink, Download, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { downloadFromApi } from '../lib/download';

const REPORT_TYPES = [
  'Weekly Usage Report',
  'Monthly Performance Report',
  'QBR Data Pack',
  'Custom Analysis',
  'Benchmark Report',
  'ROI Report',
  'Other'
];

export default function DataLabsReports({ permissions }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [formData, setFormData] = useState({
    customer_id: '',
    report_date: new Date().toISOString().split('T')[0],
    report_title: '',
    report_link: '',
    report_type: 'Weekly Usage Report',
    description: '',
    sent_to: []
  });

  const handleExport = async (format) => {
    try {
      const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      await downloadFromApi(`${API}/exports/datalabs-reports?format=${format}`, `datalabs-reports-${ts}.${format}`);
      toast.success('Download started');
    } catch (e) {
      toast.error('Failed to download');
    }
  };

  useEffect(() => {
    loadReports();
    loadCustomers();
  }, []);

  const loadReports = async () => {
    try {
      const response = await axios.get(`${API}/datalabs-reports`);
      setReports(response.data);
    } catch (error) {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const response = await axios.get(`${API}/customers`);
      setCustomers(response.data);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const handleReportDelete = async (reportId) => {
    if (!window.confirm('Are you sure you want to delete this report entry?')) {
      return;
    }

    try {
      await axios.delete(`${API}/datalabs-reports/${reportId}`);
      toast.success('Report entry deleted successfully');
      loadReports();
    } catch (error) {
      toast.error('Failed to delete report entry');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(`${API}/datalabs-reports`, formData);
      toast.success('Report entry created successfully');
      setShowForm(false);
      setFormData({
        customer_id: '',
        report_date: new Date().toISOString().split('T')[0],
        report_title: '',
        report_link: '',
        report_type: 'Weekly Usage Report',
        description: '',
        sent_to: []
      });
      loadReports();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create report entry');
    } finally {
      setLoading(false);
    }
  };

  if (loading && reports.length === 0) {
    return <div className="flex items-center justify-center h-96"><div className="spinner"></div></div>;
  }

  return (
    <div className="px-6 py-8 space-y-6" data-testid="datalabs-reports-page">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Data Labs Reports</h1>
          <p className="text-slate-600">{reports.length} total reports sent</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={() => handleExport('csv')} className="flex items-center space-x-2">
            <Download size={18} />
            <span>Export CSV</span>
          </Button>
          <Button
            onClick={() => setShowForm(true)}
            className="bg-brand-primary hover:bg-blue-700 flex items-center space-x-2"
            data-testid="add-report-button"
          >
            <Plus size={18} />
            <span>Add Report Entry</span>
          </Button>
        </div>
      </div>

      {/* Info Card */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">What are Data Labs Reports?</h3>
        <p className="text-sm text-blue-800">
          Data Labs Reports are customized analytics and insights reports created by CSM teams to provide
          customers with data-driven visibility into their usage, performance, and ROI. These reports go
          beyond standard dashboards and offer tailored analysis, benchmarking, and actionable recommendations.
        </p>
      </Card>

      {/* Reports List */}
      <Card className="bg-white border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Report Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Created By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Link
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {reports.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                    No reports added yet
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-800">
                      {new Date(report.report_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-800">
                      {report.customer_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-800">
                      {report.report_title}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {report.report_type}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {report.created_by_name}
                    </td>
                    <td className="px-6 py-4">
                      <a
                        href={report.report_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-1 text-blue-600 hover:text-blue-700"
                      >
                        <ExternalLink size={16} />
                        <span className="text-sm">View</span>
                      </a>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {permissions?.modules?.datalabs_reports?.actions?.delete && (
                        <button
                          onClick={() => handleReportDelete(report.id)}
                          className="text-slate-400 hover:text-red-600 transition-colors p-1"
                          title="Delete Report"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Report Form */}
      {showForm && (
        <Dialog open={true} onOpenChange={setShowForm}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Data Labs Report Entry</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customer_id">Customer *</Label>
                <select
                  id="customer_id"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  value={formData.customer_id}
                  onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                  required
                >
                  <option value="">Select Customer</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>{customer.company_name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="report_date">Report Date *</Label>
                  <Input
                    id="report_date"
                    type="date"
                    value={formData.report_date}
                    onChange={(e) => setFormData({ ...formData, report_date: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="report_type">Report Type *</Label>
                  <select
                    id="report_type"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                    value={formData.report_type}
                    onChange={(e) => setFormData({ ...formData, report_type: e.target.value })}
                    required
                  >
                    {REPORT_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="report_title">Report Title *</Label>
                <Input
                  id="report_title"
                  placeholder="e.g., Q4 2025 Usage Analysis for Customer"
                  value={formData.report_title}
                  onChange={(e) => setFormData({ ...formData, report_title: e.target.value })}
                  required
                  data-testid="report-form-title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="report_link">Report Link *</Label>
                <Input
                  id="report_link"
                  type="url"
                  placeholder="https://..."
                  value={formData.report_link}
                  onChange={(e) => setFormData({ ...formData, report_link: e.target.value })}
                  required
                  data-testid="report-form-link"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md min-h-[80px]"
                  placeholder="Key insights and findings from this report..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700"
                  data-testid="report-form-submit"
                >
                  {loading ? 'Saving...' : 'Add Report'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
