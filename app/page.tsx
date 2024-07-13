// app/page.tsx
import { useState } from "react";
import { Signup } from "@/components/page-comps/Signup";
import { Dashboard } from "@/components/page-comps/Dashboard";

export default function Home() {
  const [isSignedUp, setIsSignedUp] = useState(false);

  const handleSignUpSuccess = () => {
    setIsSignedUp(true);
  };

  return (
    <>
      {isSignedUp ? (
        <Dashboard />
      ) : (
        <Signup onSignUpSuccess={handleSignUpSuccess} />
      )}
    </>
  );
}
