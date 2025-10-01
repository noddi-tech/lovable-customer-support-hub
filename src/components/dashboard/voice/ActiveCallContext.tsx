/**
 * ActiveCallContext Component
 * 
 * Displays customer context and live note-taking during an active call
 * Persists throughout the call lifecycle without leaving the view
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, Building2, Calendar, Package, AlertCircle, Loader2, Save, X } from 'lucide-react';
import { useCallCustomerContext } from '@/hooks/useCallCustomerContext';
import { useNoddihKundeData } from '@/hooks/useNoddihKundeData';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ActiveCallContextProps {
  callId: string;
  customerPhone?: string;
  className?: string;
}

export const ActiveCallContext: React.FC<ActiveCallContextProps> = ({
  callId,
  customerPhone,
  className
}) => {
  const { toast } = useToast();
  const { customer, noddiData, isLoading: contextLoading, updateNoddiData } = useCallCustomerContext();
  const [noteContent, setNoteContent] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [showNoteEditor, setShowNoteEditor] = useState(false);

  // Fetch Noddi data if not already loaded
  const noddiQuery = useNoddihKundeData(customer);

  // Update context when Noddi data loads
  useEffect(() => {
    if (noddiQuery.data && !contextLoading) {
      updateNoddiData(noddiQuery.data);
    }
  }, [noddiQuery.data, contextLoading, updateNoddiData]);

  const handleSaveNote = async () => {
    if (!noteContent.trim() || !customer?.id) return;

    setIsSavingNote(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Get organization_id from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.user.id)
        .single();

      if (!profile?.organization_id) throw new Error('No organization found');

      const { error } = await supabase
        .from('call_notes')
        .insert([{
          call_id: callId,
          content: noteContent.trim(),
          is_private: false,
          created_by_id: user.user.id,
          organization_id: profile.organization_id
        }]);

      if (error) throw error;

      toast({
        title: 'Note saved',
        description: 'Call note has been saved successfully',
      });

      setNoteContent('');
      setShowNoteEditor(false);
    } catch (error: any) {
      console.error('Error saving note:', error);
      toast({
        title: 'Failed to save note',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSavingNote(false);
    }
  };

  if (!customer && !customerPhone) {
    return null;
  }

  const isLoading = contextLoading || noddiQuery.isLoading;
  const uiMeta = noddiData?.data?.ui_meta;
  const priorityBooking = noddiData?.data?.priority_booking;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Customer Info Card */}
      <Card className="border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <User className="h-4 w-4" />
            Customer Context
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading customer data...
            </div>
          ) : noddiData?.data?.found ? (
            <>
              {/* Customer Name & Group */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{uiMeta?.display_name || 'Unknown Customer'}</span>
                {uiMeta?.user_group_badge && (
                  <Badge variant="secondary" className="text-xs">
                    <Building2 className="h-3 w-3 mr-1" />
                    Group {uiMeta.user_group_badge}
                  </Badge>
                )}
              </div>

              {/* Priority Booking */}
              {priorityBooking && uiMeta?.status_label && (
                <Alert className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{uiMeta.status_label}</span>
                      {uiMeta.booking_date_iso && (
                        <Badge variant="outline" className="text-xs">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(uiMeta.booking_date_iso).toLocaleDateString()}
                        </Badge>
                      )}
                    </div>
                    {uiMeta.vehicle_label && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {uiMeta.vehicle_label}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* Unpaid Bookings Warning */}
              {uiMeta?.unpaid_count > 0 && (
                <Alert variant="destructive" className="py-2">
                  <Package className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    {uiMeta.unpaid_count} unpaid booking{uiMeta.unpaid_count > 1 ? 's' : ''}
                  </AlertDescription>
                </Alert>
              )}

              {/* Money Info */}
              {uiMeta?.money && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total:</span>
                    <span className="font-medium">
                      {uiMeta.money.currency} {uiMeta.money.gross}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Paid:</span>
                    <span className={cn(
                      "font-medium",
                      uiMeta.money.paid_state === 'paid' && "text-green-600",
                      uiMeta.money.paid_state === 'unpaid' && "text-red-600"
                    )}>
                      {uiMeta.money.currency} {uiMeta.money.paid}
                    </span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-muted-foreground">
              No Noddi data available
            </div>
          )}

          {/* Contact Info */}
          <div className="pt-2 border-t text-xs space-y-1">
            {customer?.phone && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone:</span>
                <span className="font-mono">{customer.phone}</span>
              </div>
            )}
            {customer?.email && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span className="truncate max-w-[200px]">{customer.email}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Note Editor */}
      {!showNoteEditor ? (
        <Button
          onClick={() => setShowNoteEditor(true)}
          variant="outline"
          size="sm"
          className="w-full"
        >
          <Save className="h-3 w-3 mr-2" />
          Add Call Note
        </Button>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Quick Note</CardTitle>
              <Button
                onClick={() => {
                  setShowNoteEditor(false);
                  setNoteContent('');
                }}
                variant="ghost"
                size="sm"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <Textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Type your note here..."
              rows={3}
              className="text-sm"
            />
            <Button
              onClick={handleSaveNote}
              disabled={!noteContent.trim() || isSavingNote}
              size="sm"
              className="w-full"
            >
              {isSavingNote ? (
                <>
                  <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-3 w-3 mr-2" />
                  Save Note
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
