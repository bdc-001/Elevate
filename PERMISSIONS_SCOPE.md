# Role Manager - Scope Explained

## What is "Scope" in Role Manager?

**Scope** is a data access control mechanism that determines **what data a user can see and interact with** based on their role. It provides granular control over data visibility without affecting the user's ability to perform actions.

## Scope Options

### 1. **None** 
- **Access Level**: No access to the module
- **Use Case**: Completely restrict access to a module
- **Example**: Sales team has "None" scope for Settings module

### 2. **Own**
- **Access Level**: Users can only see their own data
- **Use Case**: Individual contributors who should only manage their assigned work
- **Examples**:
  - CSM with "Own" scope on **Customers** → Can only see customers assigned to them
  - CSM with "Own" scope on **Tasks** → Can only see tasks assigned to them or created by them
  - CSM with "Own" scope on **Activities** → Can only see activities they logged

### 3. **Team**
- **Access Level**: Users can see data from their team members
- **Use Case**: Managers who need visibility into their team's work
- **Examples**:
  - AM with "Team" scope on **Customers** → Can see all customers managed by CSMs reporting to them
  - AM with "Team" scope on **Tasks** → Can see all tasks for their team
  - AM with "Team" scope on **Opportunities** → Can see all opportunities in their team's pipeline

### 4. **All**
- **Access Level**: Users can see all data across the entire organization
- **Use Case**: Leadership and operations roles that need full visibility
- **Examples**:
  - CS Leadership with "All" scope → Can see all customers, tasks, activities across all teams
  - CS Operations with "All" scope → Can see everything for reporting and configuration
  - Admin with "All" scope → Full access to all data

## How Scope Works with Actions

**Scope** and **Actions** work together:

| Permission | What It Controls |
|------------|-----------------|
| **Visible** (Checkbox) | Whether the module appears in navigation |
| **Scope** (Dropdown) | What data within the module is visible |
| **Actions** (Checkboxes) | Whether user can Create / Edit / Delete |

### Example Combinations:

#### CSM Role - Typical Setup
```
Customers Module:
✓ Visible: Yes
  Scope: Own
  Actions: ✓ Create ✓ Edit ✗ Delete
  
Result: CSM can see only their customers, add new ones, edit them, but not delete
```

#### AM Role - Typical Setup
```
Tasks Module:
✓ Visible: Yes
  Scope: Team
  Actions: ✓ Create ✓ Edit ✓ Delete
  
Result: AM can see all tasks from their team, create new ones, edit any, and delete any
```

#### CS Leadership - Typical Setup
```
Dashboard Module:
✓ Visible: Yes
  Scope: All
  Actions: N/A (Dashboard doesn't have actions)
  
Result: CS Leadership sees dashboard with data from all teams and customers
```

#### Sales (View Only) - Typical Setup
```
Customers Module:
✓ Visible: Yes
  Scope: All
  Actions: ✗ Create ✗ Edit ✗ Delete
  
Result: Sales can see all customers but cannot create, edit, or delete any
```

## Overlapping Elements - Fixed

### Problem
In the Permissions Matrix table, the "SCOPE" dropdown selects were too narrow and overlapping, especially when multiple modules were listed. The layout was breaking on smaller screens.

### Solution Applied

#### 1. **Table Layout Improvements**
```jsx
// Added fixed column widths
<th className="w-1/4">Module</th>      // 25% width
<th className="w-20">Visible</th>      // Fixed 80px
<th className="w-32">Scope</th>        // Fixed 128px - prevents overlapping!
<th>Actions</th>                       // Flexible
```

#### 2. **Scope Dropdown Fixes**
```jsx
<select className="w-full min-w-[100px] px-3 py-1.5 ...">
```
- Added `w-full` to use full column width
- Added `min-w-[100px]` to prevent collapse
- Increased padding for better touch targets
- Added focus ring with brand colors

#### 3. **Better Checkbox Styling**
```jsx
<input type="checkbox" className="w-4 h-4 cursor-pointer" />
```
- Fixed size for consistency
- Added cursor pointer for better UX

#### 4. **Improved Actions Column**
```jsx
<label className="flex items-center gap-2 cursor-pointer">
  <input type="checkbox" className="w-4 h-4" />
  <span className="text-sm whitespace-nowrap">Create</span>
</label>
```
- Added `whitespace-nowrap` to prevent text wrapping
- Better gap spacing between checkboxes
- Consistent sizing

