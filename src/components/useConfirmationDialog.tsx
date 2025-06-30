import { useState, useCallback } from 'react';
import { ConfirmationDialog } from './ConfirmationDialog';

export function useConfirmationDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState('');
  const [confirmText, setConfirmText] = useState('Yes');
  const [cancelText, setCancelText] = useState('No');
  const [resolvePromise, setResolvePromise] = useState<((result: boolean) => void) | null>(null);

  const confirm = useCallback(
    (options: { message: string; title?: string; confirmText?: string; cancelText?: string }) => {
      setMessage(options.message);
      setTitle(options.title || 'Confirm');
      setConfirmText(options.confirmText || 'Yes');
      setCancelText(options.cancelText || 'No');
      setIsOpen(true);
      return new Promise<boolean>(resolve => {
        setResolvePromise(() => resolve);
      });
    },
    []
  );

  const handleConfirm = () => {
    setIsOpen(false);
    resolvePromise?.(true);
    setResolvePromise(null);
  };

  const handleCancel = () => {
    setIsOpen(false);
    resolvePromise?.(false);
    setResolvePromise(null);
  };

  const dialog = (
    <ConfirmationDialog
      isOpen={isOpen}
      title={title}
      message={message}
      confirmText={confirmText}
      cancelText={cancelText}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );

  return { confirm, dialog };
}
