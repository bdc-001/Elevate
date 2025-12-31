import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';

const RISK_CATEGORIES = {
  'Product Usage Risks': ['Low Login Frequency', 'Short Session Duration', 'Inactive Users', 'Low Feature Adoption'],
  'Onboarding Risks': ['Delayed Milestones', 'Low Session Attendance', 'Poor Certification Rate'],
  'Support/Operations Risks': ['SLA Breaches', 'High Unresolved Ticket Volume', 'Critical Bugs'],
  'Relationship Risks': ['Stakeholder Churn', 'Disengaged POC', 'Champion Left Organization'],
  'Commercial/Billing Risks': ['Renewal Concerns Expressed', 'Budget Constraints', 'Pricing Disputes'],
  'Strategic Risks': ['Product Misalignment', 'Competitor Evaluation', 'Changing Requirements'],
  'Sentiment/Gut Feel Risks': ['Negative Feedback', 'Lack of Engagement', 'Dissatisfaction Signals']
};

const RISK_STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed'];

export default function RiskForm({ customerId, customerName, risk, onClose, onSuccess }) {
  const isEditing = !!risk;
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({
    category: risk?.category || Object.keys(RISK_CATEGORIES)[0],
    subcategory: risk?.subcategory || RISK_CATEGORIES[Object.keys(RISK_CATEGORIES)[0]][0],
    severity: risk?.severity || 'Medium',
    status: risk?.status || 'Open',
    title: risk?.title || '',
    description: risk?.description || '',
    impact_description: risk?.impact_description || '',
    mitigation_plan: risk?.mitigation_plan || '',
    revenue_impact: risk?.revenue_impact || '',
    churn_probability: risk?.churn_probability || '',
    identified_date: risk?.identified_date || new Date().toISOString().split('T')[0],
    target_resolution_date: risk?.target_resolution_date || '',
    assigned_to_id: risk?.assigned_to_id || ''
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
        setFormData(prev => ({ ...prev, assigned_to_id: currentUser?.id || response.data[0].id }));
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleCategoryChange = (category) => {
    setFormData({
      ...formData,
      category,
      subcategory: RISK_CATEGORIES[category][0]
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        customer_id: customerId,
        revenue_impact: formData.revenue_impact ? parseFloat(formData.revenue_impact) : null,
        churn_probability: formData.churn_probability ? parseInt(formData.churn_probability) : null
      };

      if (isEditing) {
        await axios.put(`${API}/risks/${risk.id}`, payload);
        toast.success('Risk updated successfully');
      } else {
        await axios.post(`${API}/risks`, payload);
        toast.success('Risk flagged successfully');
      }
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.detail || `Failed to ${isEditing ? 'update' : 'flag'} risk`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit' : 'Flag'} Risk - {customerName}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Risk Category *</Label>
              <select
                id="category"
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
                value={formData.category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                required
              >
                {Object.keys(RISK_CATEGORIES).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subcategory">Subcategory *</Label>
              <select
                id="subcategory"
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
                value={formData.subcategory}
                onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                required
              >
                {RISK_CATEGORIES[formData.category].map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="severity">Severity *</Label>
              <select
                id="severity"
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                required
                data-testid="risk-form-severity"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <select
                id="status"
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                required
              >
                {RISK_STATUSES.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="identified_date">Identified Date *</Label>
              <Input
                id="identified_date"
                type="date"
                value={formData.identified_date}
                onChange={(e) => setFormData({ ...formData, identified_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Risk Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Champion leaving organization"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              data-testid="risk-form-title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <textarea
              id="description"
              className="w-full px-3 py-2 border border-slate-300 rounded-md min-h-[80px]"
              placeholder="Detailed explanation of the risk..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="impact_description">Impact Description</Label>
            <textarea
              id="impact_description"
              className="w-full px-3 py-2 border border-slate-300 rounded-md min-h-[60px]"
              placeholder="What happens if not mitigated..."
              value={formData.impact_description}
              onChange={(e) => setFormData({ ...formData, impact_description: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mitigation_plan">Mitigation Plan</Label>
            <textarea
              id="mitigation_plan"
              className="w-full px-3 py-2 border border-slate-300 rounded-md min-h-[80px]"
              placeholder="Strategy to resolve or mitigate this risk..."
              value={formData.mitigation_plan}
              onChange={(e) => setFormData({ ...formData, mitigation_plan: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="revenue_impact">Revenue Impact (₹)</Label>
              <Input
                id="revenue_impact"
                type="number"
                placeholder="Estimated ARR at risk"
                value={formData.revenue_impact}
                onChange={(e) => setFormData({ ...formData, revenue_impact: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="churn_probability">Churn Probability (%)</Label>
              <Input
                id="churn_probability"
                type="number"
                min="0"
                max="100"
                placeholder="0-100"
                value={formData.churn_probability}
                onChange={(e) => setFormData({ ...formData, churn_probability: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="assigned_to_id">Assigned To *</Label>
              <select
                id="assigned_to_id"
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
                value={formData.assigned_to_id}
                onChange={(e) => setFormData({ ...formData, assigned_to_id: e.target.value })}
                required
              >
                {users.map(user => (
                  <option key={user.id} value={user.id}>{user.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="target_resolution_date">Target Resolution Date</Label>
              <Input
                id="target_resolution_date"
                type="date"
                value={formData.target_resolution_date}
                onChange={(e) => setFormData({ ...formData, target_resolution_date: e.target.value })}
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
              className="bg-orange-600 hover:bg-orange-700"
              data-testid="risk-form-submit"
            >
              {loading ? (isEditing ? 'Updating...' : 'Flagging...') : (isEditing ? 'Update Risk' : 'Flag Risk')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
