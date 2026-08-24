import { useJarvisStore } from './store';

// ══════════════════════════════════════════════════════
// SMART ROUTER — JARVIS Brain (no Ollama needed)
// Handles: weather, stocks, habits, news, general knowledge,
// math, jokes, definitions, conversions, and more
// ══════════════════════════════════════════════════════

const now = () => new Date();
const timeStr = () => now().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
const dateStr = () => now().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

// ── Math evaluator (safe) ──
function evalMath(expr: string): string | null {
  try {
    // Only allow numbers, operators, parentheses, decimals, spaces
    const cleaned = expr.replace(/[^0-9+\-*/().%\s^]/g, '');
    if (!cleaned || cleaned.length > 50) return null;
    // Replace ^ with ** for exponentiation
    const jsExpr = cleaned.replace(/\^/g, '**');
    // eslint-disable-next-line no-eval
    const result = Function(`"use strict"; return (${jsExpr})`)();
    if (typeof result === 'number' && isFinite(result)) {
      return Number.isInteger(result) ? result.toLocaleString() : result.toFixed(2);
    }
    return null;
  } catch {
    return null;
  }
}

// ── Unit conversions ──
function handleConversion(text: string): string | null {
  const lower = text.toLowerCase();

  // Temperature
  const tempMatch = lower.match(/(\d+(?:\.\d+)?)\s*(celsius|centigrade|°c|c)\s*(to|in|into)\s*(fahrenheit|°f|f)/);
  if (tempMatch) {
    const c = parseFloat(tempMatch[1]);
    const f = (c * 9/5) + 32;
    return `${c}°C = ${f.toFixed(1)}°F`;
  }
  const tempMatch2 = lower.match(/(\d+(?:\.\d+)?)\s*(fahrenheit|°f|f)\s*(to|in|into)\s*(celsius|centigrade|°c|c)/);
  if (tempMatch2) {
    const f = parseFloat(tempMatch2[1]);
    const c = (f - 32) * 5/9;
    return `${f}°F = ${c.toFixed(1)}°C`;
  }

  // Distance
  if (lower.match(/(\d+(?:\.\d+)?)\s*(km|kilometer|kilometres?)\s*(to|in|into)\s*(miles?|mi)/)) {
    const km = parseFloat(lower.match(/(\d+)/)?.[1] || '0');
    return `${km} km = ${(km * 0.621371).toFixed(2)} miles`;
  }
  if (lower.match(/(\d+(?:\.\d+)?)\s*(miles?|mi)\s*(to|in|into)\s*(km|kilometer)/)) {
    const mi = parseFloat(lower.match(/(\d+)/)?.[1] || '0');
    return `${mi} miles = ${(mi * 1.60934).toFixed(2)} km`;
  }

  // Weight
  if (lower.match(/(\d+(?:\.\d+)?)\s*(kg|kilogram)\s*(to|in|into)\s*(lbs?|pounds?)/)) {
    const kg = parseFloat(lower.match(/(\d+)/)?.[1] || '0');
    return `${kg} kg = ${(kg * 2.20462).toFixed(2)} lbs`;
  }
  if (lower.match(/(\d+(?:\.\d+)?)\s*(lbs?|pounds?)\s*(to|in|into)\s*(kg|kilogram)/)) {
    const lbs = parseFloat(lower.match(/(\d+)/)?.[1] || '0');
    return `${lbs} lbs = ${(lbs * 0.453592).toFixed(2)} kg`;
  }

  // Currency (approximate rates)
  if (lower.match(/(\d+(?:\.\d+)?)\s*(usd|dollars?|\$)\s*(to|in|into)\s*(inr|rupees?|₹)/)) {
    const usd = parseFloat(lower.match(/(\d+)/)?.[1] || '0');
    return `₹${(usd * 83.5).toFixed(2)} INR (approximate rate)`;
  }
  if (lower.match(/(\d+(?:\.\d+)?)\s*(inr|rupees?|₹)\s*(to|in|into)\s*(usd|dollars?|\$)/)) {
    const inr = parseFloat(lower.match(/(\d+)/)?.[1] || '0');
    return `$${(inr / 83.5).toFixed(2)} USD (approximate rate)`;
  }

  return null;
}

