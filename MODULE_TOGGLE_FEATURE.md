# Module Enable/Disable Toggle Feature

## Overview

A new **"Module Enabled"** toggle switch has been added to the rightmost column of the Permissions Matrix table in Settings → Roles & Permissions. This provides a clear, visual way to enable or disable entire modules for specific roles.

---

## 🎯 Purpose

The toggle serves as a **master control** for module visibility:

- **Toggle ON** (Green) → Module is enabled and visible to users with that role
- **Toggle OFF** (Gray) → Module is completely hidden from navigation and inaccessible

---

## 📊 New Table Layout

The Permissions Matrix now has **4 columns** (previously 4, but reorganized):

| Column | Width | Purpose |
|--------|-------|---------|
| **Module** | 22% | Name of the feature/module |
| **Scope** | 16% | Data visibility level (None/Own/Team/All) |
| **Actions** | 42% | CRUD permissions (Create/Edit/Delete checkboxes) |
| **Module Enabled** | 20% | **NEW** - Toggle to enable/disable the module |

### Column Order (Left → Right):
```
Module Name  →  Scope Dropdown  →  Actions Checkboxes  →  Enable/Disable Toggle
```

---

## 🎨 Visual Design

### Toggle Switch Appearance

**Enabled State:**
```
[●────] Enabled
 ↑ Green
```

**Disabled State:**
```
[────●] Disabled
 ↑ Gray
```

### Row Visual Feedback

- **Enabled modules**: Full opacity, bright colors
- **Disabled modules**: 60% opacity (grayed out appearance)
- **Hover effect**: Subtle background highlight on row hover

---

## 🔧 How It Works

### 1. **Toggle ON → Module Enabled**
When you toggle a module **ON**:
- ✅ Module becomes visible in the navigation menu
- ✅ Scope dropdown becomes active
- ✅ Action checkboxes become clickable
- ✅ Users with that role can access the module

### 2. **Toggle OFF → Module Disabled**
When you toggle a module **OFF**:
- ❌ Module is removed from the navigation menu
- ❌ Scope is automatically set to "None"
- ❌ Action checkboxes are disabled (grayed out)
- ❌ Users with that role cannot see or access the module

### 3. **Dependency Cascade**
- Disabling a module automatically sets its scope to "None"
- Enabling a module does NOT automatically enable any actions
- Actions can only be modified when the module is enabled
- If any action is checked, it auto-enables the module

---

## 📝 Usage Example

### Scenario: Setting up a CSM Role

**Step 1:** Select "CSM" from the Role dropdown

**Step 2:** For each module, configure permissions:

#### ✅ Customers Module (Enable)
1. **Toggle:** ON (Green) ✓
2. **Scope:** Own (CSM sees only their customers)
3. **Actions:** ✓ Create, ✓ Edit, ☐ Delete

#### ✅ Tasks Module (Enable)
1. **Toggle:** ON (Green) ✓
2. **Scope:** Own (CSM sees only their tasks)
3. **Actions:** ✓ Create, ✓ Edit, ✓ Delete

#### ❌ Settings Module (Disable)
1. **Toggle:** OFF (Gray) ✗
2. **Scope:** None (automatically set)
3. **Actions:** All disabled (grayed out)

**Step 3:** Click "Save Permissions"

**Result:** CSMs will see Customers and Tasks in their navigation, but NOT Settings.

---

## 🎯 Use Cases

### 1. **Quick Module Hiding**
- Want to hide "Data Labs" from Sales team?
- Just toggle it OFF → Done!

### 2. **Role-Specific Access**
- CSMs need Customers, Tasks, Activities
- Sales only needs Customers (view-only) and Opportunities
- Leadership needs everything
- Use toggles to enable/disable accordingly

### 3. **Feature Rollout**
- Rolling out a new module (e.g., Advanced Analytics)?
- Keep it toggled OFF for most roles
- Enable only for CS Leadership initially
- Gradually enable for other roles

### 4. **Cleanup**
- Deprecated a module?
- Toggle it OFF for all roles
- No need to delete permissions

---

## 🔍 Technical Details

### State Management

The toggle controls the `enabled` boolean field:

```javascript
// Module enabled
permDraft[role].modules[moduleKey].enabled = true

// Module disabled
permDraft[role].modules[moduleKey].enabled = false
```

### Disabled State Effects

When `enabled = false`:
1. Navigation filters out the module
2. Route guards redirect unauthorized access
3. Scope dropdown is disabled
4. Action checkboxes are disabled
5. Row opacity is reduced to 60%

### Backend Integration

The `enabled` field is stored in MongoDB:

```javascript
{
  role_permissions: {
    CSM: {
      modules: {
        customers: {
          enabled: true,    // ← Toggle controls this
          scope: "own",
          actions: { create: true, edit: true, delete: false }
        },
        settings: {
          enabled: false,   // ← Disabled module
          scope: "none",
          actions: { create: false, edit: false, delete: false }
        }
      }
    }
  }
}
```

---

## 🎨 Design Highlights

### Spacing & Layout
- **Column widths** optimized for content
- **Module Enabled** column is 20% wide (prominent but not overwhelming)
- Toggle switch + label fits comfortably
- No overlapping elements

