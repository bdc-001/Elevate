import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Users, IndianRupee, AlertTriangle, TrendingUp, Heart, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

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

const COLORS = {
  healthy: '#10b981',
  atRisk: '#f59e0b',
  critical: '#ef4444'
};

// Custom label component for pie chart to prevent overlapping
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name, value, index }) => {
  // Don't render label for zero values - they'll show in legend
  if (value === 0) return null;
  
  const RADIAN = Math.PI / 180;
  // Increase radius to push labels further out
  const radius = outerRadius + 40;
  
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
      <tspan x={x} dy="0" className="font-semibold">{name}: {value}</tspan>
    </text>
  );
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [risks, setRisks] = useState([]);
  const [activities, setActivities] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem('user'));
      const [statsRes, customersRes, risksRes, activitiesRes, tasksRes] = await Promise.all([
        axios.get(`${API}/dashboard/stats`),
        axios.get(`${API}/customers`),
        axios.get(`${API}/risks`),
        axios.get(`${API}/activities`),
        axios.get(`${API}/tasks?assigned_to_id=${userData.id}`)
      ]);

      setStats(statsRes.data);
      setCustomers(customersRes.data);
      setRisks(risksRes.data.filter(r => r.status === 'Open').slice(0, 5));
      setActivities(activitiesRes.data.slice(0, 10));
      setTasks(tasksRes.data.filter(t => t.status !== 'Completed').slice(0, 5));
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="spinner"></div>
      </div>
    );
  }

  const healthData = [
    { name: 'Healthy', value: stats?.healthy_customers || 0, color: COLORS.healthy },
    { name: 'At Risk', value: stats?.at_risk_customers || 0, color: COLORS.atRisk },
    { name: 'Critical', value: stats?.critical_customers || 0, color: COLORS.critical }
  ];

  const topCustomersByARR = [...customers]
    .sort((a, b) => (b.arr || 0) - (a.arr || 0))
    .slice(0, 5)
    .map(c => ({
      name: c.company_name.length > 20 ? c.company_name.substring(0, 20) + '...' : c.company_name,
      arr: c.arr || 0
    }));

  return (
    <div className="px-6 py-8 space-y-8" data-testid="dashboard-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Dashboard</h1>
        <p className="text-slate-600">Overview of your customer success metrics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Customers</CardTitle>
            <Users className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800" data-testid="total-customers-stat">
              {stats?.total_customers || 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">Active accounts</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total ARR</CardTitle>
            <IndianRupee className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800" data-testid="total-arr-stat">
              {formatINR(stats?.total_arr || 0)}
            </div>
            <p className="text-xs text-slate-500 mt-1">Annual recurring revenue</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Open Risks</CardTitle>
            <AlertTriangle className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800" data-testid="open-risks-stat">
              {stats?.open_risks || 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {stats?.critical_risks || 0} critical
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Pipeline Value</CardTitle>
            <TrendingUp className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800" data-testid="pipeline-value-stat">
              {formatINR(stats?.pipeline_value || 0)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {stats?.active_opportunities || 0} opportunities
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Health Distribution */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Heart className="h-5 w-5 text-blue-600" />
              <span>Customer Health Distribution</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={healthData}
                  cx="50%"
                  cy="50%"
                  labelLine={{
                    stroke: '#94a3b8',
                    strokeWidth: 1
                  }}
                  label={renderCustomLabel}
                  outerRadius={90}
                  fill="#8884d8"
                  dataKey="value"
                  paddingAngle={2}
                >
                  {healthData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
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

        {/* Top Customers by ARR */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <IndianRupee className="h-5 w-5 text-blue-600" />
              <span>Top Customers by ARR</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topCustomersByARR}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value) => formatINR(value)}
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                />
                <Bar dataKey="arr" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Activity, Risks & Tasks Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activities */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-blue-600" />
              <span>Recent Activities</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activities.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">No activities logged yet</p>
              ) : (
                activities.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 pb-3 border-b border-slate-100 last:border-0">
                    <div className="w-2 h-2 rounded-full bg-blue-600 mt-2"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{activity.title}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {activity.customer_name} • {new Date(activity.activity_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Open Risks */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <span>Open Risks</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {risks.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">No open risks</p>
              ) : (
                risks.map((risk) => (
                  <div key={risk.id} className="flex items-start space-x-3 pb-3 border-b border-slate-100 last:border-0">
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      risk.severity === 'Critical' ? 'risk-critical' :
                      risk.severity === 'High' ? 'risk-high' :
                      risk.severity === 'Medium' ? 'risk-medium' : 'risk-low'
                    }`}>
                      {risk.severity}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{risk.title}</p>
                      <p className="text-xs text-slate-500 mt-1">{risk.customer_name}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* My Tasks */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <span>My Tasks</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tasks.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">No pending tasks</p>
              ) : (
                tasks.map((task) => (
                  <div key={task.id} className="flex items-start space-x-3 pb-3 border-b border-slate-100 last:border-0">
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      task.priority === 'Critical' ? 'bg-red-100 text-red-700' :
                      task.priority === 'High' ? 'bg-orange-100 text-orange-700' :
                      task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {task.priority}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{task.title}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {task.customer_name} • Due: {new Date(task.due_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
