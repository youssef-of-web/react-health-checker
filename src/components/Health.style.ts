import styled from 'styled-components';

export const HealthCheckContainer = styled.div`
  padding: 1.25rem;
  border-radius: 16px;
  background-color: #ffffff;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
  width: 100%;
  min-width: 280px;
  max-width: 450px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 16px 32px rgba(0, 0, 0, 0.12);
  }
`;

export const StatusIndicator = styled.div<{ $status: 'healthy' | 'unhealthy' | 'loading' }>`
  font-weight: 600;
  font-size: 1rem;
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 12px;
  background-color: ${(props) => {
    switch (props.$status) {
      case 'healthy':
        return 'rgba(46, 204, 113, 0.1)';
      case 'unhealthy':
        return 'rgba(231, 76, 60, 0.1)';
      case 'loading':
        return 'rgba(52, 152, 219, 0.1)';
    }
  }};

  &::before {
    content: '';
    display: inline-block;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background-color: ${(props) => {
      switch (props.$status) {
        case 'healthy':
          return '#2ecc71';
        case 'unhealthy':
          return '#e74c3c';
        case 'loading':
          return '#3498db';
      }
    }};
    box-shadow: 0 0 16px
      ${(props) => {
        switch (props.$status) {
          case 'healthy':
            return 'rgba(46, 204, 113, 0.5)';
          case 'unhealthy':
            return 'rgba(231, 76, 60, 0.5)';
          case 'loading':
            return 'rgba(52, 152, 219, 0.5)';
        }
      }};
  }

  color: ${(props) => {
    switch (props.$status) {
      case 'healthy':
        return '#219653';
      case 'unhealthy':
        return '#c0392b';
      case 'loading':
        return '#2980b9';
    }
  }};
`;

export const LastChecked = styled.div`
  color: #4a5568;
  font-size: 0.875rem;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid #e2e8f0;
  font-weight: 500;
  opacity: 0.95;
`;

export const ErrorMessage = styled.div`
  color: #e74c3c;
  margin-top: 0.75rem;
  padding: 1rem;
  background-color: rgba(231, 76, 60, 0.1);
  border-radius: 12px;
  font-size: 0.875rem;
  line-height: 1.5;
  font-weight: 500;
`;
