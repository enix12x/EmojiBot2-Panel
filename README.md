# EmojiBot2 Panel

The admin panel for EmojiBot2, built with TypeScript, Bootstrap, and Express.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Build the panel:
```bash
npm run build
```

3. Run the panel server:
```bash
npm run serve
```

The panel will be available at `http://localhost:3001` by default.

## Configuration

1. Copy the example config file:
```bash
cp config.example.json config.json
```

2. Edit `config.json` with your settings:
   - `apiUrl`: The URL where the **API server** is running (e.g., `http://localhost:3000`). This is the backend API, NOT the panel's port.
   - `apiSecret`: The secret key that matches the `apiSecret` in the main bot's `config.json`
   - `port`: (Optional) The port the **panel webapp** runs on (default: 3001). This is different from the API server port.

**Important**: 
- The `apiUrl` should point to the API server (typically port 3000), not the panel's own port.
- The `apiSecret` in the panel's `config.json` must match the `apiSecret` in the main bot's `config.json` for the panel to communicate with the API.

Make sure the main bot's API server is running before using the panel.

## Features

- User registration and login
- Admin user management (verify users, make admins, block users)
- Emoji creation and management
- VM selection for emojis

