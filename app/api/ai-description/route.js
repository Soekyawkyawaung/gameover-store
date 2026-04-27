import { NextResponse } from 'next/server';

export async function POST(req) {
  let gameName = "Unknown Game";

  try {
    const body = await req.json();
    gameName = body.gameName || "Unknown Game";
    const language = body.language || 'en';

    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey || apiKey === '' || apiKey === 'your_key_here') {
      console.log("No valid API key found. Using Mock AI Mode.");
      const demoText = language === 'mm' 
        ? `(Mock AI Mode) ${gameName} သည် အကောင်းဆုံးဂိမ်းတစ်ခုဖြစ်ပါတယ်။ စိတ်ဝင်စားဖွယ်ကောင်းသော ကစားကွက်များနှင့် ရုပ်ထွက်များကို ခံစားကြည့်ရှုလိုက်ပါ။ ယခုပဲ GameOver Store တွင် ဝယ်ယူလိုက်ပါ။`
        : `(Mock AI Mode) Get ready for an epic adventure in ${gameName}! Experience thrilling gameplay, stunning visuals, and an unforgettable story. Buy it now at GameOver Store.`;
      
      return NextResponse.json({ description: demoText }, { status: 200 });
    }

    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // FIXED: Permanently set to gemini-pro to bypass the 404 error
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `Write an exciting and engaging e-commerce product description for the video game called "${gameName}". 
    The language MUST be exactly in ${language === 'mm' ? 'Myanmar (Burmese)' : 'English'}.
    Make it persuasive, highlight why it's fun, and keep it around 3 sentences. Do not use asterisks or markdown formatting, just plain text.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return NextResponse.json({ description: text }, { status: 200 });
    
  } catch (error) {
    console.error("====== AI GENERATION ERROR ======");
    console.error(error.message || error);
    console.error("=================================");
    
    return NextResponse.json({ 
      description: `(AI Unavailable) Could not connect to Google Gemini for "${gameName}". \n\nError: ${error.message} \n\nPlease write your description manually or check your API key settings in Google AI Studio.` 
    }, { status: 200 });
  }
}