import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';

const ACTIVITY_TYPES = [
  'Weekly Sync', 'QBR', 'MBR', 'In-Person Visit', 'Product Feedback',
  'Feature Request', 'Training Session', 'Support Escalation', 'Email Communication',
  'Phone Call', 'Executive Briefing', 'Onboarding Session', 'Renewal Discussion',
  'Upsell/Cross-sell Discussion', 'Other'
];

export default function ActivityForm({ customerId, customerName, activity, onClose, onSuccess }) {
  const isEditing = !!activity;
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    activity_type: activity?.activity_type || 'Weekly Sync',
    activity_date: activity?.activity_date ? new Date(activity.activity_date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
    title: activity?.title || '',
    summary: activity?.summary || '',
    internal_notes: activity?.internal_notes || '',
    sentiment: activity?.sentiment || 'Neutral',
    follow_up_required: activity?.follow_up_required || false,
    follow_up_date: activity?.follow_up_date || ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        customer_id: customerId,
        activity_date: new Date(formData.activity_date).toISOString()
      };

      if (isEditing) {
        await axios.put(`${API}/activities/${activity.id}`, payload);
        toast.success('Activity updated successfully');
      } else {
        await axios.post(`${API}/activities`, payload);
        toast.success('Activity logged successfully');
      }
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.detail || `Failed to ${isEditing ? 'update' : 'log'} activity`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit' : 'Log'} Activity - {customerName}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="activity_type">Activity Type *</Label>
              <select
                id="activity_type"
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
                value={formData.activity_type}
                onChange={(e) => setFormData({ ...formData, activity_type: e.target.value })}
                required
              >
                {ACTIVITY_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="activity_date">Date & Time *</Label>
              <Input
                id="activity_date"
                type="datetime-local"
                value={formData.activity_date}
                onChange={(e) => setFormData({ ...formData, activity_date: e.target.value })}
                required
                data-testid="activity-form-date"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Q4 2025 QBR with key stakeholders"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              data-testid="activity-form-title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="summary">Summary *</Label>
            <textarea
              id="summary"
              className="w-full px-3 py-2 border border-slate-300 rounded-md min-h-[100px]"
              placeholder="Main notes from the activity..."
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="internal_notes">Internal Notes</Label>
            <textarea
              id="internal_notes"
              className="w-full px-3 py-2 border border-slate-300 rounded-md min-h-[80px]"
              placeholder="Confidential notes (not shared with customer)..."
              value={formData.internal_notes}
              onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sentiment">Sentiment</Label>
            <select
              id="sentiment"
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
              value={formData.sentiment}
              onChange={(e) => setFormData({ ...formData, sentiment: e.target.value })}
            >
              <option value="Positive">Positive</option>
              <option value="Neutral">Neutral</option>
              <option value="Negative">Negative</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.follow_up_required}
                onChange={(e) => setFormData({ ...formData, follow_up_required: e.target.checked })}
                className="rounded border-slate-300"
              />
              <span className="text-sm text-slate-700">Follow-up Required</span>
            </label>
          </div>

          {formData.follow_up_required && (
            <div className="space-y-2">
              <Label htmlFor="follow_up_date">Follow-up Date</Label>
              <Input
                id="follow_up_date"
                type="date"
                value={formData.follow_up_date}
                onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })}
              />
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="activity-form-submit"
            >
              {loading ? (isEditing ? 'Updating...' : 'Logging...') : (isEditing ? 'Update Activity' : 'Log Activity')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
