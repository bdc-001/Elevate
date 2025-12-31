import { useState } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Upload, Download, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const SAMPLE_CSV = `company_name,industry,region,plan_type,arr,renewal_date,csm_email
Acme Corp,Technology,North India,License,500000,2025-12-31,priya.sharma@convin.ai
Global Services,Banking,West India,License,1000000,2025-06-30,vikram.patel@convin.ai
Tech Solutions,Fintech,South India,Subscription,750000,2025-09-15,rajesh.kumar@convin.ai`;

export default function BulkUploadModal({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        toast.error('Please upload a CSV file');
        return;
      }
      setFile(selectedFile);
      setUploadResult(null);
      
      // Preview file content
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result;
        const lines = text.split('\n').slice(0, 6); // Show first 5 rows + header
        setPreview(lines);
      };
      reader.readAsText(selectedFile);
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customer_upload_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Template downloaded');
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file first');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API}/customers/bulk-upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setUploadResult(response.data);
      
      if (response.data.success_count > 0) {
        toast.success(`Successfully imported ${response.data.success_count} customers`);
      }
      if (response.data.error_count > 0) {
        toast.warning(`${response.data.error_count} records had errors`);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to upload file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Upload Customers</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Instructions</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Upload a CSV file with customer data</li>
              <li>• Required columns: company_name</li>
              <li>• Optional columns: industry, region, plan_type, arr, renewal_date, csm_email</li>
              <li>• CSM will be auto-assigned based on email if provided</li>
            </ul>
          </div>

          {/* Download Template */}
          <Button
            variant="outline"
            onClick={downloadTemplate}
            className="w-full flex items-center justify-center space-x-2"
          >
            <Download size={18} />
            <span>Download CSV Template</span>
          </Button>

          {/* File Upload */}
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-upload"
              data-testid="csv-file-input"
            />
            <label htmlFor="csv-upload" className="cursor-pointer">
              <Upload size={40} className="mx-auto text-slate-400 mb-3" />
              <p className="text-slate-600 mb-2">
                {file ? file.name : 'Click to upload or drag and drop'}
              </p>
              <p className="text-xs text-slate-500">CSV files only</p>
            </label>
          </div>

          {/* Preview */}
          {preview && (
            <div className="space-y-2">
              <h4 className="font-medium text-slate-700 flex items-center space-x-2">
                <FileText size={18} />
                <span>Preview (first 5 rows)</span>
              </h4>
              <div className="bg-slate-50 rounded-lg p-3 overflow-x-auto">
                <pre className="text-xs text-slate-600">
                  {preview.join('\n')}
                </pre>
              </div>
            </div>
          )}

          {/* Upload Result */}
          {uploadResult && (
            <div className="space-y-3">
              <h4 className="font-medium text-slate-700">Upload Results</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                  <CheckCircle size={24} className="mx-auto text-green-600 mb-1" />
                  <div className="text-2xl font-bold text-green-700">{uploadResult.success_count}</div>
                  <div className="text-xs text-green-600">Imported</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                  <XCircle size={24} className="mx-auto text-red-600 mb-1" />
                  <div className="text-2xl font-bold text-red-700">{uploadResult.error_count}</div>
                  <div className="text-xs text-red-600">Errors</div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                  <AlertCircle size={24} className="mx-auto text-blue-600 mb-1" />
                  <div className="text-2xl font-bold text-blue-700">{uploadResult.total_rows}</div>
                  <div className="text-xs text-blue-600">Total Rows</div>
                </div>
              </div>

              {uploadResult.errors && uploadResult.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <h5 className="font-medium text-red-700 mb-2">Errors:</h5>
                  <ul className="text-sm text-red-600 space-y-1">
                    {uploadResult.errors.slice(0, 5).map((err, idx) => (
                      <li key={idx}>Row {err.row}: {err.error}</li>
                    ))}
                    {uploadResult.errors.length > 5 && (
                      <li>... and {uploadResult.errors.length - 5} more errors</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                if (uploadResult?.success_count > 0) {
                  onSuccess();
                } else {
                  onClose();
                }
              }}
            >
              {uploadResult?.success_count > 0 ? 'Done' : 'Cancel'}
            </Button>
            {!uploadResult && (
              <Button
                onClick={handleUpload}
                disabled={!file || loading}
                className="bg-blue-600 hover:bg-blue-700"
                data-testid="bulk-upload-submit"
              >
                {loading ? 'Uploading...' : 'Upload & Import'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
