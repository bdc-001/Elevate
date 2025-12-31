import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  BarChart3, TrendingUp, Users, AlertTriangle, IndianRupee, 
  Download, Calendar, RefreshCw, Filter
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import { downloadFromApi } from '../lib/download';
import { toast } from 'sonner';

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

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

// Custom label component for pie/donut charts to prevent overlapping
const renderCustomDonutLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name, value, index }) => {
  // Don't render label for zero values - they'll show in legend
  if (value === 0) return null;
  
  const RADIAN = Math.PI / 180;
  // Position labels outside the donut
  const radius = outerRadius + 35;
  
  // Adjust angle slightly based on index to prevent overlap for small segments
  let adjustedAngle = midAngle;
  if (percent < 0.1) { // If segment is less than 10%
    adjustedAngle = midAngle + (index * 5); // Spread small segments
  }
  
  const x = cx + radius * Math.cos(-adjustedAngle * RADIAN);
  const y = cy + radius * Math.sin(-adjustedAngle * RADIAN);

  // Determine text anchor based on position
  const textAnchor = x > cx ? 'start' : 'end';

  return (
    <text
      x={x}
      y={y}
      fill="#475569"
      textAnchor={textAnchor}
      dominantBaseline="central"
      className="text-sm font-medium"
    >
      <tspan x={x} fontWeight="600">{name}: {value}</tspan>
    </text>
  );
};

