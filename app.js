const express = require("express");
const { CohereClientV2 } = require("cohere-ai"); // Import CohereClientV2
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Cohere Client with your API key from the .env file
const cohere = new CohereClientV2({
  token: process.env.COHERE_API_KEY, // Pass API key from .env
});
// Increase the JSON body limit to 10MB (adjust as needed)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
// Middleware to parse JSON bodies from requests
app.use(express.json());
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});
// Route to generate questions based on teacher inputs
app.post("/generate-questions", async (req, res) => {
  try {
    const {
      subject, // Subject (e.g., Math, Science)
      lessonMaterial, // Lesson material or topic
      ageRange, // Learner's age range
      schoolLevel, // School level (KG, Primary, Secondary, etc.)
      complexity, // Level of complexity (easy, medium, hard)
      questionType, // Type of questions (multiple choice, fill-in-the-gap, theory)
      numSubQuestions, // Number of sub-questions for theory
      numQuestionsFromEach, // Number of questions from each section
    } = req.body;

    // Build the prompt based on the teacher's inputs
    let coherePrompt = `Generate ${numQuestionsFromEach} ${questionType} questions in the subject ${subject}, focused on the topic of ${lessonMaterial}, tailored for ${schoolLevel} students aged ${ageRange}. The questions should be at a ${complexity} difficulty level, with responses and explanations provided in LaTeX format where mathematical equations are required.

    Criteria:
    1. Use LaTeX for all mathematical expressions, ensuring readability in complex equations (e.g., \\( ax^2 + bx + c = 0 \\) or fractions like \\( \\frac{a}{b} \\)).
    2. Vary question types as follows:
       - **Multiple-choice** questions with clearly defined options and a single correct answer.
       - **Fill-in-the-gap** questions, where students input short answers or complete equations.
       - **Theory** questions requiring descriptive responses or problem-solving steps.
    3. Questions should align with the age range and difficulty specified and should be tailored to the level of understanding expected at the ${schoolLevel} level.
    4. Provide answers immediately after each question, using LaTeX formatting where necessary.
    
    Example output:
    - Question: "Solve for \\( x \\) if \\( x^2 + 5x + 6 = 0 \\)."
      Options:
        (a) \\( x = 2 \\)
        (b) \\( x = -3 \\)
        (c) \\( x = 3 \\)
        (d) \\( x = -2 \\)
      <b>Answer: (b) \\( x = -3 \\),with solution steps as needed. </b> 
    `;

    // Add sub-questions logic for theory questions
    if (questionType === "theory") {
      coherePrompt += ` Each theory question should include ${numSubQuestions} sub-questions.`;
    }

    // Call Cohere API to generate the questions
    const response = await cohere.chat({
      model: "command-r-plus", // Use the appropriate model
      messages: [
        {
          role: "user",
          content: coherePrompt,
        },
      ],
    });

    // Log the full response to the console
    console.log("Cohere API Response:", response);

    // Check if the response structure is valid
    if (
      response &&
      response.message &&
      response.message.content &&
      Array.isArray(response.message.content)
    ) {
      // Send generated questions back as response
      res.json({
        questions: response.message.content[0], // Assuming the content is in the first object
      });
    } else {
      res.status(500).json({
        error: "Error generating questions: Invalid response structure",
      });
    }
  } catch (error) {
    console.error("Error generating questions:", error); // Log the error for debugging
    res.status(500).json({ error: "Error generating questions" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
