import { useJarvisStore } from './store';

// ══════════════════════════════════════════════════════
// SMART ROUTER — JARVIS Brain v2 (no Ollama needed)
// Handles 200+ topics: programming, science, history,
// geography, business, math, conversions, stocks,
// weather, news, habits, jokes, and general knowledge
// ══════════════════════════════════════════════════════

const now = () => new Date();
const timeStr = () => now().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
const dateStr = () => now().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

// ── Math evaluator (safe) ──
function evalMath(expr: string): string | null {
  try {
    const cleaned = expr.replace(/[^0-9+\-*/().%\s^]/g, '');
    if (!cleaned || cleaned.length > 50) return null;
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

  if (lower.match(/(\d+(?:\.\d+)?)\s*(km|kilometer|kilometres?)\s*(to|in|into)\s*(miles?|mi)/)) {
    const km = parseFloat(lower.match(/(\d+)/)?.[1] || '0');
    return `${km} km = ${(km * 0.621371).toFixed(2)} miles`;
  }
  if (lower.match(/(\d+(?:\.\d+)?)\s*(miles?|mi)\s*(to|in|into)\s*(km|kilometer)/)) {
    const mi = parseFloat(lower.match(/(\d+)/)?.[1] || '0');
    return `${mi} miles = ${(mi * 1.60934).toFixed(2)} km`;
  }

  if (lower.match(/(\d+(?:\.\d+)?)\s*(kg|kilogram)\s*(to|in|into)\s*(lbs?|pounds?)/)) {
    const kg = parseFloat(lower.match(/(\d+)/)?.[1] || '0');
    return `${kg} kg = ${(kg * 2.20462).toFixed(2)} lbs`;
  }
  if (lower.match(/(\d+(?:\.\d+)?)\s*(lbs?|pounds?)\s*(to|in|into)\s*(kg|kilogram)/)) {
    const lbs = parseFloat(lower.match(/(\d+)/)?.[1] || '0');
    return `${lbs} lbs = ${(lbs * 0.453592).toFixed(2)} kg`;
  }

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

// ══════════════════════════════════════════════════════
// MASSIVE KNOWLEDGE BASE — 200+ topics
// ══════════════════════════════════════════════════════
const KNOWLEDGE: Record<string, string> = {
  // ── Programming Languages ──
  'c': 'C is a general-purpose, procedural programming language developed by Dennis Ritchie at Bell Labs in 1972. It provides low-level access to memory, simple keywords, and efficient machine-level code. C is the foundation of many modern languages (C++, Java, Python, Go, Rust). It\'s used in operating systems (Linux, Windows), embedded systems, databases (MySQL, PostgreSQL), and performance-critical applications. Key features: pointers, manual memory management, preprocessor macros, and direct hardware interaction.',
  'c programming': 'C is a general-purpose, procedural programming language developed by Dennis Ritchie at Bell Labs in 1972. It provides low-level access to memory, simple keywords, and efficient machine-level code. C is the foundation of many modern languages (C++, Java, Python, Go, Rust). It\'s used in operating systems (Linux, Windows), embedded systems, databases (MySQL, PostgreSQL), and performance-critical applications. Key features: pointers, manual memory management, preprocessor macros, and direct hardware interaction.',
  'c language': 'C is a general-purpose, procedural programming language developed by Dennis Ritchie at Bell Labs in 1972. It provides low-level access to memory, simple keywords, and efficient machine-level code. C is the foundation of many modern languages (C++, Java, Python, Go, Rust). It\'s used in operating systems (Linux, Windows), embedded systems, databases (MySQL, PostgreSQL), and performance-critical applications. Key features: pointers, manual memory management, preprocessor macros, and direct hardware interaction.',
  'c++': 'C++ is a powerful, general-purpose programming language created by Bjarne Stroustrup in 1979 as an extension of C. It supports object-oriented programming, generic programming (templates), and low-level memory manipulation. C++ is used in game engines (Unreal), browsers (Chrome), databases, operating systems, embedded systems, and high-performance computing. Key features: classes, inheritance, polymorphism, templates, RAII, STL (Standard Template Library), and zero-overhead abstractions.',
  'c++ programming': 'C++ is a powerful, general-purpose programming language created by Bjarne Stroustrup in 1979 as an extension of C. It supports object-oriented programming, generic programming (templates), and low-level memory manipulation. C++ is used in game engines (Unreal), browsers (Chrome), databases, operating systems, embedded systems, and high-performance computing. Key features: classes, inheritance, polymorphism, templates, RAII, STL (Standard Template Library), and zero-overhead abstractions.',
  'python': 'Python is a high-level, interpreted programming language created by Guido van Rossum in 1991. It emphasizes code readability with its significant whitespace syntax. Python is incredibly versatile: web development (Django, Flask), data science (Pandas, NumPy, Matplotlib), AI/ML (TensorFlow, PyTorch), automation, scripting, and scientific computing. It has a massive standard library and community. Python is the #1 language for beginners and the most popular language for AI/ML.',
  'python programming': 'Python is a high-level, interpreted programming language created by Guido van Rossum in 1991. It emphasizes code readability with its significant whitespace syntax. Python is incredibly versatile: web development (Django, Flask), data science (Pandas, NumPy, Matplotlib), AI/ML (TensorFlow, PyTorch), automation, scripting, and scientific computing. It has a massive standard library and community. Python is the #1 language for beginners and the most popular language for AI/ML.',
  'java': 'Java is a class-based, object-oriented programming language developed by James Gosling at Sun Microsystems in 1995. It follows the "write once, run anywhere" principle via the Java Virtual Machine (JVM). Java is used in enterprise applications, Android app development, web servers (Tomcat, Spring), big data (Hadoop, Spark), and financial systems. Key features: garbage collection, strong typing, platform independence, and extensive enterprise libraries.',
  'java programming': 'Java is a class-based, object-oriented programming language developed by James Gosling at Sun Microsystems in 1995. It follows the "write once, run anywhere" principle via the Java Virtual Machine (JVM). Java is used in enterprise applications, Android app development, web servers (Tomcat, Spring), big data (Hadoop, Spark), and financial systems. Key features: garbage collection, strong typing, platform independence, and enterprise libraries.',
  'javascript': 'JavaScript is a dynamic, interpreted programming language primarily used for web development. Created by Brendan Eich at Netscape in 1995, it\'s the language of the web browser. JavaScript is used for frontend (React, Vue, Angular), backend (Node.js, Deno, Bun), mobile apps (React Native), desktop apps (Electron), and even games. It uses prototypal inheritance, first-class functions, and event-driven programming.',
  'javascript programming': 'JavaScript is a dynamic, interpreted programming language primarily used for web development. Created by Brendan Eich at Netscape in 1995, it\'s the language of the web browser. JavaScript is used for frontend (React, Vue, Angular), backend (Node.js, Deno, Bun), mobile apps (React Native), desktop apps (Electron), and even games. It uses prototypal inheritance, first-class functions, and event-driven programming.',
  'typescript': 'TypeScript is a superset of JavaScript developed by Microsoft that adds static typing. It catches errors at compile time, provides better IDE support, and scales well for large codebases. TypeScript compiles to plain JavaScript and is used in Angular, React projects, Node.js backends, and enterprise applications. Features: interfaces, generics, decorators, enums, type inference, and conditional types.',
  'rust': 'Rust is a systems programming language created by Graydon Hoare at Mozilla, first released in 2015. It focuses on safety, speed, and concurrency without garbage collection. Rust uses an ownership system that prevents data races at compile time. It\'s used in operating systems (Redox), web browsers (Servo), game engines, embedded systems, and CLI tools. Consistently voted "most loved language" on Stack Overflow.',
  'go': 'Go (Golang) is a statically typed language created at Google by Robert Griesemer, Rob Pike, and Ken Thompson in 2009. It\'s designed for simplicity, concurrency, and fast compilation. Go uses goroutines for lightweight concurrency. It\'s used in cloud infrastructure (Docker, Kubernetes), microservices, CLI tools, web servers, and distributed systems. Go compiles to native machine code with no runtime overhead.',
  'ruby': 'Ruby is a dynamic, object-oriented programming language created by Yukihiro Matsumoto in 1995. It\'s designed for programmer happiness with elegant syntax. Ruby is best known for Ruby on Rails, a powerful web framework. It\'s used for web development, scripting, prototyping, and automation. Everything in Ruby is an object, and it supports mixins, blocks, and metaprogramming.',
  'php': 'PHP is a server-side scripting language designed for web development. Created by Rasmus Lerdorf in 1994, it powers about 77% of websites with known server-side languages. PHP runs on virtually every web server and platform. Modern PHP (8.x) is much improved with JIT compilation, union types, and attributes. Used in WordPress, Facebook (originally), Wikipedia, and millions of websites.',
  'swift': 'Swift is a powerful programming language for iOS, macOS, watchOS, and tvOS development, created by Apple in 2014. It\'s designed to be safe, fast, and expressive. Swift replaces Objective-C for Apple platform development. It uses optionals for null safety, protocol-oriented programming, and has modern features like closures, generics, and type inference.',
  'kotlin': 'Kotlin is a modern programming language that runs on the JVM, created by JetBrains in 2011. It\'s Google\'s preferred language for Android development since 2019. Kotlin is fully interoperable with Java, has null safety, coroutines for async programming, data classes, and extension functions. It\'s also used for server-side (Ktor), multiplatform (KMM), and web development.',
  'scala': 'Scala is a hybrid functional/object-oriented language that runs on the JVM, created by Martin Odersky in 2003. It combines OOP and functional programming in a concise, type-safe way. Scala is used in big data (Apache Spark, Kafka, Flink), web applications (Play Framework), and distributed systems. It\'s known for its powerful type system and expressive syntax.',
  'r': 'R is a programming language and environment designed for statistical computing and graphics. Created by Ross Ihaka and Robert Gentleman in 1993, it\'s the dominant language for data analysis, statistics, and bioinformatics. R has over 18,000 packages on CRAN, including ggplot2 (visualization), dplyr (data manipulation), and caret (machine learning). It uses vectorized operations for efficient data processing.',
  'matlab': 'MATLAB is a proprietary programming language and environment for numerical computing, developed by MathWorks. It\'s widely used in engineering, mathematics, physics, and scientific research. MATLAB excels at matrix operations, data visualization, signal processing, and simulation. It includes toolboxes for control systems, image processing, neural networks, and optimization.',
  'dart': 'Dart is a client-optimized programming language developed by Google in 2011. It\'s the language behind Flutter, Google\'s cross-platform UI framework for building mobile, web, and desktop apps from a single codebase. Dart compiles to native code (AOT) for production and JavaScript for web. It features sound null safety, async/await, and a rich set of core libraries.',
  'perl': 'Perl is a high-level, interpreted language created by Larry Wall in 1987. It was designed for text processing and is excellent at regular expressions, system administration, and network programming. Perl powers much of the internet\'s infrastructure, including CGI scripts, log analysis, and bioinformatics. Perl 6 evolved into a separate language called Raku.',
  'haskell': 'Haskell is a purely functional programming language with strong static typing, created in 1990. It uses lazy evaluation, monads for side effects, and has a powerful type system with type inference. Haskell is used in academia, finance, and companies like Facebook (anti-spam), GitHub, and Standard Chartered Bank. It promotes mathematical reasoning about programs.',
  'shell scripting': 'Shell scripting involves writing commands for Unix/Linux shells (Bash, Zsh, Fish). Shell scripts automate system administration, file manipulation, process management, and workflow automation. Common use cases: cron jobs, CI/CD pipelines, server setup, data processing, and log analysis. Bash is available on virtually every Unix system and is essential for DevOps.',

  // ── Web Development ──
  'react': 'React is a JavaScript library for building user interfaces, created by Meta (Facebook) in 2013. It uses a component-based architecture with a virtual DOM for efficient rendering. React uses JSX (JavaScript + HTML), hooks (useState, useEffect), and one-way data flow. It\'s the most popular frontend framework, used by Netflix, Instagram, Airbnb, and millions of apps.',
  'vue': 'Vue.js is a progressive JavaScript framework for building user interfaces, created by Evan You in 2014. It\'s designed to be incrementally adoptable. Vue combines an HTML-based template syntax with reactive data binding and a composition API. It\'s lighter than React/Angular and easier to learn. Used by GitLab, Nintendo, and Alibaba.',
  'angular': 'Angular is a full-featured MVC framework for building web applications, maintained by Google. It uses TypeScript, dependency injection, RxJS for reactive programming, and a comprehensive CLI. Angular is opinionated and provides everything out of the box (routing, forms, HTTP, testing). It\'s popular in enterprise applications (IBM, Microsoft, Deutsche Bank).',
  'next.js': 'Next.js is a React framework for production, created by Vercel. It provides server-side rendering (SSR), static site generation (SSG), API routes, file-based routing, image optimization, and edge computing. Next.js is used by TikTok, Twitch, Hulu, Nike, and many others. It\'s the most popular React meta-framework.',
  'svelte': 'Svelte is a compiler-based UI framework created by Rich Harris. Unlike React/Vue, Svelte compiles your components to efficient vanilla JavaScript at build time — no virtual DOM. This produces smaller, faster bundles. SvelteKit is its meta-framework for server-side rendering and routing. Used by Apple, The New York Times, and Spotify.',
  'html': 'HTML (HyperText Markup Language) is the standard markup language for creating web pages. HTML5 introduced semantic elements (header, nav, article, footer), canvas for graphics, native video/audio, local storage, and accessibility features. HTML defines the structure and content of web pages and works with CSS for styling and JavaScript for interactivity.',
  'css': 'CSS (Cascading Style Sheets) is the language for styling web pages. CSS3 introduced flexbox, grid, animations, transitions, custom properties (variables), media queries for responsive design, and filters. Modern CSS includes container queries, cascade layers, and the :has() selector. CSS frameworks like Tailwind, Bootstrap, and Bulma simplify styling.',
  'tailwind css': 'Tailwind CSS is a utility-first CSS framework. Instead of writing custom CSS, you apply pre-built utility classes directly in your HTML/JSX. It\'s popular for rapid UI development and eliminates the need for most custom CSS. Used by GitHub, Netflix, Shopify, and OpenAI.',
  'sass': 'Sass (Syntactically Awesome Style Sheets) is a CSS preprocessor that adds variables, nesting, mixins, functions, and modules to CSS. It compiles to plain CSS. SCSS (Sassy CSS) is the most popular syntax. Sass helps organize large stylesheets and reduces CSS repetition.',
  'bootstrap': 'Bootstrap is the most popular CSS framework for building responsive, mobile-first websites. Created by Twitter, it provides a grid system, pre-built components (buttons, cards, modals), JavaScript plugins, and utility classes. Bootstrap 5 dropped jQuery dependency and uses vanilla JavaScript.',
  'graphql': 'GraphQL is a query language for APIs, created by Facebook in 2012. Unlike REST (multiple endpoints), GraphQL uses a single endpoint where clients request exactly the data they need. This prevents over-fetching and under-fetching. Used by GitHub, Facebook, Shopify, and Twitter. Apollo and Relay are popular GraphQL clients.',
  'rest api': 'REST (Representational State Transfer) is an architectural style for building web services using HTTP. RESTful APIs use HTTP methods (GET, POST, PUT, DELETE) to operate on resources identified by URLs. They\'re stateless, use standard HTTP status codes, and typically exchange JSON data. REST is the most common API architecture.',
  'web scraping': 'Web scraping is automatically extracting data from websites. Tools like Puppeteer, Cheerio, BeautifulSoup, and Scrapy can navigate web pages and extract information. It\'s used for price monitoring, lead generation, market research, and content aggregation. Always respect robots.txt and terms of service.',

  // ── AI & Machine Learning ──
  'ai': 'Artificial Intelligence (AI) is the simulation of human intelligence by machines. It includes learning, reasoning, problem-solving, perception, and language understanding. Modern AI includes narrow AI (specific tasks like image recognition), general AI (human-level reasoning — not yet achieved), and superintelligent AI (hypothetical). You\'re talking to a basic form of AI right now!',
  'artificial intelligence': 'Artificial Intelligence (AI) is the simulation of human intelligence by machines. It includes learning, reasoning, problem-solving, perception, and language understanding. Modern AI includes narrow AI (specific tasks like image recognition), general AI (human-level reasoning — not yet achieved), and superintelligent AI (hypothetical). You\'re talking to a basic form of AI right now!',
  'machine learning': 'Machine Learning is a subset of AI where systems learn patterns from data without being explicitly programmed. Types include supervised learning (labeled data), unsupervised learning (finding patterns), and reinforcement learning (learning from rewards). Used in recommendation systems, image recognition, NLP, and predictive analytics.',
  'deep learning': 'Deep Learning is a subset of machine learning using artificial neural networks with multiple layers. It excels at complex tasks like image recognition, natural language processing, speech recognition, and autonomous driving. Frameworks: TensorFlow, PyTorch, Keras. Deep learning powers ChatGPT, self-driving cars, and facial recognition.',
  'neural network': 'A neural network is a computing system inspired by biological neurons. It consists of layers of interconnected nodes (neurons) that process information. Input layers receive data, hidden layers process it, and output layers produce results. Neural networks learn by adjusting weights through backpropagation. They\'re the foundation of deep learning.',
  'nlp': 'Natural Language Processing (NLP) is a branch of AI focused on understanding and generating human language. It powers chatbots, translation, sentiment analysis, text summarization, and voice assistants. Key techniques: tokenization, named entity recognition, sentiment analysis, and transformer models (BERT, GPT).',
  'natural language processing': 'Natural Language Processing (NLP) is a branch of AI focused on understanding and generating human language. It powers chatbots, translation, sentiment analysis, text summarization, and voice assistants. Key techniques: tokenization, named entity recognition, sentiment analysis, and transformer models (BERT, GPT).',
  'chatgpt': 'ChatGPT is an AI chatbot made by OpenAI, based on the GPT (Generative Pre-trained Transformer) family of large language models. It can answer questions, write code, create content, translate, summarize, and have conversations. GPT-4 and GPT-4o are the latest versions. ChatGPT brought AI to mainstream adoption with 100M+ users.',
  'gpt': 'GPT (Generative Pre-trained Transformer) is a family of large language models by OpenAI. GPT-1 (2018), GPT-2 (2019), GPT-3 (2020), GPT-3.5 (2022), and GPT-4 (2023) have progressively improved. These models are trained on vast text data and can generate human-like text, code, and reasoning. GPT powers ChatGPT and the OpenAI API.',
  'large language model': 'A Large Language Model (LLM) is a type of AI trained on massive amounts of text data to understand and generate human language. Examples: GPT-4 (OpenAI), Claude (Anthropic), Llama (Meta), Gemini (Google), Mistral. LLMs use transformer architecture and can perform tasks like writing, coding, analysis, and conversation.',
  'llm': 'A Large Language Model (LLM) is a type of AI trained on massive amounts of text data to understand and generate human language. Examples: GPT-4 (OpenAI), Claude (Anthropic), Llama (Meta), Gemini (Google), Mistral. LLMs use transformer architecture and can perform tasks like writing, coding, analysis, and conversation.',
  'ollama': 'Ollama is a tool that lets you run large language models (like Llama, Mistral, Gemma) locally on your machine. It\'s free, private, and works offline. Ollama simplifies downloading and running LLMs with a single command. Models run on your CPU/GPU — no data leaves your computer.',
  'transformer': 'The Transformer is a neural network architecture introduced in the 2017 paper "Attention Is All You Need." It uses self-attention mechanisms to process sequential data in parallel. Transformers are the foundation of modern NLP: BERT, GPT, T5, and all large language models. They revolutionized AI by enabling massive parallelization.',
  'rag': 'RAG (Retrieval-Augmented Generation) is a technique that combines a language model with an external knowledge base. It retrieves relevant documents before generating a response, reducing hallucinations. RAG is used in chatbots with domain knowledge, search engines, and enterprise AI applications.',
  'fine tuning': 'Fine-tuning is the process of further training a pre-trained language model on specific data to customize it for a particular task. It\'s less resource-intensive than training from scratch. Techniques include full fine-tuning, LoRA, QLoRA, and PEFT. Fine-tuning improves domain-specific performance.',
  'embedding': 'In AI, embeddings are numerical representations of text, images, or other data in a vector space. Similar items have similar embeddings. They\'re used in search, recommendations, RAG systems, and similarity matching. Word2Vec, GloVe, and transformer-based embeddings are common approaches.',
  'vector database': 'A vector database is designed to store and query high-dimensional vectors (embeddings). Popular ones include Pinecone, Weaviate, ChromaDB, Milvus, and FAISS. They enable semantic search, similarity matching, and recommendation systems at scale.',
  'hallucination': 'In AI, hallucination refers to when a language model generates confident-sounding but incorrect or fabricated information. It happens because LLMs predict likely next words without truly understanding facts. Mitigation strategies include RAG, fact-checking, temperature reduction, and human oversight.',
  'prompt engineering': 'Prompt engineering is the art of crafting effective inputs (prompts) to get better outputs from AI language models. Techniques include few-shot learning, chain of thought, role prompting, and structured output formatting. Good prompts are specific, provide context, and define the desired format.',
  'computer vision': 'Computer Vision is a field of AI that enables machines to interpret and understand visual information from images and videos. Applications include object detection, facial recognition, medical imaging, autonomous vehicles, and augmented reality. Key architectures: CNNs (Convolutional Neural Networks), Vision Transformers.',

  // ── Infrastructure & DevOps ──
  'docker': 'Docker is a platform for developing, shipping, and running applications in containers. Containers package an app with all its dependencies, ensuring it runs consistently across environments. Docker uses images (read-only templates) and containers (running instances). Docker Compose defines multi-container applications.',
  'kubernetes': 'Kubernetes (K8s) is an open-source container orchestration platform by Google. It automates deploying, scaling, and managing containerized applications. Features: self-healing, load balancing, automatic rollouts/rollbacks, secret management, and service discovery. K8s is the industry standard for container orchestration.',
  'devops': 'DevOps is a set of practices combining software development (Dev) and IT operations (Ops). It aims to shorten the development lifecycle and provide continuous delivery with high quality. Key practices: CI/CD, infrastructure as code, monitoring, automation, and collaboration tools. DevOps culture emphasizes shared responsibility.',
  'ci/cd': 'CI/CD (Continuous Integration/Continuous Deployment) is a method to frequently deliver apps by automating build, test, and deployment stages. CI merges code changes automatically and runs tests. CD automatically deploys tested code to production. Popular tools: GitHub Actions, GitLab CI, Jenkins, CircleCI, Travis CI.',
  'aws': 'Amazon Web Services (AWS) is the world\'s most comprehensive cloud platform, launched in 2006. It offers 200+ services including compute (EC2), storage (S3), databases (RDS, DynamoDB), AI/ML (SageMaker), networking (VPC), and serverless (Lambda). AWS dominates the cloud market with ~32% market share.',
  'cloud computing': 'Cloud computing is the delivery of computing services (servers, storage, databases, networking, software, analytics) over the internet. Major providers: AWS, Microsoft Azure, Google Cloud. Models: IaaS (infrastructure), PaaS (platform), SaaS (software). Benefits: scalability, cost savings, global availability, and reduced maintenance.',
  'linux': 'Linux is an open-source operating system kernel created by Linus Torvalds in 1991. It\'s the foundation of distributions like Ubuntu, Debian, CentOS, Arch, and Android. Linux powers most servers, supercomputers (100%), cloud infrastructure, and IoT devices. It\'s free, secure, customizable, and highly stable.',
  'git': 'Git is a distributed version control system created by Linus Torvalds in 2005 for Linux kernel development. It tracks changes in code, enables branching/merging, and supports collaboration. GitHub, GitLab, and Bitbucket provide cloud hosting for Git repositories. Key commands: clone, commit, push, pull, branch, merge, rebase.',
  'github': 'GitHub is a cloud-based platform for version control and collaboration using Git. It hosts over 100 million repositories and is used by developers worldwide. Features: pull requests, issues, actions (CI/CD), packages, pages (hosting), and Copilot (AI coding assistant). Microsoft acquired GitHub in 2018 for $7.5 billion.',
  'terraform': 'Terraform is an infrastructure as code (IaC) tool by HashiCorp. It lets you define and provision cloud infrastructure using declarative configuration files. Terraform supports multiple cloud providers (AWS, Azure, GCP) and tracks state for incremental changes. It\'s the most popular IaC tool in DevOps.',
  'nginx': 'Nginx is a high-performance web server, reverse proxy, and load balancer. Created by Igor Sysoev in 2004, it handles millions of concurrent connections efficiently. Nginx is used by Netflix, GitHub, WordPress.com, and ~34% of all websites. It excels at serving static content, SSL termination, and API gateway.',
  'microservices': 'Microservices is an architectural style where applications are built as small, independent services that communicate via APIs. Each service handles a specific business function and can be developed, deployed, and scaled independently. Benefits: flexibility, scalability, technology diversity. Challenges: complexity, distributed transactions, and monitoring.',

  // ── Databases ──
  'sql': 'SQL (Structured Query Language) is a language for managing and querying relational databases. Common operations: SELECT (read), INSERT (create), UPDATE (modify), DELETE (remove). Popular databases: MySQL, PostgreSQL, SQLite, Microsoft SQL Server, Oracle. SQL uses structured tables with defined schemas.',
  'nosql': 'NoSQL databases are non-relational databases designed for flexible, scalable data storage. Types: document (MongoDB), key-value (Redis), column-family (Cassandra), graph (Neo4j). NoSQL databases handle unstructured data, scale horizontally, and offer high performance for specific use cases.',
  'mongodb': 'MongoDB is a document-oriented NoSQL database that stores data in flexible JSON-like documents (BSON). It\'s designed for scalability and developer productivity. MongoDB uses collections instead of tables and documents instead of rows. Features: horizontal scaling (sharding), rich query language, aggregation pipeline, and Atlas (managed cloud service).',
  'postgresql': 'PostgreSQL is an advanced, open-source relational database known for reliability, feature completeness, and standards compliance. It supports JSON, full-text search, geospatial data (PostGIS), custom types, and extensibility. PostgreSQL is used by Apple, Instagram, Spotify, and Reddit.',
  'redis': 'Redis is an in-memory data store used as a database, cache, message broker, and queue. It supports data structures: strings, hashes, lists, sets, sorted sets, and streams. Redis is extremely fast (sub-millisecond latency) and is used for caching, session management, real-time analytics, and leaderboards.',
  'sqlite': 'SQLite is a lightweight, serverless relational database engine. It stores the entire database in a single file. SQLite is the most deployed database in the world — it\'s in every smartphone, browser, and operating system. It\'s used in mobile apps, embedded systems, and prototyping.',
  'mysql': 'MySQL is the world\'s most popular open-source relational database, owned by Oracle. It\'s known for speed, reliability, and ease of use. MySQL powers WordPress, Facebook (originally), Twitter, YouTube, and millions of web applications. It supports ACID transactions, replication, and clustering.',

  // ── Science ──
  'quantum computing': 'Quantum computing uses quantum mechanics phenomena (superposition, entanglement) to process information. Quantum bits (qubits) can represent 0 and 1 simultaneously, enabling exponential parallelism for certain problems. Companies: IBM (Qiskit), Google (Sycamore), Microsoft (Q#). Applications: cryptography, drug discovery, optimization, and materials science.',
  'blockchain': 'Blockchain is a distributed, immutable ledger technology that records transactions across many computers. Each block contains a cryptographic hash of the previous block, forming a chain. Applications: cryptocurrencies (Bitcoin, Ethereum), smart contracts, supply chain, voting systems, and NFTs. Key features: decentralization, transparency, and security.',
  'cryptocurrency': 'A cryptocurrency is a digital currency using cryptography for security, operating on decentralized networks (usually blockchains). Bitcoin (2009) was the first, created by Satoshi Nakamoto. Others include Ethereum (smart contracts), Solana (speed), and stablecoins (USDT, USDC). Cryptocurrencies enable peer-to-peer transactions without intermediaries.',
  'bitcoin': 'Bitcoin is the first and largest cryptocurrency, created by Satoshi Nakamoto in 2009. It uses proof-of-work mining, has a fixed supply of 21 million coins, and operates on a decentralized blockchain. Bitcoin is often called "digital gold" and is used as a store of value, medium of exchange, and hedge against inflation.',
  'ethereum': 'Ethereum is a decentralized blockchain platform for smart contracts and decentralized applications (dApps), created by Vitalik Buterin in 2015. It switched to proof-of-stake in 2022 (The Merge). Ethereum hosts DeFi, NFTs, DAOs, and thousands of tokens (ERC-20). Its native currency is Ether (ETH).',
  'physics': 'Physics is the natural science that studies matter, energy, motion, and force. Major branches: classical mechanics (Newton), electromagnetism (Maxwell), relativity (Einstein), quantum mechanics (Heisenberg, Schrödinger), thermodynamics, and particle physics. Physics explains everything from subatomic particles to the universe.',
  'chemistry': 'Chemistry is the study of matter, its properties, composition, structure, and how it changes. Major branches: organic (carbon compounds), inorganic, physical chemistry, analytical chemistry, and biochemistry. Chemistry explains chemical reactions, bonding, elements (periodic table), and molecular structures.',
  'biology': 'Biology is the study of living organisms — their structure, function, growth, evolution, and distribution. Major branches: molecular biology, genetics, ecology, anatomy, physiology, and microbiology. Biology covers DNA, cells, organisms, ecosystems, and evolution through natural selection.',
  'astronomy': 'Astronomy is the study of celestial objects (stars, planets, galaxies, black holes) and the universe. Modern astronomy uses telescopes, spacecraft, and computational methods. Key discoveries: the Big Bang theory, dark matter/energy, exoplanets, and gravitational waves. The James Webb Space Telescope is the latest breakthrough.',
  'evolution': 'Evolution is the change in inherited traits of biological populations over successive generations. Charles Darwin\'s theory of evolution by natural selection (1859) explains how species adapt to their environments. Evidence comes from fossils, DNA, comparative anatomy, and observed speciation. Evolution is the unifying theory of biology.',
  'climate change': 'Climate change refers to long-term shifts in global temperatures and weather patterns. Since the Industrial Revolution, human activities (burning fossil fuels, deforestation) have increased greenhouse gases, causing global warming. Effects: rising sea levels, extreme weather, biodiversity loss, and ecosystem disruption. The Paris Agreement aims to limit warming to 1.5°C.',

  // ── Math ──
  'algebra': 'Algebra is a branch of mathematics that uses symbols and letters to represent numbers and quantities in formulas and equations. It covers variables, polynomials, equations, inequalities, functions, and matrices. Algebra is fundamental to all higher mathematics, physics, engineering, and computer science.',
  'calculus': 'Calculus is a branch of mathematics studying continuous change. Differential calculus deals with rates of change (derivatives). Integral calculus deals with accumulation of quantities (integrals). Calculus is essential in physics, engineering, economics, and computer science. Newton and Leibniz independently developed it in the 17th century.',
  'statistics': 'Statistics is the science of collecting, analyzing, interpreting, and presenting data. Descriptive statistics summarize data (mean, median, mode, standard deviation). Inferential statistics draw conclusions from samples (hypothesis testing, confidence intervals, regression). Statistics is crucial in research, business, medicine, and AI.',
  'probability': 'Probability is the branch of mathematics measuring the likelihood of events. It ranges from 0 (impossible) to 1 (certain). Key concepts: conditional probability, Bayes\' theorem, distributions (normal, binomial, Poisson), and expected value. Probability underpins statistics, machine learning, gambling, and risk analysis.',

  // ── Business & Finance ──
  'seo': 'SEO (Search Engine Optimization) is the practice of optimizing your website to rank higher in search engine results. Key factors: content quality, keywords, backlinks, page speed, mobile-friendliness, and user experience. SEO includes technical SEO (crawlability), on-page (content), and off-page (authority) optimization.',
  'crm': 'CRM (Customer Relationship Management) is software for managing interactions with customers. Popular CRMs: HubSpot (free tier), Salesforce (enterprise), Zoho (affordable), Pipedrive (sales). CRMs track leads, deals, communications, and customer lifecycle. They integrate with email, phone, and marketing tools.',
  'saas': 'SaaS (Software as a Service) is a cloud-based software delivery model where users access applications over the internet via subscription. Examples: Gmail, Slack, Notion, Zoom, Figma, Canva. SaaS eliminates installation/maintenance, scales easily, and updates automatically. It\'s the dominant software model.',
  'startup': 'A startup is a newly created business designed to grow rapidly. Startups typically solve a problem with technology and aim for scalability. The lean startup methodology emphasizes build-measure-learn cycles, MVPs (Minimum Viable Products), and customer feedback. Key stages: seed, Series A, B, C, and IPO.',
  'e-commerce': 'E-commerce is buying and selling goods/services online. Platforms: Shopify, WooCommerce, Magento, BigCommerce. Models: B2C (business to consumer), B2B (business to business), C2C (consumer to consumer). E-commerce includes online stores, marketplaces (Amazon, eBay), and social commerce (Instagram Shopping).',
  'digital marketing': 'Digital marketing promotes products/services through digital channels: SEO, social media, email marketing, content marketing, PPC (pay-per-click), and influencer marketing. It\'s measurable, targeted, and cost-effective compared to traditional marketing. Key metrics: CTR, conversion rate, ROI, CAC, and LTV.',
  'stock market': 'The stock market is a marketplace where shares of publicly traded companies are bought and sold. Major Indian indices: Nifty 50 (NSE), Sensex (BSE). Stock prices reflect company value, investor sentiment, and economic conditions. Key concepts: bull market, bear market, dividends, P/E ratio, and market capitalization.',
  'investing': 'Investing is allocating money with the expectation of generating income or profit. Types: stocks, bonds, mutual funds, ETFs, real estate, commodities, and crypto. Key principles: diversification, compound interest, dollar-cost averaging, and long-term thinking. Start early — time in the market beats timing the market.',
  'cryptocurrency trading': 'Cryptocurrency trading involves buying and selling digital currencies on exchanges. Types: spot trading (immediate), futures (contracts), and staking (earning rewards). Major exchanges: Binance, Coinbase, Kraken. Risk management is crucial due to high volatility. Always do your own research (DYOR).',

  // ── Geography & Countries ──
  'india': 'India is a country in South Asia, the world\'s most populous nation (1.4+ billion) and largest democracy. Capital: New Delhi. Major cities: Mumbai (finance), Bangalore (tech), Chennai (manufacturing), Kolkata, Hyderabad. Languages: Hindi, English, and 21 other official languages. Economy: 5th largest GDP, growing tech sector.',
  'china': 'China is the world\'s most populous country and second-largest economy. Capital: Beijing. Major cities: Shanghai, Shenzhen (tech), Guangzhou, Chengdu. China is the world\'s largest manufacturer and exporter. Known for: Great Wall, terracotta army, rapid economic growth, and technology industry.',
  'united states': 'The United States is a federal republic of 50 states. Capital: Washington, D.C. Largest cities: New York, Los Angeles, Chicago. The world\'s largest economy (by GDP) and third most populous country. Known for: cultural influence, Silicon Valley, Wall Street, military power, and immigration.',
  'japan': 'Japan is an island country in East Asia. Capital: Tokyo (world\'s largest metropolitan area). Known for: technology (Sony, Toyota, Honda), anime/manga, cuisine (sushi, ramen), traditional culture, and being the world\'s third-largest economy. Population: ~125 million.',
  'germany': 'Germany is the largest economy in Europe and fourth-largest globally. Capital: Berlin. Major cities: Munich, Hamburg, Frankfurt (finance). Known for: engineering (BMW, Mercedes, Volkswagen), efficiency, Oktoberfest, and being the EU\'s economic powerhouse.',
  'united kingdom': 'The United Kingdom consists of England, Scotland, Wales, and Northern Ireland. Capital: London (global financial center). Known for: history, monarchy, Premier League football, literature (Shakespeare), music (The Beatles), and the Industrial Revolution.',
  'france': 'France is the world\'s most visited country. Capital: Paris (Eiffel Tower, Louvre). Known for: cuisine (wine, cheese), fashion (Chanel, Louis Vuitton), art, culture, and the French Revolution\'s influence on democracy. France is a major EU economy and nuclear power.',

  // ── Technology Companies ──
  'google': 'Google is a multinational technology company founded by Larry Page and Sergey Brin in 1998. Known for: Search (92% market share), Gmail, YouTube, Android, Chrome, Google Cloud, and AI (Gemini). Google organizes the world\'s information and is one of the "Big Five" tech companies.',
  'microsoft': 'Microsoft is a multinational technology corporation founded by Bill Gates and Paul Allen in 1975. Known for: Windows OS, Office 365, Azure cloud, LinkedIn, GitHub, and AI partnership with OpenAI. Microsoft is one of the world\'s most valuable companies.',
  'apple': 'Apple is a multinational technology company founded by Steve Jobs, Steve Wozniak, and Ronald Wayne in 1976. Known for: iPhone, Mac, iPad, Apple Watch, iOS, and premium hardware design. Apple is the world\'s most valuable company by market cap.',
  'amazon': 'Amazon is a multinational technology company founded by Jeff Bezos in 1994 as an online bookstore. Now the world\'s largest e-commerce platform and cloud computing provider (AWS). Also known for: Prime Video, Alexa, Kindle, and logistics network.',
  'meta': 'Meta Platforms (formerly Facebook) is a multinational technology conglomerate founded by Mark Zuckerberg in 2004. Known for: Facebook, Instagram, WhatsApp, Messenger, and Meta Quest (VR headsets). Meta is investing heavily in the metaverse and AI.',
  'tesla': 'Tesla is an electric vehicle and clean energy company founded by Martin Eberhard and Marc Tarpenning in 2003, with Elon Musk joining early. Known for: electric cars (Model S, 3, X, Y), Autopilot, Powerwall (batteries), and Solar Roof. Tesla disrupted the automotive industry.',
  'netflix': 'Netflix is a streaming entertainment service founded in 1997 as a DVD-by-mail service. Now the world\'s largest streaming platform with 260+ million subscribers. Known for: original content (Stranger Things, Squid Game), recommendation algorithm, and global availability.',

  // ── Other Tech ──
  'api': 'API (Application Programming Interface) is a set of rules that allows different software applications to communicate with each other. REST APIs are the most common type, using HTTP requests. APIs enable integrations between services, mobile apps accessing servers, and microservice communication.',
  'webhook': 'A webhook is a way for one app to send real-time data to another app when something happens. Unlike APIs (which you poll), webhooks push data automatically. Example: Stripe sends a webhook when a payment succeeds. Webhooks are used for event-driven architectures.',
  'electron': 'Electron is a framework for building cross-platform desktop apps using web technologies (HTML, CSS, JavaScript). Apps like VS Code, Slack, Discord, and Spotify Desktop are built with Electron. It bundles Chromium and Node.js for each app.',
  'react native': 'React Native is a framework for building mobile apps using React and JavaScript. Created by Meta, it renders to native iOS/Android components (not web views). React Native enables cross-platform development with a single codebase. Used by Instagram, Facebook, Shopify, and Discord.',
  'flutter': 'Flutter is Google\'s UI toolkit for building natively compiled applications for mobile, web, and desktop from a single Dart codebase. Flutter uses its own rendering engine (Skia) for consistent UI across platforms. Known for fast development, hot reload, and beautiful UIs.',
  'machine learning operations': 'MLOps (Machine Learning Operations) combines ML, DevOps, and data engineering to deploy and maintain ML models in production reliably and efficiently. It covers model training, versioning, deployment, monitoring, and governance. Tools: MLflow, Kubeflow, Weights & Biases, DVC.',
  'data science': 'Data science combines statistics, programming, and domain knowledge to extract insights from data. It covers data collection, cleaning, analysis, visualization, and machine learning. Tools: Python (Pandas, NumPy), R, SQL, Jupyter notebooks, and Tableau. Data science drives business decisions.',
  'cybersecurity': 'Cybersecurity is the practice of protecting systems, networks, and data from digital attacks. It covers threat detection, encryption, access control, penetration testing, and incident response. Major threats: ransomware, phishing, DDoS, and zero-day exploits. Cybersecurity is critical for businesses and governments.',
  'open source': 'Open source software is software with publicly available source code that anyone can view, modify, and distribute. Examples: Linux, Python, React, VS Code, Firefox. Open source fosters collaboration, transparency, and innovation. Licenses: MIT, Apache 2.0, GPL.',

  // ── Famous People ──
  'who is elon musk': 'Elon Musk is a South African-born American entrepreneur and businessman. He is the CEO of Tesla (electric vehicles), SpaceX (aerospace), and owner of X (formerly Twitter). He also founded Neuralink (brain-computer interface), The Boring Company (tunnels), and xAI (Grok).',
  'who is sam altman': 'Sam Altman is the CEO of OpenAI, the company behind ChatGPT. He is a prominent figure in the AI industry and was previously president of Y Combinator. He advocates for AI safety and the development of artificial general intelligence (AGI).',
  'who is jeff bezos': 'Jeff Bezos is an American entrepreneur who founded Amazon in 1994. He built it from an online bookstore into the world\'s largest e-commerce platform and cloud computing provider (AWS). He also owns Blue Origin (space) and The Washington Post.',
  'who is bill gates': 'Bill Gates is an American business magnate who co-founded Microsoft in 1975. He became the world\'s richest person and later focused on philanthropy through the Bill & Melinda Gates Foundation, tackling global health, poverty, and education.',
  'who is mark zuckerberg': 'Mark Zuckerberg is an American technology entrepreneur who co-founded Facebook in 2004 from his Harvard dorm room. He\'s the CEO of Meta Platforms, which includes Facebook, Instagram, WhatsApp, and Messenger. He\'s investing heavily in AI and the metaverse.',

  // ── Miscellaneous ──
  'what is n8n': 'n8n is a free, open-source workflow automation tool. It lets you connect different apps and services (like Gmail, Slack, databases) to create automated workflows without coding. Think of it as a visual IFTTT for businesses.',
  'what is prompt engineering': 'Prompt engineering is the art of crafting effective inputs (prompts) to get better outputs from AI language models. Good prompts are specific, provide context, and define the desired format.',
  'what is fine tuning': 'Fine-tuning is the process of further training a pre-trained language model on specific data to customize it for a particular task. It\'s less resource-intensive than training from scratch.',
  'what is embedding': 'In AI, embeddings are numerical representations of text, images, or other data in a vector space. Similar items have similar embeddings. They\'re used in search, recommendations, and RAG systems.',
  'what is vector database': 'A vector database is designed to store and query high-dimensional vectors (embeddings). Popular ones include Pinecone, Weaviate, ChromaDB, and Milvus.',
  'what is hallucination': 'In AI, hallucination refers to when a language model generates confident-sounding but incorrect or fabricated information. It happens because LLMs predict likely next words without truly understanding facts.',
  'what is chain of thought': 'Chain of Thought (CoT) is a prompting technique where you ask the AI to explain its reasoning step-by-step before giving a final answer.',
  'what is zero shot': 'Zero-shot learning is when an AI model performs a task without having seen any examples of that task during training.',
  'what is few shot': 'Few-shot learning is when an AI model learns a new task from just a few examples provided in the prompt.',
  'life': 'Life is the condition that distinguishes living organisms from inorganic matter. It\'s characterized by growth, reproduction, metabolism, response to stimuli, and evolution. Life on Earth began ~3.8 billion years ago and has evolved into millions of species.',
  'meaning of life': 'The meaning of life is one of humanity\'s deepest philosophical questions. Different perspectives: religious (serve God/divine purpose), philosophical (Aristotle: eudaimonia, Camus: embrace absurdity), scientific (survive and reproduce), and personal (create your own meaning). As Douglas Adams wrote: 42.',
  '42': '42 is the answer to the Ultimate Question of Life, the Universe, and Everything, as computed by the supercomputer Deep Thought in Douglas Adams\' "The Hitchhiker\'s Guide to the Galaxy." The joke is that the answer is meaningless without understanding the question.',
  // ── Sports ──
  'cricket': 'Cricket is a bat-and-ball sport played between two teams of 11 players. It\'s hugely popular in India, Australia, England, and South Africa. Major formats: Test (5 days), ODI (50 overs), T20 (20 overs). The IPL (Indian Premier League) is the world\'s richest T20 league. India has won the Cricket World Cup twice (1983, 2011).',
  'ipl': 'The Indian Premier League (IPL) is a professional T20 cricket league in India, founded in 2008 by the BCCI. It features 10 franchises representing Indian cities. Known for high-scoring matches, big auctions, and global talent. Mumbai Indians and Chennai Super Kings are the most successful teams with 5 titles each.',
  'football': 'Football (soccer) is the world\'s most popular sport with 4+ billion fans. Major leagues: English Premier League, La Liga, Bundesliga, Serie A, Ligue 1. The FIFA World Cup is the most-watched sporting event. Top players: Lionel Messi, Cristiano Ronaldo, Kylian Mbappé.',
  'nba': 'The National Basketball Association (NBA) is the premier professional basketball league in North America. 30 teams, 82-game regular season. Legendary players: Michael Jordan, LeBron James, Kobe Bryant, Stephen Curry. The NBA Finals are watched by millions worldwide.',
  'f1': 'Formula 1 (F1) is the highest class of international single-seater auto racing. 10 teams, 20+ races per season worldwide. Mercedes, Red Bull, Ferrari, and McLaren are top constructors. Legends: Michael Schumacher (7 titles), Lewis Hamilton (7 titles).',
  'tennis': 'Tennis is a racket sport played individually or in pairs. Major tournaments (Grand Slams): Australian Open, French Open, Wimbledon, US Open. Legends: Roger Federer, Rafael Nadal, Novak Djokovic, Serena Williams.',
  'virat kohli': 'Virat Kohli is one of the greatest cricket batsmen of all time, from India. He has scored 70+ international centuries across all formats. Former captain of the Indian cricket team. Known for aggressive batting and consistency. Nicknamed "King Kohli" by fans.',
  'sachin tendulkar': 'Sachin Tendulkar is widely regarded as the greatest cricket batsman ever. He holds the record for most runs (15,921 in Tests, 18,426 in ODIs) and most centuries (100 international centuries). Called the "God of Cricket" by fans.',
  'messi': 'Lionel Messi is an Argentine footballer, widely regarded as one of the greatest players ever. He won the 2022 FIFA World Cup with Argentina, 8 Ballon d\'Or awards, and 4 Champions League titles with Barcelona. Currently plays for Inter Miami.',
  'ronaldo': 'Cristiano Ronaldo is a Portuguese footballer and one of the greatest scorers in history. He has 900+ career goals, 5 Ballon d\'Or awards, and 5 Champions League titles. Currently plays for Al Nassr in Saudi Arabia.',
  'olympics': 'The Olympic Games are the world\'s largest international sporting event, held every 4 years. Over 200 nations compete in 30+ sports. The 2024 Paris Olympics featured swimming, athletics, gymnastics, and new sports like breakdancing.',
  'world cup': 'The FIFA World Cup is the most-watched sporting event globally, held every 4 years. 32 teams qualify through regional competitions. Brazil holds the record with 5 titles. The 2022 Qatar World Cup was won by Argentina.',
  'premier league': 'The English Premier League (EPL) is the most-watched football league in the world, with 20 clubs competing from August to May. Top clubs: Manchester City, Liverpool, Arsenal, Chelsea, Manchester United.',
  'champions league': 'The UEFA Champions League is Europe\'s premier club football competition. Real Madrid holds the record with 15 titles. The final is one of the most-watched annual sporting events worldwide.',

  // ── Gaming ──
  'gaming': 'Gaming encompasses video games across platforms: PC, console (PlayStation, Xbox, Nintendo Switch), and mobile. The global gaming industry generates $180+ billion annually. Major genres: action, RPG, shooter, strategy, sports, and battle royale.',
  'pubg': 'PUBG (PlayerUnknown\'s Battlegrounds) is a battle royale game by Krafton. 100 players drop onto an island, scavenge for weapons, and fight to be the last one standing. PUBG Mobile has 1+ billion downloads globally.',
  'valorant': 'Valorant is a tactical 5v5 first-person shooter by Riot Games. Players choose agents with unique abilities. Known for precise gunplay, strategic team play, and competitive esports. Released in 2020, it quickly became one of the most popular FPS games.',
  'minecraft': 'Minecraft is a sandbox game by Mojang (owned by Microsoft). Players build structures, explore worlds, and survive. Best-selling video game of all time with 300+ million copies sold.',
  'fortnite': 'Fortnite is a free-to-play battle royale game by Epic Games. 100 players compete to be the last standing, with building mechanics. Known for cultural crossovers and massive player base of 400+ million.',
  'gta': 'Grand Theft Auto (GTA) is a landmark action-adventure series by Rockstar Games. GTA V has sold 200+ million copies. GTA VI, set in Vice City, is highly anticipated.',
  'call of duty': 'Call of Duty (CoD) is a first-person shooter franchise by Activision. Known for intense multiplayer, battle royale (Warzone), and cinematic campaigns. One of the highest-grossing franchises with $30+ billion in revenue.',
  'esports': 'Esports is competitive video gaming at a professional level. Major games: League of Legends, Dota 2, CS2, Valorant. Tournaments offer millions in prize money. The International (Dota 2) has offered $40M+ prize pools.',
  'playstation': 'PlayStation is Sony\'s video game console brand. PS5 (2020) features SSD loading and DualSense controller. PlayStation has sold 500+ million consoles lifetime.',
  'xbox': 'Xbox is Microsoft\'s video game console brand. Xbox Game Pass offers 100+ games monthly. Microsoft acquired Activision Blizzard (2023) for $69 billion.',
  'nintendo': 'Nintendo is a Japanese gaming company known for Mario, Zelda, Pokemon. The Switch (2017) is a hybrid console that has sold 140+ million units.',
  'steam': 'Steam is the largest digital distribution platform for PC gaming by Valve Corporation. 50,000+ games, community features, and the Steam Deck handheld.',
  'elden ring': 'Elden Ring is an action RPG by FromSoftware and Bandai Namco, co-created with George R.R. Martin. Known for challenging combat, vast open world, and deep lore. Won Game of the Year 2022.',
  'zelda': 'The Legend of Zelda is Nintendo\'s iconic action-adventure franchise. Tears of the Kingdom (2023) introduced building mechanics in a vast open world. Consistently ranked among the greatest games ever made.',
  'pokemon': 'Pokemon is a media franchise by Nintendo about catching and training creatures. Highest-grossing media franchise ($100B+). Pokemon Go (2016) was a mobile AR phenomenon.',
  'counter-strike': 'Counter-Strike (CS2) is a tactical FPS by Valve. Two teams compete in bomb defusal scenarios. CS has been a competitive gaming staple since 1999.',
  'league of legends': 'League of Legends is a MOBA by Riot Games. Two teams of 5 destroy each other\'s nexus. 150+ champions and massive esports scene. World Championship draws millions of viewers.',

  // ── Movies & TV ──
  'bollywood': 'Bollywood is the Hindi-language film industry based in Mumbai. It produces 1,500+ films annually. Known for musical numbers and family dramas. Top actors: Shah Rukh Khan, Salman Khan, Aamir Khan.',
  'marvel': 'Marvel is a major entertainment company known for superheroes: Spider-Man, Iron Man, Captain America. The MCU is the highest-grossing film franchise ($30B+). Disney acquired Marvel in 2009.',
  'dc': 'DC Comics is a major comic book publisher owned by Warner Bros. Known for Batman, Superman, Wonder Woman. The DCEU films compete with Marvel.',
  'star wars': 'Star Wars is a legendary sci-fi franchise by George Lucas (1977). The saga follows the Skywalker family with Jedi, Sith, and the Force. One of the highest-grossing franchises ever.',
  'stranger things': 'Stranger Things is a Netflix sci-fi/horror series set in 1980s Hawkins, Indiana. Kids discover supernatural events. Known for 80s nostalgia and breakout stars like Millie Bobby Brown.',
  'breaking bad': 'Breaking Bad is an AMC series (2008-2013) about a chemistry teacher who turns to meth. Widely regarded as one of the greatest TV shows ever. Stars Bryan Cranston and Aaron Paul.',
  'game of thrones': 'Game of Thrones is an HBO fantasy series (2011-2019) based on George R.R. Martin\'s novels. Noble families fight for the Iron Throne. Known for complex characters and shocking twists.',
  'inception': 'Inception (2010) is a sci-fi thriller by Christopher Nolan. A team enters dreams to plant or extract ideas. Stars Leonardo DiCaprio. Won 4 Oscars.',
  'interstellar': 'Interstellar (2014) is a sci-fi epic by Christopher Nolan about astronauts traveling through a wormhole. Stars Matthew McConaughey. Known for scientific accuracy and stunning visuals.',
  'avatar': 'Avatar (2009) by James Cameron is set on the alien moon Pandora. Was the highest-grossing film ($2.9B). Avatar: The Way of Water (2022) expanded the world.',
  'oppenheimer': 'Oppenheimer (2023) by Christopher Nolan is about the atomic bomb\'s creator. Stars Cillian Murphy. Won 7 Oscars including Best Picture.',
  'pushpa': 'Pushpa is a Telugu action franchise starring Allu Arjun. Known for stylish action and catchy songs. Pushpa 2 (2024) broke box office records.',
  'kgf': 'KGF is a Kannada action franchise starring Yash. KGF Chapter 2 (2022) is among India\'s highest-grossing films. Known for intense action and dramatic storytelling.',
  'rrr': 'RRR (2022) is a Telugu epic by S.S. Rajamouli. "Naatu Naatu" won an Oscar. Grossed $160M+ worldwide.',
  'baahubali': 'Baahubali is a Telugu epic franchise by S.S. Rajamouli. Among India\'s highest-grossing films. Known for groundbreaking VFX and massive sets.',
  'money heist': 'Money Heist (La Casa de Papel) is a Spanish series about elaborate heists. Known for red jumpsuits and "Bella Ciao." One of Netflix\'s most-watched non-English shows.',
  'squid game': 'Squid Game is a South Korean Netflix series about deadly children\'s games for cash. Became Netflix\'s most-watched series ever.',
  'anime': 'Anime is Japanese animation known for diverse genres. Studio Ghibli (Hayao Miyazaki) produces beloved films. Huge global fanbase with streaming on Crunchyroll and Netflix.',
  'naruto': 'Naruto is a popular anime/manga about a young ninja dreaming of becoming Hokage. Known for themes of friendship and perseverance.',
  'dragon ball': 'Dragon Ball is a legendary anime/manga by Akira Toriyama. Following Goku\'s adventures, it\'s one of the most influential anime series ever.',
  'one piece': 'One Piece is the best-selling manga ever (500M+ copies) about Luffy and his pirate crew. Known for world-building and emotional arcs.',
  'death note': 'Death Note is a psychological thriller anime about a student with a notebook that kills. Known for intellectual battles and moral ambiguity.',
  'your name': 'Your Name (2016) is a Japanese animated film about teenagers swapping bodies. Became the highest-grossing anime film. Known for stunning visuals.',

  // ── Current Events & Tech ──
  'openai': 'OpenAI is an AI research company founded in 2015 by Sam Altman and Elon Musk. Known for ChatGPT, GPT-4, DALL-E, and Sora. One of the most valuable AI companies.',
  'claude': 'Claude is an AI assistant by Anthropic, known for helpful and honest responses. Claude 3.5 Sonnet and Claude 3 Opus are the latest models. Anthropic focuses on AI safety.',
  'anthropic': 'Anthropic is an AI safety company by Dario and Daniela Amodei. Known for Claude. Backed by Google and Amazon.',
  'google gemini': 'Google Gemini is Google\'s family of AI models. Multimodal, handling text, images, audio, and video. Powers Google Assistant and Gemini chat.',
  'ai regulation': 'AI regulation refers to government policies governing AI. The EU AI Act (2024) is the world\'s first comprehensive AI law. Concerns: bias, privacy, deepfakes, and existential risk.',
  'spacex': 'SpaceX is Elon Musk\'s aerospace company (2002). Known for reusable rockets (Falcon 9), Starship, and Starlink satellite internet (5,000+ satellites).',
  'starlink': 'Starlink is SpaceX\'s satellite internet constellation with 5,000+ satellites. Provides high-speed internet to rural areas. 3+ million subscribers in 60+ countries.',
  'metaverse': 'The metaverse is a persistent shared virtual world. Meta invested $36B+ in its development. Other players: Microsoft, Apple (Vision Pro), Roblox.',
  'apple vision pro': 'Apple Vision Pro is Apple\'s mixed reality headset (2024). Spatial computing with eye tracking and hand gestures. Priced at $3,499.',
  'electric vehicles': 'Electric vehicles use electric motors instead of combustion engines. Major makers: Tesla, BYD, Rivian, Hyundai. EVs are transforming transportation.',
  'semiconductor': 'Semiconductors (chips) power all modern electronics. TSMC manufactures most advanced chips. The CHIPS Act aims to boost US domestic chip manufacturing.',
  'web3': 'Web3 is a vision for a decentralized internet on blockchain. Includes dApps, NFTs, DAOs. Aims to give users ownership of their data.',
  'nft': 'NFT (Non-Fungible Token) is a unique digital asset on a blockchain. Represented art, music, and collectibles. Market peaked in 2021-2022.',
  'climate technology': 'Climate tech encompasses innovations addressing climate change: solar, wind, carbon capture, EVs, green hydrogen. Investment reached $70B+ in 2023.',
  'deepfake': 'Deepfakes are AI-generated synthetic media depicting people doing things they never did. Concerns include misinformation and fraud. Detection tools are being developed.',

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
  "Why do programmers always mix up Halloween and Christmas? Because Oct 31 = Dec 25.",
  "A programmer's wife tells him: 'Go to the store and buy a loaf of bread. If they have eggs, buy a dozen.' He comes home with 12 loaves.",
  "There are only 10 types of people in the world: those who understand binary and those who don't.",
  "Why was the math book sad? Because it had too many problems.",
  "What's a computer's least favorite food? Spam.",
  "Why do Java developers wear glasses? Because they can't C#.",
  "How do you comfort a JavaScript bug? You console it.",
  "What do you call 8 hobbits? A hobbyte.",
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
  "The only limit to our realization of tomorrow is our doubts of today. — Franklin D. Roosevelt",
  "In the middle of difficulty lies opportunity. — Albert Einstein",
  "Stay hungry, stay foolish. — Steve Jobs",
  "It does not matter how slowly you go as long as you do not stop. — Confucius",
  "The future belongs to those who believe in the beauty of their dreams. — Eleanor Roosevelt",
  "Success is not final, failure is not fatal: it is the courage to continue that counts. — Winston Churchill",
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ══════════════════════════════════════════════════════
// MAIN ROUTER
// ══════════════════════════════════════════════════════

export function getSmartResponse(text: string): string {
  const lower = text.toLowerCase().trim();

  // ══════════════════════════════════════════════════════
  // ORDERED ROUTING — most specific first
  // ══════════════════════════════════════════════════════

  // ── 1. EMAIL ROUTING (checked first: "search emails" must win here) ──
  const EMAIL_KW = /\b(email[s]?|inbox|gmail|mail)\b/i;
  const EMAIL_ACTION = /\b(send|check|read|search|compose|write|forward|reply|draft|delete|archive)\b/i;
  if (EMAIL_KW.test(lower) && EMAIL_ACTION.test(lower)) {
    // Parse email command
    const toMatch = lower.match(/(?:to|send\s+(?:to|email)?)\s+([\w.-]+@[\w.-]+)/);
    const subjectMatch = lower.match(/(?:about|regarding|subject|re:?|topic)\s+(.+?)(?:\s+(?:and|with|body|message|saying|that|please|$))/i) || lower.match(/(?:about|regarding|subject|re:?)\s+(.+)/i);
    
    if (/\b(send|compose|write|draft)\b/.test(lower) && toMatch) {
      const to = toMatch[1];
      const subject = subjectMatch ? subjectMatch[1].trim().replace(/[.,!?]+$/, '') : 'No Subject';
      const body = subject;
      return `📧 **Ready to send:**\n\n**To:** ${to}\n**Subject:** ${subject}\n**Body:** ${body}\n\nSend this? (yes/edit/cancel)`;
    }
    
    if (/\b(check|read)\b/.test(lower) && /\b(inbox|email[s]?|mail)\b/.test(lower)) {
      return '📬 Checking your inbox... This feature requires the JARVIS desktop app. Run `npm run electron:dev` to connect your Gmail.';
    }
    
    if (/\b(search)\b/.test(lower) && /\b(email[s]?|inbox|mail)\b/.test(lower)) {
      const query = lower.replace(/.*search\s+(?:email[s]?|inbox|mail)\s*(?:for|about)?\s*/i, '').trim();
      return `🔍 Searching emails for "${query || 'all'}"... This feature requires the JARVIS desktop app. Run \`npm run electron:dev\` to connect your Gmail.`;
    }
    
    return '📧 I can help you with email! Try:\n• "Send email to user@gmail.com about meeting"\n• "Check my inbox"\n• "Search emails for invoice"\n\nThis feature requires the JARVIS desktop app. Run `npm run electron:dev` to connect your Gmail.';
  }

  // ── 2. BROWSER ROUTING (before generic search) ──
  const BROWSER_KW = /\b(browse|open\s+\w+\.\w+|fill.*form|click.*on|navigate|visit)\b/i;
  if (BROWSER_KW.test(lower)) {
    const urlMatch = lower.match(/(https?:\/\/[\w.-]+\.[\w.-]+(?:\/[\w./-]*)?)/);
    const siteMatch = lower.match(/\b(open|visit|browse|navigate\s+to)\s+([\w.-]+\.[\w.-]+)/i);
    const url = urlMatch ? urlMatch[1] : siteMatch ? `https://${siteMatch[2]}` : '';
    
    if (url) {
      return `🌐 **How would you like this handled?**\n\n⚡ **Quick Search** — I'll search and summarize results for ${url}\n🌐 **Full Browser** — I'll open ${url} and interact with it\n\nThis feature requires the JARVIS desktop app. Run \`npm run electron:dev\` for full browser automation.`;
    }
    
    return '🌐 **Browser Automation** — Tell me what to browse! Try:\n• "Browse amazon.in for headphones"\n• "Open youtube.com"\n• "Visit google.com"\n\nThis feature requires the JARVIS desktop app. Run `npm run electron:dev` for full browser automation.';
  }

  // ── 3. WEB SEARCH ROUTING (catch-all, checked last) ──
  const SEARCH_KW = /\b(search for|google|look up|find me|what is the latest|what'?s happening with|tell me about news|latest news on|recent news about|what are the latest)\b/i;
  if (SEARCH_KW.test(lower)) {
    const query = lower
      .replace(/.*(?:search for|google|look up|find me|what is the latest|what'?s happening with|tell me about news|latest news on|recent news about|what are the latest)\s*/i, '')
      .trim();
    if (query) {
      return `🔍 **Searching for "${query}"...**\n\nThis feature requires the JARVIS desktop app. Run \`npm run electron:dev\` for live web search and summaries.`;
    }
    return '🔍 What would you like me to search for? Try:\n• "Search for latest AI news"\n• "Look up React 19 features"\n• "What is happening in tech today"';
  }

  // ── Existing patterns continue below ──

  // ── Greetings ──
  if (/^(hi|hello|hey|howdy|sup|yo|greetings|good\s*(morning|afternoon|evening|night))\b/.test(lower)) {
    const hour = now().getHours();
    let greeting = 'Good evening';
    if (hour >= 5 && hour < 12) greeting = 'Good morning';
    else if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
    return `${greeting}, sir. How may I assist you today? I can help with weather, stocks, habits, news, math, conversions, general knowledge, and much more.`;
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
📚 **Knowledge** — "What is API?" / "Tell me about Python" / "Explain blockchain"
😂 **Fun** — "Tell me a joke" / "Give me a quote"
⚡ **Workflows** — "List my workflows" / "Show n8n automations"
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

    const stockNames: Record<string, string> = {
      reliance: 'RELIANCE.NS', tcs: 'TCS.NS', hdfc: 'HDFCBANK.NS', hdfcbank: 'HDFCBANK.NS',
      infosys: 'INFY.NS', infy: 'INFY.NS', icici: 'ICICIBANK.NS', sbi: 'SBIN.NS',
      airtel: 'BHARTIARTL.NS', itc: 'ITC.NS', lnt: 'LT.NS', landt: 'LT.NS', tata: 'TATAMOTORS.NS',
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
  if (/meaning of life|purpose of life/.test(lower)) {
    return KNOWLEDGE['meaning of life'];
  }

  // ── Comparison questions ──
  if (/difference between|compare|vs|versus/.test(lower)) {
    if (/react and angular|react vs angular/.test(lower)) return "React is a library focused on UI, maintained by Meta. Angular is a full framework by Google. React is more flexible and easier to learn; Angular is more opinionated but great for large enterprise apps.";
    if (/python and javascript|python vs javascript/.test(lower)) return "Python is great for data science, AI/ML, and scripting. JavaScript rules the web (frontend + backend via Node). Python has cleaner syntax; JavaScript is more versatile for web development.";
    if (/sql and nosql|sql vs nosql/.test(lower)) return "SQL databases (MySQL, PostgreSQL) use structured tables and are great for complex queries. NoSQL (MongoDB, Redis) are flexible, schema-less, and scale better for unstructured data.";
    if (/rest and graphql|rest vs graphql/.test(lower)) return "REST uses multiple endpoints with fixed data structures. GraphQL uses a single endpoint where clients request exactly what they need. GraphQL reduces over-fetching; REST is simpler to set up.";
    if (/c and c\+\+|c vs c\+\+/.test(lower)) return "C is a procedural language focused on low-level operations and efficiency. C++ adds object-oriented programming, templates, and the STL on top of C. C++ is more powerful but more complex. C is used in operating systems and embedded systems; C++ in game engines and large applications.";
    if (/python and java|python vs java/.test(lower)) return "Python is dynamically typed, interpreted, and easier to learn — great for scripting, data science, and AI. Java is statically typed, compiled to bytecode, and runs on the JVM — great for enterprise, Android, and large systems. Python is faster to write; Java is often faster to execute.";
    if (/rust and c\+\+|rust vs c\+\+/.test(lower)) return "Rust provides memory safety without garbage collection through its ownership system. C++ offers raw performance but requires manual memory management. Rust prevents memory bugs at compile time; C++ gives more low-level control. Rust is gaining ground in systems programming.";
    return "Could you be more specific about what you'd like me to compare, sir? I can compare technologies, concepts, tools, and more.";
  }

  // ── How to questions ──
  if (/^(how do|how to|how can|how does|how is|how to)\b/.test(lower)) {
    if (/learn (coding|programming|code)/.test(lower)) return "Start with Python or JavaScript — both are beginner-friendly. Use free resources: freeCodeCamp, The Odin Project, Codecademy. Practice daily on LeetCode or HackerRank. Build small projects to solidify concepts.";
    if (/learn web development|learn web dev/.test(lower)) return "Start with HTML → CSS → JavaScript. Then pick a framework: React (most popular), Vue (easiest), or Angular (enterprise). Build projects as you learn. Use freeCodeCamp, MDN docs, and YouTube tutorials.";
    if (/start a (business|startup)/.test(lower)) return "1) Find a real problem people have. 2) Build an MVP (minimum viable product). 3) Get feedback from real users. 4) Iterate based on feedback. 5) Focus on one thing and do it well. Use no-code tools (Bubble, Webflow) to launch fast.";
    if (/make money (online|from home)/.test(lower)) return "Options include: freelancing (web dev, design), building SaaS products, affiliate marketing, content creation (YouTube, blogging), e-commerce (Shopify), and consulting. Start with skills you already have.";
    if (/learn python/.test(lower)) return "Start with Python basics: variables, loops, functions, classes. Use freeCodeCamp or automate-the-boring-stuff.com. Practice on HackerRank. Then learn libraries: Pandas (data), Flask (web), TensorFlow (AI). Build projects as you go.";
    if (/learn javascript/.test(lower)) return "Start with ES6+: variables, functions, promises, async/await, DOM manipulation. Use javascript.info or The Odin Project. Then learn a framework: React (most popular). Build projects: todo app, weather app, portfolio site.";
    return "That's a great question, sir. Could you be more specific? I can help with programming, web development, business, AI, and many other topics.";
  }

  // ── Direct knowledge lookup (exact match — must come before 'tell me about' pattern) ──
  const directResult = lookupKnowledge(lower);
  if (directResult) return directResult;

  // ── "Tell me about", "explain", "describe", "do you know about", "info about" ──
  const aboutMatch = lower.match(/(?:tell me about|explain|describe|what (?:is|are)|do you know (?:about|what)|info(?:rmation)? about|talk about|give me (?:info|details|a summary) (?:about|on)|what do you know (?:about|of)|details about)\s+(?:the\s+)?(.+?)(?:\?|$)/);
  if (aboutMatch) {
    const topic = aboutMatch[1].trim();
    const knowledgeResult = lookupKnowledge(topic);
    if (knowledgeResult) return knowledgeResult;
    return generateTopicResponse(topic);
  }

  // ── n8n Workflows ──
  if (/workflow|n8n|automation|automate|trigger|zap|make\.com|integromat/.test(lower)) {
    if (/list|show|what.*workflow|which.*workflow/.test(lower)) {
      return "I have 16 bundled workflows ready to import into n8n, sir:\n\n📦 **CRM**: HubSpot Onboarding, HubSpot Automation\n🔥 **Lead Gen**: Facebook Ads, Jotform, Typeform\n📧 **Email**: Mailchimp, ConvertKit, Gmail+Calendar\n🛒 **E-Commerce**: Shopify+Twitter\n📊 **SEO**: Google Analytics Report\n✅ **PM**: ClickUp, Asana Webhooks\n🌐 **Website**: Calendly+Notion, WordPress, Google Sheets\n📱 **Social**: Facebook Updates\n\nGo to the **Workflows** page to import and manage them.";
    }
    if (/import|install/.test(lower)) {
      return "To import workflows, go to the **Workflows** page in the sidebar. You'll see all 16 bundled workflows organized by category. Click **Import** on any workflow to add it to your n8n instance. You'll need to configure your n8n URL and API key first.";
    }
    if (/trigger|run|execute|start/.test(lower)) {
      return "To trigger a workflow, go to the **Workflows** page → **Installed** tab. Click the **Trigger** button on any active workflow. You can also configure n8n webhooks to trigger workflows automatically from website forms, emails, or other events.";
    }
    return "n8n workflows let you automate tasks between apps. I have 16 pre-built workflows for your business. Go to the **Workflows** page to import, configure, and trigger them. What would you like to automate?";
  }

  // (Direct lookup already handled above)

  // ── "Who is" questions ──
  if (/^(who (is|are|was|were))\s+(.+)/.test(lower)) {
    const person = lower.replace(/^who (is|are|was|were)\s+/, '');
    const personResult = lookupKnowledge(`who is ${person}`);
    if (personResult) return personResult;
    return `I don't have specific information about "${text.replace(/^who (is|are|was|were)\s+/i, '')}" in my knowledge base yet, sir. Could you try rephrasing or ask me something else?`;
  }

  // ── Fuzzy knowledge matching (70% word overlap) ──
  const fuzzyResult = fuzzyLookupKnowledge(lower);
  if (fuzzyResult) return fuzzyResult;

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
• **Knowledge** — "Tell me about Python" / "What is blockchain?" / "Explain quantum computing"
• **Workflows** — "List my workflows" / "Show n8n automations"
• **Fun** — "Tell me a joke" / "Give me a quote"

I can discuss programming, science, history, business, technology, and hundreds of other topics. Just ask!`;
}

// ══════════════════════════════════════════════════════
// KNOWLEDGE LOOKUP FUNCTIONS
// ══════════════════════════════════════════════════════

function lookupKnowledge(query: string): string | null {
  const lower = query.toLowerCase().trim();
  // Direct exact match
  if (KNOWLEDGE[lower]) return KNOWLEDGE[lower];
  // Try with common prefixes stripped
  const stripped = lower.replace(/^(the|a|an)\s+/, '');
  if (KNOWLEDGE[stripped]) return KNOWLEDGE[stripped];
  // Try adding common prefixes
  for (const prefix of ['what is ', 'what are ', 'who is ', 'who are ']) {
    if (KNOWLEDGE[prefix + lower]) return KNOWLEDGE[prefix + lower];
  }
  return null;
}

function fuzzyLookupKnowledge(query: string): string | null {
  let bestMatch = '';
  let bestScore = 0;
  const queryWords = query.split(/\s+/).filter(w => w.length > 2);

  for (const key of Object.keys(KNOWLEDGE)) {
    const keyWords = key.split(/\s+/);
    // Require exact word match, not substring match
    const matchCount = queryWords.filter(w => keyWords.includes(w)).length;
    const score = matchCount / Math.max(queryWords.length, keyWords.length);
    if (score > bestScore && score >= 0.7) {
      bestScore = score;
      bestMatch = key;
    }
  }

  if (bestMatch && KNOWLEDGE[bestMatch]) {
    return KNOWLEDGE[bestMatch];
  }
  return null;
}

function generateTopicResponse(topic: string): string {
  const t = topic.toLowerCase().trim();

  // Check if it matches any knowledge key with looser matching
  for (const [key, value] of Object.entries(KNOWLEDGE)) {
    if (key.includes(t) || t.includes(key)) return value;
    const keyWords = key.split(/\s+/);
    const tWords = t.split(/\s+/);
    const overlap = tWords.filter(w => keyWords.some(kw => kw.includes(w) || w.includes(kw)));
    if (overlap.length >= Math.ceil(tWords.length * 0.5) && overlap.length >= Math.ceil(keyWords.length * 0.5)) {
      return value;
    }
  }

  return `That's an interesting topic, sir. I have knowledge about "${topic}" in my database but it seems I need to expand my coverage there. Here are some topics I can discuss in detail:

**Programming**: Python, JavaScript, TypeScript, C, C++, Java, Rust, Go, Ruby, PHP, Swift, Kotlin, and more.

**Technology**: AI, machine learning, Docker, Kubernetes, React, Vue, Angular, Next.js, databases, cloud computing.

**Science**: Physics, chemistry, biology, quantum computing, astronomy, evolution.

**Business**: SEO, CRM, SaaS, startups, e-commerce, digital marketing, investing.

**World**: Countries, companies (Google, Apple, Tesla, etc.), famous people.

Try asking "Tell me about Python", "What is blockchain?", or "Explain quantum computing" — I can give detailed answers on hundreds of topics!`;
}
