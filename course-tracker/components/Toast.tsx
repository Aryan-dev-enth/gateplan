"use client";
import React, { useEffect, useState } from "react";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | null>(null);

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (toast: Omit<Toast, "id">) => {
    const id = Date.now().toString();
    const newToast: Toast = { ...toast, id, duration: toast.duration || 3000 };
    setToasts(prev => [...prev, newToast]);
    
    if (newToast.duration !== 0) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`
            pointer-events-auto
            px-4 py-3 rounded-xl shadow-lg
            transform transition-all duration-300 ease-out
            animate-in-slide-in-right
            min-w-[200px] max-w-[400px]
            glass
            ${toast.type === "success" ? "border-l-4 border-green-500" : ""}
            ${toast.type === "error" ? "border-l-4 border-red-500" : ""}
            ${toast.type === "info" ? "border-l-4 border-blue-500" : ""}
          `}
          style={{
            background: toast.type === "success" 
              ? "rgba(34,211,165,0.9)" 
              : toast.type === "error" 
                ? "rgba(239,68,68,0.9)" 
                : "rgba(99,120,255,0.9)",
            borderLeft: toast.type === "success" 
              ? "4px solid #22d3a5" 
              : toast.type === "error" 
                ? "4px solid #ef4444" 
                : "4px solid #6378ff",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 text-lg">
              {toast.type === "success" && "✓"}
              {toast.type === "error" && "✕"}
              {toast.type === "info" && "ℹ"}
            </div>
            <div className="flex-1 text-sm font-medium" style={{ color: "var(--text)" }}>
              {toast.message}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-xs opacity-60 hover:opacity-100 transition-all"
              style={{ color: "var(--text)" }}
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
