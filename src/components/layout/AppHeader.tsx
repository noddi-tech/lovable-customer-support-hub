import { Search, Bell, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";

const AppHeader = () => {
  const { signOut } = useAuth();

  return (
    <header className="h-16 border-b border-border bg-background flex items-center justify-between px-4 sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="h-8 w-8" />
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search conversations, customers..." 
            className="pl-10 bg-muted/30"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Bell className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => signOut()}>
          <User className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
};

export default AppHeader;