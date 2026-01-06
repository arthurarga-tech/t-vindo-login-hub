import React, { useEffect } from "react";
import { QZTrayProvider, useQZTrayContext } from "../contexts/QZTrayContext";

const AutoConnect: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { connect } = useQZTrayContext();

  useEffect(() => {
    connect().catch(console.error);
  }, []);

  return <>{children}</>;
};

export const QZTrayProviderWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <QZTrayProvider>
    <AutoConnect>{children}</AutoConnect>
  </QZTrayProvider>
);
