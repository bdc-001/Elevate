# Delete Confirmation Modal - Implementation Guide

## Overview

A reusable, consistent delete confirmation modal has been created and implemented across the platform. This modal provides a professional, user-friendly experience for all delete operations.

---

## ✅ Component Created

**File:** `frontend/src/components/DeleteConfirmationModal.jsx`

### Features:
- ✅ Consistent design matching the provided mockup
- ✅ Warning icon with red/danger styling
- ✅ Configurable title and message
- ✅ Support for item names
- ✅ Loading state during deletion
- ✅ Backdrop click prevention
- ✅ Keyboard accessible

---

## 🎨 Design Specifications

### Visual Elements:
```
┌─────────────────────────────────────┐
│       Delete [Item Type]            │  ← Title (customizable)
│                                     │
│  ⚠️  Do you wish to delete...?     │  ← Warning message with icon
│     [customizable message]          │
│                                     │
│    [Cancel]    [Delete]            │  ← Action buttons
└─────────────────────────────────────┘
```

### Styling:
- **Background:** White with rounded corners and shadow
- **Warning Box:** Red background (`bg-red-50`) with red border
- **Icon:** AlertCircle from lucide-react (red color)
- **Delete Button:** Red background (`bg-red-600`) with hover state
- **Cancel Button:** Outline style with hover state

---

## 📖 Usage Examples

### Basic Usage

```javascript
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';

function MyComponent() {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await axios.delete(`${API}/items/${itemToDelete.id}`);
      toast.success('Item deleted');
      setShowDeleteModal(false);
      // Refresh data
    } catch (error) {
      toast.error('Failed to delete item');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {/* Trigger button */}
      <button onClick={() => {
        setItemToDelete(item);
        setShowDeleteModal(true);
      }}>
        Delete
      </button>

      {/* Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Customer"
        message="Do you wish to delete this customer?"
        itemName={itemToDelete?.name}
        isDeleting={isDeleting}
      />
    </>
  );
}
```

---

## 🔧 Implementation Status

### ✅ Completed:
1. **Settings → User Management**
   - Delete user functionality
   - File: `Settings.jsx`
   - Status: ✅ Implemented

### 🔲 To Be Implemented:

#### 1. **Customer Detail Page**
   - Location: `CustomerDetail.jsx`
   - Delete operations:
     - Delete customer
     - Delete stakeholder
     - Delete document
   
   ```javascript
   // Example for delete customer
   <DeleteConfirmationModal
     isOpen={showDeleteCustomerModal}
     onClose={() => setShowDeleteCustomerModal(false)}
     onConfirm={handleDeleteCustomer}
     title="Delete Customer"
     message="Do you wish to delete this customer? All associated data will be removed."
     itemName={customer?.company_name}
     isDeleting={isDeletingCustomer}
   />
   ```

#### 2. **Task List Page**
   - Location: `TaskList.jsx`
   - Delete operations:
     - Delete task
   
   ```javascript
   <DeleteConfirmationModal
     isOpen={showDeleteTaskModal}
     onClose={() => setShowDeleteTaskModal(false)}
     onConfirm={handleDeleteTask}
     title="Delete Task"
     message="Do you wish to delete this task?"
     itemName={taskToDelete?.title}
     isDeleting={isDeletingTask}
   />
   ```

#### 3. **Opportunity Pipeline**
   - Location: `OpportunityPipeline.jsx`
   - Delete operations:
     - Delete opportunity
   
   ```javascript
   <DeleteConfirmationModal
     isOpen={showDeleteOpportunityModal}
     onClose={() => setShowDeleteOpportunityModal(false)}
     onConfirm={handleDeleteOpportunity}
     title="Delete Opportunity"
     message="Do you wish to delete this opportunity?"
     itemName={opportunityToDelete?.title}
     isDeleting={isDeletingOpportunity}
   />
   ```

#### 4. **Risks Management**
   - Location: Various risk forms/lists
   - Delete operations:
     - Delete risk
   
   ```javascript
   <DeleteConfirmationModal
     isOpen={showDeleteRiskModal}
     onClose={() => setShowDeleteRiskModal(false)}
     onConfirm={handleDeleteRisk}
     title="Delete Risk"
     message="Do you wish to delete this risk?"
     itemName={riskToDelete?.title}
     isDeleting={isDeletingRisk}
   />
   ```

#### 5. **Activities**
   - Location: Activity forms/lists
   - Delete operations:
     - Delete activity
   
   ```javascript
   <DeleteConfirmationModal
     isOpen={showDeleteActivityModal}
     onClose={() => setShowDeleteActivityModal(false)}
     onConfirm={handleDeleteActivity}
     title="Delete Activity"
     message="Do you wish to delete this activity?"
     itemName={activityToDelete?.title}
     isDeleting={isDeletingActivity}
   />
   ```

#### 6. **Data Labs Reports**
   - Location: `DataLabsReports.jsx`
   - Delete operations:
     - Delete report
   
   ```javascript
   <DeleteConfirmationModal
     isOpen={showDeleteReportModal}
     onClose={() => setShowDeleteReportModal(false)}
     onConfirm={handleDeleteReport}
     title="Delete Report"
     message="Do you wish to delete this report?"
     itemName={reportToDelete?.report_title}
     isDeleting={isDeletingReport}
   />
   ```

