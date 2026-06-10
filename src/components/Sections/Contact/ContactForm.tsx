import axios from 'axios';
import classNames from 'classnames';
import {FC, memo, useCallback, useMemo, useState} from 'react';

interface FormData {
  name: string;
  email: string;
  message: string;
}

type FieldName = keyof FormData;
type FieldErrors = Partial<Record<FieldName, string>>;

// Public contact API endpoint. Overridable via env for cleanliness; falls back
// to the deployed endpoint so static builds work without extra config.
const CONTACT_API_URL =
  process.env.NEXT_PUBLIC_CONTACT_API_URL ?? 'https://vs7dthj3vb.execute-api.us-west-1.amazonaws.com/api/contact';

// Client-side guard only — the Lambda performs authoritative validation
// (MAX_MESSAGE_LEN = 2000 in sns_publish_lambda/lambda_function.py). We match
// that here and warn near the cap instead of silently truncating.
const MAX_MESSAGE_LENGTH = 2000;
// Warn once the message gets within this many characters of the cap.
const COUNTER_WARN_THRESHOLD = 200;

const CONTACT_EMAIL = 'andrewrmalvani@gmail.com';

// Mirror the Lambda's pragmatic email shape check so client and server agree.
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

type SubmitState = 'idle' | 'sending' | 'success' | 'error';
// Distinguish failure modes so we can offer an actionable message: a network
// failure is retryable; a server failure means the user should email directly.
type ErrorKind = 'network' | 'server';

