import { Mail, Inbox, Link, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type SetupType = 'gmail' | 'team-email' | 'just-inbox' | 'google-group';

interface SetupTypeSelectorProps {
  selectedType: SetupType | null;
  onSelectType: (type: SetupType) => void;
}

const setupOptions = [
  {
    type: 'gmail' as SetupType,
    icon: Mail,
    title: 'Gmail Account',
    description: 'Connect your Gmail (e.g., name@noddi.no) via Google sign-in'
  },
  {
    type: 'team-email' as SetupType,
    icon: Users,
    title: 'Team Email',
    description: 'Set up a shared email address (e.g., bedrift@noddi.no)'
  },
  {
    type: 'just-inbox' as SetupType,
    icon: Inbox,
    title: 'Just an Inbox',
    description: 'Create an inbox without email yet (link email later)'
  },
  {
    type: 'google-group' as SetupType,
    icon: Link,
    title: 'Google Group',
    description: 'Connect a Google Workspace group'
  }
];

export function SetupTypeSelector({ selectedType, onSelectType }: SetupTypeSelectorProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">🎯 What would you like to set up?</h3>
        <p className="text-sm text-muted-foreground">
          Choose the type of inbox configuration that best fits your needs
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
