'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faExclamationCircle,
  faCheckCircle,
  faInfoCircle,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

// Type definitions
type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

export interface ToastContextType {
  showToast: (message: string, type: ToastType) => void;
}

// Create context
export const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Toast provider component
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]); // Add a new toast
  const showToast = (message: string, type: ToastType = 'info') => {
    const id = crypto.randomUUID();
    // Add toast to the array
    setToasts(prevToasts => [...prevToasts, { id, message, type }]);

    // Auto-remove after 5 seconds (5000ms)
    setTimeout(() => {
      setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
    }, 5000);
  };

  // Remove a toast
  const removeToast = (id: string) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  };
  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-20 left-8 z-50 flex flex-col gap-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-center justify-between gap-2 rounded-md p-3 shadow-lg toast-enter min-w-[300px] max-w-md backdrop-blur-md border ${
              toast.type === 'success'
                ? 'bg-green-800/90 text-green-100 border-green-500'
                : toast.type === 'error'
                  ? 'bg-red-800/90 text-red-100 border-red-500'
                  : 'bg-blue-800/90 text-blue-100 border-blue-500'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="text-lg">
                {toast.type === 'success' ? (
                  <FontAwesomeIcon icon={faCheckCircle} />
                ) : toast.type === 'error' ? (
                  <FontAwesomeIcon icon={faExclamationCircle} />
                ) : (
                  <FontAwesomeIcon icon={faInfoCircle} />
                )}
              </div>
              <p className="text-sm font-medium">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-3 rounded-full p-1 hover:bg-black/20"
              aria-label="Close"
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// Hook to use toast
export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
