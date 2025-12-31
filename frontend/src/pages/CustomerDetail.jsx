import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { ArrowLeft, Edit, Plus, AlertTriangle, TrendingUp, Activity as ActivityIcon, FileText, Heart, Users, Upload, ExternalLink, Trash2, Download, Eye } from 'lucide-react';
import ActivityForm from '../components/ActivityForm';
import RiskForm from '../components/RiskForm';
import OpportunityForm from '../components/OpportunityForm';
import CustomerEditForm from '../components/CustomerEditForm';
import HealthChangeModal from '../components/HealthChangeModal';
import StakeholderForm from '../components/StakeholderForm';
import DocumentUploadModal from '../components/DocumentUploadModal';
import { toast } from 'sonner';

const ACCOUNT_STATUS_OPTIONS = ['POC/Pilot', 'Onboarding', 'UAT', 'Live', 'Hold', 'Churn'];

// Format currency in INR
const formatINR = (amount) => {
  if (!amount) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

export default function CustomerDetail() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [activities, setActivities] = useState([]);
  const [risks, setRisks] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [showRiskForm, setShowRiskForm] = useState(false);
  const [showOpportunityForm, setShowOpportunityForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [showStakeholderForm, setShowStakeholderForm] = useState(false);
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [previewDocument, setPreviewDocument] = useState(null);
  
  // Edit states
  const [editSection, setEditSection] = useState('basic');
  const [editingActivity, setEditingActivity] = useState(null);
  const [editingRisk, setEditingRisk] = useState(null);
  const [editingOpportunity, setEditingOpportunity] = useState(null);
  const [editingStakeholder, setEditingStakeholder] = useState(null);
  const [savingAccountStatus, setSavingAccountStatus] = useState(false);

  useEffect(() => {
    loadCustomerData();
  }, [customerId]);

  const loadCustomerData = async () => {
    try {
      const [customerRes, activitiesRes, risksRes, opportunitiesRes] = await Promise.all([
        axios.get(`${API}/customers/${customerId}`),
        axios.get(`${API}/activities?customer_id=${customerId}`),
        axios.get(`${API}/risks?customer_id=${customerId}`),
        axios.get(`${API}/opportunities?customer_id=${customerId}`)
      ]);

      setCustomer(customerRes.data);
      setActivities(activitiesRes.data);
      setRisks(risksRes.data);
      setOpportunities(opportunitiesRes.data);
      
      // Load documents if available
      try {
        const docsRes = await axios.get(`${API}/customers/${customerId}/documents`);
        setDocuments(docsRes.data);
      } catch {
        setDocuments([]);
      }
    } catch (error) {
      toast.error('Failed to load customer data');
      navigate('/customers');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSuccess = () => {
    setShowActivityForm(false);
    setShowRiskForm(false);
    setShowOpportunityForm(false);
    setShowEditForm(false);
    setShowHealthModal(false);
    setShowStakeholderForm(false);
    setShowDocumentUpload(false);
    setEditingActivity(null);
    setEditingRisk(null);
    setEditingOpportunity(null);
    setEditingStakeholder(null);
    loadCustomerData();
  };

  const handleDeleteDocument = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await axios.delete(`${API}/customers/${customerId}/documents/${docId}`);
      toast.success('Document deleted');
      loadCustomerData();
    } catch (error) {
      toast.error('Failed to delete document');
    }
  };

  const handleAccountStatusChange = async (newStatus) => {
    if (!customer) return;
    const prev = customer.account_status;
    setCustomer({ ...customer, account_status: newStatus });
    setSavingAccountStatus(true);
    try {
      const res = await axios.put(`${API}/customers/${customerId}/account-status`, { account_status: newStatus });
      setCustomer(res.data);
      toast.success('Account status updated');
    } catch (e) {
      setCustomer({ ...customer, account_status: prev });
      toast.error(e.response?.data?.detail || 'Failed to update account status');
    } finally {
      setSavingAccountStatus(false);
    }
  };

  const openEditForm = (section) => {
    setEditSection(section);
    setShowEditForm(true);
  };

  const openActivityEdit = (activity) => {
    setEditingActivity(activity);
    setShowActivityForm(true);
  };

  const openRiskEdit = (risk) => {
    setEditingRisk(risk);
    setShowRiskForm(true);
  };

  const openOpportunityEdit = (opportunity) => {
    setEditingOpportunity(opportunity);
    setShowOpportunityForm(true);
  };

  const openStakeholderEdit = (stakeholder) => {
    setEditingStakeholder(stakeholder);
    setShowStakeholderForm(true);
  };

  const getHealthBadgeClass = (status) => {
    switch (status) {
      case 'Healthy': return 'health-healthy';
      case 'At Risk': return 'health-at-risk';
      case 'Critical': return 'health-critical';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const getSeverityBadgeClass = (severity) => {
    switch (severity) {
      case 'Critical': return 'bg-red-100 text-red-700';
      case 'High': return 'bg-orange-100 text-orange-700';
      case 'Medium': return 'bg-yellow-100 text-yellow-700';
      case 'Low': return 'bg-green-100 text-green-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const getStageBadgeClass = (stage) => {
    switch (stage) {
      case 'Closed Won': return 'bg-green-100 text-green-700';
      case 'Closed Lost': return 'bg-red-100 text-red-700';
      case 'Negotiation': return 'bg-blue-100 text-blue-700';
      case 'Proposal': return 'bg-purple-100 text-purple-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!customer) return null;

  const openRisks = risks.filter(r => r.status === 'Open' || r.status === 'In Progress');
  const activeOpportunities = opportunities.filter(o => o.stage !== 'Closed Won' && o.stage !== 'Closed Lost');

  return (
    <div className="px-6 py-8 space-y-6" data-testid="customer-detail-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/customers')}
            className="flex items-center space-x-2"
            data-testid="back-button"
          >
            <ArrowLeft size={18} />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">{customer.company_name}</h1>
            <p className="text-slate-600 mt-1">{customer.website}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={() => setShowHealthModal(true)}
            className="flex items-center space-x-2"
            data-testid="change-health-button"
          >
            <Heart size={16} />
            <span>Change Health</span>
          </Button>
          <Badge className={`${getHealthBadgeClass(customer.health_status)} px-3 py-1.5 text-sm cursor-pointer hover:opacity-80`} onClick={() => setShowHealthModal(true)}>
            Health: {Math.round(customer.health_score)}
          </Badge>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="bg-white border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">ARR</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">
              {formatINR(customer.arr)}
            </div>
            <p className="text-xs text-slate-500 mt-1">{customer.plan_type}</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">Setup Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">
              {formatINR(customer.one_time_setup_cost)}
            </div>
            <p className="text-xs text-slate-500 mt-1">One-time</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">Quarterly Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">
              {formatINR(customer.quarterly_consumption_cost)}
            </div>
            <p className="text-xs text-slate-500 mt-1">Consumption</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">
              {customer.active_users} / {customer.total_licensed_users}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {customer.total_licensed_users > 0
                ? Math.round((customer.active_users / customer.total_licensed_users) * 100)
                : 0}% utilization
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">Renewal Date</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-slate-800">
              {customer.renewal_date ? new Date(customer.renewal_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {customer.renewal_date
                ? `${Math.ceil((new Date(customer.renewal_date) - new Date()) / (1000 * 60 * 60 * 24))} days`
                : 'Not set'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Card className="bg-white border-slate-200">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full justify-start border-b rounded-none h-auto p-0">
            <TabsTrigger value="overview" className="rounded-none" data-testid="tab-overview">
              Overview
            </TabsTrigger>
            <TabsTrigger value="activities" className="rounded-none" data-testid="tab-activities">
              Activities ({activities.length})
            </TabsTrigger>
            <TabsTrigger value="risks" className="rounded-none" data-testid="tab-risks">
              Risks ({openRisks.length})
            </TabsTrigger>
            <TabsTrigger value="opportunities" className="rounded-none" data-testid="tab-opportunities">
              Opportunities ({activeOpportunities.length})
            </TabsTrigger>
            <TabsTrigger value="documents" className="rounded-none" data-testid="tab-documents">
              Documents ({documents.length})
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-800">Basic Information</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditForm('basic')}
                    className="text-blue-600 hover:text-blue-700"
                    data-testid="edit-basic-info"
                  >
                    <Edit size={16} className="mr-1" />
                    Edit
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-slate-600">Company Name</label>
                    <p className="text-sm font-medium text-slate-800">{customer.company_name}</p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-600">Website</label>
                    <p className="text-sm font-medium text-slate-800">{customer.website || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-600">Industry</label>
                    <p className="text-sm font-medium text-slate-800">{customer.industry || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-600">Region</label>
                    <p className="text-sm font-medium text-slate-800">{customer.region || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-600">Plan Type</label>
                    <p className="text-sm font-medium text-slate-800">{customer.plan_type || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-600">Onboarding Status</label>
                    <p className="text-sm font-medium text-slate-800">{customer.onboarding_status || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-600">Account Status</label>
                    <select
                      className="mt-1 w-full px-2 py-1.5 border border-slate-300 rounded-md text-sm bg-white"
                      value={customer.account_status || 'Live'}
                      disabled={savingAccountStatus}
                      onChange={(e) => handleAccountStatusChange(e.target.value)}
                      data-testid="account-status-inline"
                    >
                      {ACCOUNT_STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-slate-600">Go-Live Date</label>
                    <p className="text-sm font-medium text-slate-800">
                      {customer.go_live_date ? new Date(customer.go_live_date).toLocaleDateString('en-IN') : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-600">Renewal Date</label>
                    <p className="text-sm font-medium text-slate-800">
                      {customer.renewal_date ? new Date(customer.renewal_date).toLocaleDateString('en-IN') : '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Financial Info */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-800">Financial Information</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditForm('financial')}
                    className="text-blue-600 hover:text-blue-700"
                    data-testid="edit-financial"
                  >
                    <Edit size={16} className="mr-1" />
                    Edit
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-slate-600">Annual Recurring Revenue (ARR)</label>
                    <p className="text-sm font-medium text-slate-800">{formatINR(customer.arr)}</p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-600">One-time Setup Cost</label>
                    <p className="text-sm font-medium text-slate-800">{formatINR(customer.one_time_setup_cost)}</p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-600">Quarterly Consumption Cost</label>
                    <p className="text-sm font-medium text-slate-800">{formatINR(customer.quarterly_consumption_cost)}</p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-600">Total Contract Value</label>
                    <p className="text-sm font-medium text-slate-800">
                      {formatINR((customer.arr || 0) + (customer.one_time_setup_cost || 0))}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Products & Objective */}
            <div className="space-y-4 border-t pt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800">Products & Objective</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEditForm('products')}
                  className="text-blue-600 hover:text-blue-700"
                  data-testid="edit-products"
                >
                  <Edit size={16} className="mr-1" />
                  Edit
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-sm text-slate-600">Products Purchased</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {customer.products_purchased && customer.products_purchased.length > 0 ? (
                      customer.products_purchased.map((product, idx) => (
                        <Badge key={idx} variant="secondary" className="bg-blue-100 text-blue-700">
                          {product}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">No products listed</p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-slate-600">Primary Objective</label>
                  <p className="text-sm font-medium text-slate-800 mt-1">{customer.primary_objective || '-'}</p>
                </div>
              </div>
            </div>

            {/* User & Ownership Section */}
            <div className="space-y-4 border-t pt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800">User & Ownership</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEditForm('users')}
                  className="text-blue-600 hover:text-blue-700"
                  data-testid="edit-users"
                >
                  <Edit size={16} className="mr-1" />
                  Edit
                </Button>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="text-sm text-slate-600">Active Users</label>
                  <p className="text-sm font-medium text-slate-800">{customer.active_users}</p>
                </div>
                <div>
                  <label className="text-sm text-slate-600">Licensed Users</label>
                  <p className="text-sm font-medium text-slate-800">{customer.total_licensed_users}</p>
                </div>
                <div>
                  <label className="text-sm text-slate-600">CSM Owner</label>
                  <p className="text-sm font-medium text-slate-800">{customer.csm_owner_name || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-slate-600">AM Owner</label>
                  <p className="text-sm font-medium text-slate-800">{customer.am_owner_name || '-'}</p>
                </div>
              </div>
            </div>

            {/* Stakeholders */}
            <div className="space-y-4 border-t pt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800">Stakeholders</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingStakeholder(null);
                    setShowStakeholderForm(true);
                  }}
                  className="flex items-center space-x-1"
                >
                  <Plus size={14} />
                  <span>Add Stakeholder</span>
                </Button>
              </div>
              {customer.stakeholders && customer.stakeholders.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customer.stakeholders.map((stakeholder, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Users size={18} className="text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{stakeholder.full_name}</p>
                            <p className="text-sm text-slate-600">{stakeholder.job_title}</p>
                            <p className="text-xs text-slate-500">{stakeholder.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {stakeholder.is_primary && (
                            <Badge className="bg-green-100 text-green-700 text-xs">Primary</Badge>
                          )}
                          {stakeholder.is_decision_maker && (
                            <Badge className="bg-purple-100 text-purple-700 text-xs">DM</Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openStakeholderEdit(stakeholder)}
                          >
                            <Edit size={14} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No stakeholders added yet</p>
              )}
            </div>
          </TabsContent>

          {/* Activities Tab */}
          <TabsContent value="activities" className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-slate-800">Activity Log</h3>
              <Button
                onClick={() => {
                  setEditingActivity(null);
                  setShowActivityForm(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 flex items-center space-x-2"
              >
                <Plus size={16} />
                <span>Log Activity</span>
              </Button>
            </div>

            {activities.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <ActivityIcon size={48} className="mx-auto mb-4 opacity-50" />
                <p>No activities logged yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div key={activity.id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge variant="outline">{activity.activity_type}</Badge>
                          <Badge className={
                            activity.sentiment === 'Positive' ? 'bg-green-100 text-green-700' :
                            activity.sentiment === 'Negative' ? 'bg-red-100 text-red-700' :
                            'bg-slate-100 text-slate-700'
                          }>{activity.sentiment}</Badge>
                          <span className="text-sm text-slate-500">
                            {new Date(activity.activity_date).toLocaleDateString('en-IN')}
                          </span>
                        </div>
                        <h4 className="font-medium text-slate-800">{activity.title}</h4>
                        <p className="text-sm text-slate-600 mt-1">{activity.summary}</p>
                        {activity.follow_up_required && activity.follow_up_date && (
                          <p className="text-xs text-orange-600 mt-2">
                            Follow-up: {new Date(activity.follow_up_date).toLocaleDateString('en-IN')}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openActivityEdit(activity)}
                        className="text-blue-600"
                      >
                        <Edit size={16} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Risks Tab */}
          <TabsContent value="risks" className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-slate-800">Risk Register</h3>
              <Button
                onClick={() => {
                  setEditingRisk(null);
                  setShowRiskForm(true);
                }}
                className="bg-orange-600 hover:bg-orange-700 flex items-center space-x-2"
              >
                <AlertTriangle size={16} />
                <span>Flag Risk</span>
              </Button>
            </div>

            {risks.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <AlertTriangle size={48} className="mx-auto mb-4 opacity-50" />
                <p>No risks flagged</p>
              </div>
            ) : (
              <div className="space-y-4">
                {risks.map((risk) => (
                  <div key={risk.id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge className={getSeverityBadgeClass(risk.severity)}>{risk.severity}</Badge>
                          <Badge variant="outline">{risk.status}</Badge>
                          <span className="text-sm text-slate-500">{risk.category}</span>
                        </div>
                        <h4 className="font-medium text-slate-800">{risk.title}</h4>
                        <p className="text-sm text-slate-600 mt-1">{risk.description}</p>
                        {risk.revenue_impact && (
                          <p className="text-xs text-red-600 mt-2">
                            Revenue at risk: {formatINR(risk.revenue_impact)}
                          </p>
                        )}
                        {risk.mitigation_plan && (
                          <div className="mt-3 p-2 bg-blue-50 rounded">
                            <p className="text-xs text-blue-700"><strong>Mitigation:</strong> {risk.mitigation_plan}</p>
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openRiskEdit(risk)}
                        className="text-blue-600"
                      >
                        <Edit size={16} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Opportunities Tab */}
          <TabsContent value="opportunities" className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-slate-800">Opportunities</h3>
              <Button
                onClick={() => {
                  setEditingOpportunity(null);
                  setShowOpportunityForm(true);
                }}
                className="bg-green-600 hover:bg-green-700 flex items-center space-x-2"
              >
                <TrendingUp size={16} />
                <span>Add Opportunity</span>
              </Button>
            </div>

            {opportunities.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <TrendingUp size={48} className="mx-auto mb-4 opacity-50" />
                <p>No opportunities added</p>
              </div>
            ) : (
              <div className="space-y-4">
                {opportunities.map((opp) => (
                  <div key={opp.id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge variant="outline">{opp.opportunity_type}</Badge>
                          <Badge className={getStageBadgeClass(opp.stage)}>{opp.stage}</Badge>
                          <span className="text-sm font-medium text-green-600">{formatINR(opp.value)}</span>
                        </div>
                        <h4 className="font-medium text-slate-800">{opp.title}</h4>
                        <p className="text-sm text-slate-600 mt-1">{opp.description}</p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-slate-500">
                          <span>Win probability: {opp.probability}%</span>
                          {opp.expected_close_date && (
                            <span>Close: {new Date(opp.expected_close_date).toLocaleDateString('en-IN')}</span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openOpportunityEdit(opp)}
                        className="text-blue-600"
                      >
                        <Edit size={16} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-slate-800">Account Documents</h3>
              <Button
                onClick={() => setShowDocumentUpload(true)}
                className="bg-blue-600 hover:bg-blue-700 flex items-center space-x-2"
              >
                <Upload size={16} />
                <span>Upload Document</span>
              </Button>
            </div>

            {documents.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <FileText size={48} className="mx-auto mb-4 opacity-50" />
                <p>No documents uploaded yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div key={doc.id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <FileText size={24} className="text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-slate-800">{doc.title}</h4>
                          <div className="flex items-center space-x-2 text-xs text-slate-500 mt-1">
                            <Badge variant="outline">{doc.document_type}</Badge>
                            <span>{new Date(doc.created_at).toLocaleDateString('en-IN')}</span>
                            {doc.file_name && <span>• {doc.file_name}</span>}
                          </div>
                          {doc.description && (
                            <p className="text-sm text-slate-600 mt-1">{doc.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {doc.document_url && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPreviewDocument(doc)}
                              className="flex items-center space-x-1"
                            >
                              <Eye size={14} />
                              <span>Preview</span>
                            </Button>
                            <a href={doc.document_url} target="_blank" rel="noopener noreferrer" download>
                              <Button variant="outline" size="sm" className="flex items-center space-x-1">
                                <Download size={14} />
                                <span>Download</span>
                              </Button>
                            </a>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Document Preview Modal */}
            {previewDocument && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
                  <div className="flex items-center justify-between p-4 border-b">
                    <div>
                      <h3 className="font-semibold text-slate-800">{previewDocument.title}</h3>
                      <p className="text-sm text-slate-500">{previewDocument.document_type}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <a href={previewDocument.document_url} target="_blank" rel="noopener noreferrer" download>
                        <Button variant="outline" size="sm">
                          <Download size={16} className="mr-1" />
                          Download
                        </Button>
                      </a>
                      <Button variant="ghost" size="sm" onClick={() => setPreviewDocument(null)}>
                        ×
                      </Button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto p-4">
                    {previewDocument.document_url?.endsWith('.pdf') ? (
                      <iframe
                        src={previewDocument.document_url}
                        className="w-full h-[600px] border rounded"
                        title="Document Preview"
                      />
                    ) : previewDocument.document_url?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                      <img
                        src={previewDocument.document_url}
                        alt={previewDocument.title}
                        className="max-w-full mx-auto"
                      />
                    ) : (
                      <div className="text-center py-12">
                        <FileText size={48} className="mx-auto mb-4 text-slate-400" />
                        <p className="text-slate-600 mb-4">Preview not available for this file type</p>
                        <a href={previewDocument.document_url} target="_blank" rel="noopener noreferrer">
                          <Button>Open in New Tab</Button>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </Card>

      {/* Forms & Modals */}
      {showActivityForm && (
        <ActivityForm
          customerId={customerId}
          customerName={customer.company_name}
          activity={editingActivity}
          onClose={() => {
            setShowActivityForm(false);
            setEditingActivity(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {showRiskForm && (
        <RiskForm
          customerId={customerId}
          customerName={customer.company_name}
          risk={editingRisk}
          onClose={() => {
            setShowRiskForm(false);
            setEditingRisk(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {showOpportunityForm && (
        <OpportunityForm
          customerId={customerId}
          customerName={customer.company_name}
          opportunity={editingOpportunity}
          onClose={() => {
            setShowOpportunityForm(false);
            setEditingOpportunity(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {showEditForm && (
        <CustomerEditForm
          customer={customer}
          editSection={editSection}
          onClose={() => setShowEditForm(false)}
          onSuccess={handleFormSuccess}
        />
      )}

      {showHealthModal && (
        <HealthChangeModal
          customer={customer}
          onClose={() => setShowHealthModal(false)}
          onSuccess={handleFormSuccess}
        />
      )}

      {showStakeholderForm && (
        <StakeholderForm
          customerId={customerId}
          customerName={customer.company_name}
          stakeholder={editingStakeholder}
          onClose={() => {
            setShowStakeholderForm(false);
            setEditingStakeholder(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {showDocumentUpload && (
        <DocumentUploadModal
          customerId={customerId}
          customerName={customer.company_name}
          onClose={() => setShowDocumentUpload(false)}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}
