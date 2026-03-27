"use client";
import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/store";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Target, TrendingUp, Calendar, AlertCircle, Activity, Sparkles, Trash2 } from "lucide-react";

type Message = {
  role: "user" | "model" | "system";
  content: string;
  timestamp?: string | Date;
};

export default function AIPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    { role: "model", content: "Hi! I'm your GatePlan AI assistant. Ask me anything about your syllabus, progress, backlogs, or study plans!" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [contextData, setContextData] = useState<any>(null);
  const [showContext, setShowContext] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const u = getCurrentUser();
    if (!u) {
      router.replace("/");
    } else {
      setUsername(u);
      fetch(`/api/ai/chat?username=${encodeURIComponent(u)}`)
        .then(res => res.json())
        .then(data => {
          if (data) {
            setContextData(data);
            if (data.chatHistory && data.chatHistory.length > 0) {
              setMessages([
                { role: "model", content: "Hi! I'm your GatePlan AI assistant. Ask me anything about your syllabus, progress, backlogs, or study plans!" },
                ...data.chatHistory
              ]);
            }
          }
        })
        .catch(err => console.error("Failed to fetch context:", err));
    }
  }, [router]);

  const suggestions = useMemo(() => {
    const baseSuggestions = [
      { text: "When will I finish my syllabus at this pace?", icon: <TrendingUp size={16} className="text-blue-400" /> },
      { text: "Which subjects have the biggest backlogs?", icon: <AlertCircle size={16} className="text-red-400" /> },
      { text: "Plan my weekend to clear pending lectures.", icon: <Calendar size={16} className="text-green-400" /> },
      { text: "Summarize my active study sessions this week.", icon: <Activity size={16} className="text-purple-400" /> },
    ];

    if (contextData?.backlogData && Object.keys(contextData.backlogData).length > 0) {
      const firstBacklog = Object.keys(contextData.backlogData)[0];
      baseSuggestions[1] = { text: `Build a strategy to catch up on ${firstBacklog}.`, icon: <Target size={16} className="text-orange-400" /> };
    } else if (contextData?.completedLecturesCount > 50) {
      baseSuggestions[1] = { text: `What should I revise based on my completion?`, icon: <Sparkles size={16} className="text-amber-400" /> };
    }

    return baseSuggestions;
  }, [contextData]);

  async function handleClearChat() {
    if (!username || isLoading) return;
    if (!confirm("Are you sure you want to delete your entire AI chat history? This cannot be undone.")) return;

    try {
      setIsLoading(true);
      await fetch(`/api/ai/chat?username=${encodeURIComponent(username)}`, { method: "DELETE" });
      setMessages([{ role: "model", content: "Hi! I'm your GatePlan AI assistant. Ask me anything about your syllabus, progress, backlogs, or study plans!" }]);
    } catch (err) {
      console.error("Failed to clear chat:", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e?: React.FormEvent, overrideText?: string) {
    if (e) e.preventDefault();
    const textToSend = overrideText || input.trim();
    if (!textToSend || !username || isLoading) return;

    const userMessage = { role: "user" as const, content: textToSend };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages.filter(m => m.role !== "system"), userMessage],
          username
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP Error ${res.status}`);
      }

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");

      let aiMessage = "";
      setMessages(prev => [...prev, { role: "model", content: "" }]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        aiMessage += chunk;

        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].content = aiMessage;
          return newMessages;
        });
      }
    } catch (err: any) {
      console.error(err);
      let errMsg = err.message || "Sorry, I encountered an error answering your question.";
      if (errMsg.includes("429") || errMsg.includes("Quota") || errMsg.includes("RATE_LIMIT")) {
        errMsg = "Google Gemini API Quota Exceeded! Please check your Google AI Studio plan and API rate limits.";
      }
      setMessages(prev => [...prev, { role: "model", content: errMsg }]);
    } finally {
      setIsLoading(false);
    }
  }

  if (!username) return null;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] max-w-4xl mx-auto p-4 fade-in">
      <div className="flex items-center justify-between mb-4 mt-2">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <span className="grad-text">GatePlan</span>
          <span style={{ color: "var(--text)" }}> AI Assistant</span>
        </h1>
        <button 
          onClick={handleClearChat}
          disabled={isLoading}
          className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors opacity-70 hover:opacity-100 disabled:opacity-30"
          style={{ color: "var(--red)" }}
          title="Delete Conversation"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {contextData && (
        <div className="mb-4 rounded-xl overflow-hidden transition-all shadow-sm" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
          <button
            type="button"
            onClick={() => setShowContext(!showContext)}
            className="w-full flex items-center justify-between p-3 text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            style={{ color: "var(--muted)" }}
          >
            <span>What does the AI know about you?</span>
            <svg style={{ transform: showContext ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {showContext && (
            <div className="p-4 border-t flex flex-wrap gap-4" style={{ borderTopColor: "var(--border)", background: "var(--surface2)", color: "var(--text)" }}>
              {/* Target Date */}
              <div className="flex-1 min-w-[150px] p-3 rounded-lg" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <p className="text-xs uppercase font-bold tracking-wider mb-1" style={{ color: "var(--muted)" }}>Target Date</p>
                <p className="text-lg font-bold" style={{ color: "var(--accent)" }}>{contextData.targetDate || "Not Set"}</p>
              </div>

              {/* Completed Lectures */}
              <div className="flex-1 min-w-[150px] p-3 rounded-lg" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <p className="text-xs uppercase font-bold tracking-wider mb-1" style={{ color: "var(--muted)" }}>Completed Lectures</p>
                <p className="text-lg font-bold" style={{ color: "var(--green)" }}>{contextData.completedLecturesCount || 0}</p>
              </div>

              {/* Backlogs */}
              <div className="flex-1 min-w-[200px] p-3 rounded-lg" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <p className="text-xs uppercase font-bold tracking-wider mb-2" style={{ color: "var(--muted)" }}>Current Backlogs</p>
                {contextData.backlogData && Object.keys(contextData.backlogData).length > 0 ? (
                  <div className="flex flex-col gap-1.5">
                    {Object.entries(contextData.backlogData).map(([subject, data]: any) => (
                      <div key={subject} className="flex justify-between items-center text-xs">
                        <span className="truncate max-w-[120px]" style={{ color: "var(--text)" }}>{subject}</span>
                        <span className="font-bold rounded px-1.5 py-0.5" style={{ background: "var(--red)20", color: "var(--red)" }}>
                          -{data.backlogHours?.toFixed(1)}h
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm font-semibold" style={{ color: "var(--green)" }}>No immediate backlogs! 🎉</p>
                )}
              </div>

              {/* Study Sessions */}
              <div className="flex-1 min-w-[200px] p-3 rounded-lg" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <p className="text-xs uppercase font-bold tracking-wider mb-1" style={{ color: "var(--muted)" }}>Study Sessions</p>
                <p className="text-sm font-medium mb-1" style={{ color: "var(--text)" }}>{contextData.studySessionsCount} recorded in total</p>
              </div>

              {/* Subject Module Progress */}
              <div className="w-full p-3 rounded-lg relative" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <p className="text-xs uppercase font-bold tracking-wider mb-3" style={{ color: "var(--muted)" }}>Module Progress</p>
                {contextData.subjectProgress && Object.keys(contextData.subjectProgress).length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(contextData.subjectProgress).map(([subject, stats]: any) => (
                      <div key={subject} className="flex flex-col gap-1 p-2 rounded" style={{ background: "var(--surface2)" }}>
                        <span className="text-xs font-semibold truncate" style={{ color: "var(--text)" }}>{subject}</span>
                        <div className="flex justify-between items-center text-[10px]" style={{ color: "var(--muted)" }}>
                          <span>Modules: {stats.modulesCompleted}/{stats.modulesTotal}</span>
                          <span style={{ color: "var(--accent)" }}>Lectures: {stats.lecturesCompleted}/{stats.lecturesTotal}</span>
                        </div>
                        <div className="h-1 w-full rounded-full overflow-hidden mt-1" style={{ background: "var(--border)" }}>
                          <div className="h-full transition-all duration-500" style={{ width: `${stats.modulesTotal > 0 ? (stats.modulesCompleted / stats.modulesTotal) * 100 : 0}%`, background: "var(--accent)" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm font-semibold" style={{ color: "var(--green)" }}>Progress data unavailable.</p>
                )}
              </div>

              {/* Copy Context Button */}
              <div className="w-full flex justify-end mt-2">
                <button
                  onClick={() => {
                    if (contextData.rawString) {
                      navigator.clipboard.writeText(contextData.rawString);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }
                  }}
                  className="px-4 py-1.5 text-xs font-semibold rounded-md flex items-center gap-2 transition-all hover:bg-black/5 dark:hover:bg-white/5"
                  style={{ border: "1px solid var(--border)", color: "var(--text)" }}
                >
                  {copied ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                      Copy Context for other AI
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto mb-4 p-4 rounded-xl flex flex-col gap-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${msg.role === "user"
                ? "text-white"
                : ""
                }`}
              style={{
                background: msg.role === "user" ? "var(--accent)" : "var(--surface2)",
                color: msg.role === "user" ? "#fff" : "var(--text)",
                border: msg.role === "model" ? "1px solid var(--border)" : "none",
                whiteSpace: msg.role === "user" ? "pre-wrap" : "normal"
              }}
            >
              <div className="prose dark:prose-invert prose-p:leading-relaxed prose-pre:bg-black/10 text-[11px] md:text-[12px] prose-p:text-[11px] md:prose-p:text-[12px] prose-li:text-[11px] md:prose-li:text-[12px] prose-headings:text-[13px] prose-headings:font-bold prose-headings:mt-3 prose-headings:mb-1.5 prose-p:mb-2.5 prose-ul:mb-2.5 prose-ol:mb-2.5 max-w-none">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    table: ({node, ...props}) => (
                      <div className="overflow-x-auto my-3 rounded-lg border w-full text-left" style={{ borderColor: "var(--border)" }}>
                        <table className="w-full text-left border-collapse min-w-[300px]" {...props} />
                      </div>
                    ),
                    th: ({node, ...props}) => <th className="px-3 py-2 border-b bg-black/5 dark:bg-white/5 font-semibold" style={{ borderColor: "var(--border)" }} {...props} />,
                    td: ({node, ...props}) => <td className="px-3 py-2 border-b last:border-0" style={{ borderColor: "var(--border)" }} {...props} />,
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              </div>
            </div>
            {msg.timestamp && (
              <span className="text-[10px] opacity-60 px-2" style={{ color: "var(--muted)" }}>
                {new Date(msg.timestamp).toLocaleString(undefined, {
                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </span>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-4 py-3 w-16 flex justify-center items-center" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
              <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "var(--muted)", animationDelay: "0ms" }}></div>
                <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "var(--muted)", animationDelay: "150ms" }}></div>
                <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "var(--muted)", animationDelay: "300ms" }}></div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-auto flex flex-col gap-3 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
          <p className="text-xs font-semibold px-2 flex items-center gap-2" style={{ color: "var(--muted)" }}>
            <span className="w-8 h-px bg-current opacity-30"></span>
            <Sparkles size={12} />
            AI Suggestions
            <span className="flex-1 h-px bg-current opacity-30"></span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-2">
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                onClick={() => sendMessage(undefined, s.text)}
                disabled={isLoading}
                className="flex items-center gap-3 text-left p-3 rounded-xl transition-all hover:-translate-y-0.5 shadow-sm group overflow-hidden relative"
                style={{
                  background: "var(--surface2)",
                  border: "1px solid var(--border)",
                  color: "var(--text)"
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="p-2 rounded-lg bg-black/10 dark:bg-white/5 group-hover:scale-110 transition-transform flex-shrink-0 relative z-10">
                  {s.icon}
                </div>
                <span className="text-[13px] font-medium leading-tight relative z-10">{s.text}</span>
              </button>
            ))}
          </div>
        </div>

        <div ref={endRef} style={{ float: "left", clear: "both" }} />
      </div>

      <form onSubmit={sendMessage} className="flex gap-2 relative fade-in-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
          placeholder="Ask me when you will finish the DBMS syllabus..."
          className="flex-1 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent transition-all shadow-sm disabled:opacity-50"
          style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)" }}
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="rounded-xl px-6 py-3 font-semibold text-white shadow-sm transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
          style={{ background: "var(--accent)" }}
        >
          Send
        </button>
      </form>
    </div>
  );
}
