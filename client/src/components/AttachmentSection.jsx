import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';

export default function AttachmentSection({ ticketId }) {
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  const [attachments, setAttachments] = useState([]);
  
  // Status states
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAttachments = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get(`/tickets/${ticketId}/attachments`);
      if (response.data?.status === 'success') {
        setAttachments(response.data.data.attachments);
      }
    } catch (err) {
      console.error('Failed to load attachments:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch attachments list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttachments();
  }, [ticketId]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check size limit client-side first
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setError('File size exceeds the maximum 10MB limit.');
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await apiClient.post(`/tickets/${ticketId}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (response.data?.status === 'success') {
        // Clear file input
        if (fileInputRef.current) fileInputRef.current.value = '';
        fetchAttachments();
      }
    } catch (err) {
      console.error('Upload failed:', err);
      setError(err.response?.data?.message || err.message || 'Failed to upload attachment.');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (attachment) => {
    try {
      // Trigger browser download by requesting binary blob stream
      const response = await apiClient.get(`/tickets/${ticketId}/attachments/${attachment.id}/download`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: attachment.mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', attachment.originalName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
      setError('Failed to download file.');
    }
  };

  const handleDelete = async (attachmentId) => {
    if (!window.confirm('Are you sure you want to delete this file attachment?')) return;

    setError(null);
    try {
      const response = await apiClient.delete(`/tickets/${ticketId}/attachments/${attachmentId}`);
      if (response.data?.status === 'success') {
        fetchAttachments();
      }
    } catch (err) {
      console.error('Delete failed:', err);
      setError(err.response?.data?.message || err.message || 'Failed to delete file.');
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6 pt-6 border-t border-white/5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">
          File Attachments
        </h3>

        {/* Upload Trigger Button */}
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-gray-200 text-[10px] font-semibold border border-white/5 transition flex items-center gap-1.5 disabled:opacity-50"
          >
            {uploading ? (
              <>
                <div className="w-3 h-3 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin"></div>
                Uploading...
              </>
            ) : (
              '📎 Upload File (Max 10MB)'
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Files List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-4">
            <div className="w-5 h-5 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
          </div>
        ) : attachments.length === 0 ? (
          <div className="text-center py-4 text-gray-500 text-xs italic">
            No files attached yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {attachments.map((file) => {
              const isUploader = file.uploadedById === user?.id;
              const canDelete = isUploader || user?.role === 'ADMIN';

              return (
                <div key={file.id} className="bg-slate-900/20 border border-white/5 hover:border-white/10 rounded-xl p-3 flex items-center justify-between gap-3 group transition duration-150">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className="text-xl">📄</span>
                    <div className="overflow-hidden">
                      <h4 className="text-xs font-bold text-gray-200 truncate pr-2">
                        {file.originalName}
                      </h4>
                      <p className="text-[10px] text-gray-500">
                        {formatSize(file.fileSize)} • {file.uploadedBy?.name}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownload(file)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-400 text-[10px] font-semibold transition"
                      title="Download File"
                    >
                      Download
                    </button>
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(file.id)}
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white text-[10px] font-semibold border border-red-500/20 transition"
                        title="Delete File"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
