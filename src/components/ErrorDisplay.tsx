import React from 'react';
import './ErrorDisplay.css';

interface MoveAttempt {
  attempt_number: number;
  attempted_move?: string;
  error_type?: string;
  error_message?: string;
  legal_moves_sample?: string[];
  raw_response?: string;
  timestamp?: string;
}

interface MoveError {
  error_type: string;
  error_message: string;
  attempted_move?: string;
  legal_moves?: string[];
  total_attempts: number;
  failed_attempts: MoveAttempt[];
  suggestions: string[];
  recovery_options: string[];
}

interface ErrorResponse {
  error: string;
  error_type: string;
  details?: string;
  move_error?: MoveError;
  suggestions: string[];
  recovery_options: string[];
  timestamp?: string;
}

interface ErrorDisplayProps {
  error: ErrorResponse | string;
  onRetry?: () => void;
  onSwitchEngine?: () => void;
  onResetGame?: () => void;
  className?: string;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  onSwitchEngine,
  onResetGame,
  className = ''
}) => {
  // Handle simple string errors
  if (typeof error === 'string') {
    return (
      <div className={`error-display error-display--simple ${className}`}>
        <div className="error-display__header">
          <span className="error-display__icon">⚠️</span>
          <h3 className="error-display__title">Error</h3>
        </div>
        <p className="error-display__message">{error}</p>
        {onRetry && (
          <div className="error-display__actions">
            <button onClick={onRetry} className="error-display__button error-display__button--primary">
              Try Again
            </button>
          </div>
        )}
      </div>
    );
  }

  const errorData = error as ErrorResponse;
  const moveError = errorData.move_error;

  const getErrorIcon = (errorType: string) => {
    switch (errorType) {
      case 'illegal_move': return '🚫';
      case 'timeout': return '⏰';
      case 'engine_unavailable': return '🔧';
      case 'invalid_format': return '❓';
      case 'game_over': return '🏁';
      case 'max_retries_exceeded': return '🔄';
      default: return '⚠️';
    }
  };

  const getErrorTitle = (errorType: string) => {
    switch (errorType) {
      case 'illegal_move': return 'Illegal Move';
      case 'timeout': return 'Request Timeout';
      case 'engine_unavailable': return 'Engine Unavailable';
      case 'invalid_format': return 'Invalid Move Format';
      case 'game_over': return 'Game Over';
      case 'max_retries_exceeded': return 'Maximum Retries Exceeded';
      case 'api_error': return 'API Error';
      case 'network_error': return 'Network Error';
      default: return 'Error';
    }
  };

  const formatAttemptError = (attempt: MoveAttempt) => {
    switch (attempt.error_type) {
      case 'illegal_move':
        return `Move "${attempt.attempted_move}" is not legal`;
      case 'invalid_format':
        return `Invalid move format: "${attempt.attempted_move}"`;
      case 'timeout':
        return 'Request timed out';
      case 'parse_error':
        return `Could not parse move from response`;
      default:
        return attempt.error_message || 'Unknown error';
    }
  };

  return (
    <div className={`error-display error-display--detailed ${className}`}>
      <div className="error-display__header">
        <span className="error-display__icon">{getErrorIcon(errorData.error_type)}</span>
        <h3 className="error-display__title">{getErrorTitle(errorData.error_type)}</h3>
      </div>

      <div className="error-display__content">
        <p className="error-display__message">{errorData.error}</p>

        {/* Move Error Details */}
        {moveError && (
          <div className="error-display__move-error">
            <h4 className="error-display__section-title">Move Generation Details</h4>
            
            {/* Attempt Summary */}
            <div className="error-display__attempts-summary">
              <span className="error-display__stat">
                <strong>Attempts:</strong> {moveError.total_attempts}
              </span>
              <span className="error-display__stat">
                <strong>Failed:</strong> {moveError.failed_attempts.length}
              </span>
              {moveError.attempted_move && (
                <span className="error-display__stat">
                  <strong>Last Move:</strong> {moveError.attempted_move}
                </span>
              )}
            </div>

            {/* Failed Attempts Details */}
            {moveError.failed_attempts.length > 0 && (
              <div className="error-display__attempts">
                <h5 className="error-display__subsection-title">Failed Attempts:</h5>
                <div className="error-display__attempts-list">
                  {moveError.failed_attempts.map((attempt, index) => (
                    <div key={index} className="error-display__attempt">
                      <div className="error-display__attempt-header">
                        <span className="error-display__attempt-number">#{attempt.attempt_number}</span>
                        <span className="error-display__attempt-error">{formatAttemptError(attempt)}</span>
                      </div>
                      {attempt.legal_moves_sample && attempt.legal_moves_sample.length > 0 && (
                        <div className="error-display__legal-moves">
                          <strong>Legal moves:</strong> {attempt.legal_moves_sample.join(', ')}
                          {attempt.legal_moves_sample.length >= 8 && '...'}
                        </div>
                      )}
                      {attempt.raw_response && (
                        <div className="error-display__raw-response">
                          <strong>AI Response:</strong> "{attempt.raw_response}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Legal Moves */}
            {moveError.legal_moves && moveError.legal_moves.length > 0 && (
              <div className="error-display__legal-moves-section">
                <h5 className="error-display__subsection-title">Legal Moves in Current Position:</h5>
                <div className="error-display__legal-moves-grid">
                  {moveError.legal_moves.slice(0, 12).map((move, index) => (
                    <span key={index} className="error-display__legal-move">{move}</span>
                  ))}
                  {moveError.legal_moves.length > 12 && (
                    <span className="error-display__legal-move error-display__legal-move--more">
                      +{moveError.legal_moves.length - 12} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Suggestions */}
        {errorData.suggestions && errorData.suggestions.length > 0 && (
          <div className="error-display__suggestions">
            <h4 className="error-display__section-title">💡 Suggestions</h4>
            <ul className="error-display__list">
              {errorData.suggestions.map((suggestion, index) => (
                <li key={index} className="error-display__list-item">{suggestion}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Recovery Options */}
        {errorData.recovery_options && errorData.recovery_options.length > 0 && (
          <div className="error-display__recovery">
            <h4 className="error-display__section-title">🔧 What You Can Do</h4>
            <ul className="error-display__list">
              {errorData.recovery_options.map((option, index) => (
                <li key={index} className="error-display__list-item">{option}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Timestamp */}
        {errorData.timestamp && (
          <div className="error-display__timestamp">
            <small>Error occurred at: {new Date(errorData.timestamp).toLocaleString()}</small>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="error-display__actions">
        {onRetry && (
          <button onClick={onRetry} className="error-display__button error-display__button--primary">
            🔄 Try Again
          </button>
        )}
        {onSwitchEngine && (
          <button onClick={onSwitchEngine} className="error-display__button error-display__button--secondary">
            🔧 Switch Engine
          </button>
        )}
        {onResetGame && (
          <button onClick={onResetGame} className="error-display__button error-display__button--secondary">
            🔄 Reset Game
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorDisplay; 