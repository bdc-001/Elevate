import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Plus, Filter, CheckCircle2, Clock, AlertCircle, Download } from 'lucide-react';
import TaskForm from '../components/TaskForm';
import { toast } from 'sonner';
import { downloadFromApi } from '../lib/download';

export default function TaskList() {
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    csm: 'all'
  });

  const handleExportTasks = async (format) => {
    try {
      const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      await downloadFromApi(`${API}/exports/tasks?format=${format}`, `tasks-${ts}.${format}`);
      toast.success('Download started');
    } catch (e) {
      toast.error('Failed to download');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterTasks();
  }, [tasks, filters]);

  const loadData = async () => {
    try {
      const [tasksRes, usersRes] = await Promise.all([
        axios.get(`${API}/tasks`),
        axios.get(`${API}/users`)
      ]);
      setTasks(tasksRes.data);
      setUsers(usersRes.data.filter(u => u.role === 'CSM' || u.role === 'ADMIN'));
    } catch (error) {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const filterTasks = () => {
    let filtered = [...tasks];

    if (filters.status !== 'all') {
      filtered = filtered.filter(t => t.status === filters.status);
    }

    if (filters.priority !== 'all') {
      filtered = filtered.filter(t => t.priority === filters.priority);
    }

    if (filters.csm !== 'all') {
      filtered = filtered.filter(t => t.assigned_to_id === filters.csm);
    }

    // Sort: overdue first, then by due date
    filtered.sort((a, b) => {
      const today = new Date().toISOString().split('T')[0];
      const aOverdue = a.due_date < today && a.status !== 'Completed';
      const bOverdue = b.due_date < today && b.status !== 'Completed';
      
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      
      return new Date(a.due_date) - new Date(b.due_date);
    });

    setFilteredTasks(filtered);
  };

  const handleTaskCreated = () => {
    setShowForm(false);
    setSelectedTask(null);
    loadData();
  };

  const handleEditTask = (task) => {
    setSelectedTask(task);
    setShowForm(true);
  };

  const handleToggleComplete = async (task) => {
    try {
      const newStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
      await axios.put(`${API}/tasks/${task.id}`, { status: newStatus });
      toast.success(`Task marked as ${newStatus.toLowerCase()}`);
      loadData();
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-700';
      case 'In Progress': return 'bg-blue-100 text-blue-700';
      case 'Pending': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'Critical': return 'bg-red-100 text-red-700';
      case 'High': return 'bg-orange-100 text-orange-700';
      case 'Medium': return 'bg-yellow-100 text-yellow-700';
      case 'Low': return 'bg-green-100 text-green-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const isOverdue = (dueDate, status) => {
    if (status === 'Completed') return false;
    return new Date(dueDate) < new Date().setHours(0, 0, 0, 0);
  };

  const today = new Date().toISOString().split('T')[0];
  const overdueTasks = tasks.filter(t => isOverdue(t.due_date, t.status)).length;
  const dueTodayTasks = tasks.filter(t => t.due_date === today && t.status !== 'Completed').length;
  const upcomingTasks = tasks.filter(t => t.due_date > today && t.status !== 'Completed').length;
  const completedTasks = tasks.filter(t => t.status === 'Completed').length;

  if (loading) {
    return <div className="flex items-center justify-center h-96"><div className="spinner"></div></div>;
  }

  return (
    <div className="px-6 py-8 space-y-6" data-testid="task-list-page">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Tasks</h1>
          <p className="text-slate-600">{tasks.length} total tasks</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={() => handleExportTasks('csv')} className="flex items-center space-x-2">
            <Download size={18} />
            <span>Export</span>
          </Button>
          <Button
            onClick={() => {
              setSelectedTask(null);
              setShowForm(true);
            }}
            className="bg-brand-primary hover:bg-blue-700 flex items-center space-x-2"
            data-testid="create-task-button"
          >
            <Plus size={18} />
            <span>Create Task</span>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-center space-x-3">
            <AlertCircle className="text-red-600" size={24} />
            <div>
              <p className="text-2xl font-bold text-red-700">{overdueTasks}</p>
              <p className="text-sm text-red-600">Overdue</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-orange-50 border-orange-200">
          <div className="flex items-center space-x-3">
            <Clock className="text-orange-600" size={24} />
            <div>
              <p className="text-2xl font-bold text-orange-700">{dueTodayTasks}</p>
              <p className="text-sm text-orange-600">Due Today</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center space-x-3">
            <Clock className="text-blue-600" size={24} />
            <div>
              <p className="text-2xl font-bold text-blue-700">{upcomingTasks}</p>
              <p className="text-sm text-blue-600">Upcoming</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="text-green-600" size={24} />
            <div>
              <p className="text-2xl font-bold text-green-700">{completedTasks}</p>
              <p className="text-sm text-green-600">Completed</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 bg-white border-slate-200">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 mr-2">
            <Filter size={18} className="text-slate-500" />
            <span className="text-sm font-medium text-slate-700">Filters:</span>
          </div>
          
          <select
            className="min-w-[140px] px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            data-testid="filter-status"
          >
            <option value="all">All Status</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>

          <select
            className="min-w-[140px] px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
            value={filters.priority}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
            data-testid="filter-priority"
          >
            <option value="all">All Priority</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <select
            className="min-w-[140px] px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
            value={filters.csm}
            onChange={(e) => setFilters({ ...filters, csm: e.target.value })}
            data-testid="filter-csm"
          >
            <option value="all">All CSMs</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>{user.name}</option>
            ))}
          </select>

          {(filters.status !== 'all' || filters.priority !== 'all' || filters.csm !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilters({ status: 'all', priority: 'all', csm: 'all' })}
              className="ml-2"
            >
              Clear Filters
            </Button>
          )}
        </div>
      </Card>

      {/* Task List */}
      <Card className="bg-white border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-12"></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Task</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Assigned To</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Due Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                    No tasks found
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => (
                  <tr
                    key={task.id}
                    className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                      isOverdue(task.due_date, task.status) ? 'bg-red-50' : ''
                    }`}
                    onClick={() => handleEditTask(task)}
                  >
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleToggleComplete(task)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          task.status === 'Completed'
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'border-slate-300 hover:border-green-500'
                        }`}
                      >
                        {task.status === 'Completed' && <CheckCircle2 size={14} />}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className={`font-medium ${task.status === 'Completed' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                          {task.title}
                        </p>
                        <p className="text-xs text-slate-500">{task.task_type}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {task.customer_name || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {task.assigned_to_name || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm ${isOverdue(task.due_date, task.status) ? 'text-red-600 font-medium' : 'text-slate-600'}`}>
                        {new Date(task.due_date).toLocaleDateString('en-IN')}
                        {isOverdue(task.due_date, task.status) && ' (Overdue)'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={getPriorityBadgeClass(task.priority)}>
                        {task.priority}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={getStatusBadgeClass(task.status)}>
                        {task.status}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Task Form Modal */}
      {showForm && (
        <TaskForm
          task={selectedTask}
          onClose={() => {
            setShowForm(false);
            setSelectedTask(null);
          }}
          onSuccess={handleTaskCreated}
        />
      )}
    </div>
  );
}
