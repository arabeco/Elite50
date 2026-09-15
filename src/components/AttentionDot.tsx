import React from 'react';

/** Shared marker for an unread item or an action still required. */
export function AttentionDot({ label = 'Precisa de atenção', corner = false }: { label?: string; corner?: boolean }) {
  return <span className={`attention-dot${corner ? ' attention-dot--corner' : ''}`} role="img" aria-label={label} title={label} />;
}
