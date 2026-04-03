# 💻 Frontend - Real-Time Chat Client

This is the React-based frontend for the Real-Time Chat Application. It provides a modern, responsive interface for messaging, channel management, and secure communication.

## 🚀 Technologies
- **React 19**: Component-based UI.
- **Vite**: Fast build tool and dev server.
- **Socket.io Client**: Real-time event handling.
- **Web Crypto API**: Handles End-to-End Encryption (E2EE) on the client side.
- **Lucide React**: Clean and consistent iconography.
- **Axios**: HTTP client for API requests.

## 🛠️ Local Development

1.  **Install dependencies**:
    ```bash
    npm install
    ```

2.  **Environment Variables**:
    Create a `.env` file (if needed) to specify the API and Socket server URLs:
    ```env
    VITE_API_URL=http://localhost:5000/api
    VITE_SOCKET_URL=http://localhost:5000
    ```

3.  **Run development server**:
    ```bash
    npm run dev
    ```

## 🔐 Security Note
This client implements **End-To-End Encryption (E2EE)**. Message encryption and decryption happen entirely within this frontend using the browser's Web Crypto API. Private keys are stored in `sessionStorage` and never leave your browser.
