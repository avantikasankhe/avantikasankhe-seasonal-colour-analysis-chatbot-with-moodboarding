'use client'
import { useState, useEffect } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu"; 
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { auth } from "@/lib/firebase"; 
import { signOut as firebaseSignOut, onAuthStateChanged } from "firebase/auth"; 
import {
    loadProducts,
    Categorise,
    handleColorAnalysis,
    handleProductSearch,
    runPythonScript,
    addProductToUserCollection,
} from "./helpers";

const BackIcon = (props:any) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 18l-6-6 6-6" />
    </svg>
);
  
interface Product {
    brand: string;
    price: string;
    link: string;
    image: string;
}

interface Message {
    id: number;
    sender: string;
    content: string;
    color?: string;
    products?: Product[];
}

export default function Chatbot() {
    const router = useRouter();
    const { toast } = useToast();
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 1,
            sender: "FashionAI",
            content: "Hello! How can I assist you today?",
            products: [],
        },
    ]);
    const [inputText, setInputText] = useState<string>("");
    const [inputCategory, setCategory] = useState<string>("");
    const [inputColor, setInputColor] = useState<string>("#000000");
    const [selectedColor, setSelectedColor] = useState<string>("#000000");
    const [loading, setLoading] = useState<boolean>(false);
    const [loadingMessageId, setLoadingMessageId] = useState<number | null>(null);
    
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (!user) {
                router.push("/landing"); 
            }
        });
        return () => unsubscribe();
    }, [router]);

    const handleSignOut = async () => {
        try {
            await firebaseSignOut(auth);
            router.push('/'); 
            toast({ title: "Success", description: "Sign out successful!" });
        } catch (error: any) {
            console.error('Sign out error:', error);
            toast({
                title: "Error",
                description: error,
                action: <ToastAction altText="Try again">Try again</ToastAction>,
                variant: "destructive",
            });
        }
    };

    const runPythonScript = async (color: string, product: string, gender: string) => {
        setLoading(true);
        try {
            const response = await fetch('http://localhost:9000/run-script', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ args: [color, product, gender] }),
            });

            if (!response.ok) throw new Error('Network response was not ok');
            return await response.text();
        } catch (error) {
            console.error('Error running Python script:', error);
            return 'Error running script';
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInputText(e.target.value);
    };

    const handleCategory = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setCategory(e.target.value);
    };

    const handleColorChange = (color: string) => {
        setSelectedColor(color);
    };

    const addColorToInput = () => {
        setInputText((prev) => prev + selectedColor);
    };

    const handleSubmit = async () => {
        console.log(auth.currentUser?.uid)
        if (inputText.trim() !== "") {
            const newMessage: Message = {
                id: messages.length + 1,
                sender: "You",
                content: inputText,
                color: inputColor,
                products: [],
            };
            setMessages((prevMessages) => [...prevMessages, newMessage]);
            setInputText("");

            const loadingMessage: Message = {
                id: messages.length + 2,
                sender: "FashionAI",
                content: "",
                products: [],
            };
            setLoadingMessageId(loadingMessage.id);
            setMessages((prevMessages) => [...prevMessages, loadingMessage]);
            setLoading(true);

            const category = await Categorise(inputText);
            console.log("Categorised result:", category);

            let botResponseContent = "Here is some information related to your query:";
            let products: Product[] = [];

            if (category.trim() === "1") {
                const colorAnalysisResult = await handleColorAnalysis(inputText);
                botResponseContent = colorAnalysisResult;
            } else if (category.trim() === "2") {
                const [color, product, gender] = await handleProductSearch(inputText);
                const scriptResponse = await runPythonScript(color, product, gender);
                const allProducts = await loadProducts();
                products = allProducts
                    .filter((item: any) => item.Product)
                    .map((item: any) => ({
                        brand: item.Brand,
                        price: item.Price,
                        link: item.Link,
                        image: item.Image,
                    }));
                console.log('Products: ', products);
            }

            setTimeout(() => {
                const botResponse: Message = {
                    id: loadingMessage.id,
                    sender: "FashionAI",
                    content: botResponseContent,
                    products: products,
                };

                setMessages((prevMessages) => {
                    return prevMessages.map(msg => msg.id === loadingMessage.id ? botResponse : msg);
                });

                setLoading(false);
                setLoadingMessageId(null);
            }, 1000);
        }
    };

    const generateUniqueId = () => {
        return Math.random().toString(10);
    };

    const handleProductAdd = async (product: Product) => {
        console.log(auth.currentUser?.uid);
        if (!product) return; // Check if product is defined
    
        // Create a new object with only the necessary properties
        const productData = {
            id: generateUniqueId(), // Ensure ID is included
            image: product.image,
            link: product.link,
            price: product.price,
            brand: product.brand,
        };
    
        if (inputCategory.trim()) {
            const userId = auth.currentUser?.uid; // Get current user ID
            if (userId) {
                try {
                    await addProductToUserCollection(userId, inputCategory, productData);
                    toast({ title: "Success", description: "Product added to collection!" });
                    setCategory(""); // Clear the category input
                } catch (error) {
                    console.error("Error adding product:", error);
                    toast({
                        title: "Error",
                        description: "Failed to add product to collection.",
                        variant: "destructive",
                    });
                }
            } else {
                toast({ title: "Error", description: "User not logged in." });
            }
        } else {
            toast({ title: "Error", description: "Please specify a category." });
        }
    };
    
    

    const handleKeyDown = async (e: React.KeyboardEvent<HTMLTextAreaElement>, product: Product) => {
        if (e.key === "Enter") {
            e.preventDefault(); // Prevent default behavior
            await handleProductAdd(product); // Call the add function
        }
    };

    return (
        <div className="flex flex-col h-screen bg-blue-200">
            <div className="flex items-center justify-between p-4">
                <button onClick={() => router.back()} className="flex items-center mr-4">
                    <BackIcon className="h-6 w-6 text-gray-600" />
                </button>
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
            <div className="flex-1 overflow-auto m-4">
                {messages.map((message) => (
                    <div key={message.id} className={`flex items-start gap-4 mb-4 mr-8 ${message.sender === "You" ? "justify-end" : ""}`}>
                        <Avatar className="w-8 h-8 border">
                            <AvatarImage src="/placeholder-user.jpg" />
                            <AvatarFallback>{message.sender.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="grid gap-2">
                            <div className="font-bold">{message.sender}</div>
                            <div className="prose text-gray-900" style={{ color: message.color }} dangerouslySetInnerHTML={{ __html: message.content }} />
                            {loading && message.id === loadingMessageId && (
                                <Skeleton className="w-[100px] h-[20px] rounded-full" />
                            )}
                            <div className="grid grid-cols-3 gap-2">
                                {message.products?.map((product, index) => (
                                    <div key={index} className="relative group">
                                        <img
                                            src={product.image}
                                            alt={`Product ${index}`}
                                            width={200}
                                            height={200}
                                            className="rounded-md object-cover"
                                        />
                                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <p className="font-bold">{product.brand}</p>
                                            <p>{product.price}</p>
                                            <a href={product.link} target="_blank" rel="noopener noreferrer" className="underline">View Product</a>
                                            <Popover>
                                                <PopoverTrigger>
                                                    <Button className="absolute top-2 right-2 p-2 text-sm bg-white text-black rounded-sm hover:text-white">Add</Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-32 p-2">
                                                    <Textarea 
                                                        placeholder="Category" 
                                                        value={inputCategory} 
                                                        onChange={handleCategory} 
                                                        onKeyDown={(e) => handleKeyDown(e, product)} // Handle key down event
                                                        className="resize-none h-12 w-full text-md" 
                                                    />
                                                    <div className="flex justify-end mt-2">
                                                        <Button onClick={() => handleProductAdd(product)} className="text-sm w-full">Submit</Button>
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <div className="bg-background p-4 border-t">
                <div className="flex items-center gap-2">
                    <Textarea
                        placeholder="Type your message..."
                        value={inputText}
                        onChange={handleInputChange}
                        className="flex-1 rounded-md border border-input bg-input px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-black"
                    />
                    <input
                        type="color"
                        value={selectedColor}
                        onChange={(e) => handleColorChange(e.target.value)}
                        className="w-10 h-10 rounded-full cursor-pointer"
                    />
                    <Button onClick={addColorToInput}>Add Color</Button>
                    <Button onClick={handleSubmit}>Send</Button>
                </div>
            </div>
        </div>
    );
}
