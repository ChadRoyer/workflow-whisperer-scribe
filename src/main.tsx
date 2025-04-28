
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Global error handler to catch unhandled errors
window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error);
  // Could add more error reporting here
});

// Create a container element if it doesn't exist for testing purposes
if (!document.getElementById("root")) {
  const rootElement = document.createElement("div");
  rootElement.id = "root";
  document.body.appendChild(rootElement);
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
