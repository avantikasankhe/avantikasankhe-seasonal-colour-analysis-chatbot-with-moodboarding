'use client';
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase"; 
import { signOut as firebaseSignOut } from "firebase/auth"; 
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"; 
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"; 
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { getFirestore, collection, getDocs, doc, deleteDoc } from "firebase/firestore";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { addProductToUserOutfit } from "../chatbot/helpers";

interface Product {
  id: string;
  image: string;
  link: string;
  price: string;
  brand: string;
  title?: string;
}

interface Outfit {
  id: string;
  name: string;
  products: Product[];
}

const BackIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

export default function Component() {
  const router = useRouter();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<string>("");
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<Record<string, Product[]>>({});
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [viewOutfits, setViewOutfits] = useState<boolean>(false);
  const [outfitName, setOutfitName] = useState<string>("");
  const [selectedOutfit, setSelectedOutfit] = useState<Outfit | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/landing"); 
      } else {
        fetchCategories();
        fetchOutfits();
      }
    });
    return () => unsubscribe();
  }, [router]);

  const fetchCategories = async () => {
    const db = getFirestore();
    const userId = auth.currentUser?.uid;
    if (userId) {
      const categoriesSnapshot = await getDocs(collection(db, `users/${userId}/categories`));
      const categoryList = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCategories(categoryList);

      if (categoryList.length > 0) {
        setActiveSection(categoryList[0].id);
        fetchProducts(categoryList[0].id);
      }
    }
  };

  const fetchProducts = async (categoryId: string) => {
    const db = getFirestore();
    const userId = auth.currentUser?.uid;
    const productsSnapshot = await getDocs(collection(db, `users/${userId}/categories/${categoryId}/products`));
    const fetchedProducts = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
    setProducts(prev => ({ ...prev, [categoryId]: fetchedProducts }));
  };

  const fetchOutfits = async () => {
    const db = getFirestore();
    const userId = auth.currentUser?.uid;
    if (userId) {
      const outfitsSnapshot = await getDocs(collection(db, `users/${userId}/outfits`));
      const fetchedOutfits = await Promise.all(outfitsSnapshot.docs.map(async (doc) => {
        const outfitData = { id: doc.id, ...doc.data() } as Outfit;
        const productsSnapshot = await getDocs(collection(db, `users/${userId}/outfits/${doc.id}/products`));
        outfitData.products = productsSnapshot.docs.map(productDoc => ({ id: productDoc.id, ...productDoc.data() })) as Product[];
        return outfitData;
      }));
      setOutfits(fetchedOutfits);
    }
  };

  const handleSectionClick = (section: string) => {
    setActiveSection(section);
    fetchProducts(section);
    setViewOutfits(false);
    setSelectedOutfit(null);
  };

  const handleDeleteProduct = async (categoryId: string, productId: string) => {
    const db = getFirestore();
    const userId = auth.currentUser?.uid;
    if (userId && categoryId && productId) {
      await deleteDoc(doc(db, `users/${userId}/categories/${categoryId}/products/${productId}`));
      fetchProducts(categoryId);
      toast({
        title: "Success",
        description: "Product deleted successfully!",
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await firebaseSignOut(auth);
      router.push('/'); 
      toast({
        title: "Success",
        description: "Sign out successful!",
      });
    } catch (error) {
      console.error('Sign out error:', error);
      toast({
        title: "Error",
        description: error.message,
        action: <ToastAction altText="Try again">Try again</ToastAction>,
        variant: "destructive",
      });
    }
  };

  const handleViewOutfit = (outfit: Outfit) => {
    setSelectedOutfit(outfit);
    setViewOutfits(true);
  };

  const handleOutfitNameChange = (value: string) => {
    setOutfitName(value);
  };

  const handleProductAdd = async (productId: string) => {
    const userId = auth.currentUser?.uid;
    const product = products[activeSection]?.find(p => p.id === productId);
  
    if (!product) return;
  
    const productData = {
      id: productId,
      image: product.image,
      link: product.link,
      price: product.price,
      brand: product.brand,
    };
  
    if (outfitName.trim()) {
      if (userId) {
        try {
          await addProductToUserOutfit(userId, outfitName, productData);

          // Update selectedOutfit safely
          setSelectedOutfit(prev => {
            const updatedProducts = prev ? [...prev.products, productData] : [productData];
            return { ...prev, products: updatedProducts };
          });

          // Update outfits state
          setOutfits(prev => {
            return prev.map(outfit => {
              if (outfit.name === outfitName) {
                return {
                  ...outfit,
                  products: [...outfit.products, productData],
                };
              }
              return outfit;
            });
          });

          toast({ title: "Success", description: "Product added to outfit!" });
          setOutfitName(""); // Reset outfit name
        } catch (error) {
          console.error("Error adding product to outfit:", error);
          toast({
            title: "Error",
            description: "Failed to add product to outfit.",
            variant: "destructive",
          });
        }
      } else {
        toast({ title: "Error", description: "User not logged in." });
      }
    } else {
      toast({ title: "Error", description: "Please specify an outfit name." });
    }
  };
  
  const handleDeleteProductOutfit = async (outfitId: string, productId: string) => {
    const db = getFirestore();
    const userId = auth.currentUser?.uid;
    if (userId && outfitId && productId) {
      await deleteDoc(doc(db, `users/${userId}/outfits/${outfitId}/products/${productId}`));

      // Immediately update selectedOutfit and outfits state
      if (selectedOutfit) {
        setSelectedOutfit(prev => ({
          ...prev,
          products: (prev.products || []).filter(product => product.id !== productId),
        }));
      }

      // Update outfits state directly to reflect the change
      setOutfits(prev => {
        return prev.map(outfit => {
          if (outfit.id === outfitId) {
            return {
              ...outfit,
              products: (outfit.products || []).filter(product => product.id !== productId),
            };
          }
          return outfit;
        });
      });

      toast({
        title: "Success",
        description: "Product deleted from outfit successfully!",
      });
    }
  };

  return (
    <div className="bg-blue-200 h-screen">
    <div className="w-full max-w-6xl mx-auto px-4 md:px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => router.back()} className="flex items-center mr-4">
          <BackIcon className="h-6 w-6 text-gray-600" />
        </button>
        <h1 className="text-3xl font-bold">Moodboard</h1>
        <div className="flex lg:gap-10 md:gap-5 sm:gap-3 gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">View Products</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Categories</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {categories.map(category => (
                <DropdownMenuItem key={category.id} onClick={() => handleSectionClick(category.id)}>
                  {category.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">View Outfits</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>My Outfits</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {outfits.length > 0 ? outfits.map(outfit => (
                <DropdownMenuItem key={outfit.id} onClick={() => handleViewOutfit(outfit)}>
                  {outfit.name}
                </DropdownMenuItem>
              )) : (
                <DropdownMenuItem disabled >No outfits found.</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/placeholder-user.jpg" />
                  <AvatarFallback>JP</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut}>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
        {/* Display products from categories */}
        {!viewOutfits && (products[activeSection] || []).map((item) => (
          <div key={item.id} className="relative overflow-hidden rounded-lg shadow-lg group hover:shadow-xl hover:-translate-y-2 transition-all duration-300 ease-in-out">
            <Link href={item.link} className="absolute inset-0 z-10" prefetch={false}>
              <span className="sr-only">View</span>
            </Link>
            <img src={item.image} alt={item.title} width={500} height={500} className="object-cover w-full h-full" />
            <Button variant='outline'
              onClick={() => handleDeleteProduct(activeSection, item.id)}
              className="absolute top-2 left-2 bg-transparent text-black py-1 px-2 rounded-full z-20" 
            >
              x
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="absolute top-2 right-2 bg-transparent text-black py-1 px-2 rounded-full z-20">
                  +
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-4 bg-white z-20">
                <Textarea
                  className="w-full p-2 border border-gray-300 rounded"
                  placeholder="Enter outfit name"
                  value={outfitName}
                  onChange={(e) => handleOutfitNameChange(e.target.value)}
                />
                <button
                  onClick={() => handleProductAdd(item.id)} 
                  className="mt-2 bg-blue-500 text-white py-1 px-4 rounded"
                >
                  Submit
                </button>
              </PopoverContent>
            </Popover>
            <div className="p-4 bg-background">
              <h3 className="text-xl font-bold">{item.title}</h3>
              <p className="text-lg font-semibold">{item.price}</p>
            </div>
          </div>
        ))}
  
        {/* Display selected outfit or messages */}
        {viewOutfits ? (
          selectedOutfit ? (
            <>
              {selectedOutfit.products.map(product => (
                <div key={product.id} className="relative overflow-hidden rounded-lg shadow-lg group hover:shadow-xl hover:-translate-y-2 transition-all duration-300 ease-in-out">
                  <Link href={product.link} className="absolute inset-0 z-10" prefetch={false}>
                    <span className="sr-only">View</span>
                  </Link>
                  <img src={product.image} alt={product.title} width={500} height={500} className="object-cover w-full h-full" />
                  <Button variant='outline'
                    onClick={() => handleDeleteProductOutfit(selectedOutfit.id, product.id)}
                    className="absolute top-2 left-2 bg-transparent text-black py-1 px-2 rounded-full z-20" 
                  >
                    x
                  </Button>
                </div>
              ))}
            </>
          ) : (
            <div className="p-4 bg-background text-center">
              <p className="text-lg font-semibold">Select an outfit from the dropdown to view.</p>
            </div>
          )
        ) : outfits.length === 0 && (
          <div className="p-4 bg-background text-center">
            <p className="text-lg font-semibold">No outfits found.</p>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
