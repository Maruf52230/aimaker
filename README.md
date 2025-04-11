# Web Maker AI

A web application that allows users to describe what they want to build, and instantly generates code using the DeepSeek R1 Zero AI model.

## Features

- Input your idea in natural language
- Generate complete HTML+CSS+JS code with the click of a button
- Copy the generated code with a single click
- Run and preview the generated code in real-time
- Modern, responsive UI design

## How It Works

1. The user enters their idea (e.g., "Make a button that changes color when clicked")
2. The app sends this prompt to the DeepSeek R1 Zero model via OpenRouter API
3. The AI generates a complete HTML file with inline CSS and JavaScript
4. The code is displayed and can be run in a preview iframe

## Tech Stack

- HTML5
- CSS3
- Vanilla JavaScript
- OpenRouter API
- DeepSeek R1 Zero model

## Getting Started

1. Clone this repository
2. Open `index.html` in your browser
3. Enter your idea and click "Generate Code"

## API Configuration

The application uses the OpenRouter API to access the DeepSeek R1 Zero model. The API key is included in the code for demonstration purposes. In a production environment, you should:

1. Secure your API key using environment variables or a server-side approach
2. Implement appropriate rate limiting
3. Add error handling for API quota limitations

## License

MIT

## Credits

Created for demonstration purposes. 