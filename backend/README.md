# Menu Safe Backend

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up OpenAI API Key:**
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Edit `.env` and add your OpenAI API key:
     ```
     OPENAI_API_KEY=sk-your-actual-api-key-here
     ```
   - Get your API key from: https://platform.openai.com/api-keys

3. **Start the server:**
   ```bash
   npm start
   ```

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/analyze-menu` - Analyze menu image with dietary restrictions

## Notes

- The server uses GPT-4o vision model for menu analysis
- Images are sent as base64-encoded data URLs
- Safety bias: uncertain items are classified as "CAUTION"



