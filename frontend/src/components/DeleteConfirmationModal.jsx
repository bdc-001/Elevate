import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from './ui/button';

/**
 * Reusable Delete Confirmation Modal
 * 
 * @param {boolean} isOpen - Whether the modal is visible
 * @param {function} onClose - Callback when cancel is clicked
 * @param {function} onConfirm - Callback when delete is confirmed
 * @param {string} title - Modal title (e.g., "Delete Customer")
 * @param {string} message - Warning message (e.g., "Do you wish to delete this customer?")
 * @param {string} itemName - Optional: specific item name to show in the message
 * @param {boolean} isDeleting - Optional: show loading state on delete button
 */
export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Delete Item",
  message = "Do you wish to delete this item?",
  itemName = "",
  isDeleting = false
}) {
  if (!isOpen) return null;

  const fullMessage = itemName 
    ? message.replace(/this \w+/i, `"${itemName}"`)
    : message;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 w-full max-w-md mx-4 shadow-2xl">
        {/* Title */}
        <h3 className="text-2xl font-semibold text-slate-800 text-center mb-6">
          {title}
        </h3>
        
        {/* Warning Message */}
        <div className="flex items-start gap-3 mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-600 text-base leading-relaxed">
            {fullMessage}
          </p>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
            className="min-w-[120px] px-6 py-2.5 text-base border-slate-300 hover:bg-slate-50"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isDeleting}
            className="min-w-[120px] px-6 py-2.5 text-base bg-red-600 hover:bg-red-700 text-white"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>
    </div>
  );
}

