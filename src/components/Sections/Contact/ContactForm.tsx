import axios from 'axios';
import {FC, memo, useCallback, useMemo, useState} from 'react';

interface FormData {
  name: string;
  email: string;
  message: string;
}

// Public contact API endpoint. Overridable via env for cleanliness; falls back
// to the deployed endpoint so static builds work without extra config.
const CONTACT_API_URL =
  process.env.NEXT_PUBLIC_CONTACT_API_URL ?? 'https://vs7dthj3vb.execute-api.us-west-1.amazonaws.com/api/contact';

// Client-side guard only — the Lambda performs authoritative validation.
const MAX_MESSAGE_LENGTH = 250;

type SubmitState = 'idle' | 'sending' | 'success' | 'error';

const ContactForm: FC = memo(() => {
  const defaultData = useMemo(
    () => ({
      name: '',
      email: '',
      message: '',
    }),
    [],
  );

  const [data, setData] = useState<FormData>(defaultData);
  const [submitState, setSubmitState] = useState<SubmitState>('idle');

  const onChange = useCallback(
    <T extends HTMLInputElement | HTMLTextAreaElement>(event: React.ChangeEvent<T>): void => {
      const {name, value} = event.target;

      setData(prevData => ({...prevData, [name]: value}));
    },
    [],
  );

  const handleSendMessage = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setSubmitState('sending');

      try {
        const response = await axios.post(CONTACT_API_URL, data);

        if (response.status === 200) {
          setData(defaultData);
          setSubmitState('success');
        } else {
          setSubmitState('error');
        }
      } catch {
        setSubmitState('error');
      }
    },
    [data, defaultData],
  );

  const inputClasses =
    'bg-neutral-900 border border-neutral-800 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/30 rounded-lg placeholder:text-neutral-500 placeholder:text-sm text-neutral-200 text-sm transition-colors';

  const isSending = submitState === 'sending';

  return (
    <form className="grid min-h-[320px] grid-cols-1 gap-y-4" method="POST" onSubmit={handleSendMessage}>
      <div className="flex flex-col gap-y-1">
        <label className="text-xs font-medium uppercase tracking-wide text-neutral-400" htmlFor="contact-name">
          Name
        </label>
        <input
          className={inputClasses}
          id="contact-name"
          name="name"
          onChange={onChange}
          placeholder="Your name"
          required
          type="text"
          value={data.name}
        />
      </div>
      <div className="flex flex-col gap-y-1">
        <label className="text-xs font-medium uppercase tracking-wide text-neutral-400" htmlFor="contact-email">
          Email
        </label>
        <input
          autoComplete="email"
          className={inputClasses}
          id="contact-email"
          name="email"
          onChange={onChange}
          placeholder="you@example.com"
          required
          type="email"
          value={data.email}
        />
      </div>
      <div className="flex flex-col gap-y-1">
        <label className="text-xs font-medium uppercase tracking-wide text-neutral-400" htmlFor="contact-message">
          Message
        </label>
        <textarea
          className={inputClasses}
          id="contact-message"
          maxLength={MAX_MESSAGE_LENGTH}
          name="message"
          onChange={onChange}
          placeholder="What can I help you with?"
          required
          rows={6}
          value={data.message}
        />
        <span aria-hidden="true" className="self-end text-xs text-neutral-500">
          {data.message.length}/{MAX_MESSAGE_LENGTH}
        </span>
      </div>
      <button
        className="w-max rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-neutral-950 shadow-md outline-none transition-all duration-300 hover:bg-orange-400 hover:shadow-[0_0_24px_rgba(251,146,60,0.35)] focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 focus:ring-offset-neutral-950 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSending}
        type="submit">
        {isSending ? 'Sending…' : 'Send Message'}
      </button>
      <div aria-live="polite" className="min-h-[1.25rem]">
        {submitState === 'success' && <p className="text-sm font-medium text-green-400">Message sent — thank you!</p>}
        {submitState === 'error' && (
          <p className="text-sm font-medium text-red-400">Error sending message. Please try again later.</p>
        )}
      </div>
    </form>
  );
});

ContactForm.displayName = 'ContactForm';
export default ContactForm;
