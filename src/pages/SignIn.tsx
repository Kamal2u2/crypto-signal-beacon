
import { SignIn as ClerkSignIn } from "@clerk/clerk-react";

const SignIn = () => {
  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Welcome Back</h1>
          <p className="text-gray-600 mt-2">Sign in to access your account</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <ClerkSignIn 
            routing="path" 
            path="/sign-in" 
            signUpUrl="/sign-up" 
            afterSignInUrl="/"
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

export default SignIn;
