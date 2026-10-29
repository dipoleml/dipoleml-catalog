// This is a wrapper component that is used to wrap async data and render a loading state, empty state, or error state.
import type { ReactNode } from "react";

import { Spinner } from "./spinner";

export function DataWrapper<T>({
  data,
  isLoading,
  error,
  loadingState,
  emptyState,
  errorState,
  children,
}: {
  data: T | undefined | null;
  isLoading?: boolean;
  error?: { message: string } | any;
  loadingState?: ReactNode;
  emptyState?: ReactNode;
  errorState?: ReactNode;
  children: (data: T) => ReactNode;
}) {
  if (error)
    return errorState || <div>{error.message || "An error occurred"}</div>;

  if (isLoading || !data) return loadingState || <Spinner />;

  if (Array.isArray(data) && data.length === 0 && emptyState) return emptyState;

  return children(data);
}
