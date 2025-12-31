import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Plus, TrendingUp, Filter, Download } from 'lucide-react';
import OpportunityForm from '../components/OpportunityForm';
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

const STAGES = ['Identified', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];
const STAGE_COLORS = {
  'Identified': 'bg-slate-100 border-slate-300',
  'Qualified': 'bg-blue-50 border-blue-300',
  'Proposal': 'bg-purple-50 border-purple-300',
  'Negotiation': 'bg-orange-50 border-orange-300',
  'Closed Won': 'bg-green-50 border-green-300',
  'Closed Lost': 'bg-red-50 border-red-300'
};

export default function OpportunityPipeline() {
  const [opportunities, setOpportunities] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedOpp, setSelectedOpp] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const handleExportOpportunities = async (format) => {
    try {
      const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      await downloadFromApi(`${API}/exports/opportunities?format=${format}`, `opportunities-${ts}.${format}`);
      toast.success('Download started');
    } catch (e) {
      toast.error('Failed to download');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [oppsRes, customersRes] = await Promise.all([
        axios.get(`${API}/opportunities`),
        axios.get(`${API}/customers`)
      ]);
      setOpportunities(oppsRes.data);
      setCustomers(customersRes.data);
    } catch (error) {
      toast.error('Failed to load opportunities');
    } finally {
      setLoading(false);
    }
  };

  const getStageOpps = (stage) => opportunities.filter(o => o.stage === stage);
  const getStageValue = (stage) => getStageOpps(stage).reduce((sum, o) => sum + (o.value || 0), 0);
  const getCustomerName = (customerId) => customers.find(c => c.id === customerId)?.company_name || 'Unknown';

  const handleOppClick = (opp) => {
    setSelectedOpp(opp);
    const customer = customers.find(c => c.id === opp.customer_id);
    setSelectedCustomer(customer);
    setShowForm(true);
  };

  const totalPipeline = opportunities.filter(o => !['Closed Won', 'Closed Lost'].includes(o.stage)).reduce((sum, o) => sum + (o.value || 0), 0);
  const weightedPipeline = opportunities.filter(o => !['Closed Won', 'Closed Lost'].includes(o.stage)).reduce((sum, o) => sum + ((o.value || 0) * (o.probability || 0) / 100), 0);

  if (loading) {
    return <div className="flex items-center justify-center h-96"><div className="spinner"></div></div>;
  }

  return (
    <div className="px-6 py-8 space-y-6" data-testid="opportunity-pipeline-page">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <TrendingUp size={24} className="text-green-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Opportunity Pipeline</h1>
            <p className="text-slate-600">Track and manage your sales opportunities</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={() => handleExportOpportunities('csv')} className="flex items-center space-x-2">
            <Download size={18} />
            <span>Export</span>
          </Button>
          <Button
            onClick={() => {
              setSelectedOpp(null);
              setSelectedCustomer(null);
              setShowForm(true);
            }}
            className="bg-brand-green hover:bg-green-700 flex items-center space-x-2"
          >
            <Plus size={18} />
            <span>Add Opportunity</span>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">Total Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{formatINR(totalPipeline)}</div>
            <p className="text-xs text-slate-500">{opportunities.filter(o => !['Closed Won', 'Closed Lost'].includes(o.stage)).length} opportunities</p>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">Weighted Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{formatINR(weightedPipeline)}</div>
            <p className="text-xs text-slate-500">Based on probability</p>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">Won This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatINR(getStageValue('Closed Won'))}</div>
            <p className="text-xs text-slate-500">{getStageOpps('Closed Won').length} deals</p>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">Lost This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatINR(getStageValue('Closed Lost'))}</div>
            <p className="text-xs text-slate-500">{getStageOpps('Closed Lost').length} deals</p>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Board */}
      <div className="grid grid-cols-6 gap-4 overflow-x-auto">
        {STAGES.map(stage => (
          <div key={stage} className={`rounded-lg border-2 ${STAGE_COLORS[stage]} p-4 min-h-[400px]`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">{stage}</h3>
              <Badge variant="outline">{getStageOpps(stage).length}</Badge>
            </div>
            <p className="text-sm font-medium text-slate-600 mb-4">{formatINR(getStageValue(stage))}</p>
            
            <div className="space-y-3">
              {getStageOpps(stage).map(opp => (
                <div
                  key={opp.id}
                  className="bg-white rounded-lg p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow border"
                  onClick={() => handleOppClick(opp)}
                >
                  <p className="font-medium text-slate-800 text-sm mb-1">{opp.title}</p>
                  <p className="text-xs text-slate-500 mb-2">{getCustomerName(opp.customer_id)}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-green-600">{formatINR(opp.value)}</span>
                    <span className="text-xs text-slate-500">{opp.probability}%</span>
                  </div>
                  {opp.expected_close_date && (
                    <p className="text-xs text-slate-400 mt-1">Close: {new Date(opp.expected_close_date).toLocaleDateString('en-IN')}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Opportunity Form */}
      {showForm && (
        <OpportunityForm
          customerId={selectedCustomer?.id || ''}
          customerName={selectedCustomer?.company_name || 'Select Customer'}
          opportunity={selectedOpp}
          onClose={() => {
            setShowForm(false);
            setSelectedOpp(null);
            setSelectedCustomer(null);
          }}
          onSuccess={() => {
            setShowForm(false);
            setSelectedOpp(null);
            setSelectedCustomer(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}
