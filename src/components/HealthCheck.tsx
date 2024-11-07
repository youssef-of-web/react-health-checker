import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { HealthCheckContainer, StatusIndicator, LastChecked, ErrorMessage } from './Health.style';
import { HealthCheckOptions, IHealthStatus } from '../types';

interface HealthCheckProps extends HealthCheckOptions {
  /** Custom messages to display for different health states */
  messages?: {
    /** Message shown when health check succeeds */
    healthy?: string;
    /** Message shown when health check fails */
    unhealthy?: string;
    /** Message shown while health check is in progress */
    loading?: string;
  };
  /** Position of the health indicator on screen. Can be 'top-right', 'top-left', 'bottom-right', 'bottom-left' or a custom string */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | string;
  /** Whether to show the visual health status indicator. Defaults to true */
  indicator?: boolean;
  /** Enable developer tools mode. Defaults to false */
  developerMode?: boolean;
}

interface HealthStatus extends IHealthStatus {
  expanded: boolean;
  showDevTools?: boolean;
  rawError?: any;
}

const getPositionStyles = (position: HealthCheckProps['position']) => {
  if (
    typeof position === 'string' &&
    ['top-right', 'top-left', 'bottom-right', 'bottom-left'].includes(position)
  ) {
    switch (position) {
      case 'top-right':
        return { top: '20px', right: '20px' };
      case 'top-left':
        return { top: '20px', left: '20px' };
      case 'bottom-left':
        return { bottom: '20px', left: '20px' };
      case 'bottom-right':
        return { bottom: '20px', right: '20px' };
    }
  }
  return {};
};

const getExpandedPosition = (position: HealthCheckProps['position']) => {
  if (typeof position === 'string') {
    const isTop = position?.includes('top');
    const isLeft = position?.includes('left');
    return {
      top: isTop ? '40px' : undefined,
      bottom: isTop ? undefined : '40px',
      left: isLeft ? '0' : undefined,
      right: isLeft ? undefined : '0',
    };
  }
  return {};
};

