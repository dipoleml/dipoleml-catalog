"use client";

import type { ReactNode } from "react";
import { createContext, Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";

import { useWelcomeModal } from "./welcome-modal";

export const ModalContext = createContext<{}>({});

export function ModalProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense>
      <ModalProviderClient>{children}</ModalProviderClient>
    </Suspense>
  );
}

function ModalProviderClient({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const { setShowWelcomeModal, WelcomeModal } = useWelcomeModal();

  useEffect(() => {
    setShowWelcomeModal(
      searchParams.has("onboarded") || searchParams.has("upgraded"),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <ModalContext.Provider value={{}}>
      <WelcomeModal />
      {children}
    </ModalContext.Provider>
  );
}
