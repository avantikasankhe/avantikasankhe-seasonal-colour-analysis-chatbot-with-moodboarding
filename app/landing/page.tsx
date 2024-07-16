"use client";
import { useState, useEffect, ChangeEvent } from "react";
import { useRouter } from 'next/navigation';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const db = getFirestore(); // Initialize Firestore

export default function Landing() {
  const router = useRouter();
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) {
        // Redirect to Dashboard if user is signed in
        router.push('/dashboard'); // Adjust the path as necessary
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleSignUp = async () => {
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      toast({
        title: "Error",
        description: "Passwords do not match",
        action: <ToastAction altText="Try again">Try again</ToastAction>,
        variant: "destructive",
      });
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const userId = userCredential.user.uid; // Get the user's ID

      // Create a user document in Firestore
      await setDoc(doc(db, "users", userId), {
        email: email,
        createdAt: new Date(),
        // Add any other user fields you want to store
      });
      setError(null);
      toast({
        title: "Success",
        description: "Sign up successful!",
      });
    } catch (error: any) {
      setError(error.message);
      toast({
        title: "Error",
        description: error.message,
        action: <ToastAction altText="Try again">Try again</ToastAction>,
        variant: "destructive",
      });
    }
  };

  const handleSignIn = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setError(null);
      toast({
        title: "Success",
        description: "Sign in successful!",
      });
    } catch (error: any) {
      setError(error.message);
      toast({
        title: "Error",
        description: error.message,
        action: <ToastAction altText="Try again">Try again</ToastAction>,
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Success",
        description: "Sign out successful!",
      });
    } catch (error: any) {
      setError(error.message);
      toast({
        title: "Error",
        description: error.message,
        action: <ToastAction altText="Try again">Try again</ToastAction>,
        variant: "destructive",
      });
    }
  };

  const combinedSignUp = async () => {
    await handleSignUp();
    console.log("Another action on Sign Up");
  };

  const combinedSignIn = async () => {
    await handleSignIn();
    console.log("Another action on Sign In");
  };

  const combinedSignOut = async () => {
    await handleSignOut();
    console.log("Another action on Sign Out");
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background bg-blue-200">
      <header className="flex h-20 w-full shrink-0 items-center px-4 md:px-6">
        <Link href="#" className="flex items-center justify-center" prefetch={false}>
          <span className="sr-only">Acme Inc</span>
        </Link>
        <div className="ml-auto flex gap-2">
          {user ? (
            <Button onClick={combinedSignOut}>Sign Out</Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setIsSigningUp(false)}
                className={!isSigningUp ? "bg-accent text-accent-foreground" : ""}
              >
                Sign In
              </Button>
              <Button onClick={() => setIsSigningUp(true)}>Sign Up</Button>
            </>
          )}
        </div>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                  A personalized fashion platform crafted just for you.
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                  Step into a world where colors align with seasons, your mood is your palette, and fashion is your canvas.
                  Get a seasonal analysis, ask FashionAI for recommendations, and curate outfits on your Moodboard!
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button onClick={() => setIsSigningUp(true)} className="hover:text-black hover:bg-accent">Sign Up</Button>
                  <Button onClick={() => setIsSigningUp(false)} className="bg-accent text-black hover:text-white hover:bg-black">
                    Sign In
                  </Button>
                </div>
              </div>
              {isSigningUp ? (
                <Card className="w-full">
                  <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl">Sign Up</CardTitle>
                    <CardDescription>Enter your email and password to create an account</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    <div className="grid gap-2 bg">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="m@example.com"
                        value={email}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="confirm-password">Confirm Password</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                        required
                      />
                    </div>
                    {error && <p className="text-red-500">{error}</p>}
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full" onClick={combinedSignUp}>Sign Up</Button>
                  </CardFooter>
                </Card>
              ) : (
                <Card className="w-full">
                  <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl">Sign In</CardTitle>
                    <CardDescription>Enter your email and password to sign in</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="m@example.com"
                        value={email}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    <Link href="#" className="text-xs text-muted-foreground hover:underline" prefetch={false}>
                      Forgot password?
                    </Link>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full" onClick={combinedSignIn}>Sign In</Button>
                  </CardFooter>
                </Card>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
