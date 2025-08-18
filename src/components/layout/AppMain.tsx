import { ReactNode } from "react";

interface AppMainProps {
  children: ReactNode;
}

const AppMain = ({ children }: AppMainProps) => {
  return (
    <div className="flex flex-1 overflow-hidden">
      {children}
    </div>
  );
};

export default AppMain;