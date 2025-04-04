
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from "@clerk/clerk-react";
import App from './App.tsx'
import './index.css'

// Get your Clerk publishable key - for now using a placeholder
// Replace this with your actual key from the Clerk dashboard
const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || "placeholder_key";

if (!CLERK_PUBLISHABLE_KEY || CLERK_PUBLISHABLE_KEY === "placeholder_key") {
  console.warn("Missing Clerk Publishable Key. Please add your VITE_CLERK_PUBLISHABLE_KEY to your environment variables.");
}

createRoot(document.getElementById("root")!).render(
  <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
    <App />
  </ClerkProvider>
);
