'use client';

import { useToast } from './Toast';
import { useEffect } from 'react';

export default function ToastDebugger() {
  const { showToast } = useToast();

  useEffect(() => {
    const timer = setTimeout(() => {
      showToast('Test toast notification', 'info');
    }, 2000);

    return () => clearTimeout(timer);
  }, [showToast]);

  return null;
}