#### 7. **Settings - Other Sections**
   - Location: `Settings.jsx`
   - Delete operations:
     - Delete custom field
     - Delete dropdown option
     - Delete tag
     - Delete template
   
   ```javascript
   // Delete Tag Example
   <DeleteConfirmationModal
     isOpen={showDeleteTagModal}
     onClose={() => setShowDeleteTagModal(false)}
     onConfirm={handleDeleteTag}
     title="Delete Tag"
     message="Do you wish to delete this tag?"
     itemName={tagToDelete}
     isDeleting={isDeletingTag}
   />
   ```

---

## 🔄 Migration Pattern

### Before (using window.confirm):
```javascript
const handleDelete = async () => {
  if (!window.confirm('Delete this item?')) return;
  try {
    await axios.delete(`${API}/items/${item.id}`);
    toast.success('Deleted');
  } catch (error) {
    toast.error('Failed');
  }
};
```

### After (using DeleteConfirmationModal):
```javascript
// 1. Add state
const [showDeleteModal, setShowDeleteModal] = useState(false);
const [isDeleting, setIsDeleting] = useState(false);

// 2. Update handler
const handleDelete = async () => {
  setIsDeleting(true);
  try {
    await axios.delete(`${API}/items/${item.id}`);
    toast.success('Deleted');
    setShowDeleteModal(false);
  } catch (error) {
    toast.error('Failed');
  } finally {
    setIsDeleting(false);
  }
};

// 3. Update button
<button onClick={() => setShowDeleteModal(true)}>Delete</button>

// 4. Add modal
<DeleteConfirmationModal
  isOpen={showDeleteModal}
  onClose={() => setShowDeleteModal(false)}
  onConfirm={handleDelete}
  title="Delete Item"
  message="Do you wish to delete this item?"
  itemName={item.name}
  isDeleting={isDeleting}
/>
```

---

## 📋 Props Reference

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `isOpen` | boolean | Yes | - | Controls modal visibility |
| `onClose` | function | Yes | - | Called when Cancel is clicked |
| `onConfirm` | function | Yes | - | Called when Delete is confirmed |
| `title` | string | No | "Delete Item" | Modal title |
| `message` | string | No | "Do you wish to delete this item?" | Warning message |
| `itemName` | string | No | "" | Specific item name (replaces generic text) |
| `isDeleting` | boolean | No | false | Shows loading state on Delete button |

---

## 💡 Best Practices

### 1. **Always Show Item Name**
```javascript
// Good
itemName={customer.company_name}

// Also good (fallback)
itemName={customer.name || customer.email}
```

### 2. **Provide Context in Message**
```javascript
// Good
message="Do you wish to delete this customer? All associated data will be removed."

// Also good (with consequences)
message="Do you wish to delete this user? This action cannot be undone."
```

### 3. **Handle Loading States**
```javascript
// Always set loading state
setIsDeleting(true);
try {
  // delete operation
} finally {
  setIsDeleting(false);  // Always cleanup
}
```

### 4. **Close Modal on Success**
```javascript
try {
  await axios.delete(...);
  toast.success('Deleted');
  setShowDeleteModal(false);  // Close modal
  refreshData();  // Refresh list
} catch (error) {
  // Keep modal open on error
  toast.error('Failed');
}
```

### 5. **Store Item Reference**
```javascript
// Store the item to delete before opening modal
const openDeleteModal = (item) => {
  setItemToDelete(item);
  setShowDeleteModal(true);
};
```

---

## 🎯 Testing Checklist

For each delete flow:
- [ ] Modal opens when delete button is clicked
- [ ] Modal shows correct title
- [ ] Modal shows correct warning message
- [ ] Item name is displayed correctly
- [ ] Cancel button closes modal without deleting
- [ ] Delete button triggers delete operation
- [ ] Delete button shows loading state during deletion
- [ ] Modal closes on successful deletion
- [ ] Toast message shows on success
- [ ] Error is handled gracefully (modal stays open)
- [ ] Toast error shows on failure
- [ ] Data refreshes after successful deletion

---

## 📝 Common Messages

### By Entity Type:

```javascript
// Users
title: "Delete User"
message: "Do you wish to delete this user? This action cannot be undone."

// Customers
title: "Delete Customer"
message: "Do you wish to delete this customer? All associated data will be removed."

// Tasks
title: "Delete Task"
message: "Do you wish to delete this task?"

// Opportunities
title: "Delete Opportunity"
message: "Do you wish to delete this opportunity?"

// Risks
title: "Delete Risk"
message: "Do you wish to delete this risk?"

// Activities
title: "Delete Activity"
message: "Do you wish to delete this activity?"

// Reports
title: "Delete Report"
message: "Do you wish to delete this report?"

// Documents
title: "Delete Document"
message: "Do you wish to delete this document? This action cannot be undone."

// Tags
title: "Delete Tag"
message: "Do you wish to delete this tag? It will be removed from all associated items."

// Templates
title: "Delete Template"
message: "Do you wish to delete this template?"
```

---

## 🚀 Next Steps

1. **Immediate:** Test the implemented user deletion flow in Settings
2. **Priority:** Implement for CustomerDetail page (high visibility)
3. **Standard:** Roll out to all other delete operations across the platform
4. **Documentation:** Update component storybook/documentation

---

## ✅ Summary

The `DeleteConfirmationModal` component provides:
- ✅ Consistent user experience across the platform
- ✅ Professional, polished appearance
- ✅ Better UX than browser's `window.confirm()`
- ✅ Customizable for different entity types
- ✅ Loading states for better feedback
- ✅ Accessible and keyboard-friendly
- ✅ Easy to implement and maintain

Replace all `window.confirm()` calls with this modal for a more professional and user-friendly experience!

