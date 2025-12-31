import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { X } from 'lucide-react';

export default function CustomerForm({ customer, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({
    company_name: '',
    website: '',
    industry: '',
    region: '',
    plan_type: 'License',
    arr: '',
    contract_start_date: '',
    contract_end_date: '',
    renewal_date: '',
    go_live_date: '',
    products_purchased: [],
    primary_objective: '',
    calls_processed: 0,
    active_users: 0,
    total_licensed_users: 0,
    csm_owner_id: '',
    am_owner_id: '',
    onboarding_status: 'Not Started',
    stakeholders: []
  });

  useEffect(() => {
    loadUsers();
    if (customer) {
      setFormData(customer);
    }
  }, [customer]);

  const loadUsers = async () => {
    try {
      const response = await axios.get(`${API}/users`);
      setUsers(response.data);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const payload = {
        ...formData,
        arr: formData.arr ? parseFloat(formData.arr) : 0,
        calls_processed: parseInt(formData.calls_processed) || 0,
        active_users: parseInt(formData.active_users) || 0,
        total_licensed_users: parseInt(formData.total_licensed_users) || 0
      };

      if (customer) {
        await axios.put(`${API}/customers/${customer.id}`, payload);
        toast.success('Customer updated successfully');
      } else {
        await axios.post(`${API}/customers`, payload);
        toast.success('Customer created successfully');
      }
      
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save customer');
    } finally {
      setLoading(false);
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

  const products = ['Post Call', 'RTA', 'AI Phone Call', 'Convin Sense', 'CRM Upgrade', 'STT/TTS Solution'];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{customer ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-800">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company_name">Company Name *</Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  required
                  data-testid="customer-form-company-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                />
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
                  <option value="North America">North America</option>
                  <option value="EMEA">EMEA</option>
                  <option value="APAC">APAC</option>
                  <option value="LATAM">LATAM</option>
                </select>
              </div>
            </div>
          </div>

          {/* Commercial Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-800">Commercial Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plan_type">Plan Type</Label>
                <select
                  id="plan_type"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  value={formData.plan_type}
                  onChange={(e) => setFormData({ ...formData, plan_type: e.target.value })}
                >
                  <option value="Hourly">Hourly</option>
                  <option value="License">License</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="arr">ARR ($)</Label>
                <Input
                  id="arr"
                  type="number"
                  value={formData.arr}
                  onChange={(e) => setFormData({ ...formData, arr: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contract_start_date">Contract Start Date</Label>
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
          </div>

          {/* Products */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-800">Products Purchased</h3>
            <div className="grid grid-cols-3 gap-3">
              {products.map((product) => (
                <label key={product} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.products_purchased?.includes(product)}
                    onChange={() => handleProductToggle(product)}
                    className="rounded border-slate-300"
                  />
                  <span className="text-sm text-slate-700">{product}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Usage Metrics */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-800">Usage Metrics</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="calls_processed">Calls Processed</Label>
                <Input
                  id="calls_processed"
                  type="number"
                  value={formData.calls_processed}
                  onChange={(e) => setFormData({ ...formData, calls_processed: e.target.value })}
                />
              </div>
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
          </div>

          {/* Ownership */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-800">Ownership</h3>
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
                  {users.filter(u => u.role === 'CSM').map(user => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="onboarding_status">Onboarding Status</Label>
                <select
                  id="onboarding_status"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  value={formData.onboarding_status}
                  onChange={(e) => setFormData({ ...formData, onboarding_status: e.target.value })}
                >
                  <option value="Not Started">Not Started</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="customer-form-submit"
            >
              {loading ? 'Saving...' : (customer ? 'Update Customer' : 'Create Customer')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
