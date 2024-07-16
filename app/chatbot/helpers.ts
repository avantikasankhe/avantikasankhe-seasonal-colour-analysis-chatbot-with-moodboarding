// app/components/helpers.ts

import { GoogleGenerativeAI } from "@google/generative-ai";
import { getFirestore, collection, addDoc, doc, getDoc, setDoc, getDocs } from "firebase/firestore"; 

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
const db = getFirestore(); 


export async function addProductToUserCollection(userId: string, categoryName: string, product: any) {
    console.log("User ID:", userId);
    console.log("Category Name:", categoryName);
    console.log("Product ID:", product.id);
    console.log("Product to add:", product);

    const categoriesRef = collection(db, `users/${userId}/categories`);
    const categorySnapshot = await getDocs(categoriesRef);

    let categoryId = null;

    // Check if the category exists and retrieve its ID
    categorySnapshot.forEach(doc => {
        if (doc.data().name === categoryName) {
            categoryId = doc.id;
        }
    });

    // If the category does not exist, create it
    if (!categoryId) {
        const newCategoryRef = await addDoc(categoriesRef, { name: categoryName });
        categoryId = newCategoryRef.id;
        console.log(`New category created with ID: ${categoryId}`);
    }

    // Now, add the product to the category's products subcollection
    const productRef = doc(db, `users/${userId}/categories/${categoryId}/products`, product.id);
    const productDoc = await getDoc(productRef);

    if (!productDoc.exists()) {
        await setDoc(productRef, product);
        console.log(`Product added to category: ${categoryName}`);
    } else {
        await setDoc(productRef, product, { merge: true });
        console.log(`Product updated in category: ${categoryName}`);
    }
}

export async function addProductToUserOutfit(userId: string, outfitName: string, product: any) {
    const categoriesRef = collection(db, `users/${userId}/outfits`);
    const categorySnapshot = await getDocs(categoriesRef);

    let categoryId = null;

    // Check if the category exists and retrieve its ID
    categorySnapshot.forEach(doc => {
        if (doc.data().name === outfitName) {
            categoryId = doc.id;
        }
    });

    // If the category does not exist, create it
    if (!categoryId) {
        const newCategoryRef = await addDoc(categoriesRef, { name: outfitName });
        categoryId = newCategoryRef.id;
    }

    // Now, add or update the product in the category's products subcollection
    const productRef = doc(db, `users/${userId}/outfits/${categoryId}/products`, product.id);
    const productDoc = await getDoc(productRef);

    if (!productDoc.exists()) {
        await setDoc(productRef, product);
    } else {
        await setDoc(productRef, product, { merge: true });
    }
}


export async function loadProducts() {
  try {
    const response = await fetch('/products.json');
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const products = await response.json();
    return products; // Return the entire product list
  } catch (error) {
    console.error('Error loading products:', error);
    return []; // Return an empty array on error
  }
}

export async function Categorise(message: string) {
  const prompt = `Categorise the message into one of the following two types and return only the category number of the message.
  1. It is a request for a colour analysis from the given colours.
  2. It is a request to find products of a type and colour.
  If you need more information about the message, then say categorise it into type 1.
  Meesage: ${message}`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = await response.text(); // Await the response text
  return text; // Return the categorised result
}


export async function handleColorAnalysis(colors: string) {
    const prompt = `Welcome to the Seasonal Color Analysis System! Please provide three hex codes of colors that you feel best represent your natural coloring (e.g., your hair, eyes, and skin tone). Based on these hex codes, we will categorize you into one of the twelve established color seasons. These seasons take into account your warmth or coolness, saturation or brightness, and value (dark or light). Here's how it works:
  
  Warm vs. Cool:
  
  Warm seasons: Spring and Autumn
  Cool seasons: Summer and Winter
  Saturation/Brightness:
  
  Bright seasons: Winter and Spring
  Soft seasons: Summer and Autumn
  Value:
  
  Light seasons: Spring and Summer
  Deep seasons: Autumn and Winter
  Based on the hex codes you provide, we will identify your dominant season and suggest a palette of colors that complement your natural coloring. Here are the twelve color seasons and examples of their palettes:
  
  Bright Winter: #FF0000 (Red), #FFFFFF (White), #0000FF (Blue)
  True Winter: #0066CC (Blue), #FF00FF (Magenta), #333333 (Dark Grey)
  Deep Winter: #660000 (Deep Red), #000033 (Navy), #330066 (Deep Purple)
  Bright Spring: #FF9900 (Bright Orange), #FFFF33 (Bright Yellow), #00FF00 (Bright Green)
  True Spring: #FFCC00 (Golden Yellow), #FF6666 (Coral), #33CC33 (Grass Green)
  Light Spring: #FFFFCC (Light Yellow), #FFCCCC (Light Coral), #CCFFCC (Light Green)
  Light Summer: #CCFFFF (Light Blue), #FFCCCC (Light Pink), #CCCCFF (Lavender)
  True Summer: #66CCCC (Teal), #FF99CC (Soft Pink), #6699FF (Sky Blue)
  Soft Summer: #999999 (Grey), #CC9999 (Dusty Pink), #99CCCC (Soft Teal)
  Soft Autumn: #996633 (Brown), #CC9966 (Soft Brown), #669966 (Olive)
  True Autumn: #CC3300 (Rust), #996600 (Mustard), #663300 (Dark Brown)
  Deep Autumn: #660000 (Deep Red), #333300 (Olive Green), #000000 (Black)
  
  The colours of the person are ${colors}
  
  Return the color season, the best looking colours on them and the colours they should avoid.
  If you need more information, tell the user to provide more information and what information.`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = await response.text();
    const formattedResponse = text // Bold text
      .replace(/\*\s\*\*(.*?)\*\*\s/g, '<br /><strong>$1</strong>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<br />$1')
      .replace(/(#\w{6})/g, `<span style="color: $1;"><b>$1</b></span>`)
    console.log("Color Analysis Result:", text);
    return formattedResponse;
  }

  export async function handleProductSearch(query: string) {
    const prompt = `Summarise the following query into a structured JSON format. 
    Return the result as: {"color": "colour", "product": "product", "gender": "gender"}.
    All of the categories may be null, return a null string instead. If brand is mentioned concatenate it with product.
    Query: ${query}`;
  
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = await response.text();
  
    // Clean the response by removing any unwanted markdown
    const cleanedText = text.replace(/```json|```/g, '').trim();
  
    try {
      const parsedResult = JSON.parse(cleanedText);
      let { color, product, gender } = parsedResult;
      color = color||'';
      product = product || ''
      gender = gender || ''
      console.log("Product Search Result:", { color, product, gender });
      return [color, product, gender];
    } catch (error) {
      console.error("Failed to parse product search result:", cleanedText, error);
      return ["", "", ""]; // Return empty strings if parsing fails
    }
  }

export async function runPythonScript(color: string, product: string, gender: string) {
  try {
    const response = await fetch('http://localhost:9000/run-script', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ args: [color, product, gender] }),
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.text();
    return data; // Return the response text
  } catch (error) {
    console.error('Error running Python script:', error);
    return 'Error running script'; // Return error message
  }
}
