import { ReactNode } from "react";

type ContentCardProps = {
  children: ReactNode;
  className?: string;
};

export default function ContentCard({
  children,
  className = "",
}: ContentCardProps) {
  return (
    <div className={`rounded-xl border bg-white p-6 shadow-sm ${className}`}>
      {children}
    </div>
  );
}