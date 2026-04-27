import { NextResponse } from 'next/server';

export async function POST(req) {
  let gameName = "Unknown Game";

  try {
    const body = await req.json();
    gameName = body.gameName || "Unknown Game";
    const language = body.language || 'en';

    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey || apiKey === '' || apiKey === 'your_key_here') {
      return NextResponse.json({ description: "(Mock AI Mode) Please add your Gemini API Key to see the full description." }, { status: 200 });
    }

    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Using gemini-1.5-flash as it is fast and smart!
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // --- THE NEW, POWERFUL PROMPT ---
    const prompt = `You are a video game expert writing a highly detailed, structured e-commerce product description for the game "${gameName}". 
    The output MUST be entirely in ${language === 'mm' ? 'Myanmar (Burmese)' : 'English'}.

    Do NOT write generic marketing fluff. Provide real, specific facts about this exact game. Structure your response EXACTLY like this using bullet points:

    A short introductory sentence mentioning the developer and what the game is.
    
    * Story / Synopsis: (Briefly explain the plot or setting)
    * Genre & Gameplay: (Explain the mechanics, e.g., Third-person, RPG, Action-adventure)
    * Key Features: (Highlight 2 or 3 things that make this game unique)

    End with a single short sentence encouraging them to buy it at GameOver Store.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return NextResponse.json({ description: text }, { status: 200 });
    
  } catch (error) {
    console.error("====== AI GENERATION ERROR ======");
    console.error(error.message || error);
    console.error("=================================");
    
    return NextResponse.json({ 
      description: `(AI Unavailable) Could not connect to Google Gemini for "${gameName}". \n\nError: ${error.message}` 
    }, { status: 200 });
  }
}