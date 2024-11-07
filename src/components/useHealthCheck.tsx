import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { HealthCheckOptions, IHealthStatus } from '../types';

export const useHealthCheck = ({
  url,
  interval = 30000,
  onHealthy,
  onUnhealthy,
  enabled = true,
  retryAttempts = 3,
  retryDelay = 5000,
  responseTimeThreshold = 1000,
}: HealthCheckOptions) => {
  const [health, setHealth] = useState<IHealthStatus>({
    status: 'loading',
    lastChecked: null,
  });

  const checkHealth = useCallback(async () => {
    if (!enabled) return;

    const startTime = performance.now();
    let currentRetry = 0;

    const attemptHealthCheck = async (): Promise<void> => {
      try {
        const response = await axios.get(url);
        const responseTime = performance.now() - startTime;

        if (response.status === 200) {
          const isSlowResponse = responseTime > responseTimeThreshold;
          const status = isSlowResponse ? 'unhealthy' : 'healthy';

          setHealth((prev) => ({
            ...prev,
            status,
            lastChecked: new Date(),
            error: undefined,
            rawError: undefined,
            responseTime,
            retryCount: 0,
            requestDetails: {
              request: {
                url: response.config.url || '',
                method: response.config.method?.toUpperCase() || '',
                headers: response.config.headers,
              },
              response: {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
                data: response.data,
              },
            },
          }));

          if (isSlowResponse) {
            const error = new Error(
              `Response time (${responseTime}ms) exceeded threshold (${responseTimeThreshold}ms)`
            );
            onUnhealthy?.(error);
          } else {
            onHealthy?.(response);
          }
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        const axiosError = error as any;

        if (currentRetry < retryAttempts) {
          currentRetry++;
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          return attemptHealthCheck();
        }

        setHealth((prev) => ({
          ...prev,
          status: 'unhealthy',
          lastChecked: new Date(),
          error: errorMessage,
          rawError: error,
          retryCount: currentRetry,
          requestDetails: {
            request: {
              url: axiosError.config?.url || url,
              method: axiosError.config?.method?.toUpperCase() || 'GET',
              headers: axiosError.config?.headers || {},
            },
            response: axiosError.response
              ? {
                  status: axiosError.response.status,
                  statusText: axiosError.response.statusText,
                  headers: axiosError.response.headers,
                  data: axiosError.response.data,
                }
              : undefined,
          },
        }));
        onUnhealthy?.(error instanceof Error ? error : new Error(errorMessage));
      }
    };

    await attemptHealthCheck();
  }, [url, onHealthy, onUnhealthy, enabled, retryAttempts, retryDelay, responseTimeThreshold]);

  useEffect(() => {
    if (!enabled) {
      setHealth((prev) => ({
        ...prev,
        status: 'loading',
        lastChecked: null,
        error: undefined,
        rawError: undefined,
        requestDetails: undefined,
      }));
      return;
    }

    let isSubscribed = true;
    const controller = new AbortController();

    const runHealthCheck = async () => {
      if (isSubscribed) {
        await checkHealth();
      }
    };

    runHealthCheck();
    const intervalId = setInterval(runHealthCheck, interval);

    return () => {
      isSubscribed = false;
      controller.abort();
      clearInterval(intervalId);
    };
  }, [checkHealth, interval, enabled]);

  return health;
};
