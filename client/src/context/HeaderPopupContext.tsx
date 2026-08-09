import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

interface HeaderPopupContextValue {
  open: boolean;
  title?: string;
  content?: React.ReactNode;
  hasContent: boolean;
  registerPopup: (content: React.ReactNode, title?: string) => void;
  openPopup: () => void;
  closePopup: () => void;
}

const HeaderPopupContext = createContext<HeaderPopupContextValue | null>(null);

export function HeaderPopupProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState<React.ReactNode | undefined>(
    undefined,
  );
  const [title, setTitle] = useState<string | undefined>(undefined);

  const registerPopup = useCallback((c: React.ReactNode, t?: string) => {
    setContent(c);
    setTitle(t);
  }, []);

  const openPopup = useCallback(() => {
    setOpen(true);
  }, []);

  const closePopup = useCallback(() => {
    setOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      open,
      title,
      content,
      hasContent: Boolean(content),
      registerPopup,
      openPopup,
      closePopup,
    }),
    [open, title, content, registerPopup, openPopup, closePopup],
  );

  return (
    <HeaderPopupContext.Provider value={value}>
      {children}
    </HeaderPopupContext.Provider>
  );
}

export function useHeaderPopup() {
  const ctx = useContext(HeaderPopupContext);
  if (!ctx) {
    throw new Error("useHeaderPopup must be used within a HeaderPopupProvider");
  }
  return ctx;
}

export default HeaderPopupContext;
