import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { 
  Settings as SettingsIcon, Users, Building, Bell, Shield, Database, 
  Plus, Edit, Trash2, Key, ListTree, Tag, FileText, ChevronRight 
} from 'lucide-react';
import { toast } from 'sonner';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';

const PERMISSION_MODULES = [
  { key: 'dashboard', label: 'Dashboard', supportsScope: true, supportsActions: false },
  { key: 'customers', label: 'Customers', supportsScope: true, supportsActions: true },
  { key: 'tasks', label: 'Tasks', supportsScope: true, supportsActions: true },
  { key: 'opportunities', label: 'Opportunity Pipeline', supportsScope: true, supportsActions: true },
  { key: 'activities', label: 'Activities', supportsScope: true, supportsActions: true },
  { key: 'risks', label: 'Risks', supportsScope: true, supportsActions: true },
  { key: 'datalabs_reports', label: 'Data Labs Reports', supportsScope: true, supportsActions: true },
  { key: 'documents', label: 'Documents', supportsScope: true, supportsActions: true },
  { key: 'exports', label: 'Exports / Dump', supportsScope: false, supportsActions: false },
  { key: 'users', label: 'User Management', supportsScope: false, supportsActions: false },
  { key: 'settings', label: 'Settings', supportsScope: false, supportsActions: false },
];

const PERMISSION_SCOPES = [
  { value: 'none', label: 'None' },
  { value: 'own', label: 'Own' },
  { value: 'team', label: 'Team' },
  { value: 'all', label: 'All' },
];

function ensureRolePermissionsShape(rolePermissions) {
  const rp = rolePermissions || {};
  const out = { ...rp };
  // Normalize missing roles/modules so the UI always has a stable shape.
  for (const role of ['CSM', 'AM', 'CS_LEADER', 'CS_OPS', 'SALES', 'READ_ONLY']) {
    const roleObj = out[role] || {};
    const modules = { ...(roleObj.modules || {}) };
    for (const mod of PERMISSION_MODULES) {
      if (!modules[mod.key]) {
        modules[mod.key] = {
          enabled: false,
          scope: mod.supportsScope ? 'none' : undefined,
          actions: mod.supportsActions ? { create: false, edit: false, delete: false } : undefined,
        };
      } else {
        // Backfill missing sub-shapes
        if (mod.supportsScope && !('scope' in modules[mod.key])) modules[mod.key].scope = 'none';
        if (mod.supportsActions) {
          modules[mod.key].actions = modules[mod.key].actions || { create: false, edit: false, delete: false };
          for (const a of ['create', 'edit', 'delete']) {
            if (!(a in modules[mod.key].actions)) modules[mod.key].actions[a] = false;
          }
        }
        if (!('enabled' in modules[mod.key])) modules[mod.key].enabled = false;
      }
    }
    out[role] = { ...roleObj, modules };
  }
  return out;
}

