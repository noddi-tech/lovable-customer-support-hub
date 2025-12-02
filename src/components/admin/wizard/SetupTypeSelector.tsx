import { Mail, Inbox, Link, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type SetupType = 'gmail' | 'team-email' | 'google-group';

interface SetupTypeSelectorProps {
  selectedType: SetupType | null;
  onSelectType: (type: SetupType) => void;
}

const setupOptions = [
  {
    type: 'gmail' as SetupType,
    icon: Mail,
    title: 'Gmail Account',
    description: 'Connect via Google OAuth to automatically sync emails'
  },
  {
    type: 'google-group' as SetupType,
    icon: Link,
    title: 'Google Group',
    description: 'Forward emails from a Google Workspace group'
  },
  {
    type: 'team-email' as SetupType,
    icon: Users,
    title: 'Email Forwarding',
    description: 'Set up email forwarding from any email address'
  }
];

export function SetupTypeSelector({ selectedType, onSelectType }: SetupTypeSelectorProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">🎯 Choose your integration type</h3>
        <p className="text-sm text-muted-foreground">
          Select how you want to connect email to this system
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {setupOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedType === option.type;
          
          return (
            <Card
              key={option.type}
              className={`cursor-pointer transition-all hover:shadow-glow ${
                isSelected 
                  ? 'border-primary bg-primary/5 shadow-glow' 
                  : 'border-border/50 hover:border-primary/50'
              }`}
              onClick={() => onSelectType(option.type)}
            >
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base">{option.title}</CardTitle>
                    <CardDescription className="mt-1 text-xs">
                      {option.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
