# 🚀 Nuxt Blog Starter

A premium, high-performance blog starter built with **Nuxt 4**, **Nuxt UI**, **Clerk Auth**, and **Convex**. Designed for developers who want a seamless writing experience and a stunning frontend out of the box.

![Nuxt Blog Starter](https://ui.nuxt.com/assets/templates/nuxt/starter-dark.png)

## ✨ Features

- **Framework**: [Nuxt 4](https://nuxt.com) for a modern Vue experience.
- **UI Components**: [Nuxt UI](https://ui.nuxt.com) for a beautiful, accessible interface.
- **Authentication**: [Clerk](https://clerk.com) for secure user management and admin protection.
- **Database & Backend**: [Convex](https://convex.dev) for real-time data and effortless backend functions.
- **Editor**: Built-in rich text editor for creating and publishing posts.
- **Styling**: Tailwind CSS 4 with a polished, dark-mode first aesthetic.

---

## 🛠️ Quick Start

### 1. Clone & Install

```bash
# Clone the repository
git clone https://github.com/your-username/nuxt-blog-starter.git

# Navigate to directory
cd nuxt-blog-starter

# Install dependencies
npm install
```

### 2. Environment Setup

Create a `.env` file in the root directory:

```env
# Clerk Authentication
NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_publishable_key
NUXT_CLERK_SECRET_KEY=your_secret_key

# Convex Backend
CONVEX_URL=your_convex_deployment_url

# Optional AI Article Generation
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=openai/gpt-4o-mini
TAVILY_API_KEY=your_tavily_api_key
```

### 3. Initialize Convex

```bash
# Start Convex development server (this will push your schema and functions)
npx convex dev
```

### 4. Run Locally

```bash
npm run dev
```

---

## 🚢 Deployment

### Deploy to Vercel

1. **Push your code** to GitHub.
2. **Import the project** in Vercel.
3. **Add Environment Variables**:
   - `NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `NUXT_CLERK_SECRET_KEY`
   - `CONVEX_URL` (Found in your Convex Dashboard under Settings > Deployment URL)
4. **Deploy!**

> [!IMPORTANT]
> Make sure to add your production URL to the **Allowed Redirect URIs** in your Clerk Dashboard.

---

## 🔒 Writing Your First Post

To start managing your blog:

1. **Sign Up**: Go to your deployed app or local environment and create an account.
2. **Admin Setup**: In your **Clerk Dashboard**, go to **Users**, find your account (e.g., `admin@yourapp.com`), and verify your identity.
3. **Access Dashboard**: Navigate to `/admin` to access the blog management console.
4. **Publish**: Use the built-in editor to write, edit, and publish your posts instantly.

---

## 📖 Development Commands

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts development server on `localhost:3000` |
| `npm run build` | Builds the application for production |
| `npm run preview` | Locally preview the production build |
| `npx convex dev` | Starts the Convex development sync |

---

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.
