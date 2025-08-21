document.addEventListener('DOMContentLoaded', function() {
    // API Configuration
   const API_KEY = "AIzaSyAEU4ttYPBPj9v4x5RghZrQNA7OqMWGBfE";
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

    // DOM Elements
    const testConfig = document.querySelector('.test-config');
    const testArea = document.getElementById('test-area');
    const resultsArea = document.getElementById('results-area');
    const generateBtn = document.getElementById('generate-btn');
    const submitTest = document.getElementById('submit-test');
    const newTest = document.getElementById('new-test');
    const reviewTest = document.getElementById('review-test');
    const questionsContainer = document.getElementById('questions-container');
    const resultsContainer = document.getElementById('results-container');
    const resultsSummary = document.getElementById('results-summary');
    const testTitle = document.getElementById('test-title');
    const timerElement = document.getElementById('timer');
    const loadingIndicator = document.getElementById('loading-indicator');
    
    // Variables
    let currentTest = [];
    let userAnswers = [];
    let startTime;
    let timerInterval;
    let testDuration = 0;
    
    // Event listeners
    generateBtn.addEventListener('click', generateTest);
    submitTest.addEventListener('click', gradeTest);
    newTest.addEventListener('click', resetTest);
    reviewTest.addEventListener('click', toggleReviewMode);
    
    // Main functions
    async function generateTest() {
        // Get form values
        const subject = document.getElementById('subject').value;
        const topic = document.getElementById('topic').value.trim();
        const difficulty = document.getElementById('difficulty').value;
        const questionCount = parseInt(document.getElementById('question-count').value);
        const selectedTypes = Array.from(document.querySelectorAll('input[name="question-type"]:checked')).map(el => el.value);
        
        // Validate inputs
        if (selectedTypes.length === 0) {
            alert('Please select at least one question type');
            return;
        }
        
        // Show loading indicator
        generateBtn.disabled = true;
        loadingIndicator.classList.remove('hidden');
        
        try {
            // Generate test using AI
            currentTest = await generateQuestionsWithAI(subject, topic, difficulty, questionCount, selectedTypes);
            
            // Display test
            displayTest(currentTest, subject, topic);
            
            // Start timer
            startTimer();
            
            // Show test area
            testConfig.classList.add('hidden');
            testArea.classList.remove('hidden');
            resultsArea.classList.add('hidden');
        } catch (error) {
            console.error('Error generating test:', error);
            alert('Failed to generate test. Please try again later.');
        } finally {
            generateBtn.disabled = false;
            loadingIndicator.classList.add('hidden');
        }
    }
    
    async function generateQuestionsWithAI(subject, topic, difficulty, count, types) {
        // Construct the prompt for the AI
        const prompt = `Generate ${count} ${difficulty} difficulty assessment questions about ${subject}${topic ? ' specifically about ' + topic : ''}.
        Include these question types: ${types.join(', ')}.
        Return the questions in JSON format with this structure:
        [
            {
                "type": "question_type",
                "question": "question text",
                "options": ["array", "of", "options"] (only for mcq and true_false),
                "answer": "correct answer",
                "explanation": "brief explanation of the answer"
            }
        ]
        Ensure the response contains only valid JSON with no additional text.`;
        
        const requestBody = {
            contents: [{
                role: "user",
                parts: [{ text: prompt }]
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
        const responseText = data.candidates[0].content.parts[0].text;
        
        // Clean the response to extract just the JSON
        const jsonStart = responseText.indexOf('[');
        const jsonEnd = responseText.lastIndexOf(']') + 1;
        const jsonString = responseText.slice(jsonStart, jsonEnd);
        
        return JSON.parse(jsonString);
    }
    
    function displayTest(questions, subject, topic) {
        questionsContainer.innerHTML = '';
        userAnswers = [];
        
        // Set test title
        let title = `${subject.charAt(0).toUpperCase() + subject.slice(1)} Assessment`;
        if (topic) title += `: ${topic}`;
        testTitle.textContent = title;
        
        // Create question elements
        questions.forEach((q, index) => {
            userAnswers.push({
                question: q.question,
                answer: '',
                correctAnswer: q.answer,
                explanation: q.explanation || '',
                isCorrect: null
            });
            
            const questionDiv = document.createElement('div');
            questionDiv.className = 'question';
            questionDiv.dataset.questionIndex = index;
            
            const questionText = document.createElement('div');
            questionText.className = 'question-text';
            questionText.textContent = `${index + 1}. ${q.question}`;
            questionDiv.appendChild(questionText);
            
            const optionsDiv = document.createElement('div');
            optionsDiv.className = 'options';
            
            if (q.type === 'mcq' && q.options) {
                q.options.forEach((option, i) => {
                    const optionDiv = document.createElement('div');
                    optionDiv.className = 'option';
                    
                    const input = document.createElement('input');
                    input.type = 'radio';
                    input.name = `q${index}`;
                    input.id = `q${index}-o${i}`;
                    input.value = option;
                    input.addEventListener('change', () => {
                        userAnswers[index].answer = option;
                    });
                    
                    const label = document.createElement('label');
                    label.htmlFor = `q${index}-o${i}`;
                    label.textContent = option;
                    
                    optionDiv.appendChild(input);
                    optionDiv.appendChild(label);
                    optionsDiv.appendChild(optionDiv);
                });
            } 
            else if (q.type === 'true_false' && q.options) {
                q.options.forEach((option, i) => {
                    const optionDiv = document.createElement('div');
                    optionDiv.className = 'option';
                    
                    const input = document.createElement('input');
                    input.type = 'radio';
                    input.name = `q${index}`;
                    input.id = `q${index}-o${i}`;
                    input.value = option;
                    input.addEventListener('change', () => {
                        userAnswers[index].answer = option;
                    });
                    
                    const label = document.createElement('label');
                    label.htmlFor = `q${index}-o${i}`;
                    label.textContent = option;
                    
                    optionDiv.appendChild(input);
                    optionDiv.appendChild(label);
                    optionsDiv.appendChild(optionDiv);
                });
            }
            else if (q.type === 'short_answer') {
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'short-answer-input';
                input.placeholder = 'Type your answer here...';
                input.addEventListener('input', (e) => {
                    userAnswers[index].answer = e.target.value.trim();
                });
                
                optionsDiv.appendChild(input);
            }
            
            questionDiv.appendChild(optionsDiv);
            questionsContainer.appendChild(questionDiv);
        });
    }
    
    function gradeTest() {
        clearInterval(timerInterval);
        
        let correctCount = 0;
        
        // Check each answer
        userAnswers.forEach((item, index) => {
            // For multiple choice and true/false, check exact match
            if (currentTest[index].type === 'mcq' || currentTest[index].type === 'true_false') {
                item.isCorrect = item.answer === item.correctAnswer;
            } 
            // For short answer, check case-insensitive and allow for partial matches
            else {
                item.isCorrect = item.answer.toLowerCase() === item.correctAnswer.toLowerCase();
            }
            
            if (item.isCorrect) correctCount++;
        });
        
        // Display results
        displayResults(correctCount);
        
        // Show results area
        testArea.classList.add('hidden');
        resultsArea.classList.remove('hidden');
    }
    
    function displayResults(correctCount) {
        resultsContainer.innerHTML = '';
        
        // Calculate score
        const score = Math.round((correctCount / userAnswers.length) * 100);
        const scoreClass = score >= 80 ? 'score-high' : 
                          score >= 50 ? 'score-medium' : 'score-low';
        
        // Create summary
        resultsSummary.innerHTML = `
            <div class="result-score ${scoreClass}">Your Score: ${score}%</div>
            <p>You answered ${correctCount} out of ${userAnswers.length} questions correctly.</p>
            <p>Time taken: ${formatTime(testDuration)}</p>
        `;
        
        // Create detailed results
        userAnswers.forEach((item, index) => {
            const resultDiv = document.createElement('div');
            resultDiv.className = `result-item ${item.isCorrect ? 'correct' : 'incorrect'}`;
            
            let answerDetails = '';
            if (item.isCorrect) {
                answerDetails = `<p><strong>Your answer:</strong> ${item.answer || 'No answer provided'}</p>`;
            } else {
                answerDetails = `
                    <p><strong>Your answer:</strong> ${item.answer || 'No answer provided'}</p>
                    <p><strong>Correct answer:</strong> ${item.correctAnswer}</p>
                `;
            }
            
            if (item.explanation) {
                answerDetails += `<p class="explanation"><strong>Explanation:</strong> ${item.explanation}</p>`;
            }
            
            resultDiv.innerHTML = `
                <p><strong>Question ${index + 1}:</strong> ${item.question}</p>
                ${answerDetails}
            `;
            
            resultsContainer.appendChild(resultDiv);
        });
    }
    
    function toggleReviewMode() {
        // Hide results and show test with correct answers marked
        resultsArea.classList.add('hidden');
        testArea.classList.remove('hidden');
        
        // Mark correct answers
        userAnswers.forEach((item, index) => {
            const questionDiv = document.querySelector(`.question[data-question-index="${index}"]`);
            
            // Highlight the correct answer
            if (currentTest[index].type === 'mcq' || currentTest[index].type === 'true_false') {
                const options = questionDiv.querySelectorAll('.option input');
                options.forEach(option => {
                    if (option.value === item.correctAnswer) {
                        option.parentElement.style.color = 'var(--success-color)';
                        option.parentElement.style.fontWeight = 'bold';
                    }
                });
            } else if (currentTest[index].type === 'short_answer') {
                const input = questionDiv.querySelector('.short-answer-input');
                input.value = item.correctAnswer;
                input.style.color = 'var(--success-color)';
                input.style.fontWeight = 'bold';
                input.readOnly = true;
            }
            
            // Disable all inputs
            questionDiv.querySelectorAll('input').forEach(input => {
                input.disabled = true;
            });
        });
        
        // Change submit button to "Back to Results"
        submitTest.textContent = 'Back to Results';
        submitTest.removeEventListener('click', gradeTest);
        submitTest.addEventListener('click', () => {
            testArea.classList.add('hidden');
            resultsArea.classList.remove('hidden');
            submitTest.textContent = 'Submit Test';
            submitTest.addEventListener('click', gradeTest);
        });
    }
    
    function resetTest() {
        clearInterval(timerInterval);
        testDuration = 0;
        
        testConfig.classList.remove('hidden');
        testArea.classList.add('hidden');
        resultsArea.classList.add('hidden');
        questionsContainer.innerHTML = '';
        resultsContainer.innerHTML = '';
        resultsSummary.innerHTML = '';
        currentTest = [];
        userAnswers = [];
        
        // Reset timer display
        timerElement.textContent = 'Time: 00:00';
    }
    
    // Timer functions
    function startTimer() {
        startTime = Date.now();
        timerInterval = setInterval(updateTimer, 1000);
    }
    
    function updateTimer() {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        testDuration = elapsed;
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        timerElement.textContent = `Time: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
});