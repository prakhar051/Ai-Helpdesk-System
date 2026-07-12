import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';
import { useSocket } from '../context/SocketContext';

export default function CommentSection({ ticketId }) {
  const { user } = useAuth();
  
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  
  // Edit State
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editContent, setEditContent] = useState('');

  // Status & Loaders
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchComments = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get(`/tickets/${ticketId}/comments`);
      if (response.data?.status === 'success') {
        setComments(response.data.data.comments);
      }
    } catch (err) {
      console.error('Failed to load comments:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch comments thread.');
    } finally {
      setLoading(false);
    }
  };

  const { socket } = useSocket();

  useEffect(() => {
    fetchComments();
  }, [ticketId]);

  useEffect(() => {
    if (!socket) return;

    const handleCommentEvent = (payload) => {
      const { ticketId: incomingTicketId, comment } = payload.data || {};
      if (incomingTicketId === ticketId) {
        setComments((prev) => {
          if (prev.some((c) => c.id === comment.id)) return prev;
          return [...prev, comment];
        });
      }
    };

    socket.on('ticket:comment', handleCommentEvent);

    return () => {
      socket.off('ticket:comment', handleCommentEvent);
    };
  }, [socket, ticketId]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setActionLoading(true);
    setError(null);
    try {
      const response = await apiClient.post(`/tickets/${ticketId}/comments`, {
        content: newComment.trim()
      });
      if (response.data?.status === 'success') {
        setNewComment('');
        fetchComments();
      }
    } catch (err) {
      console.error('Failed to add comment:', err);
      setError(err.response?.data?.message || err.message || 'Failed to add comment.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateComment = async (commentId) => {
    if (!editContent.trim()) return;

    setActionLoading(true);
    setError(null);
    try {
      const response = await apiClient.patch(`/tickets/${ticketId}/comments/${commentId}`, {
        content: editContent.trim()
      });
      if (response.data?.status === 'success') {
        setEditingCommentId(null);
        setEditContent('');
        fetchComments();
      }
    } catch (err) {
      console.error('Failed to edit comment:', err);
      setError(err.response?.data?.message || err.message || 'Failed to edit comment.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;

    setActionLoading(true);
    setError(null);
    try {
      const response = await apiClient.delete(`/tickets/${ticketId}/comments/${commentId}`);
      if (response.data?.status === 'success') {
        fetchComments();
      }
    } catch (err) {
      console.error('Failed to delete comment:', err);
      setError(err.response?.data?.message || err.message || 'Failed to delete comment.');
    } finally {
      setActionLoading(false);
    }
  };

  const formatTimestamp = (dateStr) => {
    return new Date(dateStr).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Role Badge Styling
  const roleBadges = {
    ADMIN: 'bg-red-500/10 border-red-500/20 text-red-400',
    AGENT: 'bg-indigo-500/10 border-indigo-500/20 text-primary',
    CUSTOMER: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
  };

  return (
    <div className="space-y-6 pt-6 border-t border-borderDefault">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-textMuted">
          Collaboration Thread
        </h3>
        <span className="text-xs text-textDisabled">{comments.length} comments</span>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Thread list */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-6">
            <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-6 text-textDisabled text-xs italic">
            No comments yet. Start the conversation below.
          </div>
        ) : (
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {comments.map((comment) => {
              const isAuthor = comment.authorId === user?.id;
              const canDelete = isAuthor || user?.role === 'ADMIN';
              const isEditing = editingCommentId === comment.id;

              return (
                <div key={comment.id} className="bg-bgSurface border border-slate-200/30 border border-borderDefault rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <strong className="text-xs text-textPrimary">{comment.author.name}</strong>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border ${roleBadges[comment.author.role] || roleBadges.CUSTOMER}`}>
                        {comment.author.role}
                      </span>
                      <span className="text-[10px] text-textDisabled">
                        {formatTimestamp(comment.createdAt)}
                      </span>
                    </div>

                    {/* Actions Panel */}
                    <div className="flex items-center gap-2">
                      {isAuthor && !isEditing && (
                        <button
                          onClick={() => {
                            setEditingCommentId(comment.id);
                            setEditContent(comment.content);
                          }}
                          disabled={actionLoading}
                          className="text-[10px] text-primary hover:text-primary-hover font-medium"
                        >
                          Edit
                        </button>
                      )}
                      {canDelete && !isEditing && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          disabled={actionLoading}
                          className="text-[10px] text-red-400 hover:text-red-300 font-medium"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Comment Body */}
                  {isEditing ? (
                    <div className="space-y-2 pt-1">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        disabled={actionLoading}
                        rows="3"
                        className="w-full bg-bgBase border border-slate-300 rounded-xl px-3 py-2 text-xs text-textPrimary focus:outline-none focus:border-indigo-500/50 resize-y"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingCommentId(null);
                            setEditContent('');
                          }}
                          disabled={actionLoading}
                          className="py-1 px-2.5 rounded-lg bg-bgSecondary hover:bg-slate-700 text-textSecondary text-[10px] font-semibold transition"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleUpdateComment(comment.id)}
                          disabled={actionLoading}
                          className="py-1 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-semibold transition"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-textSecondary leading-relaxed whitespace-pre-wrap font-sans">
                      {comment.content}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add comment Form */}
      <form onSubmit={handleAddComment} className="space-y-2 pt-2 border-t border-borderDefault">
        <textarea
          placeholder="Write a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          disabled={actionLoading}
          rows="3"
          className="w-full bg-bgBase border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-textPrimary focus:outline-none focus:border-indigo-500/50 placeholder-textDisabled resize-y leading-relaxed"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={actionLoading || !newComment.trim()}
            className="py-2 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-semibold text-xs hover:opacity-90 transition disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-indigo-500/10"
          >
            {actionLoading ? 'Posting...' : 'Post Comment'}
          </button>
        </div>
      </form>
    </div>
  );
}