// ── General knowledge ──
const KNOWLEDGE: Record<string, string> = {
  'what is the capital of india': 'The capital of India is New Delhi. It has been the capital since 1911, when the British moved it from Calcutta.',
  'what is the capital of usa': 'The capital of the United States is Washington, D.C. It was established as the capital in 1790.',
  'what is the capital of china': 'The capital of China is Beijing. It has served as the capital for most of the last 800 years.',
  'what is the capital of japan': 'The capital of Japan is Tokyo. It became the capital in 1868 when the Emperor moved from Kyoto.',
  'what is the capital of uk': 'The capital of the United Kingdom is London. It is one of the oldest and largest cities in the world.',
  'what is ai': 'Artificial Intelligence (AI) is the simulation of human intelligence by machines. It includes learning, reasoning, problem-solving, perception, and language understanding. You\'re talking to a basic form of AI right now!',
  'what is machine learning': 'Machine Learning is a subset of AI where systems learn patterns from data without being explicitly programmed. Examples include recommendation systems, image recognition, and natural language processing.',
  'what is n8n': 'n8n is a free, open-source workflow automation tool. It lets you connect different apps and services (like Gmail, Slack, databases) to create automated workflows without coding. Think of it as a visual IFTTT for businesses.',
  'what is electron': 'Electron is a framework for building cross-platform desktop apps using web technologies (HTML, CSS, JavaScript). Apps like VS Code, Slack, and Discord are built with Electron.',
  'what is react': 'React is a JavaScript library for building user interfaces, created by Meta (Facebook). It uses a component-based architecture and a virtual DOM for efficient rendering.',
  'what is ollama': 'Ollama is a tool that lets you run large language models (like Llama, Mistral, Gemma) locally on your machine. It\'s free, private, and works offline.',
  'what is chatgpt': 'ChatGPT is an AI chatbot made by OpenAI, based on the GPT (Generative Pre-trained Transformer) family of large language models. It can answer questions, write code, create content, and have conversations.',
  'what is web scraping': 'Web scraping is automatically extracting data from websites. Tools like Puppeteer, Cheerio, or BeautifulSoup can navigate web pages and extract information for analysis.',
  'what is seo': 'SEO (Search Engine Optimization) is the practice of optimizing your website to rank higher in search engine results. Key factors include content quality, keywords, backlinks, page speed, and mobile-friendliness.',
  'what is crm': 'CRM (Customer Relationship Management) is software for managing interactions with customers. Popular CRMs include HubSpot, Salesforce, and Zoho. They help track leads, deals, and customer communications.',
  'what is saas': 'SaaS (Software as a Service) is a cloud-based software delivery model where users access applications over the internet, usually via a subscription. Examples: Gmail, Slack, Notion, Zoom.',
  'what is api': 'API (Application Programming Interface) is a set of rules that allows different software applications to communicate with each other. REST APIs are the most common type, using HTTP requests.',
  'what is webhook': 'A webhook is a way for one app to send real-time data to another app when something happens. Unlike APIs (which you poll), webhooks push data automatically. Example: Stripe sends a webhook when a payment succeeds.',
  'what is sqlite': 'SQLite is a lightweight, serverless relational database engine. It stores the entire database in a single file. It\'s used in mobile apps, browsers, and IoT devices.',
  'what is tailwind css': 'Tailwind CSS is a utility-first CSS framework. Instead of writing custom CSS, you apply pre-built utility classes directly in your HTML/JSX. It\'s popular for rapid UI development.',
  'what is typescript': 'TypeScript is a superset of JavaScript that adds static typing. It helps catch errors at compile time rather than runtime. It\'s widely used in large-scale applications.',
  'what is docker': 'Docker is a platform for developing, shipping, and running applications in containers. Containers package an app with all its dependencies, ensuring it runs consistently across environments.',
  'what is git': 'Git is a distributed version control system for tracking changes in code. GitHub is a cloud platform for hosting Git repositories and collaborating on code.',
  'what is sql': 'SQL (Structured Query Language) is a language for managing and querying relational databases. Common operations: SELECT (read), INSERT (create), UPDATE (modify), DELETE (remove).',
  'what is rest api': 'A REST API is an architectural style for building web services. It uses HTTP methods (GET, POST, PUT, DELETE) to perform operations on resources identified by URLs. It\'s stateless and uses JSON for data exchange.',
  'what is graphql': 'GraphQL is a query language for APIs, created by Facebook. Unlike REST (which has fixed endpoints), GraphQL lets clients request exactly the data they need in a single request.',
  'what is kubernetes': 'Kubernetes (K8s) is an open-source container orchestration platform. It automates deploying, scaling, and managing containerized applications (usually Docker containers).',
  'what is devops': 'DevOps is a set of practices that combines software development (Dev) and IT operations (Ops). It aims to shorten the development lifecycle and provide continuous delivery with high quality.',
  'who is elon musk': 'Elon Musk is a South African-born American entrepreneur and businessman. He is the CEO of Tesla (electric vehicles), SpaceX (aerospace), and owner of X (formerly Twitter). He also founded Neuralink and The Boring Company.',
  'who is sam altman': 'Sam Altman is the CEO of OpenAI, the company behind ChatGPT. He is a prominent figure in the AI industry and was previously president of Y Combinator.',
  'what is github': 'GitHub is a cloud-based platform for version control and collaboration using Git. It hosts over 100 million repositories and is used by developers worldwide for code hosting, pull requests, and project management.',
  'what is prompt engineering': 'Prompt engineering is the art of crafting effective inputs (prompts) to get better outputs from AI language models. Good prompts are specific, provide context, and define the desired format.',
  'what is rag': 'RAG (Retrieval-Augmented Generation) is a technique that combines a language model with an external knowledge base. It retrieves relevant documents before generating a response, reducing hallucinations.',
  'what is fine tuning': 'Fine-tuning is the process of further training a pre-trained language model on specific data to customize it for a particular task. It\'s less resource-intensive than training from scratch.',
  'what is embedding': 'In AI, embeddings are numerical representations of text, images, or other data in a vector space. Similar items have similar embeddings. They\'re used in search, recommendations, and RAG systems.',
  'what is vector database': 'A vector database is designed to store and query high-dimensional vectors (embeddings). Popular ones include Pinecone, Weaviate, ChromaDB, and Milvus. They enable semantic search and similarity matching.',
  'what is hallucination': 'In AI, hallucination refers to when a language model generates confident-sounding but incorrect or fabricated information. It happens because LLMs predict likely next words without truly understanding facts.',
  'what is chain of thought': 'Chain of Thought (CoT) is a prompting technique where you ask the AI to explain its reasoning step-by-step before giving a final answer. It improves accuracy for complex tasks.',
  'what is zero shot': 'Zero-shot learning is when an AI model performs a task without having seen any examples of that task during training. It relies on its general understanding from pre-training.',
  'what is few shot': 'Few-shot learning is when an AI model learns a new task from just a few examples provided in the prompt. For example: "Here are 3 examples of sentiment analysis. Now analyze this text."',
};