export const HealthCheck: React.FC<HealthCheckProps> = ({
  url,
  interval = 30000,
  onHealthy,
  onUnhealthy,
  messages = {
    healthy: 'Status: healthy',
    unhealthy: 'Status: unhealthy',
    loading: 'Status: loading',
  },
  enabled = true,
  position = 'bottom-right',
  indicator = true,
  retryAttempts = 3,
  retryDelay = 5000,
  responseTimeThreshold = 1000,
  developerMode = false,
}) => {
  const [health, setHealth] = useState<HealthStatus>({
    status: 'loading',
    lastChecked: null,
    expanded: false,
    showDevTools: false,
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
    setHealth((prev) => ({
      ...prev,
      status: 'loading',
      lastChecked: null,
      error: undefined,
      rawError: undefined,
      requestDetails: undefined,
    }));
  }, [url]);

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

  const toggleExpanded = () => {
    setHealth((prev) => ({
      ...prev,
      expanded: !prev.expanded,
    }));
  };

  const toggleDevTools = () => {
    setHealth((prev) => ({
      ...prev,
      showDevTools: !prev.showDevTools,
    }));
  };

  if (!enabled) return null;

  const positionStyles = getPositionStyles(position);
  const containerStyles = {
    position:
      typeof position === 'string' &&
      ['top-right', 'top-left', 'bottom-right', 'bottom-left'].includes(position)
        ? 'fixed'
        : 'relative',
    ...positionStyles,
    zIndex: 1000,
  } as React.CSSProperties;

  const formatJSON = (data: any) => {
    try {
      return JSON.stringify(
        data,
        (key, value) => {
          if (value instanceof Date) {
            return value.toISOString();
          }
          if (key === 'rawError') {
            return value?.message || value;
          }
          return value;
        },
        2
      );
    } catch {
      return 'Error formatting JSON';
    }
  };

  return (
    <div style={containerStyles}>
      {indicator && (
        <div
          onClick={toggleExpanded}
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            cursor: 'pointer',
            backgroundColor:
              health.status === 'healthy'
                ? '#2ecc71'
                : health.status === 'unhealthy'
                  ? '#e74c3c'
                  : '#3498db',
            boxShadow: `0 2px 8px rgba(0, 0, 0, 0.15), 
                     0 0 12px ${
                       health.status === 'healthy'
                         ? 'rgba(46, 204, 113, 0.5)'
                         : health.status === 'unhealthy'
                           ? 'rgba(231, 76, 60, 0.5)'
                           : 'rgba(52, 152, 219, 0.5)'
                     }`,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: health.expanded ? 'scale(1.1)' : 'scale(1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        />
      )}
      {health.expanded && (
        <div
          style={{
            position: 'absolute',
            ...getExpandedPosition(position),
            minWidth: '280px',
            animation: 'slideIn 0.2s ease-out',
          }}
        >
          <HealthCheckContainer data-testid="health-check">
            <StatusIndicator $status={health.status}>
              {messages[health.status] || `Status: ${health.status}`}
            </StatusIndicator>
            <LastChecked>URL: {url}</LastChecked>
            {health.lastChecked && (
              <LastChecked>Last checked: {health.lastChecked.toLocaleString()}</LastChecked>
            )}
            {health.responseTime && (
              <LastChecked>Response time: {health.responseTime.toFixed(2)}ms</LastChecked>
            )}
            {health.retryCount !== undefined && health.retryCount > 0 && (
              <LastChecked>Retry attempts: {health.retryCount}</LastChecked>
            )}
            {health.error && <ErrorMessage>Error: {health.error}</ErrorMessage>}
            {developerMode && (
              <div
                style={{ marginTop: '15px', borderTop: '1px solid #dee2e6', paddingTop: '15px' }}
              >
                <button
                  onClick={toggleDevTools}
                  style={{
                    padding: '8px 12px',
                    fontSize: '13px',
                    cursor: 'pointer',
                    backgroundColor: health.showDevTools ? '#e9ecef' : '#f8f9fa',
                    border: '1px solid #ced4da',
                    borderRadius: '6px',
                    color: '#495057',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    width: '100%',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                  }}
                >
                  <span>{health.showDevTools ? '🔽 Developer Tools' : '▶️ Developer Tools'}</span>
                  <span
                    style={{
                      fontSize: '11px',
                      color: '#6c757d',
                      backgroundColor: '#e9ecef',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontWeight: 500,
                    }}
                  >
                    {health.status}
                  </span>
                </button>
                {health.showDevTools && (
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '15px',
                      backgroundColor: '#f8f9fa',
                      border: '1px solid #e9ecef',
                      borderRadius: '8px',
                      fontSize: '13px',
                      boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)',
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                    }}
                  >
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '15px',
                        marginBottom: '15px',
                      }}
                    >
                      <div>
                        <h4
                          style={{
                            margin: '0 0 8px 0',
                            fontSize: '14px',
                            color: '#495057',
                            fontWeight: 600,
                          }}
                        >
                          Status
                        </h4>
                        <div
                          style={{
                            padding: '8px 12px',
                            backgroundColor: '#fff',
                            border: '1px solid #dee2e6',
                            borderRadius: '6px',
                            color:
                              health.status === 'healthy'
                                ? '#2ecc71'
                                : health.status === 'unhealthy'
                                  ? '#e74c3c'
                                  : '#3498db',
                            fontWeight: 600,
                          }}
                        >
                          {health.status}
                        </div>
                      </div>
                      <div>
                        <h4
                          style={{
                            margin: '0 0 8px 0',
                            fontSize: '14px',
                            color: '#495057',
                            fontWeight: 600,
                          }}
                        >
                          Response Time
                        </h4>
                        <div
                          style={{
                            padding: '8px 12px',
                            backgroundColor: '#fff',
                            border: '1px solid #dee2e6',
                            borderRadius: '6px',
                            fontFamily: 'monospace',
                          }}
                        >
                          {health.responseTime ? `${health.responseTime.toFixed(2)}ms` : 'N/A'}
                        </div>
                      </div>
                    </div>
                    <div style={{ marginTop: '15px' }}>
                      <h4
                        style={{
                          margin: '0 0 8px 0',
                          fontSize: '14px',
                          color: '#495057',
                          fontWeight: 600,
                        }}
                      >
                        Request Details
                      </h4>
                      <pre
                        style={{
                          margin: 0,
                          padding: '12px',
                          backgroundColor: '#fff',
                          border: '1px solid #dee2e6',
                          borderRadius: '6px',
                          whiteSpace: 'pre-wrap',
                          fontSize: '12px',
                          lineHeight: '1.5',
                          maxHeight: '300px',
                          overflowY: 'auto',
                          fontFamily: 'Consolas, Monaco, monospace',
                          color: '#333',
                        }}
                      >
                        {formatJSON({
                          status: health.status,
                          lastChecked: health.lastChecked,
                          responseTime:
                            health.responseTime && `${health.responseTime.toFixed(2)}ms`,
                          retryCount: health.retryCount,
                          error: health.error,
                          requestDetails: health.requestDetails,
                          configuration: {
                            url,
                            interval: `${interval}ms`,
                            retryAttempts,
                            retryDelay: `${retryDelay}ms`,
                            responseTimeThreshold: `${responseTimeThreshold}ms`,
                          },
                        })}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </HealthCheckContainer>
        </div>
      )}
      <style>
        {`
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
    </div>
  );
};
