import React, { forwardRef } from 'react';
import { useWatch } from 'react-hook-form';
import type { Control } from 'react-hook-form';
import { SendIcon, TooltipAnchor } from '@librechat/client';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

type SendButtonProps = {
  disabled: boolean;
  control: Control<{ text: string }>;
};

const SubmitButton = React.memo(
  forwardRef((props: { disabled: boolean }, ref: React.ForwardedRef<HTMLButtonElement>) => {
    const localize = useLocalize();
    return (
      <TooltipAnchor
        description={localize('com_nav_send_message')}
        render={
          <button
            ref={ref}
            aria-label={localize('com_nav_send_message')}
            id="send-button"
            disabled={props.disabled}
            className={cn(
              'rounded-full bg-[#00A0FF] p-1.5 text-white outline-offset-4 transition-all duration-200 disabled:cursor-not-allowed disabled:bg-[#94A3B8] disabled:text-white disabled:opacity-100',
            )}
            data-testid="send-button"
            type="submit"
          >
            <span className="" data-state="closed">
              <SendIcon size={24} />
            </span>
          </button>
        }
      />
    );
  }),
);

const SendButton = React.memo(
  forwardRef((props: SendButtonProps, ref: React.ForwardedRef<HTMLButtonElement>) => {
    const data = useWatch({ control: props.control });
    return <SubmitButton ref={ref} disabled={props.disabled || !data.text} />;
  }),
);

export default SendButton;
