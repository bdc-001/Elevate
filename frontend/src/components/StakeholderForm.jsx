import { useState } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';

const DESIGNATIONS = [
  'CEO', 'CTO', 'COO', 'CFO', 'VP Operations', 'VP Sales', 'VP Engineering',
  'Director', 'Manager', 'Team Lead', 'Executive', 'Analyst', 'Other'
];

export default function StakeholderForm({ customerId, customerName, stakeholder, onClose, onSuccess }) {
  const isEditing = !!stakeholder;
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: stakeholder?.full_name || '',
    job_title: stakeholder?.job_title || '',
    email: stakeholder?.email || '',
    phone: stakeholder?.phone || '',
    linkedin: stakeholder?.linkedin || '',
    is_primary: stakeholder?.is_primary || false,
    is_decision_maker: stakeholder?.is_decision_maker || false,
    notes: stakeholder?.notes || ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isEditing) {
        await axios.put(`${API}/customers/${customerId}/stakeholders/${stakeholder.id}`, formData);
        toast.success('Stakeholder updated successfully');
      } else {
        await axios.post(`${API}/customers/${customerId}/stakeholders`, formData);
        toast.success('Stakeholder added successfully');
      }
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.detail || `Failed to ${isEditing ? 'update' : 'add'} stakeholder`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit' : 'Add'} Stakeholder - {customerName}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name *</Label>
            <Input
              id="full_name"
              placeholder="John Doe"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="job_title">Job Title *</Label>
            <select
              id="job_title"
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
              value={formData.job_title}
              onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
              required
            >
              <option value="">Select Title</option>
              {DESIGNATIONS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@company.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                placeholder="+91 9876543210"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="linkedin">LinkedIn Profile</Label>
            <Input
              id="linkedin"
              placeholder="https://linkedin.com/in/johndoe"
              value={formData.linkedin}
              onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
            />
          </div>

          <div className="space-y-3">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_primary}
                onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
                className="rounded border-slate-300"
              />
              <span className="text-sm text-slate-700">Primary Contact</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_decision_maker}
                onChange={(e) => setFormData({ ...formData, is_decision_maker: e.target.checked })}
                className="rounded border-slate-300"
              />
              <span className="text-sm text-slate-700">Decision Maker</span>
            </label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              className="w-full px-3 py-2 border border-slate-300 rounded-md min-h-[60px]"
              placeholder="Additional notes about this stakeholder..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (isEditing ? 'Updating...' : 'Adding...') : (isEditing ? 'Update Stakeholder' : 'Add Stakeholder')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
