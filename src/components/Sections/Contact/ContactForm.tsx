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
  process.env.NEXT_PUBLIC_CONTACT_API_URL ??
  'https://vs7dthj3vb.execute-api.us-west-1.amazonaws.com/api/contact';

// Client-side guard only — the Lambda performs authoritative validation.
const MAX_MESSAGE_LENGTH = 250;

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
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  const onChange = useCallback(
    <T extends HTMLInputElement | HTMLTextAreaElement>(event: React.ChangeEvent<T>): void => {
      const {name, value} = event.target;

      setData(prevData => ({...prevData, [name]: value}));
    },
    [],
  );

  const handleSendMessage = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      setIsSuccess(false);
      setIsError(false);

      event.preventDefault();

      try {
        const response = await axios.post(CONTACT_API_URL, data);

        if (response.status === 200) {
          setData(defaultData);
          setIsSuccess(true);
        }
      } catch {
        setIsError(true);
      }
    },
    [data, defaultData],
  );

  const inputClasses =
    'bg-neutral-700 border-0 focus:border-0 focus:outline-none focus:ring-1 focus:ring-orange-600 rounded-md placeholder:text-neutral-400 placeholder:text-sm text-neutral-200 text-sm';

  return (
    <form className="grid min-h-[320px] grid-cols-1 gap-y-4" method="POST" onSubmit={handleSendMessage}>
      <input
        className={inputClasses}
        name="name"
        onChange={onChange}
        placeholder="Name"
        required
        type="text"
        value={data.name}
      />
      <input
        autoComplete="email"
        className={inputClasses}
        name="email"
        onChange={onChange}
        placeholder="Email"
        required
        type="email"
        value={data.email}
      />
      <textarea
        className={inputClasses}
        maxLength={MAX_MESSAGE_LENGTH}
        name="message"
        onChange={onChange}
        placeholder="Message"
        required
        rows={6}
        value={data.message}
      />
      <button
        aria-label="Submit contact form"
        className="w-max rounded-full border-2 border-orange-600 bg-stone-900 px-4 py-2 text-sm font-medium text-white shadow-md outline-none hover:bg-stone-800 focus:ring-2 focus:ring-orange-600 focus:ring-offset-2 focus:ring-offset-stone-800"
        type="submit">
        Send Message
      </button>
      {isSuccess && <p className="text-green-500 text-sm font-medium">Success!</p>}
      {isError && <p className="text-red-500 text-sm font-medium">Error sending message. Please try again later.</p>}
    </form>
  );
});

ContactForm.displayName = 'ContactForm';
export default ContactForm;
