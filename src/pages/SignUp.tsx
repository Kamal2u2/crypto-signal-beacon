
import { SignUp as ClerkSignUp } from "@clerk/clerk-react";

const SignUp = () => {
  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Create an Account</h1>
          <p className="text-gray-600 mt-2">Sign up to get started</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <ClerkSignUp 
            routing="path" 
            path="/sign-up" 
            signInUrl="/sign-in" 
            fallbackRedirectUrl="/"
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none p-0",
                formButtonPrimary: "bg-primary hover:bg-primary/90",
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default SignUp;
