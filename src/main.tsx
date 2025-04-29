
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import mermaid from 'mermaid'

// Global error handler to catch unhandled errors
window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error);
  
  // Log additional details if available
  if (event.error && event.error.stack) {
    console.error('Error stack:', event.error.stack);
  }
  
  // Special handling for Mermaid parsing errors
  if (event.error && event.error.message && event.error.message.includes('Parse error')) {
    console.warn('Mermaid parsing error detected in global handler:', event.error.message);
    // Let the component-level error handler deal with it
    event.preventDefault();  // Prevent default error handling
  }
});

// Add unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  
  // Log additional details if available
  if (event.reason && event.reason.stack) {
    console.error('Rejection stack:', event.reason.stack);
  }
  
  // Special handling for Mermaid parsing errors in promises
  if (event.reason && event.reason.message && event.reason.message.includes('Parse error')) {
    console.warn('Mermaid parsing error detected in promise rejection:', event.reason.message);
    // Let the component-level error handler deal with it
    event.preventDefault();  // Prevent default error handling
  }
});

// Create a container element if it doesn't exist for testing purposes
if (!document.getElementById("root")) {
  const rootElement = document.createElement("div");
  rootElement.id = "root";
  document.body.appendChild(rootElement);
}

// Initialize Mermaid globally with robust error handling
try {
  // Check if mermaid is already initialized to prevent duplicate initialization
  if (!window.mermaidInitialized) {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'loose',
      theme: 'default',
      logLevel: 1,
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'linear'
      }
    });
    window.mermaidInitialized = true;
    console.log('Mermaid initialized globally with enhanced error handling');
  }
} catch (error) {
  console.error('Failed to initialize Mermaid globally:', error);
}

// Add error handling to rendering
try {
  const rootElement = document.getElementById("root");
  if (rootElement) {
    createRoot(rootElement).render(<App />);
  } else {
    console.error("Root element not found, application failed to mount");
  }
} catch (error) {
  console.error("Failed to render application:", error);
  // Create a fallback UI if render fails
  const rootElement = document.getElementById("root");
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; font-family: sans-serif;">
        <h1>Application Error</h1>
        <p>The application failed to load. Please refresh the page.</p>
        <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px;">${error?.toString()}</pre>
      </div>
    `;
  }
}
