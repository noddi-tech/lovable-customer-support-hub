import { create } from 'zustand';
import { NoddiLookupResponse } from './useNoddihKundeData';

interface Customer {
  id: string;
  email?: string;
  phone?: string;
  full_name?: string;
}

interface CallCustomerContext {
  callId: string | null;
  customer: Customer | null;
  noddiData: NoddiLookupResponse | null;
  isLoading: boolean;
}

interface CallCustomerContextStore extends CallCustomerContext {
  setCallContext: (callId: string, customer: Customer | null, noddiData?: NoddiLookupResponse | null) => void;
  updateNoddiData: (noddiData: NoddiLookupResponse) => void;
  clearContext: () => void;
  setLoading: (loading: boolean) => void;
}

export const useCallCustomerContext = create<CallCustomerContextStore>((set) => ({
  callId: null,
  customer: null,
  noddiData: null,
  isLoading: false,
  
  setCallContext: (callId, customer, noddiData = null) => {
    console.log('[CallCustomerContext] Setting context:', { 
      callId, 
      customer: {
        id: customer?.id,
        phone: customer?.phone,
        email: customer?.email,
        full_name: customer?.full_name
      },
      hasNoddi: !!noddiData 
    });
    
    // Validate that customer has at least phone or email
    if (customer && !customer.phone && !customer.email) {
      console.warn('[CallCustomerContext] ⚠️ Customer has no phone or email');
    }
    
    set({ callId, customer, noddiData, isLoading: !noddiData });
  },
  
  updateNoddiData: (noddiData) => {
    console.log('[CallCustomerContext] Updating Noddi data:', noddiData?.data?.found);
    set({ noddiData, isLoading: false });
  },
  
  clearContext: () => {
    console.log('[CallCustomerContext] Clearing context');
    set({ callId: null, customer: null, noddiData: null, isLoading: false });
  },
  
  setLoading: (loading) => set({ isLoading: loading }),
}));
