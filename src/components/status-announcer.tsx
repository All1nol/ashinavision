"use client";

type StatusAnnouncerProps = {
  message: string;
};

export const StatusAnnouncer = ({ message }: StatusAnnouncerProps) => {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
};
