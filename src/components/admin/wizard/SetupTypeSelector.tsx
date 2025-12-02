import { Mail, Link, Users, CheckCircle2, Star } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDomainConfiguration } from "@/hooks/useDomainConfiguration";

export type SetupType = 'gmail' | 'team-email' | 'google-group';

interface SetupTypeSelectorProps {
  selectedType: SetupType | null;
  onSelectType: (type: SetupType) => void;
}

export function SetupTypeSelector({ selectedType, onSelectType }: SetupTypeSelectorProps) {
  const { getActiveDomain } = useDomainConfiguration();
  const hasActiveDomain = !!getActiveDomain();

  const setupOptions = [
    {
      type: 'gmail' as SetupType,
      icon: Mail,
      title: 'Gmail Account',
      description: 'Connect via Google OAuth to automatically sync emails',
      recommended: false,
      requirements: 'Requires Google account access'
    },
    {
      type: 'google-group' as SetupType,
      icon: Link,
      title: 'Google Group',
      description: 'Forward emails from a Google Workspace group',
      recommended: hasActiveDomain,
      requirements: hasActiveDomain 
        ? 'Domain configured - ready to use!'
        : 'Requires domain configuration'
    },
    {
      type: 'team-email' as SetupType,
      icon: Users,
      title: 'Email Forwarding',
      description: 'Set up email forwarding from any email address',
      recommended: false,
      requirements: hasActiveDomain 
        ? 'Domain configured - ready to use!'
        : 'Requires domain configuration'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Choose your integration type</h3>
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
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-base">{option.title}</CardTitle>
                      {option.recommended && (
                        <Badge variant="secondary" className="text-xs bg-success/10 text-success border-success/20">
                          <Star className="h-3 w-3 mr-1" />
                          Recommended
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="mt-1 text-xs">
                      {option.description}
                    </CardDescription>
                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      {(option.type === 'google-group' || option.type === 'team-email') && hasActiveDomain ? (
                        <CheckCircle2 className="h-3 w-3 text-success" />
                      ) : null}
                      <span>{option.requirements}</span>
                    </div>
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