### Visual Hierarchy
1. **Module name** (leftmost) - What you're configuring
2. **Scope & Actions** (middle) - How it works
3. **Enable/Disable** (rightmost) - Master switch

### Color Coding
- **Green toggle + "Enabled"** text → Active/ON
- **Gray toggle + "Disabled"** text → Inactive/OFF
- **Brand blue** on focus → Consistent with design system
- **60% opacity on disabled rows** → Clear visual feedback

### Accessibility
- Toggle has `sr-only` checkbox for screen readers
- Focus ring on keyboard navigation
- Clear "Enabled/Disabled" text labels
- Disabled state has `cursor-not-allowed`

---

## 📚 Updated Help Section

The blue info box now explains all 4 columns:

### 🔒 Module Enabled
Master toggle to enable/disable a module. When disabled, the module won't appear in navigation.

### 👁️ Scope
Controls what data users can see (None/Own/Team/All).

### ⚡ Actions
CRUD permissions (Create/Edit/Delete).

### 💡 How It Works
Toggle module ON to enable access, then configure Scope and Actions. Toggle OFF to completely hide the module.

---

## 🚀 Testing the Feature

### How to Test:

1. **Navigate to Settings → Roles & Permissions**
   ```
   http://localhost:3000/settings
   ```

2. **Select a role** (e.g., CSM)

3. **Toggle a module OFF** (e.g., Settings)
   - Notice the row becomes gray
   - Scope and Actions are disabled
   - Toggle shows "Disabled" in gray

4. **Click "Save Permissions"**

5. **Log in as a user with CSM role**

6. **Check navigation**
   - Settings should NOT appear in the sidebar

7. **Try to access directly**
   ```
   http://localhost:3000/settings
   ```
   - Should redirect to dashboard (unauthorized)

8. **Toggle back ON and save**

9. **Refresh/re-login**
   - Settings should reappear in navigation

---

## 🔄 Comparison: Before vs After

### Before
```
┌─────────┬─────────┬───────┬─────────┐
│ Module  │ Visible │ Scope │ Actions │
├─────────┼─────────┼───────┼─────────┤
│ Tasks   │   [✓]   │ Own ▼ │ ☑☑☐     │
└─────────┴─────────┴───────┴─────────┘
```

### After
```
┌─────────┬───────┬─────────┬──────────────────┐
│ Module  │ Scope │ Actions │ Module Enabled   │
├─────────┼───────┼─────────┼──────────────────┤
│ Tasks   │ Own ▼ │ ☑☑☐     │ [●────] Enabled  │ ← NEW!
└─────────┴───────┴─────────┴──────────────────┘
```

**Key Changes:**
- ✅ Removed redundant "Visible" checkbox column
- ✅ Added prominent "Module Enabled" toggle on the right
- ✅ Better visual hierarchy (toggle is the master control)
- ✅ Clearer column headers with explanatory subtitle
- ✅ Improved spacing (20% for toggle column)

---

## 💡 Best Practices

### 1. **Start with Toggles**
When setting up a new role, first decide which modules to enable/disable, then configure details.

### 2. **Default to Disabled**
For new/experimental modules, keep them toggled OFF until ready.

### 3. **Review Regularly**
Periodically review which modules each role has enabled. Disable unused ones.

### 4. **Use for Security**
Sensitive modules (Settings, User Management) should be toggled OFF for most roles.

### 5. **Document Changes**
When toggling modules, document why (e.g., "Disabled Data Labs for Sales - not part of their workflow").

---

## 🐛 Troubleshooting

### "I toggled it ON but users still can't see it"
- Did you click "Save Permissions"?
- Did the user log out and back in?
- Check that Scope is not "None"

### "Toggle is grayed out / can't click"
- You might not have ADMIN or CS_OPS permissions
- Only admins can edit permissions

### "Module still appears in navigation"
- Toggle should be OFF (gray)
- Check that you selected the correct role
- Ensure "Save Permissions" was clicked

### "Scope/Actions are disabled"
- Module is toggled OFF
- Toggle it ON first to enable configuration

---

## 📝 Files Modified

- **`frontend/src/pages/Settings.jsx`**
  - Updated table header (removed "Visible", added "Module Enabled")
  - Reorganized columns: Module → Scope → Actions → Toggle
  - Added toggle switch component with CSS styling
  - Updated help section to 4-column grid
  - Added visual feedback (opacity) for disabled modules
  - Updated header description

---

## 🎉 Summary

The new **Module Enabled toggle** provides:

✅ **Clear visual control** - Easy to see which modules are on/off  
✅ **Better UX** - Toggle switch is more intuitive than checkbox  
✅ **Prominent placement** - Rightmost column draws attention  
✅ **Cascading logic** - Disabling a module auto-disables scope/actions  
✅ **Visual feedback** - Disabled rows are grayed out  
✅ **Full-width layout** - No wasted space, evenly distributed columns  
✅ **Accessibility** - Screen reader support, keyboard navigation  
✅ **Consistency** - Matches design system (brand colors, spacing)  

This feature makes role management more intuitive and powerful! 🚀

