import axios from 'axios';
import classNames from 'classnames';
import {FC, memo, useCallback, useEffect, useMemo, useRef, useState} from 'react';

interface FormData {
  name: string;
  email: string;
  message: string;
}

type FieldName = keyof FormData;
type FieldErrors = Partial<Record<FieldName, string>>;
type FieldElement = HTMLInputElement | HTMLTextAreaElement;

// Public contact API endpoint. Overridable via env for cleanliness; falls back
// to the deployed endpoint so static builds work without extra config.
const CONTACT_API_URL =
  process.env.NEXT_PUBLIC_CONTACT_API_URL ?? 'https://vs7dthj3vb.execute-api.us-west-1.amazonaws.com/api/contact';

// Client-side guard only — the Lambda performs authoritative validation
// (MAX_MESSAGE_LEN = 2000 in sns_publish_lambda/lambda_function.py). We match
// that here and warn near the cap instead of silently truncating.
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;
const MAX_MESSAGE_LENGTH = 2000;
// Warn once the message gets within this many characters of the cap.
const COUNTER_WARN_THRESHOLD = 200;
const REQUEST_TIMEOUT_MS = 15_000;

const FIELD_ORDER: FieldName[] = ['name', 'email', 'message'];
const FIELD_IDS: Record<FieldName, string> = {
  name: 'contact-name',
  email: 'contact-email',
  message: 'contact-message',
};
const FIELD_LABELS: Record<FieldName, string> = {
  name: 'Name',
  email: 'Email',
  message: 'Message',
};

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
  const [submissionErrors, setSubmissionErrors] = useState<FieldErrors>({});
  const [validationAttempt, setValidationAttempt] = useState(0);
  const fieldRefs = useRef<Partial<Record<FieldName, FieldElement>>>({});
  const currentAttempt = useRef<AbortController | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      currentAttempt.current?.abort();
      currentAttempt.current = null;
    };
  }, []);

  const onChange = useCallback(
    <T extends HTMLInputElement | HTMLTextAreaElement>(event: React.ChangeEvent<T>): void => {
      const {name, value} = event.target;
      const field = name as FieldName;
      const nextError = validateField(field, value);

      setData(prevData => ({...prevData, [field]: value}));
      // Keep an invalid field's error in place while it is being edited, and
      // remove only the issue the user has actually corrected.
      const updateExistingError = (errors: FieldErrors): FieldErrors => {
        if (!errors[field] || errors[field] === nextError) {
          return errors;
        }
        const nextErrors = {...errors};
        if (nextError) {
          nextErrors[field] = nextError;
        } else {
          delete nextErrors[field];
        }
        return nextErrors;
      };
      setFieldErrors(updateExistingError);
      setSubmissionErrors(updateExistingError);
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

      // State updates do not render synchronously, so own the request with a
      // ref before doing any work. This also blocks repeated submit events in
      // the same browser task.
      if (currentAttempt.current) {
        return;
      }

      // Run full client-side validation; surface every issue inline at once.
      const nextErrors: FieldErrors = {
        name: validateField('name', data.name),
        email: validateField('email', data.email),
        message: validateField('message', data.message),
      };
      setFieldErrors(nextErrors);
      if (nextErrors.name || nextErrors.email || nextErrors.message) {
        setSubmissionErrors(nextErrors);
        setValidationAttempt(attempt => attempt + 1);
        setSubmitState('idle');

        const firstInvalidField = FIELD_ORDER.find(field => nextErrors[field]);
        if (firstInvalidField) {
          fieldRefs.current[firstInvalidField]?.focus();
        }
        return;
      }

      setSubmissionErrors({});
      setSubmitState('sending');
      const snapshot: FormData = {
        name: data.name.trim(),
        email: data.email.trim(),
        message: data.message.trim(),
      };
      const controller = new AbortController();
      currentAttempt.current = controller;

      try {
        await axios.post(CONTACT_API_URL, snapshot, {
          signal: controller.signal,
          timeout: REQUEST_TIMEOUT_MS,
        });
        if (!mounted.current || currentAttempt.current !== controller) {
          return;
        }
        // Preserve nothing on success — a clean form signals completion.
        setData(defaultData);
        setFieldErrors({});
        setSubmissionErrors({});
        setSubmitState('success');
      } catch (error) {
        if (!mounted.current || currentAttempt.current !== controller || controller.signal.aborted) {
          return;
        }
        // axios rejects on non-2xx as well as transport failures. If a response
        // came back, the server was reachable and something failed on its end;
        // otherwise delivery is uncertain (offline / CORS / DNS / timeout).
        // Either way the exact entered draft is preserved so the user can retry.
        const reachedServer = axios.isAxiosError(error) && Boolean(error.response);
        setErrorKind(reachedServer ? 'server' : 'network');
        setSubmitState('error');
      } finally {
        if (currentAttempt.current === controller) {
          currentAttempt.current = null;
        }
      }
    },
    [data, defaultData],
  );

  const inputClasses =
    'bg-neutral-900 border border-neutral-800 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/30 rounded-lg placeholder:text-neutral-400 placeholder:text-sm text-neutral-200 text-sm transition-colors';

  const isSending = submitState === 'sending';

  const messageLength = data.message.length;
  const remaining = MAX_MESSAGE_LENGTH - messageLength;
  const counterWarning = remaining <= COUNTER_WARN_THRESHOLD;
  const counterAnnouncement =
    remaining === 0
      ? 'Message character limit reached.'
      : counterWarning
        ? 'Message is near the 2,000 character limit.'
        : '';
  const submittedErrorFields = FIELD_ORDER.filter(field => submissionErrors[field]);
  const submittedErrorCount = submittedErrorFields.length;

  const focusField = useCallback((event: React.MouseEvent<HTMLAnchorElement>, field: FieldName) => {
    event.preventDefault();
    fieldRefs.current[field]?.focus();
  }, []);

  return (
    <form
      className="grid min-h-[320px] grid-cols-1 gap-y-4"
      method="POST"
      noValidate
      onSubmit={handleSendMessage}>
      <div aria-live="polite" className="min-h-[1.25rem]">
        {submitState === 'sending' && (
          <p className="text-sm font-medium text-neutral-300" role="status">
            Sending your message. Fields are temporarily read-only.
          </p>
        )}
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
              <>
                Delivery could not be confirmed. Your message may have been sent. The text is preserved below; you can
                retry or{' '}
                <a className="underline hover:text-red-300" href={`mailto:${CONTACT_EMAIL}`}>
                  email me directly
                </a>
                .
              </>
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
      {submittedErrorCount > 0 && (
        <div
          aria-atomic="true"
          aria-labelledby="contact-error-summary-title"
          className="rounded-lg border border-red-400/60 bg-red-950/30 p-4 text-sm text-red-300"
          key={validationAttempt}
          role="alert">
          <p className="font-semibold" id="contact-error-summary-title">
            There {submittedErrorCount === 1 ? 'is' : 'are'} {submittedErrorCount}{' '}
            {submittedErrorCount === 1 ? 'error' : 'errors'} to fix.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {submittedErrorFields.map(field => (
              <li key={field}>
                <a
                  className="rounded underline decoration-red-300/70 underline-offset-2 hover:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                  href={`#${FIELD_IDS[field]}`}
                  onClick={event => focusField(event, field)}>
                  <span className="font-semibold">{FIELD_LABELS[field]}:</span> {submissionErrors[field]}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-col gap-y-1">
        <label className="text-xs font-medium uppercase tracking-wide text-neutral-400" htmlFor="contact-name">
          Name
        </label>
        <input
          aria-describedby={fieldErrors.name ? 'contact-name-error' : undefined}
          aria-invalid={fieldErrors.name ? true : undefined}
          className={inputClasses}
          id="contact-name"
          maxLength={MAX_NAME_LENGTH}
          name="name"
          onBlur={onBlur}
          onChange={onChange}
          placeholder="Your name"
          readOnly={isSending}
          ref={element => {
            fieldRefs.current.name = element ?? undefined;
          }}
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
          maxLength={MAX_EMAIL_LENGTH}
          name="email"
          onBlur={onBlur}
          onChange={onChange}
          placeholder="you@example.com"
          readOnly={isSending}
          ref={element => {
            fieldRefs.current.email = element ?? undefined;
          }}
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
          readOnly={isSending}
          ref={element => {
            fieldRefs.current.message = element ?? undefined;
          }}
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
            className={classNames('text-xs', counterWarning ? 'text-orange-300' : 'text-neutral-400')}
            id="contact-message-counter">
            {counterWarning
              ? `${remaining} character${remaining === 1 ? '' : 's'} left`
              : `${messageLength}/${MAX_MESSAGE_LENGTH}`}
          </span>
          <span aria-atomic="true" aria-live="polite" className="sr-only" role="status">
            {counterAnnouncement}
          </span>
        </div>
      </div>
      <button
        className="w-max rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-neutral-950 shadow-md outline-none transition-all duration-300 hover:bg-orange-400 hover:shadow-[0_0_24px_rgba(251,146,60,0.35)] focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 focus:ring-offset-neutral-950 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSending}
        type="submit">
        {isSending ? 'Sending…' : 'Send Message'}
      </button>
    </form>
  );
});

ContactForm.displayName = 'ContactForm';
export default ContactForm;
