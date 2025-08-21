document.addEventListener('DOMContentLoaded', function () {
    // const API_KEY = "AIzaSyAEU4ttYPBPj9v4x5RghZrQNA7OqMWGBfE";
    // const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`;
     const API_KEY = "AIzaSyAEU4ttYPBPj9v4x5RghZrQNA7OqMWGBfE";
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const typingIndicator = document.getElementById('typing-indicator');

    // Focus input on load
    userInput.focus();

    // Event listeners
    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') sendMessage();
    });

    async function sendMessage() {
        const message = userInput.value.trim();
        if (message === '') return;

        addUserMessage(message);
        userInput.value = '';
        showTypingIndicator();
        chatMessages.scrollTop = chatMessages.scrollHeight;

        try {
            const botResponse = await callGeminiAPI(message);
            await typeBotMessage(formatResponse(botResponse));
        } catch (error) {
            addBotMessage("❌ Error: Couldn't get a response. Please try again later.");
            console.error("API Error:", error);
        } finally {
            hideTypingIndicator();
        }
    }

    async function callGeminiAPI(prompt) {
        const requestBody = {
            contents: [{
                role: "user",
                parts: [{ 
                    text: `You are an expert AI tutor specialized in explaining academic concepts to students. 
                    Provide detailed, accurate, and comprehensive explanations with examples when appropriate.
                    Use proper HTML formatting with headings, lists, tables, and code blocks where needed.
                    Break down complex concepts into simpler parts.
                    Current question: ${prompt}`
                }]
            }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2000,
                topP: 0.9
            }
        };

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();
        if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
            return data.candidates[0].content.parts[0].text;
        } else {
            throw new Error("Invalid API response structure");
        }
    }

    function addUserMessage(text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'message user';
        msgDiv.innerHTML = `<p>${escapeHtml(text)}</p>`;
        chatMessages.appendChild(msgDiv);
        scrollToBottom();
    }

    function addBotMessage(text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'message bot';
        msgDiv.innerHTML = `<p>${text}</p>`;
        chatMessages.appendChild(msgDiv);
        scrollToBottom();
    }

    async function typeBotMessage(formattedHTML) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'message bot';
        chatMessages.appendChild(msgDiv);
        scrollToBottom();

        let i = 0;
        const typingSpeed = 10; // milliseconds per character
        const chunkSize = 3; // characters to add at a time
        
        while (i < formattedHTML.length) {
            // Add chunks at a time for smoother typing
            const chunkEnd = Math.min(i + chunkSize, formattedHTML.length);
            msgDiv.innerHTML = formattedHTML.substring(0, chunkEnd);
            i = chunkEnd;
            scrollToBottom();
            await new Promise(r => setTimeout(r, typingSpeed));
        }
    }

    function formatResponse(text) {
        // Basic cleaning of response
        let cleanText = text
            .replace(/\\+/g, '') // remove backslashes
            .replace(/\*\*/g, '<b>') // convert ** to bold
            .replace(/\n/g, '<br>') // convert line breaks
            .replace(/```(\w*)\n([\s\S]*?)\n```/g, '<pre><code>$2</code></pre>'); // code blocks

        // Convert markdown headings to HTML
        cleanText = cleanText.replace(/^(#+)\s*(.+)$/gm, (match, hashes, title) => {
            const level = Math.min(hashes.length, 6);
            return `<h${level}>${title}</h${level}>`;
        });

        // Convert lists
        cleanText = cleanText.replace(/^\*\s+(.+)$/gm, '<li>$1</li>');
        cleanText = cleanText.replace(/<li>.*<\/li>/g, (match) => {
            if (!cleanText.includes('<ul>')) {
                return `<ul>${match}</ul>`;
            }
            return match;
        });

        return cleanText;
    }

    function showTypingIndicator() {
        typingIndicator.style.display = 'flex';
        scrollToBottom();
    }

    function hideTypingIndicator() {
        typingIndicator.style.display = 'none';
    }

    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
});