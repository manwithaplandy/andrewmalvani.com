declare module '*.jpg' {
  const value: import('next/image').StaticImageData;
  export default value;
}

declare module '*.webp' {
  const value: import('next/image').StaticImageData;
  export default value;
}

declare module '*.svg' {
  const value: string;
  export default value;
}

declare module '*.png' {
  const value: import('next/image').StaticImageData;
  export default value;
}

declare module '*.webm' {
  const value: string;
  export default value;
}

declare module '*.mp4' {
  const value: string;
  export default value;
}
