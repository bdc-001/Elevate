import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';

const OPPORTUNITY_TYPES = ['Upsell', 'Cross-sell', 'Expansion', 'Renewal', 'New Product'];
const STAGES = ['Identified', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];

export default function OpportunityForm({ customerId, customerName, opportunity, onClose, onSuccess }) {
  const isEditing = !!opportunity;
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({
    opportunity_type: opportunity?.opportunity_type || 'Upsell',
    title: opportunity?.title || '',
    description: opportunity?.description || '',
    value: opportunity?.value || '',
    probability: opportunity?.probability || 50,
    stage: opportunity?.stage || 'Identified',
    expected_close_date: opportunity?.expected_close_date || '',
    owner_id: opportunity?.owner_id || ''
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await axios.get(`${API}/users`);
      setUsers(response.data);
      if (!isEditing && response.data.length > 0) {
        const currentUser = JSON.parse(localStorage.getItem('user'));
        setFormData(prev => ({ ...prev, owner_id: currentUser?.id || response.data[0].id }));
      }
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
        customer_id: customerId,
        value: formData.value ? parseFloat(formData.value) : 0,
        probability: parseInt(formData.probability)
      };

      if (isEditing) {
        await axios.put(`${API}/opportunities/${opportunity.id}`, payload);
        toast.success('Opportunity updated successfully');
      } else {
        await axios.post(`${API}/opportunities`, payload);
        toast.success('Opportunity created successfully');
      }
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.detail || `Failed to ${isEditing ? 'update' : 'create'} opportunity`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit' : 'Create'} Opportunity - {customerName}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="opportunity_type">Opportunity Type *</Label>
              <select
                id="opportunity_type"
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
                value={formData.opportunity_type}
                onChange={(e) => setFormData({ ...formData, opportunity_type: e.target.value })}
                required
              >
                {OPPORTUNITY_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stage">Stage *</Label>
              <select
                id="stage"
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
                value={formData.stage}
                onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                required
                data-testid="opportunity-form-stage"
              >
                {STAGES.map(stage => (
                  <option key={stage} value={stage}>{stage}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Expand to additional business unit"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              data-testid="opportunity-form-title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              className="w-full px-3 py-2 border border-slate-300 rounded-md min-h-[80px]"
              placeholder="Details about the opportunity..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="value">Value (₹)</Label>
              <Input
                id="value"
                type="number"
                placeholder="Expected opportunity value"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="probability">Win Probability (%) *</Label>
              <Input
                id="probability"
                type="number"
                min="0"
                max="100"
                value={formData.probability}
                onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="owner_id">Owner *</Label>
              <select
                id="owner_id"
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
                value={formData.owner_id}
                onChange={(e) => setFormData({ ...formData, owner_id: e.target.value })}
                required
              >
                {users.map(user => (
                  <option key={user.id} value={user.id}>{user.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expected_close_date">Expected Close Date</Label>
              <Input
                id="expected_close_date"
                type="date"
                value={formData.expected_close_date}
                onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
              data-testid="opportunity-form-submit"
            >
              {loading ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Opportunity' : 'Create Opportunity')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