export default function Settings() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUserForm, setShowUserForm] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [resetPassword, setResetPassword] = useState('');
  const [createdInviteToken, setCreatedInviteToken] = useState(null);
  const [settingsAccessDenied, setSettingsAccessDenied] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [settings, setSettings] = useState(null);
  const [org, setOrg] = useState({ company_name: 'Convin.ai', domain: 'convin.ai', default_currency: 'INR', date_format: 'DD/MM/YYYY' });
  const [healthThresholds, setHealthThresholds] = useState({ healthy_min: 80, at_risk_min: 50 });
  const [notifications, setNotifications] = useState({ health_status_changes: true, task_reminders: true, risk_alerts: true, renewal_reminders: true });
  const [showAddTag, setShowAddTag] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [showDropdownEditor, setShowDropdownEditor] = useState(false);
  const [editingDropdown, setEditingDropdown] = useState(null); // { index, name, valuesText }
  const [dropdownName, setDropdownName] = useState('');
  const [dropdownValuesText, setDropdownValuesText] = useState('');
  const [showFieldEditor, setShowFieldEditor] = useState(false);
  const [fieldEdit, setFieldEdit] = useState(null); // { entityKey, index, ...field }
  const [showRoleEditor, setShowRoleEditor] = useState(false);
  const [roleEdit, setRoleEdit] = useState(null); // { index, role, name, desc }
  const [permRole, setPermRole] = useState('CSM');
  const [permDraft, setPermDraft] = useState(null);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [templateEdit, setTemplateEdit] = useState(null); // { index, name, count, examplesText }
  const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    role: 'CSM',
    manager_id: '',
    department: '',
    send_invite: true
  });

  useEffect(() => {
    loadUsers();
    loadSettings();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await axios.get(`${API}/users`);
      setUsers(response.data);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const res = await axios.get(`${API}/settings`);
      setSettingsAccessDenied(false);
      setSettings(res.data);
      setOrg(res.data.organization || org);
      setHealthThresholds(res.data.health_thresholds || healthThresholds);
      setNotifications(res.data.notifications || notifications);
      const rp = ensureRolePermissionsShape(res.data.role_permissions || {});
      setPermDraft(rp);
    } catch (e) {
      // Not fatal: keep defaults
      console.error(e);
      if (e?.response?.status === 403) setSettingsAccessDenied(true);
      if (!permDraft) setPermDraft(ensureRolePermissionsShape({}));
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      setCreatedInviteToken(null);
      const payload = {
        name: userFormData.name,
        email: userFormData.email,
        roles: [userFormData.role],
        department: userFormData.department || null,
        manager_id: userFormData.role === 'CSM' ? (userFormData.manager_id || null) : null,
        status: 'Inactive',
        send_invite: !!userFormData.send_invite,
      };
      const res = await axios.post(`${API}/users/create-with-invite`, payload);
      toast.success('User created');
      setCreatedInviteToken(res.data?.invite_token || null);
      // Keep the modal open if we have an invite token to show/copy
      if (!res.data?.invite_token) {
        setShowUserForm(false);
      }
      setUserFormData({ name: '', email: '', role: 'CSM', manager_id: '', department: '', send_invite: true });
      loadUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create user');
    }
  };

  const handleOpenEditUser = (u) => {
    setEditingUser(u);
    setResetPassword('');
    setShowEditUser(true);
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    try {
      const nextRole = editingUser.role || (editingUser.roles?.[0] || 'CSM');
      await axios.put(`${API}/users/${editingUser.id}`, {
        name: editingUser.name,
        roles: [nextRole],
        department: editingUser.department || null,
        manager_id: nextRole === 'CSM' ? (editingUser.manager_id || null) : null,
        status: editingUser.status || 'Active',
      });
      if (resetPassword.trim()) {
        await axios.post(`${API}/users/${editingUser.id}/reset-password`, { password: resetPassword.trim() });
      }
      toast.success('User updated');
      setShowEditUser(false);
      setEditingUser(null);
      setResetPassword('');
      loadUsers();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to update user');
    }
  };

  const handleDeleteUser = async () => {
    if (!editingUser) return;
    setIsDeleting(true);
    try {
      await axios.delete(`${API}/users/${editingUser.id}`);
      toast.success('User deleted');
      setShowDeleteModal(false);
      setShowEditUser(false);
      setEditingUser(null);
      loadUsers();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to delete user');
    } finally {
      setIsDeleting(false);
    }
  };

  const saveSettings = async (partial) => {
    try {
      const payload = partial || {
        organization: org,
        health_thresholds: healthThresholds,
        notifications,
        tags: settings?.tags || [],
        dropdowns: settings?.dropdowns || [],
        field_configs: settings?.field_configs || {},
        roles: settings?.roles || [],
        templates: settings?.templates || [],
        role_permissions: permDraft || settings?.role_permissions || {},
      };
      const res = await axios.put(`${API}/settings`, payload);
      setSettings(res.data);
      const rp = ensureRolePermissionsShape(res.data.role_permissions || {});
      setPermDraft(rp);
      toast.success('Settings saved');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to save settings');
    }
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'ADMIN': return 'bg-purple-100 text-purple-700';
      case 'CSM': return 'bg-blue-100 text-blue-700';
      case 'AM': return 'bg-green-100 text-green-700';
      case 'CS_LEADER': return 'bg-orange-100 text-orange-700';
      case 'CS_OPS': return 'bg-yellow-100 text-yellow-700';
      case 'SALES': return 'bg-slate-100 text-slate-700';
      case 'READ_ONLY': return 'bg-slate-100 text-slate-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const amUsers = users.filter((u) => (u.role === 'AM' || (u.roles || []).includes('AM')));
  const amById = new Map(amUsers.map((u) => [u.id, u]));

  const fieldConfigs = settings?.field_configs || {};
  const dropdowns = (settings?.dropdowns || []).map((d) => ({
    ...d,
    count: (d.values || []).length,
  }));

  return (
    <div className="px-6 py-8 space-y-6" data-testid="settings-page">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
          <SettingsIcon size={24} className="text-blue-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Settings</h1>
          <p className="text-slate-600">Manage your platform configuration</p>
        </div>
      </div>

      {/* Settings Tabs */}
      <Card className="bg-white border-slate-200">
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 flex-wrap">
            <TabsTrigger value="general" className="rounded-none flex items-center space-x-2">
              <SettingsIcon size={16} />
              <span>General</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="rounded-none flex items-center space-x-2">
              <Users size={16} />
              <span>User Management</span>
            </TabsTrigger>
            <TabsTrigger value="roles" className="rounded-none flex items-center space-x-2">
              <Key size={16} />
              <span>Roles & Permissions</span>
            </TabsTrigger>
            <TabsTrigger value="fields" className="rounded-none flex items-center space-x-2">
              <ListTree size={16} />
              <span>Field Configuration</span>
            </TabsTrigger>
            <TabsTrigger value="dropdowns" className="rounded-none flex items-center space-x-2">
              <ChevronRight size={16} />
              <span>Dropdowns</span>
            </TabsTrigger>
            <TabsTrigger value="tags" className="rounded-none flex items-center space-x-2">
              <Tag size={16} />
              <span>Tags</span>
            </TabsTrigger>
            <TabsTrigger value="templates" className="rounded-none flex items-center space-x-2">
              <FileText size={16} />
              <span>Templates</span>
            </TabsTrigger>
          </TabsList>

          {/* General Settings Tab */}
          <TabsContent value="general" className="p-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Organization Settings</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Company Name</Label>
                    <Input value={org.company_name} onChange={(e) => setOrg({ ...org, company_name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Domain</Label>
                    <Input value={org.domain} onChange={(e) => setOrg({ ...org, domain: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Default Currency</Label>
                    <select
                      className="w-full px-3 py-2 border border-slate-300 rounded-md"
                      value={org.default_currency}
                      onChange={(e) => setOrg({ ...org, default_currency: e.target.value })}
                    >
                      <option value="INR">₹ Indian Rupee (INR)</option>
                      <option value="USD">$ US Dollar (USD)</option>
                      <option value="EUR">€ Euro (EUR)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date Format</Label>
                    <select
                      className="w-full px-3 py-2 border border-slate-300 rounded-md"
                      value={org.date_format}
                      onChange={(e) => setOrg({ ...org, date_format: e.target.value })}
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h4 className="font-medium text-slate-800 mb-4">Health Score Configuration</h4>
                <div className="grid grid-cols-3 gap-4">
                  <Card className="p-4 bg-green-50 border-green-200">
                    <div className="text-sm text-green-700 font-medium">Healthy</div>
                    <div className="text-xs text-green-600 mt-1">Score ≥ 80</div>
                    <Input
                      type="number"
                      value={healthThresholds.healthy_min}
                      onChange={(e) => setHealthThresholds({ ...healthThresholds, healthy_min: Number(e.target.value) })}
                      className="mt-2"
                    />
                  </Card>
                  <Card className="p-4 bg-orange-50 border-orange-200">
                    <div className="text-sm text-orange-700 font-medium">At Risk</div>
                    <div className="text-xs text-orange-600 mt-1">Score 50-79</div>
                    <Input
                      type="number"
                      value={healthThresholds.at_risk_min}
                      onChange={(e) => setHealthThresholds({ ...healthThresholds, at_risk_min: Number(e.target.value) })}
                      className="mt-2"
                    />
                  </Card>
                  <Card className="p-4 bg-red-50 border-red-200">
                    <div className="text-sm text-red-700 font-medium">Critical</div>
                    <div className="text-xs text-red-600 mt-1">Score &lt; 50</div>
                    <Input type="number" value={Math.max(0, healthThresholds.at_risk_min - 1)} className="mt-2" disabled />
                  </Card>
                </div>
              </div>

              <div className="border-t pt-6">
                <h4 className="font-medium text-slate-800 mb-4">Notification Settings</h4>
                <div className="space-y-4">
                  {[
                    { key: 'health_status_changes', title: 'Health Status Changes', desc: 'Get notified when customer health changes' },
                    { key: 'task_reminders', title: 'Task Reminders', desc: 'Receive reminders for upcoming and overdue tasks' },
                    { key: 'risk_alerts', title: 'Risk Alerts', desc: 'Get alerts when new risks are flagged' },
                    { key: 'renewal_reminders', title: 'Renewal Reminders', desc: 'Notifications for upcoming contract renewals' },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between py-3 border-b border-slate-100">
                      <div>
                        <div className="font-medium text-slate-800">{item.title}</div>
                        <div className="text-sm text-slate-600">{item.desc}</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!notifications[item.key]}
                          onChange={(e) => setNotifications({ ...notifications, [item.key]: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-6 flex justify-end">
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => saveSettings({ organization: org, health_thresholds: healthThresholds, notifications })}>
                  Save Changes
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Team Members</h3>
                <p className="text-sm text-slate-600">{users.length} users in your organization</p>
              </div>
              <Button
                onClick={() => setShowUserForm(true)}
                className="bg-blue-600 hover:bg-blue-700 flex items-center space-x-2"
              >
                <Plus size={16} />
                <span>Add User</span>
              </Button>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">AM (Manager)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Created</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map(user => (
                    <tr key={user.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                            {user.name?.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-slate-800">{user.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{user.email}</td>
                      <td className="px-6 py-4">
                        <Badge className={getRoleBadgeClass(user.role || user.roles?.[0])}>{user.role || user.roles?.[0] || '-'}</Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {(user.role === 'CSM' || (user.roles || []).includes('CSM')) && user.manager_id
                          ? (amById.get(user.manager_id)?.name || user.manager_id)
                          : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-slate-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditUser(user);
                          }}
                        >
                          <Edit size={16} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {showUserForm && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-md">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Add New User</h3>
                  <form onSubmit={handleCreateUser} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        value={userFormData.name}
                        onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={userFormData.email}
                        onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Role *</Label>
                      <select
                        id="role"
                        className="w-full px-3 py-2 border border-slate-300 rounded-md"
                        value={userFormData.role}
                        onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value, manager_id: '' })}
                      >
                        <option value="CSM">Customer Success Manager (CSM)</option>
                        <option value="AM">Account Manager (AM)</option>
                        <option value="CS_LEADER">CS Leadership</option>
                        <option value="CS_OPS">CS Operations</option>
                        <option value="ADMIN">Administrator</option>
                        <option value="SALES">Sales (View Only)</option>
                        <option value="READ_ONLY">Read Only</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="department">Department</Label>
                      <Input
                        id="department"
                        value={userFormData.department}
                        onChange={(e) => setUserFormData({ ...userFormData, department: e.target.value })}
                        placeholder="e.g. Customer Success"
                      />
                    </div>
                    {userFormData.role === 'CSM' && (
                      <div className="space-y-2">
                        <Label htmlFor="manager">Map to AM (Manager)</Label>
                        <select
                          id="manager"
                          className="w-full px-3 py-2 border border-slate-300 rounded-md"
                          value={userFormData.manager_id}
                          onChange={(e) => setUserFormData({ ...userFormData, manager_id: e.target.value })}
                        >
                          <option value="">-- Select AM --</option>
                          {amUsers.map((am) => (
                            <option key={am.id} value={am.id}>
                              {am.name} ({am.email})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
                      <div>
                        <div className="text-sm font-medium text-slate-800">Send invitation</div>
                        <div className="text-xs text-slate-500">Generates an invite token (you can share it)</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={!!userFormData.send_invite}
                        onChange={(e) => setUserFormData({ ...userFormData, send_invite: e.target.checked })}
                      />
                    </div>
                    {createdInviteToken && (
                      <div className="rounded-md border border-green-200 bg-green-50 p-3">
                        <div className="text-sm font-medium text-green-900 mb-1">Invite token</div>
                        <div className="text-xs text-green-800 break-all font-mono">{createdInviteToken}</div>
                        <div className="mt-2 flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(createdInviteToken);
                                toast.success('Copied invite token');
                              } catch {
                                toast.error('Copy failed');
                              }
                            }}
                          >
                            Copy
                          </Button>
                          <Button
                            type="button"
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => {
                              setCreatedInviteToken(null);
                              setShowUserForm(false);
                            }}
                          >
                            Done
                          </Button>
                        </div>
                      </div>
                    )}
                    <div className="flex justify-end space-x-3 pt-4">
                      <Button type="button" variant="outline" onClick={() => setShowUserForm(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                        Create User
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {showEditUser && editingUser && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-md">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Edit User</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input value={editingUser.name || ''} onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input value={editingUser.email || ''} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <select
                        className="w-full px-3 py-2 border border-slate-300 rounded-md"
                        value={editingUser.role || editingUser.roles?.[0] || 'CSM'}
                        onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value, manager_id: '' })}
                      >
                        <option value="CSM">Customer Success Manager (CSM)</option>
                        <option value="AM">Account Manager (AM)</option>
                        <option value="CS_LEADER">CS Leadership</option>
                        <option value="CS_OPS">CS Operations</option>
                        <option value="ADMIN">Administrator</option>
                        <option value="SALES">Sales (View Only)</option>
                        <option value="READ_ONLY">Read Only</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <select
                        className="w-full px-3 py-2 border border-slate-300 rounded-md"
                        value={editingUser.status || 'Active'}
                        onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value })}
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Suspended">Suspended</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Department</Label>
                      <Input value={editingUser.department || ''} onChange={(e) => setEditingUser({ ...editingUser, department: e.target.value })} />
                    </div>
                    {(editingUser.role === 'CSM' || editingUser.roles?.[0] === 'CSM') && (
                      <div className="space-y-2">
                        <Label>Map to AM (Manager)</Label>
                        <select
                          className="w-full px-3 py-2 border border-slate-300 rounded-md"
                          value={editingUser.manager_id || ''}
                          onChange={(e) => setEditingUser({ ...editingUser, manager_id: e.target.value })}
                        >
                          <option value="">-- Select AM --</option>
                          {amUsers.map((am) => (
                            <option key={am.id} value={am.id}>
                              {am.name} ({am.email})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Reset Password (optional)</Label>
                      <Input type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} placeholder="New password (min 6 chars)" />
                    </div>
                    <div className="flex justify-between pt-4">
                      <Button variant="outline" className="text-red-600" onClick={() => setShowDeleteModal(true)}>
                        <Trash2 size={16} className="mr-2" />
                        Delete
                      </Button>
                      <div className="space-x-3">
                        <Button variant="outline" onClick={() => { setShowEditUser(false); setEditingUser(null); }}>
                          Cancel
                        </Button>
                        <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSaveUser}>
                          Save
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Roles & Permissions Tab */}
          <TabsContent value="roles" className="p-6">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-800">Roles & Permissions</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { role: 'ADMIN', name: 'Administrator', desc: 'Full access to all features and settings', color: 'purple' },
                  { role: 'CSM', name: 'Customer Success Manager', desc: 'Manage assigned customers, activities, tasks', color: 'blue' },
                  { role: 'AM', name: 'Account Manager', desc: 'View customers, manage opportunities and renewals', color: 'green' },
                  { role: 'CS_LEADER', name: 'CS Leadership', desc: 'View all customers, reports, team performance', color: 'orange' },
                  { role: 'CS_OPS', name: 'CS Operations', desc: 'Manage settings, configurations, reports', color: 'yellow' },
                  { role: 'SALES', name: 'Sales (View Only)', desc: 'View customers and opportunities (read-only)', color: 'slate' },
                  { role: 'READ_ONLY', name: 'Read Only', desc: 'Read-only access within assigned scope', color: 'slate' },
                ].map((r, idx) => (
                  <Card key={idx} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <Badge className={`bg-${r.color}-100 text-${r.color}-700`}>{r.role}</Badge>
                          <span className="font-medium text-slate-800">{r.name}</span>
                        </div>
                        <p className="text-sm text-slate-600 mt-2">{r.desc}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const currentRoles = settings?.roles || [];
                          const existing = currentRoles.findIndex((x) => x.role === r.role);
                          const index = existing >= 0 ? existing : 0;
                          const roleObj = existing >= 0 ? currentRoles[existing] : { role: r.role, name: r.name, desc: r.desc };
                          setRoleEdit({ index, ...roleObj });
                          setShowRoleEditor(true);
                        }}
                      >
                        <Edit size={16} />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Permission matrix editor (configurable) */}
              <Card className="p-6 border-slate-200">
                <div className="flex items-center justify-between gap-6 flex-wrap mb-6">
                  <div>
                    <div className="text-lg font-semibold text-slate-800 mb-1">Permission Matrix</div>
                    <div className="text-sm text-slate-600">
                      Toggle modules on/off, configure data scope, and set CRUD permissions per role. <span className="font-medium">Admin always has full access.</span>
                    </div>
                    {settingsAccessDenied && (
                      <div className="mt-2 text-sm text-orange-700 bg-orange-50 px-3 py-2 rounded border border-orange-200">
                        🔒 Only <span className="font-semibold">ADMIN / CS_OPS</span> can edit and save permissions.
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <Label className="font-medium">Role:</Label>
                    <select
                      className="min-w-[180px] px-4 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary bg-white"
                      value={permRole}
                      onChange={(e) => setPermRole(e.target.value)}
                    >
                      {/* Do not show ADMIN here */}
                      <option value="CSM">CSM - Customer Success Manager</option>
                      <option value="AM">AM - Account Manager</option>
                      <option value="CS_LEADER">CS Leadership</option>
                      <option value="CS_OPS">CS Operations</option>
                      <option value="SALES">Sales (View Only)</option>
                      <option value="READ_ONLY">Read Only User</option>
                    </select>
                    <Button
                      onClick={async () => {
                        if (!permDraft) return;
                        await saveSettings({ role_permissions: permDraft });
                      }}
                      disabled={settingsAccessDenied}
                      className="bg-brand-primary hover:bg-blue-700 px-6"
                    >
                      Save Permissions
                    </Button>
                  </div>
                </div>

                {!permDraft ? (
                  <div className="text-sm text-slate-600 mt-4">Loading permissions…</div>
                ) : (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm border-collapse table-fixed">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase" style={{width: '22%'}}>Module</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase" style={{width: '16%'}}>Scope</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase" style={{width: '42%'}}>Actions</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase" style={{width: '20%'}}>
                            <div className="flex flex-col items-center">
                              <span>Module Enabled</span>
                              <span className="text-[10px] font-normal text-slate-400 mt-0.5">(Visibility Control)</span>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {PERMISSION_MODULES.map((m) => {
                          const row = permDraft?.[permRole]?.modules?.[m.key] || {};
                          const enabled = !!row.enabled;
                          const scope = row.scope || 'none';
                          const actions = row.actions || { create: false, edit: false, delete: false };
                          return (
                            <tr key={m.key} className={`hover:bg-slate-50 ${!enabled ? 'opacity-60' : ''}`}>
                              {/* Module Name */}
                              <td className="px-6 py-4 font-medium text-slate-800">{m.label}</td>
                              
                              {/* Scope Dropdown */}
                              <td className="px-6 py-4">
                                {m.supportsScope ? (
                                  <select
                                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
                                    value={scope}
                                    disabled={!enabled || settingsAccessDenied}
                                    onChange={(e) => {
                                      const next = ensureRolePermissionsShape(permDraft);
                                      next[permRole].modules[m.key].scope = e.target.value;
                                      // auto-enable if scope != none
                                      if (e.target.value !== 'none') next[permRole].modules[m.key].enabled = true;
                                      setPermDraft(next);
                                    }}
                                  >
                                    {PERMISSION_SCOPES.map((s) => (
                                      <option key={s.value} value={s.value}>
                                        {s.label}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="text-slate-400 text-center block">—</span>
                                )}
                              </td>
                              
                              {/* Actions Checkboxes */}
                              <td className="px-6 py-4">
                                {m.supportsActions ? (
                                  <div className="flex items-center gap-6">
                                    {['create', 'edit', 'delete'].map((a) => (
                                      <label key={a} className={`flex items-center gap-2.5 ${!enabled || settingsAccessDenied ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                                        <input
                                          type="checkbox"
                                          checked={!!actions[a]}
                                          disabled={!enabled || settingsAccessDenied}
                                          className="w-5 h-5 cursor-pointer disabled:cursor-not-allowed"
                                          onChange={(e) => {
                                            const next = ensureRolePermissionsShape(permDraft);
                                            next[permRole].modules[m.key].actions[a] = e.target.checked;
                                            // enabling an action implies visibility
                                            if (e.target.checked) next[permRole].modules[m.key].enabled = true;
                                            setPermDraft(next);
                                          }}
                                        />
                                        <span className="capitalize text-slate-700 text-sm font-medium">{a}</span>
                                      </label>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 text-center block">—</span>
                                )}
                              </td>
                              
                              {/* Module Enabled Toggle (Rightmost Column) */}
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-center">
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={enabled}
                                      disabled={settingsAccessDenied}
                                      className="sr-only peer"
                                      onChange={(e) => {
                                        const next = ensureRolePermissionsShape(permDraft);
                                        next[permRole].modules[m.key].enabled = e.target.checked;
                                        // If disabling, also scope to none
                                        if (!e.target.checked && m.supportsScope) next[permRole].modules[m.key].scope = 'none';
                                        setPermDraft(next);
                                      }}
                                    />
                                    <div className={`
                                      w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 
                                      rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white 
                                      after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white 
                                      after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all 
                                      peer-checked:bg-brand-primary ${settingsAccessDenied ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                                    `}></div>
                                    <span className={`ml-3 text-sm font-medium ${enabled ? 'text-green-600' : 'text-slate-500'}`}>
                                      {enabled ? 'Enabled' : 'Disabled'}
                                    </span>
                                  </label>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
                      <h4 className="text-base font-semibold text-blue-900 mb-3">📚 Understanding Permissions</h4>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-sm text-blue-800">
                        <div>
                          <div className="font-semibold mb-2">🔒 Module Enabled</div>
                          <p className="text-xs leading-relaxed">Master toggle to enable/disable a module. When <strong>disabled</strong>, the module won't appear in navigation and users cannot access it at all.</p>
                        </div>
                        <div>
                          <div className="font-semibold mb-2">👁️ Scope</div>
                          <p className="text-xs leading-relaxed mb-2">Controls what data users can see:</p>
                          <ul className="space-y-1 text-xs">
                            <li><strong>None:</strong> No access</li>
                            <li><strong>Own:</strong> Only their data</li>
                            <li><strong>Team:</strong> Team's data</li>
                            <li><strong>All:</strong> Everything</li>
                          </ul>
                        </div>
                        <div>
                          <div className="font-semibold mb-2">⚡ Actions</div>
                          <p className="text-xs leading-relaxed"><strong>Create:</strong> Add new records<br/>
                          <strong>Edit:</strong> Modify records<br/>
                          <strong>Delete:</strong> Remove records</p>
                        </div>
                        <div>
                          <div className="font-semibold mb-2">💡 How It Works</div>
                          <p className="text-xs leading-relaxed">Toggle module <strong>ON</strong> to enable access, then configure Scope (what data) and Actions (what they can do). Toggle <strong>OFF</strong> to completely hide the module.</p>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-blue-200 text-xs text-blue-700 flex items-start gap-2">
                        <span>⚠️</span>
                        <span><strong>Note:</strong> Changes apply after clicking "Save Permissions". Users may need to log out and back in to see navigation updates. Disabled modules will have a gray appearance in the table.</span>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>

          {/* Field Configuration Tab */}
          <TabsContent value="fields" className="p-6">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-800">Field Configuration</h3>
              <p className="text-sm text-slate-600">Configure fields for different entities in your CRM</p>
              
              <Tabs defaultValue="customer" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="customer">Customer Fields</TabsTrigger>
                  <TabsTrigger value="activity">Activity Fields</TabsTrigger>
                  <TabsTrigger value="risk">Risk Fields</TabsTrigger>
                  <TabsTrigger value="opportunity">Opportunity Fields</TabsTrigger>
                  <TabsTrigger value="task">Task Fields</TabsTrigger>
                </TabsList>

                {Object.entries(fieldConfigs).map(([key, fields]) => (
                  <TabsContent key={key} value={key}>
                    <Card>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-slate-50 border-b">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Field Name</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Type</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Required</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Editable</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {fields.map((field, idx) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="px-4 py-3 font-medium text-slate-800">{field.name}</td>
                                <td className="px-4 py-3 text-sm text-slate-600">
                                  <Badge variant="outline">{field.type}</Badge>
                                </td>
                                <td className="px-4 py-3">
                                  {field.required ? (
                                    <span className="text-green-600">✓</span>
                                  ) : (
                                    <span className="text-slate-400">-</span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  {field.editable ? (
                                    <span className="text-green-600">✓</span>
                                  ) : (
                                    <span className="text-slate-400">-</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setFieldEdit({ entityKey: key, index: idx, ...field });
                                      setShowFieldEditor(true);
                                    }}
                                  >
                                    <Edit size={14} />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                    <Button
                      className="mt-4"
                      variant="outline"
                      onClick={() => {
                        setFieldEdit({ entityKey: key, index: -1, name: '', type: 'Text', required: false, editable: true });
                        setShowFieldEditor(true);
                      }}
                    >
                      <Plus size={16} className="mr-2" />
                      Add Custom Field
                    </Button>
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          </TabsContent>

          {/* Dropdown Management Tab */}
          <TabsContent value="dropdowns" className="p-6">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Dropdown Management</h3>
                  <p className="text-sm text-slate-600">Manage dropdown values for various fields</p>
                </div>
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    setEditingDropdown(null);
                    setDropdownName('');
                    setDropdownValuesText('');
                    setShowDropdownEditor(true);
                  }}
                >
                  <Plus size={16} className="mr-2" />
                  Add Dropdown
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dropdowns.map((dd, idx) => (
                  <Card key={idx} className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-slate-800">{dd.name}</h4>
                        <p className="text-sm text-slate-600 mt-1">{dd.count} values</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {dd.values.slice(0, 4).map((v, i) => (
                            <Badge key={i} variant="outline" className="text-xs">{v}</Badge>
                          ))}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingDropdown({ index: idx });
                          setDropdownName(dd.name);
                          setDropdownValuesText((dd.values || []).join('\n'));
                          setShowDropdownEditor(true);
                        }}
                      >
                        <Edit size={16} />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Tags Management Tab */}
          <TabsContent value="tags" className="p-6">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Tags Management</h3>
                  <p className="text-sm text-slate-600">Create and manage tags for organizing customers</p>
                </div>
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => { setNewTag(''); setShowAddTag(true); }}>
                  <Plus size={16} className="mr-2" />
                  Add Tag
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {(settings?.tags || []).map((tag, idx) => (
                  <Badge key={idx} className="px-3 py-1.5 bg-blue-100 text-blue-700 cursor-pointer hover:bg-blue-200">
                    {tag}
                    <button
                      className="ml-2 text-blue-500 hover:text-blue-700"
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        try {
                          await axios.delete(`${API}/settings/tags/${encodeURIComponent(tag)}`);
                          await loadSettings();
                        } catch (err) {
                          toast.error('Failed to remove tag');
                        }
                      }}
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="p-6">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-800">Templates</h3>
              <p className="text-sm text-slate-600">Manage templates for activities, reports, tasks, and documents</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { name: 'Activity Templates', icon: '📋', count: 5, examples: ['QBR Template', 'Weekly Sync Notes', 'Onboarding Call'] },
                  { name: 'Report Templates', icon: '📊', count: 3, examples: ['Monthly Report', 'QBR Deck', 'Health Summary'] },
                  { name: 'Task Templates', icon: '✅', count: 4, examples: ['Onboarding Checklist', 'Renewal Prep', 'Risk Mitigation'] },
                  { name: 'Document Templates', icon: '📄', count: 6, examples: ['SOW Template', 'NDA Template', 'Contract Amendment'] },
                ].map((t, idx) => (
                  <Card key={idx} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl">{t.icon}</span>
                          <h4 className="font-medium text-slate-800">{t.name}</h4>
                        </div>
                        <p className="text-sm text-slate-600 mt-1">{t.count} templates</p>
                        <div className="mt-2 space-y-1">
                          {t.examples.map((ex, i) => (
                            <div key={i} className="text-xs text-slate-500">• {ex}</div>
                          ))}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const templates = settings?.templates || [];
                          const existing = templates.findIndex((x) => x.name === t.name);
                          const index = existing >= 0 ? existing : 0;
                          const tpl = existing >= 0 ? templates[existing] : t;
                          setTemplateEdit({ index, ...tpl, examplesText: (tpl.examples || []).join('\n') });
                          setShowTemplateEditor(true);
                        }}
                      >
                        <Edit size={16} />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Add Tag Modal */}
      {showAddTag && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Add Tag</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tag name</Label>
                <Input value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="e.g., Renewal Due" />
              </div>
              <div className="flex justify-end space-x-3">
                <Button variant="outline" onClick={() => setShowAddTag(false)}>Cancel</Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={async () => {
                    const value = newTag.trim();
                    if (!value) return;
                    try {
                      await axios.post(`${API}/settings/tags`, { tag: value });
                      toast.success('Tag added');
                      setShowAddTag(false);
                      setNewTag('');
                      await loadSettings();
                    } catch (e) {
                      toast.error(e.response?.data?.detail || 'Failed to add tag');
                    }
                  }}
                >
                  Add
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dropdown Editor */}
      {showDropdownEditor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">{editingDropdown ? 'Edit Dropdown' : 'Add Dropdown'}</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={dropdownName} onChange={(e) => setDropdownName(e.target.value)} placeholder="e.g., Industries" />
              </div>
              <div className="space-y-2">
                <Label>Values (one per line)</Label>
                <textarea
                  className="w-full px-3 py-2 border border-slate-300 rounded-md min-h-[140px]"
                  value={dropdownValuesText}
                  onChange={(e) => setDropdownValuesText(e.target.value)}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <Button variant="outline" onClick={() => setShowDropdownEditor(false)}>Cancel</Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={async () => {
                    const name = dropdownName.trim();
                    if (!name) return toast.error('Name is required');
                    const values = dropdownValuesText
                      .split('\n')
                      .map((s) => s.trim())
                      .filter(Boolean);
                    const next = [...(settings?.dropdowns || [])];
                    if (editingDropdown) {
                      next[editingDropdown.index] = { name, values };
                    } else {
                      next.push({ name, values });
                    }
                    await saveSettings({ dropdowns: next });
                    setShowDropdownEditor(false);
                    await loadSettings();
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Field Editor */}
      {showFieldEditor && fieldEdit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">{fieldEdit.index >= 0 ? 'Edit Field' : 'Add Field'}</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Field Name</Label>
                  <Input value={fieldEdit.name} onChange={(e) => setFieldEdit({ ...fieldEdit, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <select
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                    value={fieldEdit.type}
                    onChange={(e) => setFieldEdit({ ...fieldEdit, type: e.target.value })}
                  >
                    <option value="Text">Text</option>
                    <option value="Long Text">Long Text</option>
                    <option value="Dropdown">Dropdown</option>
                    <option value="Number">Number</option>
                    <option value="Currency">Currency</option>
                    <option value="Date">Date</option>
                    <option value="Percentage">Percentage</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={!!fieldEdit.required} onChange={(e) => setFieldEdit({ ...fieldEdit, required: e.target.checked })} />
                  <span className="text-sm text-slate-700">Required</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={!!fieldEdit.editable} onChange={(e) => setFieldEdit({ ...fieldEdit, editable: e.target.checked })} />
                  <span className="text-sm text-slate-700">Editable</span>
                </label>
              </div>
              <div className="flex justify-end space-x-3">
                <Button variant="outline" onClick={() => setShowFieldEditor(false)}>Cancel</Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={async () => {
                    const entityKey = fieldEdit.entityKey;
                    const list = [...(settings?.field_configs?.[entityKey] || [])];
                    const payload = { name: fieldEdit.name.trim(), type: fieldEdit.type, required: !!fieldEdit.required, editable: !!fieldEdit.editable };
                    if (!payload.name) return toast.error('Field name is required');
                    if (fieldEdit.index >= 0) list[fieldEdit.index] = payload;
                    else list.push(payload);
                    const nextConfigs = { ...(settings?.field_configs || {}), [entityKey]: list };
                    await saveSettings({ field_configs: nextConfigs });
                    setShowFieldEditor(false);
                    await loadSettings();
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Role Editor */}
      {showRoleEditor && roleEdit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Edit Role</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <Input value={roleEdit.role} disabled />
              </div>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={roleEdit.name} onChange={(e) => setRoleEdit({ ...roleEdit, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <textarea className="w-full px-3 py-2 border border-slate-300 rounded-md min-h-[100px]" value={roleEdit.desc} onChange={(e) => setRoleEdit({ ...roleEdit, desc: e.target.value })} />
              </div>
              <div className="flex justify-end space-x-3">
                <Button variant="outline" onClick={() => setShowRoleEditor(false)}>Cancel</Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={async () => {
                    const roles = [...(settings?.roles || [])];
                    const idx = roles.findIndex((r) => r.role === roleEdit.role);
                    if (idx >= 0) roles[idx] = { role: roleEdit.role, name: roleEdit.name, desc: roleEdit.desc };
                    else roles.push({ role: roleEdit.role, name: roleEdit.name, desc: roleEdit.desc });
                    await saveSettings({ roles });
                    setShowRoleEditor(false);
                    await loadSettings();
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Template Editor */}
      {showTemplateEditor && templateEdit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Edit Template Group</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={templateEdit.name} disabled />
              </div>
              <div className="space-y-2">
                <Label>Count</Label>
                <Input type="number" value={templateEdit.count} onChange={(e) => setTemplateEdit({ ...templateEdit, count: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Examples (one per line)</Label>
                <textarea
                  className="w-full px-3 py-2 border border-slate-300 rounded-md min-h-[120px]"
                  value={templateEdit.examplesText || ''}
                  onChange={(e) => setTemplateEdit({ ...templateEdit, examplesText: e.target.value })}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <Button variant="outline" onClick={() => setShowTemplateEditor(false)}>Cancel</Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={async () => {
                    const templates = [...(settings?.templates || [])];
                    const idx = templates.findIndex((t) => t.name === templateEdit.name);
                    const examples = (templateEdit.examplesText || '').split('\n').map((s) => s.trim()).filter(Boolean);
                    const payload = { name: templateEdit.name, count: Number(templateEdit.count) || 0, examples };
                    if (idx >= 0) templates[idx] = payload;
                    else templates.push(payload);
                    await saveSettings({ templates });
                    setShowTemplateEditor(false);
                    await loadSettings();
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteUser}
        title="Delete User"
        message="Do you wish to delete this user? This action cannot be undone."
        itemName={editingUser?.name || editingUser?.email}
        isDeleting={isDeleting}
      />
    </div>
  );
}
