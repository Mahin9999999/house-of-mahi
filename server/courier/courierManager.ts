import { 
  ICourierAdapter, 
  ServerCourierConfig, 
  ServerCourierBookingPayload, 
  ServerCourierBookingResult, 
  ServerCourierTrackingResult, 
  ServerCourierTestResult,
  ServerCourierProviderId 
} from './types';
import { SteadfastServerAdapter } from './adapters/steadfast';
import { PathaoServerAdapter } from './adapters/pathao';
import { RedXServerAdapter } from './adapters/redx';

/**
 * ServerCourierManager
 * Manages registered courier adapters, handles priority sorting,
 * dispatches booking requests, and executes multi-carrier fallback if enabled.
 */
export class ServerCourierManager {
  private adapters: Map<ServerCourierProviderId, ICourierAdapter> = new Map();

  constructor() {
    this.registerDefaultAdapters();
  }

  /**
   * Register default built-in courier adapters
   */
  private registerDefaultAdapters(): void {
    this.registerAdapter(new SteadfastServerAdapter());
    this.registerAdapter(new PathaoServerAdapter());
    this.registerAdapter(new RedXServerAdapter());
  }

  /**
   * Register a new courier adapter dynamically
   */
  public registerAdapter(adapter: ICourierAdapter): void {
    this.adapters.set(adapter.providerId, adapter);
  }

  /**
   * Get an adapter by provider ID
   */
  public getAdapter(providerId: ServerCourierProviderId): ICourierAdapter | undefined {
    return this.adapters.get(providerId);
  }

  /**
   * Get list of all registered provider IDs
   */
  public getRegisteredProviders(): ServerCourierProviderId[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Dispatches an order to the best available courier based on priority,
   * or to a specific requested courier if specified.
   * If the primary courier fails, it automatically falls back to the next active courier in priority order.
   */
  public async dispatchBooking(
    payload: ServerCourierBookingPayload,
    activeConfigs: ServerCourierConfig[],
    requestedProviderId?: ServerCourierProviderId
  ): Promise<{
    result: ServerCourierBookingResult;
    attempts: { provider: ServerCourierProviderId; success: boolean; error?: string }[];
  }> {
    const attempts: { provider: ServerCourierProviderId; success: boolean; error?: string }[] = [];

    // Filter only active configs with API keys
    const validConfigs = activeConfigs.filter(c => c.isActive && c.apiKey && c.apiKey.trim().length > 0);

    if (validConfigs.length === 0) {
      return {
        result: {
          success: false,
          provider: requestedProviderId || 'custom',
          courierName: 'No Courier Configured',
          status: 'failed',
          errorMessage: 'No active courier service with valid API credentials found in system settings.'
        },
        attempts
      };
    }

    // Sort configs by priority (1 = highest priority)
    const sortedConfigs = [...validConfigs].sort((a, b) => {
      const priorityA = a.priority ?? 99;
      const priorityB = b.priority ?? 99;
      return priorityA - priorityB;
    });

    // If a specific provider is explicitly requested by user
    let targetConfigs: ServerCourierConfig[];
    if (requestedProviderId) {
      const specific = sortedConfigs.filter(c => c.provider === requestedProviderId);
      if (specific.length > 0) {
        targetConfigs = specific;
      } else {
        targetConfigs = sortedConfigs;
      }
    } else {
      targetConfigs = sortedConfigs;
    }

    let lastFailedResult: ServerCourierBookingResult | null = null;

    // Try each courier in sequence until one succeeds
    for (const config of targetConfigs) {
      const adapter = this.adapters.get(config.provider);
      if (!adapter) {
        attempts.push({
          provider: config.provider,
          success: false,
          error: `No server adapter registered for courier provider "${config.provider}".`
        });
        continue;
      }

      try {
        const bookingResult = await adapter.bookOrder(payload, config);

        if (bookingResult.success) {
          attempts.push({
            provider: config.provider,
            success: true
          });

          return {
            result: bookingResult,
            attempts
          };
        } else {
          attempts.push({
            provider: config.provider,
            success: false,
            error: bookingResult.errorMessage
          });
          lastFailedResult = bookingResult;
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Unknown exception during courier dispatch';
        attempts.push({
          provider: config.provider,
          success: false,
          error: errMsg
        });

        lastFailedResult = {
          success: false,
          provider: config.provider,
          courierName: config.name || adapter.defaultName,
          status: 'failed',
          errorMessage: errMsg
        };
      }
    }

    return {
      result: lastFailedResult || {
        success: false,
        provider: targetConfigs[0]?.provider || 'custom',
        courierName: targetConfigs[0]?.name || 'Courier Service',
        status: 'failed',
        errorMessage: 'All attempted courier services failed to process the booking.'
      },
      attempts
    };
  }

  /**
   * Tracks an existing order using the designated courier provider's adapter
   */
  public async trackBooking(
    trackingCode: string,
    config: ServerCourierConfig
  ): Promise<ServerCourierTrackingResult> {
    const adapter = this.adapters.get(config.provider);
    if (!adapter || !adapter.trackOrder) {
      return {
        success: false,
        provider: config.provider,
        trackingCode,
        currentStatus: 'Unknown',
        errorMessage: `Tracking is not supported or adapter missing for provider: ${config.provider}`
      };
    }

    return adapter.trackOrder(trackingCode, config);
  }

  /**
   * Tests API connection for a specific courier configuration
   */
  public async testCourierConnection(
    config: ServerCourierConfig
  ): Promise<ServerCourierTestResult> {
    const adapter = this.adapters.get(config.provider);
    if (!adapter || !adapter.testConnection) {
      return {
        success: false,
        provider: config.provider,
        courierName: config.name,
        message: `Connection test is not implemented for provider "${config.provider}".`,
        testedAt: new Date().toISOString()
      };
    }

    return adapter.testConnection(config);
  }
}

// Export a singleton instance for server routes
export const courierManager = new ServerCourierManager();