export default function Reports() {
  const [stats, setStats] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rangeDays, setRangeDays] = useState(30);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, customersRes, analyticsRes] = await Promise.all([
        axios.get(`${API}/dashboard/stats`),
        axios.get(`${API}/customers`),
        axios.get(`${API}/reports/analytics`)
      ]);
      setStats(statsRes.data);
      setCustomers(customersRes.data);
      setAnalytics(analyticsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load reports data');
    } finally {
      setLoading(false);
    }
  };

  const handleExportAll = async () => {
    try {
      const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      await downloadFromApi(`${API}/exports/dump`, `elivate-dump-${ts}.json`);
      toast.success('Export started');
    } catch (e) {
      toast.error('Failed to export');
    }
  };

  // Generate report data
  const healthDistribution = [
    { name: 'Healthy', value: customers.filter(c => c.health_status === 'Healthy').length, color: '#10b981' },
    { name: 'At Risk', value: customers.filter(c => c.health_status === 'At Risk').length, color: '#f59e0b' },
    { name: 'Critical', value: customers.filter(c => c.health_status === 'Critical').length, color: '#ef4444' }
  ];

  const regionData = [
    { region: 'South India', customers: customers.filter(c => c.region === 'South India').length, arr: customers.filter(c => c.region === 'South India').reduce((sum, c) => sum + (c.arr || 0), 0) },
    { region: 'West India', customers: customers.filter(c => c.region === 'West India').length, arr: customers.filter(c => c.region === 'West India').reduce((sum, c) => sum + (c.arr || 0), 0) },
    { region: 'North India', customers: customers.filter(c => c.region === 'North India').length, arr: customers.filter(c => c.region === 'North India').reduce((sum, c) => sum + (c.arr || 0), 0) }
  ];

  const accountStatusData = [
    { status: 'Live', count: customers.filter(c => c.account_status === 'Live').length },
    { status: 'Onboarding', count: customers.filter(c => c.account_status === 'Onboarding').length },
    { status: 'POC/Pilot', count: customers.filter(c => c.account_status === 'POC/Pilot').length },
    { status: 'UAT', count: customers.filter(c => c.account_status === 'UAT').length },
    { status: 'Hold', count: customers.filter(c => c.account_status === 'Hold').length },
    { status: 'Churn', count: customers.filter(c => c.account_status === 'Churn').length }
  ];

  // Get data from analytics API (calculated from database)
  const monthlyTrend = analytics?.monthly_trend || [];
  const csmPerformance = analytics?.csm_performance || [];
  const renewalForecast = analytics?.renewal_forecast || [];

  if (loading) {
    return <div className="flex items-center justify-center h-96"><div className="spinner"></div></div>;
  }

  return (
    <div className="px-6 py-8 space-y-6" data-testid="reports-page">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <BarChart3 size={24} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Reports & Analytics</h1>
            <p className="text-slate-600">Comprehensive insights into your customer success metrics</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="min-w-[140px] px-3 py-2 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
            value={rangeDays}
            onChange={(e) => setRangeDays(Number(e.target.value))}
            aria-label="Report date range"
          >
            <option value={7}>Last 7 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last 90 Days</option>
          </select>
          <Button variant="outline" className="flex items-center space-x-2" onClick={() => toast.info(`Showing last ${rangeDays} days (visualization is demo)`)} >
            <Calendar size={16} />
            <span>Range</span>
          </Button>
          <Button variant="outline" onClick={loadData}>
            <RefreshCw size={16} />
          </Button>
          <Button className="bg-brand-primary hover:bg-blue-700 flex items-center space-x-2" onClick={handleExportAll}>
            <Download size={16} />
            <span>Export All</span>
          </Button>
        </div>
      </div>

      {/* Report Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="customers">Customer Analytics</TabsTrigger>
          <TabsTrigger value="csm">CSM Performance</TabsTrigger>
          <TabsTrigger value="renewals">Renewal Forecast</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-600">Total Customers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-800">{customers.length}</div>
                <p className={`text-xs ${(analytics?.customer_growth_pct || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(analytics?.customer_growth_pct || 0) >= 0 ? '+' : ''}{analytics?.customer_growth_pct || 0}% from last month
                </p>
              </CardContent>
            </Card>
            <Card className="bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-600">Total ARR</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-800">{formatINR(stats?.total_arr)}</div>
                <p className={`text-xs ${(analytics?.arr_growth_pct || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(analytics?.arr_growth_pct || 0) >= 0 ? '+' : ''}{analytics?.arr_growth_pct || 0}% from last month
                </p>
              </CardContent>
            </Card>
            <Card className="bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-600">Health Score Avg</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-800">{Math.round(customers.reduce((sum, c) => sum + (c.health_score || 0), 0) / customers.length || 0)}</div>
                <p className={`text-xs ${(analytics?.health_score_change || 0) >= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                  {(analytics?.health_score_change || 0) >= 0 ? '+' : ''}{analytics?.health_score_change || 0} from last month
                </p>
              </CardContent>
            </Card>
            <Card className="bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-600">Net Revenue Retention</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-800">{analytics?.nrr || 0}%</div>
                <p className={`text-xs ${(analytics?.nrr || 0) >= (analytics?.nrr_target || 100) ? 'text-green-600' : 'text-orange-600'}`}>
                  {analytics?.nrr_status || 'Calculating...'} ({analytics?.nrr_target || 100}%)
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-white">
              <CardHeader>
                <CardTitle>Health Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={healthDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      dataKey="value"
                      label={renderCustomDonutLabel}
                      labelLine={{
                        stroke: '#94a3b8',
                        strokeWidth: 1
                      }}
                      paddingAngle={2}
                    >
                      {healthDistribution.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e2e8f0', 
                        borderRadius: '8px',
                        padding: '8px 12px'
                      }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      iconType="circle"
                      formatter={(value) => <span className="text-sm text-slate-700">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardHeader>
                <CardTitle>Account Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={accountStatusData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="status" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Trend */}
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>Monthly ARR & Customer Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip formatter={(value, name) => name === 'arr' ? formatINR(value) : value} />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="newCustomers" stroke="#10b981" name="New Customers" />
                  <Line yAxisId="left" type="monotone" dataKey="churn" stroke="#ef4444" name="Churn" />
                  <Line yAxisId="right" type="monotone" dataKey="arr" stroke="#3b82f6" name="ARR" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customer Analytics Tab */}
        <TabsContent value="customers" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-white">
              <CardHeader>
                <CardTitle>ARR by Region</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={regionData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => formatINR(v)} />
                    <YAxis type="category" dataKey="region" width={100} />
                    <Tooltip formatter={(v) => formatINR(v)} />
                    <Bar dataKey="arr" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardHeader>
                <CardTitle>Top 10 Customers by ARR</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {customers.sort((a, b) => (b.arr || 0) - (a.arr || 0)).slice(0, 10).map((customer, idx) => (
                    <div key={customer.id} className="flex items-center justify-between py-2 border-b border-slate-100">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-slate-500 w-6">{idx + 1}.</span>
                        <span className="font-medium text-slate-800">{customer.company_name}</span>
                        <Badge className={customer.health_status === 'Healthy' ? 'bg-green-100 text-green-700' : customer.health_status === 'At Risk' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}>
                          {customer.health_status}
                        </Badge>
                      </div>
                      <span className="font-semibold text-slate-800">{formatINR(customer.arr)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* CSM Performance Tab */}
        <TabsContent value="csm" className="space-y-6">
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>CSM Performance Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">CSM Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Accounts</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Health %</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">At Risk %</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Total ARR</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Performance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {csmPerformance.map((csm, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-800">{csm.name}</td>
                        <td className="px-4 py-3 text-slate-600">{csm.accounts}</td>
                        <td className="px-4 py-3">
                          <span className="text-green-600 font-medium">{csm.healthyPct}%</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={csm.atRiskPct > 30 ? 'text-red-600' : 'text-orange-600'}>{csm.atRiskPct}%</span>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800">{formatINR(csm.arr)}</td>
                        <td className="px-4 py-3">
                          <Badge className={csm.healthyPct >= 75 ? 'bg-green-100 text-green-700' : csm.healthyPct >= 50 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}>
                            {csm.healthyPct >= 75 ? 'Excellent' : csm.healthyPct >= 50 ? 'Good' : 'Needs Attention'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Renewal Forecast Tab */}
        <TabsContent value="renewals" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {renewalForecast.map((q, idx) => (
              <Card key={idx} className="bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-600">{q.quarter}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-800">{formatINR(q.value)}</div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-slate-500">{q.renewals} renewals</span>
                    {q.atRisk > 0 && (
                      <Badge className="bg-red-100 text-red-700 text-xs">{q.atRisk} at risk</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-white">
            <CardHeader>
              <CardTitle>Upcoming Renewals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {customers.filter(c => c.renewal_date).sort((a, b) => new Date(a.renewal_date) - new Date(b.renewal_date)).slice(0, 10).map((customer) => (
                  <div key={customer.id} className="flex items-center justify-between py-3 border-b border-slate-100">
                    <div className="flex items-center space-x-4">
                      <div>
                        <p className="font-medium text-slate-800">{customer.company_name}</p>
                        <p className="text-sm text-slate-500">{customer.csm_owner_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Badge className={customer.health_status === 'Healthy' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}>
                        {customer.health_status}
                      </Badge>
                      <div className="text-right">
                        <p className="font-semibold text-slate-800">{formatINR(customer.arr)}</p>
                        <p className="text-xs text-slate-500">{new Date(customer.renewal_date).toLocaleDateString('en-IN')}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