const validateField = (name: FieldName, value: string): string | undefined => {
  const trimmed = value.trim();
  switch (name) {
    case 'name':
      return trimmed ? undefined : 'Please enter your name.';
    case 'email':
      if (!trimmed) {
        return 'Please enter your email address.';
      }
      return EMAIL_RE.test(trimmed) ? undefined : 'Please enter a valid email address.';
    case 'message':
      return trimmed ? undefined : 'Please enter a message.';
    default:
      return undefined;
  }
};

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
  const [errorKind, setErrorKind] = useState<ErrorKind>('server');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const onChange = useCallback(
    <T extends HTMLInputElement | HTMLTextAreaElement>(event: React.ChangeEvent<T>): void => {
      const {name, value} = event.target;
      const field = name as FieldName;

      setData(prevData => ({...prevData, [field]: value}));
      // Clear a field's error as soon as the user starts correcting it.
      setFieldErrors(prev => (prev[field] ? {...prev, [field]: undefined} : prev));
      // Don't let a stale success/error banner linger while the user types again.
      setSubmitState(prev => (prev === 'success' || prev === 'error' ? 'idle' : prev));
    },
    [],
  );

  const onBlur = useCallback(
    <T extends HTMLInputElement | HTMLTextAreaElement>(event: React.FocusEvent<T>): void => {
      const field = event.target.name as FieldName;
      const error = validateField(field, data[field]);
      setFieldErrors(prev => ({...prev, [field]: error}));
    },
    [data],
  );

  const handleSendMessage = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      // Run full client-side validation; surface every issue inline at once.
      const nextErrors: FieldErrors = {
        name: validateField('name', data.name),
        email: validateField('email', data.email),
        message: validateField('message', data.message),
      };
      setFieldErrors(nextErrors);
      if (nextErrors.name || nextErrors.email || nextErrors.message) {
        return;
      }

      setSubmitState('sending');

      try {
        await axios.post(CONTACT_API_URL, data);
        // Preserve nothing on success — a clean form signals completion.
        setData(defaultData);
        setFieldErrors({});
        setSubmitState('success');
      } catch (error) {
        // axios rejects on non-2xx as well as transport failures. If a response
        // came back, the server was reachable and something failed on its end;
        // otherwise we never reached the server (offline / CORS / DNS / timeout).
        // Either way the entered data is preserved so the user can retry.
        const reachedServer = axios.isAxiosError(error) && Boolean(error.response);
        setErrorKind(reachedServer ? 'server' : 'network');
        setSubmitState('error');
      }
    },
    [data, defaultData],
  );

  const inputClasses =
    'bg-neutral-900 border border-neutral-800 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/30 rounded-lg placeholder:text-neutral-500 placeholder:text-sm text-neutral-200 text-sm transition-colors';

  const isSending = submitState === 'sending';

  const messageLength = data.message.length;
  const remaining = MAX_MESSAGE_LENGTH - messageLength;
  const counterWarning = remaining <= COUNTER_WARN_THRESHOLD;

  return (
    <form className="grid min-h-[320px] grid-cols-1 gap-y-4" method="POST" noValidate onSubmit={handleSendMessage}>
      <div className="flex flex-col gap-y-1">
        <label className="text-xs font-medium uppercase tracking-wide text-neutral-400" htmlFor="contact-name">
          Name
        </label>
        <input
          aria-describedby={fieldErrors.name ? 'contact-name-error' : undefined}
          aria-invalid={fieldErrors.name ? true : undefined}
          className={inputClasses}
          id="contact-name"
          name="name"
          onBlur={onBlur}
          onChange={onChange}
          placeholder="Your name"
          required
          type="text"
          value={data.name}
        />
        {fieldErrors.name && (
          <span className="text-xs font-medium text-red-400" id="contact-name-error">
            {fieldErrors.name}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-y-1">
        <label className="text-xs font-medium uppercase tracking-wide text-neutral-400" htmlFor="contact-email">
          Email
        </label>
        <input
          aria-describedby={fieldErrors.email ? 'contact-email-error' : undefined}
          aria-invalid={fieldErrors.email ? true : undefined}
          autoComplete="email"
          className={inputClasses}
          id="contact-email"
          name="email"
          onBlur={onBlur}
          onChange={onChange}
          placeholder="you@example.com"
          required
          type="email"
          value={data.email}
        />
        {fieldErrors.email && (
          <span className="text-xs font-medium text-red-400" id="contact-email-error">
            {fieldErrors.email}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-y-1">
        <label className="text-xs font-medium uppercase tracking-wide text-neutral-400" htmlFor="contact-message">
          Message
        </label>
        <textarea
          aria-describedby={classNames('contact-message-counter', {'contact-message-error': fieldErrors.message})}
          aria-invalid={fieldErrors.message ? true : undefined}
          className={inputClasses}
          id="contact-message"
          maxLength={MAX_MESSAGE_LENGTH}
          name="message"
          onBlur={onBlur}
          onChange={onChange}
          placeholder="What can I help you with?"
          required
          rows={6}
          value={data.message}
        />
        <div className="flex items-center justify-between gap-x-2">
          {fieldErrors.message ? (
            <span className="text-xs font-medium text-red-400" id="contact-message-error">
              {fieldErrors.message}
            </span>
          ) : (
            <span aria-hidden="true" />
          )}
          <span
            aria-live="polite"
            className={classNames('text-xs', counterWarning ? 'text-orange-300' : 'text-neutral-500')}
            id="contact-message-counter">
            {counterWarning
              ? `${remaining} character${remaining === 1 ? '' : 's'} left`
              : `${messageLength}/${MAX_MESSAGE_LENGTH}`}
          </span>
        </div>
      </div>
      <button
        className="w-max rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-neutral-950 shadow-md outline-none transition-all duration-300 hover:bg-orange-400 hover:shadow-[0_0_24px_rgba(251,146,60,0.35)] focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 focus:ring-offset-neutral-950 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSending}
        type="submit">
        {isSending ? 'Sending…' : 'Send Message'}
      </button>
      <div aria-live="polite" className="min-h-[1.25rem]">
        {submitState === 'success' && (
          <p className="text-sm font-medium text-green-400">
            Message sent — thank you! I&apos;ll get back to you within a few days, or you can email me directly at{' '}
            <a className="underline hover:text-green-300" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        )}
        {submitState === 'error' && (
          <p className="text-sm font-medium text-red-400">
            {errorKind === 'network' ? (
              "Couldn't reach the server. Check your connection and try again."
            ) : (
              <>
                Something went wrong on my end. Please email me directly at{' '}
                <a className="underline hover:text-red-300" href={`mailto:${CONTACT_EMAIL}`}>
                  {CONTACT_EMAIL}
                </a>
                .
              </>
            )}
          </p>
        )}
      </div>
    </form>
  );
});

ContactForm.displayName = 'ContactForm';
export default ContactForm;
