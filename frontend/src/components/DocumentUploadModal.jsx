import { useState } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Upload, FileText } from 'lucide-react';
import { toast } from 'sonner';

const DOCUMENT_TYPES = [
  'Contract', 'SOW (Statement of Work)', 'NDA', 'MSA', 'Order Form',
  'Proposal', 'Pricing Sheet', 'Technical Specification', 'Integration Guide',
  'Training Material', 'QBR Presentation', 'Meeting Notes', 'Support Documentation',
  'Invoice', 'PO (Purchase Order)', 'Amendment', 'Other'
];

export default function DocumentUploadModal({ customerId, customerName, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [formData, setFormData] = useState({
    document_type: 'Contract',
    title: '',
    description: '',
    document_url: ''
  });

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!formData.title) {
        setFormData({ ...formData, title: selectedFile.name.replace(/\.[^/.]+$/, '') });
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // For now, we'll just store the document metadata with URL
      // In production, you'd upload to S3/GCS and store the URL
      const payload = {
        customer_id: customerId,
        document_type: formData.document_type,
        title: formData.title,
        description: formData.description,
        document_url: formData.document_url || (file ? `documents/${customerId}/${file.name}` : ''),
        file_name: file?.name || '',
        file_size: file?.size || 0
      };

      await axios.post(`${API}/customers/${customerId}/documents`, payload);
      toast.success('Document added successfully');
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add document');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Document - {customerName}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="document_type">Document Type *</Label>
            <select
              id="document_type"
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
              value={formData.document_type}
              onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
              required
            >
              {DOCUMENT_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Document Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Master Service Agreement 2025"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              className="w-full px-3 py-2 border border-slate-300 rounded-md min-h-[60px]"
              placeholder="Brief description of the document..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* File Upload */}
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center">
            <input
              type="file"
              onChange={handleFileChange}
              className="hidden"
              id="doc-upload"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
            />
            <label htmlFor="doc-upload" className="cursor-pointer">
              {file ? (
                <div className="flex items-center justify-center space-x-2 text-blue-600">
                  <FileText size={24} />
                  <span className="font-medium">{file.name}</span>
                </div>
              ) : (
                <>
                  <Upload size={32} className="mx-auto text-slate-400 mb-2" />
                  <p className="text-slate-600">Click to upload document</p>
                  <p className="text-xs text-slate-500">PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX</p>
                </>
              )}
            </label>
          </div>

          {/* Or provide URL */}
          <div className="space-y-2">
            <Label htmlFor="document_url">Or Document URL</Label>
            <Input
              id="document_url"
              placeholder="https://drive.google.com/file/..."
              value={formData.document_url}
              onChange={(e) => setFormData({ ...formData, document_url: e.target.value })}
            />
            <p className="text-xs text-slate-500">Link to Google Drive, Dropbox, or other cloud storage</p>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || (!file && !formData.document_url)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Adding...' : 'Add Document'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
