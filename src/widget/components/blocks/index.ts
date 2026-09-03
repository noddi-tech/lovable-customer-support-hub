// Import all blocks to trigger self-registration
import "./ActionMenuBlock"
import "./PhoneVerifyBlock"
import "./YesNoBlock"
import "./ResolvedCheckBlock"
import "./EmailInputBlock"
import "./TextInputBlock"
import "./RatingBlock"
import "./ConfirmBlock"
import "./AddressSearchBlock"
import "./LicensePlateBlock"
import "./ServiceSelectBlock"
import "./TimeSlotBlock"
import "./BookingSummaryBlock"
import "./BookingEditConfirmBlock"
import "./BookingConfirmedBlock"
import "./BookingInfoBlock"
import "./BookingSelectBlock"
import "./GroupSelectBlock"

export type {
  ApiEndpointConfig,
  BlockComponentProps,
  BlockDefinition,
  FlowPreviewProps,
} from "./registry"
// Re-export registry for convenience
export {
  getAllBlocks,
  getBlock,
  getBlockForFieldType,
  getBlockForNodeType,
  registerBlock,
} from "./registry"
