import { Search, Bell, User, MessageSquare, Mail, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const AppHeader = () => {
  const { signOut } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  
  const tabs = [
    { id: 'interactions', label: t('interactions'), icon: MessageSquare, path: '/interactions' },
    { id: 'marketing', label: t('marketing'), icon: Mail, path: '/marketing' },
    { id: 'ops', label: t('ops'), icon: Wrench, path: '/ops' },
  ];
  
  const currentTab = location.pathname.startsWith('/marketing') ? 'marketing' 
    : location.pathname.startsWith('/ops') ? 'ops' 
    : 'interactions';

  return (
    <header className="h-16 border-b border-border bg-background flex items-center justify-between px-4 sticky top-0 z-50">
      <div className="flex items-center gap-6">
        {/* Navigation Tabs */}
        <div className="flex items-center">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <Button
                key={tab.id}
                variant="ghost"
                className={cn(
                  "flex items-center gap-2 px-4 py-2 h-10",
                  isActive 
                    ? "bg-primary/10 text-primary border-b-2 border-primary rounded-b-none" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
                onClick={() => navigate(tab.path)}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Button>
            );
          })}
        </div>

        {/* Search - only show in interactions */}
        {currentTab === 'interactions' && (
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search conversations, customers..." 
              className="pl-10 bg-muted/30"
            />
          </div>
        )}
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