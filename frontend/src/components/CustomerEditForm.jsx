import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';

const INDUSTRIES = [
  'Technology', 'Banking', 'Fintech', 'E-commerce', 'Healthcare',
  'Manufacturing', 'Retail', 'Food Delivery', 'Transportation',
  'InsurTech', 'Travel', 'Hospitality', 'Services', 'EdTech',
  'Logistics', 'Gaming', 'Auto', 'Other'
];

const REGIONS = ['South India', 'West India', 'North India', 'East India', 'Global'];
const PLAN_TYPES = ['License', 'Subscription', 'Usage Based', 'POC', 'Trial'];
const ONBOARDING_STATUSES = ['Not Started', 'In Progress', 'Completed'];
const PRODUCTS = ['Post Call', 'RTA', 'AI Phone Call', 'Convin Sense', 'CRM Upgrade', 'STT/TTS Solution'];

export default function CustomerEditForm({ customer, onClose, onSuccess, editSection = 'basic' }) {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({
    company_name: customer?.company_name || '',
    website: customer?.website || '',
    industry: customer?.industry || '',
    region: customer?.region || '',
    plan_type: customer?.plan_type || 'License',
    arr: customer?.arr || '',
    one_time_setup_cost: customer?.one_time_setup_cost || '',
    quarterly_consumption_cost: customer?.quarterly_consumption_cost || '',
    renewal_date: customer?.renewal_date || '',
    go_live_date: customer?.go_live_date || '',
    primary_objective: customer?.primary_objective || '',
    active_users: customer?.active_users || 0,
    total_licensed_users: customer?.total_licensed_users || 0,
    csm_owner_id: customer?.csm_owner_id || '',
    am_owner_id: customer?.am_owner_id || '',
    onboarding_status: customer?.onboarding_status || 'Not Started',
    products_purchased: customer?.products_purchased || []
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await axios.get(`${API}/users`);
      setUsers(response.data);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleProductToggle = (product) => {
    const products = formData.products_purchased || [];
    if (products.includes(product)) {
      setFormData({
        ...formData,
        products_purchased: products.filter(p => p !== product)
      });
    } else {
      setFormData({
        ...formData,
        products_purchased: [...products, product]
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.put(`${API}/customers/${customer.id}`, {
        ...formData,
        arr: formData.arr ? parseFloat(formData.arr) : null,
        one_time_setup_cost: formData.one_time_setup_cost ? parseFloat(formData.one_time_setup_cost) : null,
        quarterly_consumption_cost: formData.quarterly_consumption_cost ? parseFloat(formData.quarterly_consumption_cost) : null,
        active_users: parseInt(formData.active_users) || 0,
        total_licensed_users: parseInt(formData.total_licensed_users) || 0
      });
      toast.success('Customer updated successfully');
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update customer');
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (editSection) {
      case 'basic': return 'Edit Basic Information';
      case 'financial': return 'Edit Financial Information';
      case 'products': return 'Edit Products & Objective';
      case 'users': return 'Edit User & Ownership';
      default: return 'Edit Customer';
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getTitle()} - {customer?.company_name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {editSection === 'basic' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company_name">Company Name *</Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <select
                    id="industry"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  >
                    <option value="">Select Industry</option>
                    {INDUSTRIES.map(ind => (
                      <option key={ind} value={ind}>{ind}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="region">Region</Label>
                  <select
                    id="region"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  >
                    <option value="">Select Region</option>
                    {REGIONS.map(reg => (
                      <option key={reg} value={reg}>{reg}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="onboarding_status">Onboarding Status</Label>
                  <select
                    id="onboarding_status"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                    value={formData.onboarding_status}
                    onChange={(e) => setFormData({ ...formData, onboarding_status: e.target.value })}
                  >
                    {ONBOARDING_STATUSES.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          {editSection === 'financial' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="plan_type">Plan Type</Label>
                  <select
                    id="plan_type"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                    value={formData.plan_type}
                    onChange={(e) => setFormData({ ...formData, plan_type: e.target.value })}
                  >
                    {PLAN_TYPES.map(pt => (
                      <option key={pt} value={pt}>{pt}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="arr">ARR (₹)</Label>
                  <Input
                    id="arr"
                    type="number"
                    value={formData.arr}
                    onChange={(e) => setFormData({ ...formData, arr: e.target.value })}
                    placeholder="Enter ARR in INR"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="CONTRACT_START_DATE">Contract Start Date</Label>
                  <Input
                    id="contract_start_date"
                    type="date"
                    value={formData.contract_start_date}
                    onChange={(e) => setFormData({ ...formData, contract_start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="renewal_date">Renewal Date</Label>
                  <Input
                    id="renewal_date"
                    type="date"
                    value={formData.renewal_date}
                    onChange={(e) => setFormData({ ...formData, renewal_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="go_live_date">Go-Live Date</Label>
                  <Input
                    id="go_live_date"
                    type="date"
                    value={formData.go_live_date}
                    onChange={(e) => setFormData({ ...formData, go_live_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="one_time_setup_cost">One-time Setup Cost (₹)</Label>
                  <Input
                    id="one_time_setup_cost"
                    type="number"
                    value={formData.one_time_setup_cost}
                    onChange={(e) => setFormData({ ...formData, one_time_setup_cost: e.target.value })}
                    placeholder="Enter setup cost"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quarterly_consumption_cost">Quarterly Consumption Cost (₹)</Label>
                <Input
                  id="quarterly_consumption_cost"
                  type="number"
                  value={formData.quarterly_consumption_cost}
                  onChange={(e) => setFormData({ ...formData, quarterly_consumption_cost: e.target.value })}
                  placeholder="Enter quarterly consumption cost"
                />
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Total Contract Value</h4>
                <p className="text-2xl font-bold text-blue-700">
                  ₹{((parseFloat(formData.arr) || 0) + (parseFloat(formData.one_time_setup_cost) || 0)).toLocaleString('en-IN')}
                </p>
              </div>
            </>
          )}

          {editSection === 'products' && (
            <>
              <div className="space-y-3 mb-4">
                <Label className="text-base font-medium">Products Purchased</Label>
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  {PRODUCTS.map((product) => (
                    <label key={product} className="flex items-center space-x-2 cursor-pointer hover:bg-slate-100 p-1.5 rounded transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.products_purchased?.includes(product)}
                        onChange={() => handleProductToggle(product)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-700">{product}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="primary_objective">Primary Objective</Label>
                <textarea
                  id="primary_objective"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md min-h-[100px]"
                  value={formData.primary_objective}
                  onChange={(e) => setFormData({ ...formData, primary_objective: e.target.value })}
                  placeholder="What is the customer's main goal with this product?"
                />
              </div>
            </>
          )}

          {editSection === 'users' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="active_users">Active Users</Label>
                  <Input
                    id="active_users"
                    type="number"
                    value={formData.active_users}
                    onChange={(e) => setFormData({ ...formData, active_users: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="total_licensed_users">Total Licensed Users</Label>
                  <Input
                    id="total_licensed_users"
                    type="number"
                    value={formData.total_licensed_users}
                    onChange={(e) => setFormData({ ...formData, total_licensed_users: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="csm_owner_id">CSM Owner</Label>
                  <select
                    id="csm_owner_id"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                    value={formData.csm_owner_id}
                    onChange={(e) => setFormData({ ...formData, csm_owner_id: e.target.value })}
                  >
                    <option value="">Select CSM</option>
                    {users.filter(u => u.role === 'CSM' || u.role === 'ADMIN').map(user => (
                      <option key={user.id} value={user.id}>{user.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="am_owner_id">AM Owner</Label>
                  <select
                    id="am_owner_id"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                    value={formData.am_owner_id}
                    onChange={(e) => setFormData({ ...formData, am_owner_id: e.target.value })}
                  >
                    <option value="">Select AM</option>
                    {users.filter(u => u.role === 'AM' || u.role === 'ADMIN').map(user => (
                      <option key={user.id} value={user.id}>{user.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
