import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import { useAuth } from '../context/AuthContext';

export default function ChatBot() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(null); // stores index of copied message

  const messagesEndRef = useRef(null);

  // Initialize welcome message when user session becomes available
  useEffect(() => {
    if (user && messages.length === 0) {
      setMessages([
        {
          role: 'assistant',
          content: `Hello ${user.name}! I am your AI Helpdesk Assistant. I can help answer questions using the Knowledge Base. What can I help you with today?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          confidence: 100,
          usedArticles: []
        }
      ]);
    }
  }, [user, messages]);

  // Auto-scroll to bottom of chat window
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, loading]);

  // Do not load chatbot markup if user is not authenticated
  if (!user) return null;

  const handleSend = async (textToSend) => {
    const text = (textToSend || inputValue).trim();
    if (!text) return;

    if (!textToSend) {
      setInputValue('');
    }

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Add user message to history
    const newMessages = [
      ...messages,
      { role: 'user', content: text, timestamp }
    ];
    setMessages(newMessages);
    setLoading(true);

    try {
      // Map history format for API payload
      const historyPayload = newMessages.slice(1, -1).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const res = await apiClient.post('/chat', {
        message: text,
        history: historyPayload
      });

      if (res.data?.status === 'success') {
        const data = res.data.data;
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: data.answer,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            confidence: data.confidence,
            confidenceLevel: data.confidenceLevel,
            usedArticles: data.usedArticles || []
          }
        ]);
      } else {
        throw new Error('Unexpected response format');
      }
    } catch (err) {
      console.error('ChatBot API failure:', err);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: "I couldn't find an exact answer in the Knowledge Base due to a service error. Please try again or create a support ticket.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          confidence: 0,
          usedArticles: []
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(idx);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  const handleClear = () => {
    setMessages([
      {
        role: 'assistant',
        content: `Chat history cleared. What else can I help you with, ${user.name}?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        confidence: 100,
        usedArticles: []
      }
    ]);
  };

  // Safe lightweight markdown / text format parser
  const renderFormattedText = (text) => {
    if (!text) return '';
    // Replace **bold** with strong
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Replace code blocks
    formatted = formatted.replace(/`(.*?)`/g, '<code class="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-[11px]">$1</code>');
    // Replace newlines with breaks
    return <span dangerouslySetInnerHTML={{ __html: formatted.replace(/\n/g, '<br />') }} />;
  };

  const suggestedQuestions = [
    "How do I reset my password?",
    "VPN connection issues troubleshooting",
    "How do I create a support ticket?"
  ];

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-br from-indigo-500 to-cyan-500 hover:opacity-95 text-white font-semibold rounded-full px-5 py-3 shadow-lg shadow-indigo-500/20 flex items-center gap-2 transition duration-200 transform hover:-translate-y-0.5 active:translate-y-0 select-none text-sm"
      >
        <span>💬</span>
        <span>AI Assistant</span>
      </button>

      {/* Chat Window Popup */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] sm:w-[420px] h-[550px] max-h-[80vh] bg-white border border-slate-200 shadow-2xl rounded-2xl flex flex-col overflow-hidden animate-fadeIn text-slate-800">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-cyan-600 px-4 py-3 flex items-center justify-between text-white shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
              <span className="font-semibold text-sm tracking-wide">Apex AI Assistant</span>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={handleClear} 
                title="Clear Chat"
                className="hover:bg-white/10 p-1.5 rounded-lg text-white/80 hover:text-white transition text-xs font-semibold"
              >
                Clear
              </button>
              <button 
                onClick={() => setIsOpen(false)} 
                title="Close Window"
                className="hover:bg-white/10 p-1.5 rounded-lg text-white/80 hover:text-white transition font-black text-sm select-none"
              >
                ×
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.map((msg, idx) => {
              const isAssistant = msg.role === 'assistant';
              const showLowConfidenceWarning = isAssistant && msg.confidence !== undefined && msg.confidence < 60;
              const hasSources = isAssistant && msg.usedArticles && msg.usedArticles.length > 0;

              return (
                <div key={idx} className={`flex flex-col ${isAssistant ? 'items-start' : 'items-end'} space-y-1`}>
                  {/* Bubble */}
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-sm ${
                    isAssistant 
                      ? 'bg-white border border-slate-200 text-slate-800' 
                      : 'bg-indigo-600 text-white font-medium'
                  }`}>
                    {renderFormattedText(msg.content)}

                    {/* Low Confidence warning */}
                    {showLowConfidenceWarning && (
                      <div className="mt-3 pt-3 border-t border-slate-100 text-amber-600 font-semibold flex flex-col gap-2">
                        <span>⚠️ I'm not fully confident about this answer.</span>
                        <button
                          onClick={() => {
                            setIsOpen(false);
                            navigate(`/tickets?create=true&title=${encodeURIComponent(messages[messages.length - 2]?.content || 'AI Helpdesk Question')}&description=${encodeURIComponent(msg.content)}`);
                          }}
                          className="self-start py-1.5 px-3 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-[10px] font-bold border border-indigo-200 transition"
                        >
                          🎫 Create Support Ticket
                        </button>
                      </div>
                    )}

                    {/* Sources Block */}
                    {hasSources && (
                      <div className="mt-3 pt-2.5 border-t border-slate-100">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Sources</span>
                        <div className="flex flex-col gap-1">
                          {msg.usedArticles.map((art, aIdx) => (
                            <button
                              key={aIdx}
                              onClick={() => {
                                setIsOpen(false);
                                navigate(`/kb?id=${art.id}`);
                              }}
                              className="text-[11px] text-indigo-600 hover:text-indigo-700 hover:underline text-left block truncate font-medium"
                              title={`View ${art.title}`}
                            >
                              📖 {art.title}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bubble Metadata */}
                  <div className="flex items-center gap-2 text-[9px] text-slate-400 px-1">
                    <span>{msg.timestamp}</span>
                    {isAssistant && msg.confidence > 0 && (
                      <span>• Match: {msg.confidence}%</span>
                    )}
                    {isAssistant && (
                      <button
                        onClick={() => handleCopy(msg.content, idx)}
                        className="hover:text-slate-600 transition"
                      >
                        {copyFeedback === idx ? 'Copied!' : 'Copy'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Typing / Loading indicator */}
            {loading && (
              <div className="flex items-start space-x-1">
                <div className="bg-white border border-slate-200 rounded-2xl px-4 py-2.5 shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick-select Suggested Questions */}
          {messages.length === 1 && (
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex flex-col gap-1">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Suggested Questions</span>
              <div className="flex flex-wrap gap-1">
                {suggestedQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(q)}
                    className="py-1 px-2.5 rounded-full bg-white border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/20 text-slate-600 hover:text-indigo-600 text-[10px] text-left transition"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Footer */}
          <div className="p-3 border-t border-slate-200 bg-white flex items-center gap-2">
            <textarea
              rows={1}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              placeholder="Ask a question..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 resize-none max-h-20 leading-relaxed disabled:opacity-50"
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !inputValue.trim()}
              className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white rounded-xl shadow transition duration-150 disabled:opacity-50 select-none flex items-center justify-center"
            >
              <svg className="w-3.5 h-3.5 transform rotate-90" fill="currentColor" viewBox="0 0 24 24">
                <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
