// Import all blocks to trigger self-registration
import './ActionMenuBlock';
import './PhoneVerifyBlock';
import './YesNoBlock';
import './EmailInputBlock';
import './TextInputBlock';
import './RatingBlock';
import './ConfirmBlock';
import './AddressSearchBlock';
import './LicensePlateBlock';
import './ServiceSelectBlock';
import './TimeSlotBlock';
import './BookingSummaryBlock';
import './BookingEditConfirmBlock';
import './BookingConfirmedBlock';

// Re-export registry for convenience
export { getBlock, getAllBlocks, getBlockForFieldType, getBlockForNodeType, registerBlock } from './registry';
export type { BlockDefinition, BlockComponentProps, FlowPreviewProps, ApiEndpointConfig } from './registry';
