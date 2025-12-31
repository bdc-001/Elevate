import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const HEALTH_STATUSES = ['Healthy', 'At Risk', 'Critical'];

const RISK_CATEGORIES = {
  'Product Usage Risks': ['Low Login Frequency', 'Short Session Duration', 'Inactive Users', 'Low Feature Adoption'],
  'Onboarding Risks': ['Delayed Milestones', 'Low Session Attendance', 'Poor Certification Rate'],
  'Support/Operations Risks': ['SLA Breaches', 'High Unresolved Ticket Volume', 'Critical Bugs'],
  'Relationship Risks': ['Stakeholder Churn', 'Disengaged POC', 'Champion Left Organization'],
  'Commercial/Billing Risks': ['Renewal Concerns Expressed', 'Budget Constraints', 'Pricing Disputes'],
  'Strategic Risks': ['Product Misalignment', 'Competitor Evaluation', 'Changing Requirements'],
  'Sentiment/Gut Feel Risks': ['Negative Feedback', 'Lack of Engagement', 'Dissatisfaction Signals']
};

export default function HealthChangeModal({ customer, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [newHealthStatus, setNewHealthStatus] = useState(customer?.health_status || 'Healthy');
  const [showRiskForm, setShowRiskForm] = useState(false);
  const [riskData, setRiskData] = useState({
    category: Object.keys(RISK_CATEGORIES)[0],
    subcategory: RISK_CATEGORIES[Object.keys(RISK_CATEGORIES)[0]][0],
    severity: 'Medium',
    title: '',
    description: '',
    mitigation_plan: '',
    assigned_to_id: ''
  });

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    // Show risk form if health status changes to non-healthy
    if (newHealthStatus !== 'Healthy' && newHealthStatus !== customer?.health_status) {
      setShowRiskForm(true);
      // Set default severity based on health status
      setRiskData(prev => ({
        ...prev,
        severity: newHealthStatus === 'Critical' ? 'Critical' : 'High',
        title: `Health Status Changed to ${newHealthStatus}`,
        description: `Customer health status has been changed from ${customer?.health_status} to ${newHealthStatus}.`
      }));
    } else if (newHealthStatus === 'Healthy') {
      setShowRiskForm(false);
    }
  }, [newHealthStatus, customer?.health_status]);

  const loadUsers = async () => {
    try {
      const response = await axios.get(`${API}/users`);
      setUsers(response.data);
      const currentUser = JSON.parse(localStorage.getItem('user'));
      if (currentUser) {
        setRiskData(prev => ({ ...prev, assigned_to_id: currentUser.id }));
      } else if (response.data.length > 0) {
        setRiskData(prev => ({ ...prev, assigned_to_id: response.data[0].id }));
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleCategoryChange = (category) => {
    setRiskData({
      ...riskData,
      category,
      subcategory: RISK_CATEGORIES[category][0]
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Update customer health status
      await axios.put(`${API}/customers/${customer.id}/health`, {
        health_status: newHealthStatus
      });

      // Create risk if health is not healthy
      if (showRiskForm && newHealthStatus !== 'Healthy') {
        await axios.post(`${API}/risks`, {
          customer_id: customer.id,
          category: riskData.category,
          subcategory: riskData.subcategory,
          severity: riskData.severity,
          title: riskData.title,
          description: riskData.description,
          mitigation_plan: riskData.mitigation_plan,
          assigned_to_id: riskData.assigned_to_id,
          identified_date: new Date().toISOString().split('T')[0]
        });
        toast.success('Health status updated and risk flagged');
      } else {
        toast.success('Health status updated');
      }

      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update health status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Change Health Status - {customer?.company_name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Health Status Selection */}
          <div className="space-y-2">
            <Label htmlFor="health_status">Health Status</Label>
            <select
              id="health_status"
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-lg"
              value={newHealthStatus}
              onChange={(e) => setNewHealthStatus(e.target.value)}
              data-testid="health-status-select"
            >
              {HEALTH_STATUSES.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <p className="text-sm text-slate-500">
              Current: <span className={`font-medium ${
                customer?.health_status === 'Healthy' ? 'text-green-600' :
                customer?.health_status === 'At Risk' ? 'text-orange-600' : 'text-red-600'
              }`}>{customer?.health_status}</span>
            </p>
          </div>

          {/* Risk Form - Shows when health is not Healthy */}
          {showRiskForm && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-4">
              <div className="flex items-center space-x-2 text-orange-700">
                <AlertTriangle size={20} />
                <span className="font-medium">Risk Documentation Required</span>
              </div>
              <p className="text-sm text-orange-600">
                Since you're changing the health status to {newHealthStatus}, please document the reason as a risk.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="risk_category">Risk Category *</Label>
                  <select
                    id="risk_category"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                    value={riskData.category}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    required
                  >
                    {Object.keys(RISK_CATEGORIES).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="risk_subcategory">Subcategory *</Label>
                  <select
                    id="risk_subcategory"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                    value={riskData.subcategory}
                    onChange={(e) => setRiskData({ ...riskData, subcategory: e.target.value })}
                    required
                  >
                    {RISK_CATEGORIES[riskData.category].map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="risk_severity">Severity *</Label>
                  <select
                    id="risk_severity"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                    value={riskData.severity}
                    onChange={(e) => setRiskData({ ...riskData, severity: e.target.value })}
                    required
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="risk_assigned">Assigned To *</Label>
                  <select
                    id="risk_assigned"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                    value={riskData.assigned_to_id}
                    onChange={(e) => setRiskData({ ...riskData, assigned_to_id: e.target.value })}
                    required
                  >
                    {users.map(user => (
                      <option key={user.id} value={user.id}>{user.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="risk_title">Risk Title *</Label>
                <Input
                  id="risk_title"
                  value={riskData.title}
                  onChange={(e) => setRiskData({ ...riskData, title: e.target.value })}
                  placeholder="Brief title for this risk"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="risk_description">Description *</Label>
                <textarea
                  id="risk_description"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md min-h-[80px]"
                  value={riskData.description}
                  onChange={(e) => setRiskData({ ...riskData, description: e.target.value })}
                  placeholder="Why is the health status changing? What triggered this?"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="risk_mitigation">Mitigation Plan</Label>
                <textarea
                  id="risk_mitigation"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md min-h-[60px]"
                  value={riskData.mitigation_plan}
                  onChange={(e) => setRiskData({ ...riskData, mitigation_plan: e.target.value })}
                  placeholder="What steps will be taken to improve the health status?"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className={showRiskForm ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'}
              data-testid="health-change-submit"
            >
              {loading ? 'Saving...' : (showRiskForm ? 'Update Health & Flag Risk' : 'Update Health Status')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
