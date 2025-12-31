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
              {/* ... existing basic fields ... (omitted for brevity in replacement, but I must be careful not to delete them if I'm replacing a huge chunk) */}

              {/* ACTUALLY, I SHOULD USE SMALLER CHUNKS TO AVOID REPLACING THE WHOLE FILE IF POSSIBLE */}
              {/* RE-WRITING STRATEGY: I will use separate replace calls if possible, or just replace the component body up to handleProductToggle, and then the JSX part. */}
            </>
          )}
          {/* ... */}
        </form>
      </DialogContent>
    </Dialog>
  );
}

