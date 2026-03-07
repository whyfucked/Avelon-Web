/**
 * VMManager6 Library Re-exports
 * Convenience exports for VMManager6 functionality
 */

export { 
  VMManager6API, 
  getVMManager6API,
  resetVMManager6API,
  createVMManager6API,
  VMManager6Error,
  VMManager6AuthError,
  VMManager6TaskError,
  type VMManager6Host,
  type VMManager6Node,
  type VMManager6Cluster,
  type VMManager6OS,
  type VMManager6Preset,
  type VMManager6IPPool,
  type VMManager6Recipe,
  type VMManager6Account,
  type VMManager6Task,
  type VMManager6Metrics,
  type VMManager6IPv6Info,
  type CreateHostRequest,
  type ChangeResourcesRequest,
  type ChangeIPRequest,
  type ReinstallRequest,
  type ResizeDiskRequest,
  type SSOConfig,
  type SSOProvider,
  type OIDCTokenResponse,
  type IPv4Address,
  type IPv6Address,
  type IPAddress,
  type TaskStatus
} from '@/vm6/vmmanager6'

export {
  VmManager,
  getVmManager,
  type VmCreateOptions,
  type VmRentalOptions,
  type VmInfo,
  type VmListFilters,
  type VmWithRental,
  type CreateVmResult,
  type VMManager6Rental
} from '@/vm6/VmManager'

export {
  getVMManager6Rentals,
  getVMManager6RentalById,
  getVMManager6RentalByServerId,
  createVMManager6Rental,
  updateVMManager6Rental,
  renewVMManager6Rental,
  getExpiredVMManager6Rentals,
  suspendVMManager6ServerInDatabase,
  deleteVMManager6ServerFromDatabase,
  banVMManager6ServerInDatabase,
  type CreateVMManager6RentalData,
  type UpdateVMManager6RentalData
} from '@/vm6/vmmanager6-rentals'