#### 5. **Enhanced Help Section**
Added a blue info box at the bottom explaining:
- What "Visible" means
- What each scope option means (None/Own/Team/All)
- What "Actions" control
- When changes take effect

## Real-World Scenarios

### Scenario 1: New CSM Onboarding
**Setup**: CSM role with "Own" scope on all modules
- CSM joins and is assigned 5 customers
- They can only see those 5 customers in the customer list
- They can create activities, tasks, and risks only for their customers
- They cannot see other CSMs' data

### Scenario 2: AM Promotion
**Setup**: Change scope from "Own" to "Team" when CSM becomes AM
- Immediately gains visibility into all CSMs reporting to them
- Can monitor team's tasks, activities, and health scores
- Can step in to help with at-risk accounts
- Still maintains their own customer portfolio

### Scenario 3: CS Leadership Dashboard
**Setup**: CS Leadership with "All" scope on Dashboard
- Can see organization-wide metrics
- Views health distribution across all customers
- Monitors all open risks and opportunities
- Tracks team performance across all AMs and CSMs

### Scenario 4: Sales Collaboration
**Setup**: Sales role with "All" scope but no actions
- Can view all customer information for context
- Can see renewal dates and health scores
- Can view opportunities to align with CS
- Cannot edit or delete anything (read-only)

## Technical Implementation

### Backend Enforcement
The scope is enforced in the backend API:

```python
# Example scope enforcement in /api/customers
scope = permissions.get("modules", {}).get("customers", {}).get("scope", "all")

if scope == "own":
    query["csm_owner_id"] = current_user['user_id']
elif scope == "team":
    team_csm_ids = await _get_team_csm_ids(current_user['user_id'])
    team_customer_ids = await _get_customer_ids_for_csms(team_csm_ids)
    query["id"] = {"$in": team_customer_ids}
# scope == "all" applies no filtering
```

### Frontend Display
The frontend hides/shows navigation and routes:

```javascript
// Check if user has access to a module
const hasModule = (key) => {
  if (!permissions) return true;
  return !!permissions?.modules?.[key]?.enabled;
};

// Render nav item only if enabled
{hasModule('customers') && (
  <Link to="/customers">Customers</Link>
)}
```

## Best Practices

### 1. **Principle of Least Privilege**
- Start with minimal scope and expand as needed
- Most users should have "Own" scope
- Only give "Team" to actual managers
- Limit "All" scope to leadership and ops roles

### 2. **Align Scope with Role**
- **CSM**: Own (manages specific customers)
- **AM**: Team (oversees multiple CSMs)
- **CS Leadership**: All (organizational visibility)
- **CS Operations**: All (needs full data for reporting)
- **Sales**: All but read-only (visibility without edit)

### 3. **Test After Changes**
- Always test scope changes by logging in as that role
- Verify correct data visibility
- Ensure actions work as expected
- Check that navigation updates correctly

### 4. **Document Custom Configurations**
- If you create custom roles, document their scope settings
- Explain why certain scopes were chosen
- Keep track of who has "All" scope access

## Troubleshooting

### "I can't see my customers"
- Check that Customers module is "Visible" ✓
- Verify scope is not "None"
- Confirm you're assigned as CSM/AM owner on those customers

### "I can see too much data"
- Your scope might be "All" when it should be "Own"
- Contact admin to adjust your role permissions

### "Dropdowns overlapping in table"
- Refresh browser to apply latest fixes
- Table now has fixed column widths
- Dropdowns have minimum width of 100px

### "Changes not taking effect"
- Click "Save Permissions" button after making changes
- Log out and log back in to refresh permissions
- Check browser console for errors

## Files Modified

- **`Settings.jsx`**: Permission matrix table layout and styling
  - Fixed table column widths
  - Added min-width to scope dropdowns
  - Improved checkbox styling
  - Added comprehensive help section

## Summary

**Scope** is a powerful data access control feature that:
- ✅ Determines what data users can see
- ✅ Works independently from module visibility and actions
- ✅ Supports hierarchical team structures (Own → Team → All)
- ✅ Is enforced on both backend and frontend
- ✅ Now has a clean, non-overlapping UI in the Settings page

This allows you to give users the right level of access without over-exposing data or requiring complex custom queries.

