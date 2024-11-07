export interface HealthCheckOptions {
  /** URL to check the health status of */
  url: string;
  /** Interval in milliseconds between health checks. Defaults to 30000 (30 seconds) */
  interval?: number;
  /** Callback function called when health check succeeds */
  onHealthy?: (response: any) => void;
  /** Callback function called when health check fails */
  onUnhealthy?: (error: Error | any) => void;
  /** Whether health checking is enabled. Defaults to true */
  enabled?: boolean;
  /** Number of retry attempts before marking as unhealthy. Defaults to 3 */
  retryAttempts?: number;
  /** Delay between retry attempts in milliseconds. Defaults to 5000 */
  retryDelay?: number;
  /** Response time threshold in milliseconds. Responses slower than this are marked unhealthy. Defaults to 1000 */
  responseTimeThreshold?: number;
}

export interface IHealthStatus {
  status: 'healthy' | 'unhealthy' | 'loading';
  lastChecked: Date | null;
  error?: string;
  responseTime?: number;
  retryCount?: number;
  rawError?: any;
  requestDetails?: {
    request: {
      url: string;
      method: string;
      headers: any;
    };
    response?: {
      status: number;
      statusText: string;
      headers: any;
      data: any;
    };
  };
}
