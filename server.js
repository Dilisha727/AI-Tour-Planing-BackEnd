require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Validate OpenAI API key at startup
if (!process.env.OPENAI_API_KEY) {
  console.error("Error: OPENAI_API_KEY is not set in the environment variables.");
  process.exit(1);
}

// Utility function to calculate the number of days in the date range
function calculateDays(dateRange) {
  if (!dateRange || dateRange.length === 0) return 0;
  const startDate = new Date(dateRange[0].startDate);
  const endDate = new Date(dateRange[0].endDate);
  const diffTime = Math.abs(endDate - startDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

// Utility function to generate itinerary using OpenAI API
async function generateItinerary(requestData) {
  const {
    dateRange,
    startTime,
    budget,
    adults,
    children,
    accommodationType,
    hotelRating,
    priceRange,
    interests,
    mustVisit,
    avoid,
  } = requestData;

  const totalDays = calculateDays(dateRange);

  // Construct prompt for OpenAI
  const prompt = `
    You are an expert travel assistant specializing in Sri Lanka travel itineraries. Create a detailed, day-by-day itinerary covering a ${totalDays}-day trip that includes the following sections:
    
    Each Day should include:
      - **Destination Name**: Provide an introduction to the destination in Sri Lanka, highlighting cultural, historical, and natural significance.
      - **Best Time to Visit**: Suggest the optimal times to visit for the best experience, such as early morning or late afternoon to avoid heat and crowds.
      - **Clothing Recommendations**: Include appropriate clothing advice like breathable clothing, sun protection, good walking shoes, and any considerations for temple visits (modesty required).
    
    User Details:
    - Travel Dates: ${dateRange ? `${dateRange[0].startDate} to ${dateRange[0].endDate}` : 'not specified'}
    - Start Time: ${startTime || 'not specified'}
    - Budget: $${budget || 'not specified'}
    - Adults: ${adults || 'not specified'}
    - Children: ${children || 'not specified'}
    - Accommodation Type: ${accommodationType || 'not specified'}
    - Hotel Rating: ${hotelRating || 'not specified'}
    - Price Range: $18 - $${priceRange || 'not specified'}
    - Interests: ${interests && interests.length > 0 ? interests.join(', ') : 'none specified'}
    - Must-Visit Places: ${mustVisit || 'not specified'}
    - Places to Avoid: ${avoid || 'not specified'}
    
    Generate a unique itinerary plan for each of the ${totalDays} days, focusing on ${interests && interests.length > 0 ? interests.join(', ') : 'a balanced mix of cultural and natural experiences'}. Provide detailed experiences each day, based on the user’s interests and must-visit places, ensuring the trip is well-paced.
  `;

  try {
    // Make request to OpenAI API
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful travel assistant.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1500,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Extract the content from the API response
    const itineraryContent = response.data.choices[0].message.content;

    return itineraryContent;
  } catch (error) {
    // Log detailed error information
    console.error("Error calling OpenAI API:", error.response?.status, error.response?.data || error.message);
    throw new Error("Failed to generate itinerary. Please try again.");
  }
}

// Endpoint to generate itinerary
app.post('/generate-itinerary', async (req, res) => {
  try {
    // Log request data for debugging
    console.log("Received request data:", req.body);

    const itinerary = await generateItinerary(req.body);
    res.json({ itinerary });
  } catch (error) {
    console.error("Error generating itinerary:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