// ── Jokes ──
const JOKES = [
  "Why do programmers prefer dark mode? Because light attracts bugs!",
  "Why was the JavaScript developer sad? Because he didn't Node how to Express himself.",
  "A SQL query walks into a bar, sees two tables, and asks: 'Can I join you?'",
  "Why do Java developers wear glasses? Because they can't C#.",
  "What's a programmer's favorite hangout place? Foo Bar.",
  "How many programmers does it take to change a light bulb? None — that's a hardware problem.",
  "Why do programmers hate nature? It has too many bugs.",
  "What's the object-oriented way to become wealthy? Inheritance.",
  "Why did the developer go broke? Because he used up all his cache.",
  "What do you call a computer that sings? A-Dell.",
  "Why was the computer cold? It left its Windows open!",
  "What's a robot's favorite type of music? Heavy metal.",
];

// ── Motivational quotes ──
const QUOTES = [
  "The best way to predict the future is to create it. — Peter Drucker",
  "Code is like humor. When you have to explain it, it's bad. — Cory House",
  "First, solve the problem. Then, write the code. — John Johnson",
  "The only way to do great work is to love what you do. — Steve Jobs",
  "Talk is cheap. Show me the code. — Linus Torvalds",
  "Programs must be written for people to read. — Harold Abelson",
  "Simplicity is the soul of efficiency. — Austin Freeman",
  "Make it work, make it right, make it fast. — Kent Beck",
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ══════════════════════════════════════════════════════
// MAIN ROUTER
// ══════════════════════════════════════════════════════

export function getSmartResponse(text: string): string {
  const lower = text.toLowerCase().trim();

  // ── Greetings ──
  if (/^(hi|hello|hey|howdy|sup|yo|greetings|good\s*(morning|afternoon|evening|night))\b/.test(lower)) {
    const hour = now().getHours();
    let greeting = 'Good evening';
    if (hour >= 5 && hour < 12) greeting = 'Good morning';
    else if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
    return `${greeting}, sir. How may I assist you today? I can help with weather, stocks, habits, news, math, conversions, general knowledge, and more.`;
  }

  // ── Identity ──
  if (/who are you|what are you|what's your name|introduce yourself/.test(lower)) {
    return "I am JARVIS — Just A Rather Very Intelligent System. Your personal AI assistant running locally on your machine. I can help with Indian stocks, Chennai weather, news, habits, math, unit conversions, general knowledge, and much more. Ask me anything, sir.";
  }

  // ── Capabilities ──
  if (/what can you do|what do you know|help|commands|capabilities|features/.test(lower)) {
    return `Here's what I can help with, sir:

📊 **Stocks** — "How's the market?" / "What's the Nifty at?"
🌤️ **Weather** — "What's the weather in Chennai?"
📰 **News** — "What's happening in the news?"
✅ **Habits** — "Show my habits" / "How are my habits?"
⏰ **Time/Date** — "What time is it?" / "What's the date?"
🧮 **Math** — "What's 245 * 38?" / "What's 15% of 850?"
🔄 **Conversions** — "Convert 100 USD to INR" / "10 km in miles"
📚 **Knowledge** — "What is API?" / "Explain machine learning"
😂 **Fun** — "Tell me a joke" / "Give me a quote"
and much more — just ask!`;
  }

  // ── Weather ──
  if (/weather|temperature|temp\b|climate|humidity|rain|forecast|hot|cold|warm/.test(lower)) {
    const w = useJarvisStore.getState().weather;
    if (w) {
      let resp = `Currently in Chennai it's ${w.temp}°C and ${w.condition}, sir. Feels like ${w.feelsLike}°C. Humidity is at ${w.humidity}%, wind ${w.windSpeed} km/h from the ${w.windDirection}.`;
      if (w.aqi > 0) resp += ` The air quality index is ${w.aqi}, rated ${w.aqiLevel}.`;
      if (w.dailyForecast.length > 0) {
        resp += ` Tomorrow: high ${w.dailyForecast[0].high}°C, low ${w.dailyForecast[0].low}°C.`;
      }
      return resp;
    }
    return "Weather data isn't loaded yet, sir. Please check back in a moment.";
  }

  // ── Stocks / Market ──
  if (/stock|nifty|sensex|market|share|trading|invest|bse|nse|bank nifty|reliance|tcs|hdfc|infy|icici|sbi|airtel|itc|lt|tata/.test(lower)) {
    const { indianIndices, sectorIndices, stockWatchlist, stockMarketStatus } = useJarvisStore.getState();

    // Specific stock request
    const stockNames: Record<string, string> = {
      reliance: 'RELIANCE.NS', tcs: 'TCS.NS', hdfc: 'HDFCBANK.NS', hdfcbank: 'HDFCBANK.NS',
      infosys: 'INFY.NS', infy: 'INFY.NS', icici: 'ICICIBANK.NS', sbi: 'SBIN.NS',
      airtel: 'BHARTIARTL.NS', itc: 'ITC.NS', lnt: 'LT.NS', 'l&t': 'LT.NS', tata: 'TATAMOTORS.NS',
    };
    for (const [name, symbol] of Object.entries(stockNames)) {
      if (lower.includes(name)) {
        const stock = stockWatchlist.find(s => s.symbol === symbol);
        if (stock) {
          return `${stock.name} (NSE: ${stock.symbol.replace('.NS', '')}) is trading at ₹${stock.price.toLocaleString('en-IN')}, ${stock.changePercent >= 0 ? 'up' : 'down'} ${Math.abs(stock.changePercent).toFixed(2)}%. Day range: ₹${stock.dayLow.toLocaleString('en-IN')} - ₹${stock.dayHigh.toLocaleString('en-IN')}.`;
        }
      }
    }

    if (indianIndices.length > 0) {
      const nifty = indianIndices.find(i => i.symbol === '^NSEI');
      const sensex = indianIndices.find(i => i.symbol === '^BSESN');
      const bankNifty = indianIndices.find(i => i.symbol === '^NSEBANK');
      let resp = `Market update, sir. Markets are currently ${stockMarketStatus}. `;
      if (nifty) resp += `Nifty 50 at ${nifty.price.toLocaleString('en-IN')}, ${nifty.changePercent >= 0 ? 'up' : 'down'} ${Math.abs(nifty.changePercent).toFixed(2)}%. `;
      if (sensex) resp += `Sensex at ${sensex.price.toLocaleString('en-IN')}, ${sensex.changePercent >= 0 ? 'up' : 'down'} ${Math.abs(sensex.changePercent).toFixed(2)}%. `;
      if (bankNifty) resp += `Bank Nifty at ${bankNifty.price.toLocaleString('en-IN')}, ${bankNifty.changePercent >= 0 ? 'up' : 'down'} ${Math.abs(bankNifty.changePercent).toFixed(2)}%. `;
      if (sectorIndices.length > 0) {
        const topSectors = sectorIndices.slice(0, 3).map(s => `${s.name} ${s.changePercent >= 0 ? '+' : ''}${s.changePercent.toFixed(2)}%`).join(', ');
        resp += `Sector highlights: ${topSectors}.`;
      }
      return resp;
    }
    return "Market data isn't loaded yet, sir. Please check the Stocks page for live data.";
  }

  // ── Habits ──
  if (/habit|streak|routine|daily|exercise|meditat|reading|journal/.test(lower)) {
    return "I can see your habits on the Dashboard and Habits page, sir. You have Exercise (12 days 🔥), Read 30min (7 days), Meditate (21 days 🔥), and Code Review (5 days). To customize habits, go to the Habits page — you can add, edit, or remove habits there. Would you like me to suggest a new habit routine?";
  }

  // ── News ──
  if (/news|headline|article|what's happening|current events|latest/.test(lower)) {
    const articles = useJarvisStore.getState().newsArticles;
    if (articles.length > 0) {
      const top = articles.slice(0, 3);
      let resp = "Here are the latest headlines, sir:\n\n";
      top.forEach((a, i) => { resp += `${i + 1}. ${a.title} (${a.source}, ${a.publishedAt ? Math.floor((Date.now() - a.publishedAt) / 3600000) + 'h ago' : 'recently'})\n`; });
      resp += "\nVisit the News page for the full feed with more sources.";
      return resp;
    }
    return "News feed is loading, sir. Check the News page for the latest articles.";
  }

  // ── Time ──
  if (/\b(time|what time|current time|clock)\b/.test(lower) && !lower.includes('real time')) {
    return `The current time is ${timeStr()}, sir. Today is ${dateStr()}.`;
  }

  // ── Date ──
  if (/\b(date|what day|today|what date|day is it)\b/.test(lower)) {
    return `Today is ${dateStr()}, sir. The time is ${timeStr()}.`;
  }

  // ── Math ──
  const mathMatch = lower.match(/(?:what(?:'s| is|s)|calculate|compute|solve|evaluate|find)\s+([\d\s+\-*/().%^]+)/i) || lower.match(/^([\d\s+\-*/().%^]{3,})$/);
  if (mathMatch) {
    const result = evalMath(mathMatch[1]);
    if (result) return `The answer is **${result}**, sir.`;
  }

  // ── Percentages ──
  const pctMatch = lower.match(/(?:what(?:'s| is|s)|calculate)\s+(\d+(?:\.\d+)?)\s*%\s*(?:of)\s+(\d+(?:\.\d+)?)/);
  if (pctMatch) {
    const pct = parseFloat(pctMatch[1]);
    const val = parseFloat(pctMatch[2]);
    return `${pct}% of ${val} = **${(pct / 100 * val).toFixed(2)}**, sir.`;
  }

  // ── Conversions ──
  const conversion = handleConversion(lower);
  if (conversion) return conversion;

  // ── Jokes ──
  if (/\bjoke|funny|humor|laugh|make me laugh\b/.test(lower)) {
    return pickRandom(JOKES);
  }

  // ── Quotes ──
  if (/\bquote|motivat|inspirat|wisdom\b/.test(lower)) {
    return pickRandom(QUOTES);
  }

  // ── Thanks ──
  if (/thank|thanks|thx|appreciate|cheers/.test(lower)) {
    return "You're welcome, sir. Always at your service.";
  }

  // ── Goodbye ──
  if (/bye|goodbye|see you|good night|gn|sleep|logout/.test(lower)) {
    return "Good night, sir. I'll be here when you need me. Sleep well.";
  }

  // ── Status ──
  if (/how are you|how's it going|how do you feel|you ok/.test(lower)) {
    return "All systems operational, sir. Weather data refreshed, markets monitored, news feeds active. Ready for your next command.";
  }

  // ── Name ──
  if (/your name|what's your name|what are you called/.test(lower)) {
    return "My name is JARVIS — Just A Rather Very Intelligent System. Named after the AI from the Iron Man universe.";
  }

  // ── Creator ──
  if (/who (made|created|built|designed) you|your creator|your maker|who made you/.test(lower)) {
    return "I was built by you, sir — with the power of Electron, React, TypeScript, and a lot of coffee. My brain runs on Ollama with Llama 3.2 when connected.";
  }

  // ── How old / when ──
  if (/how old|when were you|when did you|your age/.test(lower)) {
    return "I was just born recently, sir — still learning and growing every day. But my knowledge covers a wide range of topics.";
  }

  // ── Meaning of life ──
  if (/meaning of life|42|purpose of life/.test(lower)) {
    return "42. Obviously. But between you and me, I think the meaning is to keep learning, building, and helping others. Just like what we're doing right now, sir.";
  }

  // ── Comparison questions ──
  if (/difference between|compare|vs|versus/.test(lower)) {
    if (/react and angular|react vs angular/.test(lower)) return "React is a library focused on UI, maintained by Meta. Angular is a full framework by Google. React is more flexible and easier to learn; Angular is more opinionated but great for large enterprise apps.";
    if (/python and javascript|python vs javascript/.test(lower)) return "Python is great for data science, AI/ML, and scripting. JavaScript rules the web (frontend + backend via Node). Python has cleaner syntax; JavaScript is more versatile for web development.";
    if (/sql and nosql|sql vs nosql/.test(lower)) return "SQL databases (MySQL, PostgreSQL) use structured tables and are great for complex queries. NoSQL (MongoDB, Redis) are flexible, schema-less, and scale better for unstructured data.";
    if (/rest and graphql|rest vs graphql/.test(lower)) return "REST uses multiple endpoints with fixed data structures. GraphQL uses a single endpoint where clients request exactly what they need. GraphQL reduces over-fetching; REST is simpler to set up.";
    return "Could you be more specific about what you'd like me to compare, sir? I can compare technologies, concepts, tools, and more.";
  }

  // ── How to questions ──
  if (/^(how do|how to|how can|how does|how is|how to)\b/.test(lower)) {
    if (/learn (coding|programming|code)/.test(lower)) return "Start with Python or JavaScript — both are beginner-friendly. Use free resources: freeCodeCamp, The Odin Project, Codecademy. Practice daily on LeetCode or HackerRank. Build small projects to solidify concepts.";
    if (/learn web development|learn web dev/.test(lower)) return "Start with HTML → CSS → JavaScript. Then pick a framework: React (most popular), Vue (easiest), or Angular (enterprise). Build projects as you learn. Use freeCodeCamp, MDN docs, and YouTube tutorials.";
    if (/start a (business|startup)/.test(lower)) return "1) Find a real problem people have. 2) Build an MVP (minimum viable product). 3) Get feedback from real users. 4) Iterate based on feedback. 5) Focus on one thing and do it well. Use no-code tools (Bubble, Webflow) to launch fast.";
    if (/make money (online|from home)/.test(lower)) return "Options include: freelancing (web dev, design), building SaaS products, affiliate marketing, content creation (YouTube, blogging), e-commerce (Shopify), and consulting. Start with skills you already have.";
    return "That's a great question, sir. Could you be more specific? I can help with programming, web development, business, AI, and many other topics.";
  }

  // ── What is questions (knowledge base) ──
  for (const [key, value] of Object.entries(KNOWLEDGE)) {
    if (lower.includes(key) || lower === key) return value;
  }

  // ── Fuzzy knowledge matching ──
  for (const [key, value] of Object.entries(KNOWLEDGE)) {
    const words = key.split(' ');
    const matchCount = words.filter(w => lower.includes(w)).length;
    if (matchCount >= Math.ceil(words.length * 0.7)) return value;
  }

  // ── Generic but helpful fallback ──
  return `I received your message, sir: "${text}"

I can help you with:
• **Weather** — "What's the weather in Chennai?"
• **Stocks** — "How's the Nifty doing?" / "What's the price of Reliance?"
• **News** — "What's in the news?"
• **Habits** — "How are my habits?"
• **Time/Date** — "What time is it?"
• **Math** — "What's 245 * 38?"
• **Conversions** — "Convert 100 USD to INR"
• **Knowledge** — "What is API?" / "Explain machine learning"
• **Fun** — "Tell me a joke" / "Give me a quote"

For full AI-powered responses, connect Ollama in Settings.`;
}
