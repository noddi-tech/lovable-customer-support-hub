import { useMemo } from 'react';

export interface TemplateVariable {
  key: string;
  label: string;
  description: string;
  value: string | undefined;
}

interface UseTemplateVariablesProps {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  bookingId?: string;
  serviceCategory?: string;
  vehicleInfo?: string;
  agentName?: string;
}

export function useTemplateVariables(props: UseTemplateVariablesProps) {
  const variables: TemplateVariable[] = useMemo(() => [
    {
      key: '{{first_name}}',
      label: 'First Name',
      description: 'Customer first name',
      value: props.customerName?.split(' ')[0]
    },
    {
      key: '{{full_name}}',
      label: 'Full Name',
      description: 'Customer full name',
      value: props.customerName
    },
    {
      key: '{{email}}',
      label: 'Email',
      description: 'Customer email address',
      value: props.customerEmail
    },
    {
      key: '{{phone}}',
      label: 'Phone',
      description: 'Customer phone number',
      value: props.customerPhone
    },
    {
      key: '{{booking_id}}',
      label: 'Booking ID',
      description: 'Current booking reference',
      value: props.bookingId
    },
    {
      key: '{{service_category}}',
      label: 'Service Category',
      description: 'Type of service',
      value: props.serviceCategory
    },
    {
      key: '{{vehicle}}',
      label: 'Vehicle',
      description: 'Vehicle information',
      value: props.vehicleInfo
    },
    {
      key: '{{agent_name}}',
      label: 'Agent Name',
      description: 'Your name',
      value: props.agentName
    }
  ], [props]);

  const replaceVariables = (template: string): string => {
    let result = template;
    variables.forEach(variable => {
      if (variable.value) {
        result = result.replace(new RegExp(variable.key, 'g'), variable.value);
      }
    });
    return result;
  };

  return {
    variables,
    replaceVariables
  };
}
