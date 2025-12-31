import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Plus, Search, Filter, Upload, Download, Trash2 } from 'lucide-react';
import CustomerForm from '../components/CustomerForm';
import BulkUploadModal from '../components/BulkUploadModal';
import { toast } from 'sonner';
import { downloadFromApi } from '../lib/download';

// Format currency in INR
const formatINR = (amount) => {
  if (!amount) return '₹0';
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(1)}Cr`;
  } else if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  }
  return `₹${amount.toLocaleString('en-IN')}`;
};

export default function CustomerList({ permissions }) {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingAccountStatusId, setSavingAccountStatusId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [csmUsers, setCsmUsers] = useState([]);
  const [filters, setFilters] = useState({
    healthStatus: 'all',
    accountStatus: 'all',
    csmOwner: 'all'
  });

  const handleExportCustomers = async (format) => {
    try {
      const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      await downloadFromApi(`${API}/exports/customers?format=${format}`, `customers-${ts}.${format}`);
      toast.success('Download started');
    } catch (e) {
      toast.error('Failed to download');
    }
  };

  useEffect(() => {
    loadCustomers();
    loadCsmUsers();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [customers, searchTerm, filters]);

  const loadCustomers = async () => {
    try {
      const response = await axios.get(`${API}/customers`);
      setCustomers(response.data);
    } catch (error) {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const loadCsmUsers = async () => {
    try {
      const response = await axios.get(`${API}/users?role=CSM`);
      setCsmUsers(response.data);
    } catch (error) {
      console.error('Failed to load CSM users:', error);
    }
  };

  const filterCustomers = () => {
    let filtered = [...customers];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(c =>
        c.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.website && c.website.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Health status filter
    if (filters.healthStatus !== 'all') {
      filtered = filtered.filter(c => c.health_status === filters.healthStatus);
    }

    // Account status filter
    if (filters.accountStatus !== 'all') {
      filtered = filtered.filter(c => c.account_status === filters.accountStatus);
    }

    // CSM owner filter
    if (filters.csmOwner !== 'all') {
      filtered = filtered.filter(c => c.csm_owner_id === filters.csmOwner);
    }

    setFilteredCustomers(filtered);
  };

  const handleCustomerCreated = () => {
    setShowForm(false);
    setShowBulkUpload(false);
    loadCustomers();
  };

  const handleCustomerDelete = async (e, customerId, customerName) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete ${customerName}? This action cannot be undone.`)) {
      return;
    }

    try {
      await axios.delete(`${API}/customers/${customerId}`);
      toast.success('Customer deleted successfully');
      loadCustomers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete customer');
    }
  };

  const ACCOUNT_STATUS_OPTIONS = ['POC/Pilot', 'Onboarding', 'UAT', 'Live', 'Hold', 'Churn'];

  const handleAccountStatusUpdate = async (customerId, newStatus) => {
    const prevCustomers = customers;
    const nextCustomers = customers.map((c) =>
      c.id === customerId ? { ...c, account_status: newStatus } : c
    );
    setCustomers(nextCustomers);
    setSavingAccountStatusId(customerId);
    try {
      await axios.put(`${API}/customers/${customerId}/account-status`, { account_status: newStatus });
      toast.success('Account status updated');
    } catch (e) {
      setCustomers(prevCustomers);
      toast.error(e.response?.data?.detail || 'Failed to update account status');
    } finally {
      setSavingAccountStatusId(null);
    }
  };

  const getHealthBadgeClass = (status) => {
    switch (status) {
      case 'Healthy':
        return 'health-healthy';
      case 'At Risk':
        return 'health-at-risk';
      case 'Critical':
        return 'health-critical';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  const getAccountStatusBadgeClass = (status) => {
    switch (status) {
      case 'Live':
        return 'bg-green-100 text-green-700';
      case 'Onboarding':
        return 'bg-blue-100 text-blue-700';
      case 'UAT':
        return 'bg-purple-100 text-purple-700';
      case 'POC/Pilot':
        return 'bg-orange-100 text-orange-700';
      case 'Hold':
        return 'bg-yellow-100 text-yellow-700';
      case 'Churn':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-green-100 text-green-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="px-6 py-8 space-y-6" data-testid="customer-list-page">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Customers</h1>
          <p className="text-slate-600">{filteredCustomers.length} total customers</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            onClick={() => handleExportCustomers('csv')}
            className="flex items-center space-x-2"
          >
            <Download size={18} />
            <span>Export</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowBulkUpload(true)}
            className="flex items-center space-x-2"
            data-testid="bulk-upload-button"
          >
            <Upload size={18} />
            <span>Bulk Upload</span>
          </Button>
          <Button
            onClick={() => setShowForm(true)}
            className="bg-brand-primary hover:bg-blue-700 flex items-center space-x-2"
            data-testid="add-customer-button"
          >
            <Plus size={18} />
            <span>Add Customer</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4 bg-white border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <Input
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="search-customers-input"
            />
          </div>
          <div>
            <select
              className="w-full min-w-[140px] px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.healthStatus}
              onChange={(e) => setFilters({ ...filters, healthStatus: e.target.value })}
              data-testid="filter-health-status"
            >
              <option value="all">All Health Status</option>
              <option value="Healthy">Healthy</option>
              <option value="At Risk">At Risk</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
          <div>
            <select
              className="w-full min-w-[140px] px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.accountStatus}
              onChange={(e) => setFilters({ ...filters, accountStatus: e.target.value })}
              data-testid="filter-account-status"
            >
              <option value="all">All Account Status</option>
              <option value="POC/Pilot">POC/Pilot</option>
              <option value="Onboarding">Onboarding</option>
              <option value="UAT">UAT</option>
              <option value="Live">Live</option>
              <option value="Hold">Hold</option>
              <option value="Churn">Churn</option>
            </select>
          </div>
          <div>
            <select
              className="w-full min-w-[140px] px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.csmOwner}
              onChange={(e) => setFilters({ ...filters, csmOwner: e.target.value })}
              data-testid="filter-csm-owner"
            >
              <option value="all">All CSM Owners</option>
              {csmUsers.map((csm) => (
                <option key={csm.id} value={csm.id}>
                  {csm.name}
                </option>
              ))}
            </select>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm('');
              setFilters({ healthStatus: 'all', accountStatus: 'all', csmOwner: 'all' });
            }}
            className="flex items-center space-x-2"
          >
            <Filter size={18} />
            <span>Clear Filters</span>
          </Button>
        </div>
      </Card>

      {/* Customer Table */}
      <Card className="bg-white border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Health
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  ARR
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Plan Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Account Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  CSM Owner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Renewal Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                    No customers found
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    onClick={() => navigate(`/customers/${customer.id}`)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                    data-testid={`customer-row-${customer.id}`}
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800">{customer.company_name}</div>
                      <div className="text-xs text-slate-500">{customer.region}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <Badge className={`${getHealthBadgeClass(customer.health_status)} px-2 py-1 text-xs`}>
                          {customer.health_status}
                        </Badge>
                        <span className="text-sm text-slate-600">{Math.round(customer.health_score)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-800">
                      {formatINR(customer.arr)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {customer.plan_type || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div onClick={(e) => e.stopPropagation()}>
                        <select
                          className={`px-2 py-1.5 border border-slate-300 rounded-md text-xs bg-white ${savingAccountStatusId === customer.id ? 'opacity-60 cursor-not-allowed' : ''
                            }`}
                          value={customer.account_status || 'Live'}
                          disabled={savingAccountStatusId === customer.id}
                          onChange={(e) => handleAccountStatusUpdate(customer.id, e.target.value)}
                          aria-label={`Account status for ${customer.company_name}`}
                          data-testid={`account-status-${customer.id}`}
                        >
                          {ACCOUNT_STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {customer.csm_owner_name || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {customer.renewal_date ? new Date(customer.renewal_date).toLocaleDateString('en-IN') : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {permissions?.modules?.customers?.actions?.delete && (
                        <button
                          onClick={(e) => handleCustomerDelete(e, customer.id, customer.company_name)}
                          className="text-slate-400 hover:text-red-600 transition-colors p-1"
                          title="Delete Customer"
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

      {/* Customer Form Modal */}
      {showForm && (
        <CustomerForm
          onClose={() => setShowForm(false)}
          onSuccess={handleCustomerCreated}
        />
      )}

      {/* Bulk Upload Modal */}
      {showBulkUpload && (
        <BulkUploadModal
          onClose={() => setShowBulkUpload(false)}
          onSuccess={handleCustomerCreated}
        />
      )}
    </div>
  );
}
