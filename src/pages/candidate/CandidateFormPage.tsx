import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Step = 'identity' | 'form' | 'submitting' | 'success' | 'error';

interface CustomField {
  field_id: string;
  field_name: string;
  field_type: string;
  options: any;
  requirement_type: 'required' | 'optional';
  display_order: number;
  current_value: any;
}

interface BuiltinColumn {
  key: string;
  current_value: any;
}

interface FormSpec {
  applicant: { first_name: string | null; last_name: string | null };
  position: { title: string; intro_text: string | null } | null;
  custom_fields: CustomField[];
  builtin_columns: BuiltinColumn[];
  stage_id: string | null;
}

const BUILTIN_LABELS: Record<string, { label: string; type: string; placeholder?: string }> = {
  location: { label: 'Hvor bor du?', type: 'text', placeholder: 'F.eks. Oslo' },
  years_experience: { label: 'År med relevant erfaring', type: 'number', placeholder: '0' },
  own_vehicle: { label: 'Har du egen bil?', type: 'yesno' },
  availability_date: { label: 'Når kan du starte?', type: 'date' },
  language_norwegian: { label: 'Snakker du norsk?', type: 'yesno' },
  work_permit_status: { label: 'Arbeidstillatelse', type: 'select_permit' },
  drivers_license_classes: { label: 'Førerkortklasser', type: 'text', placeholder: 'F.eks. B, BE' },
  certifications: { label: 'Sertifiseringer / kurs', type: 'textarea' },
};

const ERROR_COPY: Record<string, string> = {
  invalid_or_expired: 'Lenken er ugyldig eller har utløpt. Kontakt arbeidsgiveren for en ny lenke.',
  already_submitted: 'Skjemaet er allerede sendt inn. Takk!',
  too_many_attempts: 'For mange forsøk. Kontakt arbeidsgiveren for hjelp.',
  identity_check_failed: 'Tallene stemmer ikke. Prøv igjen.',
  invalid_input: 'Ugyldig input. Sjekk at du skrev inn 4 sifre.',
  server_error: 'Noe gikk galt. Prøv igjen om litt.',
};

const CandidateFormPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [step, setStep] = useState<Step>('identity');
  const [last4, setLast4] = useState('');
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [identityLoading, setIdentityLoading] = useState(false);
  const [spec, setSpec] = useState<FormSpec | null>(null);
  const [values, setValues] = useState<Record<string, any>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);

  // Pre-fill values once we have the form spec
  useEffect(() => {
    if (!spec) return;
    const initial: Record<string, any> = {};
    for (const f of spec.custom_fields) {
      if (f.current_value !== null && f.current_value !== undefined) {
        initial[`cf:${f.field_id}`] = f.current_value;
      }
    }
    for (const b of spec.builtin_columns) {
      if (b.current_value !== null && b.current_value !== undefined) {
        initial[`bi:${b.key}`] = b.current_value;
      }
    }
    setValues(initial);
  }, [spec]);

  const handleIdentitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setIdentityError(null);
    setIdentityLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-candidate-form-fields', {
        body: { token, phone_last_4: last4 },
      });
      if (error) {
        setIdentityError(ERROR_COPY.server_error);
        return;
      }
      const d = data as any;
      if (!d?.valid) {
        const reason = d?.reason ?? 'invalid_or_expired';
        setIdentityError(ERROR_COPY[reason] ?? ERROR_COPY.server_error);
        if (typeof d?.attempts_remaining === 'number') {
          setAttemptsRemaining(d.attempts_remaining);
        }
        if (['invalid_or_expired', 'already_submitted', 'too_many_attempts'].includes(reason)) {
          setFatalError(ERROR_COPY[reason]);
          setStep('error');
        }
        return;
      }
      setSpec(d as FormSpec);
      setStep('form');
    } catch {
      setIdentityError(ERROR_COPY.server_error);
    } finally {
      setIdentityLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !spec) return;
    setSubmitError(null);

    // Required validation (custom fields only — built-ins are optional)
    const missing = spec.custom_fields.filter(
      (f) => f.requirement_type === 'required' && isEmpty(values[`cf:${f.field_id}`]),
    );
    if (missing.length > 0) {
      setSubmitError(`Mangler svar på: ${missing.map((m) => m.field_name).join(', ')}`);
      return;
    }

    setStep('submitting');

    const custom_field_values: Record<string, any> = {};
    for (const f of spec.custom_fields) {
      const v = values[`cf:${f.field_id}`];
      if (!isEmpty(v)) custom_field_values[f.field_id] = v;
    }
    const builtin_columns: Record<string, any> = {};
    for (const b of spec.builtin_columns) {
      const v = values[`bi:${b.key}`];
      if (!isEmpty(v)) builtin_columns[b.key] = v;
    }

    const { data, error } = await supabase.functions.invoke('submit-candidate-form', {
      body: {
        token,
        phone_last_4: last4,
        custom_field_values,
        builtin_columns,
      },
    });
    if (error) {
      setSubmitError(ERROR_COPY.server_error);
      setStep('form');
      return;
    }
    const d = data as any;
    if (!d?.ok) {
      const reason = d?.reason ?? 'server_error';
      setSubmitError(ERROR_COPY[reason] ?? ERROR_COPY.server_error);
      setStep('form');
      return;
    }
    setStep('success');
  };

  if (!token) {
    return <Centered><ErrorState message="Ugyldig lenke." /></Centered>;
  }

  if (step === 'error' && fatalError) {
    return <Centered><ErrorState message={fatalError} /></Centered>;
  }

  if (step === 'success') {
    return (
      <Centered>
        <div className="text-center space-y-4 max-w-md">
          <CheckCircle2 className="mx-auto h-16 w-16 text-primary" />
          <h1 className="text-2xl font-semibold">Takk!</h1>
          <p className="text-muted-foreground">
            Vi har mottatt svarene dine. Arbeidsgiveren tar kontakt med deg snart.
          </p>
        </div>
      </Centered>
    );
  }

  if (step === 'identity') {
    return (
      <Centered>
        <form
          onSubmit={handleIdentitySubmit}
          className="w-full max-w-md space-y-6 bg-card border border-border rounded-lg p-6 shadow-sm"
        >
          <div className="space-y-2 text-center">
            <h1 className="text-xl font-semibold">Bekreft identitet</h1>
            <p className="text-sm text-muted-foreground">
              Skriv inn de siste 4 sifrene i telefonnummeret ditt for å fortsette.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="last4">Siste 4 sifre av telefonnummer</Label>
            <Input
              id="last4"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={last4}
              onChange={(e) => setLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="1234"
              autoFocus
              className="text-center text-2xl tracking-[0.5em]"
            />
          </div>
          {identityError && (
            <div className="flex items-start gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                {identityError}
                {attemptsRemaining !== null && attemptsRemaining > 0 && (
                  <> ({attemptsRemaining} forsøk igjen)</>
                )}
              </span>
            </div>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={last4.length !== 4 || identityLoading}
          >
            {identityLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Fortsett'}
          </Button>
        </form>
      </Centered>
    );
  }

  if ((step === 'form' || step === 'submitting') && spec) {
    const isSubmitting = step === 'submitting';
    const fullName = [spec.applicant.first_name, spec.applicant.last_name].filter(Boolean).join(' ');
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-xl mx-auto p-4 sm:p-6 pb-24">
          <header className="space-y-2 mb-6">
            <h1 className="text-xl sm:text-2xl font-semibold">
              {spec.position?.title ?? 'Søknadsskjema'}
            </h1>
            {fullName && (
              <p className="text-sm text-muted-foreground">Hei {fullName}!</p>
            )}
            {spec.position?.intro_text && (
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {spec.position.intro_text}
              </p>
            )}
          </header>

          <form onSubmit={handleSubmit} className="space-y-6">
            {spec.custom_fields.length > 0 && (
              <section className="space-y-4">
                {spec.custom_fields.map((f) => (
                  <FieldRow
                    key={f.field_id}
                    id={`cf:${f.field_id}`}
                    label={f.field_name}
                    required={f.requirement_type === 'required'}
                    type={f.field_type}
                    options={f.options}
                    value={values[`cf:${f.field_id}`]}
                    onChange={(v) => setValues((p) => ({ ...p, [`cf:${f.field_id}`]: v }))}
                  />
                ))}
              </section>
            )}

            {spec.builtin_columns.length > 0 && (
              <section className="space-y-4">
                <div className="text-sm font-medium text-muted-foreground">
                  Tilleggsinformasjon (valgfritt)
                </div>
                {spec.builtin_columns.map((b) => {
                  const meta = BUILTIN_LABELS[b.key];
                  if (!meta) return null;
                  return (
                    <FieldRow
                      key={b.key}
                      id={`bi:${b.key}`}
                      label={meta.label}
                      required={false}
                      type={meta.type}
                      options={null}
                      placeholder={meta.placeholder}
                      value={values[`bi:${b.key}`]}
                      onChange={(v) => setValues((p) => ({ ...p, [`bi:${b.key}`]: v }))}
                    />
                  );
                })}
              </section>
            )}

            {submitError && (
              <div className="flex items-start gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <Button type="submit" className="w-full h-12 text-base" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send inn'}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return <Centered><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></Centered>;
};

function isEmpty(v: any) {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

const Centered: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen flex items-center justify-center bg-background p-4">
    {children}
  </div>
);

const ErrorState: React.FC<{ message: string }> = ({ message }) => (
  <div className="text-center space-y-4 max-w-md">
    <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
    <p className="text-foreground">{message}</p>
  </div>
);

interface FieldRowProps {
  id: string;
  label: string;
  required: boolean;
  type: string;
  options: any;
  placeholder?: string;
  value: any;
  onChange: (v: any) => void;
}

const FieldRow: React.FC<FieldRowProps> = ({
  id,
  label,
  required,
  type,
  options,
  placeholder,
  value,
  onChange,
}) => {
  const renderControl = () => {
    switch (type) {
      case 'textarea':
        return (
          <Textarea
            id={id}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="min-h-[96px] text-base"
          />
        );
      case 'number':
        return (
          <Input
            id={id}
            type="number"
            inputMode="numeric"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="text-base"
          />
        );
      case 'date':
        return (
          <Input
            id={id}
            type="date"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className="text-base"
          />
        );
      case 'yesno':
      case 'boolean':
        return (
          <Select
            value={value === true ? 'yes' : value === false ? 'no' : ''}
            onValueChange={(v) => onChange(v === 'yes')}
          >
            <SelectTrigger id={id} className="text-base h-11">
              <SelectValue placeholder="Velg..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="yes">Ja</SelectItem>
              <SelectItem value="no">Nei</SelectItem>
            </SelectContent>
          </Select>
        );
      case 'select_permit':
        return (
          <Select value={value ?? ''} onValueChange={onChange}>
            <SelectTrigger id={id} className="text-base h-11">
              <SelectValue placeholder="Velg..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="citizen">Norsk statsborger</SelectItem>
              <SelectItem value="eu_eea">EU/EØS-borger</SelectItem>
              <SelectItem value="permit">Har arbeidstillatelse</SelectItem>
              <SelectItem value="none">Ingen arbeidstillatelse</SelectItem>
            </SelectContent>
          </Select>
        );
      case 'select':
      case 'dropdown': {
        const opts: string[] = Array.isArray(options)
          ? options
          : Array.isArray(options?.choices)
          ? options.choices
          : [];
        return (
          <Select value={value ?? ''} onValueChange={onChange}>
            <SelectTrigger id={id} className="text-base h-11">
              <SelectValue placeholder="Velg..." />
            </SelectTrigger>
            <SelectContent>
              {opts.map((o) => (
                <SelectItem key={o} value={o}>{o}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
      default:
        return (
          <Input
            id={id}
            type="text"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="text-base"
          />
        );
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {renderControl()}
    </div>
  );
};

export default CandidateFormPage;
