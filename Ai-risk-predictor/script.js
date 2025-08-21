document.addEventListener('DOMContentLoaded', function() {
    // API Configuration
    const API_KEY = "AIzaSyAEU4ttYPBPj9v4x5RghZrQNA7OqMWGBfE";
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`;
    
    // DOM Elements
    const uploadOption = document.getElementById('upload-option');
    const manualOption = document.getElementById('manual-option');
    const inputSection = document.getElementById('input-section');
    const manualEntrySection = document.getElementById('manual-entry-section');
    const resultsSection = document.getElementById('results-section');
    const imageUpload = document.getElementById('image-upload');
    const fileInfo = document.getElementById('file-info');
    const manualEntryBtn = document.getElementById('manual-entry-btn');
    const backToOptionsBtn = document.getElementById('back-to-options');
    const addSubjectBtn = document.getElementById('add-subject');
    const analyzeManualBtn = document.getElementById('analyze-manual');
    const newAnalysisBtn = document.getElementById('new-analysis');
    const subjectsContainer = document.getElementById('subjects-container');
    const summaryCards = document.getElementById('summary-cards');
    const performanceTable = document.getElementById('performance-table');
    const recommendationsList = document.getElementById('recommendations-list');
    const loadingIndicator = document.getElementById('loading-indicator');
    
    let studentData = [];
    let performanceChart = null;
    
    // Event listeners
    imageUpload.addEventListener('change', handleImageUpload);
    manualEntryBtn.addEventListener('click', showManualEntry);
    backToOptionsBtn.addEventListener('click', showInputOptions);
    addSubjectBtn.addEventListener('click', addSubjectField);
    analyzeManualBtn.addEventListener('click', analyzeManualData);
    newAnalysisBtn.addEventListener('click', resetAnalysis);
    
    // Initialize with one subject field
    addSubjectField();
    
    // Functions
    function handleImageUpload() {
        if (imageUpload.files.length) {
            const file = imageUpload.files[0];
            fileInfo.textContent = `File selected: ${file.name}`;
            
            // Show loading indicator
            loadingIndicator.classList.remove('hidden');
            
            // Use Tesseract.js for OCR
            Tesseract.recognize(
                file,
                'eng',
                { logger: m => console.log(m) }
            ).then(({ data: { text } }) => {
                console.log("Extracted text:", text);
                
                // Send to Gemini API for structured parsing
                parseMarksheetWithAI(text).then(parsedData => {
                    studentData = parsedData;
                    analyzeData();
                }).catch(error => {
                    console.error("Error parsing marksheet:", error);
                    alert("Could not parse marksheet. Please try entering marks manually.");
                    loadingIndicator.classList.add('hidden');
                });
            }).catch(error => {
                console.error("OCR Error:", error);
                alert("Error processing image. Please try a clearer image or enter marks manually.");
                loadingIndicator.classList.add('hidden');
            });
        }
    }
    
    async function parseMarksheetWithAI(text) {
        const prompt = `Extract student subject marks data from this text in JSON format:
        ${text}
        
        Return only a valid JSON array with this structure for each subject:
        [
            {
                "subject": "subject name",
                "obtained": "marks obtained",
                "total": "total marks",
                "passing": "passing marks"
            }
        ]
        If any field is missing, try to infer reasonable values.`;
        
        const requestBody = {
            contents: [{
                role: "user",
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 2000
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
    
    function showManualEntry() {
        uploadOption.classList.remove('active');
        manualOption.classList.add('active');
        inputSection.classList.add('hidden');
        manualEntrySection.classList.remove('hidden');
    }
    
    function showInputOptions() {
        uploadOption.classList.add('active');
        manualOption.classList.remove('active');
        manualEntrySection.classList.add('hidden');
        inputSection.classList.remove('hidden');
    }
    
    function addSubjectField() {
        const subjectEntry = document.createElement('div');
        subjectEntry.className = 'subject-entry';
        subjectEntry.innerHTML = `
            <div class="form-group">
                <label>Subject Name</label>
                <input type="text" class="subject-name" placeholder="e.g., Mathematics">
            </div>
            <div class="form-group">
                <label>Marks Obtained</label>
                <input type="number" class="marks-obtained" placeholder="Your marks">
            </div>
            <div class="form-group">
                <label>Total Marks</label>
                <input type="number" class="total-marks" placeholder="Full marks">
            </div>
            <div class="form-group">
                <label>Passing Marks</label>
                <input type="number" class="passing-marks" placeholder="Pass marks">
            </div>
        `;
        subjectsContainer.appendChild(subjectEntry);
    }
    
    function analyzeManualData() {
        const subjectEntries = document.querySelectorAll('.subject-entry');
        studentData = [];
        
        subjectEntries.forEach(entry => {
            const subjectName = entry.querySelector('.subject-name').value.trim();
            const marksObtained = parseFloat(entry.querySelector('.marks-obtained').value);
            const totalMarks = parseFloat(entry.querySelector('.total-marks').value);
            const passingMarks = parseFloat(entry.querySelector('.passing-marks').value);
            
            if (subjectName && !isNaN(marksObtained)) {
                studentData.push({
                    subject: subjectName,
                    obtained: marksObtained,
                    total: totalMarks || 100, // Default to 100 if not provided
                    passing: passingMarks || (totalMarks * 0.4) || 40 // Default to 40% if not provided
                });
            }
        });
        
        if (studentData.length === 0) {
            alert("Please enter at least one subject with marks");
            return;
        }
        
        analyzeData();
    }
    
    function analyzeData() {
        loadingIndicator.classList.remove('hidden');
        
        // Calculate performance metrics
        const performanceMetrics = calculatePerformanceMetrics(studentData);
        
        // Display results
        displaySummary(performanceMetrics);
        displaySubjectPerformance(studentData, performanceMetrics);
        createPerformanceChart(studentData);
        
        // Generate AI recommendations
        generateRecommendations(studentData, performanceMetrics).then(() => {
            loadingIndicator.classList.add('hidden');
            manualEntrySection.classList.add('hidden');
            inputSection.classList.add('hidden');
            resultsSection.classList.remove('hidden');
        });
    }
    
    function calculatePerformanceMetrics(subjects) {
        let totalSubjects = subjects.length;
        let passedSubjects = 0;
        let highRiskSubjects = 0;
        let mediumRiskSubjects = 0;
        let lowRiskSubjects = 0;
        let totalPercentage = 0;
        
        subjects.forEach(subject => {
            const percentage = (subject.obtained / subject.total) * 100;
            totalPercentage += percentage;
            
            if (subject.obtained >= subject.passing) {
                passedSubjects++;
            }
            
            // Determine risk level
            if (percentage < 50) {
                highRiskSubjects++;
            } else if (percentage < 75) {
                mediumRiskSubjects++;
            } else {
                lowRiskSubjects++;
            }
        });
        
        const overallPercentage = totalPercentage / totalSubjects;
        let overallRisk = 'low';
        
        if (overallPercentage < 50) {
            overallRisk = 'high';
        } else if (overallPercentage < 75) {
            overallRisk = 'medium';
        }
        
        return {
            totalSubjects,
            passedSubjects,
            failedSubjects: totalSubjects - passedSubjects,
            highRiskSubjects,
            mediumRiskSubjects,
            lowRiskSubjects,
            overallPercentage: Math.round(overallPercentage * 10) / 10,
            overallRisk
        };
    }
    
    function displaySummary(metrics) {
        summaryCards.innerHTML = `
            <div class="summary-card">
                <h4>Overall Percentage</h4>
                <div class="value ${metrics.overallRisk === 'high' ? 'high-risk' : 
                                  metrics.overallRisk === 'medium' ? 'medium-risk' : 'low-risk'}">
                    ${metrics.overallPercentage}%
                </div>
                <div>${getPerformanceLabel(metrics.overallPercentage)}</div>
            </div>
            <div class="summary-card">
                <h4>Subjects Passed</h4>
                <div class="value">${metrics.passedSubjects}</div>
                <div>of ${metrics.totalSubjects} total</div>
            </div>
            <div class="summary-card">
                <h4>High Risk Subjects</h4>
                <div class="value high-risk">${metrics.highRiskSubjects}</div>
                <div>Need immediate attention</div>
            </div>
            <div class="summary-card">
                <h4>Medium Risk Subjects</h4>
                <div class="value medium-risk">${metrics.mediumRiskSubjects}</div>
                <div>Need improvement</div>
            </div>
        `;
    }
    
    function getPerformanceLabel(percentage) {
        if (percentage >= 85) return 'Excellent';
        if (percentage >= 75) return 'Very Good';
        if (percentage >= 60) return 'Good';
        if (percentage >= 50) return 'Average';
        if (percentage >= 33) return 'Below Average';
        return 'Poor';
    }
    
    function displaySubjectPerformance(subjects, metrics) {
        performanceTable.innerHTML = `
            <thead>
                <tr>
                    <th>Subject</th>
                    <th>Marks</th>
                    <th>Percentage</th>
                    <th>Status</th>
                    <th>Risk Level</th>
                </tr>
            </thead>
            <tbody>
                ${subjects.map(subject => {
                    const percentage = (subject.obtained / subject.total) * 100;
                    const roundedPercentage = Math.round(percentage * 10) / 10;
                    const passed = subject.obtained >= subject.passing;
                    let riskLevel = '';
                    
                    if (percentage < 50) {
                        riskLevel = '<span class="risk-indicator risk-high">High Risk</span>';
                    } else if (percentage < 75) {
                        riskLevel = '<span class="risk-indicator risk-medium">Medium Risk</span>';
                    } else {
                        riskLevel = '<span class="risk-indicator risk-low">Low Risk</span>';
                    }
                    
                    return `
                        <tr>
                            <td>${subject.subject}</td>
                            <td>${subject.obtained}/${subject.total}</td>
                            <td>${roundedPercentage}%</td>
                            <td>${passed ? 'Passed' : 'Failed'}</td>
                            <td>${riskLevel}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        `;
    }
    
    function createPerformanceChart(subjects) {
        const ctx = document.getElementById('performance-chart').getContext('2d');
        
        // Destroy previous chart if exists
        if (performanceChart) {
            performanceChart.destroy();
        }
        
        performanceChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: subjects.map(s => s.subject),
                datasets: [{
                    label: 'Percentage Score',
                    data: subjects.map(s => Math.round((s.obtained / s.total) * 1000) / 10),
                    backgroundColor: subjects.map(s => {
                        const percentage = (s.obtained / s.total) * 100;
                        if (percentage < 50) return '#e74c3c';
                        if (percentage < 75) return '#f39c12';
                        return '#2ecc71';
                    }),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Subject-wise Performance'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.raw}% (${subjects[context.dataIndex].obtained}/${subjects[context.dataIndex].total})`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Percentage'
                        }
                    }
                }
            }
        });
    }
    
    async function generateRecommendations(subjects, metrics) {
        // Prepare data for AI analysis
        const performanceData = subjects.map(subject => ({
            subject: subject.subject,
            percentage: Math.round((subject.obtained / subject.total) * 1000) / 10,
            status: subject.obtained >= subject.passing ? 'passed' : 'failed'
        }));
        
        const prompt = `You are an expert education counselor. Analyze this student performance data and provide specific recommendations:
        
        Performance Overview:
        - Overall Percentage: ${metrics.overallPercentage}%
        - Subjects Passed: ${metrics.passedSubjects}/${metrics.totalSubjects}
        - High Risk Subjects: ${metrics.highRiskSubjects}
        - Medium Risk Subjects: ${metrics.mediumRiskSubjects}
        
        Subject-wise Performance:
        ${performanceData.map(sub => `- ${sub.subject}: ${sub.percentage}% (${sub.status})`).join('\n')}
        
        Provide:
        1. A brief overall assessment (2-3 sentences)
        2. Specific recommendations for each high-risk subject
        3. General study improvement strategies
        4. A motivational closing statement
        
        Format the response in HTML with headings and bullet points.`;
        
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        role: "user",
                        parts: [{ text: prompt }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 2000
                    }
                })
            });
            
            const data = await response.json();
            const recommendations = data.candidates[0].content.parts[0].text;
            
            // Display the AI recommendations
            recommendationsList.innerHTML = recommendations
                .replace(/\*\*/g, '<strong>') // Convert markdown bold to HTML
                .replace(/\n/g, '<br>'); // Convert line breaks
                
        } catch (error) {
            console.error("Error getting AI recommendations:", error);
            recommendationsList.innerHTML = `
                <div class="recommendation-item">
                    <h4>Performance Analysis</h4>
                    <p>Based on your scores, here are some general recommendations:</p>
                    <div class="improvement-steps">
                        ${metrics.highRiskSubjects > 0 ? `
                        <div class="improvement-step">Focus more on your high-risk subjects (below 50%)</div>
                        ` : ''}
                        ${metrics.mediumRiskSubjects > 0 ? `
                        <div class="improvement-step">Practice regularly for medium-risk subjects (50-75%)</div>
                        ` : ''}
                        <div class="improvement-step">Create a study schedule allocating more time to weaker subjects</div>
                        <div class="improvement-step">Seek help from teachers or tutors for difficult concepts</div>
                        <div class="improvement-step">Practice with past papers and sample questions</div>
                    </div>
                </div>
            `;
        }
    }
    
    function resetAnalysis() {
        // Reset all inputs
        imageUpload.value = '';
        fileInfo.textContent = 'No file selected';
        
        // Clear manual entry fields
        subjectsContainer.innerHTML = '';
        addSubjectField();
        
        // Reset data
        studentData = [];
        
        // Destroy chart if exists
        if (performanceChart) {
            performanceChart.destroy();
            performanceChart = null;
        }
        
        // Show input section
        resultsSection.classList.add('hidden');
        manualEntrySection.classList.add('hidden');
        inputSection.classList.remove('hidden');
        uploadOption.classList.add('active');
        manualOption.classList.remove('active');
    }
});