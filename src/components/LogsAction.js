import React, { useState } from 'react';
import LogsDialog from './LogsDialog';

export default function LogsAction({
  category,
  buttonLabel = 'Logs',
  title = 'Logs',
  disabled = false,
  buttonClassName,
  buttonStyle,
  baseButtonClassName = 'btn-secondary',
  sizeClassName = 'small',
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className={[baseButtonClassName, sizeClassName, buttonClassName].filter(Boolean).join(' ')}
        title={title}
        aria-label={title}
        onClick={() => setOpen(true)}
        disabled={disabled}
        style={buttonStyle}
      >
        {buttonLabel}
      </button>

      <LogsDialog
        open={open}
        category={category}
        title={title}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
