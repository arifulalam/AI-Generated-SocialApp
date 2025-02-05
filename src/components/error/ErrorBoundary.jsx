import React from 'react';
import { errorHandlingService } from '../../services/ErrorHandlingService';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error to our error handling service
    errorHandlingService.logError(error, {
      component: this.props.componentName || 'Unknown',
      errorInfo,
      operationType: 'react',
      timestamp: new Date()
    }).then(errorId => {
      this.setState({ errorId });
    });
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
  };

  handleReport = async () => {
    if (this.state.errorId) {
      // Open error report in new window/tab
      window.open(`/error-report/${this.state.errorId}`, '_blank');
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            
            <h2 className="text-xl font-semibold text-center text-gray-800 mb-2">
              Something went wrong
            </h2>
            
            <p className="text-gray-600 text-center mb-6">
              We've logged this error and will work on fixing it. You can try refreshing the page or contact support if the problem persists.
            </p>

            {this.state.errorId && (
              <div className="bg-gray-50 rounded p-3 mb-4 text-sm">
                <p className="text-gray-700 font-medium">Error Reference:</p>
                <code className="text-gray-600">{this.state.errorId}</code>
              </div>
            )}

            <div className="flex justify-center space-x-4">
              <button
                onClick={this.handleRetry}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Try Again
              </button>
              
              <button
                onClick={this.handleReport}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Report Issue
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && (
              <div className="mt-6 text-sm">
                <p className="text-gray-700 font-medium mb-2">Error Details:</p>
                <pre className="bg-gray-50 p-3 rounded overflow-auto max-h-40">
                  {this.state.error && this.state.error.toString()}
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </pre>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
