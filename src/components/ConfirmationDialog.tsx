import React from 'react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  title = 'Confirm',
  message,
  confirmText = 'Yes',
  cancelText = 'No',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-6 w-80">
        {title && <h2 className="text-lg font-bold mb-2 text-white">{title}</h2>}
        <p className="text-gray-200 mb-4">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
